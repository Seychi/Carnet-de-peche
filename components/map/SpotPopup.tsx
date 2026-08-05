'use client'

import { useEffect, useRef, useState } from 'react'
import SpotActivityBadge from '@/components/map/SpotActivityBadge'
import Link from 'next/link'
import { X, MapPin, Navigation, Lock, Fish, Clock, Mountain, Umbrella, BrickWall, Waves, Anchor, Star, ShieldCheck, Users, Globe, type LucideIcon } from 'lucide-react'
import type { SpotMarker, SpotSource } from '@/lib/map/utils'
import type { UserTier } from '@/lib/auth/tier'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS, SOURCE_LABELS } from '@/lib/labels'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { getSpotNextWindow } from '@/app/actions/solunar'
import type { FishingWindow, QualityLevel, SolunarEventType } from '@/lib/solunar/types'
import { QUALITY_TEXT_CLS } from '@/lib/solunar/quality-style'
import { FavoriteSpotButton } from '@/components/spots/FavoriteSpotButton'
import { buildLoginRedirect } from '@/lib/auth/redirect'

// ─── Solunar helpers ─────────────────────────────────────────────────────────

const QUALITY_LABELS: Record<QualityLevel, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très bonne',
  exceptionnelle: 'Exceptionnelle',
}

const EVENT_LABELS: Record<SolunarEventType, string> = {
  sunrise: 'Lever de soleil',
  sunset: 'Coucher de soleil',
  moonrise: 'Lever de lune',
  moonset: 'Coucher de lune',
  moon_apex: 'Transit lunaire',
  moon_nadir: 'Nadir lunaire',
}

function relativeDay(startISO: string): string {
  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
  const windowDate = fmt(new Date(startISO))
  if (windowDate === fmt(new Date())) return "Aujourd'hui"
  if (windowDate === fmt(new Date(Date.now() + 86_400_000))) return 'Demain'
  return new Date(startISO).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' })
}

function WindowSkeleton() {
  return (
    <div className="rounded-xl bg-sand-50 border border-ink-100 p-3 space-y-2 animate-pulse">
      <div className="h-2.5 w-24 bg-ink-200 rounded" />
      <div className="h-4 w-40 bg-ink-200 rounded" />
      <div className="h-2.5 w-32 bg-ink-200 rounded" />
    </div>
  )
}

function NextWindowDisplay({ window: w }: { window: FishingWindow }) {
  return (
    <div className="rounded-xl bg-sand-50 border border-ink-100 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock size={13} className="text-ink-500 shrink-0" />
        <span className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">Prochain créneau</span>
      </div>
      <p className="text-sm font-semibold text-ink-900">
        {relativeDay(w.startTimeISO)} {w.startLocal} – {w.endLocal}
      </p>
      <p className={`text-xs font-medium mt-0.5 ${QUALITY_TEXT_CLS[w.quality]}`}>
        {QUALITY_LABELS[w.quality]} · {EVENT_LABELS[w.centerEvent.type]}
      </p>
    </div>
  )
}

function NextWindowEmpty() {
  return (
    <div className="rounded-xl bg-sand-50 border border-ink-100 p-3 flex items-center gap-2">
      <Clock size={13} className="text-ink-400 shrink-0" />
      <span className="text-xs text-ink-400">Aucun créneau optimal dans les 7 prochains jours</span>
    </div>
  )
}

