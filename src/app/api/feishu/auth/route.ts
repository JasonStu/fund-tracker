/**
 * Feishu API Route - Auth
 * Handles token refresh requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/services/feishuService';

export async function GET(request: NextRequest) {
  try {
    const token = await getTenantAccessToken();
    return NextResponse.json({
      success: true,
      token: token,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
