import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // ──── FAST PATH: Skip middleware entirely for static assets & API routes ────
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.') // static files like .js, .css, .png, etc.
    ) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Classify the route BEFORE the auth call so we can skip it entirely if not needed
    const isAdminLogin = pathname === '/admin/login'
    const isAdminPath = pathname.startsWith('/admin') && !isAdminLogin
    const isAuthPath = pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')

    const protectedPaths = ['/feed', '/map', '/create', '/community', '/profile', '/chat', '/my-claims', '/report']
    const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p))

    // ──── FAST PATH: Public routes that don't need auth at all ────
    const needsAuth = isAdminLogin || isAdminPath || isAuthPath || isProtectedPath
    if (!needsAuth) {
        // Landing page, 404s, etc. — no auth check needed
        return supabaseResponse
    }

    // Only call getUser() for routes that actually need authentication
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // ──── Unauthenticated fast-paths (no DB query needed) ────
    if (!user) {
        if (isProtectedPath) {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/login'
            url.searchParams.set('redirect', pathname)
            return NextResponse.redirect(url)
        }
        if (isAdminPath) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/login'
            return NextResponse.redirect(url)
        }
        // Auth pages are fine for unauthenticated users, admin login too
        return supabaseResponse
    }

    // ──── User is authenticated ────

    // Auth pages - redirect to feed if already authenticated (no profile needed)
    if (isAuthPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/feed'
        return NextResponse.redirect(url)
    }

    // Only fetch profile when we need role/status checks (admin routes or status checks)
    const needsProfile = isAdminLogin || isAdminPath || isProtectedPath
    let profile: { role?: string; status?: string } | null = null
    if (needsProfile) {
        const { data } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', user.id)
            .single()
        profile = data
    }

    // Admin login page - redirect to admin if already admin
    if (isAdminLogin) {
        if (profile?.role === 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/admin'
            return NextResponse.redirect(url)
        }
        return supabaseResponse
    }

    // Admin routes - verify admin role and status
    if (isAdminPath) {
        if (!profile || profile.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/feed'
            return NextResponse.redirect(url)
        }
        if (profile.status === 'suspended' || profile.status === 'banned') {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/login'
            return NextResponse.redirect(url)
        }
    }

    // Protected routes - check user status
    if (isProtectedPath) {
        if (profile && (profile.status === 'suspended' || profile.status === 'banned')) {
            await supabase.auth.signOut()
            const url = request.nextUrl.clone()
            url.pathname = '/auth/login'
            url.searchParams.set('error', 'account_suspended')
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
