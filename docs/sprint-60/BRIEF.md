# Sprint 60 — Brief d'exécution
## Fondations XP & Rangs (le squelette dopamine)

> Rédigé le 2026-06-30. Durée cible : **1 grosse passe Fable** (effort `xhigh`), L.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §2.2.1 + §2.4 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase B. Premier sprint du moteur dopamine (pivot ADN du 2026-06-28).
> Décisions John 2026-06-30 : gamification **phasée solo d'abord**, intensité **tasteful**. Anti spot-burning **non négociable** (aucune métrique n'expose de coordonnée). Les records/célébrations viennent au **Sprint 61**, les séries/badges au **62** — ici on pose **uniquement** l'XP et les rangs.

**Préalable avant de démarrer** (manuel John) : le connecteur `supabase` doit être en **mode write** (`.mcp.json`, déjà décidé §20) pour appliquer la migration 098 ; sinon l'agent écrit le fichier et te laisse l'`apply`.

> **🔀 Parallélisation (multi-sessions Claude Code)** : ce sprint peut tourner **en parallèle** des Sprints **59** (hygiène), **64** (carte perf) et **65** (mobile) — fichiers largement disjoints. **Règle d'or** : **une seule session crée une migration à la fois** ; ici seul le Sprint 60 crée une migration (**098**), donc pas de collision de numéro avec 59/64/65 (qui n'en créent aucune). Détail en bas de brief.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-60/BRIEF.md`. Lance les Blocs 0 et 1 en
> parallèle dès maintenant (aucune dépendance), puis le Bloc 2 (UI) une fois 0+1 finis,
> puis le Bloc 3 (placement), et termine par le workstream VERIF. Ancre le schéma et les
> policies via supabase-guard AVANT d'écrire la migration. Ne push pas. Marque
> `⚠️ DEMANDER À JOHN` tout choix ouvert (noms de rangs, barème) au lieu d'inventer.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| **Avant** d'écrire la migration 098 | **supabase-guard** → Supabase (RO) | Lire le schéma live de `catches`/`profiles`, les policies existantes, le **pattern de la migration `084_spot_confirmations.sql`** (RLS + SECURITY DEFINER + grants) ; `list_migrations` (confirmer que 098 est libre) ; `get_advisors`. |
| Trigger PL/pgSQL, SECURITY DEFINER, RLS, `search_path` | **docs-researcher** → Context7 (Postgres/Supabase) | Pattern version-correct, pas de SQL de mémoire. |
| Après migration | **supabase-guard** | Regen `lib/types.ts` ; vérifier RLS + advisors. |
| QA de l'XP affiché + backfill | **qa-chrome** → Claude in Chrome | Confirmer que le compte de John (existant) a un rang cohérent après backfill. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

## Objectif du sprint en une phrase

Avoir une **XP réelle, infalsifiable et rétro-active** (via un ledger + un `user_progress`) qui crédite à chaque prise, et l'afficher en **lecture** (rang + barre XP) sur le profil public et le cockpit `/home`.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — DB & attribution (migration 098) | L | — | ✅ |
| B  | Bloc 1 — Barème & rangs (`levels.ts`) | S-M | — | ✅ |
| C  | Bloc 2 — Composants UI (Level/Rank/XpBar) | M | Bloc 0 + Bloc 1 | ❌ |
| D  | Bloc 3 — Placement (profil public + home) | S | Bloc 2 | ❌ |
| VERIF | revue finale | S | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — DB & attribution d'XP (migration `098_xp_progress.sql`)

Le cœur : un **ledger append-only** (auditable, recalculable) + un **état matérialisé** + un **trigger** qui crédite à l'insertion d'une prise + un **backfill** pour que les comptes existants ne partent pas de zéro. **Calque le pattern de `084_spot_confirmations.sql`** (RLS d'abord, SECURITY DEFINER, grants).

> **Connecteurs** : **supabase-guard** en LECTURE d'abord (schéma `catches`, colonnes `species`/`measured_length_cm`/`released`/`measured`/`photo_verified_at`/`created_at`, policies, dernier n° de migration) ; **docs-researcher** (Context7) pour le trigger PL/pgSQL + SECURITY DEFINER.

### Tâches
1. **Table `xp_events`** (ledger) : `id bigint generated always as identity PK`, `user_id uuid references auth.users(id) on delete cascade`, `kind text not null`, `points int not null`, `ref_type text`, `ref_id uuid`, `created_at timestamptz default now()`, **`unique(user_id, kind, ref_type, ref_id)`** (idempotence anti double-octroi).
2. **Table `user_progress`** (état) : `user_id uuid primary key references auth.users(id) on delete cascade`, `total_xp bigint not null default 0`, `current_week_streak int not null default 0`, `longest_week_streak int not null default 0`, `last_active_week date`, `updated_at timestamptz default now()`. **Pas de colonne `level`** : le niveau/rang se calcule en TS depuis `total_xp` (source unique = Bloc 1). *(Les colonnes `*_streak` sont posées ici mais **remplies au Sprint 62** — laisser à 0/NULL pour l'instant.)*
3. **Fonction `award_xp(...)` `SECURITY DEFINER SET search_path = public`** : insère dans `xp_events` (`on conflict do nothing`) puis recalcule `user_progress.total_xp = sum(points)` pour l'utilisateur. Idempotente.
4. **Trigger `AFTER INSERT ON catches`** qui appelle `award_xp` pour les `kind` **dérivables en SQL** à partir de la nouvelle ligne + l'historique de l'utilisateur :
   - `catch` (+10) toujours ;
   - `new_species` (+50) si c'est la 1re prise de cette espèce pour cet utilisateur ;
   - `personal_best` (+30) si `measured_length_cm` (ou taille) > le meilleur précédent de cette espèce ;
   - `measured` (+15) si `measured = true` ;
   - `released` (+4) si `released = true`.
   - **Rendements décroissants** : au-delà de **3 prises de la même espèce le même jour**, `catch` → 0 (anti-farm).
   - Montants = table §2.2.1 de l'audit (hardcodés + commentés dans la fonction).
5. **Backfill** (dans la migration, idempotent) : rejouer toutes les `catches` existantes via `award_xp` (l'`unique` garantit qu'un re-run ne double pas) → chaque compte existant obtient une XP/un rang rétroactif cohérent.
6. **RLS** : activer sur `xp_events` et `user_progress` ; policy **SELECT own uniquement** (`user_id = (select auth.uid())`) ; **aucune** policy d'écriture client ; `revoke all on … from anon, authenticated` sauf le `select` gaté ; `grant execute on function award_xp … to service_role` (pas à `anon`). Le client **lit** `user_progress`/`xp_events`, il n'écrit **jamais** l'XP.
7. **Regen `lib/types.ts`** (supabase-guard) après application.

### Critères d'acceptation
- Loguer une prise (nouvelle espèce, mesurée) crédite **+10 +50 +15** = 75 XP (vérif : `select * from xp_events where user_id = …` + `user_progress.total_xp`).
- Re-loguer 4 prises de la même espèce le même jour : la 4e ne crédite **pas** le +10 `catch` (diminishing returns).
- Après backfill, le compte de John (prises existantes) a un `total_xp > 0` cohérent (vérif SQL + `qa-chrome`).
- **Sécurité** : un client authentifié ne peut ni `insert` ni `update` `xp_events`/`user_progress` (tester une écriture directe → refusée par RLS). `anon` ne lit rien. `get_advisors` sans nouveau warning.
- La migration est **idempotente** au backfill (la relancer ne double pas l'XP).

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** : le **barème d'XP** (montants §2.2.1) — proposé, il peut l'ajuster. Ne pas inventer d'autres `kind`.
- ⚠️ Si la détection **sous-taille** (`release_undersize`, +8) nécessite le moteur maille **côté app** (pas dispo en SQL) : **ne pas** la mettre dans le trigger ; la **déférer** (appel `award_xp` côté Server Action au Sprint 61/62) et le **noter**. Vérifier via supabase-guard s'il existe déjà une fonction SQL de maille.
- Migration = **nouveau fichier `098_*.sql`**, jamais éditer un ancien. RLS **avant** les policies. Ne pas toucher aux tables existantes autrement que le trigger sur `catches`.
- Suppression d'une prise : en v1 on **ne révoque pas** l'XP (le ledger reste ; l'`unique` + diminishing returns évitent le farm). Le documenter, ne pas sur-ingénierer.

---

## Bloc 1 — Barème & rangs (`lib/gamification/levels.ts`)

Source **unique** des paliers/rangs, consommée par l'UI (Bloc 2). Pur TS, aucune dépendance → **jour 1 en parallèle du Bloc 0**.

> **Connecteurs** : aucun connecteur requis (logique pure) ; s'aligner sur les valeurs §2.2.1 de l'audit.

### Tâches
1. Créer `lib/gamification/levels.ts` : table des **rangs** (seuils XP cumulés + noms, §2.2.1) ; `levelFromXp(totalXp): { level, rankName, currentThreshold, nextThreshold, xpIntoLevel, xpForNextLevel }` ; formule de courbe `≈ round(100 · n^1.7)` (ou table explicite figée — préférer une **table explicite** pour la lisibilité produit).
2. Tests unitaires (`levels.test.ts`) : bornes (0 XP → Mousse ; juste sous/au seuil ; dernier rang = pas de « next »).

### Critères d'acceptation
- `levelFromXp(0)` → Mousse ; `levelFromXp(1500)` → Fine gaule ; au dernier palier, `nextThreshold = null` géré proprement.
- Tests verts.

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** : les **noms de rangs** (Mousse, Pêcheur du dimanche, Habitué du bord, Pilier de digue, Fine gaule, Connaisseur, Spécialiste, Maître du bord, Légende locale) sont une **proposition** — il valide/renomme. C'est du branding, ne pas figer sans son OK.
- Ne pas dupliquer les seuils ailleurs (source unique ici).

---

## Bloc 2 — Composants UI (`components/gamification/`)

Composants d'affichage **lecture seule** de la progression. Dépend de `levels.ts` (Bloc 1) et de `user_progress` (Bloc 0).

> **Connecteurs** : **docs-researcher** si besoin (aucune lib exotique attendue) ; réutiliser les tokens DA v2 (`components/ui-v2/`).

### Tâches
1. `LevelBadge` / `RankChip` : icône + nom de rang (JetBrains Mono pour le niveau, cf règle DA « tout chiffre métier en mono »).
2. `XpBar` : barre de progression `xpIntoLevel / xpForNextLevel` + libellé (« 1 840 / 3 000 XP »), petite animation d'entrée (respecter la sobriété, pas de confetti ici — la fête arrive au Sprint 61).
3. Lecture des données : Server Component qui lit `user_progress` (via la vue/select gaté) et passe à `levelFromXp`.

### Critères d'acceptation
- `RankChip` + `XpBar` rendent correctement pour un `total_xp` donné (Storybook/route de dev `/dev/ui-v2` si elle existe, sinon capture `qa-chrome`).
- Aucun chiffre métier en police non-mono (respect DA).

### Garde-fous
- Lecture seule : ces composants **n'écrivent jamais** l'XP.
- Ne pas dupliquer la logique de seuils (importer `levels.ts`).

---

## Bloc 3 — Placement (profil public + cockpit home)

Poser l'identité de progression là où elle compte. **Minimal** ici (l'en-tête compétitif complet + le DopamineCockpit refondu arrivent au Sprint 63) : juste le rang + la barre XP.

> **Connecteurs** : **qa-chrome** pour vérifier profil `/u/[username]` et `/home` (desktop + fenêtre étroite).

### Tâches
1. **Profil public `/u/[username]`** : ajouter `RankChip` + `XpBar` dans l'en-tête (sous le pseudo), en lecture. **Attention conflit** : si le Sprint 59 touche aussi une partie de home, ce bloc ne touche **que** le profil public + un encart léger sur home (voir §Parallélisation).
2. **Cockpit `/home`** : ajouter un petit bloc « Ta progression » (rang + XP) **sans** refondre le hub existant (refonte = Sprint 63).

### Critères d'acceptation
- `/u/<pseudo>` montre le rang + la barre XP (vérif `qa-chrome`).
- `/home` montre le rang + XP sans casser la mise en page existante.
- **Régression interdite** : galerie de prises publiques, follows, gating — inchangés.

### Garde-fous
- Ne pas toucher au `GamificationHub` existant (Pokédex/badges/séries) — c'est le Sprint 62/63.
- Ne pas exposer d'XP d'autrui au-delà de ce qui est déjà public (le rang sur un profil public est OK ; pas de fuite de données privées).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** (`pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue croisée indépendante + passe anti-régression). Puis **deploy-watch** (Vercel + Sentry) après déploiement.
2. Relire **chaque critère d'acceptation** des Blocs 0-3 et cocher ✅/❌ **avec preuve** (requête SQL, capture `qa-chrome`).
3. **Passe sécurité (critique ici)** : `xp_events`/`user_progress` → **RLS activée avant policies** ; **aucune** écriture client possible (tester un `insert`/`update` direct → refusé) ; `award_xp` en `SECURITY DEFINER SET search_path = public`, non exécutable par `anon` ; `anon` ne lit rien ; `get_advisors` propre.
4. **Passe honnêteté data** : l'XP est **entièrement recalculable** depuis `xp_events` (relancer le backfill ne double rien) ; aucun chiffre inventé ; le déclaratif (`released`) reste pondéré bas.
5. **Passe anti-régression** : log de prise, conditions auto-captées, gating, floutage GPS — inchangés.
6. Livrer **`docs/sprint-60/RECAP.md`** : fait / comment tester (requêtes SQL de vérif) / reste manuel John (barème + noms de rangs validés ? migration appliquée ? types régénérés ?) / décisions notées (release_undersize déféré ? suppression de prise sans révocation d'XP).

## Reste manuel John (post-sprint)

- **Valider** le **barème d'XP** (montants) et les **noms de rangs** (⚠️ marqués dans les Blocs 0 et 1).
- Confirmer l'**application de la migration 098** (si le connecteur n'était pas en write) + **regen `lib/types.ts`**.
- Relire → merge sur `main` → déploiement → QA (rang cohérent sur ton compte après backfill).

