import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Vérification de signature des webhooks Resend (sprint 78).
 *
 * Resend signe ses webhooks au format **Svix**. On l'implémente à la main plutôt
 * que d'ajouter la dépendance `svix` : c'est 30 lignes, et le projet évite les
 * dépendances qui ne servent qu'à une chose (cf discipline CLAUDE.md).
 *
 * Le contenu signé est `${svix-id}.${svix-timestamp}.${raw body}`, en HMAC-SHA256
 * avec la partie base64 du secret (`whsec_<base64>`), et l'en-tête `svix-signature`
 * peut contenir PLUSIEURS signatures séparées par des espaces (rotation de
 * secret) : il suffit qu'une seule corresponde.
 */

/** Tolérance sur l'horodatage, contre le rejeu. Valeur recommandée par Svix. */
const TOLERANCE_S = 5 * 60

export type WebhookHeaders = {
  id: string | null
  timestamp: string | null
  signature: string | null
}

export type VerifyResult = { ok: true } | { ok: false; reason: string }

/**
 * Fonction PURE (hors horloge) : testable sans réseau ni base.
 * `nowMs` est injectable pour que les tests ne dépendent pas de l'heure réelle.
 */
export function verifyResendSignature(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  nowMs: number = Date.now(),
): VerifyResult {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return { ok: false, reason: 'en-têtes manquants' }
  if (!secret) return { ok: false, reason: 'secret absent' }

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return { ok: false, reason: 'horodatage illisible' }
  // Fenêtre symétrique : un horodatage trop dans le futur est aussi suspect.
  if (Math.abs(nowMs / 1000 - ts) > TOLERANCE_S) return { ok: false, reason: 'horodatage hors fenêtre' }

  const secretB64 = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  let key: Buffer
  try {
    key = Buffer.from(secretB64, 'base64')
  } catch {
    return { ok: false, reason: 'secret illisible' }
  }
  if (key.length === 0) return { ok: false, reason: 'secret vide' }

  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest()

  // `v1,<base64> v1,<base64>` — on accepte si UNE des signatures correspond.
  for (const part of signature.split(' ')) {
    const [version, value] = part.split(',')
    if (version !== 'v1' || !value) continue
    let candidate: Buffer
    try {
      candidate = Buffer.from(value, 'base64')
    } catch {
      continue
    }
    // timingSafeEqual exige des longueurs égales : on filtre AVANT, sinon il throw.
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return { ok: true }
    }
  }
  return { ok: false, reason: 'aucune signature ne correspond' }
}

/**
 * Types d'événements Resend qui doivent couper les envois.
 *
 * ⚠️ `email.bounced` couvre les rebonds DURS comme les rebonds MOUS (boîte
 * pleine, indisponibilité passagère). On ne supprime que sur un rebond dur :
 * couper un destinataire parce que sa boîte était pleine un mardi serait une
 * perte sèche. Resend expose la nature dans `data.bounce.type`.
 */
export type ResendEvent = {
  type?: string
  data?: {
    to?: string[] | string
    email_id?: string
    bounce?: { type?: string; subType?: string; message?: string }
  }
}

export type SuppressionDecision =
  | { suppress: false }
  | { suppress: true; email: string; reason: 'hard_bounce' | 'complaint'; detail: string }

/**
 * Décide, à partir d'un événement Resend, s'il faut couper l'adresse.
 * Fonction PURE : tout le raisonnement est testable sans base ni réseau.
 */
export function decideSuppression(event: ResendEvent): SuppressionDecision {
  const to = Array.isArray(event.data?.to) ? event.data?.to[0] : event.data?.to
  if (!to || !to.includes('@')) return { suppress: false }

  if (event.type === 'email.complained') {
    return { suppress: true, email: to, reason: 'complaint', detail: 'signalé comme indésirable' }
  }

  if (event.type === 'email.bounced') {
    const bounceType = (event.data?.bounce?.type ?? '').toLowerCase()
    // Resend suit la terminologie SES : « Permanent » = définitif.
    // Tout ce qui n'est pas explicitement permanent est traité comme passager,
    // donc NON supprimé : on préfère réessayer que couper à tort.
    if (bounceType !== 'permanent' && bounceType !== 'hard') return { suppress: false }
    const detail = [event.data?.bounce?.subType, event.data?.bounce?.message]
      .filter(Boolean)
      .join(' — ') || 'rebond permanent'
    return { suppress: true, email: to, reason: 'hard_bounce', detail }
  }

  return { suppress: false }
}
