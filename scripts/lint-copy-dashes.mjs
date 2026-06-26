#!/usr/bin/env node
/**
 * lint-copy-dashes.mjs — garde-fou anti-récidive du sprint Copy-IA.
 *
 * Signale (WARN, non bloquant, exit 0) tout tiret cadratin « — » (U+2014)
 * présent dans une chaîne de copy visible, HORS allow-list. Le but : empêcher
 * le tic IA n°1 du projet de revenir au prochain contenu généré.
 *
 * Allow-list (NON signalé) :
 *   - placeholder de donnée vide : '—', "—", `—`, >—<, {'—'}
 *   - séparateur de titre / OG    : « … — Carnet de Pêche »
 *   - libellés data structurés    : '29 — Finistère' (dept), '— 10 m' (bathy)
 *   - numéros de section / CTA Tier 2 : « NN — Titre », « — gratuit »
 *   - commentaires de code        : //…  /* … *​/  {/* … *​/}  * JSDoc
 *   - le DEMI-cadratin « – » (U+2013) n'est jamais concerné
 *
 * Usage :
 *   node scripts/lint-copy-dashes.mjs              # scanne les surfaces de copy
 *   node scripts/lint-copy-dashes.mjs <fichiers…>  # scanne ces fichiers (hook)
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const EM = '—' // —

const DEFAULT_ROOTS = ['app', 'components', 'emails', 'lib/especes/content', 'content/guides']
const EXTS = new Set(['.ts', '.tsx', '.mdx', '.js', '.jsx', '.mjs'])

// Chemins hors périmètre copy (logique/données/légal/dev/tests/images OG)
function isExcluded(rel) {
  const p = rel.replace(/\\/g, '/')
  return (
    p.includes('/__tests__/') ||
    /\.test\.[cm]?[jt]sx?$/.test(p) ||
    p.includes('/legal/') ||
    p.includes('app/og/') ||
    p.includes('app/dev/') ||
    p.includes('node_modules/')
  )
}

function walk(dir, out) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue
      walk(full, out)
    } else if (EXTS.has(path.extname(e.name))) {
      out.push(full)
    }
  }
}

/**
 * Renvoie un tableau de booléens : true si le caractère à l'index i est
 * couvert par un commentaire (block /* *​/ — qui couvre aussi {/* *​/} JSX —
 * ou ligne //). État `inBlock` reporté d'une ligne à l'autre.
 */
function commentMask(line, state) {
  const mask = new Array(line.length).fill(false)
  let i = 0
  while (i < line.length) {
    if (state.inBlock) {
      mask[i] = true
      if (line[i] === '*' && line[i + 1] === '/') {
        mask[i + 1] = true
        i += 2
        state.inBlock = false
        continue
      }
      i++
      continue
    }
    if (line[i] === '/' && line[i + 1] === '/') {
      for (let j = i; j < line.length; j++) mask[j] = true
      break
    }
    if (line[i] === '/' && line[i + 1] === '*') {
      mask[i] = mask[i + 1] = true
      i += 2
      state.inBlock = true
      continue
    }
    i++
  }
  return mask
}

// Motifs allow-list testés sur la LIGNE entière
const ALLOW_LINE = [
  /(['"`])—\1/, // '—' "—" `—`  (placeholder donnée vide)
  /(['"`])\s—\s\1/, // ' — '  (séparateur de valeurs, ex .join(' — '))
  />\s*—\s*</, // >—<
  /\{\s*(['"`])—\1\s*\}/, // {'—'}
  /—\s*Carnet de Pêche/, // séparateur de titre / OG (marque)
  /\btitle:\s*['"`][^'"`]*—/, // métadonnée title: '… — …'  (séparateur de <title>)
  /(['"])\d{2}\s—\s/, // '29 — Finistère' (dept)
  />\s*\d{1,2}\s—\s/, // <span>29 — …  /  <SecNum>01 — …
  /(['"])—\s?\d+\s?m(?:ètres?)?(['"])/, // '— 10 m' (bathy)
  /—\s*gratuit/, // CTA « — gratuit » (Tier 2)
]

function scanFile(file) {
  const rel = path.relative(ROOT, file)
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return []
  }
  if (!text.includes(EM)) return []
  const lines = text.split(/\r?\n/)
  const state = { inBlock: false }
  const hits = []
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln]
    const mask = commentMask(line, state)
    if (!line.includes(EM)) continue
    const allow = ALLOW_LINE.some((re) => re.test(line))
    if (allow) continue
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== EM) continue
      if (mask[i]) continue // commentaire
      hits.push({ rel, line: ln + 1, text: line.trim() })
    }
  }
  return hits
}

// --- Sélection des fichiers ---
const args = process.argv.slice(2)
let files = []
if (args.length) {
  files = args.map((a) => path.resolve(ROOT, a)).filter((f) => EXTS.has(path.extname(f)))
} else {
  for (const r of DEFAULT_ROOTS) walk(path.join(ROOT, r), files)
}
files = files.filter((f) => !isExcluded(path.relative(ROOT, f)))

const allHits = files.flatMap(scanFile)

if (allHits.length === 0) {
  console.log('✓ lint-copy-dashes : 0 tiret cadratin « — » en copy visible (hors allow-list).')
  process.exit(0)
}

console.log(`⚠ lint-copy-dashes : ${allHits.length} occurrence(s) de « — » à vérifier (warn, non bloquant) :\n`)
for (const h of allHits) {
  const snippet = h.text.length > 120 ? h.text.slice(0, 117) + '…' : h.text
  console.log(`  ${h.rel}:${h.line}  ${snippet}`)
}
console.log(
  '\nRemplace par virgule / parenthèses / deux-points / point selon le sens (cf CLAUDE.md §6).' +
    '\nSi c\'est un cas légitime (placeholder, titre, libellé data), ajoute-le à l\'allow-list du script.'
)
// Non bloquant par défaut (décision John : warn-only tant qu\'il n\'a pas tranché).
process.exit(0)
