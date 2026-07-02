# Sprint 10.6 — RECAP
## Cleanup audit Claude-in-Chrome du 2026-06-11

> Exécuté le 2026-06-12 (brief : `docs/sprint-10.6/BRIEF.md`). 6 commits sur la branche `sprint-11`
> (`8004d7f` → `8531d03`, un par workstream). **Pas pushé — relecture John requise.**
> VERIF : **258 tests Vitest verts** (217 baseline + 41 nouveaux) · `pnpm build` OK · `tsc --noEmit` propre.

---

## Vue d'ensemble

| WS | Verdict | Commit |
|----|---------|--------|
| A — Légal, abonnement, copy | ✅ complet | `8004d7f` |
| B — Modération + anti-spam | ✅ complet (migration 023 à appliquer) | `da3a09c` |
| C — Carnet | ✅ complet (+ 2e cause du bug trouvée) | `36297ee` |
| D — Carte & spots | ✅ complet (+ vrai bug racine trouvé) | `904773a` |
| E — Scoring solunar | ✅ complet | `8be8c58` |
| F — Fil, perf, UX | ✅ complet (1 report) | `8531d03` |

---

## WS A — Légal, abonnement, promesses

**Fait** : confidentialité §3.5 « Données de paiement » au présent (Stripe actif, CB jamais stockée chez nous), tableau sous-traitants et transferts hors UE sans « à venir » pour Stripe, CGU art. 5.3 réécrit au présent (essai 7 j avec CB, prélèvement à l'issue, annulation via le portail), art. 5.5 « en un clic » → « en ligne, sans contact ni justification », `lastUpdated` → 12 juin 2026. Badge `/tarifs`, FAQ, home et page success : plus aucun comptage de clics. Entrée « Mon abonnement » → `/compte/abonnement` dans le dropdown avatar (`UserMenu.tsx`) et le menu mobile marketing (`mobile-nav.tsx`). Home : « 100+ spots curés » et « couverture France entière » → « Bretagne — extension Atlantique en cours » (aucun chiffre > réel). CTA « Gérer mon abonnement » de `/tarifs` vérifié : pointe déjà vers `/compte/abonnement`, rien à changer.

**Critères** : `grep "à venir" app/(marketing)/legal/` → 1 seul reste, **Resend** (emails, pas paiements — volontaire : le branchement Resend est ton travail sprint 11 non déployé ; à retirer à son déploiement). `grep clic` → 0 promesse d'annulation (reste 1 commentaire de code anodin). `grep "100+"` et « France entière » → 0.

**Choix assumé** : pas d'entrée « Mon abonnement » dans `AppSidebar` — c'est la nav primaire 5 items de la DA v2 (miroir de la tab bar), pas une liste compte ; le critère du brief était conditionnel (« si elle liste le compte »).

## WS B — Modération + anti-spam

**Fait** :
- `supabase/migrations/023_moderation.sql` : `profiles.is_moderator` (default false, personne flaggé), helper `is_moderator()` security definer, policies **additives** `feed_posts_delete_moderator`, `feed_comments_delete_moderator`, `reports_update_moderator`. RLS jamais désactivé, `delete_own` et rate-limits 022 intacts.
- `lib/types.ts` : `is_moderator` ajouté à la main (⚠️ régénérer après application de la 023).
- `feed.ts` : `moderatorDeletePost` / `moderatorDeleteComment` — check `is_moderator` côté serveur, suppression, trace d'audit dans `reports` (status `resolved`, `resolved_by`) + résolution des signalements `pending` sur la cible.
- Anti-spam `createPost`/`addComment` : rejet si > 1 URL ou patterns (gift card, coupon/promo code, whatsapp +num, telegram @, codes `XX-XXXX-XXXX` majuscules). Message : « Ton message ressemble à du spam. Si c'est une erreur, reformule sans lien ni code promo. »
- Bouton « Supprimer (modération) » dans `PostCard` (fil + profil public) si le viewer est modérateur.

**Critères** : le texte exact du post arnaque de l'audit est rejeté (test), un post avec 1 lien météo passe, « Pen-Hir / Camaret-sur-Mer » ne déclenchent pas le pattern code promo, suppression modérateur OK/refusée + ligne reports vérifiée — 15 tests verts (`app/actions/__tests__/feed-moderation.test.ts`). Les 35 tests feed existants passent inchangés.

**Comment tester** : après application de la 023 et `update profiles set is_moderator = true where id = '<ton uuid>'`, le menu ⋯ apparaît sur les posts des autres dans le fil et sur leur profil.

## WS C — Carnet

**Le bug Conservé→Relâché avait DEUX causes**, toutes deux corrigées :
1. **Formulaire** : l'effet « auto-relâché si sous-maille » se déclenchait **au montage** en édition — une prise conservée sous la taille légale était re-flaggée « relâchée » dès l'ouverture du form. Il ne se déclenche plus que quand l'utilisateur modifie taille ou espèce.
2. **Serveur** (trouvée par le test) : en Zod v4, `.partial()` sur un champ `.default()` **réinjecte la valeur par défaut** — `updateCatchSchema` renvoyait `released=false`, `caught_at=now`, `privacy='private'`… sur tout update partiel. Schéma reconstruit : `catchFieldsNoDefaults` pour l'update, defaults uniquement côté création.

**Bbox France métro** (lat 41→51,5 ; lng −5,8→9,9, `isInFranceMetro` dans `lib/catches/schema.ts`) : hors zone, la prise **s'enregistre** (pré-arbitrage brief) mais sans appel Open-Meteo, avec `out_of_coverage: true` dans le jsonb `conditions`, exclue du scoring perso (`personal-fetcher.ts` filtre), avertissement amber dans le formulaire. Le cron `compute-spot-scores` ne lit pas les prises (scoring générique) → rien à y faire.

**Pluriels** : « 1 prise au total » au singulier. **« Double comptage »** : verdict **pas de bug** — le seuil du scoring perso est `MIN_CATCHES_FOR_INSIGHTS = 3` ; avec 2 prises, « pas encore assez de données » est le comportement attendu (compteur et scoring lisent la même table `catches`).

**Graphie** : `grep -riE "\blogg" app/ components/` → **0** (6 occurrences corrigées en « loguer/logué »).

**Tests** : `lib/catches/__tests__/schema.test.ts` — update partiel ne touche jamais released/privacy/caught_at ; (48.0, −4.7) accepté ; (27.4, 33.67) accepté + hors bbox ; messages zod en français.

## WS D — Carte & spots

**Vrai bug racine trouvé (au-delà du brief)** : `MapView` ne resynchronisait **jamais** ses markers quand la liste filtrée changeait (effet mount-only) — appliquer le filtre « 29 » ne retirait aucun marqueur de la carte. C'est ça, le « Quiberon sous le filtre Finistère », pas la donnée. Fix : sources créées vides au `load`, peuplement par un effet de resync sur `[spots, loaded]` (pins HTML recréés / `setData` en mode cluster), lookups de clic via ref (liste courante).

- **Recentrage** : `flyTo` du centroïde du département (zoom 8.5) à l'application du filtre (`MapShell.handleApply`).
- **Donnée Quiberon — verdict (vérifié en prod via SQL lecture seule)** : `department = '56'` ✅ correct. MAIS la colonne est **`character(3)`** → Postgres padde tout en `'56 '`/`'29 '`. Idem `profiles.home_department` et les vues. Le code trimme déjà aux endroits critiques (markers carte, profil, + nouveau trim dans la redirection `/fil`). **Reco backlog** : migration vers `varchar(3)` (touche les vues dépendantes → chantier à part, à arbitrer).
- **Mini-carte fiche spot** : le symptôme audit (bloc sombre + attribution visible, tuiles absentes) = le **skeleton navy de MapView qui ne se lève jamais** (`load` jamais parti ; l'attribution z-index 2 passe au-dessus du dégradé). Fix : levée du skeleton aussi sur `'idle'` (plus fiable) + filet de sécurité 10 s, avec `resize()` dans les deux cas. ⚠️ Repro navigateur impossible dans cet environnement (MCP Chrome indisponible) — **à vérifier visuellement en local/prod** : `/spots/anse-de-terenez`, tuiles au premier chargement.
- **Header `/spots`** : « Finistère · 8 spots » sur une ligne (pluriel conditionnel conservé).
- **Direction vent « 0 » — verdict : faux positif de lecture.** Le code affiche la lettre **« O » = Ouest** (rose des vents FR, 273° = Ouest) ; en JetBrains Mono à petite taille, O ≈ 0. Tous les usages de `wind_direction_deg`/`wave_direction` passent par `compass()`/`degreesToCompass()`/`windDirLabel()` (revue exhaustive : `AppInstruments`, `WeatherGrid`, `WavesCard`, `carnet/[id]`). Aucun chemin ne rend le degré brut seul. Rien à changer (option cosmétique si tu veux : « Ouest » en toutes lettres dans `WavesCard`).
- **Régression vérifiée** : gating Discovery intact (pins floutés cliquables T0.3 — la logique fuzzy est conservée à l'identique, juste déplacée dans `addFuzzyLayers`/`buildFuzzyData`).

## WS E — Scoring solunar

Les fichiers `config.ts`/`scoring.ts` avaient déjà été recalibrés (edits de l'agent de la session interrompue, vérifiés ligne à ligne et conservés) ; j'ai mis à jour la suite de tests et ajouté le garde-fou.

| Paramètre | Avant | Après |
|---|---|---|
| Seuil `exceptionnelle` | 90 | **95** |
| Seuil `tres_bonne` | 75 | **80** |
| Poids apex/nadir · moonrise/set · sunrise/set | 1.0 · 0.8 · 0.6 | **0.85 · 0.7 · 0.55** (×1.2 nouvelle/pleine lune, plafonné 1.0) |
| Marée montante seule | 1.0 | **0.8** (1.0 exige PM/BM dans la fenêtre) |
| Marée descendante seule | 0.8 | **0.6** |
| Marée absente | 0.5 (neutre) | **0.35** |
| Vent 25→40 km/h | décroît vers plancher 0.2, puis 0.1 | **décroît vers 0, puis 0** |

« Exceptionnelle » exige désormais la conjonction : événement lunaire majeur EN nouvelle/pleine lune + marée montante avec extremum dans la fenêtre + vent ≤ ~17 km/h.

**Garde-fou anti-régression** : test de distribution sur 7 j × 24 créneaux synthétiques déterministes (vent 0-40, marée montante/descendante/absente ± extremum, tous types d'événements, phases 0→0.95) — exige `exceptionnelle ≤ 10 %` ET `≥ 20 %` sous « bonne », plus un test « exceptionnelle reste atteignable quand tout est réuni ». 46 tests solunar verts. Labels de badges inchangés ; scoring perso (sprint 7) et cron non touchés.

⚠️ Capture du calendrier 7 j sur Anse de Térénez : à faire visuellement (navigateur indisponible ici).

## WS F — Fil, perf, UX

- **`/fil` connecté** : `force-dynamic` ajouté (la page lit `auth.getUser()`, elle était servie statique en prod → stub même connecté). **Bonus critique** : la redirection utilisait `home_department` brut — `char(3)` paddé → `/fil/06%20` → 404. Trim ajouté.
- **Compteur like** : optimiste complet (cœur ET compteur au clic), écho Realtime de sa propre action dédupliqué (compteur d'actions en vol + `user_id` extrait du payload — hook `usePostInteractionsRealtime` étendu). Les likes des autres et de tes autres onglets passent toujours.
- **Perf** : `PostCard` memoïsé (un like ne re-rend plus les autres cartes). Les handlers passés aux enfants sont des primitives/setters stables, pas de `useCallback` supplémentaire nécessaire.
- **Reporté (chantier dédié)** : regroupement des channels Realtime (1 channel/page au lieu d'1/post — ~20/page aujourd'hui, sous les limites Supabase). Refactor > 50 lignes (registry + filtre `in.()` reconstruit au scroll), hors du périmètre « contenu » du brief.
- Bouton « Me déconnecter » : largeur naturelle (`self-start`, plus de `w-full`).
- « Mot de passe oublié ? » : l'email saisi est repris en pré-remplissage du formulaire reset.

## Constats infirmés — verdicts finaux

- **Toggle annuel `/tarifs` déconnecté** : code re-vérifié (`pricing-cards.tsx`), rendu strictement identique connecté/anonyme. **À re-tester en prod en navigation privée** (probable cache/hydration ponctuel) — pas de fix possible sans repro.
- **Direction vent « 0 »** : résolu — lettre O (Ouest), cf. WS D.

## Passe sécurité (VERIF)

- Migration 023 : RLS jamais désactivé, policies modérateur minimales et additives, helper security definer avec `set search_path = public` ✅
- Aucune écriture ne contourne les vues `*_for_viewer` ; lectures carnet inchangées ✅
- Aucun secret commité (vérifié sur les 6 commits) ✅
- `lib/types.ts` édité à la main → **régénérer après la 023** ⚠️

## Incidents de session (transparence)

- `package.json` avait un **BOM UTF-8** (introduit par l'édition externe du scaffolding Playwright) qui cassait `next dev`/`build` — BOM retiré, contenu intact. `package.json`/`pnpm-lock.yaml`/`e2e/`/`playwright.config.ts`/`vitest.config.ts`/etc. (travail Playwright parallèle, pas à moi) laissés **non commités**.
- Le commit WS A embarque la suppression de `supabase/.temp/*` (2 fichiers temp du CLI, déjà stagés par une autre session) — sans conséquence.

## Reste manuel John

1. **Appliquer la migration 023** (Studio ou `supabase db push`) puis : `update profiles set is_moderator = true where id = '<ton uuid>';` et régénérer `lib/types.ts`.
2. Les 3 préalables du brief s'ils ne sont pas faits : suppression du post arnaque (ou via le bouton modération une fois flaggé), arbitrage des 2 comptes seed sans Stripe, désactivation de la toolbar Vercel.
3. **Vérifs visuelles** (navigateur indisponible pendant le sprint) : mini-carte `/spots/anse-de-terenez`, recentrage filtre 29 sur `/carte`, palette variée du calendrier 7 j, like cross-onglets, bouton déconnexion, toggle annuel en nav privée.
4. Re-mesurer l'INP en prod après retrait de la toolbar Vercel.
5. Arbitrer le chantier backlog **`char(3)` → `varchar(3)`** (departments paddés partout — source du trim défensif généralisé).
6. Relecture → merge → déploiement. **Pas de push fait.**
