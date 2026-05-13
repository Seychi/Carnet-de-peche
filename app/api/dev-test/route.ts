import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMyCatches } from '@/lib/catches/queries'
import { catchFiltersSchema } from '@/lib/catches/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const filters = catchFiltersSchema.parse({})
  const result = await getMyCatches(filters)

  console.log('[DEV] user:', user.email)
  console.log('[DEV] totalCount:', result.totalCount)
  console.log('[DEV] catches:', JSON.stringify(result.catches, null, 2))

  return NextResponse.json(result)
}
