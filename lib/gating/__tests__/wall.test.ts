import { describe, it, expect } from 'vitest'
import {
  getWallKind,
  buildSignupHref,
  SIGNUP_WALL_SURFACES,
  SIGNUP_WALL_TITLE,
  SIGNUP_WALL_TITLE_SPOT,
  SIGNUP_WALL_BENEFITS,
  SIGNUP_WALL_BENEFITS_SPOT,
  SIGNUP_WALL_CTA,
  SIGNUP_WALL_NOTE,
  signupWallTitleForFacet,
  wallCopyForSurface,
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
  // Sprint 76 : la variante contextualisée « fiche de spot » est soumise aux
  // MÊMES règles que la générique (zéro prix, zéro tiret cadratin).
  const copy = [
    SIGNUP_WALL_TITLE,
    SIGNUP_WALL_CTA,
    SIGNUP_WALL_NOTE,
    ...SIGNUP_WALL_BENEFITS,
    SIGNUP_WALL_TITLE_SPOT('Pointe de Penvins'),
    ...SIGNUP_WALL_BENEFITS_SPOT,
  ]

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

  it('ne promet JAMAIS les coordonnées précises (elles restent abonnés)', () => {
    for (const s of copy) {
      expect(s).not.toMatch(/coordonn|gps|précis/i)
    }
  })

  it('expose des identifiants de surface uniques', () => {
    expect(new Set(SIGNUP_WALL_SURFACES).size).toBe(SIGNUP_WALL_SURFACES.length)
  })

  it('garde les surfaces du sprint 75 (le renommage casserait le funnel)', () => {
    for (const s of [
      'map_filters',
      'map_layers',
      'nearby',
      'score',
      'banner',
      'spot_popup',
      'spot_page',
    ] as const) {
      expect(SIGNUP_WALL_SURFACES).toContain(s)
    }
  })

  it('ajoute la surface /spots (Bloc 9)', () => {
    expect(SIGNUP_WALL_SURFACES).toContain('spots_list')
  })

  it('ajoute les 3 coupures de fiche et les 2 brouillons (sprint 77)', () => {
    for (const s of [
      'spot_tides',
      'spot_score',
      'spot_catches',
      'pending_favorite',
      'pending_catch',
    ] as const) {
      expect(SIGNUP_WALL_SURFACES).toContain(s)
    }
  })
})

describe('copie par coupure (sprint 77, Blocs 2 et 7)', () => {
  const CUTS = [
    'spot_tides',
    'spot_score',
    'spot_catches',
    'pending_favorite',
    'pending_catch',
  ] as const

  it('donne une copie propre à CHAQUE coupure, jamais le générique', () => {
    for (const surface of CUTS) {
      const copy = wallCopyForSurface(surface, 'Pointe de Penvins')
      expect(copy).toBeDefined()
      expect(copy!.title).not.toBe(SIGNUP_WALL_TITLE)
      expect(copy!.benefits).not.toEqual(SIGNUP_WALL_BENEFITS)
    }
  })

  it('interpole le nom du spot quand il est connu, et tient sans', () => {
    expect(wallCopyForSurface('spot_tides', 'Penvins')!.title).toContain('Penvins')
    expect(wallCopyForSurface('spot_tides')!.title).not.toContain('undefined')
  })

  it('laisse les surfaces historiques sur leur copie générique', () => {
    for (const s of ['map_filters', 'banner', 'spot_page', 'spots_list'] as const) {
      expect(wallCopyForSurface(s, 'Penvins')).toBeUndefined()
    }
  })

  it('ne promet jamais de prix ni de coordonnées précises, sans tiret cadratin', () => {
    for (const surface of CUTS) {
      const copy = wallCopyForSurface(surface, 'Penvins')!
      for (const line of [copy.title, ...copy.benefits]) {
        expect(line).not.toMatch(/—/)
        expect(line).not.toMatch(/€|euro|abonn/i)
        expect(line).not.toMatch(/GPS|coordonnée/i)
      }
    }
  })
})

describe('variante contextualisée « fiche de spot » (sprint 76, Bloc 1)', () => {
  it('interpole le nom du spot dans le titre', () => {
    expect(SIGNUP_WALL_TITLE_SPOT('Pointe de Penvins')).toBe(
      "Suis Pointe de Penvins, c'est gratuit",
    )
  })

  it('parle du spot lu, pas du produit (aucun bénéfice de rétention seul)', () => {
    // Sprint 77 : la copie a changé (« tous les jours » / « en temps réel »
    // étaient FAUX, un anonyme les avait déjà). Le test vérifie toujours qu'on
    // parle du spot sous les yeux, mais sur les formulations réelles.
    expect(SIGNUP_WALL_BENEFITS_SPOT[0]).toMatch(/ici/)
    expect(SIGNUP_WALL_BENEFITS_SPOT[1]).toMatch(/ce spot/)
  })

  it('ne décrit aucune capacité déjà donnée à un anonyme (Bloc 4)', () => {
    // Le mur mesuré à 1,3 % de clic promettait ce que le visiteur venait de
    // recevoir. Garde-fou : plus une seule mention de « 3 spots par département ».
    for (const line of [...SIGNUP_WALL_BENEFITS, ...SIGNUP_WALL_BENEFITS_SPOT]) {
      expect(line).not.toMatch(/3 spots/i)
    }
  })

  it('reste distincte de la copie générique (qui sert les surfaces carte)', () => {
    expect(SIGNUP_WALL_BENEFITS_SPOT).not.toEqual(SIGNUP_WALL_BENEFITS)
    expect(SIGNUP_WALL_TITLE_SPOT('X')).not.toBe(SIGNUP_WALL_TITLE)
  })
})

describe('signupWallTitleForFacet — mur de /spots (sprint 76, Bloc 9)', () => {
  it('reprend le libellé du département', () => {
    expect(signupWallTitleForFacet({ deptPhrase: 'du Morbihan' })).toBe(
      "Suis les spots du Morbihan, c'est gratuit",
    )
  })

  it('reprend le libellé de l’espèce', () => {
    expect(signupWallTitleForFacet({ speciesLabel: 'bar' })).toBe(
      "Suis les spots à bar, c'est gratuit",
    )
  })

  it('combine espèce et département', () => {
    expect(
      signupWallTitleForFacet({ deptPhrase: 'du Morbihan', speciesLabel: 'dorade royale' }),
    ).toBe("Suis les spots à dorade royale du Morbihan, c'est gratuit")
  })

  it('hors facette → undefined (le mur reprend son titre générique)', () => {
    expect(signupWallTitleForFacet({})).toBeUndefined()
    expect(signupWallTitleForFacet({ deptPhrase: null, speciesLabel: null })).toBeUndefined()
  })

  it('n’utilise aucun tiret cadratin et ne parle jamais de prix', () => {
    const titles = [
      signupWallTitleForFacet({ deptPhrase: 'des Landes' }),
      signupWallTitleForFacet({ speciesLabel: 'sar' }),
      signupWallTitleForFacet({ deptPhrase: "de l'Hérault", speciesLabel: 'orphie' }),
    ]
    for (const t of titles) {
      expect(t).toBeTypeOf('string')
      expect(t).not.toContain('—')
      expect(t).not.toMatch(/€|euro|abonn/i)
    }
  })
})
