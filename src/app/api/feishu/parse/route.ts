/**
 * Parse API Route
 * Parses stock text without calling Feishu API
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseStockInfo, validateParsedStock } from '@/utils/textParser';

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Text content is required' },
        { status: 400 }
      );
    }

    // Parse the stock information
    const parsed = parseStockInfo(text);

    // Validate the parsed result
    const validation = validateParsedStock(parsed);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
