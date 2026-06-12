import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiement annulé — Carnet de Pêche",
};

// Atterrissage si l'utilisateur quitte le Checkout sans finaliser.
// Pas de culpabilisation, pas de tracking : juste une porte de retour.
export default function CheckoutCancelPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-3">Tu as annulé</h1>
      <p className="text-ink-700 mb-8">
        Pas de souci. Quand tu veux revenir, les formules t&rsquo;attendent.
      </p>
      <Link
        href="/tarifs"
        className="inline-block px-6 py-3 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm transition-colors duration-200"
      >
        Revoir les formules
      </Link>
    </main>
  );
}
