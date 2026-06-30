'use client'

import { useEffect, useState } from 'react'

/**
 * Compteur de notifications non lues, live (sprint 17 Bloc B).
 *
 * Calqué sur lib/feed/useFeedRealtime.ts :
 * - import dynamique de @/lib/supabase/client DANS l'effet (sort supabase-js du
 *   first load — Realtime ne sert qu'après hydratation) ;
 * - flag `cancelled` + `cleanup` posé seulement une fois souscrit ;
 * - removeChannel au démontage.
 *
 * Sécurité : le filtre `user_id=eq.${userId}` est un filtre Realtime (Walrus),
 * PAS la barrière de sécurité. La RLS `notifications_select_own` (037) reste la
 * vraie garde — postgres_changes vérifie la RLS avec le JWT du client.
 *
 * `initialCount` vient du SSR (rendu serveur du badge) → le compteur est correct
 * dès l'arrivée, puis incrémenté/décrémenté en live.
 */
export function useNotificationRealtime(userId: string, initialCount: number): number {
  const [unread, setUnread] = useState(initialCount)

  // Si le SSR re-rend avec un nouveau compteur (navigation entre pages app),
  // on se resynchronise sur la valeur serveur.
  useEffect(() => {
    setUnread(initialCount)
  }, [initialCount])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let cleanup: (() => void) | undefined

    void Promise.all([
      import('@/lib/supabase/client'),
      import('@/lib/supabase/resilient-channel'),
    ]).then(([{ createClient }, { subscribeResilient }]) => {
      if (cancelled) return
      const supabase = createClient()
      // Reconnexion sur coupure durable. À la reconnexion le compteur peut avoir
      // dérivé (events manqués) ; la resync se fait au prochain rendu SSR (initialCount).
      cleanup = subscribeResilient(supabase, (c) =>
        c
          .channel(`notif:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            () => setUnread((n) => n + 1),
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              // read_at passe de null à une valeur → une notif vient d'être lue.
              const next = payload.new as { read_at: string | null }
              const prev = payload.old as { read_at?: string | null }
              if (next.read_at && !prev?.read_at) setUnread((n) => Math.max(0, n - 1))
            },
          ),
      )
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [userId])

  // App badge PWA (sprint 49 WS D) : le compteur non lu pilote le badge sur
  // l'icône de l'app installée. Feature-detect strict (Android/desktop le
  // supportent ; iOS = phase mobile → no-op propre, jamais d'erreur). Remis à
  // zéro dès que unread vaut 0 (clearAppBadge). Aucune coordonnée en jeu.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    try {
      if (unread > 0) {
        void nav.setAppBadge?.(unread)?.catch(() => {})
      } else {
        void nav.clearAppBadge?.()?.catch(() => {})
      }
    } catch {
      // setAppBadge peut throw sur certains contextes non installés : on ignore.
    }
  }, [unread])

  return unread
}
