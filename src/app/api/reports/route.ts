import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use admin client to bypass RLS for server-side filtering
        const adminClient = createAdminClient();

        // Check if user is admin
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';

        if (isAdmin) {
            // Admins see ALL reports
            const { data: reports, error } = await adminClient
                .from('reports')
                .select(`
                    id, type, title, description, category, report_code, 
                    register_number, images, location, latitude, longitude,
                    status, created_at, user_id, is_private, matched_with, match_score
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching reports:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ reports: reports || [], isAdmin });
        }

        // Regular users: get their own reports
        const { data: ownReports, error: ownError } = await adminClient
            .from('reports')
            .select(`
                id, type, title, description, category, report_code, 
                register_number, images, location, latitude, longitude,
                status, created_at, user_id, is_private, matched_with, match_score
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (ownError) {
            console.error('Error fetching own reports:', ownError);
            return NextResponse.json({ error: ownError.message }, { status: 500 });
        }

        // Get IDs of user's own reports
        const ownReportIds = (ownReports || []).map(r => r.id);

        // Find matches that involve any of the user's reports
        let matchedReportIds: string[] = [];
        
        if (ownReportIds.length > 0) {
            const { data: matchesAsLost } = await adminClient
                .from('matches')
                .select('found_report_id')
                .in('lost_report_id', ownReportIds)
                .neq('status', 'rejected');

            const { data: matchesAsFound } = await adminClient
                .from('matches')
                .select('lost_report_id')
                .in('found_report_id', ownReportIds)
                .neq('status', 'rejected');

            const foundIds = (matchesAsLost || []).map(m => m.found_report_id);
            const lostIds = (matchesAsFound || []).map(m => m.lost_report_id);
            
            // Combine and deduplicate, excluding own reports
            matchedReportIds = [...new Set([...foundIds, ...lostIds])]
                .filter(id => !ownReportIds.includes(id));
        }

        // Fetch matched reports
        let matchedReports: any[] = [];
        if (matchedReportIds.length > 0) {
            const { data: matched, error: matchedError } = await adminClient
                .from('reports')
                .select(`
                    id, type, title, description, category, report_code, 
                    register_number, images, location, latitude, longitude,
                    status, created_at, user_id, is_private, matched_with, match_score
                `)
                .in('id', matchedReportIds)
                .order('created_at', { ascending: false });

            if (!matchedError) {
                matchedReports = matched || [];
            }
        }

        // Combine own reports + matched reports, deduplicated
        const allReports = [...(ownReports || []), ...matchedReports];
        const uniqueReports = Array.from(
            new Map(allReports.map(r => [r.id, r])).values()
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return NextResponse.json({ reports: uniqueReports, isAdmin });
    } catch (error) {
        console.error('Reports API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
