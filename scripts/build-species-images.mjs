#!/usr/bin/env node
/**
 * Normalise les planches d'espèces générées à la main en assets web homogènes.
 *
 * Entrée  : docs/contenu/assets-video/01 POISSONS/*.png  (PNG détourés, tailles
 *           et cadrages hétérogènes, 0,8 à 2,5 Mo pièce)
 * Sortie  : public/images/especes/<slug>.webp            (canevas 16/9 identique
 *           pour tout le lot, ~40-120 Ko pièce)
 *
 * Pourquoi un script et pas un traitement manuel : les 26 espèces de SPECIES
 * arrivent par lots au fil des générations. Relancer `pnpm species:images` after
 * chaque lot garantit que la 26e planche est cadrée exactement comme la 1re.
 *
 * Le rendu carte utilise `object-contain` sur ce canevas : c'est donc ICI, et
 * nulle part dans le CSS, que se décident le cadrage, la marge et l'orientation.
 */
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'docs', 'contenu', 'assets-video', '01 POISSONS')
const OUT_DIR = join(ROOT, 'public', 'images', 'especes')
// Manifeste typé consommé par <SpeciesCover> : sans lui, le composant devrait
// lire le disque au rendu pour savoir si une planche existe. Généré ici pour que
// `pnpm species:images` reste l'unique geste après un nouveau lot.
const MANIFEST = join(ROOT, 'lib', 'especes', 'covers.ts')

// ── Canevas commun ────────────────────────────────────────────────────────────
// 16/9 : même ratio que les couvertures de guides (GuideCardImage), donc une
// seule grammaire d'image sur tout le site. 1200 px de large = deux fois la plus
// grande carte servie (max-w-1100 / 3 colonnes ≈ 340 px) → net en DPR 2 sans
// payer un asset 4K. next/image dérive les tailles inférieures.
const CANVAS_W = 1200
const CANVAS_H = 675
// Marges : le poisson ne touche jamais le bord de la carte. 6 % horizontal
// (la queue et le museau sont les points extrêmes), 14 % vertical (les nageoires
// dorsales dressées ont besoin d'air au-dessus).
const FIT_W = Math.round(CANVAS_W * 0.94)
const FIT_H = Math.round(CANVAS_H * 0.86)

// ── Nom de fichier → slug SPECIES ─────────────────────────────────────────────
// Les fichiers sont nommés à la main pendant la génération : casse libre, accents,
// espaces. On normalise, et on redresse ici les écarts irréductibles au reste.
const SLUG_ALIASES = {
  calamar: 'calmar', // le référentiel dit « calmar » (Loligo vulgaris)
}

// Céphalopodes : le manteau s'effile comme un pédoncule caudal, ce qui fait crier
// l'heuristique d'orientation pour rien. On ne la leur applique pas.
const NO_FACING_CHECK = new Set(['seiche', 'calmar', 'poulpe'])

// ── Orientation ───────────────────────────────────────────────────────────────
// Toutes les planches regardent à GAUCHE. Les fichiers listés ici sont retournés
// à la génération de l'asset : l'original sur le disque n'est jamais modifié.
// Retournement horizontal pur → aucune perte, aucun ré-échantillonnage.
const FLIP_HORIZONTAL = new Set([
  'bar',
  'dorade-grise',
  'dorade-royale',
  // La plie est un poisson plat DEXTRE : yeux sur le flanc droit, donc face
  // pigmentée vue tête à gauche. La planche générée la montre tête à droite,
  // c'est-à-dire sénestre — anatomiquement faux. Le retournement corrige la
  // latéralité en même temps que l'orientation du lot. Ne JAMAIS retourner un
  // poisson plat pour la seule cohérence visuelle : ça inverse son espèce.
  'plie',
])

/**
 * Slugs du référentiel d'espèces. `lib/seo/programmatic.ts` est du TypeScript, que
 * ce script .mjs ne peut pas importer : on lit donc le bloc `export const SPECIES`
 * au texte, une clé par ligne. La forme est verrouillée par
 * `lib/seo/__tests__/species-referential.test.ts` ; si elle changeait, on lirait
 * zéro slug et le script s'arrêterait au lieu de produire des assets orphelins.
 */
