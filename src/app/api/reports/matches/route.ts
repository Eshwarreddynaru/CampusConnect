import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// Get matches for a specific report
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const reportId = searchParams.get('reportId');
        const userId = searchParams.get('userId'); // Optional: get all matches for a user

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // Check if admin
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';

        // If userId is provided, get ALL matches for that user
        if (userId) {
            // Only allow users to get their own matches, or admins
            if (userId !== user.id && !isAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Get all reports by this user
            const { data: userReports } = await adminClient
                .from('reports')
                .select('id')
                .eq('user_id', userId);

            const userReportIds = (userReports || []).map(r => r.id);

            if (userReportIds.length === 0) {
                return NextResponse.json({ matches: [] });
            }

            // Get matches involving user's reports
            const { data: matches, error } = await adminClient
                .from('matches')
                .select(`
                    id,
                    lost_report_id,
                    found_report_id,
                    match_score,
                    status,
                    created_at
                `)
                .or(
                    userReportIds.map(id => `lost_report_id.eq.${id}`).join(',') + ',' +
                    userReportIds.map(id => `found_report_id.eq.${id}`).join(',')
                )
                .order('match_score', { ascending: false });

            if (error) {
                console.error('Error fetching user matches:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            // Fetch full report data for each match
            const allReportIds = new Set<string>();
            (matches || []).forEach(m => {
                allReportIds.add(m.lost_report_id);
                allReportIds.add(m.found_report_id);
            });

            const { data: reportsList } = await adminClient
                .from('reports')
                .select('id, type, title, description, category, images, location, created_at, user_id, register_number')
                .in('id', Array.from(allReportIds));

            const reportsMap = new Map((reportsList || []).map(r => [r.id, r]));

            const enrichedMatches = (matches || []).map(m => ({
                ...m,
                lost_report: reportsMap.get(m.lost_report_id) || null,
                found_report: reportsMap.get(m.found_report_id) || null,
            }));

            return NextResponse.json({ matches: enrichedMatches });
        }

        // Original behavior: get matches for a specific report
        if (!reportId) {
            return NextResponse.json({ error: 'Report ID or User ID required' }, { status: 400 });
        }

        // Verify user owns this report or is admin
        const { data: report } = await adminClient
            .from('reports')
            .select('user_id')
            .eq('id', reportId)
            .single();

        if (!report || (report.user_id !== user.id && !isAdmin)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get matches for this specific report
        const { data: matches, error } = await adminClient
            .from('matches')
            .select(`
                id,
                lost_report_id,
                found_report_id,
                match_score,
                status,
                created_at
            `)
            .or(`lost_report_id.eq.${reportId},found_report_id.eq.${reportId}`)
            .order('match_score', { ascending: false });

        if (error) {
            console.error('Error fetching matches:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch full report data for each match
        const allReportIds = new Set<string>();
        (matches || []).forEach(m => {
            allReportIds.add(m.lost_report_id);
            allReportIds.add(m.found_report_id);
        });

        const { data: reportsList } = await adminClient
            .from('reports')
            .select('id, type, title, description, category, images, location, created_at, user_id, register_number')
            .in('id', Array.from(allReportIds));

        const reportsMap = new Map((reportsList || []).map(r => [r.id, r]));

        const enrichedMatches = (matches || []).map(m => ({
            ...m,
            lost_report: reportsMap.get(m.lost_report_id) || null,
            found_report: reportsMap.get(m.found_report_id) || null,
        }));

        return NextResponse.json({ matches: enrichedMatches });
    } catch (error) {
        console.error('Matches API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Update match status (confirm/reject)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { matchId, status } = body;

        if (!matchId || !status || !['confirmed', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // Get the match and verify user is involved
        const { data: match } = await adminClient
            .from('matches')
            .select('id, lost_report_id, found_report_id')
            .eq('id', matchId)
            .single();

        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Get both reports to check ownership
        const { data: lostReport } = await adminClient
            .from('reports')
            .select('user_id')
            .eq('id', match.lost_report_id)
            .single();

        const { data: foundReport } = await adminClient
            .from('reports')
            .select('user_id')
            .eq('id', match.found_report_id)
            .single();

        const isInvolved = 
            lostReport?.user_id === user.id || 
            foundReport?.user_id === user.id;

        if (!isInvolved) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update match status
        const { error } = await adminClient
            .from('matches')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', matchId);

        if (error) {
            console.error('Error updating match:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Match update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
