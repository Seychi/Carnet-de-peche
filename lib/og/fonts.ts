// Polices pour les images OG (sprint 55 WS-B). Runtime EDGE → pas de node:fs ni
// process.cwd() : on FETCH les fichiers de police à l'exécution, mémoïsés au niveau
// module (un seul fetch par instance edge), avec try/catch PAR police + fallback
// global. Si tout échoue → tableau vide → ImageResponse rend comme avant (Satori
// retombe sur sa police par défaut) : JAMAIS de 500. C'est l'invariant clé.
//
// Format : Satori accepte ttf / otf / woff (PAS woff2). @fontsource (jsdelivr)
// sert des .woff statiques par poids — fiables et Satori-compatibles. Un fichier
// par poids (pas de variable font, que Satori parse mal).

export type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 400 | 500 | 600 | 700
  style: 'normal'
}

type FontSpec = { name: string; weight: 400 | 500 | 600 | 700; url: string }

const CDN = 'https://cdn.jsdelivr.net/npm'
const SPECS: FontSpec[] = [
  { name: 'Inter', weight: 400, url: `${CDN}/@fontsource/inter@5/files/inter-latin-400-normal.woff` },
  { name: 'Inter', weight: 600, url: `${CDN}/@fontsource/inter@5/files/inter-latin-600-normal.woff` },
  { name: 'Inter', weight: 700, url: `${CDN}/@fontsource/inter@5/files/inter-latin-700-normal.woff` },
  { name: 'JetBrains Mono', weight: 500, url: `${CDN}/@fontsource/jetbrains-mono@5/files/jetbrains-mono-latin-500-normal.woff` },
  { name: 'JetBrains Mono', weight: 700, url: `${CDN}/@fontsource/jetbrains-mono@5/files/jetbrains-mono-latin-700-normal.woff` },
  { name: 'Space Grotesk', weight: 700, url: `${CDN}/@fontsource/space-grotesk@5/files/space-grotesk-latin-700-normal.woff` },
]

let cache: Promise<OgFont[]> | null = null

async function loadOne(spec: FontSpec): Promise<OgFont | null> {
  try {
    const res = await fetch(spec.url, { cache: 'force-cache' })
    if (!res.ok) return null
    const data = await res.arrayBuffer()
    if (!data.byteLength) return null
    return { name: spec.name, data, weight: spec.weight, style: 'normal' }
  } catch {
    return null // une police KO ne casse jamais l'image
  }
}

/**
 * Charge (et mémoïse) les polices OG. Retourne [] si tout échoue → l'ImageResponse
 * rend en police système (pas de 500). À passer à `new ImageResponse(jsx, { fonts })`.
 */
export function loadOgFonts(): Promise<OgFont[]> {
  if (!cache) {
    cache = Promise.all(SPECS.map(loadOne))
      .then((fonts) => fonts.filter((f): f is OgFont => f !== null))
      .catch(() => [])
      .then((fonts) => {
        // On NE mémoïse PAS un échec total : si rien n'a chargé (CDN KO au cold
        // start), on remet le cache à zéro pour retenter au prochain rendu. Un
        // succès reste mémoïsé pour toute la vie de l'instance edge. Jamais de 500.
        if (fonts.length === 0) cache = null
        return fonts
      })
  }
  return cache
}
