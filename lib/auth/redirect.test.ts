import { describe, it, expect } from 'vitest'
import { safeInternalPath, buildLoginRedirect } from '@/lib/auth/redirect'

describe('safeInternalPath — anti open-redirect', () => {
  it('conserve un chemin interne simple', () => {
    expect(safeInternalPath('/fil/29')).toBe('/fil/29')
    expect(safeInternalPath('/follows')).toBe('/follows')
  })

  it('conserve un chemin interne avec query', () => {
    expect(safeInternalPath('/tarifs?plan=local')).toBe('/tarifs?plan=local')
  })

  it('rejette les redirections protocol-relative (//host)', () => {
    expect(safeInternalPath('//evil.com')).toBe('/home')
  })

  it('rejette les URL absolues externes', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/home')
    expect(safeInternalPath('http://evil.com')).toBe('/home')
  })

  it('rejette les chemins avec backslash (contournement navigateur)', () => {
    expect(safeInternalPath('/\\evil.com')).toBe('/home')
  })

  it('rejette les schémas javascript:', () => {
    expect(safeInternalPath('javascript:alert(1)')).toBe('/home')
  })

  it('retombe sur le fallback pour vide / null / undefined', () => {
    expect(safeInternalPath('')).toBe('/home')
    expect(safeInternalPath(null)).toBe('/home')
    expect(safeInternalPath(undefined)).toBe('/home')
  })

  it('respecte un fallback personnalisé', () => {
    expect(safeInternalPath(null, '/tarifs')).toBe('/tarifs')
    expect(safeInternalPath('//evil.com', '/tarifs')).toBe('/tarifs')
  })

  it('rejette un chemin déraisonnablement long (> 512)', () => {
    expect(safeInternalPath('/' + 'a'.repeat(600))).toBe('/home')
  })
})

describe('buildLoginRedirect — encodage unique', () => {
  it('encode la cible une seule fois', () => {
    expect(buildLoginRedirect('/fil/29')).toBe('/auth/login?redirect=%2Ffil%2F29')
  })
})
