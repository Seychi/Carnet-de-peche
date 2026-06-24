# Sprint 25 — Brief d'exécution
## Lancement & Amorçage — remplir le réservoir + co-pêchage (Chantier D + G2)

> Rédigé le 2026-06-23. Durée cible : ~6-7 jours. Phase **P4 — Lancement & Amorçage**, après P3 (conformité).
> Contexte : `docs/audits/AUDIT-2026-06-23.md` + `docs/ROADMAP-2026-H2.md`. Le moat (scoring perso, carte vivante, heatmap, qualité par espèce) est construit (P2/P3) mais **VIDE** : prod réelle = **16 prises (5 publiques), 12 profils onboardés, 1 post, 4 follows**. Ce sprint **amorce la donnée**, soigne le **time-to-value à froid**, permet de **loguer une sortie bredouille**, et ajoute le **co-pêchage**.
> Décisions John 2026-06-23 : roadmap P4 validée. **Quatre décisions à trancher (cf §Décisions) avant le code.**

**Préalable avant de démarrer (manuel John)** : sprints 21-24 mergés. Trancher D-D1→D-D4.

> ⚠️ **Corrections de cadrage (vérifiées code + prod).**
> 1. **Le réservoir est encore plus vide que la doc** : 1 seul post, 4 follows → le fil ET le moat sont vides. **L'amorçage doit précéder le réseau** : ne pas compter sur le co-pêchage pour s'auto-amorcer.
> 2. **Hygiène pré-lancement et hook RecFishing : DÉJÀ FAITS** (sprints 21 et 24). Ne PAS les refaire ici. Ce sprint = amorçage data + bredouille + time-to-value + co-pêchage.
> 3. **Aucun système d'invitation/beta n'existe** (grep exhaustif = 0). Une beta « fondateurs » est **à construire** de zéro (D-D2).
> 4. **Aucun concept de sortie** : 1 ligne = 1 prise ; `released` = relâchée/prélevée, **PAS** bredouille. Loguer « sorti, 0 prise » est **impossible** aujourd'hui → nouvelle table `outings` (WS-B).
> 5. **Migrations sur disque jusqu'à 049** (pas 047 comme dit CLAUDE.md §2) → prochaine = **050**. À confirmer supabase-guard.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-25/BRIEF.md`. **Ne démarre pas** tant que D-D1→D-D4 ne sont pas tranchées. Ensuite : lance **WS-A (amorçage), WS-B (bredouille) et WS-C (time-to-value) en parallèle** ; **WS-D (co-pêchage) en parallèle aussi mais sous garde GPS stricte** (cf garde-fous). Termine **obligatoirement** par le **workstream VERIF**. **Ne push pas, ne déploie pas, n'applique aucune migration ni seed en prod.** Invariants : **floutage GPS sur 3 couches jamais contourné** (le co-pêchage ne crée pas de 4e fuite), **anti-fake** (aucune fausse donnée non étiquetée), social **100 % gratuit** (migration 022), RLS d'abord (fail-closed) sur toute nouvelle table, migration = fichier numéroté (050+) + regen `lib/types.ts`, tutoiement, zod FR.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant toute migration (outings, co-pêchage) | **supabase-guard** → Supabase (RO) | Confirmer prochain n° (050), RLS des tables sociales (`022`/`037`), pattern vue `*_for_viewer` security_invoker, helper `can_post_in_department`, CHECK `notifications.type`. **Lecture seule.** |
| Avant lib externe (Realtime, date/TZ) | **docs-researcher** → Context7 | API version-correcte. |
| **QA adversariale floutage co-pêchage** | **qa-chrome** + supabase-guard | Vérifier qu'`anon`/`authenticated` ne lisent jamais de coords précises d'une sortie. |
| Time-to-value : parcours compte neuf | **qa-chrome** → Claude in Chrome | Vérifier qu'un compte 0-donnée a de la valeur + des CTA partout (pas d'écran blanc). |
| Clôture | **`/verif-sprint`** | tests + build + types + lint + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

Un pêcheur neuf obtient de la **valeur en < 2 min** (import de ses prises passées → tendances débloquées, états vides qui vendent le futur), peut **loguer une sortie bredouille**, et peut **proposer/rejoindre une sortie à plusieurs** — sans qu'aucun spot précis ne fuite et sans aucune fausse donnée.

---

## Diagnostic (établi par lecture code + prod — point de départ)

