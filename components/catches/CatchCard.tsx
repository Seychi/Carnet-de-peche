import Link from 'next/link'
import { Fish, Lock, Users, Globe, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ElementType } from 'react'
import type { CatchRow } from '@/lib/catches/queries'

import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'

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

  return (
    <Link
      href={`/carnet/${c.id}`}
      className="flex flex-col bg-white rounded-[14px] border border-slate-100 overflow-hidden hover:border-teal-200 transition-colors shadow-sm group"
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
          <div className="absolute bottom-2 left-2 bg-teal-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Relâché
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
          <p className="text-[11px] text-ink-400">
            {TECHNIQUE_LABELS[c.technique] ?? c.technique}
          </p>
        )}

        {/* Taille / poids */}
        {(c.size_cm || c.weight_g) && (
          <p className="text-[13px] text-ink-600 font-medium mt-0.5">
            {c.size_cm ? `${c.size_cm} cm` : ''}
            {c.size_cm && c.weight_g ? ' · ' : ''}
            {c.weight_g ? `${(c.weight_g / 1000).toFixed(2)} kg` : ''}
          </p>
        )}

        {/* Lieu + date — en bas de la carte */}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          {location && (
            <p className="flex items-center gap-1 text-[11px] text-ink-400 truncate min-w-0">
              <MapPin size={11} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
          {c.caught_at && (
            <p className="text-[11px] text-ink-400 shrink-0 ml-auto">
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
