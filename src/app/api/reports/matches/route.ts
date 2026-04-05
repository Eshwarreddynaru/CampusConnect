import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Get matches for a specific report
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const reportId = searchParams.get('reportId');

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user owns this report or is admin
        const { data: report } = await supabase
            .from('reports')
            .select('user_id')
            .eq('id', reportId)
            .single();

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';

        if (!report || (report.user_id !== user.id && !isAdmin)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get matches
        const { data: matches, error } = await supabase
            .from('matches')
            .select(`
                id,
                lost_report_id,
                found_report_id,
                match_score,
                status,
                created_at,
                lost_report:reports!matches_lost_report_id_fkey(
                    id, type, title, description, category, images, location, 
                    created_at, user_id, register_number
                ),
                found_report:reports!matches_found_report_id_fkey(
                    id, type, title, description, category, images, location,
                    created_at, user_id, register_number
                )
            `)
            .or(`lost_report_id.eq.${reportId},found_report_id.eq.${reportId}`)
            .order('match_score', { ascending: false });

        if (error) {
            console.error('Error fetching matches:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ matches: matches || [] });
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

        // Verify user is involved in this match
        const { data: match } = await supabase
            .from('matches')
            .select(`
                id,
                lost_report_id,
                found_report_id,
                lost_report:reports!matches_lost_report_id_fkey(user_id),
                found_report:reports!matches_found_report_id_fkey(user_id)
            `)
            .eq('id', matchId)
            .single();

        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        const isInvolved = 
            match.lost_report?.user_id === user.id || 
            match.found_report?.user_id === user.id;

        if (!isInvolved) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update match status
        const { error } = await supabase
            .from('matches')
            .update({ status })
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
