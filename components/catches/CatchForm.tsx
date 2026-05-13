'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { MapPin, Loader2, Fish } from 'lucide-react'

import { createCatchSchema, catchBaseSchema, type CreateCatchInput } from '@/lib/catches/schema'
import { createCatch, updateCatch, uploadCatchPhoto } from '@/lib/catches/actions'
import { PhotoInput } from '@/components/forms/PhotoInput'
import { analytics } from '@/lib/analytics'
import type { CatchRow } from '@/lib/catches/queries'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DRAFT_KEY = 'carnet:draft-catch'

const SPECIES = [
  { value: 'bar', label: 'Bar' },
  { value: 'dorade_royale', label: 'Dorade royale' },
  { value: 'lieu_jaune', label: 'Lieu jaune' },
  { value: 'maquereau', label: 'Maquereau' },
  { value: 'sar', label: 'Sar' },
  { value: 'orphie', label: 'Orphie' },
] as const

const TECHNIQUES = [
  { value: 'leurres', label: 'Leurres' },
  { value: 'surfcasting', label: 'Surfcasting' },
  { value: 'flottante', label: 'Flottante' },
  { value: 'vif', label: 'Vif' },
] as const

const LEGAL_SIZES: Record<string, number> = {
  bar: 36,
  dorade_royale: 25,
  lieu_jaune: 30,
  maquereau: 20,
  sar: 23,
  orphie: 0,
}

const BAIT_SUGGESTIONS = [
  'Arénicole', 'Ver de vase', 'Crevette', 'Couteau', 'Moule',
  'Maquereau', 'Sardine', 'Calmar', 'Vers de mer',
]

type SubmitPhase = 'idle' | 'saving' | 'conditions'

const SUBMIT_LABELS: Record<SubmitPhase, string> = {
  idle: 'Loguer la prise',
  saving: 'Sauvegarde…',
  conditions: 'Conditions en cours…',
}

