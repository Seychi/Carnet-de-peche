import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Lock, Users, Globe, MapPin, Wind, Waves, Thermometer, Gauge, Cloud, Droplets } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCatchById } from '@/lib/catches/queries'
import type { ConditionsSnapshot } from '@/lib/conditions/openmeteo'
import { PhotoViewer } from '@/components/catches/PhotoViewer'
import { CatchActionsMenu } from '@/components/catches/CatchActionsMenu'

// ─── Dictionnaires ────────────────────────────────────────────────────────────

const SPECIES_LABELS: Record<string, string> = {
  bar: 'Bar',
  dorade_royale: 'Dorade royale',
  lieu_jaune: 'Lieu jaune',
  maquereau: 'Maquereau',
  sar: 'Sar',
  orphie: 'Orphie',
}

const TECHNIQUE_LABELS: Record<string, string> = {
  leurres: 'Leurres',
  surfcasting: 'Surfcasting',
  flottante: 'Flottante',
  vif: 'Vif',
}

const PRIVACY_CONFIG = {
  private: { Icon: Lock,  label: 'Privée',    desc: 'Visible par toi seul.',                                       color: 'text-slate-500' },
  friends: { Icon: Users, label: 'Amis',       desc: 'Visible par tes abonnés avec coords précises (si activé).', color: 'text-blue-500'  },
  public:  { Icon: Globe, label: 'Publique',   desc: 'Visible par la communauté avec coords floutées à 1 km.',    color: 'text-teal-500'  },
}

