// lib/spots/report-reasons.ts — Sprint 48, WS-A (report d'erreur de coordonnée).
//
// Raisons + libellés du signalement d'une coordonnée de spot. Extrait de
// app/actions/spots.ts car un fichier 'use server' ne peut EXPORTER que des
// fonctions async (pas de const objet) : SPOT_REPORT_REASON_LABELS cassait le
// build /moderation. Ce module neutre est importé par l'action (zod), la page
// modération (libellés) et le dialog (type).

export const SPOT_REPORT_REASONS = [
  'coord_fausse',
  'acces_change',
  'danger_manquant',
  'autre',
] as const

export type SpotReportReason = (typeof SPOT_REPORT_REASONS)[number]

export const SPOT_REPORT_REASON_LABELS: Record<SpotReportReason, string> = {
  coord_fausse: 'Coordonnée fausse',
  acces_change: 'Accès changé',
  danger_manquant: 'Danger non signalé',
  autre: 'Autre',
}
