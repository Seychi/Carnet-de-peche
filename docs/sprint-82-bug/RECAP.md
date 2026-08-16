# Sprint 82 « bugs » — RECAP (EN COURS)

> **Statut au 2026-08-16, 11h20.** P0-1 fait, P0-3 fait (les deux moitiés, dont une en attente
> d'une case à cocher chez John). P0-2, P1-4 à P1-11 : non faits.
> ⚠️ Ligne **datée**. La vérité est HEAD de `main` et la prod, jamais cette phrase.
>
> **Aucune migration.** Aucune RPC, aucune policy. **1356 tests verts**, build, `tsc`, lint OK.
> Source : `docs/audits/AUDIT-QA-2026-08-15.md` (identique à `BRIEF.MD`).

---

## P0-1 — La couleur du marqueur ✅

**L'audit posait ça comme une décision produit entre deux options. C'en est pas une : le code
tranche.** Basculer la pastille sur `current_quality` reviendrait à annuler le commit `24d4ef4`
du 23/06, dont le message dit « fin du 0/100 partout ». `current_score` est la note de la
fenêtre active **à l'instant où le cron tourne**, 05h00 UTC, heure à laquelle presque aucun spot
n'a de créneau actif : il vaut ~toujours 0.

★ **Et une vérification qui manquait à l'audit** : `current_quality` et `current_score` ne sont
affichés **nulle part** dans l'application (`grep` sur tout `app/`, `components/`, `lib/`). La
contradiction relevée n'oppose pas la carte à la fiche, elle oppose la carte à une **colonne
morte**.

Le vrai défaut était donc que rien ne disait de quoi la couleur parlait :

- `currentQuality` / `currentScore` → **`dayQuality` / `dayScore`** sur `SpotMarker`. Le nom
  mentait, et c'est très exactement ce qui a induit l'audit en erreur.
- La légende porte « **Qualité du jour** ».
- Le panneau de spot dit « **Score du jour** » au lieu de « Score ».
- Un commentaire dans `MapLegend.tsx` explique pourquoi il ne faut PAS « corriger » vers
  `current_quality`, avec le numéro du commit à ne pas annuler.

**Le comportement ne change pas. C'est la promesse qui devient exacte.**

⚠️ **Non fait** : le corollaire de l'audit (« la carte n'affiche jamais que 2 des 5 couleurs »).
C'est une conséquence de la distribution réelle des `day_score` (ils se serrent entre 64 et 92),
pas un défaut d'affichage. Revoir les seuils de `SOLUNAR_CONFIG.QUALITY_THRESHOLDS` serait un
arbitrage produit à part entière, et il vaut mieux le faire **après** le P0-2 : ouvrir le
scoring aux 607 spots va changer la distribution.

---

## P0-3 — Le retour depuis une fiche ✅ (les deux causes)

### Cause 1 : Skew Protection — codée, en attente de Vercel Pro

`next.config.ts` : **`deploymentId: process.env.VERCEL_DEPLOYMENT_ID`**.

⚠️ **L'audit cite `experimental.useDeploymentId` : cette clé n'existe pas en Next 15.5.** Vérifié
dans `node_modules/next/dist/server/config-shared.d.ts` — `tsc` la refuse. La bonne clé est
`deploymentId` au premier niveau.

**Décision John du 16/08 : Skew Protection sera activée quand le compte passera en Vercel Pro.**
D'ici là `VERCEL_DEPLOYMENT_ID` est absente, la clé vaut `undefined`, et le comportement est
strictement celui d'aujourd'hui. **La ligne est inerte et sans risque.**

### Cause 2 : le viewport perdu au retour — corrigée et prouvée

`lib/map/viewport-url.ts` (nouveau) : le cadre de la caméra vit dans l'URL, `?vp=lng,lat,zoom`.

