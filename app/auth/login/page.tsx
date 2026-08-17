import type { Metadata } from 'next'
import { LoginPageClient } from './login-client'

// Sprint 79, Bloc 6 : balise canonique. `/auth/login` est la 2e page d'entrée
// mobile du site (15 visiteurs, 47 vues sur 30 j) et elle est en `Allow` dans
// robots.txt, mais elle n'avait aucun canonical : ses variantes de query
// (`?tab=register`, `?redirect=…`, `?plan=…`) sont autant d'URL distinctes aux
// yeux d'un moteur. On les rabat toutes sur la page nue.
// Le <title> reste celui du layout (`default`), la page étant un client component.
// Sprint 85, Bloc 1 : `noindex, follow`. Mesuré sur 90 jours, **23 personnes
// ENTRAIENT sur le site par cette page** (4e page d'entrée), parce que le
// sitemap la déclarait. Quelqu'un qui arrive d'un moteur sur une page de
// *connexion* n'a par définition pas de compte : on lui servait un formulaire
// qui suppose qu'il en a un. La page d'entrée déclarée est `/auth/register`.
//
// `follow` et PAS de `disallow` dans robots.ts, à dessein : une page bloquée au
// crawl ne peut pas voir son `noindex` et resterait indexée. Il faut que le
// robot puisse lire la page pour lire l'instruction.
//
// ⚠️ Effet volontaire : `/auth/login?tab=register` (liens historiques) hérite du
// noindex. La route continue de répondre 200 et d'ouvrir l'onglet inscription,
// seul son référencement s'éteint au profit de `/auth/register`.
export const metadata: Metadata = {
  alternates: { canonical: 'https://www.carnet-de-peche.com/auth/login' },
  robots: { index: false, follow: true },
}

// Wrapper SERVEUR (sprint 54 WS-D) : lit INVITE_ONLY côté serveur (var non publique)
// et le passe au composant client, qui masque alors le bouton « Continuer avec
// Google » pendant la beta fondateurs (l'OAuth ne peut pas porter de code
// d'invitation). Le composant client vit dans login-client.tsx.
export default function LoginPage() {
  return <LoginPageClient inviteOnly={process.env.INVITE_ONLY === 'true'} />
}
