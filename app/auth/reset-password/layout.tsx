import type { Metadata } from "next";

// La page reset-password est un client component → title défini ici (server).
// Le template du layout /auth parent produit "Nouveau mot de passe · Carnet de Pêche".
//
// ★ Sprint 90 : le `noindex` est ici, et PAS dans `page.tsx` comme le prévoyait le
// brief. `page.tsx` porte `'use client'` : un composant client ne peut pas exporter
// `metadata`, l'export aurait été silencieusement ignoré. C'est la même raison qui
// avait fait poser le `title` ici au sprint 9.5.
//
// Pourquoi `follow: false` alors que `/auth/login` garde `follow: true` : login est
// une page d'entrée réelle qui pointe vers l'inscription, elle a des liens à
// transmettre. Un formulaire de réinitialisation atteint par jeton n'en a aucun.
// Et pas de `disallow` dans robots.ts, à dessein : une page bloquée au crawl ne
// peut pas voir son noindex et resterait indexée.
export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
