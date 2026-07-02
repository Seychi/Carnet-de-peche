# 📒 RECAP Sprint 8 — Fil communautaire

> Branche `sprint-8`. **Pas encore mergé sur `main` ni déployé.** Migrations DB déjà appliquées en prod (décision John : pas de stack locale → application directe via MCP après vérif).
> Date : 2026-05-21.

---

## Livré (blocs 0 → J)

| Bloc | Livrable | Statut |
|---|---|---|
| 0 | Décisions verrouillées (fil/dept, posts texte+catch via `catches_for_viewer`, modération libre) | ✅ |
| A | Audit RLS (`rls-audit.md`) + seed comptes test dev (`seed_test_accounts.sql`) + helper `can_post_in_department` | ✅ |
| B | Migrations 017 (tier gating + RLS-FIX-04/05 + vue `feed_posts_for_viewer` + RPC `get_feed_unread_counts`), 018 (`get_spot_activity`), 019 (`reports.details`) | ✅ prod |
| C | Server Actions `feed.ts` (7 actions) + `follow.ts` (4) + whitelist côtière + 42 tests | ✅ |
| D | Hooks `useFeedRealtime` / `usePostInteractionsRealtime` + migration 020 (publication + replica identity) | ✅ prod |
| E | 6 composants `components/feed/` (PostCard, PostComposer, CommentThread, FeedTabs, ReportDialog, EmptyFeed) + `getComments` | ✅ |
| F | Routes `/fil`, `/fil/[department]`, `/u/[username]`, `/follows` + PostList/FollowButton/UserCard + `getFeedPage` | ✅ |
| G | Signal social `SpotActivitySection` (7j) sur la fiche spot | ✅ |
| I | Seed dev `seed_sprint_8.sql` + route `/dev/seed-feed` (6 pêcheurs, 24 posts) | ✅ |
| J | Doc (ce RECAP, QA checklist, métriques, MAJ CLAUDE.md/ROADMAP) | ✅ |

**Commits** : `a92c3a2` (A), `c9d5cb5` (B), `8219b39` (C), `c6bede9` (D), `7010fd5` (E), `b92eb55` (F), `f2ccffc` (G), `2253551` (I), + J.

**Qualité** : `pnpm test` = **183 verts**, `pnpm typecheck` = 0, `pnpm build` OK, fichiers du sprint lint-clean.

---

## Décisions & écarts notables (vs brief initial)

1. **6 incohérences du brief corrigées** (schéma réel) : `weight_g`/`photo_path` (pas `weight_kg`/`photo_url`), `reports.target_type='post'` (pas `'feed_post'`), colonne `reports.details` ajoutée (019), `feed_likes_select_all` droppé avant recréation, `catch_spot_slug` ajouté à la vue.
2. **RLS-FIX-04/05** (trouvés par l'audit, pas dans le brief) : la lecture du fil et du graphe social était ouverte aux **anonymes** via la clé publishable. Corrigé en 017 (`auth.uid() is not null` sur les SELECT). Validé par John.
3. **RLS-FIX-06** (dette pré-existante) : la geom précise d'une catch est lisible en accès **direct** table par un ami/public sans respecter `precise_for_friends`/`reveal_precise_to_public`. Mitigé tant qu'on passe par `catches_for_viewer` (le fil le fait partout). → **backlog ROADMAP**, hors sprint 8.
4. **Vue `feed_posts_for_viewer` en `security definer`** (advisory Supabase ERROR, même classe que les 3 vues existantes) : conservée volontairement, sécurisée par `WHERE auth.uid() is not null` (smoke test : 0 ligne pour l'anon). La passer en `security_invoker` cacherait le slug des spots `subscriber` aux gratuits.
5. **Index renommés** (`feed_posts_region_approved_idx`, `feed_posts_author_created_idx`) pour éviter la collision avec ceux de 003.
6. **Pas de doublon trigger** : `feed_posts_updated_at` existait déjà (004) → step "trigger" de 017 = no-op.
7. **Compteurs likes/comments pilotés par Realtime** (pas d'optimistic sur le compteur) → pas de double comptage quand Realtime rediffuse notre propre action. Seul le cœur est optimiste.
8. **Whitelist côtière réconciliée** : `lib/geo/departments.ts` était la source canonique (25 depts dont '11' Aude, oublié dans le brief). Doublon `lib/geo/coastal-departments.ts` supprimé, `isCoastalDepartment` ajouté au canonique.
9. **`SpotActivitySection` (G)** : chevauche partiellement la section "Prises récentes" existante (all-time). Ici = signal social **7 jours** avec `fishers_count` distinct ; l'autre = historique complet. Assumé.
10. **Tier sans Stripe** : Stripe arrive au sprint 9. Le gating est codé et testé via seed dev-only (`seed_test_accounts.sql`) ; aucune fausse subscription en prod.

---

## Dette / À faire avant de clore définitivement

- [ ] **QA manuelle** (`docs/sprint-8/qa-checklist.md`) à 100 % par John dans l'app lancée.
- [ ] **Tests Realtime cross-onglets** (D1/D2) : post/like/commentaire visibles en < 3s sur un autre onglet.
- [ ] **Captures composer** (4 cas tier — E2) dans `docs/sprint-8/screenshots/`.
- [ ] **Merge `sprint-8` → `main`** puis déploiement Vercel (rien n'est poussé pour l'instant).
- [ ] **2 fichiers map** (`MapView.tsx`, `UserLocationMarker.tsx`) modifiés en working copy hors de mes commits — décision de John (inclure / annuler).
- [ ] **Lint backlog** (bloc C sprint 7.5, ~360 apostrophes) toujours ouvert : le CI complet n'est pas 100 % vert tant que `eslint.ignoreDuringBuilds` reste.
- [ ] **RLS-FIX-06** (backlog) : durcir le RLS de `catches`.
- [ ] **PostHog events** (J3, `docs/sprint-8/metrics-to-track.md`) à câbler au sprint 11.

---

## Suite

→ **Sprint 9 : Stripe** (Checkout + Portal + webhooks + essai 7j). Rend le tier gating du sprint 8 réellement opérant en prod (remplace le seed dev de subscriptions).
