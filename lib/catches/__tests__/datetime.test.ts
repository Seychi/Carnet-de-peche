import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// BUG-16 : une prise loguée 06:46 (heure Paris) s'affichait 04:46 sur la fiche
// détail car le Server Component (runtime UTC sur Vercel) formatait sans timeZone.
describe('heure de prise — formatage tz-safe (BUG-16)', () => {
  const iso = '2026-06-21T04:46:00.000Z' // = 06:46 à Paris (été, UTC+2)

  it('affiche 06:46 avec timeZone Europe/Paris (idempotent quel que soit le runtime)', () => {
    const f = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    })
    expect(f.format(new Date(iso))).toBe('06:46')
  })

  it('la fiche détail force timeZone Europe/Paris (deux appels date + heure)', () => {
    const src = readFileSync(join(process.cwd(), 'app/(app)/carnet/[id]/page.tsx'), 'utf8')
    expect((src.match(/timeZone: 'Europe\/Paris'/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})

// BUG-18 : autofill navigateur désactivé + brouillon expiré au-delà du TTL.
describe('formulaire nouvelle prise — anti valeurs périmées (BUG-18)', () => {
  const src = readFileSync(join(process.cwd(), 'components/catches/CatchForm.tsx'), 'utf8')

  it('désactive l’autofill navigateur sur le <form>', () => {
    expect(src).toMatch(/autoComplete="off"/)
  })

  it('expire le brouillon localStorage après un TTL (savedAt)', () => {
    expect(src).toContain('DRAFT_TTL_MS')
    expect(src).toMatch(/savedAt/)
  })
})
