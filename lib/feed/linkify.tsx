import { createElement, type ReactNode } from 'react'

/**
 * Mini-linkifier maison (sprint 11 Bloc F) : remplace linkify-react/linkifyjs
 * (~20 kB gz) dans le rendu des posts du fil.
 *
 * Sécurité :
 * - seuls les schémas http:// et https:// sont linkifiés (www. → préfixe
 *   https://) — jamais javascript:, data:, etc. ;
 * - le texte reste du texte React (pas de dangerouslySetInnerHTML) : React
 *   échappe tout, on ne fait que découper la chaîne en nodes.
 */

// teal-700 (pas -600) : 4.5:1 requis sur carte blanche (sweep contraste Bloc F).
const LINK_CLASS = 'text-teal-700 underline break-words'

// \b évite de matcher au milieu d'un mot (« awww.foo.com » ne matche pas).
// Quotes et chevrons exclus : ils délimitent l'URL, ils n'en font pas partie.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi

// Ponctuation de fin de phrase exclue de l'URL : « https://a.fr. » → lien sur
// https://a.fr, le « . » reste du texte.
const TRAILING_PUNCT_RE = /[.,;:!?]+$/

/**
 * Retire itérativement la ponctuation finale et les parenthèses fermantes NON
 * appariées : « (voir https://a.fr). » → https://a.fr, mais l'URL Wikipédia
 * « …/Bar_(poisson) » garde sa parenthèse (appariée dans l'URL).
 */
function trimUrlEnd(raw: string): string {
  let url = raw
  for (;;) {
    const punct = url.match(TRAILING_PUNCT_RE)?.[0]
    if (punct) {
      url = url.slice(0, -punct.length)
      continue
    }
    if (
      url.endsWith(')') &&
      (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)
    ) {
      url = url.slice(0, -1)
      continue
    }
    return url
  }
}

/** https?:// inchangé ; www. préfixé en https:// ; sinon null (pas un lien). */
function hrefFor(url: string): string | null {
  if (/^https?:\/\/.+/i.test(url)) return url
  if (/^www\..+/i.test(url)) return `https://${url}`
  return null
}

/**
 * Découpe `text` et retourne des React nodes : les URLs http(s) et www.
 * deviennent des <a target="_blank">, le reste reste des strings.
 */
export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0]
    // `index` est toujours défini sur les matchs de matchAll (typage TS prudent).
    const start = match.index ?? 0

    // Ponctuation/parenthèses finales rendues comme texte après le lien.
    const url = trimUrlEnd(raw)

    const href = hrefFor(url)
    if (!href) {
      // Match dégénéré (ex. « www. » seul) : on laisse le texte tel quel.
      continue
    }

    if (start > lastIndex) nodes.push(text.slice(lastIndex, start))
    // createElement explicite (pas de JSX) : le fichier reste indépendant du
    // mode de transform JSX (Next = automatic, Vitest/esbuild = classic).
    nodes.push(
      createElement(
        'a',
        {
          key: `${start}-${url}`,
          href,
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
          className: LINK_CLASS,
        },
        url,
      ),
    )
    lastIndex = start + url.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}
