import { createClient } from '@supabase/supabase-js'

// Ganti URL project Anda (bisa dilihat di bagian atas halaman API Supabase settings)
const SUPABASE_URL = 'https://xxxxxx.supabase.co' 
// Masukkan Publishable Key yang ada di layar Anda
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7Sxa5lX0fNs6qekeTRIffW_ElWWjP...' 

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
