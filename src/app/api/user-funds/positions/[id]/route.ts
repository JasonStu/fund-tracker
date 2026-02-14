import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete transactions first (due to foreign key)
    const { error: txError } = await supabase
      .from('fund_transactions')
      .delete()
      .eq('fund_id', id);

    if (txError) {
      console.error('Delete transactions error:', txError);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Then delete the fund
    const { error: fundError } = await supabase
      .from('user_funds')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (fundError) {
      console.error('Delete fund error:', fundError);
      return NextResponse.json({ error: fundError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user-funds/positions/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
