import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface CreateTransactionBody {
  fund_id: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
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

    let body: CreateTransactionBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { fund_id, type, shares, price, notes } = body;

    // Validate required fields
    if (!fund_id || typeof fund_id !== 'string') {
      return NextResponse.json(
        { error: 'fund_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'buy' && type !== 'sell')) {
      return NextResponse.json(
        { error: 'type must be "buy" or "sell"' },
        { status: 400 }
      );
    }

    if (typeof shares !== 'number' || isNaN(shares) || shares <= 0) {
      return NextResponse.json(
        { error: 'shares must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: 'price must be a non-negative number' },
        { status: 400 }
      );
    }

    // Verify fund exists and belongs to user
    const { data: fund, error: fundError } = await supabase
      .from('user_funds')
      .select('id, fund_code, fund_name')
      .eq('id', fund_id)
      .eq('user_id', userId)
      .single();

    if (fundError || !fund) {
      return NextResponse.json(
        { error: 'Fund not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate current shares from transactions
    const { data: transactions, error: txError } = await supabase
      .from('fund_transactions')
      .select('shares, transaction_type')
      .eq('fund_id', fund_id)
      .eq('user_id', userId);

    if (txError) {
      console.error('Fetch transactions error:', txError);
      return NextResponse.json({ error: 'Failed to calculate shares' }, { status: 500 });
    }

    let currentShares = 0;
    for (const tx of transactions || []) {
      if (tx.transaction_type === 'buy') {
        currentShares += Number(tx.shares) || 0;
      } else if (tx.transaction_type === 'sell') {
        currentShares -= Number(tx.shares) || 0;
      }
    }

    // Validate sell operation has sufficient shares
    if (type === 'sell' && shares > currentShares) {
      return NextResponse.json(
        { error: 'Insufficient shares for sell operation' },
        { status: 400 }
      );
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('fund_transactions')
      .insert({
        user_id: userId,
        fund_id,
        fund_code: fund.fund_code,
        fund_name: fund.fund_name,
        transaction_type: type,
        shares,
        price,
        notes: notes || null,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Create transaction error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('POST /api/user-funds/transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
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

    // Fetch all transactions for user
    const { data: transactions, error: transactionsError } = await supabase
      .from('fund_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Fetch transactions error:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error('GET /api/user-funds/transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
