'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Archive, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { archiveGearItem, updateGearItem } from '@/app/actions/gear'
import { SPECIES_LABELS } from '@/lib/labels'
import { Chip } from '@/components/ui-v2/chip'
import { TagData } from '@/components/ui-v2/tag-data'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { GEAR_KIND_LABELS, gearDisplayLabel, type GearBoxEntry } from './GearBoxList'

function speciesLabel(code: string): string {
  return SPECIES_LABELS[code] ?? code.replace(/_/g, ' ')
}

/**
 * Une référence de la boîte : libellé, type, nombre de prises (mono) et
 * répartition par espèce. Actions owner-only : éditer (inline) / archiver.
 * John est daltonien : le détail par espèce est porté par le texte + le chiffre
 * mono, jamais par une couleur seule.
 */
export function GearBoxItem({ entry }: { entry: GearBoxEntry }) {
  const router = useRouter()
  const { item, totalCatches, bySpecies } = entry
  const [editing, setEditing] = useState(false)

  return (
    <div className="rounded-[16px] border border-sand-200 bg-white p-4 sm:p-5">
      {editing ? (
        <GearEditForm
          entry={entry}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            router.refresh()
          }}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[17px] leading-tight text-navy-900 sm:text-[18px]">
                  {gearDisplayLabel(item)}
                </h2>
                <Chip className="shrink-0">{GEAR_KIND_LABELS[item.kind]}</Chip>
              </div>
              {item.size_mm != null && (
                <TagData className="mt-1 block">{item.size_mm} MM</TagData>
              )}
            </div>

            {/* Compteur de prises — chiffre métier en mono */}
            <div className="shrink-0 text-right">
              <p className="font-mono text-[24px] font-semibold leading-none text-navy-900 sm:text-[28px]">
                {totalCatches}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-400">
                {totalCatches > 1 ? 'prises' : 'prise'}
              </p>
            </div>
          </div>

          {/* Répartition par espèce */}
          {bySpecies.length > 0 ? (
            <p className="mt-3 text-[14px] leading-relaxed text-ink-600">
              {totalCatches > 1 ? 'Dont ' : 'Ta prise : '}
              {bySpecies.map((s, i) => (
                <span key={s.species}>
                  {i > 0 && ', '}
                  <span className="font-medium text-navy-900">{speciesLabel(s.species)}</span>{' '}
                  <span className="font-mono text-ink-500">×{s.count}</span>
                </span>
              ))}
              .
            </p>
          ) : (
            <p className="mt-3 text-[13.5px] text-ink-400">
              Aucune prise rattachée pour l’instant. Choisis ce matériel en
              loguant ta prochaine prise.
            </p>
          )}

          {item.notes && (
            <p className="mt-2 text-[13px] italic text-ink-500">{item.notes}</p>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-sand-200 px-3.5 text-[13.5px] font-medium text-ink-600 transition-colors hover:border-sand-300 hover:text-navy-900"
            >
              <Pencil size={14} aria-hidden="true" />
              Modifier
            </button>
            <ArchiveButton item={item} onArchived={() => router.refresh()} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Archiver (confirmation) ──────────────────────────────────────────────────

function ArchiveButton({
  item,
  onArchived,
}: {
  item: GearBoxEntry['item']
  onArchived: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const res = await archiveGearItem(item.id)
      if (res.ok) {
        toast.success('Matériel archivé.')
        setOpen(false)
        onArchived()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-sand-200 px-3.5 text-[13.5px] font-medium text-ink-600 transition-colors hover:border-sand-300 hover:text-navy-900">
        <Archive size={14} aria-hidden="true" />
        Archiver
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver « {gearDisplayLabel(item)} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Il disparaît de ta boîte et du sélecteur de matériel. Tes prises déjà
            loguées avec gardent leur libellé. Rien n’est supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={pending} className="gap-2">
            {pending && <Loader2 size={14} className="animate-spin" />}
            {pending ? 'Archivage…' : 'Oui, archiver'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Édition inline ───────────────────────────────────────────────────────────

function GearEditForm({
  entry,
  onClose,
  onSaved,
}: {
  entry: GearBoxEntry
  onClose: () => void
  onSaved: () => void
}) {
  const { item } = entry
  const [brand, setBrand] = useState(item.brand ?? '')
  const [model, setModel] = useState(item.model ?? '')
  const [color, setColor] = useState(item.color ?? '')
  const [sizeMm, setSizeMm] = useState(item.size_mm != null ? String(item.size_mm) : '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [pending, startTransition] = useTransition()

  function save() {
    const sizeParsed = sizeMm.trim() ? Number.parseInt(sizeMm, 10) : null
    if (sizeMm.trim() && (Number.isNaN(sizeParsed) || sizeParsed! < 1 || sizeParsed! > 1000)) {
      toast.error('La taille doit être un nombre entre 1 et 1000 mm.')
      return
    }

    startTransition(async () => {
      const res = await updateGearItem(item.id, {
        brand: brand.trim() || null,
        model: model.trim() || null,
        color: color.trim() || null,
        size_mm: sizeParsed,
        notes: notes.trim() || null,
      })
      if (res.ok) {
        toast.success('Matériel mis à jour.')
        onSaved()
      } else {
        toast.error(res.error)
      }
    })
  }

  const field =
    'w-full rounded-[10px] border border-sand-200 bg-white px-3 py-2 text-[14px] text-navy-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30'

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[16px] text-navy-900">
          Modifier « {gearDisplayLabel(item)} »
        </h2>
        <Chip className="shrink-0">{GEAR_KIND_LABELS[item.kind]}</Chip>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[13px] font-medium text-ink-600">
          Marque
          <input
            className={`mt-1 ${field}`}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            maxLength={60}
            placeholder="ex. Megabass"
          />
        </label>
        <label className="text-[13px] font-medium text-ink-600">
          Modèle
          <input
            className={`mt-1 ${field}`}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            maxLength={100}
            placeholder="ex. Vision 110"
          />
        </label>
        <label className="text-[13px] font-medium text-ink-600">
          Couleur
          <input
            className={`mt-1 ${field}`}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            maxLength={60}
            placeholder="ex. chartreuse"
          />
        </label>
        <label className="text-[13px] font-medium text-ink-600">
          Taille (mm)
          <input
            className={`mt-1 font-mono ${field}`}
            value={sizeMm}
            onChange={(e) => setSizeMm(e.target.value)}
            inputMode="numeric"
            placeholder="ex. 110"
          />
        </label>
      </div>

      <label className="mt-3 block text-[13px] font-medium text-ink-600">
        Notes
        <textarea
          className={`mt-1 min-h-[60px] resize-y ${field}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="ex. redoutable en eau claire"
        />
      </label>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-navy-900 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-navy-950 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <Check size={15} aria-hidden="true" />
          )}
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-sand-200 px-4 text-[14px] font-medium text-ink-600 transition-colors hover:text-navy-900"
        >
          <X size={15} aria-hidden="true" />
          Annuler
        </button>
      </div>
    </div>
  )
}
