/** Convertit des degrés en direction cardinale (16 points). */
export function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

/** Label qualitatif Beaufort à partir de km/h. */
export function beaufortLabel(kmh: number): string {
  if (kmh < 2)  return 'Calme'
  if (kmh < 12) return 'Légère brise'
  if (kmh < 20) return 'Petite brise'
  if (kmh < 29) return 'Jolie brise'
  if (kmh < 39) return 'Brise modérée'
  if (kmh < 50) return 'Bonne brise'
  if (kmh < 62) return 'Vent frais'
  if (kmh < 75) return 'Grand frais'
  return 'Coup de vent'
}

/** Label qualitatif pour la hauteur de vagues. */
export function waveLabel(m: number): string {
  if (m < 0.1)  return 'Plate'
  if (m < 0.5)  return 'Ridée'
  if (m < 1.25) return 'Belle'
  if (m < 2.5)  return 'Peu agitée'
  if (m < 4)    return 'Agitée'
  return 'Forte mer'
}

/**
 * Formate une heure venue d'Open-Meteo (lever/coucher de soleil) en `HH:MM`.
 *
 * ⚠️ Open-Meteo est appelé avec `&timezone=Europe/Paris` (cf. lib/conditions/spot-forecast.ts) :
 * il renvoie donc un ISO LOCAL SANS suffixe de fuseau, ex. `"2026-06-26T06:17"` — c'est
 * DÉJÀ l'heure de Paris. Le piège (bug /home « Soleil 08:19–00:23 », sprint 35) : faire
 * `new Date("2026-06-26T06:17")` lit la chaîne comme heure du runtime (UTC sur Vercel),
 * puis un `Intl({ timeZone: 'Europe/Paris' })` la re-décale de +2h. On lit donc HH:MM
 * DIRECTEMENT dans la chaîne. Filet : si jamais un offset/`Z` est présent, on formate
 * proprement en Europe/Paris.
 */
export function formatWeatherTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  // Chaîne avec fuseau explicite (`Z` ou ±HH:MM) = instant absolu → formater en Europe/Paris.
  // Filet défensif : Open-Meteo (timezone=Europe/Paris) ne renvoie PAS ce format aujourd'hui.
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso)) {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(d)
  }
  // Chaîne LOCALE naïve (cas Open-Meteo, déjà heure de Paris) → lire HH:MM directement.
  const m = iso.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : null
}
