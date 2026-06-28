'use client'

import { useState, useTransition, useCallback, useMemo, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  ShieldCheck,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { curateSpotSchema, type CurateSpotInput } from '@/lib/spots/curate-schema'
import { curateSpot, moderateRejectSpot, checkSpotDuplicate } from '@/app/actions/spots'
import {
  SPECIES_LABELS,
  TECHNIQUE_LABELS,
  STRUCTURE_LABELS,
  HAZARDS_LABELS,
} from '@/lib/labels'
import { CARNET_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// MapLibre (~400 KB) lazy-chargé : même pattern que ProposeSpotForm.
const SpotLocationPicker = dynamic(() => import('@/components/spots/SpotLocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full animate-pulse rounded-[14px] border border-sand-200 bg-ink-100" />
  ),
})

// Listes (sources uniques du référentiel) ----------------------------------
const TECHNIQUES = ['leurres', 'surfcasting', 'flottante', 'vif'] as const
const STRUCTURES = ['digue', 'plage', 'pointe_rocheuse', 'estuaire', 'cale', 'passe', 'cassure'] as const
const DIFFICULTIES = [1, 2, 3, 4, 5] as const
const HAZARD_KEYS = Object.keys(HAZARDS_LABELS)
// Liste COMPLÈTE des 26 espèces du carnet (pas le max(6) de la proposition).
const ALL_SPECIES = CARNET_SPECIES_DB_KEYS

const chipBase = 'min-h-[44px] rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors'
const chipOn = 'border-teal-500 bg-teal-500/10 text-teal-700'
const chipOff = 'border-sand-200 bg-white text-ink-600 hover:border-ink-300'
// Danger : on évite l'info par la couleur seule (John daltonien) → libellé + icône.
const chipHazardOn = 'border-coral-500 bg-coral-500/10 text-coral-600'

// Centres de carte par département côtier (fallback quand on ne peut pas réafficher
// le point OSM précis, verrouillé au niveau colonne). Le modérateur place le pin
// vérifié à la main. Approximations [lng, lat] sur la côte du département.
const DEPT_CENTERS: Record<string, [number, number]> = {
  '14': [-0.35, 49.32],
  '17': [-1.15, 45.95],
  '22': [-2.95, 48.62],
  '29': [-4.35, 48.25],
  '33': [-1.18, 44.7],
  '35': [-1.85, 48.6],
  '40': [-1.3, 43.95],
  '44': [-2.2, 47.25],
  '50': [-1.6, 49.3],
  '56': [-3.0, 47.55],
  '59': [2.35, 51.02],
  '62': [1.6, 50.7],
  '64': [-1.55, 43.45],
  '76': [0.45, 49.8],
  '85': [-1.95, 46.5],
  '06': [7.15, 43.65],
  '11': [3.05, 43.1],
  '13': [5.1, 43.25],
  '30': [4.15, 43.5],
  '34': [3.6, 43.3],
  '66': [3.05, 42.6],
  '83': [6.2, 43.1],
  '2A': [8.85, 41.85],
  '2B': [9.4, 42.65],
}
const FRANCE_FALLBACK: [number, number] = [-2.5, 47.0]

export type ImportToCurate = {
  id: string
  name: string
  department: string
  structure: string | null
  species: string[] | null
  techniques: string[] | null
  description: string | null
  access_notes: string | null
}

type Props = {
  spot: ImportToCurate
  /** Passe à l'import suivant du même département après curage/rejet (ergonomie). */
  onDone?: () => void
}

export default function CurateSpotForm({ spot, onDone }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejecting, startReject] = useTransition()
  const [done, setDone] = useState<null | 'curated' | 'rejected'>(null)
  const [dupName, setDupName] = useState<string | null>(null)
  // Statut de récupération de la coordonnée OSM (RPC modérateur get_pending_import_location).
  // 'loading' au montage → 'osm' si une coord est revenue (pin posé), 'fallback' si 0 ligne
  // (dept-centré, le modérateur place le point à la main).
  const [coordStatus, setCoordStatus] = useState<'loading' | 'osm' | 'fallback'>('loading')
  const [osmCenter, setOsmCenter] = useState<[number, number] | null>(null)

  const dept = spot.department.trim()
  const fallbackCenter = useMemo<[number, number]>(
    () => DEPT_CENTERS[dept] ?? FRANCE_FALLBACK,
    [dept],
  )

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CurateSpotInput>({
    resolver: zodResolver(curateSpotSchema),
    defaultValues: {
      // Pré-rempli depuis l'OSM (colonnes lisibles). La coordonnée OSM précise est
      // verrouillée (colonne geom non SELECT pour le modérateur) : on ne peut pas la
      // réafficher. Si le modérateur ne pose pas de point, le geom OSM existant est
      // conservé tel quel par curateSpot (lat/lng restent undefined).
      name: spot.name ?? '',
      structure: spot.structure as CurateSpotInput['structure'],
      species: (spot.species ?? []) as CurateSpotInput['species'],
      techniques: (spot.techniques ?? []).slice(0, 4) as CurateSpotInput['techniques'],
      hazards: [],
      visibility: 'public',
      access_notes: spot.access_notes ?? '',
      description: spot.description ?? '',
    },
  })

  const lat = watch('latitude')
  const lng = watch('longitude')
  const hasPoint = typeof lat === 'number' && typeof lng === 'number'

  // Au montage : récupère la coordonnée OSM précise via la RPC modérateur-only
  // (get_pending_import_location, SECURITY DEFINER gatée is_moderator()). Si une coord
  // revient, on POSE le pin dessus (point de départ = position OSM affichée) et on
  // pré-remplit latitude/longitude → « Valider » atteste la position vue telle quelle.
  // 0 ligne (non-modérateur, ou spot non importé/non pending) → repli dept-centré.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_pending_import_location', {
          p_spot_id: spot.id,
        })
        if (!alive) return
        const row = data?.[0]
        if (error || !row || typeof row.lat !== 'number' || typeof row.lng !== 'number') {
          setCoordStatus('fallback')
          return
        }
        setOsmCenter([row.lng, row.lat])
        setValue('latitude', row.lat, { shouldValidate: false })
        setValue('longitude', row.lng, { shouldValidate: false })
        setCoordStatus('osm')
      } catch {
        if (alive) setCoordStatus('fallback')
      }
    })()
    return () => {
      alive = false
    }
    // Montage unique pour ce spot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot.id])

  const setPoint = useCallback(
    (nlat: number, nlng: number) => {
      setValue('latitude', nlat, { shouldValidate: true })
      setValue('longitude', nlng, { shouldValidate: true })
      // Doublon de proximité (informatif, non bloquant).
      checkSpotDuplicate(nlat, nlng).then((res) => {
        const name = res.ok ? (res.data?.name ?? null) : null
        // N'alerte pas si le doublon est le spot lui-même.
        setDupName(name && name !== spot.name ? name : null)
      })
    },
    [setValue, spot.name],
  )

  // « Revenir à la position OSM » : remet le pin sur la coord OSM de départ (si connue),
  // sinon retire le point (cas repli dept-centré).
  const resetToOsm = useCallback(() => {
    if (osmCenter) {
      setValue('latitude', osmCenter[1], { shouldValidate: false })
      setValue('longitude', osmCenter[0], { shouldValidate: false })
    } else {
      setValue('latitude', undefined, { shouldValidate: true })
      setValue('longitude', undefined, { shouldValidate: true })
    }
    setDupName(null)
  }, [setValue, osmCenter])

  const useMyPosition = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation indisponible sur cet appareil.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPoint(pos.coords.latitude, pos.coords.longitude),
      () => toast.error('Impossible de récupérer ta position.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [setPoint])

  const onSubmit = (values: CurateSpotInput) => {
    startTransition(async () => {
      const res = await curateSpot(spot.id, values)
      if (res.ok) {
        setDone('curated')
        toast.success('Spot curé, vérifié et publié sur la carte 🎣')
        router.refresh()
        onDone?.()
      } else {
        toast.error(res.error)
      }
    })
  }

  const onReject = () => {
    startReject(async () => {
      const res = await moderateRejectSpot(spot.id)
      if (res.ok) {
        setDone('rejected')
        toast.success('Import rejeté.')
        router.refresh()
        onDone?.()
      } else {
        toast.error(res.error)
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-[18px] border border-teal-500/30 bg-teal-500/5 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-teal-600" size={32} aria-hidden="true" />
        <p className="text-[15px] font-semibold text-navy-900">
          {done === 'curated'
            ? 'Import curé. Il apparaît sur la carte, enrichi et vérifié.'
            : 'Import rejeté. Il a quitté le backlog.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* En-tête : provenance OSM */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-sand-200 bg-sand-50 px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
          <ShieldCheck size={14} className="text-navy-900" aria-hidden="true" />
          Import OpenStreetMap ·{' '}
          <span className="font-mono font-medium text-ink-700">{dept}</span>{' '}
          {DEPARTMENT_LABELS[dept] ?? ''}
        </span>
        <span className="text-[11px] text-ink-400">
          Curer = enrichir <strong>et</strong> vérifier (publie le spot)
        </span>
      </div>

      {/* Nom */}
      <div>
        <label htmlFor={`name-${spot.id}`} className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Nom du spot
        </label>
        <input
          id={`name-${spot.id}`}
          {...register('name')}
          autoComplete="off"
          placeholder="Ex. Jetée du port de Lampaul"
          className="w-full rounded-[12px] border border-sand-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-teal-500"
        />
        {errors.name && <p className="mt-1 text-[12px] text-coral-500">{errors.name.message}</p>}
      </div>

      {/* Structure (requise) */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">Type de structure</span>
        <Controller
          name="structure"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {STRUCTURES.map((s) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={field.value === s}
                  onClick={() => field.onChange(s)}
                  className={`${chipBase} ${field.value === s ? chipOn : chipOff}`}
                >
                  {STRUCTURE_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        />
        {errors.structure && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.structure.message}</p>
        )}
      </div>

      {/* Position : vérifier / corriger la coordonnée */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-navy-900">Coordonnée vérifiée</span>
          <button
            type="button"
            onClick={useMyPosition}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1 text-[12px] font-medium text-ink-600 hover:border-ink-300"
          >
            <LocateFixed size={13} aria-hidden="true" />
            Ma position
          </button>
        </div>
        <p className="mb-2 text-[12px] leading-snug text-ink-500">
          {coordStatus === 'loading'
            ? 'Récupération de la position OSM…'
            : coordStatus === 'osm'
              ? 'La position OpenStreetMap est affichée. Vérifie-la sur le fond satellite : confirme-la telle quelle, ou déplace le point pour la corriger. Valider atteste la coordonnée vue.'
              : 'Position OSM indisponible ici. Place le point vérifié sur la carte (satellite), puis valide.'}
        </p>
        <SpotLocationPicker
          value={hasPoint ? { lat: lat as number, lng: lng as number } : null}
          onChange={setPoint}
          initialCenter={osmCenter ?? fallbackCenter}
        />
        {hasPoint && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
              <MapPin size={12} aria-hidden="true" />
              <span className="font-mono">
                {(lat as number).toFixed(5)}, {(lng as number).toFixed(5)}
              </span>
            </p>
            {osmCenter && (lat !== osmCenter[1] || lng !== osmCenter[0]) && (
              <button
                type="button"
                onClick={resetToOsm}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-500 underline-offset-2 hover:underline"
              >
                <X size={12} aria-hidden="true" />
                Revenir à la position OSM
              </button>
            )}
          </div>
        )}
        {errors.latitude && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.latitude.message}</p>
        )}
        {dupName && (
          <p className="mt-2 inline-flex items-start gap-1.5 rounded-[10px] border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-[12px] text-ink-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold-600" aria-hidden="true" />
            Un spot existe déjà tout près : « {dupName} ». Vérifie que ce n’est pas un doublon.
          </p>
        )}
      </div>

      {/* Espèces (liste complète des 26) */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Espèces qu’on y prend <span className="font-normal text-ink-400">(optionnel)</span>
        </span>
        <Controller
          name="species"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ALL_SPECIES.map((s) => {
                const on = field.value?.includes(s) ?? false
                return (
                  <button
                    type="button"
                    key={s}
                    aria-pressed={on}
                    onClick={() =>
                      field.onChange(
                        on
                          ? (field.value ?? []).filter((v) => v !== s)
                          : [...(field.value ?? []), s],
                      )
                    }
                    className={`${chipBase} ${on ? chipOn : chipOff}`}
                  >
                    {SPECIES_LABELS[s] ?? s}
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* Techniques (max 4) */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Techniques <span className="font-normal text-ink-400">(optionnel, max 4)</span>
        </span>
        <Controller
          name="techniques"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {TECHNIQUES.map((t) => {
                const on = field.value?.includes(t) ?? false
                const atMax = (field.value?.length ?? 0) >= 4
                return (
                  <button
                    type="button"
                    key={t}
                    aria-pressed={on}
                    disabled={!on && atMax}
                    onClick={() =>
                      field.onChange(
                        on
                          ? (field.value ?? []).filter((v) => v !== t)
                          : [...(field.value ?? []), t],
                      )
                    }
                    className={`${chipBase} ${on ? chipOn : chipOff} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {TECHNIQUE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.techniques && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.techniques.message}</p>
        )}
      </div>

      {/* Difficulté (1-5) — boutons segmentés, libellé chiffré (pas que la couleur) */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Difficulté d’accès <span className="font-normal text-ink-400">(optionnel)</span>
        </span>
        <Controller
          name="difficulty"
          control={control}
          render={({ field }) => (
            <div className="inline-flex flex-wrap gap-2" role="group" aria-label="Difficulté de 1 à 5">
              {DIFFICULTIES.map((d) => {
                const on = field.value === d
                return (
                  <button
                    type="button"
                    key={d}
                    aria-pressed={on}
                    onClick={() => field.onChange(on ? undefined : d)}
                    className={`min-h-[44px] min-w-[44px] rounded-[12px] border px-3.5 py-1.5 font-mono text-[15px] font-semibold transition-colors ${
                      on ? chipOn : chipOff
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          )}
        />
        <p className="mt-1 text-[11px] text-ink-400">1 = facile (parking proche) · 5 = engagé (falaise, isolé)</p>
        {errors.difficulty && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.difficulty.message}</p>
        )}
      </div>

      {/* Dangers (chips) — info par libellé + icône, jamais la couleur seule */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Dangers du spot <span className="font-normal text-ink-400">(optionnel)</span>
        </span>
        <Controller
          name="hazards"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {HAZARD_KEYS.map((h) => {
                const on = field.value?.includes(h) ?? false
                return (
                  <button
                    type="button"
                    key={h}
                    aria-pressed={on}
                    onClick={() =>
                      field.onChange(
                        on
                          ? (field.value ?? []).filter((v) => v !== h)
                          : [...(field.value ?? []), h],
                      )
                    }
                    className={`${chipBase} inline-flex items-center gap-1.5 ${on ? chipHazardOn : chipOff}`}
                  >
                    {on && <AlertTriangle size={13} aria-hidden="true" />}
                    {HAZARDS_LABELS[h]}
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* Visibilité (radio) — gating freemium */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">Visibilité</span>
        <Controller
          name="visibility"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              {(
                [
                  ['public', 'Public', 'Visible de tous (coords floutées pour les gratuits).'],
                  ['subscriber', 'Abonnés', 'Réservé aux abonnés Local / Itinérant.'],
                  ['private', 'Privé', 'Masqué de la carte publique.'],
                ] as const
              ).map(([value, label, hint]) => {
                const on = field.value === value
                return (
                  <label
                    key={value}
                    className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-[12px] border px-3.5 py-2.5 transition-colors ${
                      on ? 'border-teal-500 bg-teal-500/5' : 'border-sand-200 bg-white hover:border-ink-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`visibility-${spot.id}`}
                      checked={on}
                      onChange={() => field.onChange(value)}
                      className="mt-0.5 h-4 w-4 accent-teal-500"
                    />
                    <span>
                      <span className="block text-[14px] font-semibold text-navy-900">{label}</span>
                      <span className="block text-[12px] text-ink-500">{hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* Accès */}
      <div>
        <label htmlFor={`access-${spot.id}`} className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Accès <span className="font-normal text-ink-400">(optionnel)</span>
        </label>
        <textarea
          id={`access-${spot.id}`}
          {...register('access_notes')}
          rows={2}
          placeholder="Parking, sentier, marée à surveiller…"
          className="w-full resize-y rounded-[12px] border border-sand-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-teal-500"
        />
        {errors.access_notes && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.access_notes.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor={`desc-${spot.id}`} className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Description <span className="font-normal text-ink-400">(optionnel)</span>
        </label>
        <textarea
          id={`desc-${spot.id}`}
          {...register('description')}
          rows={3}
          placeholder="Ce qu’il faut savoir sur le spot…"
          className="w-full resize-y rounded-[12px] border border-sand-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-teal-500"
        />
        {errors.description && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.description.message}</p>
        )}
      </div>

      {/* Actions : un seul bouton « Valider et publier » (D1) + « Rejeter » */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || rejecting}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck size={16} aria-hidden="true" />
          )}
          Valider et publier
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isPending || rejecting}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
        >
          {rejecting ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <X size={15} aria-hidden="true" />
          )}
          Rejeter
        </button>
      </div>
    </form>
  )
}
