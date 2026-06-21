import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Garde-fous BUG-12 (GAIN 1) : le clic « Continuer » ne bloque plus l'UI
// (useTransition), précharge l'étape suivante, et un skeleton couvre la nav RSC.
const STEP = 'app/(app)/onboarding/[step]/onboarding-step.tsx'
const step = readFileSync(join(process.cwd(), STEP), 'utf8')

describe('onboarding — INP du bouton Continuer (BUG-12)', () => {
  it('utilise useTransition + startTransition autour de router.push', () => {
    expect(step).toMatch(/useTransition/)
    expect(step).toMatch(/startTransition\(\(\) => router\.push/)
  })

  it('ne référence plus setLoading (état dérivé saving || isPending)', () => {
    expect(step).not.toMatch(/setLoading/)
    expect(step).toMatch(/const loading = saving \|\| isPending/)
  })

  it('précharge le payload RSC de l’étape suivante', () => {
    expect(step).toMatch(/router\.prefetch/)
  })

  it('un skeleton loading.tsx couvre les routes /onboarding', () => {
    expect(existsSync(join(process.cwd(), 'app/(app)/onboarding/loading.tsx'))).toBe(true)
  })
})
