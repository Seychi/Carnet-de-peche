'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from './UserMenu'
import { MobileNav } from '@/components/mobile-nav'

/**
 * Bloc « actions » du header public, auth-aware SANS rendre la page dynamique.
 *
 * Pourquoi ce composant existe (sprint 84) : l'ancien `<Header>` était un Server
 * Component qui appelait `auth.getUser()`, donc `cookies()`, donc TOUT le groupe
 * `(marketing)` était rendu dynamiquement et `revalidate` / `generateStaticParams`
 * étaient inertes sur les 1 088 pages SEO. Ici, le rendu serveur est toujours la
 * variante ANONYME (c'est ce que voient le CDN et Googlebot) et la bascule se fait
 * après hydratation. Même pattern que `components/marketing/HeroPrimaryCta.tsx`.
 *
 * Invariant de sécurité : aucune donnée utilisateur (pseudo, avatar) ne peut entrer
 * dans le HTML mis en cache, puisque le serveur ne lit jamais la session.
 *
 * Lecture de session : `getSession()` et pas `getUser()`. `getSession()` lit le
 * store local (cookies) sans aucun appel réseau ; `getUser()` valide le JWT auprès
 * du serveur Auth, soit un aller-retour par rendu de header, sur toutes les pages.
 * Vérifié sur @supabase/ssr (test amont `createServerClient.spec.ts` : 0 fetch pour
 * getSession, 1 fetch pour getUser).
 *
 * Anti-CLS : la variante anonyme reste TOUJOURS dans le flux (masquée en
 * `visibility` une fois connecté) et la variante connectée se superpose en absolu.
 * La largeur du slot est donc constante par construction, quel que soit l'état et
 * quelle que soit la longueur du pseudo : la bascule ne pousse rien.
 */

type AuthState = {
  authed: boolean
  username: string | null
  avatarUrl: string | null
}

const ANONYMOUS: AuthState = { authed: false, username: null, avatarUrl: null }

export function HeaderAuthSlot() {
  const [auth, setAuth] = useState<AuthState>(ANONYMOUS)

  /** Compte déjà résolu (id, ou null pour « anonyme résolu »). Garde anti-boucle. */
  const resolvedFor = useRef<string | null>(null)
  /** Faux entre le démontage et un éventuel remontage : interdit tout setState tardif. */
  const alive = useRef(true)

  const check = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id ?? null

      if (!alive.current) return
      // Rien n'a changé depuis la dernière résolution : ni requête profil, ni setState
      // (indispensable, l'effet ci-dessous tourne à chaque rendu).
      if (userId === resolvedFor.current) return
      resolvedFor.current = userId

      if (!userId) {
        setAuth(ANONYMOUS)
        return
      }

      // Pseudo + avatar lus au navigateur (RLS : chacun lit son profil).
      // `maybeSingle` et pas `single` : un compte tout juste créé peut ne pas encore
      // avoir sa ligne `profiles`. Dans ce cas on affiche quand même l'état connecté,
      // `UserMenu` sait retomber sur « Pêcheur ».
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      // La session a pu changer pendant la requête : on jette le résultat périmé.
      if (!alive.current || resolvedFor.current !== userId) return
      setAuth({
        authed: true,
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      })
    } catch {
      // Session illisible (réseau coupé, stockage bloqué par le navigateur) : on
      // reste sur la variante anonyme et on autorise un prochain rendu à retenter.
      // Surtout pas de rejet non capturé, le header est monté sur tout le site.
      resolvedFor.current = null
    }
  }, [])

  // Abonne le composant au routeur : garantit un rendu (donc une revérification de
  // session) à chaque navigation, même si l'arbre RSC parent est servi depuis le
  // cache du routeur. C'est ce qui remet le header d'aplomb après une déconnexion,
  // qui redirige vers '/'. `usePathname` ne désactive PAS le rendu statique
  // (contrairement à `useSearchParams`, à ne surtout pas introduire ici).
  usePathname()

  // Volontairement SANS tableau de dépendances : l'effet retourne à chaque rendu,
  // donc à chaque navigation et à chaque rafraîchissement de l'arbre RSC. C'est ce
  // qui redonne au header client la fraîcheur de l'ancien header serveur, par
  // exemple après une déconnexion qui redirige vers '/'. `getSession()` ne coûte
  // aucun réseau et la garde `resolvedFor` coupe toute boucle de rendu.
  useEffect(() => {
    void check()
  })

  useEffect(() => {
    alive.current = true
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Jamais d'appel Supabase directement dans ce callback (verrou interne du SDK) :
      // on repasse par la boucle d'événements.
      setTimeout(() => {
        void check()
      }, 0)
    })
    return () => {
      alive.current = false
      sub.subscription.unsubscribe()
    }
  }, [check])

  const connected = auth.authed

  return (
    <>
      <div className="relative flex items-center gap-2">
        {/* Variante anonyme. Rendue côté serveur (HTML statique servi au CDN et aux
            bots) et gardée dans le flux même une fois connecté : c'est elle qui fixe
            la largeur du slot, donc la bascule ne décale rien. */}
        <div
          className={connected ? 'flex items-center gap-2 invisible' : 'flex items-center gap-2'}
          aria-hidden={connected || undefined}
          inert={connected}
        >
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-full text-[14px] font-semibold text-navy-900 border-[1.5px] border-ink-200 min-h-[44px] hover:bg-ink-100 transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center px-4 py-2.5 rounded-full text-[14px] font-semibold min-h-[44px] whitespace-nowrap text-white"
            style={{ background: 'var(--navy-900)', boxShadow: '0 4px 14px rgba(10,47,61,.18)' }}
          >
            Créer mon carnet
          </Link>
        </div>

        {/* Variante connectée : superposée, hors flux, alignée sur le bord droit du
            slot (là où se termine la variante anonyme). Elle ne contribue donc jamais
            à la largeur, quelle que soit la longueur du pseudo.
            `w-max` est nécessaire : sans lui, un bloc absolu se rétrécit à la largeur
            disponible (celle de la variante anonyme) et tronquerait le pseudo plus tôt
            qu'aujourd'hui. Avec, le rendu connecté est au pixel près celui d'avant. */}
        {connected && (
          <div className="absolute inset-y-0 right-0 w-max flex items-center gap-2">
            {/* Pont retour vers l'app pour un connecté qui navigue le shell marketing. */}
            <Link
              href="/home"
              className="hidden sm:inline-flex items-center min-h-[44px] px-3 text-[14px] font-semibold text-navy-900 hover:text-teal-700 transition-colors"
            >
              Mon carnet
            </Link>
            <UserMenu username={auth.username} avatarUrl={auth.avatarUrl} />
          </div>
        )}
      </div>

      <MobileNav isAuthenticated={connected} username={auth.username} />
    </>
  )
}
