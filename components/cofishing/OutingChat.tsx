'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Send, Loader2, ImagePlus, MapPin, Flag, Trash2, X } from 'lucide-react'
import {
  loadOutingMessages,
  sendOutingMessage,
  markOnSite,
  reportOutingMessage,
  moderatorDeleteOutingMessage,
} from '@/lib/cofishing/actions'
import { uploadOutingPhoto, getOutingPhotoSignedUrl } from '@/lib/cofishing/outing-photo'
import { useOutingChatRealtime, type OutingMessageRow } from '@/lib/cofishing/useOutingChatRealtime'
import type { OutingMessage } from '@/lib/cofishing/queries'
import { resizeImageToWebp } from '@/lib/storage/image-resize'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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

// Raisons de signalement d'un message de chat. Alignées sur le fil (spam / inapproprié /
// spot brûlé / autre). « Spot brûlé » est ici LA raison clé : un message qui balance une
// coordonnée précise malgré le garde anti-coord.
const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Spam ou publicité' },
  { value: 'inapproprie', label: 'Contenu inapproprié' },
  { value: 'spot_burning', label: 'Spot brûlé (coords précises balancées)' },
  { value: 'autre', label: 'Autre' },
]

/**
 * Photo d'un message : URL chargée À LA DEMANDE via getOutingPhotoSignedUrl (signed URL
 * générée SERVEUR en service-role APRÈS vérif d'appartenance à la sortie). JAMAIS une URL
 * publique : le bucket outing-photos est PRIVÉ. La signed URL est éphémère, on la charge
 * lazy au montage de la bulle.
 */
