import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dnxpmnjmxelkiohtlnab.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHBtbmpteGVsa2lvaHRsbmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTg2MjUsImV4cCI6MjA4NTg3NDYyNX0.lXbLRUt5iVH4VcF2UjoZeonIAMJ6z5F0awgJcdl_Z1Y'

console.log('Testing Supabase Connection...')
console.log('URL:', SUPABASE_URL)

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testConnection() {
    try {
        const { data, error } = await supabase.from('test_connection').select('*').limit(1)
        // It's expected to fail if table doesn't exist, but it confirms network reachability if it's a 4xx error (like 404 or 42P01) rather than failed to fetch

        if (error) {
            console.log('Supabase returned error (this means connection worked, but query failed):', error.message, error.code)
        } else {
            console.log('Connection successful!')
        }
    } catch (err) {
        console.error('Network/Client Error:', err)
    }

    // Also try auth, which is what failed for the user
    try {
        console.log('Testing Auth endpoint reachability...')
        const { error } = await supabase.auth.getSession()
        if (error) {
            console.log('Auth error:', error.message)
        } else {
            console.log('Auth endpoint reachable.')
        }
    } catch (err) {
        console.error('Auth Network Error:', err)
    }
}

testConnection()
