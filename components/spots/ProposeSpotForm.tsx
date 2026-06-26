'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MapPin, Loader2, CheckCircle2, AlertTriangle, LocateFixed } from 'lucide-react'
import dynamic from 'next/dynamic'
import { proposeSpotSchema, type ProposeSpotInput } from '@/lib/spots/propose-schema'
import { proposeSpot, checkSpotDuplicate } from '@/app/actions/spots'
import { DEPARTMENT_OPTIONS } from '@/lib/geo/departments'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'

// MapLibre (~400 KB) lazy-chargé : sort le moteur carte du First Load JS de la
// page (même pattern que MapShell). Skeleton pendant l'init WebGL.
const SpotLocationPicker = dynamic(() => import('@/components/spots/SpotLocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full animate-pulse rounded-[14px] border border-sand-200 bg-ink-100" />
  ),
})

// 6 espèces cœur + 4 techniques (mêmes enums que le carnet).
const SPECIES = ['bar', 'dorade_royale', 'lieu_jaune', 'maquereau', 'sar', 'orphie'] as const
const TECHNIQUES = ['leurres', 'surfcasting', 'flottante', 'vif'] as const
const STRUCTURES = ['digue', 'plage', 'pointe_rocheuse', 'estuaire', 'cale', 'passe', 'cassure'] as const

const chipBase =
  'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors'
const chipOn = 'border-teal-500 bg-teal-500/10 text-teal-700'
const chipOff = 'border-sand-200 bg-white text-ink-600 hover:border-ink-300'

type Props = {
  defaultDepartment?: string
  /** Centre initial de la carte (lng,lat) — façade du pêcheur si connue. */
  initialCenter?: [number, number]
}

