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

    // First, get the position to find its code
    const { data: position, error: positionError } = await supabase
      .from('user_funds')
      .select('fund_code, type')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (positionError || !position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    // Delete transactions first (use fund_code, not id)
    const { error: txError } = await supabase
      .from('fund_transactions')
      .delete()
      .eq('fund_code', position.fund_code)
      .eq('type', position.type || 'fund');

    if (txError) {
      console.error('Delete transactions error:', txError);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Then delete the position
    const { error: deleteError } = await supabase
      .from('user_funds')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete position error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
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
