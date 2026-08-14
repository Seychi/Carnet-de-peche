import { describe, expect, it, vi, beforeEach } from 'vitest'

// signUpWithPassword (sprint 68) : le code fondateur est OPTIONNEL et
// n'empêche JAMAIS l'inscription ; s'il est fourni et qu'une session existe,
// redeem_comp_code est appelé en tant que nouvel utilisateur avant le redirect.

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map([['host', 'localhost:3000']])),
}))
// lib/analytics/server importe 'server-only' (throw hors runtime React Server) :
// mocké ici, et l'émission de signup_completed est assertée dans les tests.
vi.mock('@/lib/analytics/server', () => ({
  captureSignupCompleted: vi.fn(async () => {}),
}))
// lib/drafts/replay importe 'server-only' (même raison). Le rejeu des brouillons
// d'inscription différée (sprint 77, Bloc 7) est asserté ci-dessous : sans
// brouillon, la destination d'inscription doit rester EXACTEMENT celle d'avant.
vi.mock('@/lib/drafts/replay', () => ({
  replayPendingDrafts: vi.fn(async () => ({
    favorites: 0,
    catchCreated: false,
    returnPath: null,
  })),
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { replayPendingDrafts } from '@/lib/drafts/replay'
import { signUpWithPassword, type LoginState } from '../actions'

const PREV: LoginState = { error: null, success: false, email: '', submittedAt: null }

// Sprint 76, Bloc 3 : le formulaire ne poste plus `password_confirm` (2 champs).
function signupForm(inviteCode?: string) {
  const f = new FormData()
  f.set('email', 'nouveau@exemple.fr')
  f.set('password', 'motdepasse1')
  if (inviteCode !== undefined) f.set('invite_code', inviteCode)
  return f
}

function mockAuthClient({
  session,
  redeem,
}: {
  session: boolean
  redeem?: { data?: unknown; error?: unknown }
}) {
  const supabase = {
    auth: {
      signUp: vi.fn(async () => ({
        data: {
          session: session ? { access_token: 't' } : null,
          user: { id: 'nouveau-user' },
        },
        error: null,
      })),
    },
    rpc: vi.fn(async () => redeem ?? { data: null, error: null }),
  }
  vi.mocked(createClient).mockResolvedValue(supabase as never)
  return supabase
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.INVITE_ONLY
})

describe('signUpWithPassword — code fondateur optionnel', () => {
  it('sans code : inscrit et redirige vers /onboarding/1, aucune RPC', async () => {
    const supabase = mockAuthClient({ session: true })
    await expect(signUpWithPassword(PREV, signupForm())).rejects.toThrow(
      'REDIRECT:/onboarding/1'
    )
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('avec code valide : redeem_comp_code appelé en tant que nouvel utilisateur, redirect ?comp=granted avec le tier réel', async () => {
    const supabase = mockAuthClient({
      session: true,
      redeem: { data: { ok: true, tier: 'local', expires_at: null } },
    })
    await expect(
      signUpWithPassword(PREV, signupForm('FDR-AAAA-BBBB'))
    ).rejects.toThrow('REDIRECT:/onboarding/1?comp=granted&tier=local')
    expect(supabase.rpc).toHaveBeenCalledWith('redeem_comp_code', {
      p_code: 'FDR-AAAA-BBBB',
    })
  })

  it('code Itinérant : le tier porté à la bannière est itinerant', async () => {
    mockAuthClient({
      session: true,
      redeem: { data: { ok: true, tier: 'itinerant', expires_at: null } },
    })
    await expect(
      signUpWithPassword(PREV, signupForm('FDR-AAAA-BBBB'))
    ).rejects.toThrow('REDIRECT:/onboarding/1?comp=granted&tier=itinerant')
  })

  it("avec code invalide : l'inscription RÉUSSIT quand même, redirect ?comp=invalid", async () => {
    mockAuthClient({
      session: true,
      redeem: { data: { ok: false, error: 'invalid' } },
    })
    await expect(
      signUpWithPassword(PREV, signupForm('FAUX-CODE'))
    ).rejects.toThrow('REDIRECT:/onboarding/1?comp=invalid')
  })

  it('code fourni mais pas de session (confirmation email active, INVITE_ONLY off) : pas de RPC, pas de consommation service_role, écran « email envoyé »', async () => {
    const supabase = mockAuthClient({ session: false })
    const res = await signUpWithPassword(PREV, signupForm('FDR-AAAA-BBBB'))
    expect(res.success).toBe(true)
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('INVITE_ONLY=true : exige toujours un code non vide (gate historique intact)', async () => {
    process.env.INVITE_ONLY = 'true'
    const supabase = mockAuthClient({ session: true })
    const res = await signUpWithPassword(PREV, signupForm(''))
    expect(res.success).toBe(false)
    expect(res.error).toContain('code')
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('email invalide : erreur sans appeler signUp', async () => {
    const supabase = mockAuthClient({ session: true })
    const f = signupForm()
    f.set('email', 'pas-un-email')
    const res = await signUpWithPassword(PREV, f)
    expect(res.success).toBe(false)
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })
})

describe('signUpWithPassword — sans champ de confirmation (sprint 76, Bloc 3)', () => {
  it('inscrit sans `password_confirm` dans le FormData', async () => {
    const supabase = mockAuthClient({ session: true })
    const f = signupForm()
    expect(f.get('password_confirm')).toBeNull()
    await expect(signUpWithPassword(PREV, f)).rejects.toThrow('REDIRECT:/onboarding/1')
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nouveau@exemple.fr', password: 'motdepasse1' })
    )
  })

  it('la règle de mot de passe reste appliquée côté SERVEUR (8 car. dont 1 chiffre)', async () => {
    const supabase = mockAuthClient({ session: true })
    for (const bad of ['court1', 'sanschiffre']) {
      const f = signupForm()
      f.set('password', bad)
      const res = await signUpWithPassword(PREV, f)
      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
    }
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('un `password_confirm` résiduel (vieux cache HTML) n’est plus lu et ne bloque plus', async () => {
    // Non-régression : la comparaison serveur a disparu, un champ obsolète
    // envoyé par un formulaire en cache ne doit pas faire échouer l'inscription.
    mockAuthClient({ session: true })
    const f = signupForm()
    f.set('password_confirm', 'autre-chose')
    await expect(signUpWithPassword(PREV, f)).rejects.toThrow('REDIRECT:/onboarding/1')
  })
})

// ─── Inscription différée : rejeu des brouillons (sprint 77, Bloc 7) ──────────
// Ce qui se joue ici : « un brouillon perdu à cette étape est pire que pas de
// brouillon du tout ». Le rejeu passe AVANT l'onboarding, jamais après.

describe('signUpWithPassword — rejeu des brouillons', () => {
  it('sans brouillon : destination inchangée (/onboarding/1)', async () => {
    mockAuthClient({ session: true })
    await expect(signUpWithPassword(PREV, signupForm())).rejects.toThrow(
      'REDIRECT:/onboarding/1'
    )
    expect(replayPendingDrafts).toHaveBeenCalledTimes(1)
  })

  it('avec brouillon : renvoie sur la fiche du spot d’où venait le visiteur', async () => {
    mockAuthClient({ session: true })
    vi.mocked(replayPendingDrafts).mockResolvedValueOnce({
      favorites: 1,
      catchCreated: true,
      returnPath: '/spots/pointe-du-raz',
    })
    await expect(signUpWithPassword(PREV, signupForm())).rejects.toThrow(
      'REDIRECT:/spots/pointe-du-raz'
    )
  })

  it('un rejeu qui échoue ne fait JAMAIS échouer l’inscription', async () => {
    mockAuthClient({ session: true })
    vi.mocked(replayPendingDrafts).mockRejectedValueOnce(new Error('boom'))
    await expect(signUpWithPassword(PREV, signupForm())).rejects.toThrow(
      'REDIRECT:/onboarding/1'
    )
  })

  it('sans session (confirmation email active) : aucun rejeu tenté', async () => {
    mockAuthClient({ session: false })
    const res = await signUpWithPassword(PREV, signupForm())
    expect(res.success).toBe(true)
    expect(replayPendingDrafts).not.toHaveBeenCalled()
  })
})