**Pourquoi l'URL** et pas un état en mémoire : au retour, le composant est remonté (`/carte` est
`force-dynamic`), donc tout état React est perdu. L'URL est restaurée par le navigateur : c'est
le seul endroit qui survit à l'aller-retour **sans rien stocker chez le visiteur**.

Trois précautions qui comptent :

- ★ **`replaceState`, jamais `pushState`.** Un `push` empilerait une entrée d'historique par
  panoramique, et le bouton « retour » remonterait le fil des déplacements au lieu de quitter la
  carte. **Vérifié : `history.length` reste à 2 après quatre zooms.**
- ★ **`window.history` directement, pas `router.replace`.** Ce dernier déclencherait un
  aller-retour serveur à chaque geste, sur une page `force-dynamic`.
- ★ **Une URL bricolée ne doit jamais casser le montage.** `parseViewport` renvoie `null` sur
  toute valeur absente, malformée ou hors bornes. Cas piégeux couvert : `?vp=,,` — `Number('')`
  vaut **0**, pas `NaN`, donc sans garde explicite une URL tronquée aurait envoyé la carte au
  large du golfe de Guinée, dézoomée à fond.

**Prouvé sur le build local**, parcours réel `/carte` → zoom → fiche de spot → retour :

| Contrôle | Résultat |
|---|---|
| L'URL porte le cadre après un zoom | `?vp=2.1927,45.2071,6.19` |
| `history.length` après 4 zooms | **2** (inchangé) |
| Le retour restaure l'URL | `/carte?vp=2.1927,45.2071,6.19` |
| La caméra est **réellement** au cadre sauvegardé | écart **0,0000°** en longitude ET latitude |
| Marqueurs après retour | **72** (le « 0 marqueur » de l'audit a disparu) |
| **Non-régression** : arrivée sans `vp` | centre [2,20 · 45,20] zoom 4,86, cohérent avec les bornes du sprint 80, 72 marqueurs |

19 tests ajoutés (`lib/map/__tests__/viewport-url.test.ts`).

⚠️ **Réserve** : les 72 marqueurs au retour ont été constatés **sur le build local**, où il n'y a
pas de déploiement concurrent. Le « 0 marqueur » de l'audit était attribué à la Skew Protection
absente (503 sur une requête RSC pendant un déploiement) : **cette moitié-là n'est pas encore
prouvée**, et ne le sera qu'une fois Vercel Pro en place.

---

## Non fait

| Item | Pourquoi |
|---|---|
| **P0-2** ouvrir le scoring aux importés | Demande une migration. **Connecteur Supabase déconnecté** : je ne peux ni compter ni appliquer. Et l'audit impose de faire **P1-6 d'abord** |
| **P1-6** fiabiliser le cron de scoring | Idem : demande de lire l'état réel des 9 scores périmés |
| **P1-4** Local fait perdre des spots | « À arbitrer, pas forcément à coder » — c'est ta décision |
| **P1-5** 171 `rejected` encore publics | Migration, connecteur requis |
| **P1-7** cache CDN des pages SEO | Faisable en code, non commencé |
| **P1-8** `revoke execute` sur les triggers | Migration, connecteur requis |
| **P1-9 / P1-10 / P1-11** | Hygiène, non commencée |

---

## Reste manuel John

1. **Cocher Skew Protection** quand le compte passe en Vercel Pro (Settings → Advanced). La clé
   côté code est déjà là et l'attend.
2. **Reconnecter le connecteur Supabase** — il bloque P0-2, P1-5, P1-6 et P1-8, c'est-à-dire la
   moitié de la file.
3. **Arbitrer P1-4** : un abonné Local du 13 passe de 607 spots à 36. Ce n'est pas un mensonge
   (la page tarifs le dit), mais c'est un piège de conversion.
4. **Rebrancher l'extension Chrome** pour le parcours connecté, que l'audit n'a pas pu jouer —
   et notamment le comportement de la carte à 607 spots, une fois le P0-2 passé.
