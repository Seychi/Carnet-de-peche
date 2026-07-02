import { ImageResponse } from 'next/og'
import { resolveProgrammaticSlug, SPECIES, TECHNIQUES } from '@/lib/seo/programmatic'
import { loadOgFonts } from '@/lib/og/fonts'
import { OG_CACHE_CONTROL } from '@/lib/og/fallback'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// OG image des pages programmatiques /peche/<espèce>/<technique>[/<dépt>]
// (sprint 55 WS-D). Déplacée ici au sprint 70 : la convention metadata
// `opengraph-image.tsx` DANS un segment catch-all générait la route
// `/peche/[...slug]/opengraph-image-*` (catch-all non terminal) → le route
// matcher de Next (`getSortedRoutes`) throw « Catch-all must be the last part
// of the URL » : `next start`/`next dev` = 500 sur TOUTES les routes, et
// l'erreur est apparue 1× en prod (Sentry NEXTJS-F). En route handler, le
// catch-all est terminal → plus d'ambiguïté. La page référence cette image
// via `openGraph.images` dans son generateMetadata.
// Data 100% statique (SPECIES/TECHNIQUES/département), aucun appel réseau,
// runtime edge. Charte DA v2. Aucune coordonnée (geom-free).
export const runtime = 'edge'

const WIDTH = 1200
const HEIGHT = 630

const NAVY950 = '#04141C'
const NAVY700 = '#155A73'
const TEAL = '#14B8A6'
const TEAL300 = '#5EEAD4'
const GOLD = '#D9A53C'
const WHITE = '#FFFFFF'

const ISOBATHS = [
  { d: 'M-50 580 C 250 480, 480 640, 760 540 S 1240 460, 1460 560', opacity: 0.5 },
  { d: 'M-50 500 C 230 400, 500 560, 780 460 S 1230 380, 1460 470', opacity: 0.4 },
  { d: 'M-50 420 C 220 330, 520 480, 800 390 S 1230 300, 1460 390', opacity: 0.3 },
]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  const page = resolveProgrammaticSlug(slug)

  const label = page ? SPECIES[page.species].label.toUpperCase() : 'PÊCHE DU BORD'
  const technique = page ? TECHNIQUES[page.technique].label : 'À la canne du bord'
  const where = page?.deptCode ? DEPARTMENT_LABELS[page.deptCode] ?? 'France' : 'France entière'

  // Titre adaptatif : « DORADE ROYALE » (13) ne doit pas déborder à 88px.
  const titleFont = label.length > 14 ? 60 : label.length > 9 ? 74 : 88
  const fonts = await loadOgFonts()

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: NAVY950,
          padding: '72px 80px',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          width="1260"
          height="630"
          viewBox="0 0 1400 700"
          style={{ position: 'absolute', top: '0px', left: '-30px' }}
        >
          {ISOBATHS.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke={NAVY700} strokeWidth={2} opacity={p.opacity} />
          ))}
        </svg>

        {/* Kicker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '2px', background: TEAL }} />
          <span
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: TEAL300,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Pêche à la canne du bord
          </span>
        </div>

        {/* Espèce */}
        <span
          style={{
            display: 'flex',
            fontSize: `${titleFont}px`,
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            marginBottom: '22px',
            maxWidth: '1040px',
          }}
        >
          {label}
        </span>

        {/* Technique */}
        <span style={{ display: 'flex', fontSize: '38px', fontWeight: 700, color: TEAL300, maxWidth: '1040px' }}>
          {technique}
        </span>

        {/* Département */}
        <span style={{ display: 'flex', fontSize: '30px', fontStyle: 'italic', color: GOLD, marginTop: '12px' }}>
          {where}
        </span>

        <div style={{ flex: 1, display: 'flex' }} />

        {/* Footer */}
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
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <g stroke={WHITE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <rect x="11" y="6" width="26" height="29" rx="5" />
                <path d="M16 13.5h10" />
                <path d="M16 19.5h10" />
                <path d="M16 25.5h6" />
              </g>
              <path d="M31 33v4" stroke={NAVY950} strokeWidth={5} strokeLinecap="butt" />
              <path
                d="M31 6v31a4.5 4.5 0 1 1-9 0v-2"
                stroke={TEAL300}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: '24px', fontWeight: 700, color: WHITE }}>Carnet de Pêche</span>
          </div>
          <span style={{ fontSize: '16px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.35)' }}>
            carnet-de-peche.com
          </span>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts, headers: { 'Cache-Control': OG_CACHE_CONTROL } },
  )
}
