/**
 * Feishu (Lark) type definitions
 */

// Parsed stock information from text
export interface ParsedStock {
  code: string;           // 股票代码
  name: string;           // 股票名称
  sector: string;         // 相关板块
  priceRange: string;     // 教学入市区间
  strategy: string;       // 操作策略
  pressure: string;      // 第一压力位
  support: string;        // 支撑位
  position: string;      // 仓位
  highlights: string;    // 投资亮点
}

// Feishu app credentials
export interface FeishuConfig {
  appId: string;
  appSecret: string;
}

// Token response from Feishu
export interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

// Bitable record field values for creation
export interface BitableRecordFields {
  股票代码: string;
  股票名称: string;
  相关板块: string;
  教学入市区间: string;
  操作策略: string;
  第一压力位: string;
  支撑位: string;
  仓位: string;
  投资亮点: string;
  创建时间?: string;
}

// Bitable record for creation request
export interface BitableRecord {
  fields: BitableRecordFields;
}

// Bitable record response
export interface BitableRecordResponse {
  code: number;
  msg: string;
  data: {
    record_id: string;
  };
}

// Bitable table field schema
export interface BitableFieldSchema {
  field_name: string;
  field_type: string;
  property?: Record<string, unknown>;
}

// Create bitable app response
export interface CreateBitableResponse {
  code: number;
  msg: string;
  data: {
    app_token: string;
  };
}

// Create table response
export interface CreateTableResponse {
  code: number;
  msg: string;
  data: {
    table_id: string;
  };
}

// Error response
export interface FeishuError {
  code: number;
  msg: string;
}
