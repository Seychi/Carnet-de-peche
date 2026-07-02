import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { updateAlertSettings } from '../alert-settings'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }

function mock(opts: Parameters<typeof makeSupabase>[0]) {
  const sb = makeSupabase(opts)
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(sb)
  return sb
}

beforeEach(() => vi.clearAllMocks())

// Sprint 72 Bloc 3 : réglages d'alertes (opt-in default OFF). L'ACTIVATION est
// gatée serveur au tier Local/Itinérant (current_tier), pas seulement en UI.
describe('updateAlertSettings — auth & validation zod', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    const r = await updateAlertSettings({ alertsEnabled: true })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Connecte-toi') })
  })

  it('refuse un seuil sous 50', async () => {
    mock({ user: USER })
    const r = await updateAlertSettings({ threshold: 49 })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('minimum est 50') })
  })

  it('refuse un seuil au-dessus de 90', async () => {
    mock({ user: USER })
    const r = await updateAlertSettings({ threshold: 91 })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('maximum est 90') })
  })

  it('refuse un seuil non entier', async () => {
    mock({ user: USER })
    const r = await updateAlertSettings({ threshold: 70.5 })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('entier') })
  })
})

describe('updateAlertSettings — gating de tier (activation)', () => {
  it('refuse l’activation à un compte Découverte, même opté-in côté UI', async () => {
    const sb = mock({
      user: USER,
      rpc: { current_tier: { data: 'discovery', error: null } },
    })
    const r = await updateAlertSettings({ alertsEnabled: true })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Local et Itinérant') })
    expect(sb.rpc).toHaveBeenCalledWith('current_tier', { uid: USER.id })
    // Aucune écriture n'a eu lieu.
    expect(sb.from).not.toHaveBeenCalled()
  })

  it('accepte l’activation pour un abonné Local', async () => {
    mock({
      user: USER,
      rpc: { current_tier: { data: 'local', error: null } },
      tables: {
        alert_settings: [
          { data: null, error: null }, // lecture (pas encore de ligne)
          { data: null, error: null }, // upsert OK
        ],
      },
    })
    const r = await updateAlertSettings({ alertsEnabled: true })
    expect(r).toEqual({ ok: true, data: undefined })
  })

  it('accepte l’activation pour un abonné Itinérant', async () => {
    mock({
      user: USER,
      rpc: { current_tier: { data: 'itinerant', error: null } },
      tables: {
        alert_settings: [
          { data: null, error: null },
          { data: null, error: null },
        ],
      },
    })
    const r = await updateAlertSettings({ alertsEnabled: true })
    expect(r).toEqual({ ok: true, data: undefined })
  })

  it('laisse un Découverte COUPER ses alertes (opt-out toujours libre, RGPD)', async () => {
    const sb = mock({
      user: USER,
      tables: {
        alert_settings: [
          { data: { alerts_enabled: true, channel_push: true, channel_email: true, alert_threshold: 70 }, error: null },
          { data: null, error: null },
        ],
      },
    })
    const r = await updateAlertSettings({ alertsEnabled: false })
    expect(r).toEqual({ ok: true, data: undefined })
    // Pas d'appel de tier pour un opt-out.
    expect(sb.rpc).not.toHaveBeenCalled()
  })
})

describe('updateAlertSettings — merge partiel', () => {
  it('ne réécrit pas les réglages non fournis (merge avec l’existant)', async () => {
    const sb = mock({
      user: USER,
      tables: {
        alert_settings: [
          {
            data: {
              alerts_enabled: true,
              channel_push: false,
              channel_email: true,
              alert_threshold: 80,
            },
            error: null,
          },
          { data: null, error: null },
        ],
      },
    })
    const r = await updateAlertSettings({ channelEmail: false })
    expect(r).toEqual({ ok: true, data: undefined })

    // from('alert_settings') est appelé 2× : lecture puis upsert. On vérifie la
    // ligne upsertée : les valeurs existantes sont préservées, seul channel_email bouge.
    const upsertBuilder = sb.from.mock.results[1]?.value
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      {
        user_id: USER.id,
        alerts_enabled: true,
        channel_push: false,
        channel_email: false,
        alert_threshold: 80,
      },
      { onConflict: 'user_id' },
    )
  })

  it('applique les défauts (opt-in OFF, seuil 70) quand aucune ligne n’existe', async () => {
    const sb = mock({
      user: USER,
      tables: {
        alert_settings: [
          { data: null, error: null },
          { data: null, error: null },
        ],
      },
    })
    const r = await updateAlertSettings({ threshold: 85 })
    expect(r).toEqual({ ok: true, data: undefined })

    const upsertBuilder = sb.from.mock.results[1]?.value
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      {
        user_id: USER.id,
        alerts_enabled: false,
        channel_push: true,
        channel_email: true,
        alert_threshold: 85,
      },
      { onConflict: 'user_id' },
    )
  })
})
