// Point d'entrée GSAP partagé du motion home (sprint 34, WS-1).
// Enregistre les plugins UNE fois, côté client uniquement. Importé par les
// composants/hooks `'use client'` du dossier motion. Le garde `typeof window`
// évite tout accès `window` au rendu serveur (ScrollTrigger touche le DOM).
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, ScrollTrigger)
}

export { gsap, ScrollTrigger, useGSAP }
