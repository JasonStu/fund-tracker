import { NextRequest, NextResponse } from 'next/server';
import { getFundHistoryNAV } from '@/services/fundService';

type Props = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, props: Props) {
  const params = await props.params;
  const { code } = params;
  
  // Parse pageSize from query params
  const { searchParams } = new URL(request.url);
  const pageSize = parseInt(searchParams.get('pageSize') || '365');

  try {
    const data = await getFundHistoryNAV(code, pageSize);
    return NextResponse.json(data);
  } catch (error) {
    console.error('History API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch fund history' }, { status: 500 });
  }
}
