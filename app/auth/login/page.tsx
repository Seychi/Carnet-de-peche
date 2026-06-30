import { LoginPageClient } from './login-client'

// Wrapper SERVEUR (sprint 54 WS-D) : lit INVITE_ONLY côté serveur (var non publique)
// et le passe au composant client, qui masque alors le bouton « Continuer avec
// Google » pendant la beta fondateurs (l'OAuth ne peut pas porter de code
// d'invitation). Le composant client vit dans login-client.tsx.
export default function LoginPage() {
  return <LoginPageClient inviteOnly={process.env.INVITE_ONLY === 'true'} />
}
