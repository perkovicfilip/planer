import { createClient } from '@supabase/supabase-js'

// Javni (publishable) ključ — namenjen da bude u aplikaciji.
// Podatke štite Row Level Security pravila u bazi: svako vidi samo svoje.
export const SUPABASE_URL = 'https://glhmqzqeqcfeiwuxytpf.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_A7Un59Ihza4BdcUKJqlaNA_eemCt4eB'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// Lokalni režim (bez naloga) — za testiranje: dodaj ?lokalno=1 u adresu.
export const LOCAL_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lokalno')
