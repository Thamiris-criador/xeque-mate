import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_KEY devem estar definidos em .env.local (dev) ou .env.production (build).'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
