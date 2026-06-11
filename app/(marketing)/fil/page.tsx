import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MapPin, MessageCircle, UserPlus, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Fil régional · Carnet de Pêche',
  description:
    "Le fil des pêcheurs à la canne du bord de ton département : prises récentes, conditions du jour, échanges entre passionnés — sans donner tes coins secrets. Crée ton compte pour rejoindre le fil de ta côte.",
  alternates: { canonical: '/fil' },
  openGraph: {
    title: 'Le fil des pêcheurs de ton département',
    description:
      'Prises récentes, conditions du jour et échanges entre pêcheurs à la canne du bord, à l’échelle de ta côte.',
  },
}

const STEPS = [
  {
    icon: <MapPin size={22} />,
    title: 'Le bord, près de chez toi',
    body: 'Chaque département côtier a son fil. Tu vois les prises récentes, les conditions du jour et l’activité sur tes spots — à l’échelle de ta côte, pas un flux mondial sans intérêt.',
  },
  {
    icon: <MessageCircle size={22} />,
    title: 'Partage le savoir, pas les spots',
    body: 'Poste tes prises, échange tes montages et tes techniques, pose tes questions. Toute prise publique est floutée dans un rayon d’1 km : anti spot-burning par défaut.',
  },
  {
    icon: <UserPlus size={22} />,
    title: 'Suis les pêcheurs de ton coin',
    body: 'Abonne-toi aux profils qui t’inspirent, retrouve leurs sorties dans ton fil « Suivis » et construis ton réseau local de passionnés.',
  },
]

export default async function FilTeaserPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Connecté → on l'envoie vers son fil départemental (comportement historique).
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('home_department')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.home_department) redirect(`/fil/${profile.home_department}`)
    redirect('/profil')
  }

  // Anonyme → teaser public (évite le soft-404 du sitemap + capte les visiteurs froids).
  return (
    <div className="bg-sand-50 text-ink-900 font-sans">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
        style={{
          background: `
            radial-gradient(at 15% 20%, rgba(20,184,166,.15), transparent 50%),
            radial-gradient(at 85% 80%, rgba(10,47,61,.1), transparent 50%),
            linear-gradient(180deg, var(--sand-50) 0%, #fff 100%)
          `,
        }}
      >
        <div className="relative mx-auto max-w-[760px] px-5 text-center">
          <span
            className="inline-flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold tracking-[.04em] uppercase text-teal-600 rounded-full px-3.5 py-1.5 border border-teal-500/25"
            style={{ background: 'rgba(20,184,166,.1)' }}
          >
            <MapPin size={13} />
            La communauté
          </span>

          <h1 className="mt-5 mb-5">
            Le fil des pêcheurs de{' '}
            <span className="text-teal-600">ton département</span>.
          </h1>

          <p className="text-[16px] sm:text-[18px] text-ink-700 leading-relaxed mx-auto max-w-[620px]">
            Ce qui se passe sur le bord près de chez toi : prises récentes, conditions du jour,
            montages qui marchent. Un fil par département côtier — bar, dorade, lieu, maquereau,
            sar, orphie. Tu partages le savoir, pas tes coins secrets.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link
              href="/auth/register"
              className="flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] w-full sm:w-auto px-6 min-h-[52px]"
              style={{ background: 'var(--navy-900)', color: '#fff', boxShadow: '0 6px 24px rgba(10,47,61,.14)' }}
            >
              Crée ton compte pour rejoindre ton fil
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/carte"
              className="flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] text-navy-900 border-[1.5px] border-ink-200 w-full sm:w-auto px-6 min-h-[52px]"
            >
              Voir la carte
            </Link>
          </div>
          <p className="text-[13px] text-ink-500 mt-4">
            100&nbsp;% gratuit. Poste, commente, like et suis dès l’inscription.
          </p>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ─────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1100px] px-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {STEPS.map((step) => (
              <div key={step.title} className="bg-white rounded-[22px] p-6 sm:p-7 border border-ink-100">
                <div
                  className="w-12 h-12 rounded-[12px] grid place-items-center mb-4 text-teal-600"
                  style={{ background: 'linear-gradient(135deg, rgba(20,184,166,.15), rgba(20,184,166,.05))' }}
                >
                  {step.icon}
                </div>
                <h3 className="mb-2">{step.title}</h3>
                <p className="text-ink-700 text-[15px] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────────── */}
      <section className="pb-20">
        <div className="mx-auto max-w-[1100px] px-5">
          <div
            className="rounded-[28px] px-6 py-12 sm:py-14 text-white text-center relative overflow-hidden"
            style={{
              background:
                'radial-gradient(at 20% 50%, rgba(20,184,166,.4), transparent 50%), linear-gradient(135deg, var(--navy-900), var(--navy-700))',
            }}
          >
            <h2 className="relative text-white">Rejoins le fil de ta côte.</h2>
            <p className="relative mt-3 mb-7 max-w-[520px] mx-auto text-[15px] sm:text-[16px] text-white/80 leading-relaxed">
              Crée ton carnet gratuit, choisis ton département, et découvre ce qui mord en ce moment
              près de chez toi.
            </p>
            <Link
              href="/auth/register"
              className="relative inline-flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] sm:text-[16px] min-h-[52px] px-7"
              style={{ background: 'var(--teal-700)', color: '#fff', boxShadow: '0 6px 18px rgba(15,118,110,.4)' }}
            >
              Créer mon carnet
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
