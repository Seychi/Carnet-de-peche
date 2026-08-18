import { describe, it, expect, vi, afterEach } from 'vitest'

/**
 * Sprint 88, Bloc 2 — `JAVASCRIPT-NEXTJS-H`, 1 154 événements / 512 utilisateurs.
 *
 * zod v4 compile ses schémas d'objet avec le constructeur `Function` et sonde
 * d'abord sa disponibilité par un `Function("")`. Notre CSP n'a pas
 * `'unsafe-eval'` : la sonde est bloquée, zod dégrade proprement, mais le
 * navigateur POSTe un rapport de violation par chargement de page.
 *
 * Deux choses à verrouiller, et la seconde compte autant que la première :
 *   1. la sonde ne part plus ;
 *   2. AUCUNE validation ne change — c'est la seule chose que ce bloc pouvait casser.
 */

afterEach(() => {
  vi.resetModules()
})

describe('zod-jitless — la sonde `Function("")` ne part plus', () => {
  it('pose le drapeau dans la config globale de zod', async () => {
    await import('@/lib/zod-config')
    const g = globalThis as { __zod_globalConfig?: { jitless?: boolean } }
    expect(g.__zod_globalConfig?.jitless).toBe(true)
  })

  it('★ construire et parser un schéma n’appelle jamais `Function("")`', async () => {
    vi.resetModules()
    const g = globalThis as { __zod_globalConfig?: { jitless?: boolean } }
    delete g.__zod_globalConfig

    const RealFunction = globalThis.Function
    const probes: unknown[][] = []
    const spy = new Proxy(RealFunction, {
      apply(target, thisArg, args) {
        probes.push(args)
        return Reflect.apply(target as never, thisArg, args as never)
      },
      construct(target, args) {
        probes.push(args)
        return Reflect.construct(target as never, args as never)
      },
    })
    globalThis.Function = spy as FunctionConstructor

    try {
      // L'ordre reproduit celui de la vraie application : le module d'effet de bord
      // d'abord (il n'importe rien), zod ensuite.
      await import('@/lib/zod-config')
      const { z } = await import('zod')
      const schema = z.object({ nom: z.string(), taille: z.number() })
      schema.safeParse({ nom: 'bar', taille: 42 })
      schema.safeParse({ nom: 42 })
    } finally {
      globalThis.Function = RealFunction
    }

    // La sonde est très reconnaissable : `Function("")`, un seul argument vide.
    const sondes = probes.filter((a) => a.length === 1 && a[0] === '')
    expect(sondes, 'zod sonde encore le constructeur Function → rapport CSP').toEqual([])
    // Et aucune compilation JIT non plus (le corps compilé contient toujours `return`).
    const compilations = probes.filter((a) =>
      a.some((x) => typeof x === 'string' && x.includes('return')),
    )
    expect(compilations, 'zod compile encore un validateur via Function').toEqual([])
  })
})

describe('non-régression : les messages zod restent en français', () => {
  it('un champ requis manquant, un type faux et une longueur mini', async () => {
    await import('@/lib/zod-config')
    const { z } = await import('zod')

    const schema = z.object({
      email: z.string().email(),
      pseudo: z.string().min(3),
      age: z.number(),
    })

    const res = schema.safeParse({ pseudo: 'ab' })
    expect(res.success).toBe(false)
    const messages = res.error!.issues.map((i) => i.message).join(' | ')

    // On ne fige pas la formulation exacte de zod (elle bouge d'une version à
    // l'autre) : on vérifie que c'est du FRANÇAIS et pas l'anglais par défaut.
    expect(messages).not.toMatch(/Required|Invalid input|Expected number/i)
    expect(messages).toMatch(/[éèêàûôç]/i)
    // Une issue par champ fautif : email absent, pseudo trop court, age absent.
    expect(res.error!.issues).toHaveLength(3)
  })

  it('l’ordre et les chemins des issues sont ceux attendus', async () => {
    await import('@/lib/zod-config')
    const { z } = await import('zod')
    const schema = z.object({ a: z.string(), b: z.string(), c: z.string() })
    const res = schema.safeParse({ b: 1 })
    expect(res.success).toBe(false)
    expect(res.error!.issues.map((i) => i.path.join('.'))).toEqual(['a', 'b', 'c'])
  })
})
