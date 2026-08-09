import { describe, it, expect } from 'vitest'
import {
  getWallKind,
  buildSignupHref,
  SIGNUP_WALL_SURFACES,
  SIGNUP_WALL_TITLE,
  SIGNUP_WALL_BENEFITS,
  SIGNUP_WALL_CTA,
  SIGNUP_WALL_NOTE,
} from '@/lib/gating/wall'
import type { UserTier } from '@/lib/auth/tier'

describe('getWallKind — séparation mur gratuit / mur payant', () => {
  it('anonyme → mur d’inscription (jamais d’abonnement)', () => {
    expect(getWallKind('anonymous')).toBe('signup')
  })

  it('inscrit gratuit → upsell abonnement (non-régression modèle éco)', () => {
    expect(getWallKind('discovery')).toBe('upsell')
  })

  it('abonnés → aucun mur', () => {
    expect(getWallKind('local')).toBe('none')
    expect(getWallKind('itinerant')).toBe('none')
  })

  it('valeur inattendue / absente → signup (on ne vend jamais par défaut)', () => {
    expect(getWallKind(null)).toBe('signup')
    expect(getWallKind(undefined)).toBe('signup')
    expect(getWallKind('bidon' as UserTier)).toBe('signup')
  })

  it('couvre exhaustivement les 4 tiers', () => {
    const tiers: UserTier[] = ['anonymous', 'discovery', 'local', 'itinerant']
    expect(tiers.map(getWallKind)).toEqual(['signup', 'upsell', 'none', 'none'])
  })
})

describe('buildSignupHref — retour exact au point de départ', () => {
  it('encode le chemin courant une seule fois', () => {
    expect(buildSignupHref('/spots/pointe-du-raz')).toBe(
      '/auth/register?redirect=%2Fspots%2Fpointe-du-raz',
    )
  })

  it('conserve la query (filtres de carte)', () => {
    expect(buildSignupHref('/carte?species=bar')).toBe(
      '/auth/register?redirect=%2Fcarte%3Fspecies%3Dbar',
    )
  })

  it('sans cible → inscription nue', () => {
    expect(buildSignupHref()).toBe('/auth/register')
    expect(buildSignupHref(null)).toBe('/auth/register')
    expect(buildSignupHref('')).toBe('/auth/register')
  })

  it('refuse les cibles externes (anti open-redirect)', () => {
    expect(buildSignupHref('https://evil.example/x')).toBe('/auth/register')
    expect(buildSignupHref('//evil.example')).toBe('/auth/register')
    expect(buildSignupHref('javascript:alert(1)')).toBe('/auth/register')
  })
})

describe('copy du mur d’inscription', () => {
  const copy = [SIGNUP_WALL_TITLE, SIGNUP_WALL_CTA, SIGNUP_WALL_NOTE, ...SIGNUP_WALL_BENEFITS]

  it('ne mentionne jamais de prix', () => {
    for (const s of copy) {
      expect(s).not.toMatch(/€|euro|mois|tarif|abonn/i)
    }
  })

  it('n’utilise aucun tiret cadratin (CLAUDE.md §6)', () => {
    for (const s of copy) {
      expect(s).not.toContain('—')
    }
  })

  it('expose des identifiants de surface uniques', () => {
    expect(new Set(SIGNUP_WALL_SURFACES).size).toBe(SIGNUP_WALL_SURFACES.length)
  })
})