function MessagePhoto({ messageId }: { messageId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let active = true
    getOutingPhotoSignedUrl(messageId)
      .then((signed) => {
        if (!active) return
        if (signed) {
          setUrl(signed)
          setState('ready')
        } else {
          setState('error')
        }
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [messageId])

  if (state === 'loading') {
    return (
      <div className="flex h-32 w-44 items-center justify-center rounded-[10px] bg-sand-100">
        <Loader2 size={16} className="animate-spin text-ink-400" />
      </div>
    )
  }
  if (state === 'error' || !url) {
    return (
      <div className="flex h-20 w-44 items-center justify-center rounded-[10px] bg-sand-100 text-[11px] text-ink-400">
        Photo indisponible
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Photo de la sortie"
      className="max-h-48 w-44 rounded-[10px] object-cover"
    />
  )
}

/**
 * Chat d'une sortie. À ne rendre QUE pour l'hôte ou un participant accepté (la RLS
 * 068 reste la vraie barrière : un tiers qui appellerait quand même n'obtient rien).
 * Charge l'historique au montage, puis écoute les INSERT en temps réel.
 *
 * `readOnly` (sortie annulée/passée) : la conversation reste lisible mais la saisie est
 * fermée. La RLS 076 refuse déjà l'INSERT sur une sortie close ; ce flag est le miroir UI.
 *
 * v2 (sprint 50) : photo de message (bucket PRIVÉ, signed URL serveur), « je suis sur
 * place » (présence Realtime via outing_participants.on_site_at), signalement de message
 * + retrait modérateur.
 */
export function OutingChat({
  proposalId,
  viewerId,
  readOnly = false,
  isModerator = false,
}: {
  proposalId: string
  viewerId: string
  readOnly?: boolean
  isModerator?: boolean
}) {
  const [messages, setMessages] = useState<OutingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [onSite, setOnSite] = useState(false)
  const [onSiteIds, setOnSiteIds] = useState<Set<string>>(new Set())
  const [reportTarget, setReportTarget] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  // par Realtime après envoi). Le payload Realtime n'a pas les profils → on garde les
  // champs profil à null, l'historique au prochain montage les remplit. `photo_path`
  // arrive bien dans le payload INSERT (colonne de la table).
  const onInsert = useCallback((row: OutingMessageRow) => {
    setMessages((prev) =>
      prev.some((m) => m.id === row.id)
        ? prev
        : [
            ...prev,
            {
              ...row,
              photo_path: (row as { photo_path?: string | null }).photo_path ?? null,
              username: null,
              display_name: null,
              avatar_url: null,
            },
          ],
    )
  }, [])
  useOutingChatRealtime(proposalId, onInsert)

  // Présence « sur place » : on s'abonne aux changements de outing_participants
  // (on_site_at, publication Realtime ajoutée en 089). La RLS garde : on ne reçoit que
  // les lignes lisibles (membres de la sortie). on_site_at est un timestamp, JAMAIS une
  // coordonnée : « sur place » est une présence, pas une position.
  useEffect(() => {
    if (!proposalId) return
    let cancelled = false
    let cleanup: (() => void) | undefined

    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (cancelled) return
      const supabase = createClient()

      // Snapshot initial des présences déjà pointées.
      void supabase
        .from('outing_participants')
        .select('user_id, on_site_at')
        .eq('proposal_id', proposalId)
        .then(({ data }) => {
          if (cancelled || !data) return
          const ids = new Set<string>()
          for (const r of data as { user_id: string; on_site_at: string | null }[]) {
            if (r.on_site_at) ids.add(r.user_id)
          }
          setOnSiteIds(ids)
          if (ids.has(viewerId)) setOnSite(true)
        })

      const channel = supabase
        .channel(`outing-presence:${proposalId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'outing_participants',
            filter: `proposal_id=eq.${proposalId}`,
          },
          (payload) => {
            const row = payload.new as { user_id?: string; on_site_at?: string | null }
            if (!row?.user_id) return
            setOnSiteIds((prev) => {
              const next = new Set(prev)
              if (row.on_site_at) next.add(row.user_id!)
              else next.delete(row.user_id!)
              return next
            })
          },
        )
        .subscribe()

      cleanup = () => {
        supabase.removeChannel(channel)
      }
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [proposalId, viewerId])

  // Auto-scroll en bas à chaque nouveau message.
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Nettoie l'object URL d'aperçu au remplacement / démontage.
  useEffect(() => {
    return () => {
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
    }
  }, [photo])

  async function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    e.target.value = ''
    if (!raw) return
    try {
      // Re-encode WebP côté client : compresse + strippe l'EXIF (le serveur re-strippe
      // au sharp, double défense). Le résultat reste dans le bucket PRIVÉ.
      const webp = await resizeImageToWebp(raw)
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
      const file = new File([webp], 'photo.webp', { type: 'image/webp' })
      setPhoto({ file, previewUrl: URL.createObjectURL(webp) })
    } catch (err) {
      console.error('[OutingChat] photo resize error :', err)
      toast.error('Impossible de traiter cette image. Réessaie.')
    }
  }

  function clearPhoto() {
    if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
    setPhoto(null)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return
    const body = draft.trim()
    // Un message peut être une photo seule (body vide), mais il faut au moins l'un des deux.
    if ((!body && !photo) || sending || uploading) return

    setSending(true)
    let photoPath: string | undefined
    if (photo) {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', photo.file)
      const up = await uploadOutingPhoto(fd)
      setUploading(false)
      if ('error' in up) {
        setSending(false)
        toast.error(up.error)
        return
      }
      photoPath = up.path
    }

    const res = await sendOutingMessage(proposalId, body, photoPath)
    setSending(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    setDraft('')
    clearPhoto()
    // Pas d'ajout optimiste : le Realtime renvoie le message inséré (dédupliqué par id).
  }

  async function handleOnSite() {
    if (onSite) return
    setOnSite(true) // optimiste
    const res = await markOnSite(proposalId)
    if ('error' in res) {
      setOnSite(false)
      toast.error(res.error)
      return
    }
    toast.success('Tu es signalé sur place.')
  }

  async function handleModeratorDelete(messageId: string) {
    const res = await moderatorDeleteOutingMessage(messageId)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    toast.success('Message retiré (modération).')
  }

  // Combien sont sur place (hors moi), pour l'indicateur de présence.
  const onSiteCount = onSiteIds.size

  return (
    <div className="mt-3 rounded-[12px] border border-sand-200 bg-sand-50/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
          Chat de la sortie
        </p>
        {onSiteCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10.5px] font-medium text-teal-700">
            <MapPin size={11} aria-hidden /> {onSiteCount} sur place
          </span>
        )}
      </div>

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
            const canReport = !mine
            const canModerate = isModerator && !mine
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
                  {m.photo_path && (
                    <div className="mb-1">
                      <MessagePhoto messageId={m.id} />
                    </div>
                  )}
                  {m.body && <span className="whitespace-pre-wrap break-words">{m.body}</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 px-1">
                  <span className="text-[10.5px] text-ink-400">{fmtTime(m.created_at)}</span>
                  {canReport && (
                    <button
                      type="button"
                      onClick={() => setReportTarget(m.id)}
                      aria-label="Signaler ce message"
                      className="inline-flex items-center gap-0.5 text-[10.5px] text-ink-400 hover:text-coral-600"
                    >
                      <Flag size={11} /> Signaler
                    </button>
                  )}
                  {canModerate && (
                    <button
                      type="button"
                      onClick={() => handleModeratorDelete(m.id)}
                      aria-label="Retirer ce message (modération)"
                      className="inline-flex items-center gap-0.5 text-[10.5px] text-coral-500 hover:text-coral-600"
                    >
                      <Trash2 size={11} /> Retirer
                    </button>
                  )}
                </div>
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
        <>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleOnSite}
              disabled={onSite}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                onSite
                  ? 'border-teal-200 bg-teal-50 text-teal-700'
                  : 'border-sand-200 text-ink-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              <MapPin size={14} /> {onSite ? 'Tu es sur place' : 'Je suis sur place'}
            </button>
          </div>

          {photo && (
            <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-sand-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="Aperçu" className="size-12 rounded-[8px] object-cover" />
              <span className="flex-1 text-[12px] text-ink-500">Photo prête à envoyer</span>
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="Retirer la photo"
                className="flex size-9 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="mt-2 flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handlePickPhoto}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Joindre une photo"
              className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-sand-200 text-ink-500 transition-colors hover:border-teal-300 hover:text-teal-700"
            >
              <ImagePlus size={18} />
            </button>
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
              disabled={sending || uploading || (!draft.trim() && !photo)}
              aria-label="Envoyer le message"
              className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-teal-500 text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-50"
            >
              {sending || uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </>
      )}

      {reportTarget && (
        <ReportMessageDialog
          messageId={reportTarget}
          open={reportTarget !== null}
          onOpenChange={(o) => {
            if (!o) setReportTarget(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Dialog de signalement d'un message de chat. Appelle reportOutingMessage(messageId,
 * reason, details?). Calqué sur le ReportDialog du fil, mais câblé sur l'action de chat
 * (le ReportDialog du fil est codé en dur sur reportPost).
 */
function ReportMessageDialog({
  messageId,
  open,
  onOpenChange,
}: {
  messageId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState<string>('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    const res = await reportOutingMessage(messageId, reason, details.trim() || undefined)
    setSubmitting(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success('Merci, on regarde.')
    setDetails('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Signaler ce message</DialogTitle>
          <DialogDescription>
            Dis-nous ce qui ne va pas. On reste en modération libre, mais on regarde les signalements.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v)}
          className="flex flex-col gap-2.5 py-2"
        >
          {REPORT_REASONS.map((r) => (
            <Label
              key={r.value}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] text-ink-700"
            >
              <RadioGroupItem value={r.value} />
              {r.label}
            </Label>
          ))}
        </RadioGroup>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Précise (optionnel)…"
          className="w-full resize-none rounded-[14px] border border-ink-200 p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-teal-500 hover:bg-teal-600">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Signaler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
