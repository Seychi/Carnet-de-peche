/**
 * Indice « il y a une session » lisible AVANT le premier rendu (sprint 84, Bloc 3).
 *
 * ★ C'est la brique anti-CLS du bloc. Le HTML de `/spots/[slug]` est statique et
 * contient donc TOUJOURS les blocs réservés aux visiteurs sans compte (murs
 * d'inscription, CTA « crée ton carnet »). Pour un connecté, ces blocs doivent
 * disparaître — et s'ils disparaissaient après hydratation, tout le contenu situé
 * en dessous remonterait d'un coup : c'est le pire décalage de mise en page du
 * sprint, sur la page qui porte 80 % des clics Google.
 *
 * La parade est en deux temps, et les deux sont nécessaires :
 *   1. `SpotViewerBootstrap` pose un `<script>` EN LIGNE en tête de page. Il
 *      s'exécute pendant l'analyse du document, donc AVANT le premier rendu, et
 *      pose `data-viewer="authed"` sur `<html>`. Une règle CSS masque alors les
 *      blocs `[data-anon-only]` : ils ne sont jamais peints, il n'y a rien à
 *      décaler.
 *   2. Les composants `AnonymousOnly` relisent le même indice dans un
 *      `useLayoutEffect`, qui s'exécute lui aussi avant peinture. C'est ce qui
 *      couvre les navigations CLIENT (le script en ligne, lui, ne rejoue pas).
 *
 * ⚠️ Ce n'est QU'UN INDICE d'affichage, jamais une décision de sécurité. La
 * présence d'un cookie ne prouve pas une session valide. Rien n'est débloqué ici :
 * on masque des blocs promotionnels, et le vrai état arrive ensuite de
 * `/api/spots/[slug]/viewer`, qui corrige dans les deux sens.
 *
 * Pas de cloaking : le HTML servi est identique pour tout le monde, y compris pour
 * Googlebot, qui n'a pas de cookie et voit donc la page telle qu'elle est mise en
 * cache. Le masquage se produit dans le navigateur du visiteur, pas au serveur.
 */

/**
 * Cookie de session @supabase/ssr : `sb-<projectRef>-auth-token`, éventuellement
 * découpé en `.0`, `.1` quand le JWT dépasse la taille d'un cookie.
 *
 * ⚠️ Le `=` final est indispensable : sans lui on attraperait aussi
 * `sb-<ref>-auth-token-code-verifier`, posé pendant un flux OAuth pour un visiteur
 * qui n'est justement PAS encore connecté.
 */
export const AUTH_COOKIE_PATTERN = String.raw`(?:^|;\s*)sb-[a-z0-9-]+-auth-token(?:\.\d+)?=`

export function hasAuthCookieHint(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return new RegExp(AUTH_COOKIE_PATTERN).test(document.cookie)
  } catch {
    return false
  }
}

/** Attribut posé sur `<html>` par le script en ligne. */
export const VIEWER_ATTR = 'data-viewer'
export const VIEWER_AUTHED = 'authed'

/** Marqueur des blocs qui n'existent que pour un visiteur sans compte. */
export const ANON_ONLY_ATTR = 'data-anon-only'

/**
 * Marqueur symétrique : bloc présent dans le HTML mis en cache mais réservé aux
 * visiteurs CONNECTÉS, masqué par défaut et révélé avant peinture.
 *
 * ⚠️ N'y mettre que du balisage INERTE et sans valeur commerciale : il est servi à
 * tout le monde, Googlebot compris. Un prix, un pseudo ou une donnée de compte n'ont
 * rien à y faire (cf sprint 79, Bloc 5 : on ne vend pas un abonnement à qui n'a pas
 * de compte). Le seul usage à ce jour est le lien « + Loguer une prise ici », dont
 * la présence dans le document est au contraire un gain de maillage (sprint 78).
 */
export const AUTHED_ONLY_ATTR = 'data-authed-only'
