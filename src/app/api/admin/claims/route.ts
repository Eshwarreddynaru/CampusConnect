import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
    try {
        const supabase = await createClient()

        // 1. Verify user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Verify user is an admin Using RLS-safe query.
        // We query the profiles table for the current user's profile.
        // RLS allows users to see their own profile, so this is safe.
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || !profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // 3. User is confirmed admin. Fetch ALL claims using service_role client (bypasses RLS)
        const adminSupabase = createAdminClient()
        
        const { data: claims, error: claimsError } = await adminSupabase
            .from('claims')
            .select(`
                *,
                report:reports (
                    id, type, title, report_code, register_number, user_id, status, category, location
                )
            `)
            .order('created_at', { ascending: false })

        if (claimsError) {
            console.error('Error fetching claims with admin client:', claimsError)
            return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
        }

        return NextResponse.json(claims)
    } catch (error) {
        console.error('Server error in admin/claims route:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
