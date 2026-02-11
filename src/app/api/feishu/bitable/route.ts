/**
 * Feishu API Route - Bitable
 * Handles bitable operations: create apps, tables, and insert records
 */

import { NextRequest, NextResponse } from 'next/server';
import { feishuService } from '@/services/feishuService';
import { parseStockInfo, ParsedStock } from '@/utils/textParser';

// Helper to parse JSON body
async function parseBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{
      action: 'insert' | 'create_app' | 'create_table';
      stock?: ParsedStock;
      appToken?: string;
      tableId?: string;
      appName?: string;
      tableName?: string;
    }>(request);

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { FEISHU_BITABLE_APP_TOKEN, FEISHU_BITABLE_TABLE_ID } = process.env;

    switch (body.action) {
      case 'insert': {
        if (!body.stock) {
          return NextResponse.json(
            { success: false, error: 'Stock data is required for insert action' },
            { status: 400 }
          );
        }

        // Get or create bitable
        const { appToken, tableId } = await feishuService.getOrCreateBitable(
          FEISHU_BITABLE_APP_TOKEN,
          FEISHU_BITABLE_TABLE_ID,
          body.appName || '股票分析数据',
          body.tableName || '股票记录'
        );

        // Map stock to fields and insert
        const fields = feishuService.mapStockToBitableFields(body.stock);
        const recordId = await feishuService.insertRecord(appToken, tableId, fields);

        return NextResponse.json({
          success: true,
          data: {
            recordId,
            appToken,
            tableId,
          },
        });
      }

      case 'create_app': {
        const appToken = await feishuService.createBitable(body.appName || '股票分析数据');
        return NextResponse.json({
          success: true,
          data: { appToken },
        });
      }

      case 'create_table': {
        if (!body.appToken) {
          return NextResponse.json(
            { success: false, error: 'appToken is required for create_table action' },
            { status: 400 }
          );
        }
         
        const tableId = await feishuService.createTable(
          body.appToken,
          body.tableName || '股票记录'
        );
        return NextResponse.json({
          success: true,
          data: { tableId },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${body.action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Feishu API error:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return configuration status
  const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BITABLE_APP_TOKEN, FEISHU_BITABLE_TABLE_ID } = process.env;

  return NextResponse.json({
    success: true,
    configured: Boolean(FEISHU_APP_ID && FEISHU_APP_SECRET),
    bitable: {
      hasAppToken: Boolean(FEISHU_BITABLE_APP_TOKEN),
      hasTableId: Boolean(FEISHU_BITABLE_TABLE_ID),
    },
  });
}
