// ─── Template marin partagé pour les cartes OG (Satori / next/og) ─────────────
// Extrait VERBATIM de `app/og/spot/[slug]/route.tsx` (sprint 38, WS B) pour être
// réutilisé par `app/og/card/[slug]` sans dupliquer la charte. Tout est Satori-safe :
//   * pas de <mask> (l'échancrure du logo est repeinte par un trait couleur du fond),
//   * tout conteneur multi-enfants a `display:'flex'` explicite,
//   * `border*` décomposés (borderWidth/Style/Color).
// AUCUN import server-only / runtime Node ici : ce module est consommé par des
// routes `runtime = 'edge'`.

import type { CSSProperties, ReactNode } from 'react'

// ── Charte DA v2 « Instrument de précision marine » ───────────────────────────
// Palette par défaut (thème « marine »). Exportée pour compat ascendante : les
// layouts existants (CatchCard, ConditionsCard…) importent ces constantes
// directement. Les thèmes (cf OG_THEMES plus bas) reprennent ces mêmes clés et
// ne changent QUE les couleurs (edge-safe : aucune logique, aucune police).
export const NAVY950 = '#04141C'
export const NAVY700 = '#155A73'
export const TEAL = '#14B8A6'
export const TEAL300 = '#5EEAD4'
export const SAND50 = '#FBF8F2'
export const WHITE = '#FFFFFF'
export const CORAL = '#E5604F'

// ── Thèmes de carte (D3 : marine défaut + sombre + saison) ────────────────────
// Un thème = un jeu de couleurs. Tout le reste (layout, espacements, polices)
// est identique. `bg` = fond du cadre, `iso` = isobathes décoratives, `accent` =
// teal d'accent (kicker, chiffres), `accentSoft` = variante claire, `coral` =
// pastille record perso, `sand`/`white` = textes. Edge-safe (juste des chaînes).
export type OgTheme = {
  bg: string
  iso: string
  accent: string
  accentSoft: string
  coral: string
  sand: string
  white: string
}

export type OgThemeName = 'marine' | 'sombre' | 'saison'

export const OG_THEMES: Record<OgThemeName, OgTheme> = {
  // Marine (défaut) : la charte DA v2 historique.
  marine: {
    bg: NAVY950,
    iso: NAVY700,
    accent: TEAL,
    accentSoft: TEAL300,
    coral: CORAL,
    sand: SAND50,
    white: WHITE,
  },
  // Sombre : noir profond, accent teal plus froid, contraste maximal.
  sombre: {
    bg: '#0A0F12',
    iso: '#22343D',
    accent: '#2DD4BF',
    accentSoft: '#7FE9DC',
    coral: '#F2745F',
    sand: '#F4F6F6',
    white: '#FFFFFF',
  },
  // Saison : ambiance crépuscule chaud (couchant au bord), accent ambré.
  saison: {
    bg: '#1B1014',
    iso: '#5A2E32',
    accent: '#E8A04A',
    accentSoft: '#F4C77E',
    coral: '#E5604F',
    sand: '#FBF3EC',
    white: '#FFFFFF',
  },
}

export function parseTheme(value: string | null | undefined): OgThemeName {
  return value === 'sombre' || value === 'saison' ? value : 'marine'
}

// Stack monospace pour les CHIFFRES métier (DA : tout chiffre passe en font-mono).
// Satori n'embarque pas la vraie JetBrains Mono, mais `tabular-nums` donne
// l'alignement chiffré tabulaire (l'essentiel de l'intention), sans fetch de
// police ni risque de 500 en edge. cf docs-researcher 2026-06-27.
export const MONO_STYLE: CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
}

// ── Isobathes décoratives (paths repris de docs/maquette-v2/index.html) ───────
export const ISOBATHS = [
  { d: 'M-50 580 C 250 480, 480 640, 760 540 S 1240 460, 1460 560', opacity: 0.5 },
  { d: 'M-50 500 C 230 400, 500 560, 780 460 S 1230 380, 1460 470', opacity: 0.4 },
  { d: 'M-50 420 C 220 330, 520 480, 800 390 S 1230 300, 1460 390', opacity: 0.3 },
]

// ── Formats de carte ──────────────────────────────────────────────────────────
export type OgFormat = 'og' | 'story'

export const OG_DIMENSIONS: Record<OgFormat, { width: number; height: number }> = {
  og: { width: 1200, height: 630 }, // preview de lien (Twitter/Discord/iMessage…)
  story: { width: 1080, height: 1920 }, // Stories/TikTok 9:16
}

export function parseFormat(value: string | null | undefined): OgFormat {
  return value === 'story' ? 'story' : 'og'
}

