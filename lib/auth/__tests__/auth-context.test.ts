import { describe, it, expect } from 'vitest'
import { normalizeAuthContext } from '@/lib/auth/auth-context'

// Sprint 76, Bloc 3 — /auth/register est devenue une VRAIE page (plus de
// redirect() vers /auth/login?tab=register). Le risque de cette bascule était de
// reperdre le correctif BUG-10 : le plan choisi sur /tarifs et la cible de retour
// doivent survivre jusqu'à `signUpWithPassword`. Ces tests verrouillent ça.

describe('normalizeAuthContext — contexte d’abonnement (BUG-10)', () => {
  it('transporte plan, interval et next ensemble', () => {
    expect(
      normalizeAuthContext({ plan: 'local', interval: 'annual', next: '/tarifs' }),
    ).toEqual({ plan: 'local', interval: 'annual', redirect: '/tarifs' })
  })

  it('accepte les deux plans payants et les deux intervalles', () => {
    expect(normalizeAuthContext({ plan: 'itinerant' }).plan).toBe('itinerant')
    expect(normalizeAuthContext({ interval: 'monthly' }).interval).toBe('monthly')
  })

  it('ignore un plan ou un interval inconnu (jamais de valeur inventée)', () => {
    expect(normalizeAuthContext({ plan: 'gratuit', interval: 'hebdo' })).toEqual({})
    expect(normalizeAuthContext({ plan: 'discovery' }).plan).toBeUndefined()
  })

  it('lit la cible de retour en `redirect` comme en `next`', () => {
    expect(normalizeAuthContext({ redirect: '/spots/pointe-de-penvins' }).redirect).toBe(
      '/spots/pointe-de-penvins',
    )
    expect(normalizeAuthContext({ next: '/carte?species=bar' }).redirect).toBe(
      '/carte?species=bar',
    )
  })

  it('`redirect` prime sur `next` quand les deux sont présents', () => {
    expect(normalizeAuthContext({ redirect: '/carnet', next: '/tarifs' }).redirect).toBe(
      '/carnet',
    )
  })

  it('refuse les cibles externes (anti open-redirect)', () => {
    for (const evil of ['https://evil.example/x', '//evil.example', 'javascript:alert(1)']) {
      expect(normalizeAuthContext({ next: evil }).redirect).toBe('/tarifs')
    }
  })

  it('sans query → contexte vide (pas de clé parasite dans les hidden inputs)', () => {
    expect(normalizeAuthContext({})).toEqual({})
  })

  it('tolère les paramètres répétés (?plan=local&plan=x) en prenant le premier', () => {
    expect(normalizeAuthContext({ plan: ['local', 'itinerant'] }).plan).toBe('local')
  })
})