const SUBMIT_LABELS_EDIT: Record<SubmitPhase, string> = {
  idle: 'Enregistrer',
  saving: 'Sauvegarde…',
  conditions: 'Conditions en cours…',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

function isoToLocal(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localToIso(local: string): string {
  return local ? new Date(local).toISOString() : new Date().toISOString()
}

function formatCoord(n: number, isLat: boolean): string {
  const dir = isLat ? (n >= 0 ? 'N' : 'S') : n >= 0 ? 'E' : 'O'
  return `${Math.abs(n).toFixed(5)}° ${dir}`
}

function rowToDefaults(row: CatchRow): Partial<CreateCatchInput> {
  return {
    species: (row.species as CreateCatchInput['species']) ?? undefined,
    // new Date(...).toISOString() normalise en suffixe Z — Zod v4 datetime() rejette le format +00:00 de Supabase
    caught_at: row.caught_at ? new Date(row.caught_at).toISOString() : new Date().toISOString(),
    size_cm: row.size_cm ?? undefined,
    weight_kg: row.weight_g != null ? row.weight_g / 1000 : undefined,
    technique: (row.technique as CreateCatchInput['technique']) ?? undefined,
    lure_brand: row.lure_brand ?? undefined,
    lure_model: row.lure_model ?? undefined,
    bait_type: row.bait_type ?? undefined,
    released: row.released ?? false,
    notes: row.notes ?? undefined,
    location_method: (row.location_method as CreateCatchInput['location_method']) ?? 'gps',
    location_label: row.location_label ?? undefined,
    privacy: (row.privacy as CreateCatchInput['privacy']) ?? 'private',
    precise_for_friends: row.precise_for_friends ?? true,
    reveal_precise_to_public: row.reveal_precise_to_public ?? false,
    photo_path: row.photo_path ?? undefined,
    // latitude/longitude : non pré-remplis (extrait de geom_visible impossible sans RPC)
    // Si l'user ne touche pas la position, updateCatch ne met pas à jour le geom
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type CatchFormProps =
  | { mode: 'create' }
  | {
      mode: 'edit'
      catchId: string
      initialValues: CatchRow
      existingPhotoUrl: string | null
    }

// ─── Composant principal ──────────────────────────────────────────────────────

export function CatchForm(props: CatchFormProps) {
  const router = useRouter()
  const isEdit = props.mode === 'edit'

  // Extraits ici pour que les closures y accèdent sans problème de narrowing TypeScript
  const catchId = props.mode === 'edit' ? props.catchId : undefined
  const initialValues = props.mode === 'edit' ? props.initialValues : undefined
  const existingPhotoUrl = props.mode === 'edit' ? props.existingPhotoUrl : null

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const submittedRef = useRef(false)
  const lastFieldRef = useRef('')

  // Brouillon localStorage (mode création uniquement)
  const [draft] = useState<Partial<CreateCatchInput> | null>(() => {
    if (isEdit || typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') }
    catch { return null }
  })

  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>(() => {
    if (initialValues) {
      return initialValues.location_method === 'manual' ? 'manual' : 'gps'
    }
    return draft?.location_method === 'manual' ? 'manual' : 'gps'
  })

  const defaultValues: Partial<CreateCatchInput> = initialValues
    ? rowToDefaults(initialValues)
    : {
        caught_at: draft?.caught_at ?? new Date().toISOString(),
        released: draft?.released ?? false,
        location_method: draft?.location_method ?? 'gps',
        privacy: draft?.privacy ?? 'private',
        precise_for_friends: draft?.precise_for_friends ?? true,
        reveal_precise_to_public: draft?.reveal_precise_to_public ?? false,
        species: draft?.species,
        technique: draft?.technique,
        size_cm: draft?.size_cm,
        weight_kg: draft?.weight_kg,
        notes: draft?.notes,
        location_label: draft?.location_label,
        lure_brand: draft?.lure_brand,
        lure_model: draft?.lure_model,
        bait_type: draft?.bait_type,
        latitude: draft?.latitude,
        longitude: draft?.longitude,
      }

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCatchInput>({
    resolver: zodResolver(isEdit ? catchBaseSchema : createCatchSchema) as Resolver<CreateCatchInput>,
    mode: 'onTouched',
    defaultValues,
  })

  const watchedSpecies = watch('species')
  const watchedTechnique = watch('technique')
  const watchedSizeCm = watch('size_cm')
  const watchedNotes = watch('notes') ?? ''
  const watchedPrivacy = watch('privacy') ?? 'private'
  const watchedLat = watch('latitude')
  const watchedLng = watch('longitude')

  const legalSize = watchedSpecies ? (LEGAL_SIZES[watchedSpecies] ?? 0) : 0
  const isUndersize = !!watchedSizeCm && legalSize > 0 && watchedSizeCm < legalSize

  // Auto-relâché si sous-taille légale
  useEffect(() => {
    if (!watchedSizeCm || !watchedSpecies) return
    const legal = LEGAL_SIZES[watchedSpecies] ?? 0
    if (legal > 0 && watchedSizeCm < legal) {
      setValue('released', true, { shouldDirty: false })
    }
  }, [watchedSizeCm, watchedSpecies, setValue])

  // Reset des champs conditionnels au changement de technique
  // (sinon la marque du leurre persiste quand on passe sur surfcasting, etc.)
  const prevTechniqueRef = useRef<typeof watchedTechnique>(watchedTechnique)
  useEffect(() => {
    const prev = prevTechniqueRef.current
    prevTechniqueRef.current = watchedTechnique
    // Premier rendu : on initialise le ref, on ne nettoie rien
    if (prev === watchedTechnique) return

    if (watchedTechnique === 'leurres') {
      // Bait n'est plus pertinent
      setValue('bait_type', undefined, { shouldDirty: true })
    } else {
      // surfcasting / flottante / vif / undefined : marque & modèle de leurre n'ont plus de sens
      setValue('lure_brand', undefined, { shouldDirty: true })
      setValue('lure_model', undefined, { shouldDirty: true })
    }
  }, [watchedTechnique, setValue])

  // Brouillon (création uniquement)
  useEffect(() => {
    if (isEdit) return
    let timer: ReturnType<typeof setTimeout>
    const { unsubscribe } = watch((values) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const { photo_path: _p, ...toSave } = values as Partial<CreateCatchInput>
        localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave))
      }, 800)
    })
    return () => { unsubscribe(); clearTimeout(timer) }
  }, [watch, isEdit])

  // Analytics (création uniquement)
  useEffect(() => {
    if (isEdit) return
    analytics.catchLogStarted({ source: 'web' })
    function handleBeforeUnload() {
      if (!submittedRef.current) {
        analytics.catchLogAbandoned({ lastFieldFocused: lastFieldRef.current })
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEdit])

  const trackFocus = (fieldName: string) => ({
    onFocus: () => { lastFieldRef.current = fieldName },
  })

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=fr`,
        { headers: { 'User-Agent': 'CarnetDePeche/1.0' } }
      )
      if (!res.ok) return ''
      const data = await res.json()
      const a = data.address ?? {}
      return a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? ''
    } catch {
      return ''
    }
  }

  function handleGPS() {
    if (!('geolocation' in navigator)) {
      toast.error("La géolocalisation n'est pas disponible sur cet appareil.")
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setValue('latitude', latitude, { shouldValidate: true })
        setValue('longitude', longitude, { shouldValidate: true })
        setValue('location_method', 'gps')
        setGeoLoading(false)
        toast.success('Position récupérée')
        const label = await reverseGeocode(latitude, longitude)
        if (label) setValue('location_label', label)
      },
      () => {
        toast.error('GPS refusé. Saisis les coordonnées manuellement.')
        setLocationMode('manual')
        setValue('location_method', 'manual')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const onSubmit: SubmitHandler<CreateCatchInput> = async (data) => {
    setSubmitPhase('saving')
    const conditionsTimer = setTimeout(() => setSubmitPhase('conditions'), 500)

    // Upload photo si une nouvelle est sélectionnée
    let photoPath: string | undefined
    if (photoFile) {
      const fd = new FormData()
      fd.append('file', photoFile)
      const uploadResult = await uploadCatchPhoto(fd)
      if ('error' in uploadResult) {
        clearTimeout(conditionsTimer)
        if (uploadResult.error === 'Non authentifié') {
          router.push('/auth/login?next=/carnet')
          return
        }
        toast.error(uploadResult.error)
        setSubmitPhase('idle')
        return
      }
      photoPath = uploadResult.path
    }

    if (isEdit && catchId) {
      const result = await updateCatch({
        id: catchId,
        ...data,
        ...(photoPath !== undefined ? { photo_path: photoPath } : {}),
      })
      clearTimeout(conditionsTimer)

      if ('error' in result) {
        if (result.error === 'Non authentifié') {
          router.push('/auth/login?next=/carnet')
          return
        }
        toast.error(result.error)
        setSubmitPhase('idle')
        return
      }

      toast.success('Prise modifiée !')
      router.push(`/carnet/${catchId}`)
      return
    }

    // Mode création
    const result = await createCatch({ ...data, photo_path: photoPath })
    clearTimeout(conditionsTimer)

    if ('error' in result) {
      if (result.error === 'Non authentifié') {
        router.push('/auth/login?next=/carnet')
        return
      }
      toast.error(result.error)
      setSubmitPhase('idle')
      return
    }

    submittedRef.current = true
    analytics.catchLogCompleted({
      species: data.species,
      technique: data.technique,
      hasPhoto: !!photoPath,
    })
    localStorage.removeItem(DRAFT_KEY)
    toast.success('Prise loggée !')
    router.push(`/carnet/${result.id}`)
  }

  // Label de position existante en mode édition (quand lat/lng non encore renseignés dans le form)
  const existingLocationLabel =
    isEdit && !watchedLat ? (initialValues?.location_label ?? null) : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-32">

      {/* ── Section 1 : Espèce ── */}
      <Card>
        <SectionTitle required>Espèce</SectionTitle>
        <Controller
          name="species"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {SPECIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { field.onChange(s.value); field.onBlur() }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-[10px] border text-[14px] font-medium transition-colors text-left ${
                    field.value === s.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-slate-50 text-ink-700 active:bg-slate-100'
                  }`}
                >
                  <Fish size={15} className="shrink-0" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        />
        <FieldError error={errors.species?.message} />
      </Card>

      {/* ── Section 2 : Mesures ── */}
      <Card>
        <SectionTitle>Mesures</SectionTitle>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] text-ink-600">Taille (cm)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={200}
                step={1}
                placeholder="—"
                value={watchedSizeCm ?? ''}
                onChange={(e) =>
                  setValue(
                    'size_cm',
                    e.target.value ? Number(e.target.value) : (undefined as unknown as number),
                    { shouldValidate: true }
                  )
                }
                {...trackFocus('size_cm')}
                className="w-20 text-right text-[15px] font-semibold text-navy-900 border border-slate-200 rounded-[8px] px-2 py-1.5 outline-none focus:border-teal-500"
              />
              {isUndersize && (
                <span className="text-[11px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Sous-taille
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={10}
            max={120}
            step={1}
            value={Math.min(watchedSizeCm ?? 10, 120)}
            onChange={(e) =>
              setValue('size_cm', Number(e.target.value), { shouldValidate: true })
            }
            className="w-full accent-teal-500 h-2"
          />
          <div className="flex justify-between text-[11px] mt-0.5">
            <span className="text-slate-400">10 cm</span>
            {legalSize > 0 && (
              <span className="text-amber-600 font-medium">min légal {legalSize} cm</span>
            )}
            <span className="text-slate-400">120 cm+</span>
          </div>
          <FieldError error={errors.size_cm?.message} />
        </div>

        <div className="mt-4">
          <label className="text-[13px] text-ink-600">Poids (kg)</label>
          <input
            type="number"
            min={0.05}
            max={30}
            step={0.05}
            placeholder="ex : 1.8"
            {...register('weight_kg', {
              setValueAs: (v) => (v === '' || v === null ? undefined : parseFloat(v)),
            })}
            {...trackFocus('weight_kg')}
            className={`mt-1.5 ${inputCls}`}
          />
          <FieldError error={errors.weight_kg?.message} />
        </div>

        <Controller
          name="released"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <span className="text-[13px] text-ink-600">Sort de l'eau</span>
              <div className="flex rounded-[8px] border border-slate-200 overflow-hidden">
                {[
                  { val: false, label: 'Conservé' },
                  { val: true, label: 'Relâché' },
                ].map((opt) => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => { field.onChange(opt.val); field.onBlur() }}
                    className={`px-4 py-2 text-[13px] font-medium transition-colors ${
                      field.value === opt.val
                        ? 'bg-teal-500 text-white'
                        : 'bg-white text-ink-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        />
      </Card>

      {/* ── Section 3 : Technique ── */}
      <Card>
        <SectionTitle required>Technique</SectionTitle>
        <Controller
          name="technique"
          control={control}
          render={({ field }) => (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TECHNIQUES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { field.onChange(t.value); field.onBlur() }}
                  className={`py-3 rounded-[10px] border text-[14px] font-medium transition-colors ${
                    field.value === t.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-slate-50 text-ink-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        />
        <FieldError error={errors.technique?.message} />

        {watchedTechnique === 'leurres' && (
          <div className="mt-4 space-y-3">
            <input
              {...register('lure_brand')}
              {...trackFocus('lure_brand')}
              placeholder="Marque du leurre (BlackMinnow, Fiiish…)"
              className={inputCls}
            />
            <input
              {...register('lure_model')}
              {...trackFocus('lure_model')}
              placeholder="Modèle / coloris"
              className={inputCls}
            />
          </div>
        )}

        {(watchedTechnique === 'surfcasting' ||
          watchedTechnique === 'vif' ||
          watchedTechnique === 'flottante') && (
          <div className="mt-4">
            <input
              {...register('bait_type')}
              {...trackFocus('bait_type')}
              list="bait-suggestions"
              placeholder="Appât (arénicole, crevette…)"
              className={inputCls}
            />
            <datalist id="bait-suggestions">
              {BAIT_SUGGESTIONS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
        )}
      </Card>

      {/* ── Section 4 : Lieu ── */}
      <Card>
        <SectionTitle required={!isEdit}>Lieu</SectionTitle>

        {locationMode === 'gps' && (
          <div className="mt-3 space-y-3">
            {/* Bannière position existante (mode édition, coords non rechargées) */}
            {existingLocationLabel && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-2.5">
                <MapPin size={16} className="text-ink-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink-700">{existingLocationLabel}</p>
                  <p className="text-[11px] text-ink-400">Position enregistrée · GPS pour mettre à jour</p>
                </div>
              </div>
            )}

            {watchedLat !== undefined && watchedLng !== undefined ? (
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-[10px] px-3 py-2.5">
                <MapPin size={16} className="text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-teal-800">
                    {formatCoord(watchedLat, true)} · {formatCoord(watchedLng, false)}
                  </p>
                  <p className="text-[11px] text-teal-600">Position GPS récupérée</p>
                </div>
                <button
                  type="button"
                  onClick={handleGPS}
                  className="ml-auto text-[12px] text-teal-600 underline shrink-0"
                >
                  Actualiser
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGPS}
                disabled={geoLoading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-[10px] border-2 border-dashed border-slate-300 text-[14px] font-medium text-ink-600 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
              >
                {geoLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MapPin size={16} />
                )}
                {geoLoading ? 'Localisation en cours…' : 'Utiliser ma position GPS'}
              </button>
            )}

            <input
              {...register('location_label')}
              {...trackFocus('location_label')}
              placeholder="Ville ou lieu (ex : Camaret-sur-Mer)"
              className={inputCls}
            />

            <button
              type="button"
              onClick={() => {
                setLocationMode('manual')
                setValue('location_method', 'manual')
              }}
              className="text-[12px] text-ink-400 underline underline-offset-2"
            >
              Saisir manuellement
            </button>
          </div>
        )}

        {locationMode === 'manual' && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-ink-500 mb-1 block">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="48.2744"
                  {...register('latitude', {
                    setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                  })}
                  {...trackFocus('latitude')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[12px] text-ink-500 mb-1 block">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="-4.5765"
                  {...register('longitude', {
                    setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                  })}
                  {...trackFocus('longitude')}
                  className={inputCls}
                />
              </div>
            </div>
            <input
              {...register('location_label')}
              {...trackFocus('location_label')}
              placeholder="Ville ou lieu (ex : Camaret-sur-Mer)"
              className={inputCls}
            />

            <button
              type="button"
              onClick={() => {
                setLocationMode('gps')
                setValue('location_method', 'gps')
                handleGPS()
              }}
              className="text-[12px] text-teal-600 underline underline-offset-2"
            >
              ← Utiliser le GPS à la place
            </button>
          </div>
        )}

        {/* Erreur lat/lng uniquement en mode création */}
        {!isEdit && (errors.latitude || errors.longitude) && (
          <FieldError error="Position requise. Utilise le GPS ou saisis les coordonnées." />
        )}
      </Card>

      {/* ── Section 5 : Quand ── */}
      <Card>
        <SectionTitle>Date et heure</SectionTitle>
        <Controller
          name="caught_at"
          control={control}
          render={({ field }) => (
            <input
              type="datetime-local"
              value={isoToLocal(field.value ?? new Date().toISOString())}
              onChange={(e) => field.onChange(localToIso(e.target.value))}
              onBlur={field.onBlur}
              {...trackFocus('caught_at')}
              className={`mt-3 ${inputCls}`}
            />
          )}
        />
      </Card>

      {/* ── Section 6 : Photo ── */}
      <Card>
        <SectionTitle>Photo</SectionTitle>
        <PhotoInput
          onChange={setPhotoFile}
          className="mt-3"
          initialUrl={isEdit ? existingPhotoUrl : null}
        />
      </Card>

      {/* ── Section 7 : Notes & Confidentialité ── */}
      <Card>
        <SectionTitle>Notes & Confidentialité</SectionTitle>

        <div className="mt-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <label className="text-[13px] text-ink-600">Notes</label>
            <span
              className={`text-[11px] ${watchedNotes.length > 900 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}
            >
              {watchedNotes.length}/1000
            </span>
          </div>
          <textarea
            {...register('notes')}
            {...trackFocus('notes')}
            placeholder="Vent, technique de récupération, ambiance du spot…"
            rows={3}
            maxLength={1000}
            className="w-full border border-slate-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 resize-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-4">
          <label className="text-[13px] text-ink-600">Confidentialité</label>
          <Controller
            name="privacy"
            control={control}
            render={({ field }) => (
              <div className="mt-2 flex rounded-[10px] border border-slate-200 overflow-hidden">
                {[
                  { val: 'private', label: 'Privée' },
                  { val: 'friends', label: 'Amis' },
                  { val: 'public', label: 'Publique' },
                ].map((opt, i) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => { field.onChange(opt.val); field.onBlur() }}
                    className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${
                      i > 0 ? 'border-l border-slate-200' : ''
                    } ${
                      field.value === opt.val
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-ink-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          />
          <p className="text-[12px] text-ink-400 mt-2 leading-relaxed">
            {watchedPrivacy === 'private' && 'Visible par toi seul.'}
            {watchedPrivacy === 'friends' &&
              'Visible par tes amis avec coords précises (si activé).'}
            {watchedPrivacy === 'public' &&
              'Visible par la communauté avec coords floutées à 1 km.'}
          </p>
        </div>

        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
          <Controller
            name="precise_for_friends"
            control={control}
            render={({ field }) => (
              <ToggleRow
                label="Coords précises pour mes amis"
                checked={field.value ?? true}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            name="reveal_precise_to_public"
            control={control}
            render={({ field }) => (
              <>
                <ToggleRow
                  label="Coords précises publiques"
                  checked={field.value ?? false}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
                {field.value && (
                  <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
                    ⚠️ Tout le monde verra l'endroit exact de ta prise.
                  </p>
                )}
              </>
            )}
          />
        </div>
      </Card>

      {/* ── Footer sticky ── */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-ink-900 border-t border-white/10 px-4 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        {isEdit && (
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full mb-2 py-3 rounded-[14px] bg-white/10 text-white font-medium text-[14px] transition-opacity hover:bg-white/15"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={submitPhase !== 'idle'}
          className="w-full py-4 rounded-[14px] bg-teal-500 text-white font-bold text-[16px] transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitPhase !== 'idle' && <Loader2 size={18} className="animate-spin" />}
          {isEdit ? SUBMIT_LABELS_EDIT[submitPhase] : SUBMIT_LABELS[submitPhase]}
        </button>
      </div>
    </form>
  )
}

// ─── Composants helpers ───────────────────────────────────────────────────────

const inputCls =
  'w-full border border-slate-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 placeholder:text-slate-400 bg-white'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[14px] border border-slate-100 p-5 shadow-sm">
      {children}
    </div>
  )
}

function SectionTitle({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </p>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-[12px] text-red-500 mt-1.5">{error}</p>
}

function ToggleRow({
  label,
  checked,
  onChange,
  onBlur,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  onBlur?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-600">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => { onChange(!checked); onBlur?.() }}
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
