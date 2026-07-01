'use client'

// ─── Primitive de célébration (Sprint 61, Bloc 0) ──────────────────────────────
//
// Modale sobre + burst discret pour fêter un moment (record perso, nouvelle espèce,
// badge débloqué…). RÉUTILISABLE : elle prend une FILE de « moments » génériques et les
// présente un par un (jamais en superposition). Le Sprint 62 la réutilise pour les
// nouvelles familles de badges — d'où l'API découplée (aucune dépendance au domaine).
//
// A11y : réutilise la Dialog Base UI (focus trap, Esc, restauration du focus, backdrop).
// Le burst GSAP respecte STRICTEMENT `prefers-reduced-motion` (aucune particule rendue si
// l'utilisateur a demandé moins d'animation). ⚠️ On lit la media query BRUTE via
// useMediaQuery, PAS le hook motion marketing (dont RESPECT_REDUCED_MOTION=false ignore
// volontairement la préférence sur la home).

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Sparkles, type LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useMediaQuery } from '@/hooks/use-media-query'

export type CelebrationTone = 'record' | 'species' | 'badge' | 'default'

export type CelebrationMoment = {
  /** Clé stable (remonte le burst quand on change de moment). */
  key: string
  title: string
  subtitle?: string
  /** Ligne secondaire discrète (ex. « Ancien record : 55 cm »). */
  detail?: string
  /** XP octroyé pour ce moment (affiché si > 0). */
  xp?: number
  tone?: CelebrationTone
  icon?: LucideIcon
  /** Action optionnelle (ex. un <ShareButton/>), rendue au-dessus de « Continuer ». */
  action?: ReactNode
}

const BURST_COLORS = ['var(--gold-500)', 'var(--teal-300)', 'var(--coral-500)']

// Pastille d'icône par tonalité. John est daltonien : la teinte n'est JAMAIS le seul
// signal (l'icône + le titre portent le sens) — la couleur ne fait qu'accompagner.
const TONE_BADGE: Record<CelebrationTone, string> = {
  record: 'bg-gold-500/15 text-gold-500 ring-1 ring-gold-500/40',
  species: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/40',
  badge: 'bg-coral-500/15 text-coral-500 ring-1 ring-coral-500/40',
  default: 'bg-white/10 text-white ring-1 ring-white/20',
}

/** Burst radial sobre (16 fines particules). Monté UNIQUEMENT hors reduced-motion. */
function Burst() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const root = scope.current
      if (!root) return
      const particles = Array.from(root.querySelectorAll<HTMLElement>('[data-particle]'))
      particles.forEach((p, i) => {
        const angle = (i / particles.length) * Math.PI * 2
        gsap.fromTo(
          p,
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: Math.cos(angle) * 96,
            y: Math.sin(angle) * 96 - 12,
            opacity: 0,
            scale: 0.4,
            duration: 1.05,
            ease: 'power2.out',
            delay: i * 0.012,
          },
        )
      })
    },
    { scope },
  )

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-9 flex justify-center"
    >
      <div className="relative">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            data-particle
            className="absolute left-0 top-0 block h-2 w-0.5 rounded-full"
            style={{ background: BURST_COLORS[i % BURST_COLORS.length] }}
          />
        ))}
      </div>
    </div>
  )
}

export function CelebrationOverlay({
  moments,
  open,
  onClose,
}: {
  moments: CelebrationMoment[]
  open: boolean
  /** Appelé à la fermeture (dernier « Continuer », Esc ou clic backdrop). */
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // Réinitialise la file à chaque (ré)ouverture.
  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  if (!moments.length) return null

  const safeIndex = Math.min(index, moments.length - 1)
  const moment = moments[safeIndex]
  const total = moments.length
  const isLast = safeIndex >= total - 1
  const Icon = moment.icon ?? Sparkles
  const tone = moment.tone ?? 'default'

  function handleContinue() {
    if (isLast) onClose()
    else setIndex((i) => i + 1)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="relative overflow-hidden border-0 bg-navy-950 text-white ring-1 ring-gold-500/25 sm:max-w-md"
      >
        {!reducedMotion && <Burst key={moment.key} />}

        <div className="relative z-10 flex flex-col items-center px-2 pt-6 pb-1 text-center">
          <span
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${TONE_BADGE[tone]}`}
          >
            <Icon size={26} aria-hidden="true" />
          </span>

          <DialogTitle className="font-display text-[22px] leading-tight text-white">
            {moment.title}
          </DialogTitle>

          {moment.subtitle && (
            <DialogDescription className="mt-1.5 text-[15px] text-white/80">
              {moment.subtitle}
            </DialogDescription>
          )}

          {moment.detail && <p className="mt-1 text-[13px] text-white/55">{moment.detail}</p>}

          {typeof moment.xp === 'number' && moment.xp > 0 && (
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-3 py-1 font-mono text-[13px] font-semibold text-gold-500">
              +{moment.xp} XP
            </span>
          )}

          {total > 1 && (
            <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
              {moments.map((m, i) => (
                <span
                  key={m.key}
                  className={`h-1.5 rounded-full transition-all ${
                    i === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 mt-2 flex flex-col gap-2">
          {moment.action}
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-11 w-full rounded-[14px] bg-teal-500 py-3 text-[15px] font-bold text-navy-950 transition-colors hover:bg-teal-300"
          >
            {isLast ? 'Continuer' : `Suivant · ${safeIndex + 1}/${total}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
