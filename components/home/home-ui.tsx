import Link from 'next/link'
import { ArrowRight, Compass, Fish, MapPin, Plus } from 'lucide-react'
import { TagData } from '@/components/ui-v2/tag-data'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// ─── Primitives présentationnelles du cockpit /home « Aujourd'hui » (sprint 30) ──
// Server components purs (aucun hook). Réutilisés par page.tsx + les sections async.

function todayLabel(): string {
  const s = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** En-tête du cockpit : « Aujourd'hui sur ta côte » + salut + date + département. */
export function TodayHeader({
  username,
  dept,
}: {
  username: string
  dept: string | null
}) {
  const deptLabel = dept ? DEPARTMENT_LABELS[dept] ?? null : null
  return (
    <header>
      <TagData>
        AUJOURD’HUI · {todayLabel()}
        {deptLabel ? ` · ${deptLabel.toUpperCase()}` : ''}
      </TagData>
      <h1 className="mt-1 font-display text-[26px] leading-tight text-navy-900 sm:text-[32px]">
        Salut {username} 👋
      </h1>
      <p className="mt-1 text-[15px] text-ink-600">
        {deptLabel
          ? `Ce qui bouge sur ta côte aujourd’hui, et ce que ton carnet en dit.`
          : `Choisis ta côte pour activer ton cockpit du jour.`}
      </p>
    </header>
  )
}

/** Carte de section avec titre mono + éventuel lien « voir tout ». */
export function CockpitSection({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string
  icon?: React.ReactNode
  action?: { href: string; label: string }
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[18px] border border-sand-200 bg-white p-5 sm:p-6 ${className ?? ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
          {icon}
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-teal-700 transition-all hover:gap-1.5"
          >
            {action.label} <ArrowRight size={13} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/** Squelette générique pour les fallbacks Suspense (paint immédiat, honnête). */
export function SectionSkeleton({ lines = 3, label }: { lines?: number; label?: string }) {
  return (
    <div
      className="rounded-[18px] border border-sand-200 bg-white p-5 sm:p-6"
      aria-busy="true"
      aria-label={label ?? 'Chargement…'}
    >
      <div className="mb-4 h-3 w-32 animate-pulse rounded bg-sand-200" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-sand-100" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}

/**
 * Nudge « Action du jour » — contextuel et honnête. Pas de coef inventé (Open-Meteo
 * n'expose pas le coef) : on encourage simplement à loguer la sortie du jour (même
 * bredouille → dénominateur honnête), ou on félicite si c'est déjà fait.
 */
export function ActionOfTheDay({ loggedToday }: { loggedToday: boolean }) {
  if (loggedToday) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-teal-500/30 bg-teal-50/60 px-4 py-3.5">
        <Fish size={18} className="shrink-0 text-teal-600" aria-hidden="true" />
        <p className="text-[14px] text-navy-900">
          Sortie du jour loguée. <span className="text-ink-600">C’est comme ça que ton carnet apprend.</span>
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-sand-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[14px] text-navy-900">
        Pas encore loguée, ta sortie du jour ?{' '}
        <span className="text-ink-600">Même bredouille, c’est ce qui fait parler ton carnet.</span>
      </p>
      <div className="flex shrink-0 gap-2">
        <Link
          href="/carnet/nouvelle"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-navy-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          <Plus size={14} /> Loguer
        </Link>
        <Link
          href="/carnet/sortie"
          className="inline-flex min-h-11 items-center rounded-full border border-sand-300 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-teal-500/50"
        >
          Noter une sortie
        </Link>
      </div>
    </div>
  )
}

/**
 * Cold start (0 prise) : on vend le futur sans mentir. La valeur du jour (conditions
 * + créneau générique) reste affichée en dessous ; ici on pousse l'amorçage du carnet.
 */
export function OnboardingBanner() {
  return (
    <div className="rounded-[18px] border border-teal-500/30 bg-gradient-to-br from-teal-50/80 to-white p-6 sm:p-7">
      <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
        <Compass size={13} /> Première étape
      </span>
      <h2 className="mt-2 font-display text-[20px] leading-tight text-navy-900 sm:text-[22px]">
        Dès 3 prises, ton carnet te dit OÙ et QUAND ça mord pour toi.
      </h2>
      <p className="mt-2 max-w-prose text-[14.5px] leading-relaxed text-ink-600">
        Le créneau et les conditions ci-dessous sont les mêmes pour tout le monde. Loguer tes
        prises (même les anciennes) fait apparaître <strong className="font-medium text-ink-700">tes
        propres tendances</strong> par-dessus : où et quand elles tombent vraiment.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/carnet/import"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-700 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-teal-800"
        >
          Importer mes prises <ArrowRight size={16} />
        </Link>
        <Link
          href="/carnet/nouvelle"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-ink-200 px-6 text-[15px] font-semibold text-navy-900 transition-colors hover:border-teal-500/50"
        >
          Loguer une prise
        </Link>
      </div>
    </div>
  )
}

/**
 * Sans département : on invite à choisir sa côte plutôt qu'un cockpit vide. Le
 * département s'attache dans le profil (persistant) ; on offre aussi un coup d'œil
 * au fil régional. (Réutilise le ton du sélecteur de /fil.)
 */
export function DeptChoosePrompt() {
  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-6 sm:p-7">
      <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
        <MapPin size={13} /> Ta côte
      </span>
      <h2 className="mt-2 font-display text-[20px] leading-tight text-navy-900 sm:text-[22px]">
        Choisis ta côte pour activer ton cockpit.
      </h2>
      <p className="mt-2 max-w-prose text-[14.5px] leading-relaxed text-ink-600">
        Ton compte n’a pas encore de département. Définis-le dans ton profil pour voir les
        conditions, le créneau du jour et ce qui bouge près de toi.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/profil"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-navy-900 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Définir mon département <ArrowRight size={16} />
        </Link>
        <Link
          href="/fil"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-ink-200 px-6 text-[15px] font-semibold text-navy-900 transition-colors hover:border-teal-500/50"
        >
          Explorer un fil régional
        </Link>
      </div>
    </div>
  )
}
