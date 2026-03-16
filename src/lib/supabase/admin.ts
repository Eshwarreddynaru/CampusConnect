import { createClient } from '@supabase/supabase-js'

// This creates a client that BYPASSES Row Level Security (RLS) entirely.
// It should ONLY be used in secure App Router Server Contexts (API routes or Sever Components)
// after verifying the user's admin status.
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
