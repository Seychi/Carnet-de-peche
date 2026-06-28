// ===========================================================================
// Import OSM des structures de pêche du bord publiques (sprint Carte-v2 / C2,
// Bloc D). Interroge l'API Overpass par département côtier, mappe vers notre
// modèle `spots` (source='imported'), déduplique, et ÉCRIT UN FICHIER SQL —
// jamais d'écriture directe en base. John relit le SQL avant insertion.
//
//   Lancer :  pnpm tsx scripts/import-osm-spots.ts
//   (Node 18+ requis pour `fetch`. Aucune dépendance npm.)
//
// ⚠️ LICENCE OSM (ODbL v1.0) : les positions importées proviennent
// d'OpenStreetMap. La carte DOIT afficher « © OpenStreetMap contributors »
// (lien https://www.openstreetmap.org/copyright) — cf components/map/MapLegend.
// On marque chaque ligne source='imported' pour pouvoir l'isoler d'un futur
// export public (share-alike ne s'applique qu'à une base dérivée DISTRIBUÉE).
// On n'importe QUE des structures publiques NOMMÉES (anti spot-burning).
// ===========================================================================

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'Carnet-de-Peche/1.0 (import OSM spots; contact@carnet-de-peche.com)'
const DEDUP_RADIUS_M = 150 // doublon probable en-deçà
const POLITE_PAUSE_MS = 3000 // entre deux requêtes Overpass
const OUTPUT_FILE = 'supabase/seed-spots-import-osm-01.sql'

// [south, west, north, east] — une bbox par département côtier (généreuses ;
// la revue + le filtre `name` + le dédup nettoient les débordements). Liste
// alignée sur lib/geo/departments.ts (24 dépts côtiers, sans la Somme 80).
type Bbox = readonly [number, number, number, number]
const DEPT_BBOXES: Record<string, Bbox> = {
  // Manche / Atlantique
  '14': [49.15, -1.2, 49.45, 0.45],
  '50': [48.5, -1.95, 49.75, -1.05],
  '76': [49.6, 0.05, 50.1, 1.45],
  '59': [50.9, 2.3, 51.1, 2.65],
  '62': [50.3, 1.3, 51.0, 2.1],
  '22': [48.45, -3.65, 48.9, -2.0],
  '29': [47.75, -4.85, 48.75, -3.3],
  '35': [48.5, -2.1, 48.75, -1.4],
  '56': [47.3, -3.5, 47.75, -2.3],
  '44': [47.0, -2.65, 47.5, -1.8],
  '85': [46.25, -2.4, 47.1, -1.0],
  '17': [45.5, -1.65, 46.4, -0.6],
  '33': [44.55, -1.35, 45.6, -0.5],
  '40': [43.5, -1.55, 44.55, -0.9],
  '64': [43.3, -1.8, 43.55, -1.3],
  // Méditerranée
  '66': [42.35, 2.85, 42.95, 3.25],
  '11': [42.9, 2.95, 43.3, 3.3],
  '34': [43.2, 3.0, 43.55, 4.2],
  '30': [43.4, 4.0, 43.75, 4.65],
  '13': [43.1, 4.55, 43.55, 5.65],
  '83': [42.95, 5.65, 43.55, 6.95],
  '06': [43.45, 6.85, 43.95, 7.55],
  '2A': [41.3, 8.5, 42.1, 9.4],
  '2B': [42.1, 8.55, 43.05, 9.55],
}

const DEPT_REGION: Record<string, string> = {
  '14': 'Normandie', '50': 'Normandie', '76': 'Normandie',
  '59': 'Hauts-de-France', '62': 'Hauts-de-France',
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  '44': 'Pays de la Loire', '85': 'Pays de la Loire',
  '17': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine', '40': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
  '11': 'Occitanie', '30': 'Occitanie', '34': 'Occitanie', '66': 'Occitanie',
  '06': "Provence-Alpes-Côte d'Azur", '13': "Provence-Alpes-Côte d'Azur", '83': "Provence-Alpes-Côte d'Azur",
  '2A': 'Corse', '2B': 'Corse',
}

type OverpassEl = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type Candidate = {
  name: string
  slug: string
  dept: string
  region: string
  lng: number
  lat: number
  structure: string | null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function buildQuery(b: Bbox): string {
  const bb = `${b[0]},${b[1]},${b[2]},${b[3]}`
  return `[out:json][timeout:120];
(
  way["man_made"="pier"](${bb});
  way["man_made"="breakwater"](${bb});
  way["man_made"="groyne"](${bb});
  way["man_made"="quay"](${bb});
  node["natural"="cape"](${bb});
  way["natural"="cape"](${bb});
);
out center tags;`
}

async function overpass(query: string, attempt = 0): Promise<OverpassEl[]> {
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'data=' + encodeURIComponent(query),
  })
  if (res.status === 429 || res.status === 504) {
    if (attempt >= 5) throw new Error(`Overpass ${res.status} après ${attempt} essais`)
    const wait = Math.min(60_000, 5_000 * 2 ** attempt)
    console.warn(`  Overpass ${res.status} — pause ${wait / 1000}s puis retry`)
    await sleep(wait)
    return overpass(query, attempt + 1)
  }
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const json = (await res.json()) as { elements?: OverpassEl[] }
  return json.elements ?? []
}

