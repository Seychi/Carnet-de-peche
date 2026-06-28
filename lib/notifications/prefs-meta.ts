// Métadonnées des préférences de notification push (sprint 49 « Push & engagement »).
//
// Fichier NEUTRE (pas de 'use server') : il exporte des constantes et des helpers
// synchrones, importables côté serveur ET client. La server action vit dans
// notification-prefs.ts ('use server', fonctions async uniquement) — c'est le
// gotcha qui a cassé le build au sprint 48 : un 'use server' ne peut exporter que
// des fonctions async, jamais une const objet/tableau.
//
// CONVENTION PARTAGÉE émetteurs ↔ réglages :
// - Chaque type de push a une clé stable lue dans profiles.notification_prefs (jsonb).
// - Un type est ACTIVÉ si notification_prefs->>'<key>' != 'false' (absent = activé).
//   → l'opt-out est explicite (valeur "false"), tout le reste vaut « activé ».
// - Cette règle est partagée mot pour mot avec les émetteurs (crons + event-driven).

/** Clés de préférence partagées (émetteurs ↔ réglages). Ne pas renommer sans migrer les émetteurs. */
export const NOTIFICATION_PREF_KEYS = [
  'optimal_window',
  'big_tide',
  'followed_catch',
  'species_closure',
  'weekly_digest',
] as const

export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number]

/** Libellé + sous-titre FR (tutoiement) pour la section Réglages. */
export type NotificationPrefMeta = {
  key: NotificationPrefKey
  label: string
  description: string
}

export const NOTIFICATION_PREF_META: readonly NotificationPrefMeta[] = [
  {
    key: 'optimal_window',
    label: 'Fenêtre optimale',
    description:
      'On te prévient quand le créneau favorable du jour colle à tes habitudes de prises.',
  },
  {
    key: 'big_tide',
    label: 'Grandes marées',
    description:
      'Une alerte les jours de fort marnage sur ta façade, quand la mer bouge beaucoup.',
  },
  {
    key: 'followed_catch',
    label: 'Prise d’un pêcheur suivi',
    description:
      'Quand un pêcheur que tu suis publie une prise. Limité à quelques alertes par jour.',
  },
  {
    key: 'species_closure',
    label: 'Fermeture d’espèce',
    description:
      'Un rappel quand une espèce que tu pêches entre en période de fermeture.',
  },
  {
    key: 'weekly_digest',
    label: 'Récap hebdo',
    description:
      'Ton résumé de la semaine : tes prises, l’activité près de chez toi, les bons créneaux à venir.',
  },
] as const

/**
 * Détermine si un type de push est activé d'après l'objet notification_prefs.
 * Règle partagée : absent ou différent de "false" → activé. Seul "false" désactive.
 * (Helper synchrone, réutilisable par les émetteurs comme par l'UI.)
 */
export function isNotificationPrefEnabled(
  prefs: Record<string, unknown> | null | undefined,
  key: NotificationPrefKey,
): boolean {
  const raw = prefs?.[key]
  return raw !== false && raw !== 'false'
}
