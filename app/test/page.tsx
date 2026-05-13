export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createCatch } from '@/lib/catches/actions'
import { createClient } from '@/lib/supabase/server'

// ─── Server Action (déclenchée par le formulaire, pas au render) ──────────────

async function runTestAction() {
  'use server'
  const result = await createCatch({
    species: 'bar',
    technique: 'leurres',
    location_method: 'gps',
    latitude: 48.04,
    longitude: -4.73,
    size_cm: 52,
    weight_kg: 1.8,
    released: false,
    privacy: 'private',
    precise_for_friends: true,
    reveal_precise_to_public: false,
    caught_at: new Date().toISOString(),
    notes: 'Test DoD createCatch — Pointe du Raz',
  })

  if ('id' in result) {
    redirect(`/test?id=${result.id}`)
  } else {
    redirect(`/test?error=${encodeURIComponent(result.error)}`)
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ id?: string; error?: string }>

export default async function TestPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  let catchRow: Record<string, unknown> | null = null
  if (params.id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('catches')
      .select('id, species, caught_at, conditions, geom_public::text')
      .eq('id', params.id)
      .single()
    catchRow = data as Record<string, unknown>
  }

  const conditionsFilled =
    catchRow?.conditions !== null && catchRow?.conditions !== undefined
  const geomPublicFilled =
    catchRow?.['geom_public'] !== null && catchRow?.['geom_public'] !== undefined

  return (
    <div className="min-h-screen bg-sand-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <p className="text-[12px] font-semibold text-ink-500 uppercase tracking-widest mb-1">
            DoD — createCatch
          </p>
          <h1 className="text-2xl font-bold text-navy-900">Test Server Action</h1>
        </div>

        {/* Bouton de déclenchement */}
        {!params.id && !params.error && (
          <form action={runTestAction}>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-[8px] bg-teal-500 text-white text-[14px] font-semibold hover:bg-teal-600 transition-colors"
            >
              Créer une prise test (Pointe du Raz, bar)
            </button>
          </form>
        )}

        {/* Erreur de l'action */}
        {params.error && (
          <Section title="✗ Échec" ok={false}>
            <KV label="error" value={decodeURIComponent(params.error)} />
            {params.error === 'Non+authentifi%C3%A9' || params.error.includes('authentifi') ? (
              <p className="text-[13px] text-amber-700 mt-2">
                Connecte-toi sur{' '}
                <a href="/auth/login" className="underline font-medium">
                  /auth/login
                </a>{' '}
                puis reviens ici.
              </p>
            ) : null}
            <ResetLink />
          </Section>
        )}

        {/* Succès */}
        {params.id && catchRow && (
          <>
            <Section title="✓ Prise créée" ok>
              <KV label="id" value={params.id} />
            </Section>

            <Section
              title="Vérifications DoD"
              ok={conditionsFilled && geomPublicFilled}
            >
              <Check
                label="conditions rempli"
                ok={conditionsFilled}
                hint="Open-Meteo a répondu, snapshot stocké en jsonb"
              />
              <Check
                label="geom_public rempli"
                ok={geomPublicFilled}
                hint="trigger floutage 1 km exécuté à l'INSERT"
              />
              {geomPublicFilled && (
                <KV
                  label="geom_public (WKT)"
                  value={String(catchRow['geom_public'])}
                />
              )}
            </Section>

            <Section title="Ligne insérée (catches)" ok>
              <KV label="species" value={String(catchRow.species)} />
              <KV label="caught_at" value={String(catchRow.caught_at)} />
              <div className="mt-3">
                <p className="text-[11px] text-ink-500 uppercase tracking-wide mb-1">
                  conditions (jsonb)
                </p>
                <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto whitespace-pre-wrap text-ink-700 leading-relaxed">
                  {JSON.stringify(catchRow.conditions, null, 2)}
                </pre>
              </div>
            </Section>

            <ResetLink />
          </>
        )}

      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({
  title,
  ok,
  children,
}: {
  title: string
  ok: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-[14px] border p-5 space-y-2 ${
        ok ? 'border-teal-200 bg-white' : 'border-red-200 bg-red-50'
      }`}
    >
      <p
        className={`text-[12px] font-semibold uppercase tracking-wide ${
          ok ? 'text-teal-600' : 'text-red-500'
        }`}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function Check({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <span className={ok ? 'text-teal-500' : 'text-red-400'}>{ok ? '✓' : '✗'}</span>
      <div>
        <span className={`font-medium ${ok ? 'text-ink-900' : 'text-red-700'}`}>
          {label}
        </span>
        <span className="text-ink-400 ml-2">{hint}</span>
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-[13px]">
      <span className="text-ink-400 shrink-0">{label}</span>
      <span className="font-mono text-ink-800 break-all">{value}</span>
    </div>
  )
}

function ResetLink() {
  return (
    <a
      href="/test"
      className="inline-block text-[12px] text-ink-400 underline underline-offset-2 hover:text-ink-700"
    >
      Nouveau test
    </a>
  )
}
