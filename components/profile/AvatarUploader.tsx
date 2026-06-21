'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { resizeImageToSquareWebp } from '@/lib/storage/image-resize'
import { updateAvatar, removeAvatar } from '@/app/(app)/profil/actions'

const MAX_INPUT_BYTES = 20 * 1024 * 1024 // 20 Mo avant resize

export function AvatarUploader({
  userId,
  username,
  initialUrl,
  variant = 'light',
}: {
  userId: string
  username: string | null
  initialUrl: string | null
  // 'light' = fond clair (profil) ; 'dark' = fond navy (onboarding fini).
  variant?: 'light' | 'dark'
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)

  const initials = (username ?? '?').slice(0, 2).toUpperCase()
  const dark = variant === 'dark'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    e.target.value = '' // permet de re-choisir le même fichier
    if (!raw) return
    if (raw.size > MAX_INPUT_BYTES) {
      toast.error('Image trop lourde (max 20 Mo).')
      return
    }

    setBusy(true)
    try {
      // Recadrage carré 512 + WebP (re-encode canvas → EXIF/GPS supprimé).
      const webp = await resizeImageToSquareWebp(raw, 512)
      const supabase = createClient()
      const path = `${userId}/${crypto.randomUUID()}.webp`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, webp, { contentType: 'image/webp', upsert: false })
      if (upErr) throw upErr

      const res = await updateAvatar(path)
      if (res.error) {
        await supabase.storage.from('avatars').remove([path]) // pas d'orphelin
        toast.error(res.error)
        return
      }
      setUrl(res.url ?? null)
      toast.success('Photo mise à jour !')
      router.refresh() // rafraîchit le profil (et les surfaces SSR au prochain rendu)
    } catch (err) {
      console.error('[AvatarUploader] upload', err)
      toast.error('Impossible de mettre à jour ta photo. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    try {
      const res = await removeAvatar()
      if (res.error) {
        toast.error(res.error)
        return
      }
      setUrl(null)
      toast.success('Photo retirée.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Changer ma photo de profil"
        className="group relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-white shadow disabled:opacity-70"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar utilisateur (Storage public), <img> volontaire
          <img src={url} alt={username ?? 'Avatar'} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center bg-navy-900 font-display text-xl font-bold text-white">
            {initials}
          </span>
        )}
        <span
          className={
            busy
              ? 'absolute inset-0 flex items-center justify-center bg-black/40 text-white'
              : 'absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100'
          }
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choisir une photo de profil"
        className="sr-only"
        onChange={handleFile}
      />

      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={
            dark
              ? 'text-[13px] font-semibold text-teal-300 hover:text-teal-200 disabled:opacity-50'
              : 'text-[13px] font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-50'
          }
        >
          {url ? 'Changer ma photo' : 'Ajouter une photo'}
        </button>
        {url && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className={
              dark
                ? 'inline-flex items-center gap-1 text-[12px] text-white/50 hover:text-white/80 disabled:opacity-50'
                : 'inline-flex items-center gap-1 text-[12px] text-ink-400 hover:text-red-500 disabled:opacity-50'
            }
          >
            <Trash2 size={12} />
            Retirer la photo
          </button>
        )}
      </div>
    </div>
  )
}
