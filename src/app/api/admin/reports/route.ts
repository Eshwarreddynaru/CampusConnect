import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Use service role to bypass RLS
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        let reports;
        let matches;

        if (serviceRoleKey && serviceRoleKey !== 'your-service-role-key') {
            const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            const { data: reportsData, error: reportsError } = await adminClient
                .from('reports')
                .select(`
                    id, type, title, description, category, report_code,
                    register_number, images, location, latitude, longitude,
                    status, created_at, updated_at, user_id, is_private, 
                    matched_with, match_score
                `)
                .order('created_at', { ascending: false });

            if (reportsError) {
                console.error('Error fetching reports:', reportsError);
                return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
            }

            const { data: matchesData } = await adminClient
                .from('matches')
                .select('*')
                .order('match_score', { ascending: false });

            reports = reportsData;
            matches = matchesData;
        } else {
            // Fallback without service role
            const { data: reportsData } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });

            const { data: matchesData } = await supabase
                .from('matches')
                .select('*')
                .order('match_score', { ascending: false });

            reports = reportsData;
            matches = matchesData;
        }

        return NextResponse.json({ 
            reports: reports || [], 
            matches: matches || [],
            totalReports: reports?.length || 0,
            totalMatches: matches?.length || 0,
            privateReports: reports?.filter((r: any) => r.is_private).length || 0,
            matchedReports: reports?.filter((r: any) => r.matched_with).length || 0
        });
    } catch (error) {
        console.error('Admin reports API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
