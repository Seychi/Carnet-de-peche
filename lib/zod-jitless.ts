/**
 * Coupe le JIT de zod v4. Module à effet de bord, SANS aucun import.
 *
 * ─── Le problème ────────────────────────────────────────────────────────────
 * Notre CSP ne porte pas `'unsafe-eval'` (`next.config.ts`, volontaire, verrouillé
 * par un test). zod v4 compile ses validateurs d'objet avec le constructeur
 * `Function`, et il SONDE d'abord sa disponibilité :
 *
 *     try { return Function(""), true } catch { return false }
 *
 * La sonde est bloquée par la CSP, zod retombe proprement sur son chemin
 * interprété — donc rien n'est cassé — mais le navigateur POSTe un rapport de
 * violation par chargement de page. C'est `JAVASCRIPT-NEXTJS-H`, l'issue n°1 du
 * projet en volume : 1 154 événements pour 512 utilisateurs.
 *
 * ─── Pourquoi ce fichier n'importe PAS zod ─────────────────────────────────
 * Vérifié dans le source installé (zod 4.4.3) :
 *   • `node_modules/zod/v4/core/core.js:72` fait
 *     `(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {})` :
 *     un objet DÉJÀ posé est préservé. On peut donc pré-amorcer la config avant
 *     même que zod ne soit chargé.
 *   • `node_modules/zod/v4/core/schemas.js:970` lit `globalConfig.jitless` à la
 *     CONSTRUCTION de chaque schéma objet (`const jit = !core.globalConfig.jitless`),
 *     pas au `.parse()`. Un schéma déjà construit garde sa décision.
 *
 * Conséquence : le flag doit être posé avant le PREMIER `z.object()` du graphe.
 * Comme les imports ESM sont hissés, un `z.config({ jitless: true })` écrit dans un
 * module qui importe zod ne peut jamais précéder le chargement de zod. Ce fichier-ci
 * n'importe rien, donc il peut être placé en tête de n'importe quelle chaîne.
 *
 * Il couvre les deux cas :
 *   • zod pas encore chargé → on crée l'objet, zod le récupère tel quel ;
 *   • zod déjà chargé       → on MUTE l'objet qu'il lit, ce qui vaut pour tous les
 *                             schémas construits ensuite.
 *
 * ─── Ce que ça ne change pas ────────────────────────────────────────────────
 * `jitless` n'est lu qu'à deux endroits dans tout le paquet (`schemas.js:970` et
 * `util.js:148`). Aucun message, aucune coercition, aucune locale, aucun ordre
 * d'issues n'en dépend : c'est une stratégie d'exécution, pas une sémantique.
 * À noter : le chemin JIT n'était de toute façon actif que pour les parses
 * SYNCHRONES (`schemas.js:987`), donc tous nos `parseAsync` tournaient déjà en
 * interprété.
 *
 * ⚠️ Ne PAS « corriger » ce problème en ajoutant `'unsafe-eval'` à la CSP.
 */

type ZodGlobal = { __zod_globalConfig?: { jitless?: boolean } }

const g = globalThis as ZodGlobal
g.__zod_globalConfig ??= {}
g.__zod_globalConfig.jitless = true

export {}
