/**
 * Génère les icônes PWA (public/icons/) depuis le picto « carnet qui ferre » :
 * page de carnet (rect arrondi + 3 lignes d'entrées) traversée par un
 * signet-hameçon teal, sur fond plein navy-950 (coins pleins — le launcher
 * arrondit lui-même). Usage : npx tsx scripts/generate-icons.ts
 * Sharp est déjà présent (dépendance de next/image).
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const NAVY950 = '#04141C' // fond
const SAND50 = '#FBF8F2' // traits du carnet (variante dark)
const TEAL300 = '#5EEAD4' // hameçon (variante dark)

// Picto — géométrie copiée à l'identique de public/logo/logo-icon-dark.svg
// (source de vérité, ne pas modifier). Grille 48×48, trait 3 ; l'échancrure
// du bord droit (passage de l'hameçon) est découpée via <mask>.
// `pct` = largeur du picto relative au canvas : ~70 % pour les icônes
// standard, ~55 % pour les maskable (zone de sécurité de 20 %).
function iconSvg(size: number, pct: number): Buffer {
  const k = (size * pct) / 48 // échelle : grille 48 → pct du canvas
  const o = (size * (1 - pct)) / 2 // offset de centrage
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${NAVY950}"/>
  <g transform="translate(${o} ${o}) scale(${k})">
    <mask id="gap">
      <rect width="48" height="48" fill="white"/>
      <path d="M31 33v4" stroke="black" stroke-width="5" stroke-linecap="butt"/>
    </mask>
    <g fill="none">
      <g stroke="${SAND50}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="11" y="6" width="26" height="29" rx="5" mask="url(#gap)"/>
        <path d="M16 13.5h10"/>
        <path d="M16 19.5h10"/>
        <path d="M16 25.5h6"/>
      </g>
      <path d="M31 6v31a4.5 4.5 0 1 1-9 0v-2" stroke="${TEAL300}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
</svg>`)
}

async function main() {
  const dir = path.join(process.cwd(), 'public', 'icons')
  mkdirSync(dir, { recursive: true })

  // [fichier, taille, largeur du picto en % du canvas]
  const jobs: [string, number, number][] = [
    ['icon-192.png', 192, 0.7],
    ['icon-512.png', 512, 0.7],
    ['apple-touch-icon.png', 180, 0.7], // iOS arrondit lui-même les coins
    ['icon-maskable-192.png', 192, 0.55],
    ['icon-maskable-512.png', 512, 0.55],
  ]
  for (const [name, size, pct] of jobs) {
    await sharp(iconSvg(size, pct), { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(dir, name))
    console.log(`✓ ${name} (${size}px, picto ${Math.round(pct * 100)}%)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
