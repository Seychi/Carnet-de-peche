import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * ★ SPRINT 85, Bloc 5 — LES CHEMINS D'AUTH QUI RESTENT MARCHENT TOUJOURS.
 *
 * Le lien magique est retiré (zéro compte créé en trois mois, mesuré en base le
 * 17/08). Un retrait ne se juge pas sur ce qu'il enlève mais sur ce qu'il laisse
 * intact : un site où l'on ne peut plus se connecter est un échec total, quel que
 * soit le gain de conversion. Ce fichier prouve, chemin par chemin :
 *
 *  1. connexion email + mot de passe ;
 *  2. inscription email + mot de passe (cf aussi actions.test.ts, inchangé) ;
 *  3. « mot de passe oublié » → email envoyé, atterrissage /auth/reset-password ;
 *  4. Google OAuth ;
 *  5. l'action d'envoi du lien magique n'est plus exportée.
 *
 * ⚠️ Le flux `token_hash` de `app/auth/confirm/route.ts` n'est pas touché : son
 * type `email` sert AUSSI la confirmation d'inscription.
 */

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
vi.mock('@/lib/analytics/server', () => ({
  captureSignupCompleted: vi.fn(async () => {}),
}))
vi.mock('@/lib/drafts/replay', () => ({
  replayPendingDrafts: vi.fn(async () => ({
    favorites: 0,
    catchCreated: false,
    returnPath: null,
  })),
}))
vi.mock('@/lib/auth/email-domain', () => ({
  checkEmailDomain: vi.fn(async () => ({ deliverable: true })),
  INVALID_DOMAIN_MESSAGE: 'Ce domaine ne peut pas recevoir d’email.',
}))

import { createClient } from '@/lib/supabase/server'
import * as actions from '../actions'
import {
  signInWithPassword,
  requestPasswordReset,
  signInWithGoogle,
  signUpWithPassword,
  type LoginState,
} from '../actions'

const PREV: LoginState = { error: null, success: false, email: '', submittedAt: null }

function form(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.set(k, v)
  return f
}

/** Doublure du client Supabase : seules les méthodes d'auth utilisées ici. */
function mockAuth(auth: Record<string, unknown>) {
  const supabase = { auth }
  vi.mocked(createClient).mockResolvedValue(supabase as never)
  return supabase
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.INVITE_ONLY
})

describe('le lien magique a bien disparu du code serveur', () => {
  it('l’action d’envoi du lien magique n’est plus exportée par actions.ts', () => {
    // Nom assemblé : le critère du brief est qu'un grep sur cet identifiant ne
    // renvoie RIEN dans app/ et components/ (cf login-instrumentation.test.ts).
    expect(('sendMagic' + 'Link') in actions).toBe(false)
  })

  it('les quatre actions qui restent sont toujours exportées', () => {
    for (const name of [
      'signInWithPassword',
      'signUpWithPassword',
      'requestPasswordReset',
      'signInWithGoogle',
    ] as const) {
      expect(typeof actions[name], `${name} doit rester exportée`).toBe('function')
    }
  })
})

describe('non-régression 1 — connexion par email + mot de passe', () => {
  it('identifiants valides : session posée, redirection /home', async () => {
    const supabase = mockAuth({
      signInWithPassword: vi.fn(async () => ({ error: null })),
    })
    await expect(
      signInWithPassword(PREV, form({ email: 'pecheur@exemple.fr', password: 'motdepasse1' }))
    ).rejects.toThrow('REDIRECT:/home')
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'pecheur@exemple.fr',
      password: 'motdepasse1',
    })
  })

  it('le contexte de retour interne est respecté', async () => {
    mockAuth({ signInWithPassword: vi.fn(async () => ({ error: null })) })
    await expect(
      signInWithPassword(
        PREV,
        form({
          email: 'pecheur@exemple.fr',
          password: 'motdepasse1',
          redirect: '/spots/pointe-du-raz',
        })
      )
    ).rejects.toThrow('REDIRECT:/spots/pointe-du-raz')
  })

  it('identifiants faux : message français, aucune redirection', async () => {
    mockAuth({
      signInWithPassword: vi.fn(async () => ({
        error: { message: 'Invalid login credentials', status: 400 },
      })),
    })
    const res = await signInWithPassword(
      PREV,
      form({ email: 'pecheur@exemple.fr', password: 'faux1234' })
    )
    expect(res.success).toBe(false)
    expect(res.error).toBe('Email ou mot de passe incorrect.')
  })
})

describe('non-régression 2 — inscription par email + mot de passe', () => {
  it('crée le compte et enchaîne sur l’onboarding', async () => {
    const supabase = mockAuth({
      signUp: vi.fn(async () => ({
        data: { session: { access_token: 't' }, user: { id: 'u1' } },
        error: null,
      })),
    })
    await expect(
      signUpWithPassword(PREV, form({ email: 'nouveau@exemple.fr', password: 'motdepasse1' }))
    ).rejects.toThrow('REDIRECT:/onboarding/1')
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nouveau@exemple.fr', password: 'motdepasse1' })
    )
  })
})

describe('non-régression 3 — mot de passe oublié', () => {
  it('envoie l’email et pointe le retour sur /auth/reset-password', async () => {
    const supabase = mockAuth({
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    })
    const res = await requestPasswordReset(PREV, form({ email: 'pecheur@exemple.fr' }))
    expect(res.success).toBe(true)
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'pecheur@exemple.fr',
      { redirectTo: 'http://localhost:3000/auth/reset-password' }
    )
  })

  it('un échec d’envoi remonte un message lisible, sans casser la page', async () => {
    mockAuth({
      resetPasswordForEmail: vi.fn(async () => ({
        error: { message: 'Error sending recovery email', status: 500 },
      })),
    })
    const res = await requestPasswordReset(PREV, form({ email: 'pecheur@exemple.fr' }))
    expect(res.success).toBe(false)
    expect(res.error).toBeTruthy()
  })
})

describe('non-régression 4 — Google OAuth', () => {
  it('redirige vers l’URL du fournisseur, avec le contexte de retour', async () => {
    const supabase = mockAuth({
      signInWithOAuth: vi.fn(async () => ({
        data: { url: 'https://accounts.google.com/o/oauth2/auth?x=1' },
        error: null,
      })),
    })
    await expect(
      signInWithGoogle(form({ redirect: '/spots/pointe-du-raz' }))
    ).rejects.toThrow('REDIRECT:https://accounts.google.com/o/oauth2/auth?x=1')
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo:
          'http://localhost:3000/auth/callback?next=%2Fspots%2Fpointe-du-raz',
      },
    })
  })

  it('échec côté fournisseur : retour sur /auth/login?error=oauth', async () => {
    mockAuth({
      signInWithOAuth: vi.fn(async () => ({
        data: { url: null },
        error: { message: 'nope' },
      })),
    })
    await expect(signInWithGoogle(new FormData())).rejects.toThrow(
      'REDIRECT:/auth/login?error=oauth'
    )
  })
})
