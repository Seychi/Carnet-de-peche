import '@/lib/zod-config'
import { z } from 'zod'

export type NearbySpot = {
  id: string
  slug: string
  name: string
  department: string
  distance_m: number
  techniques: string[]
  species: string[]
  difficulty: number
}

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(1).max(200).optional().default(50),
  // Espèces et techniques passées en virgule-separated : "bar,dorade"
  species: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : null)),
  techniques: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : null)),
})

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>
