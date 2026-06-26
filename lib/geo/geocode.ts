// Forward-geocoding de communes FR via la Base Adresse Nationale (BAN).
// https://api-adresse.data.gouv.fr — gratuit, FR, sans clé, CORS ouvert (appelable
// côté navigateur). On n'envoie qu'un nom de ville (donnée publique non sensible) ;
// AUCUNE coordonnée GPS de l'utilisateur ne transite par une URL (cf. règles privacy
// du projet). Réciproque du reverse-geocoding Nominatim de CatchForm.
//
// ⚠️ Convention GeoJSON (RFC 7946) respectée par BAN : geometry.coordinates = [lng, lat]
// (longitude d'abord). lat = coordinates[1], lng = coordinates[0] — comme partout dans
// le repo (department-centroids, etc.).

export interface MunicipalityHit {
  /** Libellé affichable, ex. « Brest ». */
  label: string
  /** Latitude (geometry.coordinates[1]). */
  lat: number
  /** Longitude (geometry.coordinates[0]). */
  lng: number
  /** Code INSEE, ex. « 29019 » (≠ code postal) — identifiant stable. */
  citycode: string
  /** Contexte « 29, Finistère, Bretagne ». */
  context?: string
}

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/'

/**
 * Géocode un nom de commune en coordonnées. Retourne jusqu'à 5 suggestions, [] sur
 * erreur réseau / requête annulée (silencieux : seule la dernière requête non annulée
 * met à jour l'UI).
 */
export async function geocodeMunicipality(
  query: string,
  signal?: AbortSignal,
): Promise<MunicipalityHit[]> {
  const q = query.trim()
  if (q.length < 2) return [] // BAN renvoie 400 en dessous de ~2 chars

  const url = `${BAN_URL}?q=${encodeURIComponent(q)}&type=municipality&limit=5`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] }
        properties?: { label?: string; citycode?: string; context?: string }
      }>
    }
    return (data.features ?? []).flatMap((f) => {
      const coords = f.geometry?.coordinates
      const p = f.properties
      if (!coords || !p?.label || !p.citycode) return []
      return [
        {
          label: p.label,
          lat: coords[1],
          lng: coords[0],
          citycode: p.citycode,
          context: p.context,
        } satisfies MunicipalityHit,
      ]
    })
  } catch {
    return []
  }
}
