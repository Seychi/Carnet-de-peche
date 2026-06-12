import { describe, expect, it } from 'vitest'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { linkifyText } from '@/lib/feed/linkify'

type AnchorProps = {
  href: string
  target: string
  rel: string
  className: string
  children: ReactNode
}

/** Extrait les <a> du résultat (environnement node : pas de DOM, on inspecte les éléments React). */
function anchors(nodes: ReactNode[]): ReactElement<AnchorProps>[] {
  return nodes.filter(
    (n): n is ReactElement<AnchorProps> => isValidElement(n) && n.type === 'a',
  )
}

/** Reconstruit le texte visible (strings + children des <a>) pour vérifier qu'on ne perd rien. */
function visibleText(nodes: ReactNode[]): string {
  return nodes
    .map((n) => {
      if (typeof n === 'string') return n
      if (isValidElement<AnchorProps>(n)) return String(n.props.children)
      return ''
    })
    .join('')
}

describe('linkifyText', () => {
  it('linkifie une URL https avec les bons attributs', () => {
    const nodes = linkifyText('Regarde https://example.com pour la marée')
    const [a, ...rest] = anchors(nodes)
    expect(rest).toHaveLength(0)
    expect(a.props.href).toBe('https://example.com')
    expect(a.props.target).toBe('_blank')
    expect(a.props.rel).toBe('noopener noreferrer nofollow')
    expect(a.props.className).toBe('text-teal-700 underline break-words')
    expect(a.props.children).toBe('https://example.com')
    expect(visibleText(nodes)).toBe('Regarde https://example.com pour la marée')
  })

  it('garde query string et ancre dans le lien', () => {
    const url = 'https://example.com/spots?dept=29&tri=score#carte'
    const nodes = linkifyText(`Le top : ${url} !`)
    const [a] = anchors(nodes)
    expect(a.props.href).toBe(url)
    expect(a.props.children).toBe(url)
    // Le « ! » final est de la ponctuation, pas l'URL.
    expect(visibleText(nodes)).toBe(`Le top : ${url} !`)
  })

  it('préfixe les liens www. en https:// (texte affiché inchangé)', () => {
    const nodes = linkifyText('Va sur www.shom.fr direct')
    const [a] = anchors(nodes)
    expect(a.props.href).toBe('https://www.shom.fr')
    expect(a.props.children).toBe('www.shom.fr')
  })

  it('ne linkifie JAMAIS javascript:', () => {
    const text = 'clique javascript:alert(1) ici'
    const nodes = linkifyText(text)
    expect(anchors(nodes)).toHaveLength(0)
    expect(nodes).toEqual([text])
  })

  it('retourne le texte tel quel sans URL', () => {
    const text = 'Belle session au lever du jour, 2 bars maillés.'
    expect(linkifyText(text)).toEqual([text])
  })

  it('exclut la ponctuation finale de l’URL', () => {
    const nodes = linkifyText('Détails sur https://example.com/guide.')
    const [a] = anchors(nodes)
    expect(a.props.href).toBe('https://example.com/guide')
    // Le point reste du texte après le lien.
    expect(nodes[nodes.length - 1]).toBe('.')

    const [b] = anchors(linkifyText('Tu connais www.example.fr?!'))
    expect(b.props.href).toBe('https://www.example.fr')
    expect(b.props.children).toBe('www.example.fr')
  })

  it('gère un texte mixte avec plusieurs URLs', () => {
    const text = 'Marées : https://maree.shom.fr, météo www.meteofrance.com et bonne pêche'
    const nodes = linkifyText(text)
    const as = anchors(nodes)
    expect(as).toHaveLength(2)
    expect(as[0].props.href).toBe('https://maree.shom.fr')
    expect(as[1].props.href).toBe('https://www.meteofrance.com')
    // Aucun caractère perdu au découpage.
    expect(visibleText(nodes)).toBe(text)
    expect(nodes[0]).toBe('Marées : ')
  })

  it('ne matche pas www. au milieu d’un mot ni un www. dégénéré', () => {
    expect(anchors(linkifyText('trop fort lawww.le-site'))).toHaveLength(0)
    expect(anchors(linkifyText('haha www. ok'))).toHaveLength(0)
  })

  it('exclut la parenthèse fermante non appariée (URL entre parenthèses)', () => {
    const nodes = linkifyText('Le spot (voir https://example.com/guide).')
    const [a] = anchors(nodes)
    expect(a.props.href).toBe('https://example.com/guide')
    expect(visibleText(nodes)).toBe('Le spot (voir https://example.com/guide).')
  })

  it('garde une parenthèse appariée dans l’URL (style Wikipédia)', () => {
    const url = 'https://fr.wikipedia.org/wiki/Bar_(poisson)'
    const [a] = anchors(linkifyText(`Fiche : ${url}`))
    expect(a.props.href).toBe(url)
  })

  it('stoppe l’URL sur les quotes et chevrons', () => {
    const [a] = anchors(linkifyText('cf "https://example.com" ici'))
    expect(a.props.href).toBe('https://example.com')
    const [b] = anchors(linkifyText('lien <https://example.fr> ok'))
    expect(b.props.href).toBe('https://example.fr')
  })
})
