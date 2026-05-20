/** WMO weather interpretation codes → labels français */
export const WMO_LABELS: Record<number, string> = {
  0:  'Ciel dégagé',
  1:  'Peu nuageux',
  2:  'Partiellement nuageux',
  3:  'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine légère',
  53: 'Bruine modérée',
  55: 'Bruine dense',
  56: 'Bruine verglaçante légère',
  57: 'Bruine verglaçante dense',
  61: 'Pluie légère',
  63: 'Pluie modérée',
  65: 'Pluie forte',
  66: 'Pluie verglaçante légère',
  67: 'Pluie verglaçante forte',
  71: 'Neige légère',
  73: 'Neige modérée',
  75: 'Neige forte',
  77: 'Grésil',
  80: 'Averses légères',
  81: 'Averses modérées',
  82: 'Averses violentes',
  85: 'Averses de neige légères',
  86: 'Averses de neige fortes',
  95: 'Orage',
  96: 'Orage avec grêle légère',
  99: 'Orage avec grêle forte',
}

export function wmoLabel(code: number | null | undefined): string {
  if (code == null) return '—'
  return WMO_LABELS[code] ?? `Code ${code}`
}

/**
 * Retourne le nom de l'icône Lucide correspondant au code WMO.
 * Utilisé dans WeatherGrid pour le rendu conditionnel.
 */
export type WeatherIconName =
  | 'Sun'
  | 'CloudSun'
  | 'Cloud'
  | 'CloudFog'
  | 'CloudDrizzle'
  | 'CloudRain'
  | 'CloudSnow'
  | 'Zap'

export function wmoIconName(code: number | null | undefined): WeatherIconName {
  if (code == null) return 'Cloud'
  if (code === 0) return 'Sun'
  if (code <= 2) return 'CloudSun'
  if (code === 3) return 'Cloud'
  if (code <= 48) return 'CloudFog'
  if (code <= 57) return 'CloudDrizzle'
  if (code <= 67) return 'CloudRain'
  if (code <= 77 || code <= 86) return 'CloudSnow'
  return 'Zap'
}
