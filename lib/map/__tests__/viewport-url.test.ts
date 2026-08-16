import { describe, it, expect } from 'vitest'
import {
  parseViewport,
  formatViewport,
  withViewport,
  VIEWPORT_PARAM,
} from '../viewport-url'

/**
 * Audit du 15/08, P0-3 (seconde moitié) — le cadrage de `/carte` survit à
 * l'aller-retour vers une fiche de spot.
 *
 * Ce que ces tests protègent surtout : une URL bricolée ou tronquée ne doit
 * JAMAIS casser le montage de la carte. Le pire résultat possible ici serait un
 * écran vide, c'est-à-dire exactement le symptôme qu'on corrige.
 */
describe('parseViewport', () => {
  it('lit un cadre bien formé', () => {
    expect(parseViewport('?vp=-4.4863,48.3904,11.2')).toEqual({
      lng: -4.4863,
      lat: 48.3904,
      zoom: 11.2,
    })
  })

  it('lit aussi une chaîne sans point d\'interrogation', () => {
    expect(parseViewport('vp=2.35,48.85,9')).toEqual({ lng: 2.35, lat: 48.85, zoom: 9 })
  })

  it('ignore les autres paramètres autour', () => {
    expect(parseViewport('?dept=29&vp=-4.5,48.4,10&species=bar')).toEqual({
      lng: -4.5,
      lat: 48.4,
      zoom: 10,
    })
  })

  it.each([
    ['absent', '?dept=29'],
    ['vide', ''],
    ['null', null],
    ['undefined', undefined],
    ['deux segments', '?vp=-4.5,48.4'],
    ['quatre segments', '?vp=-4.5,48.4,10,3'],
    ['non numérique', '?vp=a,b,c'],
    ['longitude hors bornes', '?vp=200,48.4,10'],
    ['latitude hors bornes', '?vp=-4.5,91,10'],
    ['zoom hors bornes', '?vp=-4.5,48.4,42'],
    ['zoom négatif', '?vp=-4.5,48.4,-1'],
  ])('renvoie null quand le cadre est %s', (_cas, search) => {
    expect(parseViewport(search)).toBeNull()
  })

  it('★ refuse les segments vides : `?vp=,,` ne doit pas passer pour [0,0] zoom 0', () => {
    // `Number('')` vaut 0 et non NaN : sans garde explicite, une URL tronquée
    // enverrait la carte au large du golfe de Guinée, dézoomée à fond.
    expect(parseViewport('?vp=,,')).toBeNull()
    expect(parseViewport('?vp=-4.5,,10')).toBeNull()
  })
})

describe('formatViewport', () => {
  it('arrondit à 4 décimales (≈ 11 m, largement assez pour un cadrage)', () => {
    expect(formatViewport({ lng: -4.48631234, lat: 48.39041234, zoom: 11.23456 })).toBe(
      '-4.4863,48.3904,11.23',
    )
  })

  it('fait un aller-retour stable avec parseViewport', () => {
    const v = { lng: -4.4863, lat: 48.3904, zoom: 11.2 }
    expect(parseViewport(`?${VIEWPORT_PARAM}=${formatViewport(v)}`)).toEqual(v)
  })
})

describe('withViewport', () => {
  it('ajoute le cadre sans toucher aux filtres existants', () => {
    const out = withViewport('dept=29&species=bar', { lng: -4.5, lat: 48.4, zoom: 10 })
    const params = new URLSearchParams(out)
    expect(params.get('dept')).toBe('29')
    expect(params.get('species')).toBe('bar')
    expect(params.get(VIEWPORT_PARAM)).toBe('-4.5000,48.4000,10.00')
  })

  it('remplace un cadre déjà présent au lieu d\'en empiler un second', () => {
    const out = withViewport('vp=1,2,3', { lng: -4.5, lat: 48.4, zoom: 10 })
    expect(out.match(/vp=/g)).toHaveLength(1)
  })
})
