'use client'

import { useEffect, useRef, useState } from 'react'
import { Fish, ImagePlus, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SPECIES_LABELS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/client'
import { resizeImageToWebp } from '@/lib/storage/image-resize'
import { createPost, getMyCatches, type FeedPostEnriched } from '@/app/actions/feed'

export type RecentCatch = {
  id: string
  species: string | null
  size_cm: number | null
  caught_at: string | null
}

export type ComposerUser = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

const MAX_PHOTOS = 4
const MAX_INPUT_BYTES = 20 * 1024 * 1024 // 20 Mo avant resize

type DraftPhoto = {
  id: string
  file: File
  previewUrl: string
  width: number
  height: number
}

// Lit les dimensions d'une image (pour width/height en base + ratio d'affichage).
function readImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = url
  })
}

export function PostComposer({
  region,
  currentUser,
  recentCatches = [],
  onOptimisticCreate,
  onReconcile,
}: {
  region: string
  currentUser: ComposerUser
  recentCatches?: RecentCatch[]
  // Insertion optimiste : la carte apparaît tout de suite (onOptimisticCreate),
  // puis on confirme/annule selon la réponse serveur (onReconcile).
  onOptimisticCreate: (post: FeedPostEnriched) => void
  onReconcile: (tempId: string, success: boolean) => void
}) {
  const [text, setText] = useState('')
  const [attached, setAttached] = useState<RecentCatch | null>(null)
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [resizing, setResizing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sélecteur de prise (Bloc D) — recherche + pagination au-delà des 20 dernières.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<RecentCatch[]>(recentCatches)
  const [optOffset, setOptOffset] = useState(recentCatches.length)
  const [optHasMore, setOptHasMore] = useState(recentCatches.length >= 20)
  const [optLoading, setOptLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Recherche serveur (debouncée). Tant que le champ est vide et qu'on n'a pas
  // encore cherché, on garde la liste initiale (les 20 dernières, déjà fournies).
  useEffect(() => {
    if (!pickerOpen) return
    if (query.trim() === '' && !searched) return
    const t = setTimeout(async () => {
      setOptLoading(true)
      const res = await getMyCatches({ search: query, offset: 0, limit: 20 })
      setOptLoading(false)
      setSearched(true)
      if (res.ok) {
        setOptions(res.data)
        setOptOffset(res.data.length)
        setOptHasMore(res.data.length >= 20)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, pickerOpen, searched])

  // Réinitialise le sélecteur à la fermeture → réouverture = liste initiale,
  // pas une requête « recherche vide » sur l'ancien état.
  function handlePickerOpenChange(open: boolean) {
    setPickerOpen(open)
    if (!open) {
      setQuery('')
      setSearched(false)
      setOptions(recentCatches)
      setOptOffset(recentCatches.length)
      setOptHasMore(recentCatches.length >= 20)
    }
  }

  async function loadMoreCatches() {
    setOptLoading(true)
    const res = await getMyCatches({ search: query, offset: optOffset, limit: 20 })
    setOptLoading(false)
    if (res.ok) {
      setOptions((prev) => [...prev, ...res.data])
      setOptOffset((o) => o + res.data.length)
      setOptHasMore(res.data.length >= 20)
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    e.target.value = '' // permet de re-sélectionner le même fichier
    if (selected.length === 0) return

    const room = MAX_PHOTOS - photos.length
    if (room <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos par post.`)
      return
    }
    const toAdd = selected.slice(0, room)
    if (selected.length > room) {
      toast.error(`Maximum ${MAX_PHOTOS} photos : seules les ${room} premières sont gardées.`)
    }

    setResizing(true)
    try {
      for (const raw of toAdd) {
        if (raw.size > MAX_INPUT_BYTES) {
          toast.error(`« ${raw.name} » dépasse 20 Mo, ignorée.`)
          continue
        }
        // Le re-encodage canvas → WebP supprime les métadonnées EXIF (dont le GPS) :
        // une photo smartphone géolocalisée ne fuite pas le spot. Cf garde-fou Bloc B.
        const webp = await resizeImageToWebp(raw)
        const previewUrl = URL.createObjectURL(webp)
        const { width, height } = await readImageSize(previewUrl)
        setPhotos((prev) =>
          prev.length >= MAX_PHOTOS
            ? prev
            : [...prev, { id: crypto.randomUUID(), file: webp, previewUrl, width, height }],
        )
      }
    } catch (err) {
      console.error('[PostComposer] resize', err)
      toast.error('Impossible de traiter une image. Réessaie.')
    } finally {
      setResizing(false)
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) URL.revokeObjectURL(p.previewUrl)
      return prev.filter((x) => x.id !== id)
    })
  }

  async function handleSubmit() {
    if (!text.trim() && !attached && photos.length === 0) return
    setSubmitting(true)

    const tempId = `temp-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const temp: FeedPostEnriched = {
      id: tempId,
      author_id: currentUser.id,
      author_username: currentUser.username,
      author_display_name: currentUser.display_name,
      author_avatar_url: currentUser.avatar_url,
      author_home_department: null,
      catch_id: attached?.id ?? null,
      catch_species: attached?.species ?? null,
      catch_size_cm: attached?.size_cm ?? null,
      catch_weight_g: null,
      catch_caught_at: attached?.caught_at ?? null,
      catch_photo_path: null,
      catch_technique: null,
      catch_spot_name: null,
      catch_spot_slug: null,
      text: text.trim() || null,
      region,
      likes_count: 0,
      comments_count: 0,
      liked_by_me: false,
      created_at: now,
      updated_at: now,
      photo_paths: null,
      author_is_following: false,
      catchPhotoUrl: null,
      photoUrls: photos.map((p) => p.previewUrl),
    }
    onOptimisticCreate(temp)

    const supabase = createClient()
    const groupId = crypto.randomUUID()
    let uploaded: { path: string; width: number; height: number }[] = []
    try {
      if (photos.length > 0) {
        // Upload en parallèle (latence mobile) ; l'ordre du tableau = position.
        const results = await Promise.allSettled(
          photos.map((p, i) => {
            const path = `${currentUser.id}/${groupId}/${i}.webp`
            return supabase.storage
              .from('feed-photos')
              .upload(path, p.file, { contentType: 'image/webp', upsert: false })
              .then(({ error }) => {
                if (error) throw error
                return { path, width: p.width, height: p.height }
              })
          }),
        )
        uploaded = results
          .filter(
            (r): r is PromiseFulfilledResult<{ path: string; width: number; height: number }> =>
              r.status === 'fulfilled',
          )
          .map((r) => r.value)
        if (results.some((r) => r.status === 'rejected')) {
          throw new Error('upload partiel')
        }
      }

      const res = await createPost({
        text: text.trim() || undefined,
        catchId: attached?.id,
        region,
        photos: uploaded,
      })

      if (!res.ok) {
        if (uploaded.length) {
          await supabase.storage.from('feed-photos').remove(uploaded.map((u) => u.path))
        }
        onReconcile(tempId, false)
        toast.error(res.error)
        return
      }

      // Succès : on vide le composer (sans révoquer les blob: encore affichés par
      // la carte optimiste — ils seront libérés au prochain rendu/navigation).
      setText('')
      setAttached(null)
      setPhotos([])
      onReconcile(tempId, true)
      toast.success('Posté !')
    } catch (err) {
      if (uploaded.length) {
        await supabase.storage.from('feed-photos').remove(uploaded.map((u) => u.path))
      }
      onReconcile(tempId, false)
      console.error('[PostComposer] publish', err)
      toast.error('Échec de l’envoi. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = (text.trim() || attached || photos.length > 0) && !submitting && !resizing

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-sand-200 bg-white p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Quoi de neuf sur le bord ?"
        className="w-full resize-none text-[15px] focus:outline-none placeholder:text-ink-300"
      />

      {/* Aperçu des photos sélectionnées */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-[10px] border border-sand-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                aria-label="Retirer la photo"
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {attached && (
        <div className="flex items-center gap-2 rounded-[10px] bg-teal-50 px-3 py-2 text-[13px] text-navy-900">
          <Fish size={15} className="text-teal-500" />
          <span className="flex-1 truncate">
            {SPECIES_LABELS[attached.species ?? ''] ?? attached.species ?? 'Prise'}
            {attached.size_cm ? ` · ${attached.size_cm} cm` : ''}
          </span>
          <button
            type="button"
            onClick={() => setAttached(null)}
            aria-label="Retirer la prise"
            className="p-1 text-ink-400 hover:text-ink-600"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        // Formats dont le décodage → re-encode WebP (donc le strip EXIF/GPS) est
        // garanti par le navigateur. On exclut HEIC/HEIF : iOS convertit alors
        // automatiquement en JPEG à la sélection → re-encode → EXIF supprimé.
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="Ajouter des photos"
        className="sr-only"
        onChange={handleFiles}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* Ajouter des photos */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS || resizing}
            className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-40"
          >
            {resizing ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            Photo{photos.length > 0 ? ` (${photos.length}/${MAX_PHOTOS})` : ''}
          </button>

          {/* Partager une prise */}
          <Sheet open={pickerOpen} onOpenChange={handlePickerOpenChange}>
            <SheetTrigger className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-teal-600 hover:text-teal-700">
              <Fish size={15} />
              Prise
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-white">
              <SheetHeader>
                <SheetTitle>Tes prises</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-2 pt-1">
                <div className="flex items-center gap-2 rounded-full border border-sand-200 px-3">
                  <Search size={15} className="text-ink-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher (espèce, lieu)…"
                    className="min-h-10 flex-1 text-[14px] focus:outline-none"
                  />
                  {optLoading && <Loader2 size={14} className="animate-spin text-ink-400" />}
                </div>
              </div>
              <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto px-4 pb-6">
                {options.length === 0 ? (
                  <p className="py-4 text-[13px] text-ink-400">
                    {searched ? 'Aucune prise trouvée.' : 'Tu n’as pas encore de prise dans ton carnet.'}
                  </p>
                ) : (
                  options.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setAttached(c)
                        setPickerOpen(false)
                      }}
                      className="flex min-h-12 items-center gap-3 rounded-[10px] px-2 text-left hover:bg-ink-50"
                    >
                      <Fish size={16} className="shrink-0 text-teal-500" />
                      <span className="text-[14px] text-navy-900">
                        {SPECIES_LABELS[c.species ?? ''] ?? c.species ?? 'Prise'}
                        {c.size_cm ? ` · ${c.size_cm} cm` : ''}
                      </span>
                    </button>
                  ))
                )}
                {optHasMore && (
                  <button
                    type="button"
                    onClick={loadMoreCatches}
                    disabled={optLoading}
                    className="mt-1 self-start text-[13px] font-semibold text-teal-600 hover:underline disabled:opacity-50"
                  >
                    Voir plus de prises
                  </button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-500 px-5 text-[14px] font-semibold text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-40"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Publier
        </button>
      </div>
    </div>
  )
}
