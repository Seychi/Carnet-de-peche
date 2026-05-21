import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Techniques — Bientôt disponible · Carnet de Pêche',
  description:
    'Leurres, surfcasting, pêche à la flottante, vif : les guides techniques pour la pêche à la canne du bord arrivent bientôt. Inscris-toi pour être notifié.',
}

export default function TechniquesPage() {
  return (
    <main className="bg-sand-50 min-h-screen py-20">
      <div className="max-w-[680px] mx-auto px-6 text-center">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[.08em] uppercase text-teal-600 rounded-full px-3.5 py-1.5 border border-teal-500/25 bg-teal-500/10 mb-6">
          Bientôt disponible
        </span>
        <h1 className="font-display text-4xl text-navy-900 mb-4">Toutes les techniques</h1>
        <p className="text-lg text-ink-700 leading-relaxed mb-8">
          Bientôt : des guides dédiés aux leurres, au surfcasting, à la pêche à la
          flottante et au vif — matériel, montages et conditions idéales pour chaque
          approche depuis le bord.
        </p>
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-[15px] text-white bg-navy-900 min-h-[48px]"
        >
          Crée ton carnet — sois prévenu
        </Link>
      </div>
    </main>
  )
}