function NextWindowTeaser() {
  return (
    <div className="rounded-xl bg-sand-50 border border-ink-100 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock size={13} className="text-ink-500 shrink-0" />
        <span className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">Prochain créneau</span>
      </div>
      <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
        <p className="text-sm font-semibold text-ink-900">Aujourd&apos;hui 18:30 – 20:30</p>
        <p className="text-xs font-medium text-teal-500 mt-0.5">Très bonne · Coucher de soleil</p>
      </div>
      <Link href="/tarifs" className="mt-2 block text-xs text-teal-600 hover:underline font-medium">
        Voir les créneaux →
      </Link>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SpotPopupProps = {
  spot: SpotMarker
  onClose: () => void
  userTier?: UserTier
}

const MAX_BADGES = 2

// DA v2 : pictos Lucide, plus d'emojis-icônes.
const STRUCTURE_ICONS: Record<string, LucideIcon> = {
  pointe_rocheuse: Mountain,
  plage: Umbrella,
  digue: BrickWall,
  estuaire: Waves,
  cale: Anchor,
  passe: Waves,
  cassure: Mountain,
}

function BadgeList({
  items,
  labels,
  colorClass,
}: {
  items: string[]
  labels: Record<string, string>
  colorClass: string
}) {
  const visible = items.slice(0, MAX_BADGES)
  const overflow = items.length - MAX_BADGES
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <span key={item} className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          {labels[item] ?? item}
        </span>
      ))}
      {overflow > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} opacity-60`}>
          +{overflow}
        </span>
      )}
    </div>
  )
}

// Badge de provenance — label + icône (forme), pas seulement la couleur
// (daltonisme). « Vérifié » = garantie éditoriale, réservé aux spots curés.
const SOURCE_BADGE: Record<SpotSource, { Icon: LucideIcon; cls: string }> = {
  curated: { Icon: ShieldCheck, cls: 'bg-teal-500/10 text-teal-700' },
  community: { Icon: Users, cls: 'bg-navy-900/10 text-navy-900' },
  imported: { Icon: Globe, cls: 'bg-gold-500/15 text-ink-700' },
}

function SourceChip({ source }: { source: SpotSource }) {
  const { Icon, cls } = SOURCE_BADGE[source] ?? SOURCE_BADGE.community
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] ${cls}`}
    >
      <Icon size={11} aria-hidden="true" />
      {SOURCE_LABELS[source] ?? source}
    </span>
  )
}

