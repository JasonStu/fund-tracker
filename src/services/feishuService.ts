/**
 * Feishu Service
 * Handles authentication and API calls to Feishu/Lark Open Platform
 */

import axios, { AxiosInstance } from 'axios';
import {
  FeishuConfig,
  FeishuTokenResponse,
  ParsedStock,
  BitableRecord,
  BitableRecordResponse,
  CreateBitableResponse,
  CreateTableResponse,
} from '@/types/feishu';

// Base URLs for Feishu API
const FEISHU_BASE_URL = 'https://open.feishu.cn/open-apis';
const FEISHU_API_VERSION = 'v1';

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

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
 */
export async function getTenantAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const config = getFeishuConfig();
  try {
    const response = await axios.post<FeishuTokenResponse>(
      `${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`,
      {
        app_id: config.appId,
        app_secret: config.appSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );

    const data = response.data;

    if (data.code !== 0) {
      throw new Error(`Feishu auth failed: ${data.msg} (code: ${data.code})`);
    }

    // Cache the token with buffer time (expire 1 minute early)
    cachedToken = data.tenant_access_token;
    tokenExpiry = Date.now() + (data.expire - 60) * 1000;

    return cachedToken;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      console.error('Feishu API Error:', { status, data: responseData, url: error.config?.url });
      throw new Error(`Feishu API error ${status}: ${JSON.stringify(responseData)}`);
    }
    throw error;
  }
}

/**
 * Create axios instance with Feishu authentication
 */
export function createFeishuClient(): AxiosInstance {
  return axios.create({
    baseURL: FEISHU_BASE_URL,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
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
      if (axios.isAxiosError(error)) {
        console.error('[Feishu] Create bitable error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`Feishu API error: ${JSON.stringify(error.response?.data)}`);
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
      if (axios.isAxiosError(error)) {
        console.error('[Feishu] Create table error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`Feishu API error: ${JSON.stringify(error.response?.data)}`);
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

    // Get existing fields
    const existingFields = await this.getTableFields(appToken, tableId);
    console.log('[Feishu] Existing fields:', Object.keys(existingFields));

    // Remove unnecessary fields that might interfere
    const fieldsToRemove = ['文本', '单选', '日期', '附件'];
    for (const fieldName of fieldsToRemove) {
      if (existingFields[fieldName]) {
        console.log('[Feishu] Removing unnecessary field:', fieldName);
        // Note: Can't delete fields via API, just skip them
      }
    }

    // Only create missing fields
    for (const field of requiredFields) {
      if (existingFields[field.name]) {
        console.log('[Feishu] Field already exists:', field.name);
      } else {
        console.log('[Feishu] Creating missing field:', field.name);
        await this.createField(appToken, tableId, field.name, field.type);
      }
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

      const url = `${FEISHU_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
      const token = await getTenantAccessToken();

      // Ensure proper JSON serialization
      const requestBody = JSON.stringify({ fields: mappedFields });
      console.log('[Feishu] Request body:', requestBody);

      const response = await axios.post(
        url,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
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
      if (axios.isAxiosError(error)) {
        console.error('[Feishu] Insert error:', {
          status: error.response?.status,
          data: JSON.stringify(error.response?.data, null, 2),
        });

        // 常见错误处理
        const errorData = error.response?.data;
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

        throw new Error(`Feishu API error: ${JSON.stringify(error.response?.data)}`);
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
      // Ensure fields exist (even for existing tables)
      await this.ensureFields(currentAppToken, currentTableId);
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
