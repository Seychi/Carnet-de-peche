// JSON-LD des fiches de spots (sprint 76, Bloc 4).
//
// Sur 28 jours, GSC ne remonte QU'UNE impression de résultat enrichi. En cause
// pour la partie qui compte : `BreadcrumbList` est présent sur /especes, /guides,
// /peche et /declarer-ses-prises, mais absent de la fiche de spot, qui fait 80 %
// des clics. Elle n'émettait qu'un `Place`, non éligible à l'affichage enrichi.
//
// Format : un TABLEAU d'objets autonomes, exactement comme
// app/(marketing)/especes/[slug]/page.tsx. Pas de `@graph` : on ne crée pas un
// second format dans le même site.

export const BASE_URL = 'https://www.carnet-de-peche.com'

export type SpotJsonLdInput = {
  name: string
  slug: string
  description: string | null
  /** Latitude DÉJÀ gatée au tier par get_spot_by_slug (centroïde flouté pour un anonyme). */
  lat: number
  lng: number
  region: string
  deptKey: string
  deptLabel: string
}

/**
 * `Place` + `BreadcrumbList`.
 *
 * ⚠️ Le `Place` est INCHANGÉ depuis le sprint 75 : mêmes clés, même arrondi des
 * coordonnées à 2 décimales (~1 km). Aucune coordonnée n'est AJOUTÉE par ce
 * sprint, et celles-ci proviennent de `get_spot_by_slug`, donc jamais de `geom`
 * pour un visiteur non autorisé.
 */
export function buildSpotJsonLd(spot: SpotJsonLdInput): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: spot.name,
      description: spot.description ?? undefined,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: Math.round(spot.lat * 100) / 100,
        longitude: Math.round(spot.lng * 100) / 100,
      },
      address: {
        '@type': 'PostalAddress',
        addressRegion: spot.region,
        addressCountry: 'FR',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Spots', item: `${BASE_URL}/spots` },
        {
          '@type': 'ListItem',
          position: 3,
          name: spot.deptLabel,
          item: `${BASE_URL}/spots?dept=${spot.deptKey}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: spot.name,
          item: `${BASE_URL}/spots/${spot.slug}`,
        },
      ],
    },
  ]
}
