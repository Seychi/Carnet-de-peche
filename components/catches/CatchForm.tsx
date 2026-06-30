'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller, type SubmitHandler, type SubmitErrorHandler, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { MapPin, Loader2, Fish, Search, ChevronDown, Users } from 'lucide-react'

import { createCatchSchema, catchBaseSchema, isInFranceMetro, type CreateCatchInput } from '@/lib/catches/schema'
import { createCatch, updateCatch, uploadCatchPhoto } from '@/lib/catches/actions'
import { checkSize, getMinSize, getFacadeForCatch, isMarquageRequired, FACADE_LABELS } from '@/lib/regulation'
import { CARNET_SPECIES_OPTIONS, CARNET_SPECIES_DB_KEYS, CORE_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'
import { DEPARTMENT_LABELS, isCoastalDepartment } from '@/lib/geo/departments'
import { PhotoInput } from '@/components/forms/PhotoInput'
import { CityAutocomplete } from '@/components/catches/CityAutocomplete'
import { GearPicker } from '@/components/catches/GearPicker'
import { geocodeMunicipality } from '@/lib/geo/geocode'
import { analytics } from '@/lib/analytics'
import type { CatchRow } from '@/lib/catches/queries'
import type { GearItem, GearKind } from '@/app/actions/gear'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DRAFT_KEY = 'carnet:draft-catch'
// Durée de vie du brouillon : au-delà, on l'ignore au montage (évite de
// ressusciter des valeurs périmées — ville/leurre/date d'une session abandonnée,
// BUG-18). Le brouillon protège contre une perte accidentelle DANS la session.
const DRAFT_TTL_MS = 30 * 60 * 1000

// Espèces loguables — DÉRIVÉ du référentiel unique (sprint 31, F3) : 26 espèces, cœur
// d'abord. Les 6 cœur sont en quick-picks, les 20 autres derrière la recherche
// « Autre espèce » (SpeciesPicker en bas de fichier). Plus de liste codée en dur.
const CORE_KEYS = new Set(CORE_SPECIES_DB_KEYS)
const QUICK_SPECIES = CARNET_SPECIES_OPTIONS.filter((o) => CORE_KEYS.has(o.value))
const OTHER_SPECIES = CARNET_SPECIES_OPTIONS.filter((o) => !CORE_KEYS.has(o.value))

// Espèces loguables valides — borne ce qu'on accepte du query param `?species=`.
const CARNET_SPECIES_KEY_SET = new Set(CARNET_SPECIES_DB_KEYS)
// Note pré-remplie quand on logue depuis une sortie partagée (sprint 50). Sert
// aussi de garde anti-doublon (on ne ré-injecte pas la note si déjà présente).
const SHARED_OUTING_NOTE = 'Sortie partagée'

const TECHNIQUES = [
  { value: 'leurres', label: 'Leurres' },
  { value: 'surfcasting', label: 'Surfcasting' },
  { value: 'flottante', label: 'Flottante' },
  { value: 'vif', label: 'Vif' },
] as const

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
    measured_length_cm: row.measured_length_cm ?? undefined,
    reference_object: row.reference_object ?? undefined,
    // « Mesurée » est dérivé : une prise déjà datée (photo_verified_at) l'est.
    is_measured: row.photo_verified_at != null,
    technique: (row.technique as CreateCatchInput['technique']) ?? undefined,
    lure_brand: row.lure_brand ?? undefined,
    lure_model: row.lure_model ?? undefined,
    bait_type: row.bait_type ?? undefined,
    gear_id: row.gear_id ?? undefined,
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

export type SpotContext = {
  id: string
  name: string
  slug: string
  department: string
  lat: number
  lng: number
}

// Contexte « loguer à plusieurs » (sprint 50) lu depuis les query params
// `?outing=&dept=&species=`. SANS FK (D1) : on ne LIE rien en base, on pré-remplit
// seulement. Surtout : AUCUNE coordonnée — on ne partage que le département (donc la
// façade) et l'espèce ciblée. Les coords de la prise restent celles, privées, de
// l'utilisateur (GPS/ville/manuel), jamais celles de la sortie ni des autres membres.
export type OutingContext = {
  proposalId: string
  department: string | null
  species: string | null
}

// Parse les query params en contexte de sortie partagée. On valide le département
// (côtier connu) et l'espèce (loguable) pour ne jamais injecter de valeur aberrante.
function parseOutingContext(params: URLSearchParams): OutingContext | null {
  const proposalId = params.get('outing')
  if (!proposalId) return null
  const rawDept = (params.get('dept') ?? '').trim()
  const department = rawDept && isCoastalDepartment(rawDept) ? rawDept : null
  const rawSpecies = (params.get('species') ?? '').trim()
  const species = rawSpecies && CARNET_SPECIES_KEY_SET.has(rawSpecies) ? rawSpecies : null
  return { proposalId, department, species }
}

type CatchFormProps = (
  | { mode: 'create'; spotContext?: SpotContext }
  | {
      mode: 'edit'
      catchId: string
      initialValues: CatchRow
      existingPhotoUrl: string | null
    }
) & {
  /** Boîte à matériel de l'utilisateur (gear_items non archivés), fournie par la page serveur. */
  gearItems?: GearItem[]
}

// Types de matériel proposés selon la technique : un leurre/montage pour les
// leurres, un appât pour les techniques d'appât.
function gearKindsForTechnique(technique: string | undefined): GearKind[] {
  return technique === 'leurres' ? ['leurre', 'montage'] : ['appat']
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CatchForm(props: CatchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = props.mode === 'edit'

  // Extraits ici pour que les closures y accèdent sans problème de narrowing TypeScript
  const catchId = props.mode === 'edit' ? props.catchId : undefined
  const initialValues = props.mode === 'edit' ? props.initialValues : undefined
  const existingPhotoUrl = props.mode === 'edit' ? props.existingPhotoUrl : null
  const spotContext = props.mode === 'create' ? props.spotContext : undefined
  const gearItems = props.gearItems ?? []

  // Contexte « loguer à plusieurs » (sprint 50) : pré-remplissage SANS FK ni coord.
  // Ignoré en édition et quand un spot pilote déjà le flow (le spot prime). La prise
  // garde les coords privées de l'utilisateur ; la sortie n'apporte que dept + espèce.
  const outingContext = useMemo(
    () => (isEdit || spotContext ? null : parseOutingContext(searchParams)),
    [isEdit, spotContext, searchParams],
  )
  const outingDeptLabel = outingContext?.department
    ? (DEPARTMENT_LABELS[outingContext.department] ?? outingContext.department)
    : null
  const outingFacade = outingContext?.department
    ? getFacadeForCatch({ department: outingContext.department })
    : null

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const submittedRef = useRef(false)
  const lastFieldRef = useRef('')

  // Brouillon localStorage (mode création uniquement). On stocke désormais
  // { savedAt, data } et on ignore (et purge) tout brouillon plus vieux que TTL.
  const [draft] = useState<Partial<CreateCatchInput> | null>(() => {
    if (isEdit || typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { savedAt?: number; data?: Partial<CreateCatchInput> } | null
      if (!parsed || typeof parsed.savedAt !== 'number' || !parsed.data) {
        localStorage.removeItem(DRAFT_KEY)
        return null
      }
      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_KEY)
        return null
      }
      return parsed.data
    } catch {
      return null
    }
  })

  const [locationMode, setLocationMode] = useState<'gps' | 'manual' | 'spot'>(() => {
    if (spotContext) return 'spot'
    if (initialValues) {
      return initialValues.location_method === 'manual' ? 'manual' : 'gps'
    }
    return draft?.location_method === 'manual' ? 'manual' : 'gps'
  })

  // Note de départ : la note du brouillon a priorité ; à défaut, si on logue depuis
  // une sortie partagée, on amorce avec « Sortie partagée » (jamais de doublon).
  const outingNotes = (() => {
    const existing = draft?.notes ?? ''
    if (!outingContext) return existing
    if (existing.includes(SHARED_OUTING_NOTE)) return existing
    return existing ? `${SHARED_OUTING_NOTE}. ${existing}` : SHARED_OUTING_NOTE
  })()

  const defaultValues: Partial<CreateCatchInput> = initialValues
    ? rowToDefaults(initialValues)
    : {
        caught_at: draft?.caught_at ?? new Date().toISOString(),
        released: draft?.released ?? false,
        location_method: spotContext ? 'spot' : (draft?.location_method ?? 'gps'),
        spot_id: spotContext?.id ?? undefined,
        latitude: spotContext?.lat ?? draft?.latitude,
        longitude: spotContext?.lng ?? draft?.longitude,
        location_label: spotContext?.name ?? draft?.location_label,
        privacy: draft?.privacy ?? 'private',
        precise_for_friends: draft?.precise_for_friends ?? true,
        reveal_precise_to_public: draft?.reveal_precise_to_public ?? false,
        // Espèce : pré-remplie depuis la sortie si fournie, sinon depuis le brouillon.
        species: outingContext?.species ?? draft?.species,
        technique: draft?.technique,
        size_cm: draft?.size_cm,
        weight_kg: draft?.weight_kg,
        notes: outingNotes || undefined,
        lure_brand: draft?.lure_brand,
        lure_model: draft?.lure_model,
        bait_type: draft?.bait_type,
        gear_id: draft?.gear_id,
      }

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateCatchInput>({
    resolver: zodResolver(isEdit ? catchBaseSchema : createCatchSchema) as Resolver<CreateCatchInput>,
    mode: 'onTouched',
    defaultValues,
  })

  const watchedSpecies = watch('species')
  const watchedTechnique = watch('technique')
  const watchedGearId = watch('gear_id')
  const watchedSizeCm = watch('size_cm')
  const watchedNotes = watch('notes') ?? ''
  const watchedPrivacy = watch('privacy') ?? 'private'
  const watchedLat = watch('latitude')
  const watchedLng = watch('longitude')
  const watchedLabel = watch('location_label') ?? ''

  const watchedReleased = watch('released')

  // Aide à la mesure honnête (WS-D, sprint 39). « Mesurée » = case + longueur réelle
  // + objet de référence. Honnêteté : libellé « mesurée », jamais « vérifiée ».
  const watchedIsMeasured = watch('is_measured') ?? false
  const watchedMeasuredLength = watch('measured_length_cm')
  const watchedReferenceObject = watch('reference_object') ?? ''

  // Façade de la prise : spot (département) prioritaire, sinon géoloc, sinon
  // INCONNUE (null) → on n'affiche AUCUN verdict de maille faux (sprint 24).
  const catchFacade = getFacadeForCatch({
    department: spotContext?.department ?? null,
    lat: watchedLat ?? null,
    lng: watchedLng ?? null,
  })

  // Maille façade-aware (fini le `bar: 36` façade-aveugle). null = pas de maille
  // connue (espèce non listée) ou façade inconnue.
  const legalSize = watchedSpecies && catchFacade ? getMinSize(watchedSpecies, catchFacade) : null
  const sizeVerdict =
    watchedSpecies && catchFacade && watchedSizeCm
      ? checkSize(watchedSpecies, catchFacade, watchedSizeCm)
      : null
  const isUndersize = sizeVerdict?.status === 'undersize'
  // Maille inconnue faute de lieu : on le signale au lieu d'un verdict trompeur.
  const facadeUnknownForSize = !!watchedSpecies && !!watchedSizeCm && !catchFacade
  const marquageReminder = !!watchedSpecies && !watchedReleased && isMarquageRequired(watchedSpecies)

  const isOutOfCoverage =
    watchedLat != null && watchedLng != null && !isInFranceMetro(watchedLat, watchedLng)

  // Auto-relâché si sous-taille légale — uniquement quand l'utilisateur modifie
  // taille ou espèce. Au montage (édition), on ne doit pas écraser un « conservé »
  // déjà enregistré en base.
  const prevSizeSpeciesRef = useRef<{ size?: number; species?: string }>({
    size: defaultValues.size_cm,
    species: defaultValues.species,
  })
  useEffect(() => {
    const prev = prevSizeSpeciesRef.current
    const changed = prev.size !== watchedSizeCm || prev.species !== watchedSpecies
    prevSizeSpeciesRef.current = { size: watchedSizeCm, species: watchedSpecies }
    if (!changed) return
    if (!watchedSizeCm || !watchedSpecies || !catchFacade) return
    // Auto-relâché UNIQUEMENT si sous la maille façade-aware (jamais sur une façade
    // inconnue : on ne relâche pas un poisson à tort faute de lieu).
    if (checkSize(watchedSpecies, catchFacade, watchedSizeCm).status === 'undersize') {
      setValue('released', true, { shouldDirty: false })
    }
  }, [watchedSizeCm, watchedSpecies, catchFacade, setValue])

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
    // Matériel de « ma boîte » : un leurre ne doit pas rester sélectionné si on
    // passe en surfcasting (et inversement). On remet gear_id à zéro à chaque
    // changement de technique, le picker repropose le bon type.
    setValue('gear_id', undefined, { shouldDirty: true })
  }, [watchedTechnique, setValue])

  // Brouillon (création uniquement)
  useEffect(() => {
    if (isEdit) return
    let timer: ReturnType<typeof setTimeout>
    const { unsubscribe } = watch((values) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const { photo_path: _p, ...toSave } = values as Partial<CreateCatchInput>
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data: toSave }))
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
      let uploadResult: Awaited<ReturnType<typeof uploadCatchPhoto>>
      try {
        uploadResult = await uploadCatchPhoto(fd)
      } catch (err) {
        // Filet de sécurité : une erreur framework résiduelle (ex. mur body des Server
        // Actions) ne doit jamais remonter en exception non gérée → toast FR propre.
        console.error('[CatchForm] uploadCatchPhoto a levé :', err)
        clearTimeout(conditionsTimer)
        toast.error('Photo trop lourde ou envoi interrompu. Réessaie avec une autre image.')
        setSubmitPhase('idle')
        return
      }
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
    toast.success('Prise loguée !')
    router.push(`/carnet/${result.id}`)
  }

  // Submit invalide (F7, sprint 31) : le CTA collant est en bas, les champs requis
  // peuvent être hors écran → on scrolle vers la 1re section fautive ET on toaste
  // pourquoi. Plus de clic « dans le vide » sans retour.
  const onInvalid: SubmitErrorHandler<CreateCatchInput> = (formErrors) => {
    const sections: { keys: (keyof CreateCatchInput)[]; id: string; msg: string }[] = [
      { keys: ['species'], id: 'catch-section-species', msg: 'Choisis une espèce pour continuer.' },
      { keys: ['technique'], id: 'catch-section-technique', msg: 'Choisis une technique de pêche.' },
      {
        keys: ['latitude', 'longitude', 'spot_id'],
        id: 'catch-section-lieu',
        msg: 'Indique le lieu de la prise (GPS, ville ou spot).',
      },
    ]
    for (const s of sections) {
      if (s.keys.some((k) => formErrors[k])) {
        document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        toast.error(s.msg)
        return
      }
    }
    toast.error('Vérifie les champs en rouge avant de valider.')
  }

  // Label de position existante en mode édition (quand lat/lng non encore renseignés dans le form)
  const existingLocationLabel =
    isEdit && !watchedLat ? (initialValues?.location_label ?? null) : null

  // Submit (sprint 35) : si l'utilisateur a tapé une ville SANS choisir de suggestion,
  // on tente un géocodage « best match » AVANT la validation zod. Sans résultat → message
  // FR explicite (au lieu du « Position requise » générique). Le chemin nominal reste la
  // sélection d'une suggestion (qui renseigne déjà lat/lng).
  // ⚠️ Le géocodage ajoute un `await` AVANT la validation → garde anti double-submit
  // (ref synchrone + phase) : sans elle, un double-clic pendant l'appel BAN créerait 2 prises.
  const preSubmitRef = useRef(false)
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (preSubmitRef.current || submitPhase !== 'idle') return
    preSubmitRef.current = true
    try {
      const method = getValues('location_method')
      const label = (getValues('location_label') ?? '').trim()
      const hasCoords =
        getValues('latitude') !== undefined && getValues('longitude') !== undefined
      if ((method === 'gps' || method === 'manual') && label && !hasCoords) {
        const hits = await geocodeMunicipality(label)
        if (hits.length > 0) {
          setValue('latitude', hits[0].lat, { shouldValidate: true })
          setValue('longitude', hits[0].lng, { shouldValidate: true })
          setValue('location_method', 'manual')
        } else {
          toast.error(
            `« ${label} » introuvable. Choisis une ville dans la liste de suggestions, ou saisis les coordonnées GPS.`
          )
          document
            .getElementById('catch-section-lieu')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
      }
      void handleSubmit(onSubmit, onInvalid)()
    } finally {
      preSubmitRef.current = false
    }
  }

  return (
    <form onSubmit={handleFormSubmit} autoComplete="off" className="space-y-4 pb-32">

      {/* ── Bandeau sortie partagée (sprint 50, « loguer à plusieurs ») ──
          Pré-remplissage SANS coordonnée : on n'affiche que le département et la
          façade ciblés. Chacun garde ses coords privées, jamais partagées. */}
      {outingContext && (
        <div className="rounded-[14px] border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-600">
            Prise depuis une sortie partagée
          </p>
          <div className="flex items-center gap-2">
            <Users size={14} className="shrink-0 text-teal-600" />
            <p className="text-[13px] text-teal-900">
              {outingDeptLabel
                ? `Sortie ${outingDeptLabel}${outingFacade ? ` (${FACADE_LABELS[outingFacade]})` : ''}`
                : 'Sortie à plusieurs'}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-teal-700">
            Espèce et façade pré-remplies. Renseigne TON lieu de prise comme d&rsquo;habitude :
            tes coordonnées restent privées, jamais celles de la sortie.
          </p>
        </div>
      )}

      {/* ── Bandeau spot pré-sélectionné ── */}
      {spotContext && (
        <div className="flex items-center justify-between gap-3 bg-teal-50 border border-teal-200 rounded-[14px] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600 mb-0.5">
              Tu logues une prise sur :
            </p>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={14} className="text-teal-600 shrink-0" />
              <p className="text-[14px] font-semibold text-teal-900 truncate">
                {spotContext.name}
              </p>
              <span className="text-[12px] text-teal-600 shrink-0">
                · Dép. {spotContext.department}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.replace('/carnet/nouvelle')}
            className="shrink-0 text-[12px] text-teal-600 underline underline-offset-2 hover:text-teal-800 whitespace-nowrap"
          >
            Changer de spot
          </button>
        </div>
      )}

      {/* ── Section 1 : Espèce ── */}
      <Card id="catch-section-species">
        <SectionTitle required>Espèce</SectionTitle>
        <Controller
          name="species"
          control={control}
          render={({ field }) => (
            <SpeciesPicker
              value={field.value}
              onSelect={(v) => { field.onChange(v); field.onBlur() }}
            />
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
                className="w-20 text-right text-[15px] font-semibold text-navy-900 border border-sand-200 rounded-[8px] px-2 py-1.5 outline-none focus:border-teal-500"
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
            {legalSize != null && (
              <span className="text-amber-600 font-medium">min légal {legalSize} cm</span>
            )}
            <span className="text-slate-400">120 cm+</span>
          </div>
          <FieldError error={errors.size_cm?.message} />

          {/* Verdict maille façade-aware (sprint 24) — texte + icône, jamais la teinte seule */}
          {isUndersize && sizeVerdict?.status === 'undersize' && (
            <p className="mt-2 flex items-start gap-1.5 rounded-[8px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700">
              <span aria-hidden>⚠️</span>
              <span>
                Sous la maille de {sizeVerdict.minSizeCm} cm en{' '}
                {catchFacade ? FACADE_LABELS[catchFacade] : ''} : à remettre à l&rsquo;eau (relâché coché).
              </span>
            </p>
          )}
          {facadeUnknownForSize && (
            <p className="mt-2 text-[12px] text-ink-400">
              Renseigne le lieu de la prise pour vérifier la maille (elle varie selon la façade).
            </p>
          )}
          {marquageReminder && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-amber-700">
              <span aria-hidden>✂️</span>
              <span>
                Marquage obligatoire si tu la gardes : ablation de la partie inférieure de la nageoire caudale.
              </span>
            </p>
          )}

          {/* ── Aide à la mesure honnête (WS-D, sprint 39) ──
              « Mesurée », JAMAIS « vérifiée » : la vérif IA arrive sur mobile.
              Case + longueur réelle + objet de référence visible sur la photo. */}
          <div className="mt-5 border-t border-sand-200 pt-4">
            <Controller
              name="is_measured"
              control={control}
              render={({ field }) => (
                <ToggleRow
                  label="Prise mesurée"
                  checked={field.value ?? false}
                  onChange={(v) => field.onChange(v)}
                  onBlur={field.onBlur}
                />
              )}
            />
            <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
              Tu as posé la prise à côté d&rsquo;une référence de taille connue sur la photo. Honnête : auto-déclaré, pas vérifié.
            </p>

            {watchedIsMeasured && (
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="measured_length_cm" className="text-[13px] text-ink-600">
                    Longueur mesurée (cm)
                  </label>
                  <input
                    id="measured_length_cm"
                    type="number"
                    min={10}
                    max={250}
                    step={1}
                    inputMode="numeric"
                    placeholder="ex : 42"
                    value={watchedMeasuredLength ?? ''}
                    onChange={(e) =>
                      setValue(
                        'measured_length_cm',
                        e.target.value ? Number(e.target.value) : (undefined as unknown as number),
                        { shouldValidate: true }
                      )
                    }
                    {...trackFocus('measured_length_cm')}
                    className={`mt-1.5 min-h-[44px] ${inputCls}`}
                  />
                  <FieldError error={errors.measured_length_cm?.message} />
                </div>

                <div>
                  <label htmlFor="reference_object" className="text-[13px] text-ink-600">
                    Objet de référence
                  </label>
                  <input
                    id="reference_object"
                    type="text"
                    maxLength={120}
                    placeholder="ex : un Black Minnow 120 dans la photo, ma main"
                    {...register('reference_object')}
                    {...trackFocus('reference_object')}
                    className={`mt-1.5 min-h-[44px] ${inputCls}`}
                  />
                  <FieldError error={errors.reference_object?.message} />
                  {watchedReferenceObject.trim().length === 0 && (
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
                      Renseigne la longueur et la référence pour valider la mesure.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
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
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-sand-200">
              <span className="text-[13px] text-ink-600">Sort de l&rsquo;eau</span>
              <div className="flex rounded-[8px] border border-sand-200 overflow-hidden">
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
                        ? 'bg-teal-500 text-navy-950'
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
      <Card id="catch-section-technique">
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
                      : 'border-sand-200 bg-slate-50 text-ink-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        />
        <FieldError error={errors.technique?.message} />

        {watchedTechnique && (
          <div className="mt-4 space-y-3">
            <p className="text-[12px] font-medium text-ink-500">
              {watchedTechnique === 'leurres' ? 'Leurre depuis ta boîte' : 'Appât depuis ta boîte'}
            </p>
            <Controller
              name="gear_id"
              control={control}
              render={({ field }) => (
                <GearPicker
                  items={gearItems}
                  value={field.value}
                  onChange={(id) => { field.onChange(id); field.onBlur() }}
                  allowedKinds={gearKindsForTechnique(watchedTechnique)}
                  ariaLabel={
                    watchedTechnique === 'leurres'
                      ? 'Leurre ou montage de ta boîte'
                      : 'Appât de ta boîte'
                  }
                />
              )}
            />

            {/* Saisie texte ponctuelle (fallback rétro-compat) : visible tant qu'aucun
                matériel de la boîte n'est sélectionné. */}
            {!watchedGearId && watchedTechnique === 'leurres' && (
              <div className="space-y-3 border-t border-sand-200 pt-3">
                <p className="text-[12px] text-ink-400">Ou saisis-le à la volée :</p>
                <input
                  {...register('lure_brand')}
                  {...trackFocus('lure_brand')}
                  placeholder="Marque du leurre (BlackMinnow, Fiiish…)"
                  aria-label="Marque du leurre (saisie ponctuelle)"
                  className={inputCls}
                />
                <input
                  {...register('lure_model')}
                  {...trackFocus('lure_model')}
                  placeholder="Modèle / coloris"
                  aria-label="Modèle ou coloris du leurre (saisie ponctuelle)"
                  className={inputCls}
                />
              </div>
            )}

            {!watchedGearId &&
              (watchedTechnique === 'surfcasting' ||
                watchedTechnique === 'vif' ||
                watchedTechnique === 'flottante') && (
                <div className="border-t border-sand-200 pt-3">
                  <p className="mb-2 text-[12px] text-ink-400">Ou saisis-le à la volée :</p>
                  <input
                    {...register('bait_type')}
                    {...trackFocus('bait_type')}
                    list="bait-suggestions"
                    placeholder="Appât (arénicole, crevette…)"
                    aria-label="Appât (saisie ponctuelle)"
                    className={inputCls}
                  />
                  <datalist id="bait-suggestions">
                    {BAIT_SUGGESTIONS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              )}
          </div>
        )}
      </Card>

      {/* ── Section 4 : Lieu ── */}
      <Card id="catch-section-lieu">
        <SectionTitle required={!isEdit}>Lieu</SectionTitle>

        {locationMode === 'spot' && spotContext && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-[10px] px-3 py-2.5">
              <MapPin size={16} className="text-teal-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-teal-800">{spotContext.name}</p>
                <p className="text-[11px] text-teal-600">Position du spot · Dép. {spotContext.department}</p>
              </div>
            </div>
            <p className="text-[11px] text-ink-400">
              La position est pré-remplie depuis le spot sélectionné.
            </p>
          </div>
        )}

        {locationMode === 'gps' && (
          <div className="mt-3 space-y-3">
            {/* Bannière position existante (mode édition, coords non rechargées) */}
            {existingLocationLabel && (
              <div className="flex items-center gap-3 bg-slate-50 border border-sand-200 rounded-[10px] px-3 py-2.5">
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
                className="w-full flex items-center justify-center gap-2 py-4 rounded-[10px] border-2 border-dashed border-sand-200 text-[14px] font-medium text-ink-600 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
              >
                {geoLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MapPin size={16} />
                )}
                {geoLoading ? 'Localisation en cours…' : 'Utiliser ma position GPS'}
              </button>
            )}

            <CityAutocomplete
              value={watchedLabel}
              onValueChange={(v) => setValue('location_label', v)}
              onSelect={(hit) => {
                setValue('latitude', hit.lat, { shouldValidate: true })
                setValue('longitude', hit.lng, { shouldValidate: true })
                setValue('location_method', 'manual')
              }}
              onFocus={trackFocus('location_label').onFocus}
              ariaLabel="Ville ou lieu de la prise"
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
                  placeholder="ex : 48.2744"
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
                  placeholder="ex : -4.5765"
                  {...register('longitude', {
                    setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                  })}
                  {...trackFocus('longitude')}
                  className={inputCls}
                />
              </div>
            </div>
            <CityAutocomplete
              value={watchedLabel}
              onValueChange={(v) => setValue('location_label', v)}
              onSelect={(hit) => {
                setValue('latitude', hit.lat, { shouldValidate: true })
                setValue('longitude', hit.lng, { shouldValidate: true })
                setValue('location_method', 'manual')
              }}
              onFocus={trackFocus('location_label').onFocus}
              ariaLabel="Ville ou lieu de la prise"
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
          <FieldError error="Position requise. Choisis une ville dans les suggestions, utilise le GPS, ou saisis les coordonnées." />
        )}

        {isOutOfCoverage && (
          <p className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
            Position hors France métropolitaine : la prise sera enregistrée, mais les
            conditions et le score ne seront pas calculés.
          </p>
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
              max={isoToLocal(new Date().toISOString())}
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
            className="w-full border border-sand-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 resize-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-4">
          <label className="text-[13px] text-ink-600">Confidentialité</label>
          <Controller
            name="privacy"
            control={control}
            render={({ field }) => (
              <div className="mt-2 flex rounded-[10px] border border-sand-200 overflow-hidden">
                {[
                  { val: 'private', label: 'Privée' },
                  { val: 'friends', label: 'Abonnés' },
                  { val: 'public', label: 'Publique' },
                ].map((opt, i) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => { field.onChange(opt.val); field.onBlur() }}
                    className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${
                      i > 0 ? 'border-l border-sand-200' : ''
                    } ${
                      field.value === opt.val
                        ? 'bg-teal-500 text-navy-950 border-teal-500'
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
              'Visible par tes abonnés avec coords précises (si activé).'}
            {watchedPrivacy === 'public' &&
              'Visible par la communauté avec coords floutées à 1 km.'}
          </p>
        </div>

        <div className="mt-4 space-y-3 pt-3 border-t border-sand-200">
          <Controller
            name="precise_for_friends"
            control={control}
            render={({ field }) => (
              <ToggleRow
                label="Coords précises pour mes abonnés"
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
                    ⚠️ Tout le monde verra l&rsquo;endroit exact de ta prise.
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
          className="w-full py-4 rounded-[14px] bg-teal-500 text-navy-950 font-bold text-[16px] transition-colors hover:bg-teal-300 disabled:opacity-60 flex items-center justify-center gap-2"
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
  'w-full border border-sand-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-teal-500 placeholder:text-slate-400 bg-white'

function Card({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="bg-white rounded-[14px] border border-sand-200 p-5">
      {children}
    </div>
  )
}

// ─── Sélecteur d'espèce (sprint 31, F3) ───────────────────────────────────────
// 6 quick-picks cœur + « Autre espèce » qui déroule une recherche sur les 20
// restantes. Source unique = CARNET_SPECIES_OPTIONS (référentiel). La recherche
// balaie les 26 (taper « bar » trouve aussi le quick-pick) ; insensible aux
// accents/à la casse. Le picker reste contrôlé (RHF) : il ne stocke aucune valeur.
function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function SpeciesPicker({
  value,
  onSelect,
}: {
  value: string | undefined
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Une espèce hors cœur déjà choisie (ex. édition d'une prise « seiche ») doit
  // rester visible : le bouton « Autre espèce » affiche alors son libellé, surligné.
  const selectedIsOther = !!value && !CORE_KEYS.has(value)
  const selectedLabel = CARNET_SPECIES_OPTIONS.find((o) => o.value === value)?.label

  const q = normalizeText(query.trim())
  const results = q
    ? CARNET_SPECIES_OPTIONS.filter((o) => normalizeText(o.label).includes(q))
    : OTHER_SPECIES

  function pick(v: string) {
    onSelect(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Quick-picks cœur (1 tap pour ~95 % des prises) */}
      <div className="grid grid-cols-2 gap-2">
        {QUICK_SPECIES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => pick(s.value)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-[10px] border text-[14px] font-medium transition-colors text-left ${
              value === s.value
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-sand-200 bg-slate-50 text-ink-700 active:bg-slate-100'
            }`}
          >
            <Fish size={15} className="shrink-0" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* « Autre espèce » : déroule la recherche sur les 20 restantes */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 px-4 py-3 rounded-[10px] border text-[14px] font-medium transition-colors ${
          selectedIsOther
            ? 'border-teal-500 bg-teal-50 text-teal-700'
            : 'border-sand-200 bg-slate-50 text-ink-700 active:bg-slate-100'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Fish size={15} className="shrink-0" />
          <span>{selectedIsOther ? (selectedLabel ?? value) : `Autre espèce (${OTHER_SPECIES.length})`}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="rounded-[10px] border border-sand-200 bg-white p-2">
          <div className="mb-2 flex items-center gap-2 rounded-[8px] border border-sand-200 px-2.5">
            <Search size={14} className="shrink-0 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une espèce…"
              aria-label="Rechercher une espèce"
              autoFocus
              className="min-h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-2 py-3 text-[13px] text-ink-400">Aucune espèce ne correspond.</p>
            ) : (
              results.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => pick(s.value)}
                  className={`flex min-h-11 items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left text-[14px] transition-colors ${
                    value === s.value
                      ? 'bg-teal-50 font-medium text-teal-700'
                      : 'text-ink-700 hover:bg-slate-50'
                  }`}
                >
                  <Fish size={15} className="shrink-0 text-teal-500" />
                  <span>{s.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
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
    <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 sm:text-[12px]">
      {children}
      {required && <span className="text-coral-500 ml-0.5">*</span>}
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
        className={`relative shrink-0 w-10 h-6 rounded-full p-0 border-0 transition-colors ${
          checked ? 'bg-teal-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none absolute top-1/2 left-1 size-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
