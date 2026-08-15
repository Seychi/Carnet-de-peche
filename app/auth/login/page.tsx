import type { Metadata } from 'next'
import { LoginPageClient } from './login-client'

// Sprint 79, Bloc 6 : balise canonique. `/auth/login` est la 2e page d'entrée
// mobile du site (15 visiteurs, 47 vues sur 30 j) et elle est en `Allow` dans
// robots.txt, mais elle n'avait aucun canonical : ses variantes de query
// (`?tab=register`, `?redirect=…`, `?plan=…`) sont autant d'URL distinctes aux
// yeux d'un moteur. On les rabat toutes sur la page nue.
// Le <title> reste celui du layout (`default`), la page étant un client component.
export const metadata: Metadata = {
  alternates: { canonical: 'https://www.carnet-de-peche.com/auth/login' },
}

// Wrapper SERVEUR (sprint 54 WS-D) : lit INVITE_ONLY côté serveur (var non publique)
// et le passe au composant client, qui masque alors le bouton « Continuer avec
// Google » pendant la beta fondateurs (l'OAuth ne peut pas porter de code
// d'invitation). Le composant client vit dans login-client.tsx.
export default function LoginPage() {
  return <LoginPageClient inviteOnly={process.env.INVITE_ONLY === 'true'} />
}
