import { describe, expect, it } from 'vitest'
import {
  SPOTS_PUBLISHED_FLOOR,
  SPOTS_PUBLISHED_LABEL,
  SPOTS_COUNTER_LABEL,
} from '../stats'

// Contrat partagé : la copy statique de la home, des tarifs et de la carte pointe
// sur ces constantes.
//
// ⚠️ Sprint 79, Bloc 6 (décision John du 15/08) : 607 spots publiés en base, dont
// 416 seulement relus par un humain. Le mot « vérifiés » n'est donc plus tenable
// sur le total, et il sort de la copy de vitrine. C'est CE test qui garde la
// promesse alignée sur la base.
describe('lib/marketing/stats — chiffres marketing partagés', () => {
  it('expose le plancher stable de spots publiés', () => {
    expect(SPOTS_PUBLISHED_FLOOR).toBe(600)
    expect(SPOTS_PUBLISHED_LABEL).toBe('600+ spots de pêche')
  })

  it('garde le libellé cohérent avec le plancher (pas de dérive copy/chiffre)', () => {
    expect(SPOTS_PUBLISHED_LABEL.startsWith(`${SPOTS_PUBLISHED_FLOOR}+`)).toBe(true)
  })

  it('reste honnête : le plancher ne dépasse pas le compte réel publié (607 au 15/08)', () => {
    expect(SPOTS_PUBLISHED_FLOOR).toBeLessThanOrEqual(607)
  })

  it('ne promet ni « curé » ni « vérifié » : 191 des 607 n\'ont eu aucune relecture', () => {
    for (const label of [SPOTS_PUBLISHED_LABEL, SPOTS_COUNTER_LABEL]) {
      expect(label).not.toMatch(/cur[ée]/i)
      expect(label).not.toMatch(/vérifi/i)
    }
  })
})
