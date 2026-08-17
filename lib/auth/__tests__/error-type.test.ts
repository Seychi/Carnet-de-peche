import { describe, it, expect } from 'vitest'
import {
  AUTH_ERROR_TYPES,
  classifyAuthError,
  type AuthErrorType,
} from '@/lib/auth/error-type'

/**
 * Sprint 85, Bloc 3 — l'entonnoir qui empêche un message d'erreur de partir en
 * analytics. Deux propriétés comptent, dans cet ordre :
 *
 *  1. ★ SÉCURITÉ : quelle que soit l'entrée, la sortie appartient à une liste
 *     fermée. Aucune sous-chaîne de l'entrée ne peut ressortir — c'est ce qui
 *     garantit qu'une adresse email glissée un jour dans un message ne finira
 *     pas dans une propriété d'événement.
 *  2. Utilité : les messages RÉELS de `app/auth/login/actions.ts` tombent dans
 *     la bonne case, sinon la mesure ne sert à rien.
 */

const TYPES = new Set<string>(AUTH_ERROR_TYPES)

describe('★ classifyAuthError — aucune donnée d’entrée ne ressort', () => {
  const HOSTILE = [
    "Un compte existe déjà avec cet email : jean.dupont@exemple.fr. Connecte-toi.",
    'Mot de passe refusé : « Tr0ub4dor&3 »',
    'Code fondateur FDR-1234-5678 déjà utilisé',
    'n’importe quoi',
    '',
    null,
    undefined,
  ]

  for (const input of HOSTILE) {
    it(`« ${String(input).slice(0, 40)} » → un type de la liste fermée, rien d’autre`, () => {
      const out: AuthErrorType = classifyAuthError(input)
      expect(TYPES.has(out)).toBe(true)
      // La sortie ne peut contenir ni arobase, ni chiffre, ni espace : elle est
      // structurellement incapable de transporter une saisie.
      expect(out).toMatch(/^[a-z_]+$/)
    })
  }

  it('une adresse email dans le message ne se retrouve jamais dans la sortie', () => {
    const out = classifyAuthError(
      'Un compte existe déjà avec cet email : jean.dupont@exemple.fr'
    )
    expect(out).toBe('already_registered')
    expect(out).not.toContain('@')
    expect(out).not.toContain('jean')
  })
})

describe('classifyAuthError — les messages réels tombent dans la bonne case', () => {
  const CASES: Array<[string, AuthErrorType]> = [
    ['Email ou mot de passe incorrect.', 'invalid_credentials'],
    [
      'Confirme ton email avant de te connecter. Vérifie ta boîte de réception.',
      'email_not_confirmed',
    ],
    ['Un compte existe déjà avec cet email. Connecte-toi.', 'already_registered'],
    ['Adresse email invalide.', 'invalid_email'],
    [
      'Ce domaine ne peut pas recevoir d’email. Vérifie l’adresse, il y a peut-être une faute de frappe.',
      'undeliverable_domain',
    ],
    ['Minimum 8 caractères.', 'password_rule'],
    ['Doit contenir au moins 1 chiffre.', 'password_rule'],
    [
      'Un code d’invitation est requis pour rejoindre la beta fondateurs.',
      'invite_code_required',
    ],
    ['Trop de tentatives, réessaie dans quelques minutes.', 'rate_limited'],
    [
      "Impossible d'envoyer l'email. Vérifie l'adresse ou réessaie plus tard.",
      'email_send_failed',
    ],
    ["L'inscription est temporairement désactivée.", 'signup_disabled'],
    [
      'Une erreur est survenue. Réessaie dans quelques instants.',
      'server_error',
    ],
  ]

  for (const [message, expected] of CASES) {
    it(`« ${message.slice(0, 45)}… » → ${expected}`, () => {
      expect(classifyAuthError(message)).toBe(expected)
    })
  }
})
