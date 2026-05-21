import Link from "next/link";
import { ArrowRight, Play, Check, Map, BookOpen, Users } from "lucide-react";

/* ─── Composants helpers ──────────────────────────────────────────────── */

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13px] font-bold tracking-[.08em] uppercase text-teal-600">
      {children}
    </span>
  );
}

function CheckItem({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex gap-3 items-start">
      <Check size={20} className="text-teal-500 shrink-0 mt-0.5" />
      <div>
        <strong className="text-ink-900">{title}</strong>
        <div className="text-ink-500 text-sm mt-0.5">{desc}</div>
      </div>
    </li>
  );
}


/* ─── Visual : App mock ───────────────────────────────────────────────── */
function AppMock() {
  return (
    <div
      className="relative mx-auto w-full"
      style={{
        maxWidth: 280,
        aspectRatio: "9/16",
        background: "var(--navy-950)",
        borderRadius: 36,
        padding: 10,
        boxShadow: "0 40px 80px rgba(6,21,33,.3), 0 0 0 1px rgba(255,255,255,.06) inset",
      }}
    >
      <div
        className="w-full h-full overflow-hidden relative"
        style={{ borderRadius: 28, background: "linear-gradient(180deg, #1a2935 0%, #0d1820 100%)" }}
      >
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10"
          style={{ width: 100, height: 26, background: "var(--navy-950)", borderRadius: 13 }} />

        {/* Header */}
        <div className="pt-12 px-4 pb-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-[16px] text-white">Mon carnet</div>
              <div className="text-[11px] text-white/60 mt-0.5">14 prises · 7 sessions ce mois</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{ background: "rgba(20,184,166,.2)", color: "var(--teal-400)", border: "1px solid rgba(20,184,166,.4)" }}>
              ● ACTIF
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="mx-3 rounded-[16px] overflow-hidden relative" style={{ height: 170 }}>
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(20,184,166,.4), transparent 50%), linear-gradient(135deg, #1c4a5e, #0e2a37)" }} />
          <div className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          {[
            { top: "38%", left: "42%", color: "var(--teal-500)" },
            { top: "60%", left: "65%", color: "var(--amber-500)" },
            { top: "28%", left: "68%", color: "var(--teal-500)" },
          ].map((p, i) => (
            <span key={i} className="absolute"
              style={{ top: p.top, left: p.left, width: 18, height: 18, background: p.color,
                borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", border: "2px solid white",
                boxShadow: "0 3px 8px rgba(0,0,0,.3)" }} />
          ))}
        </div>

        {/* Card */}
        <div className="m-3 p-3 rounded-[14px] text-white"
          style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}>
          <div className="text-[13px] font-semibold">Bar · 67 cm</div>
          <div className="text-[10px] text-white/50 mt-0.5">06 mai · Coef. 88 · Shad kaki</div>
          <div className="flex gap-1 mt-2 items-end" style={{ height: 24 }}>
            {[30, 45, 60, 90, 100, 80, 55, 30].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm"
                style={{ height: `${h}%`, background: h >= 80 ? "var(--teal-500)" : "rgba(20,184,166,.3)" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Visual : Feature illustration ──────────────────────────────────── */
function VisualCarnet() {
  return (
    <div className="rounded-[28px] overflow-hidden relative w-full" style={{
      aspectRatio: "4/3",
      background: "radial-gradient(at 30% 70%, rgba(245,158,11,.3), transparent 50%), linear-gradient(135deg, #0a3a4d, #061d28)",
      boxShadow: "0 24px 60px rgba(10,47,61,.14)",
    }}>
      <svg viewBox="0 0 400 300" style={{ position: "absolute", inset: 0, padding: 28, width: "100%", height: "100%" }}>
        <g opacity="0.15" stroke="white" strokeWidth="0.5">
          <line x1="0" y1="60" x2="400" y2="60"/><line x1="0" y1="120" x2="400" y2="120"/>
          <line x1="0" y1="180" x2="400" y2="180"/><line x1="0" y1="240" x2="400" y2="240"/>
        </g>
        <text x="20" y="38" fill="white" fontFamily="sans-serif" fontSize="18" fontWeight="700">Mon année 2026</text>
        <text x="20" y="56" fill="rgba(255,255,255,.6)" fontFamily="sans-serif" fontSize="11">14 sessions · 23 prises</text>
        <g transform="translate(20, 90)">
          {[50, 30, 40, 10, 20, 35, 55, 60, 50, 40, 65, 80].map((y, i) => (
            <rect key={i} x={i * 30} y={y} width="22" height={110 - y}
              fill={y <= 30 ? "#14B8A6" : `rgba(20,184,166,${0.35 + (110 - y) / 200})`} rx="3" />
          ))}
        </g>
        <g transform="translate(20, 228)">
          <text fill="rgba(255,255,255,.5)" fontFamily="sans-serif" fontSize="10">PLUS BELLE PRISE</text>
          <text y="18" fill="white" fontFamily="sans-serif" fontSize="16" fontWeight="700">Bar · 71 cm</text>
          <text y="34" fill="rgba(255,255,255,.45)" fontFamily="sans-serif" fontSize="10">12 avril · Pointe du Raz</text>
        </g>
        <g transform="translate(210, 228)">
          <text fill="rgba(255,255,255,.5)" fontFamily="sans-serif" fontSize="10">SPOT FÉTICHE</text>
          <text y="18" fill="white" fontFamily="sans-serif" fontSize="16" fontWeight="700">Cap Sizun</text>
          <text y="34" fill="rgba(255,255,255,.45)" fontFamily="sans-serif" fontSize="10">5 sessions cette saison</text>
        </g>
      </svg>
    </div>
  );
}

function VisualCarte() {
  return (
    <div className="rounded-[28px] overflow-hidden relative w-full" style={{
      aspectRatio: "4/3",
      background: "radial-gradient(at 60% 40%, rgba(20,184,166,.5), transparent 50%), linear-gradient(135deg, #0a3a4d, #061d28)",
      boxShadow: "0 24px 60px rgba(10,47,61,.14)",
    }}>
      <svg viewBox="0 0 400 300" style={{ position: "absolute", inset: 0, padding: 28, width: "100%", height: "100%" }}>
        <path d="M0,180 Q60,160 120,170 T240,180 Q300,160 400,150 L400,300 L0,300 Z" fill="rgba(20,184,166,.15)" />
        <path d="M0,200 Q70,180 130,190 T260,200 Q320,185 400,175 L400,300 L0,300 Z" fill="rgba(20,184,166,.25)" />
        <circle cx="100" cy="160" r="40" fill="rgba(20,184,166,.5)" />
        <circle cx="100" cy="160" r="25" fill="rgba(20,184,166,.7)" />
        <circle cx="240" cy="180" r="50" fill="rgba(245,158,11,.4)" />
        <circle cx="240" cy="180" r="30" fill="rgba(245,158,11,.6)" />
        <circle cx="320" cy="140" r="35" fill="rgba(20,184,166,.4)" />
        <circle cx="100" cy="160" r="5" fill="white" /><circle cx="100" cy="160" r="3" fill="#14B8A6" />
        <circle cx="240" cy="180" r="5" fill="white" /><circle cx="240" cy="180" r="3" fill="#F59E0B" />
        <circle cx="320" cy="140" r="5" fill="white" /><circle cx="320" cy="140" r="3" fill="#14B8A6" />
        <text x="20" y="38" fill="white" fontFamily="sans-serif" fontSize="13" fontWeight="700">Finistère · Bar du bord</text>
        <text x="20" y="54" fill="rgba(255,255,255,.6)" fontFamily="sans-serif" fontSize="10">3 spots actifs · Coef. 88</text>
      </svg>
    </div>
  );
}

function VisualCommunaute() {
  return (
    <div className="rounded-[28px] overflow-hidden relative w-full" style={{
      aspectRatio: "4/3",
      background: "radial-gradient(at 30% 70%, rgba(245,158,11,.3), transparent 50%), linear-gradient(135deg, #0a3a4d, #061d28)",
      boxShadow: "0 24px 60px rgba(10,47,61,.14)",
    }}>
      <svg viewBox="0 0 400 300" style={{ position: "absolute", inset: 0, padding: 28, width: "100%", height: "100%" }}>
        {[
          { y: 10, color: "#14B8A6", init: "YL", name: "Yann Le Bras", line1: "Bar · 67 cm · Pointe du Raz · 06 mai", line2: "★★★★★  Coef. 88 · Shad kaki", starColor: "#2DD4BF" },
          { y: 100, color: "#F59E0B", init: "SM", name: "Sophie Marec", line1: "Lieu jaune · 54 cm · Cap Sizun · 04 mai", line2: "★★★★☆  Madaï rose", starColor: "#FBBF24" },
          { y: 190, color: "#a78bfa", init: "LB", name: "Loïc Briand", line1: "Bar · 55 cm · Anse de Térénez · 02 mai", line2: "★★★★☆  Stickbait blanc", starColor: "#c4b5fd" },
        ].map((c) => (
          <g key={c.y} transform={`translate(28, ${c.y})`}>
            <rect width="344" height="72" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.1)" strokeWidth="1"/>
            <circle cx="32" cy="36" r="20" fill={c.color} />
            <text x="32" y="41" fill="white" fontFamily="sans-serif" fontSize="13" fontWeight="700" textAnchor="middle">{c.init}</text>
            <text x="64" y="30" fill="white" fontFamily="sans-serif" fontSize="12" fontWeight="700">{c.name}</text>
            <text x="64" y="46" fill="rgba(255,255,255,.6)" fontFamily="sans-serif" fontSize="10">{c.line1}</text>
            <text x="64" y="62" fill={c.starColor} fontFamily="sans-serif" fontSize="10">{c.line2}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="bg-sand-50 text-ink-900 font-sans">

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-16 sm:py-20 lg:py-28"
        style={{
          background: `
            radial-gradient(at 15% 20%, rgba(20,184,166,.15), transparent 50%),
            radial-gradient(at 85% 80%, rgba(10,47,61,.1), transparent 50%),
            linear-gradient(180deg, var(--sand-50) 0%, #fff 100%)
          `,
        }}
      >
        {/* Dot grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(rgba(10,47,61,.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(180deg, transparent 0%, white 40%, transparent 100%)",
        }} />

        <div className="relative mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">

            {/* Texte */}
            <div>
              {/* Eyebrow */}
              <span className="inline-flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold tracking-[.04em] uppercase text-teal-600 rounded-full px-3.5 py-1.5 border border-teal-500/25"
                style={{ background: "rgba(20,184,166,.1)" }}>
                <Check size={13} />
                Le réseau des pêcheurs à la canne du bord
              </span>

              <h1 className="mt-4 mb-5 sm:mt-5 sm:mb-6">
                Le carnet, la carte, et{" "}
                <span className="text-teal-600">la communauté</span>{" "}
                qui partage.
              </h1>

              <p className="text-[16px] sm:text-[17px] lg:text-[19px] text-ink-700 leading-relaxed max-w-[600px]">
                Carnet de Pêche, c&apos;est ton carnet de pêche numérique, ta carte intelligente et ta communauté.
                Logue tes prises, vois où ça mord vraiment, échange avec les pêcheurs de ton coin — sans donner tes spots.
              </p>

              {/* CTA — empilés sur mobile, côte à côte sm+ */}
              <div className="flex flex-col sm:flex-row gap-3 mt-7">
                <Link
                  href="/auth/register"
                  className="flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] w-full sm:w-auto px-6 min-h-[52px]"
                  style={{ background: "var(--navy-900)", color: "#fff", boxShadow: "0 6px 24px rgba(10,47,61,.14)" }}
                >
                  Créer mon carnet
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/carte"
                  className="flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] text-navy-900 border-[1.5px] border-ink-200 w-full sm:w-auto px-6 min-h-[52px]"
                >
                  <Play size={15} />
                  Voir la carte démo
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 mt-10 pt-8 border-t border-ink-200">
                {[
                  { num: "100% canne", label: "Du bord, aucun compromis" },
                  { num: "Carnet", label: "Au cœur du produit" },
                  { num: "7j", label: "Essai garanti" },
                ].map((s) => (
                  <div key={s.num}>
                    <span className="block font-display text-[24px] sm:text-[28px] font-bold text-navy-900">{s.num}</span>
                    <span className="text-[12px] sm:text-[13px] text-ink-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* App mock — sous le texte sur mobile, à droite sur desktop */}
            <div className="flex justify-center mt-6 lg:mt-0 max-w-[260px] mx-auto lg:max-w-none">
              <AppMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 PILIERS ───────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-5">
          <Kicker>Trois piliers, zéro bullshit</Kicker>
          <h2 className="mt-3 mb-4 max-w-[720px]">
            Carnet de Pêche n&apos;est pas une énième app de marées.
          </h2>
          <p className="text-[16px] sm:text-[18px] text-ink-700 leading-relaxed mb-12 max-w-[680px]">
            Les autres te vendent des cartes. Carnet de Pêche te connecte à la communauté qui les a vraiment éprouvées sur le terrain.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <BookOpen size={22} />,
                title: "Le carnet",
                body: "Logue chaque prise en 3 taps : photo, espèce, taille. Conditions auto-loggées (marée, vent, lune). Stats annuelles, exports, historique infini. Privé par défaut, partage à la carte.",
              },
              {
                icon: <Map size={22} />,
                title: "La carte qui apprend",
                body: "L'algorithme se calibre sur les prises loguées par la communauté. Plus tu pêches, plus la carte devient précise. Heatmap d'activité, couches météo, marées — et un score 0-100 par spot.",
              },
              {
                icon: <Users size={22} />,
                title: "La communauté",
                body: "Le réseau social des pêcheurs à la canne. Profils, badges, fil régional, classements. Tes spots restent à toi (floutage GPS, charte stricte). Tu partages le savoir, pas les coins secrets.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-[22px] p-6 sm:p-7 border border-ink-100 transition-transform transition-shadow duration-200 hover:-translate-y-1"
              >
                <div
                  className="w-12 h-12 rounded-[12px] grid place-items-center mb-4 text-teal-600"
                  style={{ background: "linear-gradient(135deg, rgba(20,184,166,.15), rgba(20,184,166,.05))" }}
                >
                  {card.icon}
                </div>
                <h3 className="mb-2">{card.title}</h3>
                <p className="text-ink-700 text-[15px] leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE : LE CARNET ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Texte en premier (mobile) */}
            <div className="order-2 lg:order-1">
              <Kicker>Le carnet de pêche</Kicker>
              <h2 className="mt-3 mb-4">Strava pour pêcheurs. Sans la toxicité.</h2>
              <p className="text-[16px] sm:text-[17px] text-ink-700 leading-relaxed mb-6">
                Chaque session devient un souvenir traçable. Tu vois ton année en un coup d&apos;œil : ta plus belle prise, ton spot fétiche, tes meilleures conditions.
              </p>
              <ul className="flex flex-col gap-4 mb-8">
                {[
                  { title: "Auto-snapshot des conditions", desc: "Marée, vent, météo, lune, pression captés au moment de la prise." },
                  { title: "Privé par défaut", desc: "Tu décides ce que tu publies, sur quel mur, à quel cercle." },
                  { title: "Stats et insights", desc: "Tes meilleures conditions, ton coefficient idéal, ton heure d'or." },
                  { title: "Import / export", desc: "GPX, JSON, Fishbrain, FishFriender. Tes données sont à toi." },
                ].map((item) => <CheckItem key={item.title} {...item} />)}
              </ul>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-[15px] text-white bg-navy-900 min-h-[48px]"
              >
                Voir un carnet exemple →
              </Link>
            </div>
            {/* Visual en premier sur desktop, second sur mobile */}
            <div className="order-1 lg:order-2">
              <VisualCarnet />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE : LA CARTE ──────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-sand-100">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Visual à gauche desktop — toujours en bas sur mobile */}
            <div className="order-2 lg:order-1">
              <VisualCarte />
            </div>
            {/* Texte à droite desktop — toujours en haut sur mobile */}
            <div className="order-1 lg:order-2">
              <Kicker>La carte qui apprend</Kicker>
              <h2 className="mt-3 mb-4">Plus la communauté pêche, plus la carte est précise.</h2>
              <p className="text-[16px] sm:text-[17px] text-ink-700 leading-relaxed mb-6">
                L&apos;algorithme croise marées, vent, structures et — c&apos;est ce qui change tout — les prises réelles loguées par les membres.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white rounded-[14px] p-4 sm:p-5">
                  <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Spots actifs aujourd&apos;hui</div>
                  <div className="font-display text-[28px] sm:text-[32px] font-bold text-navy-900 my-1">217</div>
                  <div className="text-[12px] sm:text-[13px] text-ink-700">Score &gt; 80/100 dans ton département</div>
                </div>
                <div className="bg-white rounded-[14px] p-4 sm:p-5">
                  <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Créneau du jour</div>
                  <div className="font-display text-[22px] sm:text-[28px] font-bold text-teal-600 my-1">18:30 → 21:30</div>
                  <div className="text-[12px] sm:text-[13px] text-ink-700">Pic d&apos;activité bar prévu</div>
                </div>
              </div>
              <Link
                href="/carte"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-[15px] text-white bg-navy-900 min-h-[48px]"
              >
                Tester la carte →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE : COMMUNAUTÉ ────────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Kicker>La communauté</Kicker>
              <h2 className="mt-3 mb-4">Une communauté qui partage le savoir, pas les spots.</h2>
              <p className="text-[16px] sm:text-[17px] text-ink-700 leading-relaxed mb-6">
                Anti-fishbrain : les prises se partagent (avec floutage GPS), les techniques s&apos;échangent, mais les coins secrets restent secrets.
              </p>
              <ul className="flex flex-col gap-4">
                {[
                  { title: "Profil pêcheur", desc: "Ville, technique, espèces favorites, badges, équipement. Pas de stalking GPS." },
                  { title: "Fil régional", desc: "Conditions du jour, prises récentes, événements, alertes locales." },
                  { title: "Floutage GPS systématique", desc: "Toute prise publique est positionnée dans un rayon de 2 km. Anti spot-burning." },
                  { title: "Modération humaine", desc: "Pêcheurs ambassadeurs régionaux + IA pour signaler les abus." },
                ].map((item) => <CheckItem key={item.title} {...item} />)}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <VisualCommunaute />
            </div>
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ─────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-sand-100">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="text-center max-w-[680px] mx-auto mb-10 lg:mb-12">
            <Kicker>Ce qu&apos;en disent les pêcheurs du banc</Kicker>
            <h2 className="mt-3">Une communauté qui démarre fort</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                quote: "Le carnet a changé ma façon de pêcher. Je vois maintenant que mes meilleurs coefficients sont entre 75 et 95, pas au-dessus de 100 comme je croyais. Pure data sur ma propre pêche.",
                initials: "YL", name: "Yann L.", desc: "Finistère · Pêche au leurre",
              },
              {
                quote: "Je débute, j'ai trouvé un mentor sur la communauté qui pêche à 30 km. Il m'a expliqué ses techniques par messages, sans me filer ses spots. C'est exactement ce dont j'avais besoin.",
                initials: "JR", name: "Julien R.", desc: "Morbihan · Débutant surfcasting",
              },
              {
                quote: "Le mode hors ligne, le scoring qui s'affine avec mes prises… Carnet de Pêche fait ce que les autres apps promettent depuis 5 ans.",
                initials: "FB", name: "François B.", desc: "Charente-Maritime · Surfcasting",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-[22px] p-6 sm:p-8 border border-ink-100">
                <div className="text-amber-500 text-base mb-3">★★★★★</div>
                <blockquote className="text-[15px] sm:text-[16px] leading-relaxed text-ink-700 italic mb-5 relative pl-5">
                  <span className="absolute left-0 -top-3 text-[48px] text-teal-500 font-serif leading-none">&ldquo;</span>
                  {t.quote}
                </blockquote>
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-full grid place-items-center text-white font-bold text-[13px] shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--navy-700), var(--teal-500))" }}
                  >
                    {t.initials}
                  </span>
                  <div>
                    <strong className="block text-[14px] text-navy-900">{t.name}</strong>
                    <span className="text-[12px] text-ink-500">{t.desc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────── */}
      <section id="tarifs" className="py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-5">
          <div
            className="rounded-[28px] sm:rounded-[32px] px-6 py-12 sm:py-16 text-white text-center relative overflow-hidden"
            style={{
              background: "radial-gradient(at 20% 50%, rgba(20,184,166,.4), transparent 50%), linear-gradient(135deg, var(--navy-900), var(--navy-700))",
            }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <span className="relative block text-[12px] sm:text-[13px] font-bold tracking-[.08em] uppercase text-teal-400 mb-4">
              Essai 7 jours · satisfait ou remboursé
            </span>
            <h2 className="relative text-white">Crée ton carnet.</h2>
            <p className="relative mt-3 mb-7 max-w-[560px] mx-auto text-[15px] sm:text-[16px] text-white/80 leading-relaxed">
              Démarre avec un essai de 7 jours sur Local ou Itinérant. Carnet illimité, carte intelligente, communauté locale. La version Découverte reste gratuite pour toujours.
            </p>
            <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth/register"
                className="flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] sm:text-[16px] min-h-[52px] px-7"
                style={{ background: "var(--teal-700)", color: "#fff", boxShadow: "0 6px 18px rgba(15,118,110,.4)" }}
              >
                Démarrer gratuitement
              </Link>
              <Link
                href="/carte"
                className="flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] sm:text-[16px] text-white min-h-[52px] px-7 border-[1.5px]"
                style={{ background: "rgba(255,255,255,.1)", borderColor: "rgba(255,255,255,.2)" }}
              >
                Voir la carte
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