1. **Pas de table sortie.** `catches` = 1 ligne/prise, `species` obligatoire (zod), `released` default `false` ≠ bredouille. Stats (`get_my_catch_stats` 007, breakdown 008) comptent les prises. → Pour « % de sorties fructueuses » il faut une table `outings` + une RPC dédiée ; **ne pas** créer de « prise vide » (polluerait heatmap/feed/scoring/`catches_for_viewer`).
2. **Time-to-value : la plupart des états vides vendent déjà le futur** (carnet, heatmap, qualité, perso du sprint 22 avec barre de progression « encore N prises »). **Trou majeur** : `components/spots/SpotActivitySection.tsx` fait `return null` quand vide → un nouvel utilisateur voit **le silence** sur la fiche spot. Aussi : onboarding sans écran « payoff », `/carnet/nouvelle` sans hint 1ʳᵉ fois, fil dépt vide sans CTA. **Levier #1** : `bulkCreateCatches` (import de prises passées) débloque les tendances dès **3 prises** (`MIN_FOR_TENDENCIES=3`).
3. **Seed = dev/preview only** (`/dev/seed-feed`, `/dev/seed-heatmap`, double-gardés `NODE_ENV`). **Aucun mécanisme de démo honnête étiqueté.** Culture anti-fake forte (7.5/9.5). → un seed démo en prod exige `profiles.is_demo` + badge + exclusion des compteurs/k-anon, OU (recommandé) une **vraie beta fondateurs**.
4. **Zéro invitation/referral/beta** (grep = 0). À construire si D-D2 = beta.
5. **Infra sociale très réutilisable** pour le co-pêchage : `feed_*`, `follows`, `notifications` (037), `reports` (avec déjà `reason='spot_burning'`), actions, Realtime, composants. **`createNotification`** insère en service_role (policy client = `WITH CHECK(false)`) ; le CHECK `notifications.type` (037) liste `new_follower/post_liked/post_commented/catch_commented/mention` → **ajouter un type co-pêchage = ALTER CHECK** (migration).
6. **Floutage GPS = 3 couches** (grants colonne `geom` revoke `028`/`041` ; vues `*_for_viewer` ; RPC definer renvoyant `ST_Centroid(geom_public)` ~500-900 m). **Une table `outing_proposals` avec `geom` précis = 4e surface NON couverte.** Risque #1 du sprint.

---

## Décisions à trancher AVANT le code (⚠️ DEMANDER À JOHN)

- **D-D1 — Stratégie d'amorçage.** (a) **beta « fondateurs » réelle** (recommandé : vrais pêcheurs invités à loguer publiquement) ; et/ou (b) **seed de démo étiqueté** (`is_demo` + badge + exclusion compteurs/k-anon — anti-fake) ; et/ou (c) **assouplir temporairement le seuil k-anon** d'aperçu de la heatmap. Lesquels ? *Reco : (a) + bulk import agressif ; (b) seulement si étiqueté ; éviter (c) (affaiblit la confidentialité).*
- **D-D2 — Construire un système de beta/invitation ?** (codes d'invitation, waitlist, gating d'inscription). Périmètre v1 ? *Reco : codes d'invitation simples si beta fondateurs.*
- **D-D3 — Précision de localisation du co-pêchage.** **Par défaut sûr : `department` + libellé libre (« plage de X »), AUCUNE coordonnée exacte.** Autoriser le rattachement à un spot curé (centroïde flouté seulement) ? *Reco : v1 = dépt + label, pas de geom.*
- **D-D4 — Gating co-pêchage.** Le social est 100 % gratuit (022) → *reco : gratuit*, avec `can_post_in_department` + rate-limit anti-spam. Confirmer.

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| **A** | Amorçage data (beta/seed étiqueté + bulk import activé) | 1,5-2 j | D-D1/D-D2 | ✅ |
| **B** | Log de la bredouille (table `outings`) | 1,5 j | — | ✅ |
| **C** | Time-to-value à froid (états vides qui convertissent) | 1 j | — | ✅ |
| **D** | Co-pêchage (G2) — sous garde GPS stricte | 2,5-3 j | D-D3/D-D4 | ✅ |
| **VERIF** | Revue finale indépendante | 0,5 j | tous | ❌ (dernier) |

---

## Bloc A — Amorçage data (le vrai déblocage)

Sans données, tout le moat reste une coquille vide. On amorce honnêtement.

> **Connecteurs** : **supabase-guard** (RO) pour `bulkCreateCatches`, les compteurs k-anon (`get_catch_heatmap` 040, `get_quality_cells` 044) ; **qa-chrome** pour le parcours import.

