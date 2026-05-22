import type { Metadata } from "next";

// La page reset-password est un client component → title défini ici (server).
// Le template du layout /auth parent produit "Nouveau mot de passe · Carnet de Pêche".
export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
