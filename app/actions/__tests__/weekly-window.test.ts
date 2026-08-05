import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
// lib/analytics/server importe 'server-only' (throw hors runtime React Server) :
// mocké ici, l'émission de weekly_optin_changed est assertée dans les tests.
vi.mock('@/lib/analytics/server', () => ({
  captureServerEvent: vi.fn(async () => {}),
}))

import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/analytics/server'
import { setWeeklyWindowOptin } from '../weekly-window'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }

function mock(opts: Parameters<typeof makeSupabase>[0]) {
  const sb = makeSupabase(opts)
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(sb)
  return sb
}

beforeEach(() => vi.clearAllMocks())

// Sprint 74 Bloc 2 : email hebdo "ton créneau du week-end", gratuit tous tiers,
// distinct des alertes par port payantes (migration 106 / lib/alerts).
describe('setWeeklyWindowOptin', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    const r = await setWeeklyWindowOptin(true)
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Connecte-toi') })
    expect(captureServerEvent).not.toHaveBeenCalled()
  })

  it('active la préférence et écrit la colonne profiles.weekly_window_optin', async () => {
    const sb = mock({
      user: USER,
      tables: { profiles: { data: null, error: null } },
    })
    const r = await setWeeklyWindowOptin(true)
    expect(r).toEqual({ ok: true, data: { enabled: true } })

    const builder = sb.from.mock.results[0]?.value
    expect(sb.from).toHaveBeenCalledWith('profiles')
    expect(builder.update).toHaveBeenCalledWith({ weekly_window_optin: true })
    expect(builder.eq).toHaveBeenCalledWith('id', USER.id)
  })

  it('désactive la préférence (opt-out toujours libre)', async () => {
    mock({
      user: USER,
      tables: { profiles: { data: null, error: null } },
    })
    const r = await setWeeklyWindowOptin(false)
    expect(r).toEqual({ ok: true, data: { enabled: false } })
  })

  it('remonte un échec DB en message FR honnête, sans détail technique', async () => {
    mock({
      user: USER,
      tables: { profiles: { data: null, error: { message: 'connection reset', code: '08006' } } },
    })
    const r = await setWeeklyWindowOptin(true)
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Réessaie') })
    // Un échec d'écriture n'émet pas l'event (rien à mesurer, l'état n'a pas changé).
    expect(captureServerEvent).not.toHaveBeenCalled()
  })

  it('émet weekly_optin_changed avec le user_id et le nouvel état, jamais bloquant', async () => {
    mock({
      user: USER,
      tables: { profiles: { data: null, error: null } },
    })
    await setWeeklyWindowOptin(true)
    expect(captureServerEvent).toHaveBeenCalledWith(USER.id, 'weekly_optin_changed', {
      enabled: true,
    })
  })
})
