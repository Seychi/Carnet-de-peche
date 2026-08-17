// Sprint 85, Bloc 1 — `/auth/login?tab=register` doit renvoyer un 301 vers
// `/auth/register` SANS perdre les autres paramètres.
//
// Le risque réel de ce changement n'est pas la redirection, c'est la query : un
// 301 vers `/auth/register` nu casserait le `?redirect=` de retour (invariant du
// sprint 70 Bloc C) et perdrait le `?plan=`. C'est ça que ces tests verrouillent.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Le middleware crée un client Supabase pour les routes concernées : on le neutralise,
// aucun de ces cas ne doit l'atteindre de toute façon (la redirection sort avant).
const createServerClient = vi.fn(() => ({
  auth: { getUser: async () => ({ data: { user: null } }) },
}))
vi.mock('@supabase/ssr', () => ({ createServerClient }))

const { middleware } = await import('../middleware')

const BASE = 'https://www.carnet-de-peche.com'

async function run(url: string) {
  return middleware(new NextRequest(new URL(url, BASE)))
}

beforeEach(() => createServerClient.mockClear())

describe('/auth/login?tab=register → 301 /auth/register', () => {
  it('redirige en 301 permanent, pas en 302', async () => {
    const res = await run('/auth/login?tab=register')
    expect(res.status).toBe(301)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/auth/register')
  })

  it('ne laisse AUCUN tab dans la cible', async () => {
    const res = await run('/auth/login?tab=register')
    expect(new URL(res.headers.get('location')!).searchParams.get('tab')).toBeNull()
  })

  it('★ préserve le ?redirect= de retour (invariant sprint 70 Bloc C)', async () => {
    const res = await run('/auth/login?tab=register&redirect=%2Fspots%2Fpointe-du-raz')
    const loc = new URL(res.headers.get('location')!)
    expect(loc.pathname).toBe('/auth/register')
    expect(loc.searchParams.get('redirect')).toBe('/spots/pointe-du-raz')
  })

  it('★ préserve le ?plan= et l’ordre des autres paramètres', async () => {
    const res = await run('/auth/login?tab=register&redirect=%2Ftarifs&plan=local')
    const loc = new URL(res.headers.get('location')!)
    expect(loc.searchParams.get('plan')).toBe('local')
    expect(loc.searchParams.get('redirect')).toBe('/tarifs')
  })

  it('préserve un paramètre RÉPÉTÉ (une recopie clé par clé l’écraserait)', async () => {
    const res = await run('/auth/login?tab=register&utm_source=a&utm_source=b')
    const loc = new URL(res.headers.get('location')!)
    expect(loc.searchParams.getAll('utm_source')).toEqual(['a', 'b'])
  })

  it('sort AVANT toute création de client Supabase', async () => {
    await run('/auth/login?tab=register')
    expect(createServerClient).not.toHaveBeenCalled()
  })
})

describe('ce que la redirection ne doit PAS attraper', () => {
  it('/auth/login nu passe au traitement normal, pas de 301', async () => {
    const res = await run('/auth/login')
    expect(res.status).not.toBe(301)
  })

  it('/auth/login?tab=signin passe au traitement normal', async () => {
    const res = await run('/auth/login?tab=signin')
    expect(res.status).not.toBe(301)
  })

  it('/auth/login?redirect=… sans tab passe au traitement normal', async () => {
    const res = await run('/auth/login?redirect=%2Fhome')
    expect(res.status).not.toBe(301)
  })

  it('/auth/register n’est jamais redirigée sur elle-même (pas de boucle)', async () => {
    const res = await run('/auth/register?tab=register')
    expect(res.status).not.toBe(301)
  })
})