// Overpass renvoie lat/lon ; PostGIS veut [lon, lat] (X d'abord). Inverser est
// l'erreur classique (spots dans le désert) → on sort explicitement [lng, lat].
function toLonLat(el: OverpassEl): [number, number] | null {
  if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
    return [el.lon, el.lat]
  }
  if (el.center) return [el.center.lon, el.center.lat]
  return null
}

function structureFor(tags: Record<string, string>): string | null {
  if (tags.natural === 'cape') return 'pointe_rocheuse'
  const mm = tags.man_made
  if (mm === 'quay') return 'cale'
  if (mm === 'pier' || mm === 'breakwater' || mm === 'groyne') return 'digue'
  return null
}

function isPrivate(tags: Record<string, string>): boolean {
  return tags.access === 'private' || tags.access === 'customers' || tags.access === 'no'
}

function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'spot'
  )
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const sqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`

function renderSql(rows: Candidate[]): string {
  const header = `-- =====================================================================
-- seed-spots-import-osm-01.sql — IMPORT OSM (sprint Carte-v2 / C2, Bloc D)
-- GÉNÉRÉ par scripts/import-osm-spots.ts — ⚠️ À RELIRE avant insertion.
-- Source des positions : OpenStreetMap, sous licence ODbL v1.0.
--   © OpenStreetMap contributors — https://www.openstreetmap.org/copyright
-- Chaque ligne : source='imported', verified=false, moderation_status='pending'.
-- (sprint 42 : les imports bruts entrent en BACKLOG de curation, masqués de la carte
--  publique jusqu'à validation au sprint 43 — toutes les lectures filtrent 'approved'.)
-- Le NOT EXISTS ST_DWithin(${DEDUP_RADIUS_M} m) déduplique contre l'existant
-- (curated + community + imported) AU MOMENT de l'insertion.
-- Le trigger spots_blur recalcule geom_public (flou) automatiquement.
-- ${rows.length} structures candidates.
-- =====================================================================
`
  if (rows.length === 0) return header + '\n-- Aucun candidat retenu.\n'

  const values = rows
    .map(
      (r) =>
        `  (${sqlStr(r.name)}, ${sqlStr(r.slug)}, ${sqlStr(r.dept)}, ${sqlStr(r.region)}, ` +
        `${r.lng.toFixed(6)}, ${r.lat.toFixed(6)}, ${r.structure ? sqlStr(r.structure) : 'null'})`,
    )
    .join(',\n')

  return `${header}
begin;

insert into public.spots (name, slug, department, region, geom, source, moderation_status, verified, visibility, structure)
select
  c.name, c.slug, c.department, c.region,
  ST_SetSRID(ST_MakePoint(c.lng::double precision, c.lat::double precision), 4326)::geography,
  'imported', 'pending', false, 'public', c.structure::text
from (values
${values}
) as c(name, slug, department, region, lng, lat, structure)
where not exists (
  select 1 from public.spots s
  where ST_DWithin(
    s.geom,
    ST_SetSRID(ST_MakePoint(c.lng::double precision, c.lat::double precision), 4326)::geography,
    ${DEDUP_RADIUS_M}
  )
);

commit;
`
}

async function main() {
  const candidates: Candidate[] = []
  const seen: { lat: number; lng: number }[] = []

  for (const [dept, bbox] of Object.entries(DEPT_BBOXES)) {
    process.stderr.write(`\n[${dept}] Overpass…`)
    let els: OverpassEl[]
    try {
      els = await overpass(buildQuery(bbox))
    } catch (e) {
      console.error(`  ÉCHEC ${dept}:`, (e as Error).message)
      await sleep(POLITE_PAUSE_MS)
      continue
    }

    let kept = 0
    for (const el of els) {
      const tags = el.tags ?? {}
      if (!tags.name) continue // anti spot-burning : structures NOMMÉES seulement
      if (isPrivate(tags)) continue
      const ll = toLonLat(el)
      if (!ll) continue
      const [lng, lat] = ll
      // dédup intra-lot (deux structures OSM trop proches)
      if (seen.some((p) => haversineM(p.lat, p.lng, lat, lng) < DEDUP_RADIUS_M)) continue
      seen.push({ lat, lng })
      candidates.push({
        name: tags.name.slice(0, 80),
        slug: `${slugify(tags.name)}-osm${el.id}`,
        dept,
        region: DEPT_REGION[dept] ?? dept,
        lng,
        lat,
        structure: structureFor(tags),
      })
      kept++
    }
    process.stderr.write(` ${els.length} éléments → ${kept} retenus`)
    await sleep(POLITE_PAUSE_MS)
  }

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
  writeFileSync(OUTPUT_FILE, renderSql(candidates), 'utf8')
  console.error(`\n\n✅ ${candidates.length} structures publiques → ${OUTPUT_FILE}`)
  console.error('   ⚠️ Relis le SQL (façades, doublons évidents) AVANT de l’insérer.')
}

main().catch((e) => {
  console.error('Import OSM échoué :', e)
  process.exit(1)
})
