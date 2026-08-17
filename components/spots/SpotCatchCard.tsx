import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { SPECIES_LABELS } from '@/lib/labels'
import type { ViewerCatch } from '@/lib/spots/viewer'

/**
 * Carte « prise récente » de la fiche spot.
 *
 * Sorti de `app/(marketing)/spots/[slug]/page.tsx` au sprint 84 (Bloc 3) : le HTML
 * statique n'en sert que 2 (palier anonyme, sprint 77 Bloc 2) et les suivantes sont
 * rendues côté client après hydratation pour un visiteur connecté. Les deux chemins
 * doivent produire le MÊME balisage, donc il vit dans un seul fichier.
 *
 * Aucune coordonnée n'entre ici : `catches_for_viewer` applique déjà privacy et
 * floutage, et cette carte n'affiche que espèce, taille, poids, auteur et date.
 * Composant neutre (ni `'use client'` ni accès serveur) : utilisable des deux côtés.
 */
export function SpotCatchCard({ c }: { c: ViewerCatch }) {
  const author = c.display_name || c.username || 'Anonyme'
  let dateStr = ''
  try {
    dateStr = formatDistanceToNow(new Date(c.caught_at), { addSuffix: true, locale: fr })
  } catch {
    dateStr = '—'
  }

  return (
    <div className="shrink-0 w-44 md:w-auto snap-start bg-white border border-sand-200 rounded-[14px] p-4">
      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 mb-3">
        {SPECIES_LABELS[c.species] ?? c.species}
      </span>
      <p className="font-mono text-2xl font-semibold text-navy-900 leading-none">
        {c.size_cm ? `${c.size_cm} cm` : '—'}
      </p>
      {c.weight_g && c.weight_g > 0 && (
        <p className="mt-1 font-mono text-sm text-ink-500">{(c.weight_g / 1000).toFixed(1)} kg</p>
      )}
      <p className="text-xs text-ink-500 mt-3 truncate">{author}</p>
      <p className="text-xs text-ink-500">{dateStr}</p>
    </div>
  )
}
