import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fil régional — Bientôt disponible · Carnet de Pêche',
  description:
    'Le fil régional des pêcheurs à la canne du bord en France arrive bientôt. Inscris-toi pour être notifié au lancement.',
}

export default function FilPage() {
  return (
    <main className="bg-sand-50 min-h-screen py-20">
      <div className="max-w-[680px] mx-auto px-6 text-center">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[.08em] uppercase text-teal-600 rounded-full px-3.5 py-1.5 border border-teal-500/25 bg-teal-500/10 mb-6">
          Bientôt disponible
        </span>
        <h1 className="font-display text-4xl text-navy-900 mb-4">Fil régional</h1>
        <p className="text-lg text-ink-700 leading-relaxed mb-8">
          Bientôt : un fil par département pour échanger entre pêcheurs locaux —
          prises récentes, conditions du jour, alertes spots. Tu pourras lire
          gratuitement dès le lancement.
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