---

## 🔀 Parallélisation multi-sessions (réponse à « quoi lancer en parallèle »)

**Peuvent tourner en même temps que ce Sprint 60, dans des sessions Claude Code séparées :**

| Sprint | Zone de fichiers | Conflit avec 60 ? | Migration ? |
|---|---|---|---|
| **59 — Hygiène** | `CatchForm.tsx`, `badges.ts`, share, `Hero/HomeSections/format.ts`, en-tête `/carnet/nouvelle`, section « PRÈS DE TOI » de home | **Quasi nul** — seul point de contact léger : **`/home`** (59 touche « PRÈS DE TOI », 60 ajoute un encart « Ta progression »). Ce sont **deux sections/composants différents** ; risque de conflit faible. | **0** |
| **64 — Carte perf** | `MapFilters.tsx`, `MapView.tsx`, carte | **Nul** (disjoint) | **0** |
| **65 — Mobile & honnêteté** | bandeau instruments, onglets Fil, fontes `SpotPopup`/`MapLayerSelector`, copie GPS, `/tarifs` | **Nul** vis-à-vis de 60 (disjoint) | **0** |

**La règle d'or (à respecter absolument en multi-sessions) :**
1. **Une seule session crée une migration à la fois.** Ici, **seul le Sprint 60 crée la migration 098** ; 59/64/65 n'en créent aucune → **pas de collision de numéro**. Si plus tard tu parallélises un sprint qui crée une migration (ex. 62 = `099`), assigne son numéro **à l'avance** dans son brief pour éviter que deux sessions se battent pour `099`.
2. **Une branche git par session** (`sprint-60`, `sprint-59`, `sprint-64`, `sprint-65`), **merge une à la fois**, et **regen `lib/types.ts` après le merge de 60** (les autres n'y touchent pas).
3. **Petit contact `/home`** entre 59 et 60 : demande à la session 60 de mettre l'encart « Ta progression » dans un **composant dédié** (`components/gamification/HomeProgressCard.tsx`) plutôt que d'éditer en profondeur le conteneur home → zéro conflit avec la retouche « PRÈS DE TOI » du 59.

**Ne PEUVENT PAS tourner en parallèle de 60 (ils en dépendent)** : **61** (records/célébrations — a besoin de l'award XP), **62** (séries/badges — a besoin de `user_progress`), **63** (défis/cockpit — a besoin de 60/61/62). Et **66/67/68** (multi + amorçage) viennent après la Phase B.

**Combo recommandé pour lancer 3-4 sessions maintenant :** `60` (dopamine) + `59` (hygiène) + `64` (carte) + `65` (mobile). C'est le maximum de parallélisme sans dépendance ni collision de migration.
