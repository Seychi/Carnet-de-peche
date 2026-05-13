'use client'

import { useState } from 'react'
import { PhotoInput } from '@/components/forms/PhotoInput'

export default function TestPhotoPage() {
  const [file, setFile] = useState<File | null>(null)

  return (
    <div className="min-h-screen bg-sand-50 p-8 font-sans">
      <div className="max-w-md mx-auto space-y-6">

        <div>
          <p className="text-[12px] font-semibold text-ink-500 uppercase tracking-widest mb-1">
            DoD — PhotoInput + resizeImageToWebp
          </p>
          <h1 className="text-2xl font-bold text-navy-900">Test redimensionnement photo</h1>
          <p className="text-[13px] text-ink-500 mt-1">
            Sélectionne une photo depuis ton téléphone (5 Mo+). Tu dois voir le preview et la taille finale en WebP.
          </p>
        </div>

        <PhotoInput onChange={setFile} />

        {file && (
          <div className="rounded-[14px] border border-teal-200 bg-white p-5 space-y-3">
            <p className="text-[12px] font-semibold text-teal-600 uppercase tracking-wide">
              ✓ Résultat après resize
            </p>
            <Row label="Nom" value={file.name} />
            <Row label="Type" value={file.type} />
            <Row label="Taille finale" value={formatBytes(file.size)} />
            <Check
              label="Format WebP"
              ok={file.type === 'image/webp'}
            />
            <Check
              label="< 1,5 Mo (seuil upload)"
              ok={file.size < 1.5 * 1024 * 1024}
            />
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-[13px]">
      <span className="text-ink-400 w-24 shrink-0">{label}</span>
      <span className="font-mono text-ink-800 break-all">{value}</span>
    </div>
  )
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className={ok ? 'text-teal-500' : 'text-red-400'}>{ok ? '✓' : '✗'}</span>
      <span className={ok ? 'text-ink-800' : 'text-red-700'}>{label}</span>
    </div>
  )
}
