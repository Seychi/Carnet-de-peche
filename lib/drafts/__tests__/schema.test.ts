import { describe, it, expect } from 'vitest'
import {
  MAX_PENDING_FAVORITES,
  PENDING_FAVORITES_WALL_AT,
  parsePendingCatch,
  parsePendingFavorites,
  returnPathForSlug,
  serializePendingCatch,
  serializePendingFavorites,
  togglePendingFavorite,
  type PendingCatch,
  type PendingFavorite,
} from '../schema'

// Brouillon d'inscription différée (sprint 77, Bloc 7). Ce qui est testé ici,
// c'est surtout ce que le cookie N'A PAS le droit de contenir : pas de texte
// libre, pas de coordonnée, rien qui ressemble à une donnée personnelle.

const SPOT_A = '11111111-1111-4111-8111-111111111111'
const SPOT_B = '22222222-2222-4222-8222-222222222222'
const SPOT_C = '33333333-3333-4333-8333-333333333333'

const favorite = (id: string, slug?: string): PendingFavorite =>
  slug ? { id, slug } : { id }

describe('parsePendingFavorites', () => {
  it('relit ce qui a été écrit', () => {
    const list = [favorite(SPOT_A, 'pointe-du-raz'), favorite(SPOT_B)]
    expect(parsePendingFavorites(serializePendingFavorites(list))).toEqual(list)
  })

  it('renvoie une liste vide sur cookie absent, illisible ou invalide', () => {
    expect(parsePendingFavorites(null)).toEqual([])
    expect(parsePendingFavorites('')).toEqual([])
    expect(parsePendingFavorites('pas-du-json')).toEqual([])
    expect(parsePendingFavorites(encodeURIComponent('{"nope":1}'))).toEqual([])
    // id non-uuid : refusé en bloc, on ne ressuscite jamais du douteux
    expect(parsePendingFavorites(encodeURIComponent('[{"id":"../../etc"}]'))).toEqual([])
  })

  it('refuse un slug qui n’en est pas un (anti-injection dans le retour)', () => {
    const raw = encodeURIComponent(JSON.stringify([{ id: SPOT_A, slug: '/../auth/login' }]))
    expect(parsePendingFavorites(raw)).toEqual([])
  })

  it('plafonne à 5 spots et déduplique', () => {
    const many = [SPOT_A, SPOT_B, SPOT_C, SPOT_A, SPOT_A].map((id) => favorite(id))
    const raw = encodeURIComponent(JSON.stringify([...many, ...many]))
    const parsed = parsePendingFavorites(raw)
    expect(parsed).toHaveLength(3)
    expect(parsed.length).toBeLessThanOrEqual(MAX_PENDING_FAVORITES)
  })
})

describe('togglePendingFavorite', () => {
  it('ajoute puis retire le même spot', () => {
    const added = togglePendingFavorite([], favorite(SPOT_A, 'la-torche'))
    expect(added).toEqual({
      list: [favorite(SPOT_A, 'la-torche')],
      favorite: true,
      capped: false,
    })
    const removed = togglePendingFavorite(added.list, favorite(SPOT_A, 'la-torche'))
    expect(removed.favorite).toBe(false)
    expect(removed.list).toEqual([])
  })

  it('refuse le 6e spot sans écraser les 5 premiers', () => {
    let list: PendingFavorite[] = []
    for (const id of [SPOT_A, SPOT_B, SPOT_C, '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555']) {
      list = togglePendingFavorite(list, favorite(id)).list
    }
    expect(list).toHaveLength(MAX_PENDING_FAVORITES)
    const capped = togglePendingFavorite(list, favorite('66666666-6666-4666-8666-666666666666'))
    expect(capped.capped).toBe(true)
    expect(capped.favorite).toBe(false)
    expect(capped.list).toHaveLength(MAX_PENDING_FAVORITES)
  })

  it('le mur s’ouvre au 2e spot posé', () => {
    const first = togglePendingFavorite([], favorite(SPOT_A))
    expect(first.list.length >= PENDING_FAVORITES_WALL_AT).toBe(false)
    const second = togglePendingFavorite(first.list, favorite(SPOT_B))
    expect(second.list.length >= PENDING_FAVORITES_WALL_AT).toBe(true)
  })
})

describe('parsePendingCatch', () => {
  const draft: PendingCatch = {
    spot_id: SPOT_A,
    spot_slug: 'pointe-du-raz',
    species: 'bar',
    technique: 'leurres',
    size_cm: 48,
    caught_at: '2026-08-13T18:30:00.000Z',
    released: false,
    privacy: 'public',
  }

  it('relit ce qui a été écrit', () => {
    expect(parsePendingCatch(serializePendingCatch(draft))).toEqual(draft)
  })

  it('renvoie null sur cookie absent ou invalide', () => {
    expect(parsePendingCatch(null)).toBeNull()
    expect(parsePendingCatch('nope')).toBeNull()
    expect(parsePendingCatch(encodeURIComponent('{"species":"bar"}'))).toBeNull()
  })

  it('exige un spot : le brouillon ne transporte JAMAIS de coordonnée', () => {
    const { spot_id: _omit, ...sansSpot } = draft
    expect(parsePendingCatch(encodeURIComponent(JSON.stringify(sansSpot)))).toBeNull()
  })

  it('ignore tout champ hors schéma (texte libre, position, photo)', () => {
    const pollué = {
      ...draft,
      notes: 'j’étais avec Marc, 06 12 34 56 78',
      location_label: 'chez moi',
      latitude: 47.8,
      longitude: -4.3,
      photo_path: 'catches/x.webp',
      is_measured: true,
    }
    const parsed = parsePendingCatch(encodeURIComponent(JSON.stringify(pollué)))
    expect(parsed).toEqual(draft)
    expect(parsed).not.toHaveProperty('notes')
    expect(parsed).not.toHaveProperty('latitude')
    expect(parsed).not.toHaveProperty('longitude')
    expect(parsed).not.toHaveProperty('is_measured')
  })

  it('refuse une espèce ou une technique inconnue', () => {
    expect(
      parsePendingCatch(encodeURIComponent(JSON.stringify({ ...draft, species: 'requin' }))),
    ).toBeNull()
    expect(
      parsePendingCatch(encodeURIComponent(JSON.stringify({ ...draft, technique: 'dynamite' }))),
    ).toBeNull()
  })

  it('refuse une prise datée dans le futur', () => {
    const futur = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString()
    expect(
      parsePendingCatch(encodeURIComponent(JSON.stringify({ ...draft, caught_at: futur }))),
    ).toBeNull()
  })
})

describe('returnPathForSlug', () => {
  it('construit la fiche du spot', () => {
    expect(returnPathForSlug('pointe-du-raz')).toBe('/spots/pointe-du-raz')
  })

  it('refuse tout ce qui n’est pas un slug (anti open-redirect)', () => {
    expect(returnPathForSlug(null)).toBeNull()
    expect(returnPathForSlug('')).toBeNull()
    expect(returnPathForSlug('//evil.com')).toBeNull()
    expect(returnPathForSlug('../../auth/login')).toBeNull()
    expect(returnPathForSlug('Pointe Du Raz')).toBeNull()
  })
})
