import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const redirect = searchParams.get('redirect') || '/feed';

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // Validate KLU email for Google OAuth users
            const email = data.user.email;

            if (!email || !email.endsWith('@klu.ac.in')) {
                // Sign out the user - non-KLU email not allowed
                await supabase.auth.signOut();
                return NextResponse.redirect(
                    `${origin}/auth/login?error=invalid_email&message=Only+KLU+college+emails+are+allowed`
                );
            }

            return NextResponse.redirect(`${origin}${redirect}`);
        }
    }

    // Return to login with error
    return NextResponse.redirect(`${origin}/auth/login?error=auth_error`);
}
