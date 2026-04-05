import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';

        let query = supabase
            .from('reports')
            .select(`
                id, type, title, description, category, report_code, 
                register_number, images, location, latitude, longitude,
                status, created_at, user_id, is_private, matched_with, match_score
            `);

        if (!isAdmin) {
            // Regular users: only see their own reports and matched reports
            query = query.or(`user_id.eq.${user.id},matched_with.in.(select id from reports where user_id = '${user.id}')`);
        }
        // Admins see all reports (no filter)

        const { data: reports, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reports:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ reports: reports || [], isAdmin });
    } catch (error) {
        console.error('Reports API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
