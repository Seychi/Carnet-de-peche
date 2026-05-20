const PARIS_TZ = 'Europe/Paris'

export function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getParisHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const h = parts.find(p => p.type === 'hour')?.value ?? '0'
  return parseInt(h, 10) % 24
}
