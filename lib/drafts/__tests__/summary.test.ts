import { describe, it, expect } from 'vitest'
import { buildDraftSummary } from '@/lib/drafts/summary'

describe('buildDraftSummary — nommer ce qui est en jeu sur la page d’inscription', () => {
  it('rien en attente → null (la copie générique est conservée)', () => {
    expect(buildDraftSummary({})).toBeNull()
    expect(buildDraftSummary({ favoritesCount: 0 })).toBeNull()
    expect(buildDraftSummary({ species: null, favoritesCount: 0 })).toBeNull()
  })

  it('prise + favoris : nomme l’espèce, le spot et le NOMBRE', () => {
    expect(
      buildDraftSummary({ species: 'bar', spotName: 'Pointe de Penvins', favoritesCount: 2 }),
    ).toBe(
      'Ta prise de bar à Pointe de Penvins et tes 2 spots mis de côté t’attendent. 30 secondes, sans carte bancaire.',
    )
  })

  it('prise seule, sans nom de spot résolu : se dégrade proprement', () => {
    expect(buildDraftSummary({ species: 'bar', favoritesCount: 0 })).toBe(
      'Ta prise de bar t’attend. 30 secondes, sans carte bancaire.',
    )
  })

  it('favoris seuls : accorde le singulier et le pluriel', () => {
    expect(buildDraftSummary({ favoritesCount: 1 })).toBe(
      'Tes 1 spot mis de côté t’attend. 30 secondes, sans carte bancaire.',
    )
    expect(buildDraftSummary({ favoritesCount: 3 })).toBe(
      'Tes 3 spots mis de côté t’attendent. 30 secondes, sans carte bancaire.',
    )
  })

  it('utilise le libellé lisible de l’espèce, pas la clé technique', () => {
    // `lieu_jaune` ne doit jamais apparaître tel quel devant un pêcheur.
    const out = buildDraftSummary({ species: 'lieu_jaune', favoritesCount: 0 })
    expect(out).not.toContain('lieu_jaune')
    expect(out).toContain('lieu jaune')
  })

  it('ne jette pas et ne fabrique rien sur une espèce inconnue', () => {
    const out = buildDraftSummary({ species: 'poisson_lune', favoritesCount: 0 })
    expect(out).toContain('poisson_lune')
  })

  it('ignore un compte de favoris négatif', () => {
    expect(buildDraftSummary({ favoritesCount: -3 })).toBeNull()
  })
})