### Tâches
1. Selon **D-D1** : (a) **beta fondateurs** — voir WS lié D-D2 (codes/inscription) + onboarding qui invite à loguer publiquement ; et/ou (b) **seed démo étiqueté** : ajouter `profiles.is_demo boolean default false` (migration 050+), badge UI « démo », et **exclure les comptes démo** des compteurs publics (« X pêcheurs ») + du scoring communautaire + du **k-anon** (`get_catch_heatmap`/`get_quality_cells`).
2. **Activer le bulk import** comme levier de time-to-value : exposer `bulkCreateCatches` dans l'onboarding + `/home` neuf (« importe tes dernières sorties → débloque tes tendances »). 3 prises suffisent (`MIN_FOR_TENDENCIES=3`).

### Critères d'acceptation
- Un compte neuf atteint **3 prises via l'import en < 2 min** et voit ses tendances perso s'activer (réutilise le composant du sprint 22).
- Si seed démo prod : **100 %** des comptes démo portent `is_demo=true`, affichent un badge, et sont **exclus** des compteurs publics + des RPC k-anon (test SQL : un compte démo ne fait pas franchir K=3 à une cellule).

### Garde-fous
- ⚠️ **Anti-fake** : aucune fausse donnée non étiquetée en prod (CLAUDE.md §15). Le seed démo, s'il existe, est **visiblement** démo et exclu des agrégats.
- Le bulk import respecte le floutage/privacy comme une prise normale.

---

## Bloc B — Log de la bredouille (table `outings`)

Permettre « je suis sorti, 0 prise ». Fondation données du futur scoring prédictif (le dénominateur manquant du déferral 7.5).

> **Connecteurs** : **supabase-guard** (RO) — modèle `catches`, stats RPC 007/008, vue `catches_for_viewer`.

### Tâches
1. Migration `050_outings.sql` : `outings(id, user_id, started_at, ended_at?, department char(3), spot_id?, technique?, species_targeted text[]?, notes, created_at)` **+ RLS fail-closed** (un user ne lit/écrit que ses sorties) + `catches.outing_id` (FK nullable, **append-only**, pour relier prises↔sortie). **Pas de `geom` précis exposé.**
2. Schéma zod + action `createOuting` + UI « Sortie sans prise » (depuis `/carnet/nouvelle` ou un bouton dédié).
3. RPC `get_my_outing_stats` (sorties totales, % bredouille, prises/sortie) — **nouvelle**, ne PAS modifier 007/008. Affichage dans les stats du carnet.
4. Regen `lib/types.ts`.

### Critères d'acceptation
- On peut loguer une sortie 0 prise ; elle **n'apparaît PAS** dans `catches`, la heatmap, le fil, ni le scoring descriptif (test : une sortie bredouille ne change pas `get_catch_heatmap`).
- `% bredouille` calculé et affiché ; RLS testée (lecture/écriture limitées au propriétaire) ; Vitest vert.

### Garde-fous
- ⚠️ Ne pas réintroduire de scoring « prédictif » dans ce sprint : on **crée** le dénominateur, on l'exploite plus tard (Chantier F). Les tendances perso restent descriptives.
- RLS d'abord (table créée RLS activée + policies, jamais l'inverse).

---

## Bloc C — Time-to-value à froid (états vides qui convertissent)

Un compte 0-donnée doit voir de la valeur et un chemin, jamais un écran blanc.

> **Connecteurs** : **qa-chrome** (parcours compte neuf desk+mobile).

### Tâches
1. **Fiche spot** : remplacer le `return null` de `components/spots/SpotActivitySection.tsx` (vide) par un état « Sois le premier à loguer une prise ici » + CTA.
2. **Onboarding** : ajouter un écran « payoff » (« voilà ce que ton carnet va te dire ») + le CTA import (lien WS-A).
3. **Fil dépt vide** (`components/feed/EmptyFeed.tsx` variant `dept`) : ajouter un CTA (poster / inviter).
4. **`/carnet/nouvelle`** : hint première fois.

### Critères d'acceptation
- **Aucune** surface zéro-donnée ne renvoie un blanc sans CTA (fiche spot, fil, carnet, home) — vérifié qa-chrome desk+mobile.
- L'onboarding mène explicitement à la première valeur (import ou première prise).

### Garde-fous
- Pas de promesse mensongère dans les états vides (« 3 prises ici ce mois » seulement si vrai).

---

## Bloc D — Co-pêchage (G2) — sous garde GPS stricte

Matcher des membres pour pêcher ensemble. **Le risque GPS est le cœur du bloc.**

> **Connecteurs** : **supabase-guard** (RLS sociales, vue `*_for_viewer`, CHECK notif) ; **qa-chrome + supabase-guard** pour la **passe adversariale floutage**.

