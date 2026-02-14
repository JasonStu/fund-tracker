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
  // Return default values if fetch fails
  return {
    nav: 0,
    estimatedNav: 0,
    estimatedChange: 0,
    estimatedChangePercent: 0,
    calculationTime: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    // Create Supabase client with auth context
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user's funds from user_funds table with sort_order
    const { data: userFunds, error: fundsError } = await supabase
      .from('user_funds')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (fundsError) {
      console.error('Fetch user funds error:', fundsError);
      return NextResponse.json(
        { error: 'Failed to fetch user funds' },
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

    // Aggregate position data by fund_id
    const positionMap = new Map<string, Position>();

    // Initialize positions from user_funds
    for (const fund of userFunds) {
      positionMap.set(fund.id, {
        id: fund.id,
        user_id: fund.user_id,
        fund_code: fund.fund_code,
        fund_name: fund.fund_name || `Fund ${fund.fund_code}`,
        sort_order: fund.sort_order || 0,
        shares: 0,
        avg_cost: 0,
        total_buy: 0,
        total_sell: 0,
        created_at: fund.created_at,
        updated_at: fund.updated_at,
      });
    }

    // Aggregate transactions
    for (const tx of transactions || []) {
      const position = positionMap.get(tx.fund_id);
      if (!position) continue;

      const txShares = Number(tx.shares) || 0;
      const txPrice = Number(tx.price) || 0;

      if (tx.transaction_type === 'buy') {
        // Calculate new average cost
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

    // Fetch realtime valuations for each position in parallel
    const valuationPromises = positions.map((position) =>
      getFundRealtimeValuation(position.fund_code)
    );
    const valuations = await Promise.all(valuationPromises);

    // Add valuation data to positions
    const positionsWithValue = positions.map((position, index) => {
      const valuation = valuations[index];
      const currentValue = position.shares * valuation.estimatedNav;
      const totalCost = position.total_buy - position.total_sell;
      const profit = currentValue - totalCost;
      const costBasis = position.total_buy - position.total_sell;
      const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

      return {
        ...position,
        nav: valuation.nav,
        estimatedNav: valuation.estimatedNav,
        estimatedChange: valuation.estimatedChange,
        estimatedChangePercent: valuation.estimatedChangePercent,
        currentValue,
        totalCost,
        profit,
        profitPercent,
      };
    });

    // Return both positions and transactions
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

interface AddFundBody {
  fund_code: string;
  fund_name?: string;
  shares?: number;
  cost?: number;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    let body: AddFundBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { fund_code, fund_name, shares: sharesInput = 0, cost: costInput = 0 } = body;

    // Log raw body for debugging
    console.log('Raw body:', body);

    // Convert to numbers and validate
    const shares = Number(sharesInput);
    const cost = Number(costInput);

    console.log('Parsed values:', { fund_code, fund_name, shares, cost });

    if (!fund_code || typeof fund_code !== 'string' || fund_code.trim() === '') {
      return NextResponse.json({ error: 'fund_code is required and must be a non-empty string' }, { status: 400 });
    }

    if (isNaN(shares) || shares < 0) {
      return NextResponse.json({ error: 'shares must be a non-negative number' }, { status: 400 });
    }

    if (isNaN(cost) || cost < 0) {
      return NextResponse.json({ error: 'cost must be a non-negative number' }, { status: 400 });
    }

    // Check if fund already exists for this user
    const { data: existingFund, error: checkError } = await supabase
      .from('user_funds')
      .select('id')
      .eq('user_id', userId)
      .eq('fund_code', fund_code.trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check existing fund error:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingFund) {
      return NextResponse.json({ error: 'Fund already exists', fund_id: existingFund.id }, { status: 409 });
    }

    // Get max sort_order for this user
    const { data: maxOrderData, error: orderError } = await supabase
      .from('user_funds')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = maxOrderData ? (Number(maxOrderData.sort_order) || 0) + 1 : 0;

    if (orderError && orderError.code !== 'PGRST116') {
      console.error('Get max sort_order error:', orderError);
      return NextResponse.json(
        { error: 'Failed to determine sort order' },
        { status: 500 }
      );
    }

    // Insert into user_funds table
    console.log('Inserting fund:', { fund_code, fund_name, shares, cost, sort_order: newSortOrder });
    const { data: newFund, error: insertError } = await supabase
      .from('user_funds')
      .insert({
        user_id: userId,
        fund_code: fund_code.trim(),
        fund_name: fund_name || null,
        shares: 0, // Always start with 0, we'll create a transaction for initial shares
        cost: 0,
        sort_order: newSortOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert user fund error:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // If shares > 0, create initial buy transaction
    if (shares > 0) {
      const { error: txError } = await supabase
        .from('fund_transactions')
        .insert({
          user_id: userId,
          fund_id: newFund.id,
          fund_code: fund_code.trim(),
          fund_name: fund_name || null,
          transaction_type: 'buy',
          shares,
          price: cost,
          total_amount: shares * cost,
          notes: 'Initial position',
        });

      if (txError) {
        console.error('Create initial transaction error:', txError);
        // Fund was created, but transaction failed - still return success with warning
        return NextResponse.json(
          { ...newFund, warning: 'Fund created but initial transaction failed' },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(newFund, { status: 201 });
  } catch (error) {
    console.error('POST /api/user-funds error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
