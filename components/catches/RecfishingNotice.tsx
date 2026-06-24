'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, ExternalLink, ClipboardList } from 'lucide-react'
import { markCatchDeclared } from '@/lib/catches/actions'
import { RECFISHING_LINKS, RECFISHING_META } from '@/lib/regulation/recfishing'

// Bandeau + récap RecFishing (sprint 24). RAPPELLE + PRÉPARE + OUVRE — ne déclare
// JAMAIS à la place du pêcheur (RecFishing = EU Login, aucune API tierce).

type RecapField = { label: string; value: string }

export function RecfishingNotice({
  catchId,
  speciesLabel,
  sizeCm,
  caughtAtISO,
  locationLabel,
  techniqueLabel,
  released,
  declared: initialDeclared,
}: {
  catchId: string
  speciesLabel: string
  sizeCm: number | null
  caughtAtISO: string
  locationLabel: string | null
  techniqueLabel: string | null
  released: boolean
  declared: boolean
}) {
  const [declared, setDeclared] = useState(initialDeclared)
  const [pending, startTransition] = useTransition()

  const dateLabel = formatExact(caughtAtISO)

  const fields: RecapField[] = [
    { label: 'Espèce', value: speciesLabel },
    { label: 'Taille', value: sizeCm != null ? `${sizeCm} cm` : 'non renseignée' },
    { label: 'Date et heure', value: dateLabel },
    { label: 'Lieu', value: locationLabel ?? 'non renseigné' },
    { label: 'Quantité', value: '1' },
    { label: 'Technique', value: techniqueLabel ?? 'non renseignée' },
    { label: 'Devenir', value: released ? 'Relâché (à déclarer aussi)' : 'Conservé' },
  ]

  function handleCopy() {
    const text = fields.map((f) => `${f.label} : ${f.value}`).join('\n')
    navigator.clipboard?.writeText(text).then(
      () => toast.success('Récap copié — colle-le dans RecFishing'),
      () => toast.error('Copie impossible sur cet appareil'),
    )
  }

  function handleMarkDeclared() {
    startTransition(async () => {
      const res = await markCatchDeclared(catchId)
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      setDeclared(true)
      toast.success('Prise marquée comme déclarée')
    })
  }

  if (declared) {
    return (
      <div className="bg-white rounded-[14px] border border-teal-200 p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="shrink-0 text-teal-600" />
          <p className="text-[14px] font-semibold text-navy-900">
            Déclarée sur RecFishing
          </p>
        </div>
        <p className="mt-1.5 text-[12px] text-ink-500">
          Tu as marqué cette prise comme déclarée. Rien d&rsquo;autre à faire.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 rounded-[14px] border border-amber-300 p-5 shadow-sm">
      {/* Bandeau : RAPPEL (jamais « déclaré pour toi ») */}
      <div className="flex items-start gap-2.5">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-amber-900">
            Espèce sensible : à déclarer sur RecFishing sous {RECFISHING_META.deadlineHours} h
          </p>
          <p className="mt-1 text-[12px] text-amber-800 leading-relaxed">
            Cette espèce doit être déclarée à l&rsquo;administration via l&rsquo;appli officielle RecFishing
            (y compris si tu l&rsquo;as relâchée). On prépare ton récap ci-dessous — c&rsquo;est toi qui
            valides la déclaration sur RecFishing (connexion EU Login).
          </p>
        </div>
      </div>

      {/* Récap pré-rempli à recopier */}
      <div className="mt-4 rounded-[10px] border border-amber-200 bg-white/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            <ClipboardList size={12} /> Récap à recopier
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[12px] font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            Copier
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {fields.map((f) => (
            <div key={f.label} className="flex flex-col">
              <dt className="text-[10px] uppercase tracking-wide text-ink-400">{f.label}</dt>
              <dd className="text-[13px] font-medium text-navy-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Liens : ouvrir RecFishing (l'utilisateur déclare lui-même) */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={RECFISHING_LINKS.webPortal}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-amber-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Ouvrir RecFishing <ExternalLink size={13} />
        </a>
        <a
          href={RECFISHING_LINKS.ios}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-amber-300 bg-white px-3 py-2 text-[12px] font-medium text-amber-800 hover:bg-amber-100"
        >
          App iOS
        </a>
        <a
          href={RECFISHING_LINKS.android}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-amber-300 bg-white px-3 py-2 text-[12px] font-medium text-amber-800 hover:bg-amber-100"
        >
          App Android
        </a>
      </div>

      {/* Auto-déclaratif : marquer comme fait */}
      <button
        type="button"
        onClick={handleMarkDeclared}
        disabled={pending}
        className="mt-4 w-full rounded-[10px] border border-amber-300 bg-white py-2.5 text-[13px] font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : 'J’ai déclaré cette prise'}
      </button>

      {/* Traçabilité : source + date de la liste des espèces sensibles. */}
      <p className="mt-3 border-t border-amber-200 pt-2.5 text-[11px] leading-snug text-amber-700/80">
        {RECFISHING_META.source} · vérifié le {RECFISHING_META.verifiedAt}.
      </p>
    </div>
  )
}

function formatExact(iso: string): string {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return iso
  }
}
