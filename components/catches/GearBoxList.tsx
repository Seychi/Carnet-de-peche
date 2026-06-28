'use client'

import Link from 'next/link'
import { Box } from 'lucide-react'
import type { GearItem } from '@/app/actions/gear'
import { GearBoxItem } from './GearBoxItem'

export type GearSpeciesCount = { species: string; count: number }

export type GearBoxEntry = {
  item: GearItem
  totalCatches: number
  bySpecies: GearSpeciesCount[]
  /**
   * URL signée de la photo du leurre (bucket PRIVÉ 'catches'), signée CÔTÉ SERVEUR
   * par la page. null si pas de photo. JAMAIS une URL publique.
   */
  signedPhotoUrl: string | null
}

// ── Libellés ────────────────────────────────────────────────────────────────

export const GEAR_KIND_LABELS: Record<GearItem['kind'], string> = {
  leurre: 'Leurre',
  montage: 'Montage',
  appat: 'Appât',
}

/**
 * Libellé d'affichage d'un item : marque + modèle + couleur, sans tronquer.
 * Toujours non vide (fallback sur le type) pour ne jamais afficher une carte muette.
 */
export function gearDisplayLabel(item: GearItem): string {
  const parts = [item.brand, item.model, item.color].filter((p) => p?.trim())
  if (parts.length > 0) return parts.join(' ')
  return GEAR_KIND_LABELS[item.kind]
}

/**
 * Liste « ma boîte ». Vide propre + CTA si aucun matériel actif ET aucun retiré.
 * Sinon une carte par item actif (le plus pêchant d'abord), puis, à part, la
 * section « Au cimetière des leurres » (perdus/cassés/usés, en lecture seule).
 */
export function GearBoxList({
  entries,
  retired = [],
}: {
  entries: GearBoxEntry[]
  retired?: GearBoxEntry[]
}) {
  if (entries.length === 0 && retired.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-sand-300 bg-white px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 text-ink-400">
          <Box size={22} aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-[19px] text-navy-900">
          Ta boîte est encore vide
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-500">
          Ajoute ton premier leurre en loguant une prise : choisis ou crée ton
          matériel dans le formulaire, et il apparaîtra ici avec son nombre de
          prises par espèce.
        </p>
        <Link
          href="/carnet/nouvelle"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-navy-900 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-navy-950"
        >
          Loguer une prise
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.item.id}>
              <GearBoxItem entry={entry} />
            </li>
          ))}
        </ul>
      )}

      {retired.length > 0 && (
        <section>
          <h2 className="font-display text-[18px] text-navy-900">
            Au cimetière des leurres
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-500">
            Tes leurres perdus, cassés ou usés. Ils ne sont plus dans ta boîte ni
            dans le sélecteur, mais ils gardent leur tableau de chasse.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {retired.map((entry) => (
              <li key={entry.item.id}>
                <GearBoxItem entry={entry} retired />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
