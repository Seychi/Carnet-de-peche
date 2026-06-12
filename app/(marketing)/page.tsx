import Link from "next/link";
import { ArrowRight, Check, Fish, TrendingDown, TrendingUp, Waves, Zap } from "lucide-react";
import { Bathy } from "@/components/ui-v2/bathy";
import { TagData } from "@/components/ui-v2/tag-data";
import { Chip } from "@/components/ui-v2/chip";
import { ScoreRing } from "@/components/ui-v2/score-ring";
import {
  TideSparkline,
  type TideSparklineExtremum,
  type TideSparklinePoint,
} from "@/components/ui-v2/tide-sparkline";

/* ─── Données de démo (statiques — aucun fetch, c'est un visuel marqué « Exemple ») ─ */

// 25 points sinusoïdaux : 2 PM (06:42, 19:07) + 1 BM (12:58), période 12,4 h.
const DEMO_TIDE_POINTS: TideSparklinePoint[] = Array.from({ length: 25 }, (_, hour) => ({
  hour,
  height_m: 4.3 + 3.2 * Math.cos(((hour - 6.7) * Math.PI) / 6.2),
}));

const DEMO_TIDE_EXTREMA: TideSparklineExtremum[] = [
  { type: "high", hour: 6.7 },
  { type: "low", hour: 12.97 },
  { type: "high", hour: 19.12 },
];

const DEMO_NOW_HOUR = 9.6;

/* ─── Helpers UI ──────────────────────────────────────────────────────── */

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] min-h-[48px] px-6 transition-colors duration-150";
const BTN_PRIMARY = `${BTN} bg-navy-900 text-white hover:bg-navy-800`;
const BTN_ACCENT = `${BTN} bg-teal-500 text-navy-950 hover:bg-teal-300`;
const BTN_GHOST = `${BTN} border border-sand-200 text-navy-900 hover:border-navy-900`;
const BTN_GHOST_DARK = `${BTN} border border-white/20 bg-white/5 text-white hover:bg-white/10`;

