# 🐞 Sprint 52 — « Bugs visibles & liens cassés »

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §5 + audits 28/06 & 29/06. Findings **vérifiés contre le vrai code + la base live** (investigation 5 agents, 2026-06-30 ; plusieurs lignes/claims du roadmap ET de la 1re version de ce brief corrigés ci-dessous).
> **Prod = HEAD `aa4a28d` (sprint-51, déployé).** Objectif : éliminer tout ce qu'un utilisateur voit casser ou incohérent (hors image de partage, traitée au S55). **0 migration** : 100 % code, pas de regen `lib/types.ts`.

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 52 (docs/sprint-52/BRIEF.md). Workstreams parallèles : WS-A légende carte, WS-B filtres carte (toggle source + chips espèces), WS-C modération (échec silencieux + filtre osm), WS-D liens 404/500, WS-E partage département, WS-F nav (Techniques + Voir sur la carte). Aucune migration. Finis par WS-G (vérif : /verif-sprint + revue anti-régression). Esprit critique : vérifie chaque ancre fichier:ligne contre le vrai code, remets en cause le brief s'il se trompe. NE PUSH PAS sans validation.
```

**Prérequis** : aucun (dépôt sain, prod = `aa4a28d` = sprint-51 avec migrations 091-093). Indépendant du S51.

---

## Posture & invariants

Effort max + critique. Le brief est un guide : si une ligne ne colle pas au code réel, corrige et signale. Invariants : **zéro coordonnée GPS exposée** (vigilance WS-F.2), **RLS** d'abord, gating de tier intact (filtres carte inertes pour anonymous/discovery, cap 3 spots/dépt), **pas de tiret cadratin dans la copy visible**, scoring descriptif, **pas de push sans John**. Ce sprint ne touche pas au schéma DB (aucune migration, pas de SQL).

---

## État des données (prod, vérifié live 2026-06-30)

- `spots` par (source, moderation_status) : **`curated/approved` = 215**, `imported/pending` = 942, `community/rejected` = 1. **Zéro spot `approved` hors `curated`.** La RPC `get_spots_for_map` filtre `WHERE moderation_status='approved'` → seuls les 215 curés atteignent le client.
- CHECK `spots_source_check` (live) = `source in ('curated','community','imported')`. **Pas de valeur `'osm'`** (les imports OSM = `imported`).
- Espèces taguées sur ≥1 spot : 21. **6 espèces du S29 sur 0 spot** : `barracuda, tassergal, liche, marbre, lieu_noir, merlan` (le S53 finding D les taguera).

---

## WS-A — Légende carte : retirer les couches fantômes 🟠 [finding C]

**Problème** (`components/map/MapLegend.tsx`) :
- **« Zone active »** (l. **63-70**, carré pointillé corail) : couche supprimée au S42.1 (migration 074, `get_active_zones` droppée). Plus rien ne la dessine. Légende menteuse.
- **« Communauté »** (l. **45-53**, glyphe `~`) et **« Importé »** (l. **54-62**, glyphe `◦`) : décrivent des marqueurs de `MapView.tsx` (l. 155-167) **jamais rendus** (0 spot non-curated `approved`). L'utilisateur ne voit que des `✓` curés.
- Le **paragraphe explicatif** (l. **72-74**) oppose le `✓` à « un point communautaire ou importé approximatif » → référence des glyphes absents.

**Correctif** :
1. **Supprimer** le bloc « Zone active » (l. 63-70), sans condition.
2. **Masquer** « Communauté » + « Importé » tant qu'aucun spot de ces sources n'est `approved` (décision John, cf §Décisions). Reco : masquage conditionnel propre (pas suppression dure), pour que le **curage S43** (imports → `approved`) ré-affiche la ligne sans re-dev.
3. **Reformuler** le paragraphe l. 72-74 (ne plus mentionner de glyphe absent).
4. Conserver l'attribution OSM (l. 76-87, fond de carte).
5. **Ne PAS supprimer** le code `MapView.tsx` l. 155-167 (dessin `~`/`◦`) : mort mais inoffensif, ré-activé naturellement par le S43.

> ⚠️ **Correction vs 1re version du brief** : elle disait « garder Communauté + Importé ». Faux : la base montre 0 spot approuvé de ces sources, donc ces deux lignes sont aussi trompeuses → à masquer.

**Critères d'acceptation** : plus de « Zone active » ni carré pointillé ; plus de « Communauté »/« Importé » tant qu'aucun spot de ces sources `approved` ; paragraphe sans glyphe absent ; 0 occurrence « zone active » dans la copy visible ; pas de tiret cadratin.

**Dépendances** : aucune. **Fichiers** : `components/map/MapLegend.tsx`.

---

## WS-B — Filtres carte : toggle source mort + chips espèces fantômes 🟠 [finding I]

**Problème 1 — toggle source trompeur** (`components/map/MapFilters.tsx:40-44`, rendu l. 404-413) : `SOURCE_FILTER` = curated/community/imported. Le filtre est appliqué **client-side** (`MapShell.tsx:122`) et **jamais envoyé à la RPC** (`carte/page.tsx:60-64` ignore `filters.source`). Comme seuls des spots `curated` arrivent : cocher « Communautaires » ou « Importés (OSM) » **vide la carte (0 spot)** + message « Aucun spot ».
> ⚠️ **Correction vs roadmap ET 1re version** : « le compteur reste 215 » est **faux**. Cocher ces sources met le compteur à **0** (effet trompeur, pas no-op).

**Problème 2 — chips espèces fantômes** (`MapFilters.tsx:28,294`) : `ALL_SPECIES = Object.keys(SPECIES_LABELS)` = **26 chips statiques**, dont **6 sur 0 spot**. Les cocher garantit 0 résultat.

**Correctif** :
1. **Toggle source** : masquer la section « Provenance » entière tant qu'une seule source existe en prod (décision John, cf §Décisions). Reco : masquage (le curage S43 la rendra pertinente). Pas besoin d'un RPC de comptage.
2. **Chips espèces** : piloter sur les espèces **réellement présentes**, dérivées des markers déjà chargés : `new Set(spots.flatMap(s => s.species))`, **même pattern que `availableDepartments`** (`carte/page.tsx:152`). Passer cet ensemble en prop à `MapFilters` ; n'afficher/activer que ces espèces. **Auto-correctif** : dès que le S53 (migration 094) tague les 6 espèces, elles réapparaissent **sans toucher au code**. Pas de RPC nouveau (la donnée `spot.species[]` est déjà côté client).
   - Subtilité gating : anonymous/discovery ont `spots` cappé 3/dépt (ensemble sous-estimé) mais leurs filtres sont **inertes** (`MapFilters` l. 288) → effet cosmétique. OK.

**Critères d'acceptation** : aucune chip espèce affichée/activable ne renvoie 0 spot sur le périmètre du tier ; le toggle source n'est plus activable tant qu'aucun spot non-curated n'est `approved` ; après simulation d'un tag d'espèce, la chip réapparaît sans modif de code ; gating inchangé.

**Risques/vigilance** :
- **Garder le schéma zod permissif** (`lib/spots/filters-schema.ts:10,24`) : un vieux lien `?species=barracuda` ou `?source=imported` doit **parser sans 500** (juste ne rien matcher). Ne pas restreindre l'enum.
- **localStorage** (`carte:last-filters`) : un filtre source/espèce orphelin restauré ne doit pas vider la carte silencieusement (nettoyer à la restauration ou l'ignorer dans `filterSpots`).
- GPS/RLS : aucun impact.

**Dépendances** : aucune (fichier différent de WS-A). **Fichiers** : `components/map/MapFilters.tsx`, `app/(map)/carte/page.tsx`, éventuellement `components/map/MapShell.tsx`.

---

## WS-C — Modération : échec silencieux + filtre `osm` mort 🟠 [finding E + osm]

**Problème 1 — `ActionResult` avalé** (`app/(app)/moderation/page.tsx:72-103`) : **8 wrappers** `'use server'` (`deletePostAction`, `deleteCommentAction`, `dismissReportAction`, `approveSpotAction`, `rejectSpotAction`, `mergeSpotAction`, `verifySpotAction`, `reverifySpotAction`) `await` l'action puis **jettent le résultat**. Tout échec est invisible (« le bouton ne fait rien »).

**Problème 2 — « déjà supprimé » = erreur + signalement jamais résolu** (`app/actions/feed.ts:475` `moderatorDeletePost`, `:518` `moderatorDeleteComment`) : `if (!deleted?.length) return fail('Post introuvable.')`. Si un autre modérateur a déjà supprimé le post → 0 ligne → erreur affichée alors que l'objectif est atteint, ET `resolveReportsForTarget` jamais appelé → signalement **`pending` à vie**.

**Problème 3 — filtre `osm` mort** : `source='osm'` n'existe pas. **3 occurrences** à retirer dans `moderation/page.tsx` : **L480** (whitelist), **L825** (chip « OSM »), **L342-347** (`SOURCE_LABELS.osm`). Le filtre s'applique à **L634** (`q.eq('source', reverifySource)`, pas L635). Bon filtre imports = `imported` (chip « Import »).
> ⚠️ **Correction vs 1re version** : elle ne citait que L480 + le label « inoffensif à laisser ». En fait la **chip L825** rend « OSM » cliquable (= 0 résultat) → à retirer aussi.

**Correctif** :
1. **Surfacer les résultats** : extraire chaque bouton de row en petit **client component** (`'use client'`) qui appelle l'action importée et toast via `sonner` (`<Toaster>` déjà monté `app/layout.tsx:78` ; modèle `components/spots/CurateSpotForm.tsx:223-243` : `if (res.ok) toast.success(...) else toast.error(res.error)`). Conserver `revalidatePath('/moderation')` côté action. (Le repli « `if(!res.ok) throw` » est moins bon : pas de toast + pas d'`error.tsx` de groupe avant le S54 → remonte à la racine.)
2. **Idempotence « déjà supprimé »** : dans `moderatorDeletePost`/`moderatorDeleteComment`, traiter « 0 ligne » comme **succès** ET appeler `resolveReportsForTarget(...)` quand même avant le `return ok(...)`.
3. **Retirer `osm`** des 3 endroits (L480, L825, L342-347).

**Critères d'acceptation** : supprimer un post déjà supprimé → toast succès + signalement résolu (disparaît de la file) ; un vrai échec → toast d'erreur FR ; une action réussie → toast + row revalidée ; aucun bouton silencieux ; plus de chip « OSM » (chips = Toutes/Curé/Communauté/Import) ; `grep "'osm'" moderation/page.tsx` = 0.

**Risques/vigilance** :
- Vérifier que les 5 actions `moderate*Spot` (`app/actions/spots.ts`) font `revalidatePath('/moderation')` (les wrappers s'y fiaient) ; sinon l'ajouter.
- Conserver le gate `is_moderator` re-vérifié dans chaque action (`viewerIsModerator`).
- Toasts : tutoiement FR, 0 tiret cadratin, aucune coordonnée GPS dans un message.
- `resolveReportsForTarget` ré-appelé sur cible déjà résolue = inoffensif (`where status='pending'` ne matche plus).

**Dépendances** : aucune. **Fichiers** : `app/(app)/moderation/page.tsx`, `app/actions/feed.ts`, (vérif) `app/actions/spots.ts`.

---

## WS-D — Liens cassés : 404 propositions + 500 carnet 🟠

**F1 — 404 sur une proposition validée** (`app/(app)/spots/mes-propositions/page.tsx:102`) : `href={`/spot/${p.slug}`}` (SINGULIER) → 404. La route est `/spots/[slug]` (PLURIEL ; seul `/spot/[slug]` existant = `app/og/spot/[slug]` = image OG). C'est le **seul** href `/spot/` singulier du repo. **Correctif** : `href={`/spots/${p.slug}`}`.

**F2 — 500 au lieu de 404 sur id malformé** (`lib/catches/queries.ts:57`) : `getCatchById` ne valide pas l'uuid → id non-uuid fait rejeter PostgREST (`22P02`) → `throw error` → error boundary (500). Les 2 call-sites (`carnet/[id]/page.tsx:73`, `carnet/[id]/modifier/page.tsx:19`) font déjà `if (!c) notFound()`. **Correctif (reco)** : valider l'uuid en amont (pattern dominant du repo) :
```ts
if (!z.string().uuid().safeParse(id).success) return null
```
en tête de `getCatchById` → corrige les **deux** pages d'un coup, évite un round-trip. Garder le `throw error` final pour les vraies erreurs DB. (Repli accepté : `if (error.code === '22P02') return null`.)

**Critères d'acceptation** : « Mes propositions » → cliquer un spot « Validé » ouvre la fiche (200) ; `grep "href={\`/spot/" app components` = 0 ; `/carnet/pas-un-uuid` → 404 ; `/carnet/<uuid-inexistant>` → 404 ; `/carnet/<uuid-valide>` s'affiche ; idem `/modifier` ; une vraie panne DB reste une erreur.

**Risques/vigilance** : ne pas transformer le `throw` final en `return null` (panne DB ≠ 404). `z.string().uuid()` valide en zod v4. RLS/GPS inchangés (`catches_for_viewer`).

**Dépendances** : aucune. **Fichiers** : `app/(app)/spots/mes-propositions/page.tsx`, `lib/catches/queries.ts`.

---

## WS-E — Partage : « dans 17 . » au lieu du nom du département 🟡 [finding K]

**Problème** (CONFIRMÉ bout en bout) : `spots.department` est un `character(3)` **paddé d'espaces** (`'17 '`). Sérialisé en JSON, l'espace part tel quel ; `DEPARTMENT_LABELS['17 ']` rend `undefined` → fallback sur la valeur brute → og:description « ... dans 17 . ».
- `app/(marketing)/c/[slug]/page.tsx:81-84` : `deptLabel()` ne trime pas.
- `app/actions/share.ts:361` : `department: row.department` stocke la valeur paddée dans le payload (vraie ligne = **361**, le roadmap/1re version disent 362).
- L'image OG (`app/og/card/[slug]/route.tsx:127`) **trime déjà** ; seule la **page (meta)** est cassée.
- **Seules les cartes `catch` sont touchées** (`outings.department` est `text` propre ; `catches` n'a pas de colonne `department`, elle vient de `spots` via `catches_for_viewer`).

**Correctif** (double normalisation, pattern repo = `.trim()` inline au point de lecture) :
1. **À l'affichage** (corrige les cartes déjà en base) : `deptLabel` trime la clé avant lookup :
   ```ts
   const key = dept?.trim()
   if (!key) return null
   return DEPARTMENT_LABELS[key] ?? key
   ```
2. **À la source** (empêche le re-stockage paddé) : `share.ts:361` → `department: row.department?.trim() ?? null` (garder `?? null` : nullable pour un catch sans `spot_id`).

Ne PAS toucher `route.tsx` (déjà correct). Ne PAS changer le type de `spots.department` (hors scope).

**Critères d'acceptation** : `/c/<slug-catch-du-17>` → og:description « ... dans Charente-Maritime. » ; bloc « Secteur » du recap = nom (pas « 17 ») ; une nouvelle carte catch du 17 stocke `payload.department === "17"` (len 2) ; département inconnu → fallback propre (jamais `undefined`, jamais « . » orpheline) ; image OG inchangée.

**Risques/vigilance** : conserver `?.trim() ?? null`. Piège bpchar : en SQL `'17 ' = '17'` est vrai (padding ignoré) ; le bug n'apparaît qu'à la sérialisation JSON → tester via `payload->>'department'`, pas via `=`.

**Dépendances** : aucune. **Fichiers** : `app/(marketing)/c/[slug]/page.tsx`, `app/actions/share.ts`.

---

## WS-F — Nav : « Techniques » stub + « Voir sur la carte » 🟡 [finding L]

**L.1 — `/techniques` (stub) lié comme une vraie page** : la page EST un stub `noindex` (`app/(marketing)/techniques/page.tsx:15`, badge « Bientôt disponible ») **mais héberge un vrai formulaire liste d'attente** (`TechniquesWaitlist`, capture email S31). Liens : `components/layout/Footer.tsx:37` et `components/layout/MoreMenu.tsx:45`.
**Correctif (reco : relibeller, pas masquer** — pour ne pas tuer la capture email) : `label: 'Techniques (bientôt)'` aux deux endroits ; optionnel style atténué dans le Footer. Garder `/techniques` atteignable + `noindex`. (Décision John, cf §Décisions.)

**L.2 — `/spots` et `/spots/[slug]` sans lien vers `/carte`** (groupe **`(marketing)`**) : ni la liste (`app/(marketing)/spots/page.tsx`) ni la fiche (`app/(marketing)/spots/[slug]/page.tsx`) ne renvoient à la carte.
**Correctif** (décision John, cf §Décisions) :
- **Option A (reco, sprint « liens »)** : lien vers `/carte` **nu**. Zéro coordonnée, zéro modif de la page carte, zéro risque.
- **Option B** : `/carte?department=${spot.department}` + fallback `initialCenter`/`initialZoom` dérivé de `params.department` dans `app/(map)/carte/page.tsx` (centroïde **public** via `getCenterForDepartment`). ⚠️ Aujourd'hui la carte ne lit l'URL que pour les filtres itinérants et ne recentre que sur `homeDept` → vrai dev (page carte force-dynamic, sensible au tier), passe anti-régression requise. Bon param = **`department`** (pas `dept`).
- Insertion : liste = dans le hero (après l'intro) ; fiche = sous la mini-carte, à côté des liens d'itinéraire GPS (`spot.department` déjà dispo via `deptKey`).

**Critères d'acceptation** : depuis `/spots` et `/spots/[slug]`, un lien « Voir sur la carte » mène à `/carte` (200) ; (option B) `/carte?department=29` sans session centre sur le Finistère **sans** exposer de coordonnée ni contourner le cap 3 spots/dépt ; libellés FR sans tiret cadratin ; « Techniques (bientôt) » au Footer + MoreMenu.

**Risques/vigilance** : **invariant GPS** : jamais de `lat/lng` de spot dans l'URL carte ; seul `department` (code public) autorisé. Ne pas contourner le gating (un `?species=` est déjà ignoré pour un gratuit, voulu). L'option B passe par la passe anti-régression carte.

**Dépendances** : aucune. **Fichiers** : `components/layout/Footer.tsx`, `components/layout/MoreMenu.tsx`, `app/(marketing)/spots/page.tsx`, `app/(marketing)/spots/[slug]/page.tsx`, (option B) `app/(map)/carte/page.tsx`.

---

## WS-G — Vérification (obligatoire, en dernier) ✅

1. **`/verif-sprint`** : `pnpm test` (suite complète), `pnpm typecheck`, `pnpm lint` (bloquant), `pnpm build` (Node 24). Aucune migration → pas de regen types.
2. **Tests ciblés** : `getCatchById('not-a-uuid') → null` ; idempotence `moderatorDeletePost`/`DeleteComment` (0 ligne → succès + résolution signalement) ; `deptLabel` trim (« 17 » → « Charente-Maritime »). Smoke filtres carte si testable.
3. **Passe anti-régression** (agent indépendant) : aucune fuite GPS (surtout WS-F.2), gating de tier intact (filtres inertes anonymous/discovery, cap 3 spots/dépt), schéma zod filtres resté permissif (vieux liens ne 500 pas), `is_moderator` conservé, copy sans tiret cadratin, aucune migration ajoutée.
4. **QA live ciblée** (après deploy) : `/carte` (légende nettoyée, chips sans espèce à 0, section Provenance masquée) ; `/moderation` (toast succès/erreur, plus de chip OSM) ; `/spots/mes-propositions` (lien fiche 200) ; `/carnet/pas-un-uuid` → 404 ; `/c/<slug>` du 17 (og:description avec nom) ; Footer/MoreMenu (« Techniques (bientôt) » + « Voir sur la carte »).
5. **NE PAS PUSH** : laisser à John (commits prêts, résumé fait / à tester / 0 migration).

---

## Récap & décisions

| WS | Findings | Fichiers clés | Migration |
|---|---|---|---|
| A | C (légende fantôme) | `MapLegend.tsx` | — |
| B | I (toggle source + chips espèces morts) | `MapFilters.tsx`, `carte/page.tsx` | — |
| C | E (modération avalée) + filtre osm | `moderation/page.tsx`, `feed.ts` | — |
| D | lien 404 mes-propositions + UUID 500→404 | `mes-propositions/page.tsx`, `queries.ts` | — |
| E | K (« dans 17 . ») | `c/[slug]/page.tsx`, `share.ts` | — |
| F | L (Techniques stub + spots→carte) | `Footer.tsx`, `MoreMenu.tsx`, `spots/*` | — |

**Migrations** : **aucune**. Prochain n° libre reste `094` (pour le S53).

**Décisions ouvertes pour John** :
1. **WS-A légende** Communauté/Importé : masquage conditionnel (reco, anticipe le curage S43) ou suppression dure ?
2. **WS-B chips espèces** : pilotage dynamique depuis les markers (reco, s'auto-corrige au S53) ou griser en dur les 6 ?
3. **WS-B toggle source** : masquer la section « Provenance » (reco, 0 RPC) ; désactiver avec libellé « bientôt » ; ou afficher le compte par source et désactiver à 0 (approche de la 1re version, demande une source de comptage) ?
4. **WS-F.1 Techniques** : relibeller « Techniques (bientôt) » en gardant la liste d'attente (reco) ou masquer le lien ?
5. **WS-F.2 « Voir sur la carte »** : Option A lien `/carte` nu (reco pour un sprint « liens ») ou Option B avec pré-centrage `?department=` (touche la page carte, anti-régression requise) ?

**Parallélisme** : WS-A→F sur fichiers disjoints (WS-A/B tous deux sur `components/map/*` mais MapLegend vs MapFilters) → parallélisables, puis WS-G en barrière. Effort ~2-3 j. Indépendant du S51.

---

*Brief Sprint 52 (v2) rédigé le 2026-06-30, findings vérifiés contre HEAD `aa4a28d` (= prod, sprint-51) et la base live (sources spots, CHECK, char(3) department, paddings). Corrections vs roadmap + 1re version intégrées (filtre source vide la carte ; Communauté/Importé aussi fantômes ; 3 occurrences osm ; chips espèces dérivables sans RPC ; share.ts:361 ; param carte `department` ; getCatchById validation amont). Prochain : Sprint 53 « Données & saisies » sur demande.*
