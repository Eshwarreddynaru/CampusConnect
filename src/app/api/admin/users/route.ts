import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        // First verify the current user is an admin using the regular server client
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin by querying their own profile (which is allowed by RLS)
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!currentProfile || currentProfile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Use the service role key if available, otherwise use a workaround
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        let profiles;
        let reports;
        let claims;

        if (serviceRoleKey && serviceRoleKey !== 'your-service-role-key') {
            // Use service role client to bypass RLS
            const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            const { data: profilesData, error: profilesError } = await adminClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
            }

            const { data: reportsData } = await adminClient.from('reports').select('user_id');
            const { data: claimsData } = await adminClient.from('claims').select('claimer_id');

            profiles = profilesData;
            reports = reportsData;
            claims = claimsData;
        } else {
            // Fallback: Use the admin's authenticated client with RPC
            // We use the rpc function to get all profiles as admin
            const { data: profilesData, error: profilesError } = await supabase
                .rpc('get_all_profiles_admin');

            if (profilesError) {
                console.error('RPC error, falling back to direct query:', profilesError);
                // Final fallback: direct query (may only return admin's own profile due to RLS)
                const { data: fallbackProfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });
                profiles = fallbackProfiles;
            } else {
                profiles = profilesData;
            }

            const { data: reportsData } = await supabase.from('reports').select('user_id');
            const { data: claimsData } = await supabase.from('claims').select('claimer_id');
            reports = reportsData;
            claims = claimsData;
        }

        // Count per user
        const reportCounts: Record<string, number> = {};
        const claimCounts: Record<string, number> = {};

        (reports || []).forEach((r: { user_id: string }) => {
            reportCounts[r.user_id] = (reportCounts[r.user_id] || 0) + 1;
        });
        (claims || []).forEach((c: { claimer_id: string }) => {
            claimCounts[c.claimer_id] = (claimCounts[c.claimer_id] || 0) + 1;
        });

        const enrichedUsers = (profiles || []).map((p: any) => ({
            ...p,
            reportCount: reportCounts[p.id] || 0,
            claimCount: claimCounts[p.id] || 0,
        }));

        return NextResponse.json({ users: enrichedUsers });
    } catch (error) {
        console.error('Admin users API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
