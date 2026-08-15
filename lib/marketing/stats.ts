/**
 * Chiffres marketing partagés (copy statique home / tarifs / carte).
 *
 * ⚠️ SPRINT 79, Bloc 6 — décision John du 15/08. La base au 15/08 :
 *   607 spots publiés (`moderation_status='approved'`), dont **416 relus par un
 *   humain** et **191 générés par machine** au lot 1 du sprint 78, sans relecture.
 *
 * Le compteur d'accueil affichait « 607 spots curés & vérifiés » : le chiffre
 * était juste, le mot ne l'était pas. La même page portait par ailleurs un
 * « 200+ spots curés et vérifiés » périmé dans l'autre sens, hérité du plancher
 * statique du sprint 70.
 *
 * Arbitrage retenu : on garde le vrai total et on RETIRE le mot qu'on ne peut
 * pas tenir. Pas de « curés », pas de « vérifiés » dans la copy de vitrine. Le
 * jour où les 191 seront relues, c'est le mot qui reviendra, pas le chiffre qui
 * bougera.
 *
 * Les compteurs live (`counts.spots`, lu en base) restent prioritaires ; ces
 * constantes sont le fallback et la copy statique.
 */

/** Plancher stable, sous le compte réel (607 au 15/08) : ne se périme pas. */
export const SPOTS_PUBLISHED_FLOOR = 600

/** Libellé du compteur d'accueil. Sans « curés » ni « vérifiés » : cf ci-dessus. */
export const SPOTS_COUNTER_LABEL = 'spots de pêche'

/** Formulation inline pour la prose (tarifs, metas). */
export const SPOTS_PUBLISHED_LABEL = '600+ spots de pêche'
