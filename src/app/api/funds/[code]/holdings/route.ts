import { NextRequest, NextResponse } from 'next/server';
import { getFundHoldings } from '@/services/fundService';

type Props = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, props: Props) {
  const params = await props.params;
  const { code } = params;

  try {
    const data = await getFundHoldings(code);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Holdings API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }
}
