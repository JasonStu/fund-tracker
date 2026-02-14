import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface SortItem {
  id: string;
  sort_order: number;
}

export async function PUT(request: Request) {
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

    // Parse request body
    let body: SortItem[];
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an array of { id, sort_order }' }, { status: 400 });
    }

    if (body.length === 0) {
      return NextResponse.json({ error: 'Array cannot be empty' }, { status: 400 });
    }

    // Validate each item
    for (let i = 0; i < body.length; i++) {
      const item = body[i];
      if (!item.id || typeof item.id !== 'string') {
        return NextResponse.json({ error: `Item at index ${i} must have a valid id` }, { status: 400 });
      }
      if (typeof item.sort_order !== 'number' || isNaN(item.sort_order)) {
        return NextResponse.json({ error: `Item at index ${i} must have a valid sort_order` }, { status: 400 });
      }
    }

    // Extract all ids
    const ids = body.map((item) => item.id);

    // Verify all ids belong to the user
    const { data: existingFunds, error: checkError } = await supabase
      .from('user_funds')
      .select('id')
      .eq('user_id', userId)
      .in('id', ids);

    if (checkError) {
      console.error('Verify fund ownership error:', checkError);
      return NextResponse.json({ error: 'Failed to verify fund ownership' }, { status: 500 });
    }

    const existingIds = new Set(existingFunds?.map((f) => f.id) || []);
    const invalidIds = ids.filter((id) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'One or more fund IDs do not belong to user', invalid_ids: invalidIds },
        { status: 403 }
      );
    }

    // Update sort_order for each item
    const updatePromises = body.map((item) =>
      supabase
        .from('user_funds')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('user_id', userId) // Double-check ownership in update
    );

    const results = await Promise.all(updatePromises);

    // Check for any errors
    const hasError = results.some((result) => result.error);
    if (hasError) {
      console.error('Update sort order errors:', results.map((r) => r.error));
      return NextResponse.json({ error: 'Failed to update sort order' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Sort order updated successfully' });
  } catch (error) {
    console.error('PUT /api/user-funds/sort error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
