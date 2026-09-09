import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kjjrnnoefkxkxpduujcq.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7Sxa5lX0fNs6qekeTRIffW_ElWWjP...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
