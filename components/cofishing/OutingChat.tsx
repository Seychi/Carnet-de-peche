'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { loadOutingMessages, sendOutingMessage } from '@/lib/cofishing/actions'
import { useOutingChatRealtime, type OutingMessageRow } from '@/lib/cofishing/useOutingChatRealtime'
import type { OutingMessage } from '@/lib/cofishing/queries'

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function authorName(m: { display_name: string | null; username: string | null }): string {
  return m.display_name || (m.username ? `@${m.username}` : 'Pêcheur')
}

/**
 * Chat d'une sortie. À ne rendre QUE pour l'hôte ou un participant accepté (la RLS
 * 068 reste la vraie barrière : un tiers qui appellerait quand même n'obtient rien).
 * Charge l'historique au montage, puis écoute les INSERT en temps réel.
 *
 * `readOnly` (sortie annulée/passée) : la conversation reste lisible mais la saisie est
 * fermée. La RLS 076 refuse déjà l'INSERT sur une sortie close ; ce flag est le miroir UI.
 */
export function OutingChat({
  proposalId,
  viewerId,
  readOnly = false,
}: {
  proposalId: string
  viewerId: string
  readOnly?: boolean
}) {
  const [messages, setMessages] = useState<OutingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Historique initial (RLS-protégé côté serveur).
  useEffect(() => {
    let active = true
    loadOutingMessages(proposalId).then((rows) => {
      if (!active) return
      setMessages(rows)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [proposalId])

  // Live : append des nouveaux messages, anti-doublon par id (le mien revient aussi
  // par Realtime après envoi optimiste). Le payload Realtime n'a pas les profils →
  // on garde les champs profil à null, l'historique au prochain montage les remplit.
  const onInsert = useCallback((row: OutingMessageRow) => {
    setMessages((prev) =>
      prev.some((m) => m.id === row.id)
        ? prev
        : [...prev, { ...row, username: null, display_name: null, avatar_url: null }],
    )
  }, [])
  useOutingChatRealtime(proposalId, onInsert)

  // Auto-scroll en bas à chaque nouveau message.
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const res = await sendOutingMessage(proposalId, body)
    setSending(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    setDraft('')
    // Pas d'ajout optimiste : le Realtime renvoie le message inséré (dédupliqué par id).
  }

  return (
    <div className="mt-3 rounded-[12px] border border-sand-200 bg-sand-50/60 p-3">
      <p className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
        Chat de la sortie
      </p>

      <div ref={scrollerRef} className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <p className="py-3 text-center text-[12px] text-ink-400">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-ink-400">
            Sois le premier à écrire. Calez le point de RDV exact entre vous, en privé.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === viewerId
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-[12px] px-3 py-2 text-[13px] ${
                    mine ? 'bg-teal-500 text-navy-950' : 'bg-white border border-sand-200 text-ink-700'
                  }`}
                >
                  {!mine && (
                    <span className="mb-0.5 block text-[11px] font-semibold text-teal-700">
                      {authorName(m)}
                    </span>
                  )}
                  <span className="whitespace-pre-wrap break-words">{m.body}</span>
                </div>
                <span className="mt-0.5 px-1 text-[10.5px] text-ink-400">{fmtTime(m.created_at)}</span>
              </div>
            )
          })
        )}
      </div>

      {readOnly ? (
        <p className="mt-2.5 rounded-[10px] border border-sand-200 bg-white/70 px-3 py-2 text-center text-[12px] text-ink-500">
          Sortie annulée, conversation close. Tu peux relire les messages mais plus en envoyer.
        </p>
      ) : (
        <form onSubmit={handleSend} className="mt-2.5 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend(e as unknown as React.FormEvent)
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Ton message…"
            className="flex-1 resize-none rounded-[10px] border border-sand-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Envoyer le message"
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-teal-500 text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      )}
    </div>
  )
}
