import { describe, it, expect } from 'vitest'
import { buildSpotJsonLd, BASE_URL } from '@/lib/seo/spot-jsonld'
import { spotCtaLabel } from '@/components/spots/SpotSignupCta'

const PENVINS = {
  name: 'Pointe de Penvins',
  slug: 'pointe-de-penvins',
  description: 'Pointe rocheuse exposée, bonne pour le bar au fouet.',
  lat: 47.5123456,
  lng: -2.7456789,
  region: 'Bretagne',
  deptKey: '56',
  deptLabel: 'Morbihan',
}

describe('buildSpotJsonLd — Place + BreadcrumbList (sprint 76, Bloc 4)', () => {
  const graph = buildSpotJsonLd(PENVINS)

  it('émet exactement deux nœuds', () => {
    expect(graph).toHaveLength(2)
    expect(graph[0]['@type']).toBe('Place')
    expect(graph[1]['@type']).toBe('BreadcrumbList')
  })

  it('le Place est inchangé : coordonnées arrondies à 2 décimales', () => {
    expect(graph[0]).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: 'Pointe de Penvins',
      description: 'Pointe rocheuse exposée, bonne pour le bar au fouet.',
      geo: { '@type': 'GeoCoordinates', latitude: 47.51, longitude: -2.75 },
      address: { '@type': 'PostalAddress', addressRegion: 'Bretagne', addressCountry: 'FR' },
    })
  })

  it('n’expose AUCUNE coordonnée plus précise que 2 décimales (anti-fuite GPS)', () => {
    const serialized = JSON.stringify(graph)
    // 47.5123456 / -2.7456789 ne doivent apparaître nulle part.
    expect(serialized).not.toContain('47.5123')
    expect(serialized).not.toContain('2.7456')
    expect(serialized).toContain('47.51')
  })

  it('le fil d’Ariane a 4 niveaux, positions contiguës de 1 à 4', () => {
    const items = graph[1].itemListElement as { position: number; name: string }[]
    expect(items).toHaveLength(4)
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4])
    expect(items.map((i) => i.name)).toEqual([
      'Accueil',
      'Spots',
      'Morbihan',
      'Pointe de Penvins',
    ])
  })

  it('toutes les URLs sont absolues sur le domaine canonique', () => {
    const items = graph[1].itemListElement as { item: string }[]
    for (const i of items) {
      expect(i.item.startsWith(`${BASE_URL}`)).toBe(true)
      expect(i.item).not.toMatch(/^\//)
    }
    expect(items[2].item).toBe(`${BASE_URL}/spots?dept=56`)
    expect(items[3].item).toBe(`${BASE_URL}/spots/pointe-de-penvins`)
  })

  it('une description absente ne produit pas la clé (pas de "null" dans le markup)', () => {
    const g = buildSpotJsonLd({ ...PENVINS, description: null })
    expect(g[0]).not.toHaveProperty('description', null)
    expect(JSON.stringify(g)).not.toContain('"description":null')
  })
})

// ⚠️ Sprint 80, Bloc 6 : le libellé ne dit plus « Voir les conditions ». Elles
// sont déjà sur la page, gratuitement, et le Bloc 1 vient de les remonter dans le
// premier écran : promettre d'aller les voir en échange d'une inscription était
// devenu faux. Ces tests verrouillent la nouvelle promesse et la coupe de nom.
describe('spotCtaLabel — CTA collant mobile (sprint 76, Bloc 2 ; libellé S80)', () => {
  it('parle du spot, pas du carnet', () => {
    expect(spotCtaLabel('Pointe de Penvins')).toBe(
      "Suis Pointe de Penvins, c'est gratuit",
    )
  })

  it('ne promet plus un contenu déjà donné gratuitement sur la page', () => {
    expect(spotCtaLabel('Pointe de Penvins')).not.toMatch(/voir les conditions/i)
  })

  it('réduit le nom à la commune avant de mesurer', () => {
    expect(spotCtaLabel('Sausset-les-Pins — digues du port')).toBe(
      "Suis Sausset-les-Pins, c'est gratuit",
    )
  })

  it('ne coupe jamais au milieu d’un mot', () => {
    const label = spotCtaLabel('Plage de la Grande Conche de Royan')
    expect(label.startsWith('Suis ')).toBe(true)
    expect(label.endsWith(", c'est gratuit")).toBe(true)
    const name = label.slice('Suis '.length, -", c'est gratuit".length)
    expect(name.length).toBeLessThanOrEqual(22)
    // La coupe tombe sur une frontière de mot du nom d'origine.
    expect('Plage de la Grande Conche de Royan'.startsWith(name)).toBe(true)
    expect(name).not.toMatch(/[\s,'’-]$/)
  })

  it('aucun tiret cadratin dans le libellé (CLAUDE.md §6)', () => {
    for (const n of ['Antibes — digue du Port Vauban', 'Le Grau-du-Roi — plage']) {
      expect(spotCtaLabel(n)).not.toContain('—')
    }
  })
})
