import { notFound } from 'next/navigation'
import { SeedFeedButton } from './seed-feed-button'
import { SEED_AUTHORS, SEED_POSTS } from '@/lib/feed/seed-data'

// force-dynamic + garde NODE_ENV : la page n'existe qu'en dev/preview.
export const dynamic = 'force-dynamic'

export default function SeedFeedDevPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="bg-sand-50 min-h-screen">
      <div className="mx-auto max-w-[680px] px-4 py-10 flex flex-col gap-4">
        <h1 className="font-display text-2xl text-navy-900">Seed du fil (dev)</h1>
        <p className="text-[14px] text-ink-600">
          Insère {SEED_AUTHORS.length} pêcheurs de seed et {SEED_POSTS.length} posts (Bretagne,
          dépts 29/56/22) répartis sur les 14 derniers jours. Idempotent. Réservé au
          développement / preview — jamais en production.
        </p>
        <SeedFeedButton />
        <p className="text-[12px] text-ink-400">
          Équivalent SQL : <code>supabase/seed_sprint_8.sql</code> (pour psql / preview branch).
        </p>
      </div>
    </main>
  )
}
