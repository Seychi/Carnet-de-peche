import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const { j1Mock, j3Mock, weeklyMock } = vi.hoisted(() => ({
  j1Mock: vi.fn(),
  j3Mock: vi.fn(),
  weeklyMock: vi.fn(),
}))

vi.mock('@/lib/lifecycle/send', () => ({
  sendFirstWindowEmail: j1Mock,
  sendImportNudgeEmail: j3Mock,
  sendWeeklyWindowEmail: weeklyMock,
}))

import { runLifecycleGreffon } from '@/lib/lifecycle/cron'

const WEDNESDAY = new Date('2026-08-05T07:00:00Z') // 09:00 Paris
const FRIDAY = new Date('2026-08-07T07:00:00Z') // 09:00 Paris, semaine 2026-W32
const FAR_FUTURE = Date.now() + 60_000

type TableData = { data?: unknown; error?: unknown }

/**
 * Faux client admin : chaque table renvoie un « chain » thenable dont toutes les
 * méthodes (select/eq/in/order) se renvoient elles-mêmes. Reproduit exactement la
 * façon dont le greffon consomme PostgREST, sans SDK ni réseau.
 */
function makeAdmin(tables: Record<string, TableData>) {
  const touched: string[] = []
  const admin = {
    from(table: string) {
      touched.push(table)
      const res = tables[table] ?? { data: [] }
      const chain: Record<string, unknown> = {}
      const self = () => chain
      chain.select = self
      chain.eq = self
      chain.in = self
      chain.order = self
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: res.data ?? [], error: res.error ?? null }).then(resolve, reject)
      return chain
    },
  }
  return { admin: admin as never, touched }
}

/** `home_department` est un char(3) PADDÉ en base : on teste avec le padding réel. */
const profileJ1 = {
  id: 'u-j1',
  home_department: '29 ',
  onboarded_at: '2026-08-04T10:00:00Z',
  weekly_window_optin: false,
}
const profileJ3 = {
  id: 'u-j3',
  home_department: '56 ',
  onboarded_at: '2026-08-02T10:00:00Z',
  weekly_window_optin: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  j1Mock.mockResolvedValue(true)
  j3Mock.mockResolvedValue(true)
  weeklyMock.mockResolvedValue(true)
})

describe('runLifecycleGreffon — ciblage', () => {
  it('J+1 : envoie, compte, et passe le département TRIMMÉ', async () => {
    const { admin } = makeAdmin({ profiles: { data: [profileJ1] } })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)

    expect(res.j1).toBe(1)
    expect(j1Mock).toHaveBeenCalledTimes(1)
    expect(j1Mock.mock.calls[0][0]).toBe('u-j1')
    expect(j1Mock.mock.calls[0][1]).toBe('29') // pas '29 '
  })

  it('J+3 : envoie le nudge d’import', async () => {
    const { admin } = makeAdmin({ profiles: { data: [profileJ3] } })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(res.j3).toBe(1)
    expect(j3Mock).toHaveBeenCalledWith('u-j3')
  })

  it('GATE HONNÊTETÉ : un compte qui a déjà logué ne reçoit rien', async () => {
    const { admin } = makeAdmin({
      profiles: { data: [profileJ1] },
      catches: { data: [{ user_id: 'u-j1' }] },
    })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(res.j1).toBe(0)
    expect(j1Mock).not.toHaveBeenCalled()
  })

  it('DÉDUP : un kind déjà journalisé ne repart pas', async () => {
    const { admin } = makeAdmin({
      profiles: { data: [profileJ1] },
      lifecycle_emails: {
        data: [{ user_id: 'u-j1', kind: 'j1_window', sent_key: 'once' }],
      },
    })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(res.j1).toBe(0)
    expect(j1Mock).not.toHaveBeenCalled()
  })

  it('transmet le spot favori le plus ancien, nom + slug, jamais de coordonnée', async () => {
    const { admin } = makeAdmin({
      profiles: { data: [profileJ1] },
      favorite_spots: {
        data: [
          { user_id: 'u-j1', spots: { name: 'Jetée de Roscoff', slug: 'jetee-de-roscoff' } },
          { user_id: 'u-j1', spots: { name: 'Le Diben', slug: 'le-diben' } },
        ],
      },
    })
    await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(j1Mock.mock.calls[0][2]).toEqual({
      name: 'Jetée de Roscoff',
      slug: 'jetee-de-roscoff',
    })
  })

  it('accepte l’embed en TABLEAU (forme du typegen) autant qu’en objet', async () => {
    const { admin } = makeAdmin({
      profiles: { data: [profileJ1] },
      favorite_spots: {
        data: [{ user_id: 'u-j1', spots: [{ name: 'Le Diben', slug: 'le-diben' }] }],
      },
    })
    await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(j1Mock.mock.calls[0][2]).toEqual({ name: 'Le Diben', slug: 'le-diben' })
  })
})

