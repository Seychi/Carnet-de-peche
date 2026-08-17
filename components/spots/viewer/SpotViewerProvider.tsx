'use client'

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { ANONYMOUS_VIEWER, type SpotViewerPayload } from '@/lib/spots/viewer'
import { hasAuthCookieHint, VIEWER_ATTR, VIEWER_AUTHED, ANON_ONLY_ATTR } from './auth-hint'

/**
 * Résolution du visiteur d'une fiche spot, APRÈS hydratation (sprint 84, Bloc 3).
 *
 * La page est statique et rend la variante anonyme. Ce fournisseur va chercher, une
 * seule fois et en un seul aller-retour, tout ce qu'un visiteur connecté a en plus :
 * `GET /api/spots/[slug]/viewer`. Les composants « delta » lisent ce contexte.
 *
 * 🔒 Rien n'est décidé ici : la coordonnée précise, le palier et les lectures RLS
 * viennent tous du serveur, qui les obtient de Postgres avec la session réelle.
 * Ce fichier ne fait qu'afficher ce que la base a bien voulu donner.
 *
 * État initial = `ANONYMOUS_VIEWER`, c'est-à-dire EXACTEMENT ce que décrit le HTML
 * statique. C'est ce qui garantit une hydratation sans divergence.
 */

type ViewerState = SpotViewerPayload & {
  /** Vrai une fois la réponse serveur reçue (ou définitivement échouée). */
  resolved: boolean
}

const INITIAL: ViewerState = { ...ANONYMOUS_VIEWER, resolved: false }

const SpotViewerContext = createContext<ViewerState>(INITIAL)

export function useSpotViewer(): ViewerState {
  return useContext(SpotViewerContext)
}

/**
 * `useLayoutEffect` côté navigateur (exécuté AVANT peinture, ce qui est tout
 * l'intérêt), `useEffect` côté serveur pour ne pas déclencher l'avertissement React
 * pendant le rendu statique.
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function SpotViewerProvider({
  slug,
  children,
}: {
  /**
   * Fiche concernée. ABSENT sur la liste `/spots`, qui n'a aucun delta à charger :
   * elle a seulement besoin de savoir s'il y a un compte, ce qui se lit en local
   * (cookie de session) sans le moindre aller-retour réseau.
   */
  slug?: string
  children: ReactNode
}) {
  const [state, setState] = useState<ViewerState>(INITIAL)

  useEffect(() => {
    if (!slug) {
      // Pas de delta à demander (liste `/spots`) : on confirme juste la présence
      // d'une session. Sans cookie, on ne charge même pas le SDK Supabase — le
      // visiteur sans compte ne paie donc STRICTEMENT rien pour cette bascule.
      if (!hasAuthCookieHint()) {
        setState({ ...ANONYMOUS_VIEWER, resolved: true })
        return
      }
      // `getSession()` lit le stockage LOCAL, sans aucun appel réseau, contrairement
      // à `getUser()` qui valide le JWT auprès du serveur Auth. C'est plus fiable
      // que le seul indice cookie (un cookie périmé ne fait pas une session).
      let alive = true
      import('@/lib/supabase/client')
        .then(({ createClient }) => createClient().auth.getSession())
        .then(({ data }) => {
          if (!alive) return
          const authed = data.session != null
          setState({ ...ANONYMOUS_VIEWER, authed, resolved: true })
          if (typeof document !== 'undefined') {
            const root = document.documentElement
            if (authed) root.setAttribute(VIEWER_ATTR, VIEWER_AUTHED)
            else root.removeAttribute(VIEWER_ATTR)
          }
        })
        .catch(() => {
          // Session illisible : on garde l'indice de pré-peinture plutôt que de
          // faire réapparaître des murs sous les yeux d'un connecté.
          if (alive) setState((s) => ({ ...s, authed: hasAuthCookieHint(), resolved: true }))
        })
      return () => {
        alive = false
      }
    }

    // ★ ZÉRO requête pour un visiteur sans compte, c'est-à-dire pour ~100 % du
    // trafic SEO. Sans cette garde, chaque page servie depuis le CDN déclencherait
    // quand même une invocation serverless pour s'entendre répondre « anonyme » :
    // on aurait rendu la page statique et remis le coût par la fenêtre.
    // Pas de cookie de session = rien à demander, l'état affiché est déjà le bon.
    if (!hasAuthCookieHint()) {
      setState({ ...ANONYMOUS_VIEWER, resolved: true })
      return
    }

    const controller = new AbortController()
    let alive = true

    fetch(`/api/spots/${encodeURIComponent(slug)}/viewer`, {
      signal: controller.signal,
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: SpotViewerPayload | null) => {
        if (!alive) return
        setState({ ...(payload ?? ANONYMOUS_VIEWER), resolved: true })
        // L'indice de pré-peinture peut se tromper (cookie périmé, session
        // révoquée) : on le corrige dans les deux sens une fois la vérité connue,
        // sinon un visiteur redevenu anonyme resterait avec des murs masqués.
        if (typeof document !== 'undefined') {
          const root = document.documentElement
          if (payload?.authed) root.setAttribute(VIEWER_ATTR, VIEWER_AUTHED)
          else root.removeAttribute(VIEWER_ATTR)
        }
      })
      .catch(() => {
        // Réseau coupé / requête annulée : on reste sur la variante anonyme, qui est
        // déjà à l'écran. Jamais de rejet non capturé sur la page la plus vue du site.
        if (alive) setState((s) => ({ ...s, resolved: true }))
      })

    return () => {
      alive = false
      controller.abort()
    }
  }, [slug])

  return (
    <SpotViewerContext.Provider value={state}>{children}</SpotViewerContext.Provider>
  )
}

/**
 * Bloc présent dans le HTML STATIQUE et réservé aux visiteurs sans compte.
 *
 * Masqué avant peinture par le script de `SpotViewerBootstrap` (chargement initial)
 * ou par le `useLayoutEffect` ci-dessous (navigation client) : dans les deux cas le
 * bloc n'est jamais peint puis retiré, donc il ne pousse rien.
 *
 * `display: contents` : le conteneur s'efface de la mise en page, ses enfants
 * restent des enfants directs du parent (indispensable dans une grille, où le mur
 * de `/spots` porte un `col-span`). La règle de masquage est en `!important`, elle
 * l'emporte donc sur `contents`.
 */
export function AnonymousOnly({ children }: { children: ReactNode }) {
  const { authed, resolved } = useSpotViewer()
  const [hinted, setHinted] = useState(false)

  useIsomorphicLayoutEffect(() => {
    if (hasAuthCookieHint()) setHinted(true)
  }, [])

  // Avant résolution on suit l'indice ; après, la vérité serveur.
  if (resolved ? authed : hinted) return null

  return (
    <div {...{ [ANON_ONLY_ATTR]: '' }} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}

/**
 * Bloc réservé aux visiteurs CONNECTÉS. Absent du HTML statique par construction
 * (il ne doit jamais entrer dans un cache partagé), monté après résolution.
 *
 * ⚠️ N'y mettre que du contenu situé bas de page ou hors flux : un bloc qui
 * apparaît pousse ce qui est en dessous.
 */
export function ConnectedOnly({ children }: { children: ReactNode }) {
  const { authed } = useSpotViewer()
  if (!authed) return null
  return <>{children}</>
}
