import { describe, it, expect } from 'vitest'
import {
  getSpeciesStatus,
  getSpeciesStatuses,
  getSpeciesQuotas,
  mailleRows,
  windowEndLabel,
} from '@/lib/especes/answer'

// Le statut du jour affiché en tête de fiche espèce (sprint 75) est CALCULÉ à
// partir de lib/regulation/data.ts. Ces tests verrouillent le calcul : aucune
// date, aucun libellé de fermeture n'est écrit en dur dans l'UI.

const MA = 'manche-atlantique' as const
const MED = 'mediterranee' as const

describe('windowEndLabel', () => {
  it('rend le dernier jour de la plage contiguë', () => {
    // Fenêtre bar : février-mars, consultée le 10 février.
    expect(windowEndLabel([2, 3], new Date('2026-02-10T12:00:00Z'))).toBe('31 mars')
    // Fenêtre lieu jaune : janvier-avril, consultée le 5 janvier.
    expect(windowEndLabel([1, 2, 3, 4], new Date('2026-01-05T12:00:00Z'))).toBe('30 avril')
  })

  it('gère le 29 février des années bissextiles', () => {
    expect(windowEndLabel([2], new Date('2028-02-03T12:00:00Z'))).toBe('29 février')
    expect(windowEndLabel([2], new Date('2026-02-03T12:00:00Z'))).toBe('28 février')
  })

  it('gère le passage d’année', () => {
    expect(windowEndLabel([12, 1], new Date('2026-12-20T12:00:00Z'))).toBe('31 janvier')
  })

  it('renvoie null hors fenêtre', () => {
    expect(windowEndLabel([2, 3], new Date('2026-08-07T12:00:00Z'))).toBeNull()
  })
})

describe('getSpeciesStatus', () => {
  it('bar en février : pêcher-relâcher daté, avec la zone du 48e parallèle', () => {
    const s = getSpeciesStatus('bar', MA, new Date('2026-02-10T12:00:00Z'))
    expect(s.kind).toBe('no-take')
    expect(s.label).toBe('Pêcher-relâcher obligatoire jusqu’au 31 mars')
    expect(s.zone).toContain('48e parallèle')
    expect(s.upcoming).toBe(false)
  })

  it('bar en août : ouvert, la fenêtre hivernale reste annoncée', () => {
    const s = getSpeciesStatus('bar', MA, new Date('2026-08-07T12:00:00Z'))
    expect(s.kind).toBe('open')
    expect(s.upcoming).toBe(true)
    expect(s.note).toContain('pêcher-relâcher')
  })

  it('bar en Méditerranée : aucune fenêtre, aucun « à venir »', () => {
    const s = getSpeciesStatus('bar', MED, new Date('2026-02-10T12:00:00Z'))
    expect(s.kind).toBe('open')
    expect(s.upcoming).toBe(false)
    expect(s.note).toBeNull()
  })

  it('lieu jaune en mars : fermeture totale datée', () => {
    const s = getSpeciesStatus('lieu-jaune', MA, new Date('2026-03-15T12:00:00Z'))
    expect(s.kind).toBe('closed')
    expect(s.label).toBe('Pêche fermée jusqu’au 30 avril')
    expect(s.zone).toBeNull()
  })

  it('espèce sans fenêtre connue : ouvert, sans note inventée', () => {
    const s = getSpeciesStatus('sar', MED, new Date('2026-03-15T12:00:00Z'))
    expect(s).toMatchObject({ kind: 'open', upcoming: false, note: null, zone: null })
  })

  it('rend un statut par façade présente', () => {
    expect(getSpeciesStatuses('bar', [MA, MED], new Date('2026-02-10T12:00:00Z'))).toHaveLength(2)
  })
})

describe('getSpeciesQuotas', () => {
  it('remonte les deux zones de quota du bar sans doublon', () => {
    const q = getSpeciesQuotas('bar', [MA, MED])
    expect(q.map((r) => r.perDay)).toEqual([3, 2])
  })

  it('renvoie une liste vide quand aucun quota n’est chiffré', () => {
    expect(getSpeciesQuotas('sar', [MA, MED])).toEqual([])
  })
})

describe('mailleRows', () => {
  it('regroupe les façades qui partagent la même maille', () => {
    expect(mailleRows({ [MA]: 60, [MED]: 60 }, [MA, MED])).toEqual([
      { facades: [MA, MED], minSizeCm: 60 },
    ])
  })

  it('sépare les façades quand la maille diffère', () => {
    expect(mailleRows({ [MA]: 42, [MED]: 30 }, [MA, MED])).toEqual([
      { facades: [MA], minSizeCm: 42 },
      { facades: [MED], minSizeCm: 30 },
    ])
  })

  it('ne renvoie que les façades demandées et garde null tel quel', () => {
    expect(mailleRows({ [MA]: 30, [MED]: null }, [MED])).toEqual([
      { facades: [MED], minSizeCm: null },
    ])
  })
})
