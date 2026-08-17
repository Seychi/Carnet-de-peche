import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * ★ SPRINT 85, Bloc 3 — L'INSTRUMENTATION DU FORMULAIRE NE PORTE AUCUNE DONNÉE
 * PERSONNELLE.
 *
 * On pose la mesure là où le tunnel se perd (`/auth/register` convertit à 14,6 %)
 * — et le formulaire d'auth est précisément l'écran où transitent une adresse
 * email, un mot de passe et un code fondateur. « On fera attention » n'est pas un
 * garde-fou : ce test lit les APPELS RÉELS dans la source et refuse toute
 * propriété hors d'une liste blanche. Le jour où quelqu'un ajoute
 * `{ email }` dans un event pour « debugger », il casse ici.
 *
 * L'environnement Vitest de ce dépôt est `node` : pas de DOM, donc pas de
 * simulation de focus. Le RENDU est couvert par `login-form.test.tsx` ; ici on
 * verrouille le contrat des appels.
 */

const CLIENT = readFileSync(
  path.resolve(__dirname, '..', 'login-client.tsx'),
  'utf8'
)
const ACTIONS = readFileSync(path.resolve(__dirname, '..', 'actions.ts'), 'utf8')
const ANALYTICS = readFileSync(
  path.resolve(process.cwd(), 'lib/analytics.ts'),
  'utf8'
)

/** Source hors commentaires : le POURQUOI d'un retrait cite forcément ce qu'il retire. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const CLIENT_CODE = stripComments(CLIENT)
const ACTIONS_CODE = stripComments(ACTIONS)

/** Les cinq events du bloc, tels que le brief les nomme. */
const EVENTS = [
  'signup_form_viewed',
  'signup_field_focused',
  'signup_submit_attempted',
  'signup_error_shown',
  'signup_oauth_clicked',
] as const

/** Seules propriétés autorisées sur ces events. Rien d'autre ne passe. */
const ALLOWED_PROPS = new Set([
  'tab',
  'field',
  'has_draft',
  'client_valid',
  'error_type',
  'provider',
])

/** Extrait les littéraux d'objet passés à `analytics.signupXxx({...})`. */
function signupEventArgs(src: string): string[] {
  return [...src.matchAll(/analytics\.signup[A-Za-z]+\(\s*\{([^}]*)\}/g)].map(
    (m) => m[1]
  )
}

/** Clés d'un littéral d'objet à plat (`a: x, b` → ['a','b']). */
function keysOf(body: string): string[] {
  return body
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.includes(':') ? part.slice(0, part.indexOf(':')) : part))
    .map((k) => k.trim())
}

// ─── Bloc 5 : le lien magique n'a plus aucune trace ──────────────────────────

// Les identifiants retirés sont assemblés en deux morceaux, à dessein : le
// critère du brief est qu'un grep de ces noms sur `app/` et `components/`
// renvoie VIDE. Un test qui les écrirait en toutes lettres serait lui-même le
// seul résultat du grep, et rendrait le critère invérifiable.
const REMOVED_IDENTIFIERS = [
  'sendMagic' + 'Link',
  'MagicLink' + 'Button',
  'magic' + 'State',
  'magic' + 'Action',
  'magic' + 'Errors',
  'signInWith' + 'Otp',
]

describe('lien magique — retiré du code (sprint 85, Bloc 5)', () => {
  it('le client ne référence plus aucun des identifiants du chemin retiré', () => {
    for (const token of REMOVED_IDENTIFIERS) {
      expect(CLIENT_CODE, `${token} ne doit plus exister`).not.toContain(token)
    }
  })

  it('l’action serveur d’envoi et l’appel OTP ont disparu de actions.ts', () => {
    for (const token of REMOVED_IDENTIFIERS) {
      expect(ACTIONS_CODE, `${token} ne doit plus exister`).not.toContain(token)
    }
  })

  it('le type SentReason ne garde que signup et reset', () => {
    expect(CLIENT).toContain('type SentReason = "signup" | "reset"')
  })

  it('le template email, lui, est CONSERVÉ (type=email sert la confirmation d’inscription)', () => {
    // ⚠️ Ne pas « nettoyer » ce fichier ni désactiver le magic link côté
    // Dashboard : `app/auth/confirm/route.ts` s'appuie sur le même type.
    const tpl = readFileSync(
      path.resolve(process.cwd(), 'supabase/email-templates/magic-link.html'),
      'utf8'
    )
    expect(tpl.length).toBeGreaterThan(0)
    const readme = readFileSync(
      path.resolve(process.cwd(), 'supabase/email-templates/README.md'),
      'utf8'
    )
    expect(readme).toContain('sprint 85')
    expect(readme).toContain('CONSERVÉ')
  })
})

