'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Cibles de redirection autorisées après déconnexion (pas de redirect arbitraire).
const ALLOWED_REDIRECTS = ['/', '/auth/login'] as const

export type SignOutRedirect = (typeof ALLOWED_REDIRECTS)[number]

/**
 * Déconnexion côté serveur : révoque la session Supabase (cookies httpOnly)
 * puis redirige. Évite d'embarquer @supabase/supabase-js dans les bundles
 * client des layouts (UserMenu, MobileNav, SignOutButton).
 */
export async function signOut(redirectTo: SignOutRedirect = '/'): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()
  if (error) {
    // On log mais on redirige quand même : l'utilisateur voulait partir.
    console.error('[signOut]', error.message)
  }

  // redirect() throw volontairement — ne jamais l'entourer d'un try/catch.
  const target = ALLOWED_REDIRECTS.includes(redirectTo) ? redirectTo : '/'
  redirect(target)
}