function Kicker({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-3 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] ${
        onDark ? "text-teal-300" : "text-teal-600"
      }`}
    >
      <span aria-hidden="true" className="inline-block h-px w-7 bg-teal-500" />
      {children}
    </span>
  );
}

function SecNum({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[13px] font-medium uppercase tracking-[0.1em] text-ink-400">
      {children}
    </p>
  );
}

function ExampleBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={
        onDark
          ? "absolute top-3 right-3 z-10 rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white/75"
          : "absolute top-3 right-3 z-10 rounded-full border border-sand-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-ink-600"
      }
    >
      Exemple
    </span>
  );
}

function CheckItem({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <Check size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-teal-600" />
      <div>
        <strong className="text-navy-900">{title}</strong>
        <div className="mt-0.5 text-sm leading-relaxed text-ink-600">{desc}</div>
      </div>
    </li>
  );
}

/* ─── Visuels mockups (marqués « Exemple ») ───────────────────────────── */

function VisualCarnet() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[22px] border border-white/10"
      style={{
        aspectRatio: "4/3",
        background:
          "radial-gradient(at 30% 70%, rgba(217,165,60,.22), transparent 50%), linear-gradient(135deg, #0A3A4D, #04141C)",
      }}
    >
      <ExampleBadge onDark />
      <svg viewBox="0 0 400 300" style={{ position: "absolute", inset: 0, padding: 28, width: "100%", height: "100%" }}>
        <g opacity="0.15" stroke="white" strokeWidth="0.5">
          <line x1="0" y1="60" x2="400" y2="60" /><line x1="0" y1="120" x2="400" y2="120" />
          <line x1="0" y1="180" x2="400" y2="180" /><line x1="0" y1="240" x2="400" y2="240" />
        </g>
        <text x="20" y="38" fill="white" fontFamily="var(--font-display)" fontSize="18" fontWeight="700">Mon année 2026</text>
        <text x="20" y="56" fill="rgba(255,255,255,.6)" fontFamily="var(--font-mono)" fontSize="10">14 SESSIONS · 23 PRISES</text>
        <g transform="translate(20, 90)">
          {[50, 30, 40, 10, 20, 35, 55, 60, 50, 40, 65, 80].map((y, i) => (
            <rect key={i} x={i * 30} y={y} width="22" height={110 - y}
              fill={y <= 30 ? "#14B8A6" : `rgba(20,184,166,${0.35 + (110 - y) / 200})`} rx="3" />
          ))}
        </g>
        <g transform="translate(20, 228)">
          <text fill="rgba(255,255,255,.5)" fontFamily="var(--font-mono)" fontSize="9">PLUS BELLE PRISE</text>
          <text y="18" fill="white" fontFamily="var(--font-display)" fontSize="16" fontWeight="700">Bar · 71 cm</text>
          <text y="34" fill="rgba(255,255,255,.45)" fontFamily="var(--font-mono)" fontSize="9">12 AVRIL · POINTE DU RAZ</text>
        </g>
        <g transform="translate(210, 228)">
          <text fill="rgba(255,255,255,.5)" fontFamily="var(--font-mono)" fontSize="9">SPOT FÉTICHE</text>
          <text y="18" fill="white" fontFamily="var(--font-display)" fontSize="16" fontWeight="700">Cap Sizun</text>
          <text y="34" fill="rgba(255,255,255,.45)" fontFamily="var(--font-mono)" fontSize="9">5 SESSIONS CETTE SAISON</text>
        </g>
      </svg>
    </div>
  );
}

function VisualCarte() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[22px] border border-white/10"
      style={{
        aspectRatio: "4/3",
        background:
          "radial-gradient(at 60% 40%, rgba(20,184,166,.5), transparent 50%), linear-gradient(135deg, #0A3A4D, #04141C)",
      }}
    >
      <ExampleBadge onDark />
      <svg viewBox="0 0 400 300" style={{ position: "absolute", inset: 0, padding: 28, width: "100%", height: "100%" }}>
        <path d="M0,180 Q60,160 120,170 T240,180 Q300,160 400,150 L400,300 L0,300 Z" fill="rgba(20,184,166,.15)" />
        <path d="M0,200 Q70,180 130,190 T260,200 Q320,185 400,175 L400,300 L0,300 Z" fill="rgba(20,184,166,.25)" />
        <circle cx="100" cy="160" r="40" fill="rgba(20,184,166,.5)" />
        <circle cx="100" cy="160" r="25" fill="rgba(20,184,166,.7)" />
        <circle cx="240" cy="180" r="50" fill="rgba(217,165,60,.4)" />
        <circle cx="240" cy="180" r="30" fill="rgba(217,165,60,.6)" />
        <circle cx="320" cy="140" r="35" fill="rgba(20,184,166,.4)" />
        <circle cx="100" cy="160" r="5" fill="white" /><circle cx="100" cy="160" r="3" fill="#14B8A6" />
        <circle cx="240" cy="180" r="5" fill="white" /><circle cx="240" cy="180" r="3" fill="#D9A53C" />
        <circle cx="320" cy="140" r="5" fill="white" /><circle cx="320" cy="140" r="3" fill="#14B8A6" />
        <text x="20" y="38" fill="white" fontFamily="var(--font-display)" fontSize="13" fontWeight="700">Finistère · Bar du bord</text>
        <text x="20" y="54" fill="rgba(255,255,255,.6)" fontFamily="var(--font-mono)" fontSize="9">3 SPOTS ACTIFS · COEF 88</text>
      </svg>
    </div>
  );
}

function VisualCommunaute() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[22px] border border-white/10"
      style={{
        aspectRatio: "4/3",
        background:
          "radial-gradient(at 30% 70%, rgba(217,165,60,.22), transparent 50%), linear-gradient(135deg, #0A3A4D, #04141C)",
      }}
    >
      <ExampleBadge onDark />
      <svg viewBox="0 0 400 300" style={{ position: "absolute", inset: 0, padding: 28, width: "100%", height: "100%" }}>
        {[
          { y: 10, color: "#14B8A6", init: "YL", name: "Yann Le Bras", line1: "Bar · 67 cm · Pointe du Raz · 06 mai", line2: "COEF 88 · SHAD KAKI", lineColor: "#5EEAD4" },
          { y: 100, color: "#D9A53C", init: "SM", name: "Sophie Marec", line1: "Lieu jaune · 54 cm · Cap Sizun · 04 mai", line2: "PM +1H · MADAÏ ROSE", lineColor: "#D9A53C" },
          { y: 190, color: "#155A73", init: "LB", name: "Loïc Briand", line1: "Bar · 55 cm · Anse de Térénez · 02 mai", line2: "BM −2H · STICKBAIT BLANC", lineColor: "#5EEAD4" },
        ].map((c) => (
          <g key={c.y} transform={`translate(28, ${c.y})`}>
            <rect width="344" height="72" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
            <circle cx="32" cy="36" r="20" fill={c.color} />
            <text x="32" y="41" fill="white" fontFamily="var(--font-display)" fontSize="13" fontWeight="700" textAnchor="middle">{c.init}</text>
            <text x="64" y="30" fill="white" fontFamily="var(--font-display)" fontSize="12" fontWeight="700">{c.name}</text>
            <text x="64" y="46" fill="rgba(255,255,255,.6)" fontFamily="sans-serif" fontSize="10">{c.line1}</text>
            <text x="64" y="62" fill={c.lineColor} fontFamily="var(--font-mono)" fontSize="9">{c.line2}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="bg-sand-50 font-sans text-ink-900">

      {/* ── HERO — navy-950 + isobathes ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-950 py-20 sm:py-24 lg:py-32">
        <Bathy opacity={0.5} withLabels />

        <div className="relative mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">

            {/* Texte */}
            <div>
              <Kicker onDark>Canne du bord · mer · France</Kicker>

              <h1 className="mt-5 text-[clamp(40px,7vw,68px)] leading-[1.04] text-white">
                Ton carnet sait quand <span className="text-teal-300">ça va mordre</span>.
              </h1>

              <p className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-white/65 sm:text-[18px]">
                Logue tes prises. Le carnet apprend tes patterns — marée, coef, vent, heure — et
                te dit quand et où sortir. Pas des moyennes génériques :{" "}
                <strong className="text-white">tes</strong> conditions.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/register" className={`${BTN_ACCENT} w-full sm:w-auto`}>
                  Créer mon carnet — gratuit
                  <ArrowRight size={16} strokeWidth={1.7} />
                </Link>
                <Link href="/carte" className={`${BTN_GHOST_DARK} w-full sm:w-auto`}>
                  Explorer la carte
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-11 flex flex-wrap gap-x-9 gap-y-5 border-t border-white/10 pt-8">
                {[
                  { v: "6", l: "espèces de chez nous" },
                  { v: "Bretagne", l: "spots curés — extension Atlantique en cours" },
                  { v: "100%", l: "fil communautaire gratuit" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-display text-[26px] font-bold leading-none text-white sm:text-[28px]">{s.v}</div>
                    <div className="mt-1.5 text-[12.5px] text-white/45">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card data : fiche du jour (démo statique) */}
            <div className="relative">
              <span className="absolute -top-2.5 right-4 z-20 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-ink-700 shadow-sm">
                Exemple
              </span>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TagData variant="on-dark">Pointe du Raz · 47.8709°N · 4.7372°O</TagData>
                  <Chip variant="teal" mono className="border-teal-300/30 bg-teal-300/10 text-teal-300">
                    COEF 88
                  </Chip>
                </div>
                <TideSparkline
                  className="mt-4 h-24 sm:h-28"
                  points={DEMO_TIDE_POINTS}
                  extrema={DEMO_TIDE_EXTREMA}
                  nowHour={DEMO_NOW_HOUR}
                  onDark
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <TagData variant="coral" className="inline-flex items-center gap-1.5">
                    <TrendingDown size={12} strokeWidth={1.7} aria-hidden="true" />
                    Descendante · −1,2 m
                  </TagData>
                  <TagData variant="on-dark">Vent NO 12 km/h</TagData>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:p-6">
                <ScoreRing value={87} size="lg" onDark className="shrink-0" />
                <div className="min-w-0">
                  <TagData variant="on-dark">Ton créneau 18:30 → 21:30</TagData>
                  <p className="mt-1 text-[13px] leading-snug text-white/55">
                    Tes 9 derniers bars : marée descendante, coef &gt; 80, le soir.
                  </p>
                </div>
                <Chip
                  variant="gold"
                  mono
                  className="ml-auto shrink-0 border-gold-500/40 bg-gold-500/15 uppercase text-gold-500"
                >
                  <Zap size={11} strokeWidth={1.7} aria-hidden="true" />
                  Perso
                </Chip>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTRO PILIERS ───────────────────────────────────────────────── */}
      <section className="py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5">
          <Kicker>Trois piliers, zéro bullshit</Kicker>
          <h2 className="mt-4 max-w-[700px]">Pas une énième app de marées.</h2>
          <p className="mt-5 max-w-[620px] text-[16px] leading-relaxed text-ink-600 sm:text-[18px]">
            Les autres donnent les mêmes infos à tout le monde. Nous, on superpose{" "}
            <em>tes</em> prises par-dessus la donnée brute.
          </p>
        </div>
      </section>

      {/* ── 01 — LE CARNET ──────────────────────────────────────────────── */}
      <section className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <SecNum>01 — Le carnet</SecNum>
              <h2 className="mt-4">Strava pour pêcheurs. Sans la toxicité.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
                Logue chaque prise en 3 taps : photo, espèce, taille. Marée, vent, lune, pression
                captés automatiquement à la seconde de la prise. Privé par défaut.
              </p>
              <ul className="mt-7 mb-8 flex flex-col gap-4">
                {[
                  { title: "Auto-snapshot des conditions", desc: "Marée, vent, météo, lune, pression captés au moment de la prise." },
                  { title: "Privé par défaut", desc: "Tu décides ce que tu publies, sur quel mur, à quel cercle." },
                  { title: "Stats et insights", desc: "Tes meilleures conditions, ton coefficient idéal, ton heure d'or." },
                  { title: "Tes données t'appartiennent", desc: "Export GPX/JSON prévu cette année. Pas d'enfermement." },
                ].map((item) => <CheckItem key={item.title} {...item} />)}
              </ul>
              <TagData className="block">Bar · 67 cm · Coef 88 · 19:42</TagData>
              <div className="mt-7">
                <Link href="/auth/register" className={BTN_PRIMARY}>
                  Voir un carnet exemple
                  <ArrowRight size={16} strokeWidth={1.7} />
                </Link>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <VisualCarnet />
            </div>
          </div>
        </div>
      </section>

      {/* ── 02 — LA CARTE ───────────────────────────────────────────────── */}
      <section className="bg-sand-100 py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <VisualCarte />
            </div>
            <div className="order-1 lg:order-2">
              <SecNum>02 — La carte qui apprend</SecNum>
              <h2 className="mt-4">Plus la communauté pêche, plus la carte est précise.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
                Spots curés, score 0-100 recalculé chaque jour, activité réelle. L&apos;algorithme
                croise marées, vent, structures et — c&apos;est ce qui change tout — les prises
                loguées par les membres.
              </p>
              <div className="mt-7 mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-sand-200 bg-white p-4 sm:p-5">
                  <TagData className="block text-[10.5px]">Couverture actuelle</TagData>
                  <div className="my-1.5 font-display text-[28px] font-bold text-navy-900 sm:text-[32px]">Bretagne</div>
                  <div className="text-[13px] text-ink-600">spots curés — extension Atlantique en cours</div>
                </div>
                <div className="rounded-[14px] border border-sand-200 bg-white p-4 sm:p-5">
                  <TagData className="block text-[10.5px]">Créneau du jour · Exemple</TagData>
                  <div className="my-1.5 font-mono text-[22px] font-semibold text-teal-600 sm:text-[26px]">18:30 → 21:30</div>
                  <div className="text-[13px] text-ink-600">Pic d&apos;activité bar prévu</div>
                </div>
              </div>
              <Link href="/carte" className={BTN_PRIMARY}>
                Tester la carte
                <ArrowRight size={16} strokeWidth={1.7} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIFFÉRENCIATEUR : SCORING PERSO — navy-950 + isobathes ──────── */}
      <section className="relative overflow-hidden bg-navy-950 py-24 sm:py-28">
        <Bathy opacity={0.35} density={3} />
        <div className="relative mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Kicker onDark>Le différenciateur</Kicker>
              <h2 className="mt-4 text-white">
                « Tu pêches mieux en descendante, coef &gt; 80, après 3 jours sans pluie. »
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-white/65 sm:text-[18px]">
                Ça, aucune app générique ne peut te le dire. Le solunar standard est identique pour
                tous les pêcheurs de France. Ton scoring, lui, est calculé sur{" "}
                <strong className="text-white">ton historique</strong> — et il s&apos;affine à
                chaque prise loguée.
              </p>
              <div className="mt-8">
                <Link href="/auth/register" className={BTN_ACCENT}>
                  Commencer à loguer
                  <ArrowRight size={16} strokeWidth={1.7} />
                </Link>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm sm:p-7">
              <ExampleBadge onDark />
              <TagData variant="on-dark">Tes patterns · 23 prises analysées</TagData>
              <table className="mt-4 w-full text-sm">
                <tbody>
                  {[
                    ["Marée", "descendante · 71%"],
                    ["Coefficient", "80 – 102"],
                    ["Créneau", "18:00 – 22:00"],
                    ["Vent", "NO < 20 km/h"],
                    ["Leurre", "shad kaki · 9/23"],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-t border-white/10 first:border-t-0">
                      <td className="py-2.5 pr-3 text-white/75">{k}</td>
                      <td className="py-2.5 text-right font-mono text-[13px] text-teal-300">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRÉCISION MER ───────────────────────────────────────────────── */}
      <section className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-[22px] border border-sand-200 bg-sand-50 p-6 sm:p-7">
                <ExampleBadge />
                <div className="flex flex-wrap items-center justify-between gap-3 pr-20">
                  <strong className="font-display text-navy-900">Brest · aujourd&apos;hui</strong>
                  <TagData variant="teal">Vives-eaux</TagData>
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-sand-200">
                      {["Marée", "Heure", "Hauteur", "Coef"].map((h) => (
                        <th
                          key={h}
                          className="pb-2 text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { t: "PM", h: "06:42", m: "7,35 m", c: "88" },
                      { t: "BM", h: "12:58", m: "1,10 m", c: "—" },
                      { t: "PM", h: "19:07", m: "7,52 m", c: "90" },
                    ].map((r, i) => (
                      <tr key={i} className="border-b border-sand-200 last:border-b-0">
                        <td className="py-2.5 text-ink-600">{r.t}</td>
                        <td className="py-2.5 font-mono text-[13px] text-ink-900">{r.h}</td>
                        <td className="py-2.5 font-mono text-[13px] text-ink-900">{r.m}</td>
                        <td className={`py-2.5 font-mono text-[13px] ${r.c === "—" ? "text-ink-400" : "text-teal-600"}`}>
                          {r.c}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-sand-200 pt-4">
                  <TagData>Houle 0,8 m · 9 s</TagData>
                  <TagData>Eau 14,2 °C</TagData>
                  <TagData>1018 hPa</TagData>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Kicker>Profondeur mer</Kicker>
              <h2 className="mt-4">La mer, à la minute. Pas à la louche.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
                PM/BM port par port, coefficients, houle, période, vent, température de l&apos;eau.
                Les apps généralistes traitent la mer comme un lac. Pas nous : c&apos;est notre seul
                terrain.
              </p>
              <ul className="mt-6 grid gap-3">
                {[
                  "Courbe de marée 24 h avec curseur « maintenant »",
                  "Vagues, houle et période — pas juste « du vent »",
                  "Créneaux solunaires justifiés, astronomie à l'appui",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] text-ink-900">
                    <Check size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-teal-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 03 — LA COMMUNAUTÉ ──────────────────────────────────────────── */}
      <section className="py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <SecNum>03 — La communauté</SecNum>
              <h2 className="mt-4">Le savoir se partage. Les coins restent secrets.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
                Toute prise publique est floutée à 1 km, systématiquement. Tu partages la technique,
                les conditions, la fierté — jamais le GPS exact. Et le fil est{" "}
                <strong className="text-navy-900">100% gratuit</strong>, dans tous les départements
                côtiers.
              </p>
              <div className="mt-5 mb-7">
                <Chip variant="teal">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-teal-500" />
                  Fil, likes, commentaires, follows : gratuits pour toujours
                </Chip>
              </div>
              <ul className="flex flex-col gap-4">
                {[
                  { title: "Profil pêcheur", desc: "Ville, technique, espèces favorites, badges, équipement. Pas de stalking GPS." },
                  { title: "Fil régional", desc: "Conditions du jour, prises récentes, événements, alertes locales." },
                  { title: "Floutage GPS systématique", desc: "Toute prise publique est positionnée dans un rayon de 1 km. Anti spot-burning." },
                  { title: "Modération communautaire", desc: "Signalement direct sur chaque post. Charte stricte. Modération IA prévue post-beta." },
                ].map((item) => <CheckItem key={item.title} {...item} />)}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <VisualCommunaute />
            </div>
          </div>
        </div>
      </section>

      {/* ── POURQUOI MAINTENANT ─────────────────────────────────────────── */}
      <section className="bg-sand-100 py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="mx-auto mb-12 max-w-[680px] text-center lg:mb-14">
            <Kicker>Le bon moment</Kicker>
            <h2 className="mt-4">Pourquoi un carnet de pêche maintenant ?</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                icon: <Fish size={22} strokeWidth={1.7} />,
                title: "Une pêche accessible à tous",
                body: "La canne du bord, c'est la façon la plus simple de pêcher en mer : pas de bateau, pas de permis. Juste une canne, le littoral, et l'envie d'apprendre.",
              },
              {
                icon: <TrendingUp size={22} strokeWidth={1.7} />,
                title: "L'envie de comprendre sa pêche",
                body: "Marées, vent, saisons, heures : tout ce qui fait une bonne sortie restait dans la tête ou sur un carnet papier. On veut t'aider à y voir clair, à partir de tes propres prises.",
              },
              {
                icon: <Waves size={22} strokeWidth={1.7} />,
                title: "Rien de pensé pour nos côtes",
                body: "Les apps existantes sont généralistes ou américaines. Aucune ne parle vraiment de la canne du bord en mer, des espèces et des spots de chez nous.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-[22px] border border-sand-200 bg-white p-6 sm:p-8">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-[12px] bg-teal-500/10 text-teal-600">
                  {c.icon}
                </div>
                <h3 className="mb-2 font-display text-lg text-navy-900">{c.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-600 sm:text-[15px]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ──────────────────────────────────────────────── */}
      <section id="tarifs" className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5 text-center">
          <Kicker>Tarifs</Kicker>
          <h2 className="mt-4">
            Gratuit pour loguer et échanger.
            <br className="hidden sm:block" /> Payant pour la précision.
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
            Carnet illimité, fil complet et guides : gratuits pour toujours. La carte précise, le
            score et le hors-ligne : à partir de 4,90 €/mois.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-5 text-left md:grid-cols-3">
            {[
              {
                name: "Découverte",
                price: "0 €",
                per: "pour toujours",
                desc: "Carnet illimité, fil régional complet (poste, commente, like), marées + météo, guides.",
              },
              {
                name: "Local",
                price: "4,90 €",
                per: "/ mois",
                desc: "La carte complète de ton département : coords précises, score 0-100, filtres, hors-ligne.",
              },
              {
                name: "Itinérant",
                price: "9,90 €",
                per: "/ mois",
                desc: "Tous les départements côtiers, bathymétrie premium, itinéraires GPS multi-spots.",
              },
            ].map((p) => (
              <Link
                key={p.name}
                href="/tarifs"
                className="group rounded-[22px] border border-sand-200 bg-sand-50 p-6 transition-colors duration-150 hover:border-navy-900 sm:p-7"
              >
                <TagData>{p.name}</TagData>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-[32px] font-semibold leading-none text-navy-900">{p.price}</span>
                  <span className="text-sm text-ink-400">{p.per}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{p.desc}</p>
                <span className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-teal-600">
                  Voir le détail
                  <ArrowRight size={15} strokeWidth={1.7} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/register" className={`${BTN_PRIMARY} w-full sm:w-auto`}>
              Créer mon carnet gratuit
            </Link>
            <Link href="/tarifs" className={`${BTN_GHOST} w-full sm:w-auto`}>
              Voir les tarifs
            </Link>
          </div>
          <p className="mt-7 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
            Essai 7 jours · satisfait ou remboursé · annulation en ligne depuis ton compte
          </p>
        </div>
      </section>

    </div>
  );
}
