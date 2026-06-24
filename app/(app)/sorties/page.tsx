import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDeptProposals, getMyParticipationMap, getProposalParticipants } from '@/lib/cofishing/queries'
import { OutingComposer } from '@/components/cofishing/OutingComposer'
import { ProposalCard } from '@/components/cofishing/ProposalCard'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Co-pêchage — sorties à plusieurs · Carnet de Pêche',
}

export default async function SortiesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/sorties')

  const { data: profile } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', user.id)
    .maybeSingle()

  const dept = profile?.home_department?.trim() ?? null

  const proposals = dept ? await getDeptProposals(dept) : []
  const participation = await getMyParticipationMap(proposals.map((p) => p.id))

  // Participants (demandes) seulement pour les sorties que J'héberge.
  const hosted = proposals.filter((p) => p.host_id === user.id)
  const participantsByProposal: Record<string, Awaited<ReturnType<typeof getProposalParticipants>>> = {}
  await Promise.all(
    hosted.map(async (p) => {
      participantsByProposal[p.id] = await getProposalParticipants(p.id)
    }),
  )

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-[24px] font-bold text-navy-900">
            <Users size={22} className="text-teal-600" /> Co-pêchage
          </h1>
          <p className="mt-1 text-[14px] text-ink-500">
            {dept
              ? `Sorties à plusieurs dans le ${DEPARTMENT_LABELS[dept] ?? dept}. Tu cales le point de RDV exact avec tes participants en privé (message, hors appli) — aucune coordonnée n'est partagée ici.`
              : 'Définis ton département principal dans ton profil pour voir et proposer des sorties.'}
          </p>
        </header>

        {!dept ? (
          <Link href="/profil" className="inline-block text-[14px] font-semibold text-teal-600 hover:text-teal-700">
            Compléter mon profil →
          </Link>
        ) : (
          <>
            <div className="mb-6">
              <OutingComposer defaultDepartment={dept} />
            </div>

            {proposals.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-sand-300 bg-white px-5 py-10 text-center">
                <p className="text-[15px] text-ink-600">
                  Aucune sortie prévue dans le {DEPARTMENT_LABELS[dept] ?? dept} pour l’instant.
                </p>
                <p className="mt-1 text-[13px] text-ink-400">
                  Sois le premier à en proposer une — les pêcheurs de ton coin recevront le signal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    viewerId={user.id}
                    participationStatus={participation[p.id]}
                    participants={p.host_id === user.id ? participantsByProposal[p.id] : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
