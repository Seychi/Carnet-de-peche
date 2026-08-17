'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { analytics } from '@/lib/analytics'
import { useSignupWallImpression } from '@/lib/hooks/useSignupWallImpression'
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
 * Libellé du CTA : « Suis {nom}, c'est gratuit ».
 *
 * ⚠️ SPRINT 80, Bloc 6 — il disait « Voir les conditions à {nom}, gratuit » et
 * menait à `/auth/register`. Les conditions sont déjà sur la page, gratuitement,
 * et le Bloc 1 de ce même sprint vient de les remonter dans le PREMIER écran :
 * le libellé promettait donc d'aller chercher ce que le visiteur a sous les yeux,
 * et livrait un formulaire d'inscription. Un CTA ne promet que ce qu'il livre.
 *
 * Ce que l'inscription apporte réellement ICI : garder ce spot, être prévenu
 * quand les conditions y deviennent bonnes, y loguer ses prises.
 *
 * Le nom est d'abord réduit à sa commune, puis coupé sur une frontière de MOT si
 * besoin, jamais en plein milieu.
 */
export function spotCtaLabel(spotName: string): string {
  const short = shortSpotName(spotName)
  if (short.length <= MAX_NAME) return `Suis ${short}, c'est gratuit`
  const cut = short.slice(0, MAX_NAME)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = (lastSpace > 8 ? cut.slice(0, lastSpace) : cut).replace(/[\s,'’-]+$/, '')
  return `Suis ${trimmed}, c'est gratuit`
}

export function SpotSignupCta({ href, spotName }: { href: string; spotName: string }) {
  const ref = useRef<HTMLAnchorElement>(null)

  // ★ Sprint 85, Bloc 0 (Défaut 3) — ce CTA émettait un CLIC sur la surface
  // `spot_page` sans jamais déclarer d'impression : c'est le mur `lg:hidden` de la
  // colonne principale qui portait, seul, le dénominateur. Le Bloc 2 supprime ce
  // mur (un seul mur dans le corps de la fiche), et sur mobile — 82 % du trafic —
  // cette barre est désormais la seule sollicitation `spot_page` à l'écran. Sans
  // cette ligne, la surface repartirait avec des clics et zéro impression, très
  // exactement le défaut que ce sprint corrige.
  //
  // Le compte est juste dans les deux sens : la barre est `md:hidden`, donc
  // masquée sur desktop, où c'est le mur de la colonne latérale qui compte.
  useSignupWallImpression(ref, 'spot_page')

  return (
    <Link
      ref={ref}
      href={href}
      onClick={() => analytics.signupWallClicked({ surface: 'spot_page' })}
      className="flex min-h-11 items-center justify-center gap-2 w-full py-3 bg-teal-500 hover:bg-teal-300 text-navy-950 font-semibold rounded-xl transition-colors text-sm"
    >
      {spotCtaLabel(spotName)}
    </Link>
  )
}
