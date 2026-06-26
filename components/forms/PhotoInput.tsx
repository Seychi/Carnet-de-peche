'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { resizeImageToWebp } from '@/lib/storage/image-resize'

const MAX_INPUT_BYTES = 20 * 1024 * 1024 // 20 MB — seuil de rejet avant resize
// Plafond de sortie APRÈS resize (sprint 20, défense en profondeur). resizeImageToWebp
// vise ~0,9 Mo mais c'est best-effort : sur une image pathologique le WebP peut rester
// au-dessus. On refuse alors côté client (toast + onChange(null)) plutôt que d'envoyer
// un fichier qui ferait sauter le Server Action. 1,8 Mo = aligné sur le garde serveur.
const MAX_OUTPUT_BYTES = 1.8 * 1024 * 1024 // 1.8 MB

interface PhotoInputProps {
  onChange: (file: File | null) => void
  className?: string
  initialUrl?: string | null
}

export function PhotoInput({ onChange, className, initialUrl }: PhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null)
  const [resizedSize, setResizedSize] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    if (!raw) return

    if (raw.size > MAX_INPUT_BYTES) {
      toast.error('La photo dépasse 20 Mo. Choisis une image plus légère.')
      e.target.value = ''
      return
    }

    setLoading(true)
    setPreview(null)
    setResizedSize(null)

    try {
      const webp = await resizeImageToWebp(raw)

      // Défense en profondeur : si malgré le resize le WebP reste trop lourd (image
      // pathologique), on refuse côté client plutôt que de faire sauter le Server Action.
      if (webp.size > MAX_OUTPUT_BYTES) {
        toast.error('Photo trop détaillée pour être optimisée sous 2 Mo. Choisis une image plus simple ou plus légère.')
        onChange(null)
        e.target.value = ''
        return
      }

      const objectUrl = URL.createObjectURL(webp)
      setPreview(objectUrl)
      setResizedSize(webp.size)
      onChange(webp)
    } catch (err) {
      console.error('[PhotoInput] resize error:', err)
      toast.error('Impossible de traiter cette image. Réessaie.')
      onChange(null)
    } finally {
      setLoading(false)
    }
  }

  function handleChange() {
    // Libère uniquement les blob URLs (pas les URLs HTTP des photos existantes)
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    setPreview(null)
    setResizedSize(null)
    onChange(null)
    inputRef.current?.click()
  }

  return (
    <div className={className}>
      {/* Input caché — capture="environment" déclenche la caméra arrière sur mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      {!preview && !loading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-[14px] border-2 border-dashed border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50 transition-colors flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-teal-600"
        >
          <CameraIcon />
          <span className="text-[13px] font-medium">Ajouter une photo</span>
          <span className="text-[11px] text-slate-400">JPG, PNG, HEIC : max 20 Mo</span>
        </button>
      )}

      {loading && (
        <div className="w-full h-36 rounded-[14px] border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3">
          <Spinner />
          <span className="text-[13px] text-slate-500">Optimisation en cours…</span>
        </div>
      )}

      {preview && !loading && (
        <div className="relative rounded-[14px] overflow-hidden border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Aperçu de la prise"
            className="w-full object-cover max-h-64"
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-center justify-between">
            {resizedSize !== null && (
              <span className="text-[11px] text-white/80">
                {formatBytes(resizedSize)} · WebP
              </span>
            )}
            <button
              type="button"
              onClick={handleChange}
              className="text-[12px] font-semibold text-white bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 transition-colors"
            >
              Changer la photo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin text-teal-500" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
