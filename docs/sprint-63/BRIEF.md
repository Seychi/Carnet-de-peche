# Sprint 63 — Brief d'exécution
## Défis, cockpit & notifs dopamine (capstone Phase B)

> Rédigé le 2026-06-30. Durée cible : **1 grosse passe Fable** (effort `xhigh`), L.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §2.2.5, §2.2.7, §2.3 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase B. **Dernier sprint de la dopamine solo** : il consolide XP (60), records (61), séries/badges (62) en un **cockpit** cohérent, ajoute les **défis** et les **notifs proactives**.
> Décisions John : dopamine **solo**, **tasteful**. **Préalable : Sprints 60, 61 ET 62 mergés.** **Migration : 100.**

> **🔀 Parallélisation** : **NON parallélisable** avec 61/62 — il dépend d'eux (il assemble leurs pièces). À lancer **après** le merge de 62. Seul le Sprint **64/65** (s'ils ne sont pas déjà faits) pourrait encore tourner à côté.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-63/BRIEF.md`. Prérequis : Sprints 60, 61, 62
> mergés. Ancre le schéma (challenges, notifications) via supabase-guard AVANT la migration 100.
> Lance le Bloc 0 (DB) d'abord, puis Blocs 1/2/3 en parallèle, et termine par VERIF. Ne push
> pas. `⚠️ DEMANDER À JOHN` pour la liste des défis + la fréquence des notifs.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant migration 100 | **supabase-guard** → Supabase (RO) | Lire `notifications` (types existants, sprints 26/49/85), `user_progress`, `catches` ; pattern `084`. `list_migrations` (100 libre). |
| Anneaux de progression / anim cockpit | **docs-researcher** → Context7 | Pattern SVG/CSS correct, sobriété DA. |
| QA cockpit + défis + notifs | **qa-chrome** → Claude in Chrome | Profil + `/home` + déclenchement des notifs. |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression. |
| Clôture | **`/verif-sprint`** | Complet. |

## Objectif du sprint en une phrase

Un **cockpit de progression** unifié (rang + série + badges + défis) sur `/home` et le profil, des **défis** hebdo/saisonniers, et des **notifications dopamine proactives** (level up, badge, record, série, défi) — le tout opt-out et tasteful.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Migration 100 (défis) | M-L | Sprints 60/61/62 | ✅ |
| B  | Bloc 1 — ChallengesBoard + événements | M | Bloc 0 | ❌ |
| C  | Bloc 2 — ProfileCompetitiveHeader + DopamineCockpit | L | 60/61/62 mergés | ✅ |
| D  | Bloc 3 — Notifications dopamine | M | Bloc 0 (défis) | ❌ |
| VERIF | revue finale | S | tous | ❌ |

---

## Bloc 0 — Migration `100_challenges.sql`

> **Connecteurs** : **supabase-guard** — lire la table `notifications` et ses types existants avant d'en ajouter ; pattern RLS `084`.

### Tâches
1. `challenges` : `id`, `slug UNIQUE`, `title`, `description`, `scope text`, `period_start date`, `period_end date`, `criteria jsonb`, `reward_xp int`, `active bool`.
2. `user_challenge_progress` : `user_id`, `challenge_id`, `progress int`, `target int`, `completed_at timestamptz`, `UNIQUE(user_id, challenge_id)`. RLS own-only.
3. RPC de progression `SECURITY DEFINER SET search_path=public` : recalcule la progression d'un défi pour un utilisateur (à partir de `catches`/`outings`), crédite `reward_xp` via `award_xp` à la complétion (idempotent). Câbler au trigger de log ou à l'action serveur.
4. **Seed** des défis solo (§2.2.5) : « Logue 3 espèces ce mois », « Mesure une prise », « Pêche au lever du soleil », « Logue une sortie (même bredouille) » + intégrer les **défis conservation existants** (`release_undersize`, `respect_closures`, `declare_sensitive`). + un **événement saisonnier** cadré solo (ex. « Saison du bar »). Regen `lib/types.ts`.

### Critères d'acceptation
- Progresser sur un défi met à jour `user_challenge_progress` ; le compléter crédite l'XP une seule fois (idempotent, vérif SQL).
- RLS own-only ; RPC `SECURITY DEFINER` + `search_path` ; `get_advisors` propre.

### Garde-fous
- Migration = **nouveau fichier `100_*.sql`**. RLS avant policies.
- ⚠️ **DEMANDER À JOHN AVANT** : la liste finale des défis + les récompenses XP.

---

## Bloc 1 — ChallengesBoard + événements saisonniers

> **Connecteurs** : **qa-chrome**.

### Tâches
1. `ChallengeCard` (anneau de progression) + `ChallengesBoard` (défis actifs de l'utilisateur).
2. Affichage de l'**événement saisonnier** en cours (cadrage solo : « attrape ton plus gros bar de la saison »).
3. Câbler la **célébration** (`CelebrationOverlay`, Sprint 61) à la complétion d'un défi.

### Critères d'acceptation
- Les défis actifs s'affichent avec progression ; compléter un défi déclenche la fête + l'XP.

### Garde-fous
- Descriptif/positif ; pas de comparaison inter-pêcheurs (Phase E).

---

## Bloc 2 — ProfileCompetitiveHeader + DopamineCockpit

Consolider les pièces des Sprints 60/61/62 en surfaces cohérentes (c'est ici que le hub `/home` est **refondu**).

> **Connecteurs** : **qa-chrome** (profil `/u/[username]` + `/home`, desktop + fenêtre étroite) ; **docs-researcher** si anim.

### Tâches
1. **`ProfileCompetitiveHeader`** (profil public) : version complète de l'en-tête — rang + barre XP (60) + série (62) + 3 badges phares (62). Remplace l'ajout minimal du Sprint 60.
2. **`DopamineCockpit`** (`/home`) : refondre le `GamificationHub` existant (aujourd'hui la vieille version « Pokédex/badges/séries privés ») en cockpit : bloc niveau + XP, série avec urgence, **défis actifs**, badges récents, records. Intègre `HomeProgressCard` (Sprint 60) au lieu de le doubler.
3. Nettoyer les doublons éventuels laissés par les sprints précédents (ne pas empiler deux cartes « progression »).

### Critères d'acceptation
- Le profil public montre l'en-tête compétitif complet ; `/home` montre le cockpit unifié sans doublon.
- **Régression interdite** : Pokédex, galerie prises, follows, gating — intacts.

### Garde-fous
- Ne pas casser le Pokédex existant (le réintégrer dans le cockpit, pas le supprimer).
- Perf : `/home` est déjà dense — ne pas empiler de composants lourds ; réutiliser les Server Components de lecture.

---

## Bloc 3 — Notifications dopamine (proactives)

L'audit a noté que **toutes** les notifs sont réactives (like/follow/comment). Ajouter les **proactives** solo.

> **Connecteurs** : **supabase-guard** (types de notif existants) ; ne pas dupliquer l'infra push (sprints 49/85).

### Tâches
1. Nouveaux types de notif (in-app + push si l'infra le permet, cf sprints 49/85) : **level up**, **badge obtenu**, **nouveau record**, **série en danger (J-2)** *(si pas déjà fait au 62)*, **défi complété / qui se termine**. Réutiliser `notifications` + `notification_prefs` (opt-out par type, sprint 49/86).
2. Fréquence **tasteful** : pas de spam (une série-en-danger/semaine max, level-up à l'événement).

### Critères d'acceptation
- Passer un niveau / débloquer un badge / compléter un défi crée la notif correspondante, respectant l'opt-out par type.
- Aucune notif de rang/classement (ça, c'est la Phase E).

### Garde-fous
- Respecter l'interrupteur maître push + les prefs par type (sprint 49/86). Best-effort (ne casse jamais l'action).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` + **deploy-watch**.
2. Chaque critère (Blocs 0-3) coché avec preuve (SQL défis idempotents, `qa-chrome` cockpit/notifs).
3. **Passe sécurité** : `challenges`/`user_challenge_progress` RLS ; RPC `SECURITY DEFINER SET search_path` ; notifs INSERT en service-role ; `get_advisors` propre.
4. **Passe anti-régression** : Pokédex + galerie + follows + gating + perf `/home` (pas de nouveau gel) intacts.
5. **Passe honnêteté/copy** : défis descriptifs, aucune comparaison chiffrée, tutoiement, pas de tiret cadratin.
6. `docs/sprint-63/RECAP.md` : fait / tester / reste John. **Clôture de la Phase B (dopamine solo).**

## Reste manuel John (post-sprint)
- **Valider** la liste des défis + récompenses + fréquence des notifs (⚠️ Blocs 0/3).
- Confirmer **100** + regen types. Merge → déploiement → QA du cockpit.
- **Bilan Phase B** : la dopamine solo est en prod → prochaine étape = **Phase F (amorçage `invite_codes`)** puis **Phase E (classements)** quand le réservoir se remplit.
