import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, BarChart2, Layers } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Carte des spots de pêche — Carnet de Pêche',
  description: "Carte intelligente des spots de pêche à la canne du bord en France. Score d'activité 0-100, filtres espèces et techniques, couches météo et marées.",
}

const features = [
  {
    icon: <BarChart2 size={22} className="text-teal-600" strokeWidth={1.75} />,
    title: 'Score 0-100 calibré sur les vraies prises',
    description: "L'algorithme apprend des prises loguées par la communauté, actualisé en continu.",
  },
  {
    icon: <MapPin size={22} className="text-teal-600" strokeWidth={1.75} />,
    title: 'Filtres espèces + techniques',
    description: 'Bar, dorade, lieu jaune, maquereau — filtre par espèce et par technique en temps réel.',
  },
  {
    icon: <Layers size={22} className="text-teal-600" strokeWidth={1.75} />,
    title: 'Couches météo et marées',
    description: 'Superpose vent, houle, courants et coefficients de marée directement sur la carte.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Ouvre la carte',
    description: "Accède à la carte depuis l'app ou le web. Ton département est chargé en priorité.",
  },
  {
    n: '02',
    title: 'Filtre selon ta session',
    description: 'Choisis ton espèce cible et ta technique. La carte se met à jour instantanément.',
  },
  {
    n: '03',
    title: 'Consulte le score',
    description: "Chaque spot affiche un score d'activité basé sur les prises récentes de la communauté.",
  },
  {
    n: '04',
    title: 'Logue ta prise',
    description: 'Après ta session, logue ta prise. Tu alimentes la carte pour toute la communauté.',
  },
]

export default function CartePage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-navy-900 pt-20 pb-24 text-center overflow-hidden relative">
        {/* Halo décoratif */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(20,184,166,0.15) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-6">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            Carte interactive disponible en juin 2026
          </span>
          <h1 className="text-white font-display max-w-2xl mx-auto">
            La carte qui apprend
          </h1>
          <p className="mt-5 text-lg text-white/60 max-w-xl mx-auto">
            Chaque prise loguée rend la carte plus précise. Plus la communauté grandit, plus les scores sont fiables.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="inline-block px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-[12px] transition-colors duration-200"
            >
              Démarrer gratuitement
            </Link>
            <a
              href="#comment-ca-marche"
              className="inline-block px-8 py-3.5 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-semibold rounded-[12px] transition-colors duration-200"
            >
              Voir comment ça marche
            </a>
          </div>
        </div>
      </section>

      {/* Aperçu visuel */}
      <section className="bg-ink-900 py-16">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="rounded-[22px] overflow-hidden border border-white/10 aspect-video bg-navy-800 flex items-center justify-center">
            <div className="text-center text-white/40">
              <MapPin size={48} strokeWidth={1} className="mx-auto mb-4 text-teal-500/40" />
              <p className="text-sm">Aperçu de la carte · disponible en juin 2026</p>
            </div>
          </div>
          <p className="text-center text-xs text-white/30 mt-4">
            Aperçu non contractuel — l'interface finale peut différer.
          </p>
        </div>
      </section>

      {/* 3 features */}
      <section className="bg-sand-50 py-20">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-ink-100 rounded-[18px] p-8">
                <div className="w-10 h-10 bg-teal-500/10 rounded-[10px] flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="font-display text-navy-900 text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="bg-white py-20 scroll-mt-8">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">
              Simple à utiliser
            </p>
            <h2 className="font-display text-navy-900">Comment ça marche</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.n} className="flex flex-col gap-4">
                <span className="text-4xl font-display font-bold text-ink-100">{step.n}</span>
                <h3 className="font-semibold text-navy-900 text-base">{step.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-teal-600 py-16">
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <h2 className="text-white font-display mb-4">
            Rejoins la liste d'attente
          </h2>
          <p className="text-white/80 mb-8">
            La carte interactive est en cours de développement. Crée ton carnet gratuit maintenant et tu y auras accès dès le lancement.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3.5 bg-white text-teal-700 hover:bg-sand-50 font-semibold rounded-[12px] transition-colors duration-200"
          >
            Créer mon carnet gratuit
          </Link>
        </div>
      </section>
    </main>
  )
}
