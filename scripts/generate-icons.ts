/**
 * Génère les icônes PWA (public/icons/) depuis le logo DA v2 (carré teal +
 * onde navy). Usage : npx tsx scripts/generate-icons.ts
 * Sharp est déjà présent (dépendance de next/image).
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

// Logo DA v2 — identique aux maquettes (rect teal r=8/30, onde navy-950).
// `pad` contrôle la zone de sécurité : les icônes maskable gardent l'onde
// dans le cercle central (~80% du canvas).
function logoSvg(size: number, opts: { maskable: boolean }): Buffer {
  const pad = opts.maskable ? 0.18 : 0
  const inner = 1 - pad * 2
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 30 30">
  ${opts.maskable ? '<rect width="30" height="30" fill="#14B8A6"/>' : ''}
  <g transform="translate(${30 * pad} ${30 * pad}) scale(${inner})">
    <rect width="30" height="30" rx="${opts.maskable ? 0 : 8}" fill="#14B8A6"/>
    <path d="M5 19 C9 12, 12 12, 15 16 S 21 21, 25 13"
          stroke="#04141C" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>
</svg>`)
}

async function main() {
  const dir = path.join(process.cwd(), 'public', 'icons')
  mkdirSync(dir, { recursive: true })

  const jobs: [string, number, boolean][] = [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['icon-maskable-192.png', 192, true],
    ['icon-maskable-512.png', 512, true],
    ['apple-touch-icon.png', 180, true], // iOS arrondit lui-même les coins
  ]
  for (const [name, size, maskable] of jobs) {
    await sharp(logoSvg(size, { maskable }), { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(dir, name))
    console.log(`✓ ${name} (${size}px${maskable ? ', maskable' : ''})`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
