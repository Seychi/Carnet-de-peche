import { Award, Calendar, Layers, Leaf, List, Ruler, Sparkles, Trophy, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BADGES, type BadgeDef, type UserBadgeRow } from '@/lib/gamification/badges'
import { TagData } from '@/components/ui-v2/tag-data'

// Badges PERSONNELS (privés). Gagnés vs à débloquer distingués par LUMINOSITÉ +
// ICÔNE ✓ + TEXTE (daltonien-safe), jamais par la teinte seule. Les critères basés
// sur des données déclaratives (taille/relâché) sont signalés honnêtement : pas de
// vérification automatique (la mesure photo G1 n'existe pas).

const ICONS: Record<BadgeDef['icon'], LucideIcon> = {
  sparkle: Sparkles,
  list: List,
  layers: Layers,
  trophy: Trophy,
  leaf: Leaf,
  calendar: Calendar,
  ruler: Ruler,
}

// Badges dont le critère repose sur des données DÉCLARATIVES (l'utilisateur saisit
// taille/relâché ; on ne vérifie pas par photo). Affichés avec une note honnête.
const DECLARATIVE: Record<string, true> = { release_friendly: true }

function frDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function BadgesGrid({
  badges,
  className,
}: {
  badges: UserBadgeRow[]
  className?: string
}) {
  const earnedBySlug = new Map(badges.map((b) => [b.badge_slug, b]))
  const earnedCount = BADGES.filter((b) => earnedBySlug.has(b.slug)).length

  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-4 ${className ?? ''}`}>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <TagData>BADGES</TagData>
          <p className="mt-1 font-mono text-[22px] font-bold leading-none text-navy-900 tabular-nums">
            {earnedCount}
            <span className="text-ink-400">/{BADGES.length}</span>
          </p>
        </div>
        <p className="max-w-[55%] text-right text-xs leading-snug text-ink-500">
          Des jalons perso. Aucun classement, aucune comparaison.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BADGES.map((def) => {
          const earned = earnedBySlug.get(def.slug)
          const Icon = ICONS[def.icon] ?? Award
          const isEarned = !!earned
          return (
            <li
              key={def.slug}
              className={
                isEarned
                  ? 'rounded-[10px] border border-teal-200 bg-teal-50 p-3'
                  : 'rounded-[10px] border border-dashed border-slate-200 bg-slate-50/60 p-3'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <Icon
                  size={18}
                  className={isEarned ? 'text-teal-700' : 'text-slate-300'}
                  aria-hidden
                />
                {isEarned ? (
                  <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold uppercase text-teal-800">
                    <Check size={11} aria-hidden /> Obtenu
                  </span>
                ) : (
                  <span className="font-mono text-xs font-bold uppercase text-slate-400">
                    À débloquer
                  </span>
                )}
              </div>
              <p
                className={
                  isEarned
                    ? 'mt-1.5 text-[13px] font-semibold leading-tight text-navy-900'
                    : 'mt-1.5 text-[13px] font-semibold leading-tight text-ink-400'
                }
              >
                {def.label}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-ink-500">{def.description}</p>
              {DECLARATIVE[def.slug] && (
                <p className="mt-1 text-xs italic leading-snug text-ink-400">
                  Sur la base de ce que tu déclares, pas de vérification automatique.
                </p>
              )}
              {isEarned && earned?.earned_at && (
                <p className="mt-1 font-mono text-xs text-ink-400 tabular-nums">
                  {frDate(earned.earned_at)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
