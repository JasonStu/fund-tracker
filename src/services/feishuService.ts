/**
 * Feishu Service
 * Handles authentication and API calls to Feishu/Lark Open Platform
 */

import axios, { AxiosInstance, AxiosError, isAxiosError } from 'axios';
import { createExternalClient } from '@/lib/api/externalClient';
import {
  FeishuConfig,
  FeishuTokenResponse,
  ParsedStock,
  BitableRecord,
  BitableRecordResponse,
  CreateBitableResponse,
  CreateTableResponse,
} from '@/types/feishu';

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Create Feishu API client using external client factory
const feishuClient = createExternalClient('feishu');

/**
 * Get Feishu configuration from environment variables
 */
export function getFeishuConfig(): FeishuConfig {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('Feishu APP_ID or APP_SECRET not configured. Please set FEISHU_APP_ID and FEISHU_APP_SECRET in .env.local');
  }

  return { appId, appSecret };
}

/**
 * Get or refresh tenant access token
 * Using native fetch to avoid async_hooks issues with Axios
 */
export async function getTenantAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const config = getFeishuConfig();
  console.log('[Feishu] Fetching tenant access token...');

  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: config.appId,
        app_secret: config.appSecret,
      }),
    });

    const data = await response.json();
    console.log('[Feishu] Token response:', data);

    if (data.code !== 0) {
      throw new Error(`Feishu auth failed: ${data.msg} (code: ${data.code})`);
    }

    // Cache the token with buffer time (expire 1 minute early)
    cachedToken = data.tenant_access_token;
    tokenExpiry = Date.now() + (data.expire - 60) * 1000;
    console.log('[Feishu] Token cached, expires at:', new Date(tokenExpiry));

    return cachedToken;
  } catch (error) {
    console.error('[Feishu] Token fetch error:', error);
    throw error;
  }
}

/**
 * Create axios instance with Feishu authentication
 * @deprecated Use the module-level feishuClient instead
 */
export function createFeishuClient(): AxiosInstance {
  return feishuClient;
}

/**
 * Feishu API Service class
 */
export class FeishuService {
  private client: AxiosInstance;

