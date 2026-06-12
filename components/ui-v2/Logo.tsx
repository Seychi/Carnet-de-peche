/**
 * Logo « carnet qui ferre » — picto officiel de la marque.
 * Source de vérité de la géométrie : public/logo/logo-icon.svg (viewBox 0 0 48 48).
 * Server-safe (pas de hooks). L'id du mask est statique : toutes les instances
 * partagent la même découpe, donc les collisions d'id sont sans effet.
 *
 * Accessibilité (API simple) :
 * - par défaut le picto est décoratif (aria-hidden) — le nom du lien vient du texte voisin ;
 * - passe decorative={false} quand le logo est SEUL dans un lien : le SVG devient
 *   role="img" avec <title>Carnet de Pêche</title>.
 */

const MASK_ID = 'cdp-logo-gap'

const PALETTE = {
  // Fond clair : traits navy-900, hameçon teal-500
  light: { stroke: '#0A2F3D', hook: '#14B8A6', wordmark: 'text-navy-900' },
  // Fond sombre : traits sand-50, hameçon teal-300
  dark: { stroke: '#FBF8F2', hook: '#5EEAD4', wordmark: 'text-white' },
} as const

interface LogoProps {
  /** Côté du picto en px (carré). */
  size?: number
  /** light = fond clair, dark = fond sombre (footer navy, etc.). */
  variant?: 'light' | 'dark'
  /** Affiche le wordmark « Carnet de Pêche » (Space Grotesk 600) à droite du picto. */
  withWordmark?: boolean
  /** false = logo seul dans un lien → <title> accessible sur le SVG. */
  decorative?: boolean
  className?: string
}

export function Logo({
  size = 32,
  variant = 'light',
  withWordmark = false,
  decorative = true,
  className,
}: LogoProps) {
  const colors = PALETTE[variant]
  // Avec wordmark, le texte porte le nom : le picto reste décoratif.
  const hidden = decorative || withWordmark

  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden={hidden ? 'true' : undefined}
      role={hidden ? undefined : 'img'}
      className={withWordmark ? 'shrink-0' : className}
    >
      {!hidden && <title>Carnet de Pêche</title>}
      <mask id={MASK_ID}>
        <rect width="48" height="48" fill="white" />
        {/* Échancrure du bord droit de la page pour laisser passer l'hameçon */}
        <path d="M31 33v4" stroke="black" strokeWidth="5" strokeLinecap="butt" />
      </mask>
      <g stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Page de carnet */}
        <rect x="11" y="6" width="26" height="29" rx="5" mask={`url(#${MASK_ID})`} />
        {/* Lignes d'entrées du carnet */}
        <path d="M16 13.5h10" />
        <path d="M16 19.5h10" />
        <path d="M16 25.5h6" />
      </g>
      {/* Hameçon qui ferre */}
      <path
        d="M31 6v31a4.5 4.5 0 1 1-9 0v-2"
        stroke={colors.hook}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (!withWordmark) return icon

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      {icon}
      <span
        className={`font-display font-semibold leading-tight ${colors.wordmark}`}
        style={{ fontSize: Math.round(size * 0.55) }}
      >
        Carnet de Pêche
      </span>
    </span>
  )
}
