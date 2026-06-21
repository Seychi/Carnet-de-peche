import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Stats réelles affichées sur la home (remplace les chiffres inventés du sprint 14).
// Client anon SANS cookies (pas de dynamic rendering) + cache 1 h → la home reste
// statique/ISR. Les nombres exposés sont non sensibles (compte de spots publics).
export const getHomeStats = unstable_cache(
  async (): Promise<{ spotsCount: number | null }> => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) return { spotsCount: null }
      const sb = createClient(url, key, { auth: { persistSession: false } })
      const { count, error } = await sb
        .from('spots')
        .select('id', { count: 'exact', head: true })
        .eq('visibility', 'public')
      if (error) return { spotsCount: null }
      return { spotsCount: count ?? null }
    } catch {
      return { spotsCount: null }
    }
  },
  ['home-stats-v1'],
  { revalidate: 3600 },
)
