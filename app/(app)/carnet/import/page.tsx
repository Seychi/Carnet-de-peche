import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BulkCatchImport } from '@/components/catches/BulkCatchImport'

export const metadata: Metadata = {
  title: 'Ajouter mes prises passées — Carnet de Pêche',
}

export default async function CarnetImportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/carnet/import')

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <header className="mb-5">
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            MON CARNET · IMPORT
          </p>
          <h1 className="mt-1 font-display text-[26px] leading-tight text-navy-900 sm:text-[30px]">
            Ajoute tes prises passées
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-600">
            Amorce ton carnet en quelques secondes : espèce, date, taille, et le département où tu as
            pêché. On récupère la météo et la marée de chaque jour automatiquement (pour les prises
            récentes). Plus tu en ajoutes, plus tes tendances perso s&apos;affinent.
          </p>
        </header>
        <BulkCatchImport />
      </div>
    </div>
  )
}
