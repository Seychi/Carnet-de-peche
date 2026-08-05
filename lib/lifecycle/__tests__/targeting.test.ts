import { describe, it, expect } from 'vitest'
import { selectLifecycleTargets, type LifecycleProfile } from '@/lib/lifecycle/targeting'
import { journalRowKey, ONCE_SENT_KEY } from '@/lib/lifecycle/kinds'

// Mercredi 5 août 2026, 09:00 Paris (heure réelle du cron 07:00 UTC).
const WEDNESDAY = new Date('2026-08-05T07:00:00Z')
// Vendredi 7 août 2026, 09:00 Paris.
const FRIDAY = new Date('2026-08-07T07:00:00Z')

function profile(over: Partial<LifecycleProfile> & { id: string }): LifecycleProfile {
  return {
    onboardedAt: '2026-08-04T10:00:00Z', // J+1 par rapport au mercredi
    dept: '29',
    weeklyWindowOptin: false,
    ...over,
  }
}

describe('selectLifecycleTargets — J+1 et J+3', () => {
  it('cible J+1 un compte onboardé la veille et sans prise', () => {
    const t = selectLifecycleTargets([profile({ id: 'u1' })], new Set(), new Set(), WEDNESDAY)
    expect(t.j1).toEqual(['u1'])
    expect(t.j3).toEqual([])
  })

  it('cible J+3 un compte onboardé il y a exactement 3 jours', () => {
    const p = profile({ id: 'u1', onboardedAt: '2026-08-02T10:00:00Z' })
    const t = selectLifecycleTargets([p], new Set(), new Set(), WEDNESDAY)
    expect(t.j3).toEqual(['u1'])
    expect(t.j1).toEqual([])
  })

  it('un compte à J+2 ne reçoit RIEN (pas de fenêtre glissante)', () => {
    const p = profile({ id: 'u1', onboardedAt: '2026-08-03T10:00:00Z' })
    const t = selectLifecycleTargets([p], new Set(), new Set(), WEDNESDAY)
    expect(t.j1).toEqual([])
    expect(t.j3).toEqual([])
  })

  it('GATE HONNÊTETÉ : un compte qui a déjà logué ne reçoit ni J+1 ni J+3', () => {
    const j1 = profile({ id: 'u1' })
    const j3 = profile({ id: 'u2', onboardedAt: '2026-08-02T10:00:00Z' })
    const t = selectLifecycleTargets([j1, j3], new Set(['u1', 'u2']), new Set(), WEDNESDAY)
    expect(t.j1).toEqual([])
    expect(t.j3).toEqual([])
  })

  it('DÉDUP : un J+1 déjà journalisé ne repart pas au run suivant', () => {
    const sent = new Set([journalRowKey('u1', 'j1_window', ONCE_SENT_KEY)])
    const t = selectLifecycleTargets([profile({ id: 'u1' })], new Set(), sent, WEDNESDAY)
    expect(t.j1).toEqual([])
  })

  it('la dédup est par kind : un J+1 envoyé ne bloque pas le J+3 deux jours plus tard', () => {
    const p = profile({ id: 'u1', onboardedAt: '2026-08-02T10:00:00Z' })
    const sent = new Set([journalRowKey('u1', 'j1_window', ONCE_SENT_KEY)])
    const t = selectLifecycleTargets([p], new Set(), sent, WEDNESDAY)
    expect(t.j3).toEqual(['u1'])
  })

  it('profil sans département ou sans date d’onboarding : ignoré partout', () => {
    const noDept = profile({ id: 'u1', dept: null })
    const noDate = profile({ id: 'u2', onboardedAt: null })
    const badDate = profile({ id: 'u3', onboardedAt: 'pas-une-date' })
    const t = selectLifecycleTargets(
      [noDept, noDate, badDate],
      new Set(),
      new Set(),
      WEDNESDAY,
    )
    expect(t.j1).toEqual([])
    expect(t.j3).toEqual([])
    expect(t.weekly).toEqual([])
  })
})

describe('selectLifecycleTargets — hebdo du vendredi', () => {
  it('n’envoie rien un mercredi, même avec l’opt-in', () => {
    const p = profile({ id: 'u1', weeklyWindowOptin: true })
    expect(selectLifecycleTargets([p], new Set(), new Set(), WEDNESDAY).weekly).toEqual([])
  })

  it('envoie le vendredi aux opt-in', () => {
    const p = profile({ id: 'u1', weeklyWindowOptin: true })
    expect(selectLifecycleTargets([p], new Set(), new Set(), FRIDAY).weekly).toEqual(['u1'])
  })

  it('OPT-IN STRICT : sans la case cochée, aucun hebdo', () => {
    const p = profile({ id: 'u1', weeklyWindowOptin: false })
    expect(selectLifecycleTargets([p], new Set(), new Set(), FRIDAY).weekly).toEqual([])
  })

  it('l’hebdo ne dépend PAS d’avoir logué (il s’adresse aussi aux pêcheurs actifs)', () => {
    const p = profile({ id: 'u1', weeklyWindowOptin: true })
    const t = selectLifecycleTargets([p], new Set(['u1']), new Set(), FRIDAY)
    expect(t.weekly).toEqual(['u1'])
  })

  it('DÉDUP par semaine ISO : déjà envoyé cette semaine → rien ; semaine suivante → reparti', () => {
    const p = profile({ id: 'u1', weeklyWindowOptin: true })
    const sentThisWeek = new Set([journalRowKey('u1', 'weekly_window', '2026-W32')])

    expect(selectLifecycleTargets([p], new Set(), sentThisWeek, FRIDAY).weekly).toEqual([])

    const nextFriday = new Date('2026-08-14T07:00:00Z') // 2026-W33
    expect(selectLifecycleTargets([p], new Set(), sentThisWeek, nextFriday).weekly).toEqual([
      'u1',
    ])
  })
})

describe('selectLifecycleTargets — combinaisons', () => {
  it('un vendredi, un même utilisateur peut être ciblé J+1 ET hebdo', () => {
    const p = profile({
      id: 'u1',
      onboardedAt: '2026-08-06T10:00:00Z', // veille du vendredi
      weeklyWindowOptin: true,
    })
    const t = selectLifecycleTargets([p], new Set(), new Set(), FRIDAY)
    expect(t.j1).toEqual(['u1'])
    expect(t.weekly).toEqual(['u1'])
  })

  it('trie plusieurs profils dans les bons seaux sans se mélanger', () => {
    const profiles = [
      profile({ id: 'j1' }),
      profile({ id: 'j3', onboardedAt: '2026-08-02T10:00:00Z' }),
      profile({ id: 'rien', onboardedAt: '2026-07-01T10:00:00Z' }),
      profile({ id: 'loggeur' }),
    ]
    const t = selectLifecycleTargets(profiles, new Set(['loggeur']), new Set(), WEDNESDAY)
    expect(t.j1).toEqual(['j1'])
    expect(t.j3).toEqual(['j3'])
    expect(t.weekly).toEqual([])
  })
})
