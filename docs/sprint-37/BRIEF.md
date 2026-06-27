# Sprint 37 — Brief d'exécution
## « Le matériel qui parle » (F1 boîte à matériel perso + F2 badge spot vérifié · ~5-6 j)

> Rédigé le 2026-06-27. Premier sprint de la **roadmap offensive** (`docs/ROADMAP-OFFENSIVE-2026-06-27.md`). Sprint fondateur : F1 crée le facteur « leurre » que le sprint 38 (comparateur) projettera.
> Contexte concurrent : on frappe le seul vrai avantage de **FishFriender** (boîte à matériel, mais 100 % générique) en le rendant **personnel**, et on plante le drapeau « spot GPS vérifié » contre **Decathlon Fishing** (avis cinglant : « un spot c'est un GPS fixe, pas un point qui bouge »). Cf `docs/audits/AUDIT-2026-06-27-SITE-10-AVANT-MOBILE.md` §7.
> Décisions John 2026-06-27 : séquencement **équilibré**, périmètre boîte à matériel = **leurres / montages / appâts d'abord** (PAS de catalogue type FishFriender). Une décision reste ouverte (D1, badge vérifié).

**Préalable avant de démarrer** (manuel John) : rien à merger (on part de `main` @ `8b21b44`). Trancher **D1** (sens du badge « vérifié », cf §Décisions) idéalement avant le WS F, sinon l'agent s'arrête sur le garde-fou.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-37/BRIEF.md`. Lance **WS A et WS E en parallèle dès maintenant** (les 2 migrations, indépendantes), puis WS B/C/D (dépendent de A) et WS F (dépend de E) en parallèle. Respecte les invariants (moat gratuit, scoring **descriptif**, RLS owner, floutage GPS intact, copy sans tiret cadratin). Écris d'abord les migrations en fichiers numérotés `059_*`/`060_*`, applique-les, régénère `lib/types.ts`. Termine par le workstream **VERIF**. **Ne push pas.** Toute décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant de toucher au scoring / zod / form (Next 15.5, React 19, zod v4) | **docs-researcher** → Context7 | API version-correcte, pas de code de mémoire. |
| Migrations / vues / RPC / RLS / types | **supabase-guard** → Supabase (RO d'abord) | Lire le schéma live AVANT (les colonnes matériel sont **remote-only**, cf garde-fou), migration = fichier numéroté, regen `lib/types.ts`, `get_advisors` après DDL. |
| QA des 2 écrans (form prise, carte, /carnet/boite, /moderation) | **qa-chrome** → Claude in Chrome + Playwright | Captures desk+mobile, console, anti-régression gating/floutage. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | 0 régression runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante. |

---

## Objectif en une phrase
Permettre d'attacher un leurre/montage de **sa boîte** à une prise, faire émerger un **6ᵉ facteur de tendance perso « leurre »** (« ton shad chartreuse sort 60 % de tes bars ») et transformer le badge spot en signal **« coordonnée vérifiée »** traçable, sans rien régresser (floutage GPS, gating freemium, scoring descriptif).

## ⚠️ Garde-fou transverse n°1 (à lire avant tout)
Les colonnes matériel de `catches` (`lure_brand`, `lure_model`, `bait_type`, `bait`, `technique`) **n'ont PAS de migration locale** : elles ont été ajoutées côté remote (dérive documentée à `supabase/migrations/015_catches_scoring_columns_reconcile.sql:3-6`) et ne sont visibles que via la vue `catches_for_viewer` (`015:51,58-60`). **Donc : `supabase-guard` lit le schéma live AVANT de coder** (ne jamais supposer les types ; confirmer via `lib/types.ts` ou la DB). Toute nouvelle colonne passe par un **fichier de migration numéroté**.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | F1 — Migration `059_catch_gear` (table `gear_items` + FK + vue) | 1 j | — | ✅ |
| B | F1 — Picker « ma boîte » dans le form de prise | 1-1,5 j | A | ⚠️ scaffold J1, branche après A |
| C | F1 — Facteur `gear` dans `lib/scoring/personal` + rendu | 1-1,5 j | A | ⚠️ après A |
| D | F1 — Vue `/carnet/boite` (taux de réussite par espèce) | 1 j | A | ⚠️ après A |
| E | F2 — Migration `060_spot_verification` (traçabilité + RPC + notif) | 1 j | — | ✅ |
| F | F2 — Action modération « vérifier » + badge/tooltip + copy | 1 j | E (+ D1) | ⚠️ après E |
| VERIF | revue finale + QA + anti-régression | 0,5 j | tous | ❌ (toujours en dernier) |

**Parallèle jour 1 : A + E** (2 migrations indépendantes). Puis B/C/D (sur A) et F (sur E) en parallèle.

---

## WS A — F1 · Migration `059_catch_gear` (la fondation)

Créer la boîte à matériel structurée et la rattacher aux prises, **sans** casser la saisie texte legacy.

> **Connecteurs** : supabase-guard (lire le schéma `catches` + la définition courante de `catches_for_viewer` AVANT ; appliquer la migration ; `get_advisors` après ; regen `lib/types.ts`).

### Tâches
1. `supabase/migrations/059_catch_gear.sql` — copier le style owner-only de **`051_outings.sql:1-48`** (en-tête `:1-6`, table `:9-23`, `enable row level security` `:31`, 4 policies owner `(select auth.uid()) = user_id` `:33-48`).
   - Table `gear_items` : `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `kind text not null check (kind in ('leurre','montage','appat'))`, `brand text`, `model text`, `color text`, `size_mm smallint`, `notes text`, `archived boolean not null default false`, `created_at timestamptz default now()`. `COMMENT ON TABLE`.
   - Index : `create index gear_items_user_idx on public.gear_items(user_id) where not archived;`
2. FK sur les prises : `alter table public.catches add column gear_id uuid references public.gear_items(id) on delete set null;` + index `catches_gear_id_idx`.
3. **Étendre la vue `catches_for_viewer`** pour exposer `gear_id` ET un libellé dénormalisé `gear_label` (LEFT JOIN `gear_items`, ex. `nullif(trim(concat_ws(' ', gi.brand, gi.model, gi.color)), '')`). ⚠️ **Reprendre la définition COMPLÈTE courante de la vue** (`015:30-65`) et **conserver son modèle `security definer`** (c'est l'une des 2 vues volontairement definer, cf `migration 047 §3` / `CLAUDE.md §7` : NE PAS la basculer en invoker).
4. Backfill best-effort (non bloquant) : pour chaque prise ayant `lure_model`/`lure_brand` non nuls, créer un `gear_items` (`kind='leurre'`) par user + valeur distincte et rattacher `gear_id`. Idempotent (ne pas dupliquer si déjà présent).
5. Régénérer `lib/types.ts`.

### Critères d'acceptation
- `select * from gear_items limit 1;` fonctionne ; RLS : un user ne lit que ses items (vérifier via `supabase-guard` qu'aucune policy n'expose les items d'autrui).
- `catches_for_viewer` renvoie `gear_id` + `gear_label` (requête de contrôle sur une prise de John).
- La vue reste en `security definer` (advisor inchangé : toujours exactement les 2 `security_definer_view` connues, pas une de plus).
- 0 régression : le form de prise (texte legacy) écrit toujours, les prises existantes restent lisibles.

### Garde-fous
- Ne PAS toucher au floutage `geom` de `catches_for_viewer` ni à son `security definer`.
- `gen_random_uuid()` (pgcrypto déjà présent), pas `uuid_generate_v4()`.

---

## WS B — F1 · Picker « ma boîte » dans le form de prise

Remplacer la saisie texte libre par un sélecteur depuis `gear_items` (création inline), en gardant le fallback texte.

> **Connecteurs** : docs-researcher (combobox accessible React 19 / zod v4) ; qa-chrome (captures form desk+mobile).

### Tâches
1. `components/catches/CatchForm.tsx` — section technique `:671-733`. Aujourd'hui : leurre rendu `:698-713` (si `technique==='leurres'`), appât `:715-732`, reset au changement de technique `:264-279`. **Il n'existe pas de combobox réutilisable** (`CityAutocomplete` est ville-only ; le matériel utilise un `<datalist>` natif `:726`).
2. Créer `components/catches/GearPicker.tsx` : autocomplete sur les `gear_items` du user (filtré par `kind` selon la technique : `leurres → kind='leurre'|'montage'`, autres → `kind='appat'`), avec **création inline** d'un item (marque/modèle/couleur). Écrit `gear_id` dans le form ; garde `lure_brand`/`lure_model`/`bait_type` en fallback pour la rétro-compat et la saisie one-shot.
3. Étendre le zod `lib/catches/schema.ts:39-43` : ajouter `gear_id: z.string().uuid().optional()`. Le conditionnement technique↔matériel reste géré côté form (effet `:264-279` à étendre pour reset `gear_id` au changement).
4. Action d'écriture des prises (`lib/catches/actions.ts`) : persister `gear_id`.

### Critères d'acceptation
- Loguer une prise en choisissant un leurre existant OU en le créant inline ; le `gear_id` est bien stocké (`select gear_id from catches order by created_at desc limit 1;`).
- Le leurre créé réapparaît dans le picker à la prise suivante.
- Au passage technique `leurres → surfcasting`, le `gear_id` leurre est remis à zéro (pas de matériel incohérent).
- Tap targets ≥ 44 px, libellés zod en français.

### Garde-fous
- Garder la saisie texte en fallback (ne pas supprimer `lure_brand/model`, des prises legacy en dépendent et le scoring les lit).
- `⚠️ DEMANDER À JOHN AVANT` si tu veux supprimer le `<datalist>` appâts existant.

---

## WS C — F1 · Facteur `gear` dans le scoring perso (le cœur du moat)

Faire émerger « ton meilleur leurre sur le bar » comme 6ᵉ tendance descriptive.

> **Connecteurs** : docs-researcher si besoin ; supabase-guard (confirmer que `catches_for_viewer` expose bien `gear_label` après WS A).

### Tâches (propagation du nouveau facteur, ancres exactes)
1. `lib/scoring/personal/types.ts:7` — type union des facteurs : `'hour' | 'weekday' | 'season' | 'wind' | 'tide'` → **ajouter `| 'gear'`**.
2. `lib/scoring/personal/config.ts:67-73` — `FACTOR_LABELS` : ajouter `gear: 'Leurre'` (libellé d'affichage). Vérifier le barème confiance `:13-17` et seuils `:6-9` (`MIN_FOR_TENDENCIES:3`, `MIN_PER_FACTOR:2`) : on les réutilise tels quels.
3. `lib/scoring/personal/buckets.ts:4-11` — type `DbCatchRow` : ajouter `gear_label: string | null` (lu depuis la vue). `:81-100` `toCatchSamples` : mapper `gear_label` (fallback `lure_model`/`lure_brand`) vers `CatchSample` (type à `types.ts:12-21`).
4. `lib/scoring/personal/tendencies.ts:52-74` — `computeTendencies` : ajouter une 6ᵉ entrée `tendencyFromLabels('gear', gearLabels)` sur le modèle de vent/marée `:67-73` (ne pousser le facteur que pour les prises où le matériel est renseigné, exactement comme vent/marée gèrent les valeurs absentes).
5. `components/scoring/PersonalTendencies.tsx` — la boucle de rendu `:105-126` itère déjà sur les facteurs (libellé via `FACTOR_LABELS[t.factor]` `:113`). Passer la limite d'affichage `:101` de `slice(0, compact ? 3 : 5)` à `... : 6` pour que le leurre s'affiche en mode complet.

### Critères d'acceptation
- Un compte avec ≥ 3 prises de bar dont ≥ 2 au même leurre affiche une tendance « X % de tes bars au {leurre dominant} » avec `sampleCount` et niveau de confiance corrects.
- **Reste DESCRIPTIF** : aucun chiffre 0-100 perso, aucune formulation prédictive (« ça va mordre »).
- Les prises sans matériel renseigné ne faussent pas le facteur (exclues du dénominateur, comme vent/marée).
- Tests Vitest du moteur perso étendus et verts (le dossier a déjà `lib/scoring/personal/__tests__/`).

### Garde-fous
- Le facteur leurre est **gratuit** (c'est le moat, jamais derrière un paywall).
- Ne pas réordonner les facteurs existants ni changer leur sémantique.

---

## WS D — F1 · Vue « ma boîte » (`/carnet/boite`)

La page addictive et partageable : chaque leurre avec son taux de réussite par espèce.

> **Connecteurs** : supabase-guard (lecture via `catches_for_viewer` filtrée `auth.uid()` serveur) ; qa-chrome (capture desk+mobile).

### Tâches
1. Route `app/(app)/carnet/boite/page.tsx` (Server Component) : lister les `gear_items` non archivés du user, et pour chacun le **nombre de prises + répartition par espèce** (agrégé depuis `catches_for_viewer` via `gear_id`). Lien depuis le carnet.
2. Actions de gestion : archiver / éditer un `gear_item` (`app/actions/gear.ts`), RLS owner.
3. Réutiliser la DA v2 (`components/ui-v2/`, chiffres en `font-mono`).

### Critères d'acceptation
- `/carnet/boite` liste mes leurres avec « N prises, dont bar ×K, dorade ×L ».
- Aucune donnée d'autrui visible (lecture serveur scoping `auth.uid()`).
- Vide propre si 0 leurre (CTA « ajoute ton premier leurre en loguant une prise »).

### Garde-fous
- Lecture **toujours** via `catches_for_viewer` (jamais la table `catches` en direct).
- Pas de leaderboard / comparaison entre pêcheurs.

---

## WS E — F2 · Migration `060_spot_verification` (traçabilité + RPC + notif)

Donner un sens traçable à « vérifié » et propager le signal partout.

> **Connecteurs** : supabase-guard (lire la déf. courante des RPC + du CHECK notifications AVANT ; appliquer ; regen types ; `get_advisors`).

### Tâches
1. `supabase/migrations/060_spot_verification.sql` :
   - `alter table public.spots add column verified_at timestamptz, add column verified_by uuid references auth.users(id) on delete set null;`
   - **Backfill** (selon D1, reco) : `update public.spots set verified=true, verified_at=now() where source='curated' and verified is not true;` (les 157 curés ont des coords vérifiées à la main → on assume le claim marketing). ⚠️ si D1 = « badge = nouveau palier distinct », **ne pas** backfill (l'agent s'arrête sur D1).
   - Étendre `nearby_spots` (`043:361-434`) et `get_top_spots_for_species` (`049:23-114`) pour **retourner `verified` et `source`** (aujourd'hui absents). Pattern obligatoire : `drop function` + `create` + `grant` (cf `043:440,510`). Ne pas changer leur gating ni exposer `geom` précis.
   - Notif : étendre le `CHECK notifications_type_check` en reprenant **la liste complète courante** de `055_notif_optimal_window.sql:20-28` + `'spot_verified'` (sinon régression). `target_type='spot'` est déjà autorisé (`043:595-597`).
2. Régénérer `lib/types.ts`.

### Critères d'acceptation
- `nearby_spots` et `get_top_spots_for_species` renvoient `verified`/`source` (requête de contrôle).
- Insert d'une notif `type='spot_verified'` accepté ; un type inconnu toujours rejeté.
- `get_advisors` : pas de nouvelle alerte (RLS/policies inchangées sur `spots`).

### Garde-fous
- `DROP FUNCTION` puis recréation **à l'identique** des retours existants + les 2 nouveaux champs (ne pas casser les colonnes consommées par `lib/map/utils.ts:toSpotMarker` `:122-139`).
- Ne pas modifier le `target_type_check` (déjà OK pour `spot`).

---

## WS F — F2 · Action modération « vérifier » + badge + copy (dépend de E + D1)

> **Connecteurs** : supabase-guard (RLS `spots_update_moderator`) ; qa-chrome (parcours modération + rendu badge carte).

### Tâches
1. `app/actions/spots.ts` — nouvelle action `moderateVerifySpot(spotId)` sur le **modèle exact de `moderateApproveSpot` `:196-230`** : auth `:201`, validation uuid `:202`, `viewerIsModerator()` `:165-175`/`:203`, `update spots set verified=true, verified_at=now(), verified_by=auth.uid() where id=...`, `createNotification({type:'spot_verified', ...})` au proposeur (`lib/notifications/create.ts:55`, ajouter `'spot_verified'` à `NotificationType` `:18-32`), `revalidatePath('/moderation')` + `'/carte'`. Backstop RLS : `spots_update_moderator` (`043:230-233`).
2. `app/(app)/moderation/page.tsx` (onglet spots `:316-344`, garde `is_moderator` `:265-266`) : bouton « Marquer vérifié » sur la ligne spot `:159-247`.
3. Badge carte — **il existe DÉJÀ** : `components/map/MapView.tsx:119-129` rend `.marker-verified-badge` (✓) **conditionné sur `source==='curated'`** (CSS `app/globals.css:237-247`). Selon **D1** : soit le laisser tel quel et enrichir le **tooltip/label fiche spot** (« ✓ Coordonnée vérifiée le JJ/MM »), soit basculer la condition `:123` sur `spot.verified`. Aligner aussi le rendu fiche spot.
4. **Copy anti-Decathlon** (sans tiret cadratin) : sur la fiche spot et la légende carte, expliciter « coordonnée vérifiée à la main, fixe, pas un point communautaire approximatif ». C'est la munition marketing (lane César).

### Critères d'acceptation
- Un modérateur clique « Marquer vérifié » → `verified=true`, `verified_at`/`verified_by` posés, le proposeur reçoit une notif `spot_verified`.
- Un non-modérateur ne peut pas (RLS + garde serveur) : tester l'échec.
- Le badge + le tooltip « Coordonnée vérifiée » s'affichent sur la carte et la fiche, cohérents avec D1.
- 0 fuite `geom` : le badge n'élève pas le tier, coords précises toujours réservées aux abonnés.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT (D1)** si non tranché : sens du badge (cf §Décisions).
- Ne pas régresser le floutage GPS ni le gating freemium (3 spots/dépt).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante.
2. Cocher chaque critère d'acceptation ci-dessus ✅/❌ avec preuve (requête SQL / URL / capture qa-chrome).
3. **Passe sécurité (non négociable)** : `gear_items` RLS owner-only (aucune lecture d'autrui) ; `catches_for_viewer` toujours `security definer` et floutage `geom` intact ; advisors = toujours exactement les 2 `security_definer_view` connues (pas une de plus) ; aucun secret commité ; nouvelles RPC ne fuient pas `geom` précis.
4. **Passe anti-régression** : form de prise (legacy texte + nouveau picker) OK ; scoring perso reste descriptif (0 chiffre prédictif) ; gating freemium carte intact ; `nearby_spots`/`get_top_spots_for_species` ne cassent aucun consommateur ; **0 erreur console** sur form prise, `/carnet/boite`, `/carte`, `/moderation`.
5. **Passe copy** : tutoiement, zod en français, **aucun tiret cadratin en prose visible** (`node scripts/lint-copy-dashes.mjs`), pas de promesse mensongère.
6. **deploy-watch** (Vercel + Sentry) après déploiement.
7. Livrer `docs/sprint-37/RECAP.md` : fait / comment tester / reste manuel John / statut D1.

---

## Décisions pour John
- **D1 (sens du badge « vérifié »)** — le badge carte est aujourd'hui conditionné sur `source==='curated'` (`MapView.tsx:123`), et une décision passée (`043:28-31`) a délibérément basé le badge sur `source`, PAS sur `verified` (les 9 `verified` historiques ne sont pas backfillés). **Reco** : backfill `source='curated' → verified=true` (les 157 curés ont des coords vérifiées à la main), garder le badge tel quel, et **enrichir le label/tooltip en « Coordonnée vérifiée »** + traçabilité `verified_at`/`verified_by` + l'action modération pour les futurs spots communautaires. C'est le chemin le plus court vers le claim anti-Decathlon, sans rien casser visuellement. Alternative (plus lourde) : faire de `verified` un palier distinct du simple « curé ». **À trancher avant WS F.**
- **D2 (périmètre boîte)** — confirmé : `kind ∈ {leurre, montage, appat}` en v1, pas de canne/moulinet/ligne. (Réponse John : leurres d'abord.) Rien à faire, juste validation.

## Reste manuel John (post-sprint)
- Relire le diff, merger `sprint-37` → `main`, déploiement (auto Vercel), QA rapide qa-chrome : loguer une prise avec leurre, vérifier la tendance « leurre » dans le carnet, `/carnet/boite`, marquer un spot vérifié en modération.
- Brancher la com César sur le claim « spots vérifiés » + le visuel « ton meilleur leurre ».

---

> **Invariants (rappel)** : pas de push sans validation de John · RLS jamais désactivé (nouvelle table → RLS d'abord) · migrations = nouveaux fichiers numérotés (`059`, `060`), régénérer `lib/types.ts` après · scoring **descriptif jamais prédictif** · floutage GPS 3 couches intact · le moat (boîte + tendances) reste **gratuit** · copy sans tiret cadratin · ne pas casser la saisie matériel legacy.
