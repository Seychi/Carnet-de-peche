# Sprint 66 — Brief d'exécution
## Classements (dopamine multi-joueur, spot-safe)

> Rédigé le 2026-06-30. Durée cible : **1 grosse passe Fable** (effort `xhigh`), L.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §2.2.6 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase E. Premier sprint **multi-joueur** : c'est là que la comparaison entre pêcheurs arrive (pivot du 2026-06-28).
> Décisions John : **tasteful** ; **anti spot-burning ABSOLU** (aucune coordonnée, même agrégée) ; classement **opt-in** (RGPD).
> **Préalable :** Phase B mergée (60-63 : `user_progress`, XP réelle) **ET réservoir amorcé** (Sprint 68 / seuil de données) — sinon les classements paraîtront vides. **Migration : 101.**

> **⚠️ Gate produit :** ce sprint peut être **codé** dès que la Phase B est finie, mais **ne le mets pas en avant en prod tant que le réservoir est maigre** (un classement à 3 pêcheurs fait triste). Cf `docs/ROADMAP-POST-AUDIT-2026-06-30.md` : lancer **après** le Sprint 68 (amorçage).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-66/BRIEF.md`. Prérequis : Phase B mergée.
> Ancre le pattern `084_spot_confirmations` (SECURITY DEFINER sans geom) + le schéma
> `user_progress`/`catches` via supabase-guard AVANT la migration 101. Bloc 0 (DB) d'abord,
> puis 1/2. Le workstream VERIF fait une **passe adversariale sécurité dédiée** (fuite de
> spot, opt-out). Ne push pas.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant migration 101 | **supabase-guard** → Supabase (RO) | Lire `user_progress`, `catches` (colonnes `measured_length_cm`/`photo_verified_at`/`species`/`department`), `profiles` ; **pattern `084` (RPC SECURITY DEFINER qui ne renvoie JAMAIS `geom`)** ; `list_migrations` (101 libre). |
| Agrégations SQL / k-anon / matview + cron | **docs-researcher** → Context7 (Postgres) | Pattern correct ; cron calqué sur `spot_scores`/`personal-window`. |
| QA + **passe sécurité adversariale** | **qa-chrome** → Claude in Chrome | Vérifier qu'aucune réponse ne contient de coordonnée ; opt-out respecté. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression. |
| Clôture | **`/verif-sprint`** | Complet + passe anti-fuite. |

## Objectif du sprint en une phrase

Des **classements opt-in** (département / espèce / saison / national) et un **duel vs tes follows**, classés sur des métriques **sans aucune fuite de spot**, avec un état vide digne tant que le réservoir se remplit.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Migration 101 (RPC classements) | L | Phase B | ✅ |
| B  | Bloc 1 — UI classements + duel follows | M-L | Bloc 0 | ❌ |
| C  | Bloc 2 — Opt-in RGPD + réglages visibilité | S-M | Bloc 0 | ❌ |
| VERIF | passe sécurité adversariale + revue | M | tous | ❌ |

---

## Bloc 0 — Migration `101_leaderboards.sql`

> **Connecteurs** : **supabase-guard** — **impératif** : lire `084` pour reproduire le pattern « RPC SECURITY DEFINER qui agrège sans jamais exposer `geom` ». Vérifier quelles colonnes de `catches` sont vérifiables (mesuré + photo) pour les records « plus gros ».

### Tâches
1. **`profiles.public_ranking bool not null default false`** (opt-in RGPD). Un utilisateur n'apparaît dans AUCUN classement tant que c'est `false`.
2. **RPC `get_leaderboard(p_scope text, p_dept text, p_species text, p_period text)` `SECURITY DEFINER SET search_path=public`** → renvoie des lignes `{rank, user_id, username, avatar_url, metric_value}` :
   - **métriques spot-safe uniquement** : nombre de prises, **plus grosse prise VÉRIFIÉE** (`measured_length_cm` + `photo_verified_at` non nul), diversité d'espèces, XP de la période.
   - **JAMAIS de `geom`, ville, ou lieu** dans la réponse.
   - filtre `public_ranking = true` ; **k-anon** sur tout ce qui approche la localisation (si un scope devient trop granulaire, ne pas révéler).
   - période : saison courante / all-time selon `p_period`.
3. **Duel vs follows** : variante (ou paramètre) qui restreint le classement aux comptes suivis + soi.
4. **Perf** : si les agrégats sont coûteux, matérialiser (`leaderboard_snapshots` matview) rafraîchie par **cron Vercel** (calque `compute-spot-scores`). Sinon RPC live.
5. RLS/grants : RPC exécutable par `authenticated`, pas `anon` (ou public en lecture si tu veux des classements publics SEO — **⚠️ demander à John**). Regen `lib/types.ts`.

### Critères d'acceptation
- `get_leaderboard('department','29','bar','season')` renvoie un classement **sans aucune coordonnée** (vérif : la réponse ne contient ni `geom`, ni lat/lng, ni ville).
- Un compte `public_ranking=false` **n'apparaît nulle part** ; le passer à `true` l'y fait apparaître.
- « Plus grosse prise » n'utilise que des prises **vérifiées** (mesurées + photo).
- `get_advisors` propre ; RPC `SECURITY DEFINER SET search_path=public`.

### Garde-fous
- 🔒 **ANTI SPOT-BURNING (non négociable)** : zéro `geom`/lieu dans toute réponse de classement. Si un doute, ne pas renvoyer le champ.
- ⚠️ **DEMANDER À JOHN AVANT** : classements **publics** (visibles hors connexion, SEO) vs réservés aux connectés ; et le **choix des métriques** mises en avant.
- Migration = nouveau fichier `101_*.sql`, RLS/grants explicites, ne pas éditer `084`.

---

## Bloc 1 — UI classements + duel vs follows

> **Connecteurs** : **qa-chrome**.

### Tâches
1. `LeaderboardTable` : sélecteurs **portée** (dépt / espèce / saison / national) + **métrique** ; met en évidence **ta ligne** (« ← toi ») ; badge ✓ « vérifié » sur les records mesurés.
2. **Duel vs tes follows** : onglet/toggle qui restreint aux comptes suivis.
3. **État vide digne** (crucial tant que le réservoir est maigre) : « Le classement s'anime dès que plusieurs pêcheurs de ton coin loguent publiquement » (pas un tableau vide triste). Cohérent avec l'honnêteté du produit.
4. Nouvel onglet/section « Classements » dans la nav (gaté proprement).

### Critères d'acceptation
- Les classements s'affichent avec ta position mise en évidence ; le duel follows fonctionne ; l'état vide est soigné.
- Aucune coordonnée visible nulle part.

### Garde-fous
- Ne pas afficher de métrique dérivée d'un lieu. Descriptif, pas humiliant (pas de « bon dernier »).

---

## Bloc 2 — Opt-in RGPD & réglages de visibilité

> **Connecteurs** : **qa-chrome**.

### Tâches
1. Réglage profil : **« Apparaître dans les classements »** (opt-in, `public_ranking`), off par défaut, avec explication claire (« ton pseudo et tes stats, jamais tes spots »).
2. Retour arrière immédiat (repasser en privé te retire des classements).

### Critères d'acceptation
- Toggle opt-in fonctionnel, off par défaut ; le repasser off te retire des classements (vérif live).

### Garde-fous
- RGPD : consentement explicite, réversible ; aucune donnée privée exposée.

---

## Workstream VERIF (obligatoire, agent indépendant) — passe sécurité renforcée

1. `/verif-sprint` + **deploy-watch**.
2. **PASSE ADVERSARIALE ANTI-FUITE (bloquante)** : inspecter **toutes** les réponses de `get_leaderboard` (tous scopes) → confirmer **zéro** `geom`/lat/lng/ville/lieu. Tester un compte `public_ranking=false` → absent partout. Tester k-anon sur un scope granulaire.
3. Chaque critère (Blocs 0-2) coché avec preuve (requêtes SQL, captures).
4. **Passe honnêteté** : « plus gros » = prises vérifiées ; état vide digne ; pas de comparaison humiliante.
5. `docs/sprint-66/RECAP.md` : fait / tester / reste John (classements publics ou non ? métriques ?).

## Reste manuel John (post-sprint)
- **Trancher** : classements publics (SEO) vs connectés ; métriques mises en avant (⚠️ Bloc 0).
- Confirmer **101** + regen types. Merge → déploiement. **Ne pas mettre en avant tant que le réservoir est maigre** (cf Sprint 68).