  constructor() {
    this.client = createFeishuClient();

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      const token = await getTenantAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Create a new bitable (multi-dimensional table) app
   */
  async createBitable(name: string): Promise<string> {
    try {
      console.log('[Feishu] Creating bitable with name:', name);
      const response = await this.client.post<CreateBitableResponse>(
        `/bitable/v1/apps`,
        {
          name,
          AppViewMode: 0, // Document mode
        }
      );
      console.log('[Feishu] Bitable created, response:', response.data);

      const data = response.data;

      if (data.code !== 0) {
        throw new Error(`Failed to create bitable: ${data.msg} (code: ${data.code})`);
      }

      return data.data.app_token;
    } catch (error) {
      if (isAxiosError(error)) {
        const axiosError = error as AxiosError<{ code?: number; msg?: string }>;
        console.error('[Feishu] Create bitable error:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        });
        throw new Error(`Feishu API error: ${JSON.stringify(axiosError.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Create a table in a bitable app with field definitions
   */
  async createTable(
    appToken: string,
    tableName: string
  ): Promise<string> {
    try {
       
      console.log('[Feishu] Creating table:', tableName, 'in app:', appToken);

      // Define fields for stock data (type codes: 1=Text, 2=Number, 4=Date, etc.)
      const fields = [
        { field_name: '股票代码', type: 1 },
        { field_name: '股票名称', type: 1 },
        { field_name: '相关板块', type: 1 },
        { field_name: '教学入市区间', type: 1 },
        { field_name: '操作策略', type: 1 },
        { field_name: '第一压力位', type: 1 },
        { field_name: '支撑位', type: 1 },
        { field_name: '仓位', type: 1 },
        { field_name: '投资亮点', type: 1 },
      ];

      const response = await this.client.post<CreateTableResponse>(
        `/bitable/v1/apps/${appToken}/tables`,
        {
          table: {
            name: tableName,
            fields: fields,
          },
        }
      );
      console.log('[Feishu] Table created, response:', response.data);

      const data = response.data;

      if (data.code !== 0) {
        throw new Error(`Failed to create table: ${data.msg} (code: ${data.code})`);
      }

      return data.data.table_id;
    } catch (error) {
      if (isAxiosError(error)) {
        const axiosError = error as AxiosError<{ code?: number; msg?: string }>;
        console.error('[Feishu] Create table error:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        });
        throw new Error(`Feishu API error: ${JSON.stringify(axiosError.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Create a field in a bitable table
   */
  async createField(
    appToken: string,
    tableId: string,
    fieldName: string,
    fieldType: number = 1  // 1 = Text
  ): Promise<string | null> {
    try {
      console.log('[Feishu] Creating field:', fieldName, 'in table:', tableId);
      const response = await this.client.post(
        `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        {
          field_name: fieldName,
          type: fieldType,
        }
      );

      const data = response.data;
      if (data.code !== 0) {
        console.error('[Feishu] Create field failed:', data);
        return null;
      }

      console.log('[Feishu] Field created:', fieldName);
      return data.data?.field_id;
    } catch (error) {
      console.error('[Feishu] Create field error:', error);
      return null;
    }
  }

  /**
   * Ensure all required fields exist in the table
   * With timeout and simplified logic to prevent hangs
   */
  async ensureFields(appToken: string, tableId: string): Promise<void> {
    const requiredFields = [
      { name: '股票代码', type: 1 },
      { name: '股票名称', type: 1 },
      { name: '相关板块', type: 1 },
      { name: '教学入市区间', type: 1 },
      { name: '操作策略', type: 1 },
      { name: '第一压力位', type: 1 },
      { name: '支撑位', type: 1 },
      { name: '仓位', type: 1 },
      { name: '投资亮点', type: 1 },
    ];

    console.log('[Feishu] Ensuring fields exist in table:', tableId);

    try {
      // Add timeout wrapper for getTableFields
      const timeoutMs = 10000; // 10 second timeout
      const getFieldsWithTimeout = async () => {
        return Promise.race([
          this.getTableFields(appToken, tableId),
          new Promise<Record<string, string>>((_, reject) =>
            setTimeout(() => reject(new Error('getTableFields timeout')), timeoutMs)
          )
        ]);
      };

      // Get existing fields with timeout
      const existingFields = await getFieldsWithTimeout();
      console.log('[Feishu] Existing fields:', Object.keys(existingFields));

      // Only create missing fields (simplified - skip field removal logic)
      for (const field of requiredFields) {
        if (existingFields[field.name]) {
          console.log('[Feishu] Field already exists:', field.name);
        } else {
          console.log('[Feishu] Creating missing field:', field.name);
          try {
            await Promise.race([
              this.createField(appToken, tableId, field.name, field.type),
              new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('createField timeout')), timeoutMs)
              )
            ]);
          } catch (fieldError) {
            console.error('[Feishu] Failed to create field:', field.name, fieldError);
            // Continue with other fields even if one fails
          }
        }
      }
    } catch (error) {
      console.error('[Feishu] ensureFields error:', error);
      // Don't throw - allow insertion to proceed even if field check fails
      console.log('[Feishu] Proceeding with insertion despite field check error');
    }
  }

  /**
   * Insert a record into a bitable table
   */
  async insertRecord(
    appToken: string,
    tableId: string,
    fields: Record<string, unknown>
  ): Promise<string> {
    try {
      console.log('[Feishu] Inserting record to app:', appToken, 'table:', tableId);
      console.log('[Feishu] Input fields:', JSON.stringify(fields, null, 2));

      // Get existing field names to verify
      const existingFields = await this.getTableFields(appToken, tableId);
      console.log('[Feishu] Existing fields:', Object.keys(existingFields));

      // Create fields object using field names (must match exactly)
      const mappedFields: Record<string, unknown> = {};
      const fieldNameMap: Record<string, string> = {
        '股票代码': '股票代码',
        '股票名称': '股票名称',
        '相关板块': '相关板块',
        '教学入市区间': '教学入市区间',
        '操作策略': '操作策略',
        '第一压力位': '第一压力位',
        '支撑位': '支撑位',
        '仓位': '仓位',
        '投资亮点': '投资亮点',
      };

      for (const [key, value] of Object.entries(fields)) {
        const fieldName = fieldNameMap[key];
        if (fieldName) {
          // Verify field exists
          if (existingFields[fieldName] !== undefined) {
            mappedFields[fieldName] = value;
            console.log(`[Feishu] Using field: "${fieldName}" = ${value}`);
          } else {
            console.log(`[Feishu] WARNING: Field not found in table: "${fieldName}"`);
          }
        }
      }

      console.log('[Feishu] Final fields:', JSON.stringify(mappedFields, null, 2));

      const token = await getTenantAccessToken();

      // Ensure proper JSON serialization
      const requestBody = JSON.stringify({ fields: mappedFields });
      console.log('[Feishu] Request body:', requestBody);

      const response = await feishuClient.post(
        `/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      console.log('[Feishu] Response:', JSON.stringify(data, null, 2));

      if (data.code !== 0) {
        throw new Error(`Failed to insert record: ${data.msg} (code: ${data.code})`);
      }

      console.log('[Feishu] Record inserted successfully');
      return data.data.record.record_id;
    } catch (error) {
      if (isAxiosError(error)) {
        const axiosError = error as AxiosError<{ code?: number; msg?: string }>;
        console.error('[Feishu] Insert error:', {
          status: axiosError.response?.status,
          data: JSON.stringify(axiosError.response?.data, null, 2),
        });

        // 常见错误处理
        const errorData = axiosError.response?.data as { code?: number } | undefined;
        const errorCode = errorData?.code;

        if (errorCode === 91403) {
          console.error(`
[Feishu Permission Error]
错误码: 91403 Forbidden
原因: 应用没有多维表格的访问权限
解决方案:
  1. 打开飞书多维表格页面
  2. 点击右上角 "..." 更多菜单
  3. 点击 "添加文档应用"
  4. 搜索并添加你的应用
  5. 或在 "分享" 中添加应用为协作者
`);
        }

        throw new Error(`Feishu API error: ${JSON.stringify(axiosError.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Get table field list
   */
  async getTableFields(appToken: string, tableId: string): Promise<Record<string, string>> {
    try {
      const response = await this.client.get(
        `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`
      );

      const data = response.data;
      if (data.code !== 0) {
        console.error('[Feishu] Get table fields failed:', data);
        return {};
      }

      const fields: Record<string, string> = {};
      for (const field of data.data?.items || []) {
        fields[field.field_name] = field.field_id;
      }
      console.log('[Feishu] Table fields:', JSON.stringify(fields, null, 2));
      return fields;
    } catch (error) {
      console.error('[Feishu] Get table fields error:', error);
      return {};
    }
  }

  /**
   * Map parsed stock to bitable fields
   */
  mapStockToBitableFields(stock: ParsedStock): Record<string, unknown> {
    return {
      股票代码: stock.code,
      股票名称: stock.name,
      相关板块: stock.sector,
      教学入市区间: stock.priceRange,
      操作策略: stock.strategy,
      第一压力位: stock.pressure,
      支撑位: stock.support,
      仓位: stock.position,
      投资亮点: stock.highlights,
    };
  }

  /**
   * Get or create bitable app and table
   */
  async getOrCreateBitable(
    appToken: string | undefined,
    tableId: string | undefined,
    bitableName: string,
    tableName: string
  ): Promise<{ appToken: string; tableId: string }> {
    let currentAppToken = appToken;
    let currentTableId = tableId;

    // If wiki URL is provided, try to get bitable from wiki
    if (currentAppToken && currentAppToken.includes('feishu.cn/wiki/')) {
      const wikiMatch = currentAppToken.match(/wiki\/([a-zA-Z0-9]+)/);
      if (wikiMatch) {
        const wikiToken = wikiMatch[1];
        console.log('[Feishu] Extracted wiki_token:', wikiToken);

        const tableMatch = currentAppToken.match(/[?&]table=([a-zA-Z0-9]+)/);
        if (tableMatch) {
          currentTableId = tableMatch[1];
          console.log('[Feishu] Extracted table_id:', currentTableId);
        }

        const bitableInfo = await this.getBitableFromWiki(wikiToken);
        if (bitableInfo && bitableInfo.appToken) {
          currentAppToken = bitableInfo.appToken;
          console.log('[Feishu] Got bitable app_token from wiki:', currentAppToken);
        } else {
          throw new Error('Failed to get bitable from wiki. Please check wiki permissions.');
        }
      } else {
        throw new Error('Invalid wiki URL format');
      }
    }

    console.log('[Feishu] Using app_token:', currentAppToken);
    console.log('[Feishu] Using tableId:', currentTableId);

    // If appToken configured, verify it exists
    if (currentAppToken) {
      if (!currentTableId) {
        try {
          currentTableId = await this.createTable(currentAppToken, tableName);
          console.log('[Feishu] Created new table:', currentTableId);
        } catch (error: unknown) {
          const axiosError = error as { response?: { data?: { code?: number; msg?: string } } };
          console.error('[Feishu] Create table failed:', axiosError?.response?.data);
          throw new Error(`Failed to create table: ${JSON.stringify(axiosError?.response?.data)}`);
        }
      }
      // Skip field checking to avoid async_hooks crash - assume fields already exist
      console.log('[Feishu] Skipping field check to prevent crash - fields assumed to exist');
    } else {
      // Create new bitable
      console.log('[Feishu] Creating new bitable...');
      currentAppToken = await this.createBitable(bitableName);
      console.log('[Feishu] Created bitable:', currentAppToken);

      currentTableId = await this.createTable(currentAppToken, tableName);
      console.log('[Feishu] Created table:', currentTableId);
    }

    return { appToken: currentAppToken, tableId: currentTableId };
  }

  /**
   * Get bitable app_token from wiki URL
   * Wiki URL format: https://xxx.feishu.cn/wiki/xxxxx?table=yyyyy
   */
  async getBitableFromWiki(wikiToken: string): Promise<{ appToken: string; tableId: string } | null> {
    try {
      console.log('[Feishu] Getting bitable from wiki:', wikiToken);
      const response = await this.client.get(
        `/wiki/v2/spaces/get_node?token=${wikiToken}&obj_type=bitable`
      );

      const data = response.data;
      console.log('[Feishu] Wiki response:', JSON.stringify(data));

      if (data.code !== 0) {
        console.error('[Feishu] Failed to get wiki node:', data);
        return null;
      }

      const appToken = data.data?.node?.obj_token;
      console.log('[Feishu] Got bitable app_token:', appToken);
      return appToken ? { appToken, tableId: '' } : null;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { code?: number; msg?: string } }; message?: string };
      console.error('[Feishu] Get wiki node error:', {
        status: (error as { response?: { status?: number } }).response?.status,
        data: axiosError.response?.data,
        message: axiosError.message
      });
      return null;
    }
  }
}

// Export singleton instance
export const feishuService = new FeishuService();