// ── Logo « carnet qui ferre » (Satori-safe, variante dark fond navy-950) ──────
// source: public/logo/logo-icon.svg — Satori ne supporte pas <mask>, l'échancrure
// de l'hameçon est émulée par un trait couleur du fond.
export function OgLogoMark({ size = 44, theme = OG_THEMES.marine }: { size?: number; theme?: OgTheme }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <g stroke={theme.sand} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <rect x="11" y="6" width="26" height="29" rx="5" />
        <path d="M16 13.5h10" />
        <path d="M16 19.5h10" />
        <path d="M16 25.5h6" />
      </g>
      {/* échancrure : repeint le fond par-dessus le bord du carnet */}
      <path d="M31 33v4" stroke={theme.bg} strokeWidth={5} strokeLinecap="butt" />
      <path
        d="M31 6v31a4.5 4.5 0 1 1-9 0v-2"
        stroke={theme.accentSoft}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Kicker (tiret teal + étiquette espacée) ───────────────────────────────────
export function OgKicker({ label, marginBottom = 28 }: { label: string; marginBottom?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: `${marginBottom}px` }}>
      <div style={{ width: '40px', height: '2px', background: TEAL }} />
      <span
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: TEAL300,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Footer marque + URL (+ handle @username quand fourni) ─────────────────────
// La marque est TOUJOURS présente (logo + URL) : même une capture d'écran fait de
// l'acquisition (« via Carnet de Pêche »). `url` personnalisable selon la page.
// Quand `username` est fourni, on affiche « via @{username} · {url} » à droite
// (handle du partageur, jamais de coordonnée). `theme` colore logo + textes.
export function OgFooter({
  url = 'carnet-de-peche.com',
  username,
  theme = OG_THEMES.marine,
}: {
  url?: string
  username?: string | null
  theme?: OgTheme
}) {
  const handle = (username ?? '').trim()
  const rightText = handle ? `via @${handle} · ${url}` : url
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '24px',
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
        borderTopColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <OgLogoMark size={44} theme={theme} />
        <span style={{ fontSize: '24px', fontWeight: 700, color: theme.white }}>Carnet de Pêche</span>
      </div>
      <span style={{ fontSize: '16px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.35)' }}>
        {rightText}
      </span>
    </div>
  )
}

// ── Cadre complet (fond navy + isobathes + contenu) ───────────────────────────
// `OgFrame` enveloppe TOUTE carte : fond navy-950, isobathes décoratives, padding,
// et un footer marque optionnel. Le contenu (`children`) est posé dans une colonne
// flex au-dessus des isobathes. Format-aware (og vs story) pour padding/échelle.
export function OgFrame({
  format,
  children,
  footerUrl,
  withFooter = true,
  rootOverlay,
  theme = OG_THEMES.marine,
  username,
}: {
  format: OgFormat
  children: ReactNode
  footerUrl?: string
  withFooter?: boolean
  // Éléments posés en absolu PAR RAPPORT AU CADRE RACINE (pas au contenu padding-é).
  // Utilisé pour les labels de profondeur décoratifs dont les coordonnées sont
  // calées sur le viewport plein (1200×630), comme dans /og/spot historique.
  rootOverlay?: ReactNode
  // Thème de couleurs (marine défaut). Colore fond, isobathes et footer.
  theme?: OgTheme
  // Handle du partageur affiché dans le footer (« via @username »).
  username?: string | null
}) {
  const { width, height } = OG_DIMENSIONS[format]
  const padding = format === 'story' ? '96px 80px' : '64px 72px'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${width}px`,
        height: `${height}px`,
        background: theme.bg,
        padding,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Isobathes en fond — le viewBox 1400×700 est étiré sur toute la largeur. */}
      <svg
        width={width + 60}
        height={Math.round((width + 60) * (700 / 1400))}
        viewBox="0 0 1400 700"
        style={{ position: 'absolute', top: format === 'story' ? '520px' : '0px', left: '-30px' }}
      >
        {ISOBATHS.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={theme.iso} strokeWidth={2} opacity={p.opacity} />
        ))}
      </svg>

      {/* Overlay calé sur le cadre racine (coordonnées viewport plein). */}
      {rootOverlay}

      {/* Contenu principal — centré verticalement en story (9:16) pour combler le
          vide ; aligné en haut en paysage (comportement d'origine). Sprint 55 WS-A. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
          justifyContent: format === 'story' ? 'center' : 'flex-start',
        }}
      >
        {children}
      </div>

      {withFooter ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <OgFooter url={footerUrl} username={username} theme={theme} />
        </div>
      ) : null}
    </div>
  )
}
