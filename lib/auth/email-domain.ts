import 'server-only'
import { resolveMx } from 'node:dns/promises'

/**
 * Le domaine d'une adresse peut-il seulement recevoir du courrier ?
 * (sprint 78, suite de l'audit QA §1.7)
 *
 * POURQUOI : la confirmation d'email est désactivée sur le projet, et c'est une
 * décision assumée de John — l'exiger viderait de son sens l'inscription
 * différée du sprint 77. Conséquence observée en production : `test1234@gmmm.com`,
 * domaine INEXISTANT, a créé un compte confirmé avec session ouverte.
 *
 * Ce contrôle ne remplace pas la confirmation et ne prétend pas le faire. Il ne
 * dit pas « cette boîte existe », il dit « ce domaine ne peut recevoir aucun
 * courrier ». C'est un filet grossier, mais il attrape la faute de frappe
 * (`gmmm.com` pour `gmail.com`), qui est le cas réel qu'on a mesuré.
 *
 * ⚠️ TROIS PROPRIÉTÉS NON NÉGOCIABLES, parce qu'on touche au tunnel d'inscription :
 *
 * 1. **Échec OUVERT.** Toute erreur de résolution autre que « ce domaine n'a
 *    aucun MX » laisse passer. Un DNS lent, un réseau qui tousse ou une réponse
 *    inattendue ne doivent JAMAIS bloquer une inscription légitime. Le coût d'un
 *    faux négatif (une adresse morte de plus) est infiniment inférieur au coût
 *    d'un faux positif (un vrai pêcheur qu'on refuse).
 * 2. **Borné dans le temps.** Une résolution qui traîne rend la main au bout de
 *    `TIMEOUT_MS` et laisse passer. L'inscription ne doit pas attendre le DNS.
 * 3. **Aucune friction visible.** Pas de champ en plus, pas d'étape en plus, et
 *    en pratique quelques dizaines de millisecondes sur un domaine courant.
 */

/** Au-delà, on renonce et on laisse passer. */
const TIMEOUT_MS = 2000

export type DomainVerdict =
  /** Domaine capable de recevoir : on continue. */
  | { deliverable: true }
  /** Le domaine n'a AUCUN enregistrement MX : refus assumé. */
  | { deliverable: false; reason: 'no_mx' }

/** Extrait le domaine d'une adresse. `null` si l'adresse n'a pas la bonne forme. */
export function domainOf(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return null
  const domain = email.slice(at + 1).trim().toLowerCase()
  // Un domaine d'email valide contient au moins un point et aucun espace.
  if (!domain.includes('.') || /\s/.test(domain)) return null
  return domain
}

/**
 * Domaines pour lesquels on ne fait AUCUNE requête DNS : ce sont les fournisseurs
 * qui portent l'écrasante majorité des inscriptions. Économie d'une résolution
 * sur le chemin critique, et immunité totale à une panne DNS sur le cas courant.
 */
const KNOWN_GOOD = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.fr', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.fr', 'ymail.com',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'bbox.fr', 'numericable.fr',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'gmx.fr', 'gmx.com', 'aol.com',
])

/**
 * ⏸️ EN PAUSE depuis le 2026-08-18, décision John : le contrôle refusait des
 * domaines atypiques mais légitimes, et bloquait donc de vrais inscrits.
 *
 * Tant que `AUTH_EMAIL_DOMAIN_CHECK` ne vaut pas exactement `'true'`, aucune
 * résolution DNS n'est faite et tout le monde passe. Le défaut est volontairement
 * « éteint » : un drapeau oublié ne doit jamais pouvoir refermer un tunnel
 * d'inscription. Réactivation = poser la variable dans Vercel, aucun déploiement.
 *
 * ★ CE QU'IL FAUT CORRIGER AVANT DE RÉACTIVER (cause probable des refus de John) :
 * `ENODATA` est traité plus bas comme « pas de MX », alors qu'il signifie « le
 * domaine EXISTE mais n'a pas d'enregistrement de ce type ». Or la RFC 5321 §5.1
 * prévoit le **MX implicite** : un domaine sans MX mais avec un A / AAAA reçoit
 * quand même du courrier, sur cet hôte. C'est le cas classique du petit domaine
 * personnel ou professionnel auto-hébergé, exactement le profil « atypique »
 * signalé. Le vrai correctif est de retomber sur une résolution A/AAAA avant de
 * refuser, et de ne prononcer `no_mx` que sur `ENOTFOUND` / `NXDOMAIN`, qui eux
 * disent bien que le domaine n'existe pas.
 *
 * La logique reste ci-dessous, intacte et couverte par ses tests, pour que la
 * réactivation soit un choix et pas une réécriture.
 */
export const EMAIL_DOMAIN_CHECK_ENABLED = () =>
  process.env.AUTH_EMAIL_DOMAIN_CHECK === 'true'

export async function checkEmailDomain(email: string): Promise<DomainVerdict> {
  if (!EMAIL_DOMAIN_CHECK_ENABLED()) return { deliverable: true }
  return resolveEmailDomain(email)
}

/** La logique de contrôle elle-même, indépendante du drapeau (testée directement). */
export async function resolveEmailDomain(email: string): Promise<DomainVerdict> {
  const domain = domainOf(email)
  // Adresse malformée : ce n'est pas à ce module de la rejeter, zod l'a déjà fait.
  if (!domain) return { deliverable: true }
  if (KNOWN_GOOD.has(domain)) return { deliverable: true }

  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ])
    // `null` = on a atteint le délai : échec OUVERT, on laisse passer.
    if (records === null) return { deliverable: true }
    // Un MX à `exchange` vide est un « null MX » (RFC 7505) : le domaine déclare
    // explicitement ne pas recevoir de courrier. On le traite comme une absence.
    const usable = records.filter((r) => r.exchange && r.exchange !== '.')
    if (usable.length === 0) return { deliverable: false, reason: 'no_mx' }
    return { deliverable: true }
  } catch (err) {
    // ENOTFOUND / NXDOMAIN = le domaine n'existe pas du tout. C'est le cas
    // `gmmm.com`, et c'est le seul refus qu'on prononce sur une exception.
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'NXDOMAIN') {
      return { deliverable: false, reason: 'no_mx' }
    }
    // Tout le reste (SERVFAIL, TIMEOUT, réseau) : échec OUVERT.
    console.warn('[auth] résolution MX indisponible, inscription laissée passer', { domain, code })
    return { deliverable: true }
  }
}

/** Message affiché au visiteur. Tutoiement, et il dit quoi faire. */
export const INVALID_DOMAIN_MESSAGE =
  'Ce domaine ne peut pas recevoir d’email. Vérifie l’adresse, il y a peut-être une faute de frappe.'
