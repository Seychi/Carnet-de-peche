import { describe, it, expect, vi } from 'vitest'

// Le formulaire d'auth tire Base UI + lucide : la première transformation à froid
// dépasse les 5 s par défaut de Vitest (même symptôme que la fiche spot au sprint 84).
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 })

import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// `tsconfig.json` est en `jsx: preserve` : esbuild compile le JSX vers
// `React.createElement` sans importer React. Hors bundler Next, on fournit le global.
;(globalThis as unknown as { React: typeof React }).React = React

/**
 * ★ SPRINT 85, Blocs 5 et 3 — CE QUE REND VRAIMENT LE FORMULAIRE D'AUTH.
 *
 * On ne teste pas ici une intention écrite dans un commentaire : on rend le
 * composant et on lit le HTML produit. Deux choses s'y jouent, et les deux sont
 * des régressions coûteuses si elles cassent.
 *
 * Bloc 5 — le lien magique est retiré. Mesure du 17/08 sur les 52 comptes :
 * 34 par email + mot de passe, 18 via Google, ZÉRO par lien magique seul en trois
 * mois. Il ne doit rester que deux chemins, Google au-dessus.
 * ★ Un site où l'on ne peut plus se connecter est un échec total, quel que soit
 * le gain de conversion : les chemins restants sont donc assertés ici, pas
 * seulement l'absence de celui qui part.
 *
 * Bloc 3 — le champ « Code fondateur » reste replié hors beta (il signale
 * « c'est fermé » à un visiteur venu de Google), et reste visible ET requis
 * quand `INVITE_ONLY` est vrai. Les deux cas sont testés.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/auth/register',
}))

// Les Server Actions ne sont pas exécutables hors runtime Next : on les remplace
// par des doublures inertes. Ce test porte sur le RENDU, pas sur les actions
// (couvertes par actions.test.ts et auth-paths.test.ts).
vi.mock('../actions', () => ({
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
}))

// posthog-js n'a rien à faire dans un rendu serveur de test.
vi.mock('@/lib/analytics', () => ({
  analytics: {
    signupFormViewed: vi.fn(),
    signupFieldFocused: vi.fn(),
    signupSubmitAttempted: vi.fn(),
    signupErrorShown: vi.fn(),
    signupOauthClicked: vi.fn(),
  },
  asAuthFormField: (n?: string | null) =>
    n === 'email' || n === 'password' || n === 'invite_code' ? n : undefined,
}))

import { LoginPageClient } from '../login-client'

type Props = React.ComponentProps<typeof LoginPageClient>

function render(props: Props): string {
  return renderToStaticMarkup(React.createElement(LoginPageClient, props))
}

/** Le tag `<input>` portant ce `name`, tel qu'il sort dans le HTML. */
function inputTag(html: string, name: string): string | null {
  const m = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))
  return m ? m[0] : null
}

describe('formulaire d’auth — le lien magique est retiré (sprint 85, Bloc 5)', () => {
  for (const tab of ['signin', 'signup'] as const) {
    it(`onglet ${tab} : aucune trace du chemin lien magique`, () => {
      const html = render({ inviteOnly: false, initialTab: tab })
      expect(html).not.toContain('lien de connexion')
      expect(html).not.toContain('Sans mot de passe')
      expect(html).not.toContain('magic-email')
      expect(inputTag(html, 'email')).not.toContain('id="magic-email"')
    })

    it(`onglet ${tab} : Google reste présent, au-dessus du formulaire`, () => {
      const html = render({ inviteOnly: false, initialTab: tab })
      expect(html).toContain('Continuer avec Google')
      // « au-dessus » se vérifie sur l'ordre du document, pas sur une intention.
      expect(html.indexOf('Continuer avec Google')).toBeLessThan(
        html.indexOf('name="password"')
      )
    })

    it(`onglet ${tab} : le chemin email + mot de passe est intact`, () => {
      const html = render({ inviteOnly: false, initialTab: tab })
      expect(inputTag(html, 'email')).toBeTruthy()
      expect(inputTag(html, 'password')).toBeTruthy()
    })

    it(`onglet ${tab} : exactement DEUX formulaires (Google, puis email + mot de passe)`, () => {
      const html = render({ inviteOnly: false, initialTab: tab })
      expect((html.match(/<form/g) ?? []).length).toBe(2)
    })
  }

  it('« Mot de passe oublié ? » reste accessible depuis la connexion', () => {
    const html = render({ inviteOnly: false, initialTab: 'signin' })
    expect(html).toContain('Mot de passe oublié')
  })
})

describe('code fondateur — replié hors beta, requis en beta (Bloc 3)', () => {
  it('inviteOnly = false : le champ n’est PAS dans le DOM au chargement', () => {
    const html = render({ inviteOnly: false, initialTab: 'signup' })
    expect(inputTag(html, 'invite_code')).toBeNull()
    // …mais le chemin existe, en lien discret.
    expect(html).toContain('un code fondateur')
  })

  it('inviteOnly = true : le champ est visible ET requis', () => {
    const html = render({ inviteOnly: true, initialTab: 'signup' })
    const tag = inputTag(html, 'invite_code')
    expect(tag).toBeTruthy()
    expect(tag).toContain('required')
    expect(html).toContain('Code fondateur')
    expect(html).not.toContain('Code fondateur (optionnel)')
  })

  it('inviteOnly = true : Google reste masqué (gate sprint 54, inchangé)', () => {
    // L'OAuth ne peut pas porter de code d'invitation : le laisser ouvrirait la
    // beta. Ce n'est pas une régression du sprint 85, c'est l'invariant existant.
    const html = render({ inviteOnly: true, initialTab: 'signup' })
    expect(html).not.toContain('Continuer avec Google')
  })
})

describe('rappel de brouillon (draftSummary, sprint 78 Bloc 1)', () => {
  const SUMMARY = 'Ta prise de bar à Pointe de Penvins t’attend. 30 secondes.'

  it('s’affiche sur l’onglet inscription quand un brouillon attend', () => {
    const html = render({
      inviteOnly: false,
      initialTab: 'signup',
      draftSummary: SUMMARY,
    })
    expect(html).toContain('Ta prise de bar à Pointe de Penvins')
    expect(html).not.toContain('Logue ta première prise')
  })

  it('sans brouillon : la copie générique reste', () => {
    const html = render({ inviteOnly: false, initialTab: 'signup' })
    expect(html).toContain('Logue ta première prise')
  })

  it('brouillon illisible (null) : la page rend quand même', () => {
    // `readDraftSummary` ne throw jamais et retombe sur null : le formulaire ne
    // doit pas dépendre de ce qui est, au fond, un ornement.
    const html = render({
      inviteOnly: false,
      initialTab: 'signup',
      draftSummary: null,
    })
    expect(html).toContain('Créer mon carnet')
  })
})