const TIDE_LABELS: Record<string, string> = {
  rising: '↑ Montante',
  falling: '↓ Descendante',
  high: '⬆ Pleine mer',
  low: '⬇ Basse mer',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function windDirLabel(deg: number | null): string {
  if (deg === null) return ''
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return ` ${dirs[Math.round(deg / 45) % 8]}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ id: string }> }

export default async function CatchDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const c = await getCatchById(id)
  if (!c) notFound()

  // URL signée pour la photo (bucket privé)
  let photoUrl: string | null = null
  if (c.photo_path) {
    const { data: signed } = await supabase.storage
      .from('catches')
      .createSignedUrl(c.photo_path, 3600)
    photoUrl = signed?.signedUrl ?? null
  }

  const caughtAt = new Date(c.caught_at ?? '')
  const conditions = c.conditions as ConditionsSnapshot | null
  const privacy = PRIVACY_CONFIG[c.privacy as keyof typeof PRIVACY_CONFIG] ?? PRIVACY_CONFIG.private
  const speciesLabel = SPECIES_LABELS[c.species ?? ''] ?? c.species ?? '—'
  const location = c.location_label ?? c.spot_name ?? null

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/carnet"
            className="text-[13px] text-ink-400 hover:text-ink-700 transition-colors"
          >
            ← Carnet
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={`/carnet/${id}/modifier`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-ink-600 hover:bg-slate-100 transition-colors"
            >
              <Pencil size={13} />
              Modifier
            </Link>
            <CatchActionsMenu catchId={id} />
          </div>
        </div>

        {/* ── Photo (clic = zoom) ── */}
        {photoUrl && (
          <PhotoViewer
            src={photoUrl}
            alt={`Photo de ${speciesLabel}`}
            className="mb-4"
          />
        )}

        {/* ── Hero : espèce + mesures ── */}
        <div className="bg-white rounded-[22px] border border-slate-100 p-6 shadow-sm mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold text-navy-900 leading-tight">
                {speciesLabel}
              </h1>
              <p className="text-[13px] text-ink-500 mt-1">
                {caughtAt.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                à{' '}
                {caughtAt.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {location && (
                <p className="text-[13px] text-ink-400 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} className="shrink-0" />
                  {location}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 text-[12px] font-semibold px-3 py-1 rounded-full border ${
                c.released
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-navy-900/10 text-navy-900 border-navy-900/20'
              }`}
            >
              {c.released ? 'Relâché' : 'Conservé'}
            </span>
          </div>

          {/* Mesures */}
          {(c.size_cm || c.weight_g) && (
            <div className="flex gap-6 mt-5 pt-5 border-t border-slate-100">
              {c.size_cm && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
                    Taille
                  </p>
                  <p className="text-[26px] font-bold text-navy-900 leading-tight">
                    {c.size_cm}
                    <span className="text-[14px] font-normal text-ink-500 ml-1">cm</span>
                  </p>
                </div>
              )}
              {c.weight_g && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
                    Poids
                  </p>
                  <p className="text-[26px] font-bold text-navy-900 leading-tight">
                    {(c.weight_g / 1000).toFixed(2)}
                    <span className="text-[14px] font-normal text-ink-500 ml-1">kg</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section Comment ── */}
        <Section title="Comment">
          <Row label="Technique" value={TECHNIQUE_LABELS[c.technique ?? ''] ?? c.technique ?? '—'} />
          {(c.lure_brand || c.lure_model) && (
            <Row
              label="Leurre"
              value={[c.lure_brand, c.lure_model].filter(Boolean).join(' — ')}
            />
          )}
          {c.bait_type && <Row label="Appât" value={c.bait_type} />}
        </Section>

        {/* ── Section Conditions ── */}
        {conditions && (
          <Section
            title="Conditions"
            badge="Auto enregistré"
            className="mt-4"
          >
            <ConditionsGrid conditions={conditions} />
          </Section>
        )}

        {/* ── Section Notes ── */}
        {c.notes && (
          <Section title="Notes" className="mt-4">
            <p className="text-[14px] text-ink-700 leading-relaxed">{c.notes}</p>
          </Section>
        )}

        {/* ── Section Confidentialité ── */}
        <Section title="Confidentialité" className="mt-4">
          <div className="flex items-center gap-2.5 mb-3">
            <privacy.Icon size={16} className={privacy.color} />
            <span className="text-[14px] font-semibold text-navy-900">{privacy.label}</span>
          </div>
          <p className="text-[13px] text-ink-500 mb-3">{privacy.desc}</p>
          {c.privacy !== 'private' && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <PrivacyToggleInfo
                label="Coords précises pour mes amis"
                active={c.precise_for_friends ?? true}
              />
              <PrivacyToggleInfo
                label="Coords précises publiques"
                active={c.reveal_precise_to_public ?? false}
              />
            </div>
          )}
        </Section>

        {/* ── Mini carte placeholder (sprint 5) ── */}
        <div className="mt-4 bg-slate-100 rounded-[14px] overflow-hidden aspect-[16/7] relative flex items-center justify-center">
          {/* Grille imitant une carte */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative text-center px-4">
            <MapPin size={28} className="text-slate-400 mx-auto mb-2" />
            {location ? (
              <p className="text-[13px] font-semibold text-slate-600">{location}</p>
            ) : (
              <p className="text-[13px] font-semibold text-slate-500">Position enregistrée</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Carte interactive · Sprint 5</p>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  children,
  className,
}: {
  title: string
  badge?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-[14px] border border-slate-100 p-5 shadow-sm ${className ?? ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{title}</p>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[13px] text-ink-500">{label}</span>
      <span className="text-[13px] font-medium text-ink-900">{value}</span>
    </div>
  )
}

function PrivacyToggleInfo({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-ink-500">{label}</span>
      <span
        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          active
            ? 'bg-teal-50 text-teal-600 border border-teal-200'
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}
      >
        {active ? 'Oui' : 'Non'}
      </span>
    </div>
  )
}

function ConditionsGrid({ conditions: c }: { conditions: ConditionsSnapshot }) {
  const cells: { Icon: React.ElementType; label: string; value: string }[] = []

  if (c.air_temperature_c != null)
    cells.push({ Icon: Thermometer, label: 'Temp. air',     value: `${c.air_temperature_c.toFixed(1)} °C` })
  if (c.water_temperature_c != null)
    cells.push({ Icon: Thermometer, label: 'Temp. eau',     value: `${c.water_temperature_c.toFixed(1)} °C` })
  if (c.wind_speed_kmh != null)
    cells.push({ Icon: Wind,        label: 'Vent',           value: `${c.wind_speed_kmh.toFixed(0)} km/h${windDirLabel(c.wind_direction_deg)}` })
  if (c.pressure_hpa != null)
    cells.push({ Icon: Gauge,       label: 'Pression',       value: `${c.pressure_hpa.toFixed(0)} hPa` })
  if (c.wave_height_m != null)
    cells.push({ Icon: Waves,       label: 'Houle',          value: `${c.wave_height_m.toFixed(1)} m` })
  if (c.wave_period_s != null)
    cells.push({ Icon: Waves,       label: 'Période houle',  value: `${c.wave_period_s.toFixed(0)} s` })
  if (c.cloud_cover_pct != null)
    cells.push({ Icon: Cloud,       label: 'Nuages',         value: `${c.cloud_cover_pct.toFixed(0)} %` })
  if (c.precipitation_mm != null && c.precipitation_mm > 0)
    cells.push({ Icon: Droplets,    label: 'Précipitations', value: `${c.precipitation_mm.toFixed(1)} mm` })
  if (c.tide_state != null)
    cells.push({ Icon: Waves,       label: 'Marée',          value: TIDE_LABELS[c.tide_state] ?? c.tide_state })

  if (cells.length === 0) {
    return (
      <p className="text-[13px] text-ink-400 italic">
        Aucune donnée météo disponible pour cette prise.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cells.map(({ Icon, label, value }) => (
        <div key={label} className="bg-slate-50 rounded-[10px] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon size={11} className="text-ink-400 shrink-0" />
            <p className="text-[10px] text-ink-400 uppercase tracking-wide">{label}</p>
          </div>
          <p className="text-[14px] font-bold text-navy-900">{value}</p>
        </div>
      ))}
    </div>
  )
}
