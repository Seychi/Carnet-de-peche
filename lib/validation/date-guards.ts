// Gardes de date partagées (sprint 53 WS-D). Fichier NEUTRE (pas de 'use server') :
// helpers synchrones importables par les schémas zod (catches/outings/cofishing).
//
// Tolérance ±24 h : les inputs sont des `datetime-local` (heure locale du navigateur)
// et le serveur raisonne en UTC ; on absorbe le décalage de fuseau pour ne pas rejeter
// une saisie légitime « maintenant » à cause de quelques heures d'écart.
//
// Date.parse (et non new Date().getTime()) pour qu'une chaîne invalide donne NaN →
// la comparaison est false → le refine rejette (pas de passe-droit silencieux).

const DAY_MS = 24 * 60 * 60 * 1000

/** true si la date n'est pas dans le futur (tolérance +24 h). */
export const notFuture = (s: string): boolean => {
  const t = Date.parse(s)
  return Number.isFinite(t) && t <= Date.now() + DAY_MS
}

/** true si la date n'est pas dans le passé (tolérance -24 h). */
export const notPast = (s: string): boolean => {
  const t = Date.parse(s)
  return Number.isFinite(t) && t >= Date.now() - DAY_MS
}
