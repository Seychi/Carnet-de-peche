'use client'

import Link from 'next/link'
import { analytics } from '@/lib/analytics'
import { shortSpotName } from '@/lib/seo/spot-title'

// CTA collant mobile d'une fiche de spot pour un visiteur SANS COMPTE
// (sprint 76, Bloc 2).
//
// Avant : ce bandeau, le seul élément que 100 % des visiteurs mobiles voient,
// disait « + Loguer une prise ici » à quelqu'un qui vient d'arriver de Google et
// n'a ni compte ni prise à loguer. 82 % du trafic est mobile.
//
// Le CTA d'un utilisateur CONNECTÉ ne passe pas par ici : il reste le <Link>
// « + Loguer une prise ici » rendu côté serveur, strictement inchangé.

/** Longueur max du nom dans le libellé, pour tenir sur un écran de 360 px. */
const MAX_NAME = 22

/**
 * Libellé du CTA : « Voir les conditions à {nom}, gratuit ».
 * Le nom est d'abord réduit à sa commune (avant le tiret cadratin), puis coupé
 * sur une frontière de MOT si besoin, jamais en plein milieu.
 */
export function spotCtaLabel(spotName: string): string {
  const short = shortSpotName(spotName)
  if (short.length <= MAX_NAME) return `Voir les conditions à ${short}, gratuit`
  const cut = short.slice(0, MAX_NAME)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = (lastSpace > 8 ? cut.slice(0, lastSpace) : cut).replace(/[\s,'’-]+$/, '')
  return `Voir les conditions à ${trimmed}, gratuit`
}

export function SpotSignupCta({ href, spotName }: { href: string; spotName: string }) {
  return (
    <Link
      href={href}
      onClick={() => analytics.signupWallClicked({ surface: 'spot_page' })}
      className="flex items-center justify-center gap-2 w-full py-3 bg-teal-500 hover:bg-teal-300 text-navy-950 font-semibold rounded-xl transition-colors text-sm"
    >
      {spotCtaLabel(spotName)}
    </Link>
  )
}
