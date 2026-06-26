import { describe, it, expect } from 'vitest'
import {
  isSeabedLayer,
  isFranceBbox,
  buildGetMapUrl,
  resolveSeabedTileUrl,
  EMODNET,
} from '../seabed-tiles'

// Tuiles d'exemple en Web Mercator (EPSG:3857), au format {bbox-epsg-3857} = minx,miny,maxx,maxy.
const BREST = '-510000,6170000,-500000,6180000' // Finistère
const MARSEILLE = '590000,5330000,600000,5340000' // Méditerranée
const MID_ATLANTIC = '-3000000,6000000,-2990000,6010000' // plein large = hors emprise FR

describe('isSeabedLayer (whitelist anti open-proxy)', () => {
  it('accepte uniquement depth et substrate', () => {
    expect(isSeabedLayer('depth')).toBe(true)
    expect(isSeabedLayer('substrate')).toBe(true)
  })
  it('refuse tout le reste', () => {
    expect(isSeabedLayer('osm')).toBe(false)
    expect(isSeabedLayer('')).toBe(false)
    expect(isSeabedLayer(null)).toBe(false)
  })
})

describe('isFranceBbox (validation emprise FR)', () => {
  it('accepte une tuile sur le littoral FR (Atlantique + Méditerranée)', () => {
    expect(isFranceBbox(BREST)).toBe(true)
    expect(isFranceBbox(MARSEILLE)).toBe(true)
  })
  it('refuse une tuile entièrement hors zone (plein Atlantique)', () => {
    expect(isFranceBbox(MID_ATLANTIC)).toBe(false)
  })
  it('refuse une bbox malformée', () => {
    expect(isFranceBbox('1,2,3')).toBe(false)
    expect(isFranceBbox('a,b,c,d')).toBe(false)
    expect(isFranceBbox('')).toBe(false)
  })
  it('refuse une bbox inversée (min >= max)', () => {
    expect(isFranceBbox('600000,5340000,590000,5330000')).toBe(false)
  })
})

describe('buildGetMapUrl (WMS 1.3.0)', () => {
  it('profondeur → endpoint + layer EMODnet bathymetry, params 1.3.0', () => {
    const u = new URL(buildGetMapUrl('depth', BREST, 512))
    expect(`${u.origin}${u.pathname}`).toBe('https://ows.emodnet-bathymetry.eu/wms')
    expect(u.searchParams.get('version')).toBe('1.3.0')
    expect(u.searchParams.get('request')).toBe('GetMap')
    expect(u.searchParams.get('crs')).toBe('EPSG:3857') // CRS (pas SRS) en 1.3.0
    expect(u.searchParams.get('layers')).toBe('emodnet:mean')
    expect(u.searchParams.get('width')).toBe('512')
    expect(u.searchParams.get('height')).toBe('512')
    expect(u.searchParams.get('bbox')).toBe(BREST)
    expect(u.searchParams.get('format')).toBe('image/png')
  })
  it('substrat → endpoint + layer Seabed Habitats', () => {
    const u = new URL(buildGetMapUrl('substrate', BREST, 256))
    expect(`${u.origin}${u.pathname}`).toBe(EMODNET.substrate.base)
    expect(u.searchParams.get('layers')).toBe('eusm2025_subs_full')
    expect(u.searchParams.get('width')).toBe('256')
  })
})

describe('resolveSeabedTileUrl (whitelist + validation combinées)', () => {
  it('entrée valide → URL EMODnet du bon endpoint', () => {
    expect(resolveSeabedTileUrl('depth', BREST, 512)).toContain('ows.emodnet-bathymetry.eu')
    expect(resolveSeabedTileUrl('substrate', BREST, 512)).toContain('ows.emodnet-seabedhabitats.eu')
  })
  it('layer hors whitelist → null (pas d’open proxy)', () => {
    expect(resolveSeabedTileUrl('evil', BREST, 512)).toBeNull()
    expect(resolveSeabedTileUrl(null, BREST, 512)).toBeNull()
  })
  it('bbox hors zone / malformée → null', () => {
    expect(resolveSeabedTileUrl('depth', MID_ATLANTIC, 512)).toBeNull()
    expect(resolveSeabedTileUrl('depth', 'pas-une-bbox', 512)).toBeNull()
  })
})
