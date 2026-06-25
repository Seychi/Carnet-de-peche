'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { TideSparkline } from '@/components/ui-v2/tide-sparkline'
import { TagData } from '@/components/ui-v2/tag-data'
import { AnimatedCounter } from '@/components/ui-v2/animated-counter'
import { Bathy } from '@/components/ui-v2/bathy'
import { HeroPrimaryCta } from '@/components/marketing/HeroPrimaryCta'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { gsap, useGSAP } from '@/components/marketing/motion/gsap'
import { useMagnetic } from '@/components/marketing/motion'
import { trendLabel } from '@/lib/conditions/tide'
import type { HeroSnapshot, HomeCounts } from '@/lib/marketing/home-data'
import { HeroMap } from './HeroMap'
import { LiveClock } from './LiveClock'

const QUALITY_LABEL: Record<string, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très bonne',
  exceptionnelle: 'Exceptionnelle',
}

const BTN_ACCENT = cn(buttonVariants({ variant: 'accent', size: 'cta' }))
const BTN_GHOST_DARK = cn(buttonVariants({ variant: 'lineDark', size: 'cta' }))

function fmtMeters(m: number | null): string {
  if (m == null) return '—'
  return `${m.toFixed(1).replace('.', ',')} m`
}

export function Hero({ hero, counts }: { hero: HeroSnapshot; counts: HomeCounts }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const exploreRef = useMagnetic<HTMLAnchorElement>({ strength: 0.3 })

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const touch = window.matchMedia('(pointer: coarse)').matches

      if (!reduce) {
        // Entrée orchestrée « la donnée se compose ».
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('[data-hero-line]', {
          y: 28,
          opacity: 0,
          filter: 'blur(8px)',
          duration: 0.9,
          stagger: 0.1,
        }).from(
          panelRef.current,
          { y: 30, opacity: 0, scale: 0.985, duration: 1 },
          '-=0.65',
        )

        // Auroras qui respirent (dérive lente).
        gsap.to('[data-aurora]', {
          xPercent: (i) => (i === 0 ? 8 : -8),
          yPercent: (i) => (i === 0 ? -6 : 6),
          scale: 1.12,
          duration: 9,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
      }

      // Curseur : halo + flottement de l'instrument (desktop only).
      if (!reduce && !touch) {
        const px = gsap.quickTo(panelRef.current, 'x', { duration: 0.6, ease: 'power3.out' })
        const py = gsap.quickTo(panelRef.current, 'y', { duration: 0.6, ease: 'power3.out' })
        const onMove = (e: PointerEvent) => {
          const r = root.getBoundingClientRect()
          root.style.setProperty('--glow-x', `${e.clientX - r.left}px`)
          root.style.setProperty('--glow-y', `${e.clientY - r.top}px`)
          px((e.clientX / window.innerWidth - 0.5) * -16)
          py((e.clientY / window.innerHeight - 0.5) * -12)
        }
        root.addEventListener('pointermove', onMove)
        return () => root.removeEventListener('pointermove', onMove)
      }
    },
    { scope: rootRef },
  )

  const spotName = hero.spot?.name ?? 'Pointe du Raz'
  const score = hero.score
  const qualityLabel = hero.quality ? (QUALITY_LABEL[hero.quality] ?? hero.quality) : null

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-[100svh] items-center overflow-hidden text-white"
      style={{ background: 'radial-gradient(130% 100% at 78% -8%, #0c2a38 0%, var(--navy-950) 52%)' }}
    >
      {/* ── Fond : poster instantané (WS-3.5) → carte MapLibre live (WS-3.3) → voiles ── */}
      {/* Poster = texture marine inline (isobathes DA-v2), ZÉRO réseau et hors LCP,
          affichée tout de suite ; la carte MapLibre + mer WebGL fondent par-dessus
          après idle → le live ne bloque jamais le 1er paint. (L'API static MapTiler
          renvoie 403 sur ce plan → on ne dépend pas d'une image distante.) */}
      <Bathy density={5} opacity={0.4} />
      <HeroMap center={hero.position} spots={hero.mapSpots} />
      {/* Voile horizontal : sombre à gauche (texte lisible), translucide à droite (carte visible). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-950/35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-navy-950/85 via-transparent to-navy-950/55"
      />
      <div
        aria-hidden="true"
        data-aurora
        className="pointer-events-none absolute left-[-110px] top-[8%] z-[1] h-[460px] w-[460px] rounded-full blur-[80px] mix-blend-screen"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,.4), transparent 64%)' }}
      />
      <div
        aria-hidden="true"
        data-aurora
        className="pointer-events-none absolute bottom-[-70px] right-[-90px] z-[1] h-[420px] w-[420px] rounded-full blur-[80px] mix-blend-screen"
        style={{ background: 'radial-gradient(circle, rgba(217,165,60,.3), transparent 64%)' }}
      />
      {/* Halo curseur (desktop) — suit --glow-x/--glow-y posés par useGSAP. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen"
        style={{
          background:
            'radial-gradient(380px circle at var(--glow-x, 80%) var(--glow-y, 20%), rgba(20,184,166,.13), transparent 65%)',
        }}
      />

      {/* ── Contenu ── */}
      <div className="relative z-[2] mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-[1.06fr_.94fr] lg:gap-14">
        <div>
          <p
            data-hero-line
            className="inline-flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-teal-300"
          >
            <span aria-hidden="true" className="text-teal-400">●</span> Canne du bord · Mer · France
          </p>
          <h1
            data-hero-line
            className="mt-5 font-display text-[clamp(40px,6.4vw,74px)] font-semibold leading-[1.03] tracking-[-0.025em] text-white"
          >
            Sache{' '}
            <span className="bg-gradient-to-r from-teal-300 via-teal-500 to-gold-300 bg-clip-text text-transparent">
              quand et où
            </span>
            <br />
            ça va mordre.
          </h1>
          <p data-hero-line className="mt-6 max-w-[520px] text-[19px] leading-relaxed text-white/75">
            Logue tes prises. Le carnet croise marée, marnage, vent et heure avec{' '}
            <b className="text-white">ton</b> historique — et te dit quand sortir. La donnée
            d&apos;un instrument marin, dans ta poche.
          </p>
          <div data-hero-line className="mt-8 flex flex-wrap gap-3.5">
            <HeroPrimaryCta className={BTN_ACCENT} registerLabel="Créer mon carnet — gratuit" />
            <Link ref={exploreRef} href="/carte" className={BTN_GHOST_DARK}>
              Explorer la carte
            </Link>
          </div>
          <div data-hero-line className="mt-12 flex flex-wrap gap-9">
            <Stat value={counts.species} label="espèces de chez nous" />
            <Stat value={counts.spots ?? 157} label="spots curés &amp; vérifiés" />
            <Stat value={100} suffix="%" label="fil communautaire gratuit" />
          </div>
        </div>

        {/* ── Instrument (données RÉELLES) ── */}
        <div
          ref={panelRef}
          data-hero-panel
          className="relative rounded-[24px] border border-white/12 p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,.6)] backdrop-blur-md"
          style={{ background: 'linear-gradient(160deg, rgba(14,61,79,.6), rgba(4,20,28,.55))' }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <TagData variant="on-dark" className="truncate text-[11.5px]">
              {spotName}
            </TagData>
            <TagData
              variant="gold"
              className="rounded-full border border-gold-500/55 px-2.5 py-1 text-[11px] text-gold-300"
            >
              Marnage {fmtMeters(hero.tide.marnageM)}
            </TagData>
          </div>

          <div className="my-3 h-[112px]">
            {hero.tide.points.length >= 2 ? (
              <TideSparkline
                points={hero.tide.points}
                extrema={hero.tide.extrema}
                nowHour={hero.tide.nowHour}
                onDark
                className="h-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-white/40">
                Marée indisponible
              </div>
            )}
          </div>

          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-white/45">
            MARÉE EN DIRECT · <LiveClock />
          </p>

          <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
            {score != null ? (
              <ScoreRing value={score} size="lg" onDark className="shrink-0" />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center rounded-full border border-white/15 font-mono text-[13px] text-white/40">
                —
              </div>
            )}
            <div className="min-w-0">
              <TagData variant="on-dark" className="text-[11px]">
                {hero.nextWindow
                  ? `Prochain créneau · ${new Date(hero.nextWindow.startISO).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}`
                  : 'Meilleur moment du jour'}
              </TagData>
              <p className="mt-1 text-[13px] leading-snug text-white/70">
                {qualityLabel ? `${qualityLabel} à ${spotName}` : `Score du jour à ${spotName}`}
                {hero.tide.trend ? ` · marée ${trendLabel(hero.tide.trend).toLowerCase()}` : ''}.
              </p>
            </div>
          </div>
          <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/35">
            Score générique, identique pour tous — tes tendances perso vivent dans ton carnet.
          </p>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center font-mono text-[10px] tracking-[0.2em] text-white/40"
      >
        SCROLL
        <ChevronDown size={14} className="mx-auto mt-1 animate-bounce" />
      </div>
    </section>
  )
}

function Stat({ value, label, suffix }: { value: number | null; label: string; suffix?: string }) {
  return (
    <div>
      <div className="font-display text-[32px] font-semibold leading-none">
        {value != null ? <AnimatedCounter value={value} suffix={suffix} /> : '—'}
      </div>
      <div className="mt-1 text-[12px] text-white/55" dangerouslySetInnerHTML={{ __html: label }} />
    </div>
  )
}
