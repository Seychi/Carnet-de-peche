/**
 * Classification des erreurs d'authentification en TYPES stables (sprint 85, Bloc 3).
 *
 * POURQUOI : on veut savoir sur quoi le tunnel d'inscription bute (mot de passe
 * refusé ? compte déjà pris ? domaine mort ?), et `/auth/register` convertit à
 * 14,6 %. Mais un message d'erreur est du TEXTE : le renvoyer tel quel dans un
 * event d'analytics, c'est ouvrir la porte à une donnée saisie qui s'y glisse
 * (un jour, quelqu'un ajoutera « L'adresse {email} est déjà prise »).
 *
 * Cette fonction est donc un ENTONNOIR : quelle que soit l'entrée, elle ne peut
 * renvoyer qu'une des constantes ci-dessous. Aucune sous-chaîne de l'entrée ne
 * ressort jamais. C'est le garde-fou PII du bloc, et il est testé comme tel.
 *
 * Fonction PURE, importable côté client comme côté serveur.
 */

export const AUTH_ERROR_TYPES = [
  /** Validation côté client (zod), avant tout appel réseau. */
  'client_validation',
  /** Email ou mot de passe refusés à la connexion. */
  'invalid_credentials',
  /** Le compte existe mais l'email n'est pas confirmé. */
  'email_not_confirmed',
  /** Inscription sur une adresse déjà utilisée. */
  'already_registered',
  /** Adresse mal formée, refusée côté serveur. */
  'invalid_email',
  /** Le domaine de l'adresse n'a aucun MX (sprint 78). */
  'undeliverable_domain',
  /** Règle de mot de passe non respectée (8 caractères dont 1 chiffre). */
  'password_rule',
  /** Gate beta INVITE_ONLY : code fondateur exigé. */
  'invite_code_required',
  /** Trop de tentatives (429 Supabase). */
  'rate_limited',
  /** Supabase n'a pas pu envoyer l'email. */
  'email_send_failed',
  /** Inscription désactivée côté Dashboard. */
  'signup_disabled',
  /** Retour OAuth en échec (?error=oauth). */
  'oauth_failed',
  /** Tout le reste : on ne devine pas, on range en « autre ». */
  'server_error',
] as const

export type AuthErrorType = (typeof AUTH_ERROR_TYPES)[number]

/**
 * Range un message affiché à l'utilisateur dans un type stable.
 * Les motifs correspondent aux messages produits par `app/auth/login/actions.ts`
 * (`translateAuthError` + les retours explicites) et par `lib/auth/email-domain`.
 * Les apostrophes sont volontairement évitées dans les motifs : le code mélange
 * l'apostrophe droite et la typographique.
 */
export function classifyAuthError(
  message: string | null | undefined
): AuthErrorType {
  if (!message) return 'server_error'
  const m = message.toLowerCase()

  if (m.includes('mot de passe incorrect')) return 'invalid_credentials'
  if (m.includes('confirme ton email')) return 'email_not_confirmed'
  if (m.includes('compte existe')) return 'already_registered'
  if (m.includes('ne peut pas recevoir')) return 'undeliverable_domain'
  if (m.includes('trop de tentatives')) return 'rate_limited'
  if (m.includes('invitation')) return 'invite_code_required'
  if (m.includes('caractères') || m.includes('chiffre')) return 'password_rule'
  if (m.includes('adresse email invalide') || m.includes('email invalide'))
    return 'invalid_email'
  if (m.includes('envoyer') && m.includes('email')) return 'email_send_failed'
  if (m.includes('inscription est temporairement')) return 'signup_disabled'

  return 'server_error'
}
