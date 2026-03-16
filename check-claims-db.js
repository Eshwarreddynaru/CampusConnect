const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load environment variables from .env
dotenv.config({ path: './.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkClaims() {
  console.log('Checking claims in database...')
  const { data, error } = await supabase
    .from('claims')
    .select('*')
  
  if (error) {
    console.error('Error fetching claims:', error)
    return
  }
  
  console.log(`\nTotal claims found in DB: ${data.length}`)
  console.log('--- Status Breakdown ---')
  
  const pending = data.filter(c => c.status === 'pending')
  const accepted = data.filter(c => c.status === 'accepted')
  const rejected = data.filter(c => c.status === 'rejected')
  
  console.log(`Pending:  ${pending.length}`)
  console.log(`Accepted: ${accepted.length}`)
  console.log(`Rejected: ${rejected.length}`)
  
  console.log('\n--- All Claims Data ---')
  data.forEach(c => {
    console.log(`ID: ${c.id.split('-')[0]}... | Status: ${c.status} | Claimer: ${c.claimer_register_number}`)
  })
}

checkClaims()
