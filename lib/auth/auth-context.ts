import { safeInternalPath } from '@/lib/auth/redirect'

/**
 * Contexte d'abonnement / de retour porté par l'URL sur les écrans d'auth.
 * Embarqué en hidden inputs du formulaire, car les Server Actions n'ont pas
 * accès à l'URL d'origine.
 */
export type AuthContext = {
  redirect?: string
  plan?: string
  interval?: string
}

type SearchParams = { [key: string]: string | string[] | undefined }

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/**
 * Normalise le contexte d'auth d'une query (correctif BUG-10).
 *
 * Règles, inchangées depuis leur introduction :
 *  - `plan` n'est retenu que pour 'local' | 'itinerant' ;
 *  - `interval` que pour 'monthly' | 'annual' ;
 *  - la cible de retour arrive en `?redirect=` OU en `?next=` (CTA de /tarifs)
 *    et est TOUJOURS repassée par `safeInternalPath` (anti open-redirect).
 *
 * Fonction PURE, testée : c'est elle qui garantit qu'un visiteur venu de
 * /tarifs avec un plan choisi le retrouve après l'inscription.
 */
export function normalizeAuthContext(
  sp: SearchParams,
  fallbackRedirect = '/tarifs',
): AuthContext {
  const ctx: AuthContext = {}

  const plan = first(sp.plan)
  if (plan === 'local' || plan === 'itinerant') ctx.plan = plan

  const interval = first(sp.interval)
  if (interval === 'monthly' || interval === 'annual') ctx.interval = interval

  const back = first(sp.redirect) ?? first(sp.next)
  if (back) ctx.redirect = safeInternalPath(back, fallbackRedirect)

  return ctx
}