function DifficultyStars({ difficulty }: { difficulty: number }) {
  if (!difficulty || difficulty < 1) return null
  return (
    <div role="img" className="flex items-center gap-0.5" aria-label={`Difficulté ${difficulty}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden
          className={i < difficulty ? 'fill-gold-500 text-gold-500' : 'text-ink-300'}
        />
      ))}
    </div>
  )
}

function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const previousFocus = document.activeElement as HTMLElement | null

    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable[0]?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      previousFocus?.focus()
    }
  }, [containerRef, onClose])
}

export default function SpotPopup({ spot, onClose, userTier = 'anonymous' }: SpotPopupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Focus trap — no-op on mobile : containerRef.current est null car le div desktop n'est pas rendu
  useFocusTrap(containerRef, onClose)

  const isPaid = userTier === 'local' || userTier === 'itinerant'

  // ── Prochain créneau : lazy-load via Server Action ────────────────────────
  const [windowStatus, setWindowStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [nextWindow, setNextWindow] = useState<FishingWindow | null>(null)

  useEffect(() => {
    if (!isPaid) return
    let cancelled = false
    setWindowStatus('loading')
    setNextWindow(null)
    getSpotNextWindow(spot.id, spot.lat, spot.lng)
      .then((result) => {
        if (!cancelled) { setNextWindow(result); setWindowStatus('done') }
      })
      .catch(() => {
        if (!cancelled) { setNextWindow(null); setWindowStatus('done') }
      })
    return () => { cancelled = true }
  // spot.lat et spot.lng ne changent pas sans que spot.id change (même objet)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot.id, isPaid])

  const showGps = spot.isPrecise
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`

  // Contenu partagé entre les deux branches (desktop popup / mobile sheet)
  const body = (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-navy-900 text-base leading-tight truncate">
            {spot.name}
          </h2>
          <p className="mt-0.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">
            {spot.isPrecise
              ? `${Math.abs(spot.lat).toFixed(4)}°${spot.lat >= 0 ? 'N' : 'S'} · ${Math.abs(spot.lng).toFixed(4)}°${spot.lng >= 0 ? 'E' : 'O'}`
              : spot.department}
          </p>
          {spot.source && (
            <div className="mt-1.5">
              <SourceChip source={spot.source} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {/* Étoile favori (sprint 72) : tous tiers. Anonyme → login (l'action
              serveur refuse de toute façon). État lazy-chargé côté client. */}
          <FavoriteSpotButton
            spotId={spot.id}
            source="map"
            loginHref={
              userTier === 'anonymous' ? buildLoginRedirect(`/spots/${spot.slug}`) : undefined
            }
            className="-my-1.5"
          />
          <button
            onClick={onClose}
            aria-label="Fermer le détail du spot"
            className="shrink-0 p-1 rounded-full text-ink-500 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Espèces */}
      {spot.species.length > 0 && (
        <div className="space-y-1">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">Espèces</p>
          <BadgeList items={spot.species} labels={SPECIES_LABELS} colorClass="bg-teal-500/10 text-teal-700" />
        </div>
      )}

      {/* Techniques */}
      {spot.techniques.length > 0 && (
        <div className="space-y-1">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">Techniques</p>
          <BadgeList items={spot.techniques} labels={TECHNIQUE_LABELS} colorClass="bg-navy-900/10 text-navy-900" />
        </div>
      )}

      {/* Sections abonnés */}
      {isPaid && (
        <>
          {(!!spot.difficulty || !!spot.structure) && (
            <div className="flex items-center gap-3 flex-wrap">
              {!!spot.difficulty && (
                <div className="space-y-0.5">
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">Difficulté</p>
                  <DifficultyStars difficulty={spot.difficulty} />
                </div>
              )}
              {!!spot.structure && (
                <div className="space-y-0.5">
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">Structure</p>
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-700">
                    {(() => {
                      const StructureIcon = STRUCTURE_ICONS[spot.structure]
                      return StructureIcon ? <StructureIcon size={14} className="text-ink-500" /> : null
                    })()}
                    {STRUCTURE_LABELS[spot.structure] ?? spot.structure}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-400">Score</p>
            {spot.currentScore != null ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-ink-100">
                <b className="font-semibold text-ink-900">
                  {spot.currentScore}
                </b>
                <span className="text-ink-400"> / 100</span>
              </span>
            ) : (
              <div className="relative group">
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-ink-100 text-ink-400">
                  — / 100
                </span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-ink-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                    Score en cours de calcul
                  </div>
                  <div className="w-2 h-2 bg-ink-900 rotate-45 mx-auto -mt-1" />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Signal social — activité récente du spot (Carte v2 / C1, Bloc D) */}
      <SpotActivityBadge spotId={spot.id} />

      {/* Prochain créneau */}
      {isPaid && (
        windowStatus === 'loading'
          ? <WindowSkeleton />
          : nextWindow
          ? <NextWindowDisplay window={nextWindow} />
          : windowStatus === 'done'
          ? <NextWindowEmpty />
          : null
      )}
      {userTier === 'discovery' && <NextWindowTeaser />}

      {/* Message gating */}
      {!isPaid && (
        <div className="flex items-start gap-2 bg-ink-100 rounded-xl p-3">
          <Lock size={14} className="text-ink-500 mt-0.5 shrink-0" />
          <p className="text-xs text-ink-500 leading-snug">
            Coords précises et fiche complète réservées aux abonnés{' '}
            <Link href="/tarifs" className="text-teal-600 hover:underline font-medium">
              Local / Itinérant
            </Link>
          </p>
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-2 pt-1">
        <Link
          href={`/spots/${spot.slug}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-teal-500 text-navy-950 text-sm font-semibold hover:bg-teal-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <MapPin size={16} />
          Voir le spot complet
        </Link>

        {isPaid && (
          <Link
            href={`/carnet/nouvelle?spot_id=${spot.id}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <Fish size={16} />
            Loguer une prise ici
          </Link>
        )}

        {showGps && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <Navigation size={16} />
            Itinéraire GPS
          </a>
        )}
      </div>
    </>
  )

  // ── Mobile (< 768px) : bottom sheet avec snap 60vh ────────────────────────
  if (!isDesktop) {
    return (
      <Sheet
        open={true}
        onOpenChange={(v: boolean) => { if (!v) onClose() }}
        snapPoints={['60vh']}
        dragHandle={true}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex flex-col p-0 overflow-hidden"
          aria-label={`Spot : ${spot.name}`}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[env(safe-area-inset-bottom,0px)]">
            {body}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // ── Desktop (≥ 768px) : popup absolute top-right ──────────────────────────
  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Spot : ${spot.name}`}
      className="absolute top-4 right-4 w-80 z-20 rounded-2xl border border-sand-200 bg-white shadow-lg max-h-[80vh] overflow-y-auto"
    >
      <div className="p-4 space-y-3">
        {body}
      </div>
    </div>
  )
}

export type { SpotPopupProps }