### Tâches
1. Migration `05N_outings_cofishing.sql` : `outing_proposals(id, host_id, department char(3) not null, area_label text, planned_at, capacity?, status check in ('open','full','cancelled','done') default 'open', notes, created_at)` + `outing_participants(proposal_id, user_id, status check in ('requested','accepted','declined'), pk(proposal_id,user_id))`. **RLS fail-closed** (SELECT authentifié ; INSERT `host_id=auth.uid()` + `can_post_in_department`; UPDATE/DELETE host only ; participants : `user_id=auth.uid()`). **Vue `outing_proposals_for_viewer` (security_invoker)** qui n'expose **jamais** de coords précises. **ALTER** du CHECK `notifications.type` (+`outing_proposed`/`outing_join`).
2. Actions serveur : `proposeOuting` / `requestJoin` / `acceptParticipant` / `cancelOuting` (gardées, rate-limit calqué sur les triggers `feed_*` de 022). Notif via `createNotification` (service_role).
3. UI : composer de sortie (dépt + libellé libre + créneau + capacité), liste des sorties du dépt, RSVP, statut. Realtime (réutiliser les hooks feed/notifications).
4. Signalement : étendre `reports.target_type` à `outing` (réutilise `spot_burning`/abus).

### Critères d'acceptation
- **Test adversarial floutage (bloquant)** : `anon` ET `authenticated` ne peuvent **jamais** lire de coordonnées précises d'une sortie (requête PostgREST directe avec clé publishable échoue ; aucune colonne `geom` exposée). 
- RLS : UPDATE/DELETE réservés au host ; un non-host ne modifie pas une sortie.
- Rate-limit sur la création de propositions (anti-spam).
- Co-pêchage **gratuit** tous tiers (sauf D-D4 contraire) ; signalement `outing` fonctionnel.

### Garde-fous
- 🔴 ⚠️ **GPS = CRITIQUE.** Par défaut (**D-D3**) : `department` + `area_label` libre, **AUCUNE coordonnée exacte** stockée/exposée. Si rattachement à un spot curé autorisé : exposer **uniquement** le centroïde flouté via la vue, jamais `geom`. Une nouvelle table ne doit pas devenir la 4e fuite.
- RLS d'abord, vue `security_invoker` (leçon migration 031). Notif via service_role uniquement.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` : `pnpm test` + `typecheck` + `lint` + `build`, puis revue croisée du `git diff main...HEAD` contre les AC.
2. **Passe anti-régression** : (a) **floutage GPS 3 couches intact** sur spots/catches **ET** la nouvelle table co-pêchage (aucune coord précise exposée — test adversarial) ; (b) **anti-fake** (aucune donnée démo non étiquetée ; comptes démo exclus des agrégats/k-anon) ; (c) social = gratuit (022) ; (d) RLS fail-closed sur `outings`/`outing_proposals`/`outing_participants` ; (e) une sortie bredouille ne pollue ni heatmap ni scoring ; (f) rate-limit co-pêchage.
3. Vérifier qu'aucune migration ni seed n'a été appliqué en prod par les agents.
4. Livrer `docs/sprint-25/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

1. Appliquer les migrations (050 outings, 05N co-pêchage, `is_demo` si D-D1b) en prod + regen `lib/types.ts` + `get_advisors`.
2. **Lancer la beta fondateurs** (D-D1/D-D2) : inviter de vrais pêcheurs, viser un objectif chiffré de prises publiques pour allumer heatmap/qualité (k-anon K=3 ⇒ ≥3 prises + 3 pêcheurs par cellule).
3. Si seed démo : exécuter le seed étiqueté en prod (ou le garder hors prod), décider de la durée.
4. Relire → merge `main` + déploiement. deploy-watch + qa-chrome (time-to-value compte neuf, co-pêchage, floutage).
5. (Doc) Corriger CLAUDE.md §2 : migrations → 049, prod = 1 post/4 follows, `released` default `false`.

---

## Décisions récapitulées
- **D-D1** stratégie amorçage (beta / seed étiqueté / k-anon) · **D-D2** système d'invitation/beta · **D-D3** précision localisation co-pêchage (défaut : dépt + label, pas de geom) · **D-D4** gating co-pêchage (défaut : gratuit).

## Séquencement de lancement (rappel)
Le co-pêchage et la carte vivante sont **vides sans utilisateurs** → l'amorçage (WS-A) + la beta doivent **précéder** la communication. Ne pas lancer le co-pêchage en grand avant d'avoir un noyau de fondateurs actifs.

*Brief produit le 2026-06-23 (mode ultracode/xhigh, suit `docs/BRIEF-TEMPLATE.md`). Cartographie source : exploration code amorçage/social 2026-06-23.*