describe('runLifecycleGreffon — hebdo', () => {
  const optin = {
    id: 'u-w',
    home_department: '29 ',
    onboarded_at: '2026-06-01T10:00:00Z',
    weekly_window_optin: true,
  }

  it('vendredi : envoie avec la clé de semaine ISO', async () => {
    const { admin } = makeAdmin({ profiles: { data: [optin] } })
    const res = await runLifecycleGreffon(admin, FRIDAY, FAR_FUTURE)
    expect(res.weekly).toBe(1)
    expect(weeklyMock).toHaveBeenCalledWith('u-w', '29', '2026-W32', FRIDAY)
  })

  it('mercredi : aucun hebdo, et on n’interroge même pas le journal', async () => {
    const { admin, touched } = makeAdmin({ profiles: { data: [optin] } })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(res.weekly).toBe(0)
    expect(touched).toEqual(['profiles']) // court-circuit : zéro requête inutile
  })

  it('sans opt-in : rien le vendredi non plus', async () => {
    const { admin } = makeAdmin({
      profiles: { data: [{ ...optin, weekly_window_optin: false }] },
    })
    const res = await runLifecycleGreffon(admin, FRIDAY, FAR_FUTURE)
    expect(res.weekly).toBe(0)
    expect(weeklyMock).not.toHaveBeenCalled()
  })
})

describe('runLifecycleGreffon — résilience', () => {
  it('FAIL-SOFT : un throw sur un utilisateur n’empêche pas les suivants', async () => {
    j1Mock.mockRejectedValueOnce(new Error('Resend 500'))
    const { admin } = makeAdmin({
      profiles: { data: [profileJ1, { ...profileJ1, id: 'u-j1-bis' }] },
    })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)

    expect(j1Mock).toHaveBeenCalledTimes(2)
    expect(res.j1).toBe(1)
    expect(res.failed).toBe(1)
  })

  it('un envoi qui renvoie false est compté en échec, pas en succès', async () => {
    j1Mock.mockResolvedValue(false)
    const { admin } = makeAdmin({ profiles: { data: [profileJ1] } })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(res.j1).toBe(0)
    expect(res.failed).toBe(1)
  })

  it('TIME-BOX : budget déjà consommé → arrêt propre, aucun envoi', async () => {
    const { admin } = makeAdmin({ profiles: { data: [profileJ1] } })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, Date.now() - 1)
    expect(res.timedOut).toBe(true)
    expect(j1Mock).not.toHaveBeenCalled()
  })

  it('erreur DB sur les profils : renvoie zéro, ne throw JAMAIS vers le cron', async () => {
    const { admin } = makeAdmin({ profiles: { error: { message: 'db down' } } })
    await expect(runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)).resolves.toEqual({
      j1: 0,
      j3: 0,
      weekly: 0,
      failed: 0,
      timedOut: false,
    })
  })

  it('aucun profil : court-circuit, aucune autre requête', async () => {
    const { admin, touched } = makeAdmin({ profiles: { data: [] } })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(res.j1 + res.j3 + res.weekly).toBe(0)
    expect(touched).toEqual(['profiles'])
  })

  it('profil sans département : ignoré, aucun envoi', async () => {
    const { admin } = makeAdmin({
      profiles: { data: [{ ...profileJ1, home_department: null }] },
    })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)
    expect(res.j1).toBe(0)
    expect(j1Mock).not.toHaveBeenCalled()
  })
})

describe('runLifecycleGreffon — coût DB', () => {
  it('reste en requêtes GROUPÉES : 4 tables au plus, quel que soit le nombre de cibles', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ ...profileJ1, id: `u-${i}` }))
    const { admin, touched } = makeAdmin({ profiles: { data: many } })
    const res = await runLifecycleGreffon(admin, WEDNESDAY, FAR_FUTURE)

    expect(res.j1).toBe(25)
    // profiles + catches + lifecycle_emails + favorite_spots, une fois chacune.
    expect(touched).toEqual(['profiles', 'catches', 'lifecycle_emails', 'favorite_spots'])
  })
})
