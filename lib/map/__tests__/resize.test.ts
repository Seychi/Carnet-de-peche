import { describe, it, expect, vi } from 'vitest'
import { hasNonZeroSize, resizeIfSized, scheduleReliableResize } from '@/lib/map/resize'

describe('hasNonZeroSize', () => {
  it('false pour null / undefined', () => {
    expect(hasNonZeroSize(null)).toBe(false)
    expect(hasNonZeroSize(undefined)).toBe(false)
  })
  it('false si une dimension est nulle', () => {
    expect(hasNonZeroSize({ clientWidth: 0, clientHeight: 400 })).toBe(false)
    expect(hasNonZeroSize({ clientWidth: 400, clientHeight: 0 })).toBe(false)
  })
  it('true si les deux dimensions > 0', () => {
    expect(hasNonZeroSize({ clientWidth: 400, clientHeight: 300 })).toBe(true)
  })
})

describe('resizeIfSized', () => {
  it('ne resize pas si la carte est absente', () => {
    expect(resizeIfSized(null, { clientWidth: 400, clientHeight: 300 })).toBe(false)
  })
  it('ne resize pas si le conteneur a une taille nulle', () => {
    const map = { resize: vi.fn() }
    expect(resizeIfSized(map, { clientWidth: 0, clientHeight: 0 })).toBe(false)
    expect(map.resize).not.toHaveBeenCalled()
  })
  it('resize une fois si carte + conteneur dimensionné', () => {
    const map = { resize: vi.fn() }
    expect(resizeIfSized(map, { clientWidth: 400, clientHeight: 300 })).toBe(true)
    expect(map.resize).toHaveBeenCalledTimes(1)
  })
})

describe('scheduleReliableResize', () => {
  it('retente sur les frames jusqu’à ce que la taille soit résolue, puis annule proprement', () => {
    const map = { resize: vi.fn() }
    // Conteneur 0 px au mount, puis dimensionné dès la 1re frame.
    let size = { clientWidth: 0, clientHeight: 0 }
    const getContainer = () => size

    // raf synchrone qui exécute immédiatement et renvoie un id incrémental.
    let id = 0
    const scheduled: Array<() => void> = []
    const raf = (cb: () => void) => {
      scheduled.push(cb)
      return ++id
    }
    const cancel = vi.fn()

    const dispose = scheduleReliableResize(map, getContainer, raf, cancel)
    // Appel immédiat : conteneur encore 0 → pas de resize.
    expect(map.resize).not.toHaveBeenCalled()

    // 1re frame : la taille est maintenant résolue.
    size = { clientWidth: 400, clientHeight: 300 }
    scheduled[0]()
    expect(map.resize).toHaveBeenCalledTimes(1)

    // 2e frame programmée par la 1re : resize de confirmation.
    scheduled[1]()
    expect(map.resize).toHaveBeenCalledTimes(2)

    dispose()
    expect(cancel).toHaveBeenCalled()
  })
})
