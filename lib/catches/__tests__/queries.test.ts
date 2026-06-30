import { describe, it, expect, vi, beforeEach } from 'vitest'

// Sprint 52 WS-D : getCatchById valide l'uuid en amont. Un id malformé ne doit
// PAS atteindre PostgREST (22P02 → throw → 500) : il se comporte comme « introuvable »
// (les call-sites font notFound() sur null → 404 propre).

const maybeSingleMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
    }),
  })),
}))

import { createClient } from '@/lib/supabase/server'
import { getCatchById } from '../queries'

beforeEach(() => {
  vi.clearAllMocks()
  maybeSingleMock.mockResolvedValue({ data: null, error: null })
})

describe('getCatchById — validation uuid (WS-D)', () => {
  it('renvoie null pour un id non-uuid sans toucher la base', async () => {
    const r = await getCatchById('pas-un-uuid')
    expect(r).toBeNull()
    // Court-circuit avant tout accès DB : createClient n'est jamais appelé.
    expect(createClient).not.toHaveBeenCalled()
  })

  it('interroge la base pour un uuid valide (et renvoie null si introuvable)', async () => {
    const r = await getCatchById('aaaaaaaa-0000-4000-8000-000000000001')
    expect(r).toBeNull()
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)
  })
})
