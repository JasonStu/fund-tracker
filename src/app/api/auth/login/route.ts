import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/login - User login (单设备登录)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }

    // 先获取用户信息
    const { data: userData } = await adminSupabase.auth.admin.listUsers();

    // 查找匹配的用户
    const user = userData.users.find(u => u.email === email);

    // 如果用户已存在，先使所有会话失效（单设备登录）
    if (user) {
      await adminSupabase.auth.admin.signOut(user.id);
    }

    // 然后进行登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
