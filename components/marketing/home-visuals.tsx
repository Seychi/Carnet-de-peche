import { Bathy } from '@/components/ui-v2/bathy'
import { BRITTANY_MARKERS, BRITTANY_PATH, BRITTANY_VIEWBOX } from '@/lib/marketing/brittany-coast'

/* Aperçus produit de la home (DA v2 « instrument marine »). Server Components,
   purement visuels → role="img" + aria-label, intérieur décoratif aria-hidden.
   Aucune donnée d'utilisateur réel : lieux réels + chiffres illustratifs, sauf
   le compte de spots (réel, dynamique) passé à HomeVisualMap. */

const SEA_NIGHT = 'linear-gradient(160deg,#0A3A4D 0%,#062430 55%,#02101A 100%)'

function markerStyle(score: number) {
  if (score >= 75) return { stroke: '#14B8A6', txt: '#5EEAD4', halo: '20,184,166', r: 13, fs: 11 }
  if (score >= 50) return { stroke: '#D9A53C', txt: '#D9A53C', halo: '217,165,60', r: 12, fs: 11 }
  return { stroke: '#7E8C95', txt: '#B7C2C9', halo: '126,140,149', r: 10, fs: 9 }
}

// ─── Carte · score d'activité (vraie côte bretonne, traitement « nuit ») ────
export function HomeVisualMap({ spotsCount }: { spotsCount: number | null }) {
  const sub = spotsCount ? `${spotsCount} SPOTS CURÉS · 24 DÉPTS CÔTIERS` : 'SPOTS CURÉS · 24 DÉPTS CÔTIERS'
  const m0 = BRITTANY_MARKERS[0]
  return (
    <figure
      role="img"
      aria-label={`Carte des spots curés : ${spotsCount ?? 'des dizaines de'} spots avec leur score d'activité`}
      className="relative m-0 aspect-[4/3] w-full overflow-hidden rounded-[22px] border border-white/10 shadow-lg"
      style={{ background: SEA_NIGHT }}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <svg
          viewBox={BRITTANY_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <radialGradient id="hvm-sea" cx="42%" cy="40%" r="62%">
              <stop offset="0%" stopColor="rgba(20,184,166,.16)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            {BRITTANY_MARKERS.map((m, i) => {
              const s = markerStyle(m.score)
              return (
                <radialGradient key={i} id={`hvm-halo-${i}`}>
                  <stop offset="0%" stopColor={`rgba(${s.halo},.5)`} />
                  <stop offset="60%" stopColor={`rgba(${s.halo},.06)`} />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              )
            })}
          </defs>

          <rect x="0" y="0" width="440" height="330" fill="url(#hvm-sea)" />
          <line x1={m0.x} y1="0" x2={m0.x} y2="330" stroke="rgba(255,255,255,.10)" strokeDasharray="2 6" />
          <line x1="0" y1={m0.y} x2="440" y2={m0.y} stroke="rgba(255,255,255,.10)" strokeDasharray="2 6" />

          <path
            d={BRITTANY_PATH}
            fill="#0E3D4F"
            stroke="#5EEAD4"
            strokeWidth={1.1}
            strokeOpacity={0.5}
            strokeLinejoin="round"
          />

          {BRITTANY_MARKERS.map((m, i) => {
            const s = markerStyle(m.score)
            return (
              <g key={i}>
                <circle cx={m.x} cy={m.y} r={s.r * 2.2} fill={`url(#hvm-halo-${i})`} />
                <circle cx={m.x} cy={m.y} r={s.r} fill="rgba(2,12,20,.55)" stroke={s.stroke} strokeWidth={s.r >= 12 ? 3.4 : 3} />
                <text
                  x={m.x}
                  y={m.y}
                  dy=".34em"
                  textAnchor="middle"
                  fontWeight={700}
                  fontSize={s.fs}
                  fill={s.txt}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {m.score}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="absolute left-4 top-3.5">
          <p className="font-display text-[15px] font-bold leading-none text-white">Carte · score d&apos;activité</p>
          <p className="mt-1.5 font-mono text-[10.5px] tracking-[0.09em] text-white/55">{sub}</p>
        </div>
        <div className="absolute right-4 top-3.5 text-center font-mono text-[9px] leading-[1.1] text-white/45">
          N<br />↑
        </div>
        <span className="absolute bottom-3 right-3.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.06em] text-white/70">
          48.04°N · 4.73°O
        </span>
      </div>
    </figure>
  )
}

// ─── Carnet · récap annuel (illustratif) ───────────────────────────────────
const CARNET_BARS = [50, 30, 42, 14, 22, 36, 56, 62, 50, 40, 66, 82]

export function HomeVisualCarnet() {
  const max = Math.max(...CARNET_BARS)
  return (
    <figure
      role="img"
      aria-label="Aperçu du carnet : récap annuel de tes sessions, prises et conditions"
      className="relative m-0 aspect-[4/3] w-full overflow-hidden rounded-[22px] border border-white/10 shadow-lg"
      style={{ background: SEA_NIGHT }}
    >
      <Bathy opacity={0.4} density={4} />
      <div aria-hidden="true" className="absolute inset-0 p-5">
        <p className="font-display text-[15px] font-bold leading-none text-white">Ton année, en un coup d&apos;œil</p>
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.09em] text-white/50">SESSIONS · PRISES · CONDITIONS</p>

        <svg viewBox="0 0 360 150" preserveAspectRatio="none" className="mt-4 h-[42%] w-full">
          {[0, 0.5, 1].map((g) => (
            <line key={g} x1="0" y1={150 * g} x2="360" y2={150 * g} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
          ))}
          {CARNET_BARS.map((v, i) => {
            const h = (v / max) * 134
            const top = v === max
            return (
              <rect
                key={i}
                x={i * 30 + 3}
                y={150 - h}
                width="22"
                height={h}
                rx="3"
                fill={top ? '#5EEAD4' : `rgba(20,184,166,${0.32 + (v / max) * 0.4})`}
              />
            )
          })}
        </svg>

        <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[12px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
            <p className="font-mono text-[8.5px] tracking-[0.1em] text-white/45">RECORD PERSO</p>
            <p className="mt-1 font-display text-[15px] font-bold text-white">Ton plus beau bar</p>
          </div>
          <div className="rounded-[12px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
            <p className="font-mono text-[8.5px] tracking-[0.1em] text-white/45">SPOT FÉTICHE</p>
            <p className="mt-1 font-display text-[15px] font-bold text-white">Là où ça mord</p>
          </div>
        </div>
      </div>
    </figure>
  )
}

// ─── Fil régional (illustratif, anonymisé par département) ──────────────────
const FEED_CARDS = [
  { dept: '29', color: '#14B8A6', who: 'Un pêcheur du Finistère', line1: 'Bar · 67 cm · marée descendante', line2: 'COEF 88 · SHAD KAKI', lc: '#5EEAD4' },
  { dept: '56', color: '#D9A53C', who: 'Une pêcheuse du Morbihan', line1: 'Lieu jaune · 54 cm · pleine mer +1 h', line2: 'MADAÏ ROSE', lc: '#D9A53C' },
  { dept: '22', color: '#155A73', who: "Un pêcheur des Côtes-d'Armor", line1: 'Bar · 55 cm · basse mer −2 h', line2: 'STICKBAIT BLANC', lc: '#5EEAD4' },
]

export function HomeVisualFeed() {
  return (
    <figure
      role="img"
      aria-label="Aperçu du fil régional : prises récentes partagées par la communauté, sans position GPS exacte"
      className="relative m-0 aspect-[4/3] w-full overflow-hidden rounded-[22px] border border-white/10 shadow-lg"
      style={{ background: SEA_NIGHT }}
    >
      <Bathy opacity={0.4} density={4} />
      <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-2.5 p-5">
        <div>
          <p className="font-display text-[15px] font-bold leading-none text-white">Le fil régional</p>
          <p className="mt-1.5 font-mono text-[10px] tracking-[0.09em] text-white/50">TOUS LES DÉPARTEMENTS CÔTIERS · GRATUIT</p>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2">
          {FEED_CARDS.map((c) => (
            <div
              key={c.dept}
              className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2 shadow-sm"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold text-white"
                style={{ background: c.color }}
              >
                {c.dept}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[12.5px] font-bold leading-tight text-white">{c.who}</p>
                <p className="truncate text-[11px] leading-tight text-white/60">{c.line1}</p>
                <p className="mt-0.5 truncate font-mono text-[9px] tracking-[0.04em]" style={{ color: c.lc }}>
                  {c.line2}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </figure>
  )
}
