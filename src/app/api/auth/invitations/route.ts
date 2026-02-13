import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth/invitations - Get all invitation codes (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all invitation codes
    const { data: invitations, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitations: invitations || [] });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/auth/invitations - Create invitation code (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { code, expiresAt } = body;

    if (!code || code.length < 6) {
      return NextResponse.json(
        { error: 'Code must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Generate unique code if not provided
    const invitationCode = code || generateCode();

    // Check if code already exists
    const { data: existing } = await supabase
      .from('invitation_codes')
      .select('id')
      .eq('code', invitationCode)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Code already exists' },
        { status: 400 }
      );
    }

    const { data: invitation, error } = await supabase
      .from('invitation_codes')
      .insert({
        code: invitationCode,
        created_by: session.user.id,
        expires_at: expiresAt || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