async function readSpeciesSlugs() {
  const src = await readFile(join(ROOT, 'lib', 'seo', 'programmatic.ts'), 'utf8')
  const block = src.match(/export const SPECIES[^=]*=\s*\{([\s\S]*?)\n\}/)
  const slugs = block ? [...block[1].matchAll(/^ {2}'?([a-z][a-z-]*)'?:\s*\{/gm)].map((m) => m[1]) : []
  if (slugs.length === 0) {
    throw new Error(
      "Aucun slug lu dans lib/seo/programmatic.ts : le bloc SPECIES a changé de forme, adapter readSpeciesSlugs().",
    )
  }
  return new Set(slugs)
}

function toSlug(filename) {
  const stem = basename(filename, extname(filename))
  const slug = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return SLUG_ALIASES[slug] ?? slug
}

/**
 * Devine de quel côté regarde le poisson, pour signaler une planche à contre-sens
 * dans un lot fraîchement généré.
 *
 * Signal utilisé : le pédoncule caudal. Un poisson s'amincit brutalement juste
 * avant la nageoire caudale, qui re-évase ensuite. Côté tête, le profil décroît
 * de façon monotone jusqu'au museau. On cherche donc, dans chaque tiers extrême,
 * un creux marqué suivi d'une remontée ; le côté qui l'exhibe le plus est la queue.
 *
 * Heuristique volontairement conservatrice : elle AVERTIT, elle ne retourne rien.
 * Une seiche ou un calmar n'ont pas de pédoncule → verdict « indécis », silence.
 */
async function guessFacing(image, width, height) {
  const BOX = 240
  const { data, info } = await image
    .clone()
    .resize({ width: BOX, height: BOX, fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels } = info
  void width
  void height

  // Profil de hauteur : pour chaque colonne, l'épaisseur de la silhouette.
  const cols = []
  for (let x = 0; x < w; x++) {
    let top = -1
    let bottom = -1
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * channels + channels - 1] > 24) {
        if (top < 0) top = y
        bottom = y
      }
    }
    cols.push(top < 0 ? 0 : bottom - top + 1)
  }
  const max = Math.max(...cols)
  if (max === 0 || cols.length < 40) return null

  // Profondeur du creux le plus marqué d'un tiers extrême, rapportée au maximum
  // du profil. Un vrai pédoncule caudal creuse fort ; un museau, non.
  const notch = (slice) => {
    let best = 0
    for (let i = 1; i < slice.length - 1; i++) {
      if (slice[i] === 0) continue
      const before = Math.max(...slice.slice(0, i))
      const after = Math.max(...slice.slice(i + 1))
      const depth = Math.min(before, after) - slice[i]
      if (depth > best) best = depth
    }
    return best / max
  }
  const third = Math.floor(cols.length / 3)
  const left = notch(cols.slice(0, third))
  const right = notch(cols.slice(-third))
  if (Math.abs(left - right) < 0.12) return null // pas de pédoncule net : on se tait

  // Le creux est du côté de la QUEUE : la tête, donc le regard, est à l'opposé.
  return left > right ? 'right' : 'left'
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  let files
  try {
    files = (await readdir(SRC_DIR)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  } catch {
    console.error(`✗ Dossier source introuvable : ${SRC_DIR}`)
    process.exitCode = 1
    return
  }
  if (files.length === 0) {
    console.error(`✗ Aucune image dans ${SRC_DIR}`)
    process.exitCode = 1
    return
  }

  const speciesSlugs = await readSpeciesSlugs()
  const written = []
  const warnings = []

  for (const file of files.sort()) {
    const slug = toSlug(file)
    // Le dossier source est un espace de travail : il y transite des fichiers qui
    // ne sont pas des planches d'espèces. On ne publie que ce que le référentiel
    // reconnaît, sinon on sème des assets que rien ne référence.
    if (!speciesSlugs.has(slug)) {
      warnings.push(`${file} : ignoré, « ${slug} » n'est pas un slug de SPECIES.`)
      continue
    }
    // Le dossier source est alimenté à la main pendant que le script tourne : un
    // fichier listé peut avoir été renommé ou être encore en cours d'écriture. On
    // le signale et on continue, plutôt que d'interrompre tout le lot.
    let src
    let meta
    try {
      src = sharp(join(SRC_DIR, file)).ensureAlpha()
      meta = await src.metadata()
    } catch (err) {
      warnings.push(`${file} : illisible (${err.message.split('\n')[0]}) — relancer après la génération.`)
      continue
    }

    // 1. Recadrage au plus juste sur la silhouette : c'est ce qui rend les
    //    planches comparables, quel que soit le canevas de génération.
    const trimmed = sharp(await src.clone().trim({ threshold: 1 }).toBuffer())
    const t = await trimmed.metadata()

    // 2. Contrôle d'orientation (avertissement seulement, cf guessFacing).
    const facing = NO_FACING_CHECK.has(slug) ? null : await guessFacing(trimmed, t.width, t.height)
    const flipped = FLIP_HORIZONTAL.has(slug)
    const finalFacing = facing && flipped ? (facing === 'left' ? 'right' : 'left') : facing
    if (finalFacing === 'right') {
      warnings.push(
        `${file} : la silhouette semble orientée tête à DROITE alors que le lot regarde à gauche — ajouter '${slug}' à FLIP_HORIZONTAL si c'est confirmé.`,
      )
    }

    // 3. Mise à l'échelle dans la boîte commune, puis centrage sur le canevas.
    const pipeline = trimmed
      .clone()
      .resize({ width: FIT_W, height: FIT_H, fit: 'inside', withoutEnlargement: false })
    if (flipped) pipeline.flop()

    const out = await sharp({
      create: {
        width: CANVAS_W,
        height: CANVAS_H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: await pipeline.png().toBuffer(), gravity: 'centre' }])
      .webp({ quality: 82, effort: 6, alphaQuality: 90 })
      .toBuffer()

    await writeFile(join(OUT_DIR, `${slug}.webp`), out)
    written.push({
      slug,
      file,
      kb: Math.round(out.length / 1024),
      srcKb: Math.round(((await src.clone().toBuffer()).length / 1024) * 1),
      srcDim: `${meta.width}×${meta.height}`,
      flipped,
    })
  }

  const pad = Math.max(...written.map((w) => w.slug.length))
  for (const w of written) {
    console.log(
      `  ${w.slug.padEnd(pad)}  ${String(w.kb).padStart(4)} Ko   ← ${w.file}` +
        (w.flipped ? '  (retourné)' : ''),
    )
  }
  console.log(
    `\n✓ ${written.length} planche(s) écrite(s) dans public/images/especes/ ` +
      `(${written.reduce((a, b) => a + b.kb, 0)} Ko au total, canevas ${CANVAS_W}×${CANVAS_H})`,
  )
  const manifest = [
    '// GÉNÉRÉ par scripts/build-species-images.mjs — ne pas éditer à la main.',
    '// Relancer `pnpm species:images` après chaque lot de planches générées.',
    '//',
    "// `satisfies` fait échouer `pnpm typecheck` si un slug de planche sortait du",
    '// référentiel SPECIES : un renommage d’espèce ne peut pas laisser une carte',
    '// pointer dans le vide sans que la CI le dise.',
    "import type { SpeciesSlug } from '@/lib/seo/programmatic'",
    '',
    'export const SPECIES_COVERS = {',
    ...written.map((w) => `  ${/^[a-z][a-z0-9]*$/.test(w.slug) ? w.slug : `'${w.slug}'`}: '/images/especes/${w.slug}.webp',`),
    '} as const satisfies Partial<Record<SpeciesSlug, string>>',
    '',
    '/** Chemin de la planche de l’espèce, ou null si elle n’a pas encore été générée. */',
    'export function speciesCover(slug: SpeciesSlug): string | null {',
    '  return (SPECIES_COVERS as Partial<Record<SpeciesSlug, string>>)[slug] ?? null',
    '}',
    '',
  ].join('\n')
  await writeFile(MANIFEST, manifest, 'utf8')
  console.log('  → lib/especes/covers.ts régénéré')

  const missing = [...speciesSlugs].filter((s) => !written.some((w) => w.slug === s))
  if (missing.length > 0) {
    console.log(`\n… ${missing.length} espèce(s) encore sans visuel : ${missing.join(', ')}`)
  }
  for (const w of warnings) console.warn(`\n⚠  ${w}`)
}

await main()
