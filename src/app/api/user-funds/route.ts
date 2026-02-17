import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Position, Transaction } from '@/types';
import axios from 'axios';
import { NextResponse } from 'next/server';

// Helper to fetch realtime fund valuation from EastMoney
async function getFundRealtimeValuation(fundCode: string) {
  try {
    const url = `http://fundgz.1234567.com.cn/js/${fundCode}.js`;
    const response = await axios.get(url, { timeout: 5000 });

    if (response.data && typeof response.data === 'string') {
      const match = response.data.match(/jsonpgz\((.*)\)/);
      if (match) {
        const data = JSON.parse(match[1]);
        return {
          nav: parseFloat(data.dwjz) || 0,
          estimatedNav: parseFloat(data.gsz) || parseFloat(data.dwjz) || 0,
          estimatedChange: parseFloat(data.gszzl) || 0,
          estimatedChangePercent: parseFloat(data.gszzl) || 0,
          calculationTime: data.gztime || new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.error(`Fetch fund ${fundCode} valuation failed:`, error);
  }
  return {
    nav: 0,
    estimatedNav: 0,
    estimatedChange: 0,
    estimatedChangePercent: 0,
    calculationTime: new Date().toISOString(),
  };
}

// Helper to fetch stock realtime price from EastMoney
async function getStockRealtimePrice(stockCode: string) {
  try {
    // Convert to market code format
    let market = '';
    if (stockCode.startsWith('6')) {
      market = '1'; // Shanghai
    } else if (stockCode.startsWith('0') || stockCode.startsWith('3')) {
      market = '0'; // Shenzhen
    }

    const url = `https://push2.eastmoney.com/api/qt/stock/get?` +
      `fields=f43,f57,f58,f86,f204,f205,f169,f170&` +
      `fltt=2&` +
      `invt=2&` +
      `secid=${market}.${stockCode}`;

    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    if (data && data.data) {
      const f43 = parseFloat(data.data.f43) || 0; // Current price
      const f57 = parseFloat(data.data.f57) || 0; // Previous close
      const f86 = parseFloat(data.data.f86) || 0; // Volume
      return {
        currentPrice: f43,
        previousClose: f57,
        change: f43 - f57,
        changePercent: f57 > 0 ? ((f43 - f57) / f57) * 100 : 0,
        volume: f86,
      };
    }
  } catch (error) {
    console.error(`Fetch stock ${stockCode} price failed:`, error);
  }
  return {
    currentPrice: 0,
    previousClose: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
  };
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user's holdings from user_funds table
    const { data: userHoldings, error: holdingsError } = await supabase
      .from('user_funds')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (holdingsError) {
      console.error('Fetch user holdings error:', holdingsError);
      return NextResponse.json(
        { error: 'Failed to fetch user holdings' },
        { status: 500 }
      );
    }

    // Fetch all transactions for this user
    const { data: transactions, error: transactionsError } = await supabase
      .from('fund_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (transactionsError) {
      console.error('Fetch transactions error:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Aggregate position data
    const positionMap = new Map<string, Position>();

    // Initialize positions from user_funds
    for (const holding of userHoldings || []) {
      const type = holding.type || 'fund';
      const code = holding.fund_code;
      const name = holding.fund_name || (type === 'stock' ? `Stock ${code}` : `Fund ${code}`);

      positionMap.set(code, {
        id: holding.id,
        user_id: holding.user_id,
        type,
        code,
        name,
        sort_order: holding.sort_order || 0,
        shares: 0,
        avg_cost: 0,
        total_buy: 0,
        total_sell: 0,
        nav: 0,
        estimatedNav: 0,
        estimatedChange: 0,
        estimatedChangePercent: 0,
        currentValue: 0,
        profit: 0,
        profitPercent: 0,
        created_at: holding.created_at,
        updated_at: holding.updated_at,
      });
    }

    // Aggregate transactions using FIFO
    for (const tx of transactions || []) {
      const position = positionMap.get(tx.fund_code);
      if (!position) continue;

      const txShares = Number(tx.shares) || 0;
      const txPrice = Number(tx.price) || 0;

      if (tx.transaction_type === 'buy') {
        const currentShares = position.shares;
        const newShares = currentShares + txShares;
        const totalBuyCost = position.total_buy + (txShares * txPrice);

        if (newShares > 0) {
          position.avg_cost = totalBuyCost / newShares;
        }
        position.shares = newShares;
        position.total_buy = totalBuyCost;
      } else if (tx.transaction_type === 'sell') {
        position.shares = Math.max(0, position.shares - txShares);
        position.total_sell += txShares * txPrice;
      }
    }

    // Convert to array and sort by sort_order
    const positions: Position[] = Array.from(positionMap.values())
      .sort((a, b) => a.sort_order - b.sort_order);

    // Fetch realtime valuations/prices for each position in parallel
    const fetchPromises = positions.map(async (position) => {
      if (position.type === 'stock') {
        return await getStockRealtimePrice(position.code);
      } else {
        return await getFundRealtimeValuation(position.code);
      }
    });

    const valuations = await Promise.all(fetchPromises);

    // Calculate positions with FIFO method
    const positionsWithValue = positions.map((position, index) => {
      const valuation = valuations[index];

      // Get all transactions for this position
      const positionTransactions = (transactions || [])
        .filter(tx => tx.fund_code === position.code)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // FIFO calculation
      type BuyLot = { shares: number; cost: number; pricePerShare: number };
      const buyLots: BuyLot[] = [];

      let currentShares = 0;
      let totalBuy = 0;
      let totalSell = 0;

      for (const tx of positionTransactions) {
        const txShares = Number(tx.shares) || 0;
        const txPrice = Number(tx.price) || 0;

        if (tx.transaction_type === 'buy') {
          buyLots.push({ shares: txShares, cost: txShares * txPrice, pricePerShare: txPrice });
          currentShares += txShares;
          totalBuy += txShares * txPrice;
        } else if (tx.transaction_type === 'sell') {
          let sharesToSell = txShares;
          totalSell += txShares * txPrice;

          while (sharesToSell > 0 && buyLots.length > 0) {
            const lot = buyLots[0];
            if (lot.shares <= sharesToSell) {
              sharesToSell -= lot.shares;
              currentShares -= lot.shares;
              buyLots.shift();
            } else {
              lot.shares -= sharesToSell;
              lot.cost = lot.shares * lot.pricePerShare;
              currentShares -= sharesToSell;
              sharesToSell = 0;
            }
          }
          currentShares = Math.max(0, currentShares);
        }
      }

      const remainingCost = buyLots.reduce((sum, lot) => sum + lot.cost, 0);
      const avgCost = currentShares > 0 ? remainingCost / currentShares : 0;

      // Calculate realized profit
      let realizedCost = 0;
      const tempLots: BuyLot[] = [];
      for (const tx of positionTransactions) {
        const txShares = Number(tx.shares) || 0;
        const txPrice = Number(tx.price) || 0;
        if (tx.transaction_type === 'buy') {
          tempLots.push({ shares: txShares, cost: txShares * txPrice, pricePerShare: txPrice });
        } else if (tx.transaction_type === 'sell') {
          let sharesToCalc = txShares;
          while (sharesToCalc > 0 && tempLots.length > 0) {
            const lot = tempLots[0];
            const consumed = Math.min(lot.shares, sharesToCalc);
            realizedCost += consumed * lot.pricePerShare;
            sharesToCalc -= consumed;
            if (lot.shares <= consumed) {
              tempLots.shift();
            } else {
              lot.shares -= consumed;
              lot.cost = lot.shares * lot.pricePerShare;
            }
          }
        }
      }

      const realizedProfit = totalSell - realizedCost;
      const estimatedNav = position.type === 'stock'
        ? (valuation as any).currentPrice || 0
        : (valuation as any).estimatedNav || 0;
      const unrealizedProfit = (currentShares * estimatedNav) - remainingCost;
      const totalProfit = realizedProfit + unrealizedProfit;

      const currentValue = currentShares * estimatedNav;
      const estimatedChange = position.type === 'stock'
        ? (valuation as any).change || 0
        : (valuation as any).estimatedChange || 0;
      const estimatedChangePercent = position.type === 'stock'
        ? (valuation as any).changePercent || 0
        : (valuation as any).estimatedChangePercent || 0;

      return {
        ...position,
        nav: position.type === 'stock'
          ? (valuation as any).previousClose || 0
          : (valuation as any).nav || 0,
        estimatedNav,
        estimatedChange,
        estimatedChangePercent,
        shares: currentShares,
        avg_cost: avgCost,
        total_buy: totalBuy,
        total_sell: totalSell,
        currentValue,
        profit: totalProfit,
        profitPercent: totalBuy > 0 ? (totalProfit / totalBuy) * 100 : 0,
      };
    });

    return NextResponse.json({
      positions: positionsWithValue,
      transactions: transactions || [],
    });
  } catch (error) {
    console.error('GET /api/user-funds error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface AddPositionBody {
  type?: 'fund' | 'stock';
  code: string;
  name?: string;
  shares?: number;
  cost?: number;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    let body: AddPositionBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
      type = 'fund',
      code,
      name,
      shares: sharesInput = 0,
      cost: costInput = 0,
    } = body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const shares = Number(sharesInput);
    const cost = Number(costInput);

    if (isNaN(shares) || shares < 0) {
      return NextResponse.json({ error: 'shares must be non-negative' }, { status: 400 });
    }

    if (isNaN(cost) || cost < 0) {
      return NextResponse.json({ error: 'cost must be non-negative' }, { status: 400 });
    }

    // Check if position already exists
    const { data: existingPosition, error: checkError } = await supabase
      .from('user_funds')
      .select('id')
      .eq('user_id', userId)
      .eq('fund_code', code.trim())
      .eq('type', type)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check existing position error:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingPosition) {
      return NextResponse.json({ error: 'Position already exists', id: existingPosition.id }, { status: 409 });
    }

    // Get max sort_order
    const { data: maxOrderData, error: orderError } = await supabase
      .from('user_funds')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = maxOrderData ? (Number(maxOrderData.sort_order) || 0) + 1 : 0;

    // Insert into user_funds
    const { data: newPosition, error: insertError } = await supabase
      .from('user_funds')
      .insert({
        user_id: userId,
        fund_code: code.trim(),
        fund_name: name || null,
        type,
        sort_order: newSortOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert position error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If shares > 0, create initial buy transaction
    if (shares > 0) {
      const { error: txError } = await supabase
        .from('fund_transactions')
        .insert({
          user_id: userId,
          fund_code: code.trim(),
          fund_name: name || null,
          type,
          transaction_type: 'buy',
          shares,
          price: cost,
          notes: 'Initial position',
        });

      if (txError) {
        console.error('Create initial transaction error:', txError);
        return NextResponse.json(
          { ...newPosition, warning: 'Position created but initial transaction failed' },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(newPosition, { status: 201 });
  } catch (error) {
    console.error('POST /api/user-funds error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
