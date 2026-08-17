import type { ReactNode } from 'react'
import {
  ANON_ONLY_ATTR,
  AUTHED_ONLY_ATTR,
  AUTH_COOKIE_PATTERN,
  VIEWER_ATTR,
  VIEWER_AUTHED,
} from './auth-hint'

/**
 * Amorce anti-CLS des pages spots statiques (sprint 84, Bloc 3).
 *
 * Composant SERVEUR pur (aucun cookie lu, aucun import de `@/lib/supabase/server`) :
 * il sort le même HTML pour tout le monde et n'empêche donc pas le rendu statique.
 * Voir `auth-hint.ts` pour le pourquoi complet.
 *
 * À rendre le PLUS HAUT POSSIBLE dans la page : le style et le script doivent être
 * analysés avant les blocs `[data-anon-only]` qu'ils masquent, sinon ceux-ci sont
 * peints puis retirés, ce qui est exactement le décalage qu'on veut éviter.
 *
 * CSP : `script-src` et `style-src` portent `'unsafe-inline'` (cf `next.config.ts`,
 * pas de nonce à ce jour). Si un nonce est introduit un jour, ces deux balises
 * doivent le recevoir, sinon le masquage saute et le décalage revient.
 */
const HIDE_CSS = [
  `html[${VIEWER_ATTR}="${VIEWER_AUTHED}"] [${ANON_ONLY_ATTR}]{display:none !important}`,
  `html:not([${VIEWER_ATTR}="${VIEWER_AUTHED}"]) [${AUTHED_ONLY_ATTR}]{display:none !important}`,
].join('')

const HINT_SCRIPT = `(function(){try{if(new RegExp(${JSON.stringify(
  AUTH_COOKIE_PATTERN,
)}).test(document.cookie)){document.documentElement.setAttribute(${JSON.stringify(
  VIEWER_ATTR,
)},${JSON.stringify(VIEWER_AUTHED)})}}catch(e){}})()`

export function SpotViewerBootstrap() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HIDE_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: HINT_SCRIPT }} />
    </>
  )
}

/**
 * Balisage INERTE réservé aux connectés, présent dans le HTML mis en cache et
 * révélé avant peinture. Composant SERVEUR : à réserver au contenu qui peut être
 * servi à tout le monde sans dommage (cf `AUTHED_ONLY_ATTR`). Pour tout ce qui est
 * personnel, payant ou instrumenté, utiliser `ConnectedOnly` (montage après
 * résolution) et surtout pas ceci.
 *
 * `display: contents` : le conteneur s'efface de la mise en page, ses enfants
 * restent des enfants directs du parent.
 */
export function AuthedOnlyStatic({ children }: { children: ReactNode }) {
  return (
    <div {...{ [AUTHED_ONLY_ATTR]: '' }} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
