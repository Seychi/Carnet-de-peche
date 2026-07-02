/**
 * Chiffres marketing partagés (copy statique home / tarifs / carte).
 *
 * 215 spots curés en DB au 2026-07-02 (`select source, count(*) from spots group by source`).
 * On affiche un PLANCHER stable (« 200+ ») plutôt que le chiffre exact : honnête,
 * et la copy statique ne se périme pas à chaque lot de curation.
 * Les compteurs live (counts.spots) restent prioritaires ; ces constantes servent
 * de fallback et de copy statique.
 */
export const SPOTS_CURATED_FLOOR = 200

export const SPOTS_CURATED_LABEL = '200+ spots curés'