// ─── Bloc 3 : les events, et ce qu'ils ne portent pas ────────────────────────

describe('events du formulaire d’auth — présence', () => {
  it('les cinq events sont déclarés dans lib/analytics.ts', () => {
    for (const e of EVENTS) {
      expect(ANALYTICS, `${e} doit être déclaré`).toContain(`'${e}'`)
    }
  })

  it('le client émet la vue, le focus, la tentative, l’erreur et le clic OAuth', () => {
    for (const call of [
      'analytics.signupFormViewed',
      'analytics.signupFieldFocused',
      'analytics.signupSubmitAttempted',
      'analytics.signupErrorShown',
      'analytics.signupOauthClicked',
    ]) {
      expect(CLIENT_CODE, `${call} doit être appelé`).toContain(call)
    }
  })

  it('les deux onglets sont instrumentés (signin ET signup)', () => {
    expect(CLIENT_CODE).toContain('trackSubmit("signin")')
    expect(CLIENT_CODE).toContain('trackSubmit("signup")')
    expect(CLIENT_CODE).toContain('trackFocus("signin", "email")')
    expect(CLIENT_CODE).toContain('trackFocus("signup", "email")')
  })
})

describe('★ events du formulaire d’auth — aucune donnée personnelle', () => {
  it('chaque appel ne porte que des propriétés de la liste blanche', () => {
    const args = signupEventArgs(CLIENT_CODE)
    expect(args.length, 'aucun appel trouvé : le test ne prouverait rien').toBeGreaterThan(
      4
    )
    for (const body of args) {
      for (const key of keysOf(body)) {
        expect(
          ALLOWED_PROPS.has(key),
          `propriété interdite « ${key} » dans analytics.signup*({ ${body} })`
        ).toBe(true)
      }
    }
  })

  it('aucun appel ne lit une valeur de champ (.value, FormData, état de saisie)', () => {
    for (const body of signupEventArgs(CLIENT_CODE)) {
      for (const forbidden of ['.value', 'FormData', 'formData', 'Prefill', 'state.email']) {
        expect(
          body,
          `« ${forbidden} » n'a rien à faire dans un event : ${body}`
        ).not.toContain(forbidden)
      }
    }
  })

  it('le message d’erreur serveur est CLASSÉ, jamais transmis tel quel', () => {
    // La régression exacte qu'on redoute : `error_type: signinState.error`.
    expect(CLIENT_CODE).toContain('classifyAuthError(signinState.error)')
    expect(CLIENT_CODE).toContain('classifyAuthError(signupState.error)')
    expect(CLIENT_CODE).not.toMatch(/error_type:\s*\w+State\.error/)
  })

  it('les propriétés sont typées par des unions fermées, pas par string', () => {
    expect(ANALYTICS).toContain("export type AuthFormTab = 'signin' | 'signup'")
    expect(ANALYTICS).toContain(
      "export type AuthFormField = 'email' | 'password' | 'invite_code'"
    )
    expect(ANALYTICS).toContain('field: AuthFormField')
    expect(ANALYTICS).toContain('error_type: AuthErrorType')
    // Un `field: string` rouvrirait la porte à n'importe quelle valeur.
    expect(ANALYTICS).not.toMatch(/field\??:\s*string/)
  })

  it('le nom de champ passe par l’allowlist asAuthFormField', () => {
    expect(CLIENT_CODE).toContain('asAuthFormField(firstInvalidField)')
  })

  it('gateSubmit ne fait sortir que le VERDICT et le nom du champ fautif', () => {
    // `data` (les valeurs saisies) ne doit être utilisé que pour le safeParse.
    const gate = CLIENT.slice(
      CLIENT.indexOf('function gateSubmit'),
      CLIENT.indexOf('function gateBlur')
    )
    expect(gate).toContain('onResult?.(false, Object.keys(errors)[0])')
    expect(gate).toContain('onResult?.(true)')
    expect(gate).not.toMatch(/onResult\?\.\([^)]*data/)
  })
})
