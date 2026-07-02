import { describe, expect, it } from 'vitest'
import { SPOTS_CURATED_FLOOR, SPOTS_CURATED_LABEL } from '../stats'

// Contrat partagé (sprint 70, Bloc A) : la copy statique « spots curés » de la home,
// des tarifs et de la carte pointe sur ces constantes. Plancher honnête (215 curés
// en DB au 2026-07-02) qui ne se périme pas à chaque lot de curation.
describe('lib/marketing/stats — chiffres marketing partagés', () => {
  it('expose le plancher stable de spots curés', () => {
    expect(SPOTS_CURATED_FLOOR).toBe(200)
    expect(SPOTS_CURATED_LABEL).toBe('200+ spots curés')
  })

  it('garde le libellé cohérent avec le plancher (pas de dérive copy/chiffre)', () => {
    expect(SPOTS_CURATED_LABEL.startsWith(`${SPOTS_CURATED_FLOOR}+`)).toBe(true)
  })

  it('reste honnête : le plancher ne dépasse pas le compte réel vérifié (215 au 2026-07-02)', () => {
    expect(SPOTS_CURATED_FLOOR).toBeLessThanOrEqual(215)
  })
})
