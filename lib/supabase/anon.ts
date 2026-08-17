import { cache } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase ANONYME et SANS COOKIES (sprint 84, Bloc 3).
 *
 * Pourquoi ce fichier existe : `@/lib/supabase/server` appelle `cookies()` de
 * `next/headers`. Un seul appel dans l'arbre serveur d'une page suffit à la rendre
 * DYNAMIQUE, ce qui rend `revalidate` et `generateStaticParams` inertes. Les pages
 * SEO (`/spots`, `/spots/[slug]`) doivent au contraire se rendre exactement comme
 * un visiteur anonyme, sans jamais lire la requête entrante : c'est cette version
 * là, et elle seule, qui part au CDN et chez Googlebot.
 *
 * 🔒 Ce que ça change côté sécurité : RIEN, et c'est le point. Sans cookie,
 * `auth.uid()` est NULL côté Postgres, donc :
 *   - `get_spot_by_slug` et `nearby_spots` (SECURITY DEFINER, gatées sur
 *     `current_tier`) renvoient le centroïde de `geom_public` (~500-900 m) et
 *     `is_precise = false` ;
 *   - la RLS `anon` s'applique telle quelle sur `spots`, `catches_for_viewer`, etc. ;
 *   - les colonnes `spots.geom` / `catches.geom` restent illisibles (verrous de
 *     colonne 028b/041).
 * Autrement dit le gating vit dans la BASE : ce client ne peut pas obtenir plus que
 * ce qu'un visiteur sans compte obtient déjà aujourd'hui. Les deltas d'un abonné
 * (coordonnée précise, favoris, semaine) sont demandés APRÈS hydratation, par le
 * navigateur, avec la session de l'utilisateur.
 *
 * ⚠️ Ne JAMAIS utiliser ce client pour une écriture, ni pour une page `(app)`, ni
 * pour quoi que ce soit qui dépend de l'utilisateur courant : il n'en a aucun.
 *
 * `cache()` de React déduplique l'instance dans une même passe de rendu (aucun état
 * de session à partager, mais ça évite de recréer un client par requête SQL).
 */
export const createAnonClient = cache(() => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
})
