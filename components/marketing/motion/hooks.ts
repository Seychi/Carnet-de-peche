'use client'

import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from './gsap'
import { motionReduced, isCoarsePointer } from './config'

// Lectures synchrones de la préférence, DANS le callback useGSAP (donc côté client
// après hydratation). Le bridage reduced-motion passe par la politique centrale
// (`config.ts`, RESPECT_REDUCED_MOTION) : par défaut le motion joue toujours. Les
// effets POINTEUR (magnetic/glow) restent coupés sur tactile (aucune souris).
function prefersReduce(): boolean {
  return motionReduced()
}
function isTouch(): boolean {
  return isCoarsePointer()
}

// ── useReveal : entrée « la donnée se dessine » au scroll dans le viewport ──────
type RevealOptions = {
  /** Si fourni, anime les enfants matchés (stagger) plutôt que l'élément lui-même. */
  selector?: string
  y?: number
  opacity?: number
  duration?: number
  ease?: string
  stagger?: number
  start?: string
  once?: boolean
}

export function useReveal<T extends HTMLElement = HTMLDivElement>(options: RevealOptions = {}) {
  const ref = useRef<T>(null)
  useGSAP(
    () => {
      if (prefersReduce() || !ref.current) return
      const targets = options.selector
        ? ref.current.querySelectorAll(options.selector)
        : ref.current
      gsap.from(targets, {
        y: options.y ?? 40,
        opacity: options.opacity ?? 0,
        duration: options.duration ?? 0.8,
        ease: options.ease ?? 'power3.out',
        stagger: options.stagger ?? 0.08,
        scrollTrigger: {
          trigger: ref.current,
          start: options.start ?? 'top 85%',
          once: options.once ?? true,
        },
      })
    },
    { scope: ref },
  )
  return ref
}

// ── useParallax : translation douce liée au scroll (scrub) ──────────────────────
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  options: { speed?: number; start?: string; end?: string } = {},
) {
  const ref = useRef<T>(null)
  useGSAP(
    () => {
      if (prefersReduce() || !ref.current) return
      gsap.to(ref.current, {
        yPercent: -(options.speed ?? 0.3) * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: options.start ?? 'top bottom',
          end: options.end ?? 'bottom top',
          scrub: true,
        },
      })
    },
    { scope: ref },
  )
  return ref
}

// ── usePin : épingle l'élément sur une distance (scrollytelling hero) ────────────
export function usePin<T extends HTMLElement = HTMLDivElement>(
  options: { end?: string; anticipatePin?: number } = {},
) {
  const ref = useRef<T>(null)
  useGSAP(
    () => {
      if (prefersReduce() || !ref.current) return
      ScrollTrigger.create({
        trigger: ref.current,
        start: 'top top',
        end: options.end ?? '+=100%',
        pin: true,
        anticipatePin: options.anticipatePin ?? 1,
      })
    },
    { scope: ref },
  )
  return ref
}

// ── useScrub : timeline scrubbée générique scopée à l'élément ────────────────────
export function useScrub<T extends HTMLElement = HTMLDivElement>(
  build: (tl: gsap.core.Timeline, el: T) => void,
  options: { start?: string; end?: string; scrub?: number | boolean; pin?: boolean } = {},
) {
  const ref = useRef<T>(null)
  useGSAP(
    () => {
      if (prefersReduce() || !ref.current) return
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ref.current,
          start: options.start ?? 'top top',
          end: options.end ?? 'bottom top',
          scrub: options.scrub ?? true,
          pin: options.pin ?? false,
        },
      })
      build(tl, ref.current)
    },
    { scope: ref },
  )
  return ref
}

// ── useMagnetic : le CTA suit légèrement le curseur (no-op tactile/reduce) ───────
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(
  options: { strength?: number } = {},
) {
  const ref = useRef<T>(null)
  useGSAP(
    () => {
      if (prefersReduce() || isTouch() || !ref.current) return
      const el = ref.current
      const strength = options.strength ?? 0.4
      const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        xTo((e.clientX - (r.left + r.width / 2)) * strength)
        yTo((e.clientY - (r.top + r.height / 2)) * strength)
      }
      const onLeave = () => {
        xTo(0)
        yTo(0)
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
      return () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerleave', onLeave)
      }
    },
    { scope: ref },
  )
  return ref
}

// ── useCursorGlow : met à jour --glow-x/--glow-y sur le conteneur (no-op tactile) ─
// Le rendu visuel (radial-gradient via ::before) est laissé au CSS du consommateur.
export function useCursorGlow<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  useGSAP(
    () => {
      if (prefersReduce() || isTouch() || !ref.current) return
      const el = ref.current
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--glow-x', `${e.clientX - r.left}px`)
        el.style.setProperty('--glow-y', `${e.clientY - r.top}px`)
      }
      el.addEventListener('pointermove', onMove)
      return () => el.removeEventListener('pointermove', onMove)
    },
    { scope: ref },
  )
  return ref
}
