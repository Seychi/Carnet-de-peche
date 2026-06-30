'use client'

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

// Souscription Realtime avec reconnexion sur coupure DURABLE (CHANNEL_ERROR /
// TIMED_OUT / CLOSED). Supabase auto-reconnecte les coupures transitoires ; ce
// helper vise celles qui laissent le channel mort (reprise après veille, perte WS
// prolongée), où le fil/chat se figeait silencieusement jusqu'à navigation.
// Sprint 54 WS-E.
//
// La factory reconstruit un channel NEUF à chaque tentative (un channel en erreur
// ne se re-souscrit pas proprement → removeChannel + recréation). Backoff léger
// plafonné, NOMBRE d'essais borné (jamais de boucle infinie). Retourne un teardown
// à appeler au démontage (annule tout retry en vol + retire le channel courant).
export function subscribeResilient(
  client: SupabaseClient,
  makeChannel: (client: SupabaseClient) => RealtimeChannel,
  opts: { maxRetries?: number; onStatus?: (status: string) => void } = {},
): () => void {
  const maxRetries = opts.maxRetries ?? 6
  let current: RealtimeChannel | null = null
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false

  const connect = () => {
    if (stopped) return
    current = makeChannel(client).subscribe((status) => {
      opts.onStatus?.(status)
      if (status === 'SUBSCRIBED') {
        attempt = 0 // succès → on remet le compteur de backoff à zéro
        return
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (stopped || attempt >= maxRetries) return
        attempt += 1
        const delay = Math.min(1000 * 2 ** (attempt - 1), 30_000) // 1s,2s,4s… max 30s
        if (current) {
          void client.removeChannel(current)
          current = null
        }
        clearTimeout(timer)
        timer = setTimeout(connect, delay)
      }
    })
  }

  connect()

  return () => {
    stopped = true
    clearTimeout(timer)
    if (current) void client.removeChannel(current)
    current = null
  }
}
