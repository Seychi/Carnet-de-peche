import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/ui-v2/Logo";

// /auth/login et /auth/reset-password sont des client components → leur <title>
// doit être défini ici (server). `default` couvre /auth/login (pas de title propre).
export const metadata: Metadata = {
  title: {
    template: "%s · Carnet de Pêche",
    default: "Connexion · Carnet de Pêche",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      {/* Header minimal */}
      <header className="px-5 py-4 flex justify-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-bold text-[17px] text-navy-900 min-h-[44px]"
        >
          <Logo size={34} variant="light" className="shrink-0" />
          <span>Carnet de Pêche</span>
        </Link>
      </header>

      {/* Contenu centré */}
      <main className="flex-1 flex items-center justify-center px-5 py-8">
        {children}
      </main>

      {/* Footer minimaliste */}
      <footer className="px-5 py-4 text-center text-[12px] text-ink-500">
        © 2026 Carnet de Pêche ·{" "}
        <Link href="#" className="hover:text-navy-900 transition-colors">
          CGU
        </Link>{" "}
        ·{" "}
        <Link href="#" className="hover:text-navy-900 transition-colors">
          Confidentialité
        </Link>
      </footer>
    </div>
  );
}
