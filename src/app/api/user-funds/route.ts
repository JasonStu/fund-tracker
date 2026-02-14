import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UserFundWithValue } from '@/types';
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

    // Fetch user's funds from user_funds table
    const { data: userFunds, error: fundsError } = await supabase
      .from('user_funds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fundsError) {
      console.error('Fetch user funds error:', fundsError);
      return NextResponse.json(
        { error: 'Failed to fetch user funds' },
        { status: 500 }
      );
    }

    // Fetch realtime valuations for each fund in parallel
    const valuationPromises = userFunds.map((fund) =>
      getFundRealtimeValuation(fund.fund_code)
    );
    const valuations = await Promise.all(valuationPromises);

    // Merge user funds with realtime valuations
    const userFundsWithValue: UserFundWithValue[] = userFunds.map(
      (fund, index) => {
        const valuation = valuations[index];
        const totalCost = Number(fund.shares) * Number(fund.cost);
        const currentValue = Number(fund.shares) * valuation.estimatedNav;
        const profit = currentValue - totalCost;
        const profitPercent =
          totalCost > 0 ? (profit / totalCost) * 100 : 0;

        return {
          id: fund.id,
          user_id: fund.user_id,
          fund_code: fund.fund_code,
          fund_name: fund.fund_name || `Fund ${fund.fund_code}`,
          shares: Number(fund.shares),
          cost: Number(fund.cost),
          created_at: fund.created_at,
          updated_at: fund.updated_at,
          nav: valuation.nav,
          estimatedNav: valuation.estimatedNav,
          estimatedChange: valuation.estimatedChange,
          estimatedChangePercent: valuation.estimatedChangePercent,
          currentValue,
          totalCost,
          profit,
          profitPercent,
        };
      }
    );

    return NextResponse.json(userFundsWithValue);
  } catch (error) {
    console.error('GET /api/user-funds error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
