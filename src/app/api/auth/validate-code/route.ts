import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/validate-code - Validate invitation code
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    // Check if invitation code is valid
    const { data: invitation, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation code' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation code has expired' },
        { status: 400 }
      );
    }

    // Check if invitation is already used
    if (invitation.used_by) {
      return NextResponse.json(
        { error: 'Invitation code has already been used' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        code: invitation.code,
      },
    });
  } catch (error) {
    console.error('Error validating code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
