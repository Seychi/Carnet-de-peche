import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Sprint 81, Bloc 1 — le contrat du comptage sans cookie.
 *
 * Ce bloc touche à la CONFORMITÉ, pas au confort. Ce que ce test verrouille :
 *  1. le drapeau ne s'allume que sur une valeur explicite (absent ⇒ comportement
 *     d'avant le sprint, à l'identique) ;
 *  2. le mode retenu est `'on_reject'` et pas `'always'` — `'always'` couperait
 *     les cookies même pour qui a accepté, et on perdrait le funnel identifié ;
 *  3. `person_profiles: 'identified_only'` reste en place : un visiteur anonyme
 *     ne doit JAMAIS produire de profil personne, drapeau allumé ou éteint ;
 *  4. `opt_out_capturing_by_default` n'est pas retiré. Le consentement ne recule
 *     pas, c'est son PÉRIMÈTRE qui change.
 */

const PROVIDER = readFileSync(
  path.resolve(__dirname, '..', 'PostHogProvider.tsx'),
  'utf8',
)

const ORIGINAL = process.env.NEXT_PUBLIC_ANALYTICS_COOKIELESS

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_COOKIELESS
  else process.env.NEXT_PUBLIC_ANALYTICS_COOKIELESS = ORIGINAL
})

describe('drapeau NEXT_PUBLIC_ANALYTICS_COOKIELESS', () => {
  // Le module lit `process.env` à l'appel, pas à l'import : on peut donc le
  // recharger proprement entre deux valeurs.
  async function cookielessEnabledWith(value: string | undefined) {
    if (value === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_COOKIELESS
    else process.env.NEXT_PUBLIC_ANALYTICS_COOKIELESS = value
    const mod = await import('../PostHogProvider')
    return mod.cookielessEnabled()
  }

  it('est ÉTEINT quand la variable est absente (comportement d\'avant le sprint)', async () => {
    expect(await cookielessEnabledWith(undefined)).toBe(false)
  })

  it('est ÉTEINT sur "0" et sur toute valeur non explicite', async () => {
    expect(await cookielessEnabledWith('0')).toBe(false)
    expect(await cookielessEnabledWith('')).toBe(false)
    expect(await cookielessEnabledWith('oui')).toBe(false)
  })

  it('ne s\'allume que sur "1" ou "true"', async () => {
    expect(await cookielessEnabledWith('1')).toBe(true)
    expect(await cookielessEnabledWith('true')).toBe(true)
  })
})

describe('garde-fous de conformité du provider', () => {
  it('utilise le mode « on_reject », jamais « always »', () => {
    expect(PROVIDER).toContain("cookieless_mode: 'on_reject'")
    expect(PROVIDER).not.toContain("cookieless_mode: 'always'")
  })

  it('le mode sans cookie est CONDITIONNÉ au drapeau, pas posé en dur', () => {
    expect(PROVIDER).toMatch(/cookielessEnabled\(\)\s*\?\s*\{\s*cookieless_mode/)
  })

  it('ne crée jamais de profil pour un anonyme', () => {
    expect(PROVIDER).toContain("person_profiles: 'identified_only'")
  })

  it('ne retire pas l\'opt-out par défaut : le consentement ne recule pas', () => {
    expect(PROVIDER).toContain('opt_out_capturing_by_default: true')
  })

  it('garde le session replay et l\'autocapture coupés', () => {
    expect(PROVIDER).toContain('disable_session_recording: true')
    expect(PROVIDER).toContain('autocapture: false')
  })
})
