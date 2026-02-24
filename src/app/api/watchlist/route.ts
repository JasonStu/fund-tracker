import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getStockPrice } from '@/utils/stockApi';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: stocks, error } = await supabase
    .from('stock_watchlist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ list: stocks });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, code, name, sector, price_range, strategy, first_profit_price, stop_loss_price, position_pct, highlights } = body;

  // 获取当前股价作为登记价格
  const currentPrice = await getStockPrice(code);

  const { data, error } = await supabase
    .from('stock_watchlist')
    .insert({
      type: type || '情报扫描',
      code,
      name,
      sector,
      price_range,
      strategy,
      first_profit_price,
      stop_loss_price,
      position_pct,
      highlights,
      registered_price: currentPrice,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
