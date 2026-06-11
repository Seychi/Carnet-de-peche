import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle, Lock, Bug } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact — Carnet de Pêche',
  description:
    'Une question sur l\'app, ton compte, ou tes données ? Écris-nous à contact@carnet-de-peche.com, réponse sous 24h.',
}

const channels = [
  {
    Icon: MessageCircle,
    title: 'Question produit',
    desc: 'Un doute sur une fonctionnalité, un abonnement, ou comment loguer une prise.',
    href: 'mailto:contact@carnet-de-peche.com?subject=Question%20produit',
  },
  {
    Icon: Lock,
    title: 'Demande RGPD',
    desc: 'Accès, rectification ou suppression de tes données personnelles.',
    href: 'mailto:contact@carnet-de-peche.com?subject=Demande%20RGPD',
  },
  {
    Icon: Bug,
    title: 'Bug ou suggestion',
    desc: 'Un truc cassé ou une idée pour améliorer le carnet ? On veut savoir.',
    href: 'mailto:contact@carnet-de-peche.com?subject=Bug%2Fsuggestion',
  },
]

export default function ContactPage() {
  return (
    <main className="bg-sand-50 min-h-screen py-20">
      <div className="max-w-[680px] mx-auto px-6">
        <div className="text-center">
          <h1 className="font-display text-4xl text-navy-900 mb-4">Contact</h1>
          <p className="text-lg text-ink-700 leading-relaxed mb-10">
            Une question, un signalement, une demande RGPD ? Écris-nous, on
            répond sous 24h.
          </p>
        </div>

        {/* Encadré email mis en avant */}
        <div className="rounded-[22px] border border-teal-500/25 bg-teal-500/10 p-8 text-center mb-10">
          <p className="text-sm text-ink-700 mb-2">Écris-nous directement à</p>
          <p className="font-display text-2xl text-navy-900 mb-6 break-all">
            contact@carnet-de-peche.com
          </p>
          <a
            href="mailto:contact@carnet-de-peche.com"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-[15px] text-white bg-navy-900 min-h-[48px]"
          >
            Ouvrir mon client mail
          </a>
        </div>

        {/* Canaux par sujet */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {channels.map((c) => (
            <a
              key={c.title}
              href={c.href}
              className="flex flex-col gap-2 rounded-[14px] border border-ink-900/10 bg-white p-5 transition-colors duration-150 hover:border-teal-500/40"
            >
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-[10px] bg-sand-100 text-navy-900"
              >
                <c.Icon size={20} strokeWidth={1.7} />
              </span>
              <span className="font-semibold text-navy-900 text-[15px]">
                {c.title}
              </span>
              <span className="text-sm text-ink-700 leading-relaxed">
                {c.desc}
              </span>
            </a>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-ink-700 underline underline-offset-4 transition-colors duration-150 hover:text-navy-900"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
