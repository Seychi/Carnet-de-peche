import Link from 'next/link'
import { Fish, Lock, Users, Globe, MapPin, Ruler } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ElementType } from 'react'
import type { CatchRow } from '@/lib/catches/queries'

import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { checkSize, getFacadeForCatch } from '@/lib/regulation'
import { estimateWeightG } from '@/lib/species/morphometry'

const PRIVACY_CONFIG: Record<
  string,
  { Icon: ElementType; cls: string; bg: string }
> = {
  private: { Icon: Lock,  cls: 'text-slate-500', bg: 'bg-white/90' },
  friends: { Icon: Users, cls: 'text-blue-500',  bg: 'bg-white/90' },
  public:  { Icon: Globe, cls: 'text-teal-500',  bg: 'bg-white/90' },
}

export function CatchCard({
  catch: c,
  photoUrl,
}: {
  catch: CatchRow
  photoUrl?: string
}) {
  const privacy = PRIVACY_CONFIG[c.privacy ?? 'private'] ?? PRIVACY_CONFIG.private
  const { Icon: PrivacyIcon } = privacy
  const location = c.location_label ?? c.spot_name ?? null
  const speciesLabel = SPECIES_LABELS[c.species ?? ''] ?? c.species ?? '—'

  // Prise mesurée (photo_verified_at posé) → la longueur mesurée fait référence.
  // Honnêteté (D1) : « mesurée », jamais « vérifiée ».
  const isMeasured = c.photo_verified_at != null && c.measured_length_cm != null
  const displaySizeCm = c.measured_length_cm ?? c.size_cm

  // Poids estimé (morphométrie FishBase) quand aucune pesée n'est saisie. Toujours
  // « estimé », jamais une pesée ; rien si l'espèce n'est pas couverte.
  const estimatedWeightG = c.weight_g ? null : estimateWeightG(c.species, displaySizeCm)
  const estimatedWeightKg =
    estimatedWeightG != null
      ? (estimatedWeightG / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
      : null

  // Badge réglementaire (sprint 24) : un poisson CONSERVÉ sous la maille façade-aware.
  // Façade inconnue (ni dépt ni géoloc) → pas de badge (jamais de verdict faux).
  const facade = getFacadeForCatch({ department: c.department, lat: c.lat, lng: c.lng })
  const isUndersizeKept =
    !c.released &&
    !!facade &&
    !!c.species &&
    c.size_cm != null &&
    checkSize(c.species, facade, c.size_cm).status === 'undersize'

  return (
    <Link
      href={`/carnet/${c.id}`}
      className="flex flex-col bg-white rounded-[14px] border border-sand-200 overflow-hidden hover:border-teal-200 transition-colors group"
    >
      {/* Photo ou placeholder */}
      <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={speciesLabel}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <Fish size={36} className="text-slate-300" />
          </div>
        )}

        {/* Badge privacy */}
        <div
          className={`absolute top-2 right-2 ${privacy.bg} rounded-full p-1.5 shadow-sm ${privacy.cls}`}
        >
          <PrivacyIcon size={11} />
        </div>

        {/* Badge relâché */}
        {c.released && (
          <div className="absolute bottom-2 left-2 bg-teal-500/90 text-navy-950 text-xs font-bold px-2 py-0.5 rounded-full">
            Relâché
          </div>
        )}

        {/* Badge réglementaire : conservé sous la maille (texte explicite, pas la teinte seule) */}
        {isUndersizeKept && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Sous-maille
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-3 flex-1 flex flex-col gap-0.5">
        {/* Espèce */}
        <p className="font-bold text-[14px] text-navy-900 leading-tight">
          {speciesLabel}
        </p>

        {/* Technique */}
        {c.technique && (
          <p className="text-xs text-ink-400">
            {TECHNIQUE_LABELS[c.technique] ?? c.technique}
          </p>
        )}

        {/* Taille / poids.
            Une prise mesurée (measured_length_cm) affiche la longueur mesurée comme
            taille de référence + une pastille « Mesurée » (jamais « vérifiée », D1).
            Sinon on retombe sur la taille déclarée (size_cm). */}
        {(displaySizeCm != null || c.weight_g || estimatedWeightKg != null) && (
          <p className="font-mono text-[13px] text-ink-600 font-medium mt-0.5 flex items-center gap-1.5">
            <span>
              {displaySizeCm != null ? `${displaySizeCm} cm` : ''}
              {displaySizeCm != null && c.weight_g ? ' · ' : ''}
              {c.weight_g ? `${(c.weight_g / 1000).toFixed(2)} kg` : ''}
              {/* Pas de pesée : poids estimé d'après la taille (FishBase). */}
              {!c.weight_g && estimatedWeightKg != null && displaySizeCm != null ? ' · ' : ''}
              {!c.weight_g && estimatedWeightKg != null ? (
                <span className="text-ink-400">~{estimatedWeightKg} kg (estimé)</span>
              ) : (
                ''
              )}
            </span>
            {isMeasured && (
              <span className="inline-flex items-center gap-0.5 font-sans text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                <Ruler size={12} aria-hidden="true" />
                Mesurée
              </span>
            )}
          </p>
        )}

        {/* Lieu + date — en bas de la carte */}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          {location && (
            <p className="flex items-center gap-1 text-xs text-ink-400 truncate min-w-0">
              <MapPin size={11} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
          {c.caught_at && (
            <p className="text-xs text-ink-400 shrink-0 ml-auto">
              {formatDistanceToNow(new Date(c.caught_at), {
                addSuffix: true,
                locale: fr,
              })}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
