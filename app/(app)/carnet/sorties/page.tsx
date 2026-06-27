import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus, Wind } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listMyOutings } from '@/lib/outings/list'
import { TagData } from '@/components/ui-v2/tag-data'
import { OutingListRow } from '@/components/outings/OutingListRow'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mes sorties · Carnet de Pêche',
}

export default async function MesSortiesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/carnet/sorties')

  const outings = await listMyOutings()
  const total = outings.length

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">

        {/* Retour au carnet */}
        <Link
          href="/carnet"
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-navy-900"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Retour au carnet
        </Link>

        {/* En-tête */}
        <header className="mb-5">
          <TagData>MES SORTIES</TagData>
          <h1 className="mt-1 font-display text-[26px] leading-tight text-navy-900 sm:text-[32px]">
            {total > 0
              ? `${total} sortie${total > 1 ? 's' : ''} loguée${total > 1 ? 's' : ''}`
              : 'Mes sorties'}
          </h1>
          <p className="mt-1 text-[14px] text-ink-600">
            Tes sorties de pêche, prises comme bredouilles. Partage celle dont tu es fier,
            sans jamais montrer tes spots.
          </p>
        </header>

        {/* Loguer une nouvelle sortie */}
        <Link
          href="/carnet/sortie"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-900 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          <Plus size={16} aria-hidden="true" /> Loguer une sortie
        </Link>

        {/* Liste ou état vide */}
        {total === 0 ? (
          <div className="rounded-[16px] border border-dashed border-sand-300 bg-white px-6 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <Wind size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-[16px] font-semibold text-navy-900">
              Aucune sortie loguée pour l&rsquo;instant
            </p>
            <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-600">
              Une sortie, c&rsquo;est ton dénominateur honnête. Même une bredouille compte, et
              rend tes statistiques plus justes.
            </p>
            <Link
              href="/carnet/sortie"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-500 px-5 text-[15px] font-bold text-navy-950 transition-colors hover:bg-teal-300"
            >
              <Plus size={17} aria-hidden="true" /> Logue ta première sortie
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {outings.map((o) => (
              <OutingListRow key={o.id} outing={o} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
