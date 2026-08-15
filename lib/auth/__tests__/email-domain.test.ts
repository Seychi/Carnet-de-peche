import { describe, it, expect, vi, beforeEach } from 'vitest'

// `server-only` n'est pas résoluble hors bundler Next : même contournement que
// les autres tests de modules serveur du projet.
vi.mock('server-only', () => ({}))

const resolveMx = vi.fn()
vi.mock('node:dns/promises', () => ({ resolveMx: (d: string) => resolveMx(d) }))

const { checkEmailDomain, domainOf } = await import('@/lib/auth/email-domain')

beforeEach(() => {
  resolveMx.mockReset()
})

describe('domainOf', () => {
  it('extrait le domaine, en minuscules', () => {
    expect(domainOf('Jean.Dupont@Exemple.FR')).toBe('exemple.fr')
  })

  it('renvoie null sur une forme qui n’est pas une adresse', () => {
    for (const bad of ['sans-arobase', '@exemple.fr', 'jean@', 'jean@local', 'jean@ex emple.fr']) {
      expect(domainOf(bad)).toBeNull()
    }
  })

  it('prend le DERNIER @ (une adresse peut en contenir plusieurs)', () => {
    expect(domainOf('a@b@exemple.fr')).toBe('exemple.fr')
  })
})

describe('checkEmailDomain — filet grossier, jamais un mur', () => {
  it('laisse passer les fournisseurs courants SANS aucune requête DNS', async () => {
    for (const email of ['a@gmail.com', 'b@orange.fr', 'c@hotmail.fr', 'd@icloud.com']) {
      await expect(checkEmailDomain(email)).resolves.toEqual({ deliverable: true })
    }
    // Le point du test : zéro appel réseau sur le chemin critique de l'inscription.
    expect(resolveMx).not.toHaveBeenCalled()
  })

  it('refuse un domaine inexistant — le cas réel mesuré en prod (gmmm.com)', async () => {
    const err = Object.assign(new Error('queryMx ENOTFOUND'), { code: 'ENOTFOUND' })
    resolveMx.mockRejectedValue(err)
    await expect(checkEmailDomain('test1234@gmmm.com')).resolves.toEqual({
      deliverable: false,
      reason: 'no_mx',
    })
  })

  it('refuse un domaine sans MX du tout', async () => {
    resolveMx.mockResolvedValue([])
    await expect(checkEmailDomain('x@pas-de-courrier.fr')).resolves.toEqual({
      deliverable: false,
      reason: 'no_mx',
    })
  })

  it('refuse un « null MX » RFC 7505 (le domaine déclare ne pas recevoir)', async () => {
    resolveMx.mockResolvedValue([{ exchange: '.', priority: 0 }])
    await expect(checkEmailDomain('x@refuse.fr')).resolves.toEqual({
      deliverable: false,
      reason: 'no_mx',
    })
  })

  it('accepte un domaine avec MX', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx1.exemple.fr', priority: 10 }])
    await expect(checkEmailDomain('x@exemple.fr')).resolves.toEqual({ deliverable: true })
  })

  // ── LE point du module : on ne refuse JAMAIS un vrai pêcheur pour un DNS qui tousse.
  it('ÉCHOUE OUVERT sur toute panne DNS qui n’est pas un domaine absent', async () => {
    for (const code of ['SERVFAIL', 'ETIMEOUT', 'ECONNREFUSED', undefined]) {
      resolveMx.mockRejectedValue(Object.assign(new Error('dns'), { code }))
      await expect(checkEmailDomain('x@exemple.fr')).resolves.toEqual({ deliverable: true })
    }
  })

  it('ÉCHOUE OUVERT quand la résolution dépasse le délai', async () => {
    vi.useFakeTimers()
    resolveMx.mockImplementation(() => new Promise(() => {})) // ne répond jamais
    const p = checkEmailDomain('x@lent.fr')
    await vi.advanceTimersByTimeAsync(2500)
    await expect(p).resolves.toEqual({ deliverable: true })
    vi.useRealTimers()
  })

  it('laisse passer une adresse malformée : ce n’est pas son rôle de la juger', async () => {
    // zod a déjà validé la forme en amont ; ce module ne doit pas doublonner.
    await expect(checkEmailDomain('pas-une-adresse')).resolves.toEqual({ deliverable: true })
    expect(resolveMx).not.toHaveBeenCalled()
  })
})
