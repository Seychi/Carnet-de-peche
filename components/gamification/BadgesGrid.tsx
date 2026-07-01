import { Sparkles, List, Layers, Leaf, CalendarDays, Ruler, Sun, Medal, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  BADGE_FAMILIES,
  TOTAL_BADGES,
  TIER_LABEL,
  familyState,
  type UserBadgeRow,
  type BadgeMetrics,
  type BadgeIcon,
  type BadgeTier,
} from '@/lib/gamification/badges'
import { TagData } from '@/components/ui-v2/tag-data'
import { ShareButton } from '@/components/share/ShareButton'

// Badges à PALIERS (Sprint 62), publics et partageables. Bronze / argent / or.
// DALTONIEN-SAFE : l'état (obtenu vs à débloquer) et le palier passent par une ICÔNE
// (Medal / Lock) + un LIBELLÉ texte (« Or », « à débloquer ») + un COMPTE de pips,
// jamais par la teinte seule (la couleur reste décorative). Les critères déclaratifs
// (relâché) sont signalés honnêtement. Aucun classement inter-pêcheurs (Phase E).

const ICONS: Record<BadgeIcon, LucideIcon> = {
  sparkle: Sparkles,
  list: List,
  layers: Layers,
  leaf: Leaf,
  calendar: CalendarDays,
  ruler: Ruler,
  sun: Sun,
}

function frDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function BadgesGrid({
  badges,
  metrics,
  className,
}: {
  badges: UserBadgeRow[]
  metrics: BadgeMetrics
  className?: string
}) {
  const earnedBySlug = new Map(badges.map((b) => [b.badge_slug, b]))
  const earnedCount = badges.length
  const states = BADGE_FAMILIES.map((f) => familyState(f, earnedBySlug, metrics))

  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-4 ${className ?? ''}`}>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <TagData>BADGES</TagData>
          <p className="mt-1 font-mono text-[22px] font-bold leading-none text-navy-900 tabular-nums">
            {earnedCount}
            <span className="text-ink-400">/{TOTAL_BADGES}</span>
          </p>
        </div>
        {earnedCount > 0 ? (
          <ShareButton
            input={{ kind: 'badges' }}
            title="Mes badges — Carnet de Pêche"
            text="Mes paliers débloqués sur Carnet de Pêche."
            label="Partager"
            variant="ghost"
            className="shrink-0"
          />
        ) : (
          <p className="max-w-[52%] text-right text-xs leading-snug text-ink-500">
            Des paliers à débloquer, prise après prise.
          </p>
        )}
      </header>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {states.map((s) => {
          const Icon = ICONS[s.family.icon] ?? Medal
          const earned = s.highestTier > 0
          const tiered = s.family.tiers.length > 1
          const pct = Math.round(s.progress * 100)
          return (
            <li
              key={s.family.key}
              className={
                earned
                  ? 'rounded-[10px] border border-teal-200 bg-teal-50/70 p-3'
                  : 'rounded-[10px] border border-dashed border-slate-200 bg-slate-50/60 p-3'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon
                    size={16}
                    className={earned ? 'shrink-0 text-teal-700' : 'shrink-0 text-slate-300'}
                    aria-hidden
                  />
                  <p
                    className={
                      earned
                        ? 'truncate text-[13px] font-semibold text-navy-900'
                        : 'truncate text-[13px] font-semibold text-ink-400'
                    }
                  >
                    {s.family.title}
                  </p>
                </div>
                {earned ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[11px] font-bold uppercase text-teal-800">
                    <Medal size={12} aria-hidden /> {TIER_LABEL[s.highestTier as BadgeTier]}
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[11px] font-bold uppercase text-slate-400">
                    <Lock size={11} aria-hidden /> à débloquer
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-ink-500">
                  {s.complete
                    ? 'Tous les paliers débloqués. Chapeau.'
                    : s.next
                      ? `Prochain : ${s.next.label}`
                      : ''}
                </p>
                {!s.complete && tiered && s.next && (
                  <span className="shrink-0 font-mono text-[11px] text-ink-400 tabular-nums">
                    {Math.min(s.current, s.next.target)}/{s.next.target}
                  </span>
                )}
              </div>

              {!s.complete && tiered && (
                <div
                  className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${s.family.title} : ${pct}% vers le prochain palier`}
                >
                  <div
                    className={earned ? 'h-full bg-teal-500' : 'h-full bg-teal-400'}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {tiered && (
                <div className="mt-1.5 flex items-center gap-1">
                  {s.family.tiers.map((t) => (
                    <span
                      key={t.slug}
                      className={
                        s.earnedSlugs.has(t.slug)
                          ? 'h-2 w-2 rounded-full bg-teal-600'
                          : 'h-2 w-2 rounded-full border border-slate-300'
                      }
                      aria-hidden
                    />
                  ))}
                  <span className="ml-1 font-mono text-[10px] text-ink-400 tabular-nums">
                    {s.highestTier}/{s.family.tiers.length} paliers
                  </span>
                </div>
              )}

              {s.family.declarative && (
                <p className="mt-1 text-[11px] italic leading-snug text-ink-400">
                  Sur la base de ce que tu déclares.
                </p>
              )}
              {earned && s.earnedAt && (
                <p className="mt-1 font-mono text-[10.5px] text-ink-400 tabular-nums">
                  obtenu le {frDate(s.earnedAt)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
