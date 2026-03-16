import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function PATCH(request: Request) {
    try {
        const { userId, status } = await request.json();

        if (!userId || !status) {
            return NextResponse.json({ error: 'userId and status are required' }, { status: 400 });
        }

        // Verify the current user is an admin
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!currentProfile || currentProfile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Use service role key if available
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        let error;

        if (serviceRoleKey && serviceRoleKey !== 'your-service-role-key') {
            const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            const { error: updateError } = await adminClient
                .from('profiles')
                .update({ status })
                .eq('id', userId);

            error = updateError;
        } else {
            // Use RPC function to update as admin
            const { error: rpcError } = await supabase
                .rpc('admin_update_user_status', { target_user_id: userId, new_status: status });

            if (rpcError) {
                // Fallback to direct update
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ status })
                    .eq('id', userId);
                error = updateError;
            }
        }

        if (error) {
            console.error('Error updating user status:', error);
            return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin status update API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