export default function ProposeSpotForm({ defaultDepartment, initialCenter }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [dupName, setDupName] = useState<string | null>(null)
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProposeSpotInput>({
    resolver: zodResolver(proposeSpotSchema),
    defaultValues: {
      name: '',
      department: defaultDepartment ?? '',
      species: [],
      techniques: [],
      access_notes: '',
      description: '',
      is_public_spot: false,
    },
  })

  const lat = watch('latitude')
  const lng = watch('longitude')

  // Vérification live de doublon (debounce) quand le point bouge.
  const runDupCheck = useCallback((nlat: number, nlng: number) => {
    if (dupTimer.current) clearTimeout(dupTimer.current)
    dupTimer.current = setTimeout(async () => {
      const res = await checkSpotDuplicate(nlat, nlng)
      setDupName(res.ok ? (res.data?.name ?? null) : null)
    }, 600)
  }, [])

  const setPoint = useCallback(
    (nlat: number, nlng: number) => {
      setValue('latitude', nlat, { shouldValidate: true })
      setValue('longitude', nlng, { shouldValidate: true })
      runDupCheck(nlat, nlng)
    },
    [setValue, runDupCheck],
  )

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

  const onSubmit = (values: ProposeSpotInput) => {
    startTransition(async () => {
      const res = await proposeSpot(values)
      if (res.ok) {
        setDone(true)
        toast.success('Spot proposé, en attente de validation 🎣')
      } else {
        toast.error(res.error)
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-[18px] border border-teal-500/30 bg-teal-500/5 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-teal-600" size={36} aria-hidden="true" />
        <h2 className="text-[18px] font-bold text-navy-900">Merci, c’est proposé !</h2>
        <p className="mx-auto mt-2 max-w-[420px] text-[14px] text-ink-500">
          Ton spot part en modération. Tu le retrouves dans « mes propositions »,
          marqué <span className="font-mono font-medium">en attente</span>. Il devient
          visible de tous une fois validé par l’équipe.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/spots/mes-propositions')}
            className="rounded-full bg-navy-900 px-4 py-2 text-[13px] font-semibold text-white"
          >
            Voir mes propositions
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-sand-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-600"
          >
            Proposer un autre spot
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Nom */}
      <div>
        <label htmlFor="name" className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Nom du spot
        </label>
        <input
          id="name"
          {...register('name')}
          autoComplete="off"
          placeholder="Ex. Jetée du port de Lampaul"
          className="w-full rounded-[12px] border border-sand-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-teal-500"
        />
        {errors.name && <p className="mt-1 text-[12px] text-coral-500">{errors.name.message}</p>}
      </div>

      {/* Département */}
      <div>
        <label htmlFor="department" className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Département
        </label>
        <select
          id="department"
          {...register('department')}
          className="w-full rounded-[12px] border border-sand-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-teal-500"
        >
          <option value="">Choisis un département côtier…</option>
          {DEPARTMENT_OPTIONS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label}
            </option>
          ))}
        </select>
        {errors.department && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.department.message}</p>
        )}
      </div>

      {/* Structure */}
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

      {/* Position sur carte */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-navy-900">Position</span>
          <button
            type="button"
            onClick={useMyPosition}
            className="inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1 text-[12px] font-medium text-ink-600 hover:border-ink-300"
          >
            <LocateFixed size={13} aria-hidden="true" />
            Ma position
          </button>
        </div>
        <SpotLocationPicker
          value={typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null}
          onChange={setPoint}
          initialCenter={initialCenter}
        />
        {typeof lat === 'number' && typeof lng === 'number' && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-ink-500">
            <MapPin size={12} aria-hidden="true" />
            <span className="font-mono">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </p>
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

      {/* Espèces */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Espèces qu’on y prend <span className="font-normal text-ink-400">(optionnel)</span>
        </span>
        <Controller
          name="species"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {SPECIES.map((s) => {
                const on = field.value?.includes(s)
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() =>
                      field.onChange(on ? (field.value ?? []).filter((v) => v !== s) : [...(field.value ?? []), s])
                    }
                    className={`${chipBase} ${on ? chipOn : chipOff}`}
                  >
                    {SPECIES_LABELS[s]}
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* Techniques */}
      <div>
        <span className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Techniques <span className="font-normal text-ink-400">(optionnel)</span>
        </span>
        <Controller
          name="techniques"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {TECHNIQUES.map((t) => {
                const on = field.value?.includes(t)
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() =>
                      field.onChange(on ? (field.value ?? []).filter((v) => v !== t) : [...(field.value ?? []), t])
                    }
                    className={`${chipBase} ${on ? chipOn : chipOff}`}
                  >
                    {TECHNIQUE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          )}
        />
      </div>

      {/* Accès */}
      <div>
        <label htmlFor="access_notes" className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Accès <span className="font-normal text-ink-400">(optionnel)</span>
        </label>
        <textarea
          id="access_notes"
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
        <label htmlFor="description" className="mb-1.5 block text-[14px] font-semibold text-navy-900">
          Description <span className="font-normal text-ink-400">(optionnel)</span>
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          placeholder="Ce qu’il faut savoir sur le spot…"
          className="w-full resize-y rounded-[12px] border border-sand-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-teal-500"
        />
        {errors.description && (
          <p className="mt-1 text-[12px] text-coral-500">{errors.description.message}</p>
        )}
      </div>

      {/* Anti spot-burning */}
      <label className="flex items-start gap-2.5 rounded-[12px] border border-sand-200 bg-sand-50 p-3.5">
        <input type="checkbox" {...register('is_public_spot')} className="mt-0.5 h-4 w-4 accent-teal-500" />
        <span className="text-[13px] text-ink-600">
          Je confirme que c’est un <strong>lieu public et déjà connu</strong> (jetée, digue,
          plage, port…), et pas le coin secret de quelqu’un.
        </span>
      </label>
      {errors.is_public_spot && (
        <p className="-mt-3 text-[12px] text-coral-500">{errors.is_public_spot.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}
        Proposer ce spot
      </button>
    </form>
  )
}
