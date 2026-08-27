import Link from 'next/link'
import type { CatchRow } from '@/lib/catches/queries'
import { SPECIES_LABELS } from '@/lib/labels'
import { estimateWeightG } from '@/lib/species/morphometry'
import { TagData } from '@/components/ui-v2/tag-data'
import { Chip } from '@/components/ui-v2/chip'
import { CatchThumbPlaceholder } from './CatchThumbPlaceholder'

const PRIVACY_LABELS: Record<string, string> = {
  private: 'PRIVÉE',
  friends: 'ABONNÉS',
  public: 'PUBLIQUE',
}

const TIDE_LABELS: Record<string, string> = {
  rising: 'MONTANTE ▲',
  falling: 'DESCENDANTE ▼',
  slack: 'ÉTALE',
}

function fmtDateTime(iso: string): string {
  const date = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Europe/Paris',
  })
    .format(new Date(iso))
    .replace('.', '')
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
  return `${date} · ${time}`
}

/**
 * Row de prise DA v2 (liste du carnet) : vignette + titre + méta mono
 * (date · lieu · marée · leurre) + chip visibilité. Réf : carnet.html.
 */
export function CatchRowItem({ catch: c, photoUrl }: { catch: CatchRow; photoUrl?: string }) {
  const speciesLabel = SPECIES_LABELS[c.species ?? ''] ?? c.species ?? '—'
  const location = c.location_label ?? c.spot_name ?? null

  // Prise mesurée (photo_verified_at posé) → la longueur mesurée fait référence et
  // remplace la taille déclarée dans le titre. Honnêteté (D1) : « mesurée », jamais
  // « vérifiée » ; on signale la mesure par un tag distinct dans la méta.
  const isMeasured = c.photo_verified_at != null && c.measured_length_cm != null
  const displaySizeCm = c.measured_length_cm ?? c.size_cm

  // Poids estimé (morphométrie FishBase) quand aucune pesée n'est saisie. Toujours
  // « estimé », jamais une pesée ; rien si l'espèce n'est pas couverte.
  const estimatedWeightG = c.weight_g ? null : estimateWeightG(c.species, displaySizeCm)
  const estimatedWeightKg =
    estimatedWeightG != null
      ? (estimatedWeightG / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
      : null

  const measures = [
    displaySizeCm != null ? `${displaySizeCm} cm` : null,
    c.weight_g ? `${(c.weight_g / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg` : null,
    estimatedWeightKg != null ? `~${estimatedWeightKg} kg (estimé)` : null,
  ].filter(Boolean) as string[]

  const meta: { text: string; variant?: 'teal' }[] = []
  if (c.caught_at) meta.push({ text: fmtDateTime(c.caught_at) })
  if (location) meta.push({ text: location })
  if (isMeasured) meta.push({ text: 'MESURÉE', variant: 'teal' })
  if (c.tide_state && TIDE_LABELS[c.tide_state]) meta.push({ text: TIDE_LABELS[c.tide_state] })
  if (c.bait) meta.push({ text: c.bait })
  if (c.released) meta.push({ text: 'RELÂCHÉ', variant: 'teal' })

  return (
    <Link
      href={`/carnet/${c.id}`}
      className="flex items-center gap-3.5 rounded-[14px] border border-sand-200 bg-white p-3.5 transition-colors hover:border-teal-500/40 sm:gap-4 sm:px-4"
    >
      {/* Vignette : photo ou dégradé navy (réf maquette .thumb) */}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-gradient-to-br from-navy-800 to-navy-950">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={speciesLabel} className="size-full object-cover" />
        ) : (
          <CatchThumbPlaceholder species={c.species} sizes="56px" iconSize={20} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-navy-900 sm:text-[15px]">
          {speciesLabel}
          {measures.length > 0 && (
            <span className="font-mono"> · {measures.join(' · ')}</span>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {meta.map((m) => (
            <TagData key={m.text} variant={m.variant} className="whitespace-nowrap">
              {m.text}
            </TagData>
          ))}
        </p>
      </div>

      {c.privacy && (
        <Chip mono className="hidden shrink-0 sm:inline-flex">
          {PRIVACY_LABELS[c.privacy] ?? c.privacy}
        </Chip>
      )}
    </Link>
  )
}
