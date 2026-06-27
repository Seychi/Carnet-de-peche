// Util d'envoi Web Push (sprint 39, WS A). SERVER / NODE ONLY.
//
// ⚠️ `web-push` utilise le crypto de Node → ce module ne doit JAMAIS être importé
// dans un composant client ni passé en runtime edge. On n'ajoute pas `import
// 'server-only'` au top (casserait vitest, cf lib/notifications/create.ts:1-3) ;
// l'isolation serveur est assurée par l'usage (cron Node + import dynamique de
// `web-push`) et par le fait qu'aucun composant client n'importe ce fichier.
//
// INVARIANTS :
// - BEST-EFFORT : l'envoi push ne doit JAMAIS faire échouer l'appelant (l'insert
//   in-app du cron). Tout est try/catch + log, jamais throw (modèle createNotification).
// - NO-OP propre si les clés VAPID manquent (dev sans clés) : on retourne
//   { sent:0, pruned:0 } sans rien tenter.
// - PURGE : un abonnement mort (statusCode 404/410) est supprimé de la base, pas
//   traité comme une erreur. Toute autre erreur est loguée puis on continue.

import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export type PushPayload = {
  title: string
  body: string
  url: string
}

export type SendPushResult = {
  /** Nombre de devices ayant reçu le push avec succès. */
  sent: number
  /** Nombre d'abonnements morts (404/410) purgés de la base. */
  pruned: number
}

type PushSubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

// Erreur web-push : on lit `statusCode` sans dépendre d'un type interne.
function getStatusCode(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const code = (err as { statusCode?: unknown }).statusCode
    return typeof code === 'number' ? code : undefined
  }
  return undefined
}

/**
 * Envoie une notification Web Push à TOUS les devices d'un utilisateur.
 *
 * `admin` = client Supabase service-role (bypass RLS), tel que produit par
 * `createServiceRoleClient()` (lib/supabase/service-role) ou `createAdminClient()`
 * (lib/supabase/admin). On lit les `push_subscriptions` du `userId` via ce client.
 *
 * Best-effort : ne throw JAMAIS. No-op si les clés VAPID sont absentes (dev).
 * Retourne le compte d'envois réussis et d'abonnements morts purgés.
 */
export async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  const result: SendPushResult = { sent: 0, pruned: 0 }

  // No-op propre si les clés VAPID manquent (dev/preview sans clés) : on ne tente
  // rien, l'appelant (insert in-app) continue normalement.
  const privateKey = env.VAPID_PRIVATE_KEY
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const subject = env.VAPID_SUBJECT
  if (!privateKey || !publicKey || !subject || !userId) {
    return result
  }

  try {
    // Import dynamique de web-push : garde le module hors de tout bundle client et
    // n'évalue le crypto Node qu'à l'usage (server/Node). `@types/web-push` expose
    // des exports nommés (pas de default) → on appelle sur l'objet module direct.
    const webpush = await import('web-push')
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const { data, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
    if (error) {
      console.error('[sendPushToUser] lecture abonnements échec (non bloquant) :', error.message)
      return result
    }

    const subs = (data ?? []) as PushSubscriptionRow[]
    const serialized = JSON.stringify(payload)

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          serialized,
        )
        result.sent++
      } catch (err) {
        const status = getStatusCode(err)
        if (status === 404 || status === 410) {
          // Abonnement expiré / révoqué côté push service → on le purge (best-effort).
          const { error: delError } = await admin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
          if (delError) {
            console.error('[sendPushToUser] purge abonnement mort échec :', delError.message)
          } else {
            result.pruned++
          }
        } else {
          // Toute autre erreur (réseau, rate-limit 429, etc.) : log + continue.
          console.error(
            '[sendPushToUser] envoi échec (non bloquant) :',
            status ?? '',
            err instanceof Error ? err.message : String(err),
          )
        }
      }
    }
  } catch (e) {
    // Filet global : import web-push KO, setVapidDetails KO, etc. → jamais de throw.
    console.error('[sendPushToUser] indisponible (non bloquant) :', e)
  }

  return result
}
