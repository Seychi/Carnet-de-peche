// Curseur du fil : composite created_at|id (tie-breaker anti-saut). Sprint 54 WS-E.
//
// Module NEUTRE (pas de 'use server') : il exporte des fonctions SYNC, importables
// par la server action getFeedPage ET par les tests. Un fichier 'use server' ne peut
// exporter que des fonctions async (gotcha projet), d'où l'extraction ici.
//
// Pourquoi composite : ordonner par created_at seul + filtrer .lt('created_at', X)
// saute deux posts au MÊME created_at à cheval sur une page (cas seed/bulk insert).
// On ajoute l'id comme départage : (created_at, id) est unique et totalement ordonné.

export function buildFeedCursor(row: { created_at: string | null; id: string | null }): string | null {
  return row.created_at && row.id ? `${row.created_at}|${row.id}` : null
}

export function parseFeedCursor(cursor: string): { ts: string; id: string } | null {
  // created_at ISO peut contenir « : » mais JAMAIS « | » → split sur le 1er « | ».
  const sep = cursor.indexOf('|')
  if (sep <= 0) return null // curseur legacy (created_at seul) → le caller retombe sur .lt
  return { ts: cursor.slice(0, sep), id: cursor.slice(sep + 1) }
}
