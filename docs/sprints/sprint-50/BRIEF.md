# Sprint 50 — Brief d'exécution
## « Communauté vivante » (co-pêchage v2 · ~5-6 j) — DERNIER de la roadmap

> Rédigé le 2026-06-28. Dernier sprint d'enrichissement (roadmap `docs/ROADMAP-CORRECTIFS-ENRICHISSEMENTS-2026-06-28.md` §10). Muscler le collaboratif (vs Decathlon « sorties collaboratives » et Fishing Grid « groupes + chat »).
> Features : (A) **matching enrichi** (niveau + départements limitrophes), (B) **réputation / avis post-sortie**, (C) **loguer à plusieurs**, (D) **chat v2** (modération + photos + statut « sur place »), (E) **sorties près de toi** + **fil des plus grosses prises mesurées**.
> **Constats clés (re-vérifiés)** : co-pêchage solide (actions/queries/chat Realtime, `species` exposé par la vue depuis 076, chat fermé sur cancelled/done depuis 44) ; `LOOKS_LIKE_COORD`, `createNotification`, `sendPushToUser`, `reportPost`/`ReportDialog`, `PhotoInput` + strip EXIF (`public-share-photo.ts`) tous réutilisables ; `profiles.level` existe.

**⚠️ Alertes d'état (à lire avant tout)** :
1. **Migrations** : disque à `082` (47) ; 48 prend `082/083`, 49 `~084` → **ce sprint démarre ≥ `085`**, **confirmer `list_migrations` avant de créer**.
2. **`notification_prefs` (sprint 49) PAS encore en DB** → la pref par type pour « sortie près de toi » (WS E) doit se coordonner avec 49 (ou poser la colonne ici).
3. **Statut `done` JAMAIS écrit en DB** : dérivé côté client (`ProposalCard.tsx:34`, `planned_at < now`). Pas de cron `done`. → l'avis post-sortie (WS B) se base sur `planned_at < now()` + `accepted`, ou on pose `done` via greffon cron (pas de 5e cron, Hobby=4).
4. **`catches.outing_id` pointe vers `public.outings` (sorties SOLO, 051), PAS `outing_proposals` (co-pêchage, 053)** : deux tables distinctes → « loguer à plusieurs » (WS C) nécessite une **décision de liaison** (D1).
5. **Chat = groupe FERMÉ** → photos en **bucket PRIVÉ** (signed URL), surtout pas le bucket public `share-photos` du sprint 47.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-50/BRIEF.md`. **Confirme le dernier numéro de migration.** Réutilise le pipeline co-pêchage + `reportPost` + `PhotoInput` + le strip EXIF (`public-share-photo.ts`). Invariants : **zéro coordonnée** partout (`LOOKS_LIKE_COORD` sur tout texte/caption) ; **chat = bucket PRIVÉ** (pas public) ; réputation/fil **descriptifs, pas de classement compétitif** ; notif/push best-effort. Migrations numérotées + regen `lib/types.ts`. Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Migrations (outing_reviews, chat photo, bucket privé), RLS | **supabase-guard** → Supabase (RO d'abord) | Confirmer numéros ; RLS chat fail-closed + bucket privé ; regen types. |
| Realtime chat, Web Push, strip EXIF (sharp) | **docs-researcher** → Context7 | Patterns Supabase Realtime / `sharp` / signed URL. |
| QA (chat photo, report, avis, fil mesurées, sortie près de toi) | **qa-chrome** → Claude in Chrome | Vérifier 0 fuite (coord/bucket) + parcours. |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Workstreams & dépendances

| WS | Bloc | Effort | Migration | Parallèle J1 |
|----|------|--------|-----------|--------------|
| A | Matching enrichi (niveau + limitrophes) | S-M | — | ✅ |
| B | Réputation / avis post-sortie | M | outing_reviews | ✅ |
| C | Loguer à plusieurs | M | FK (D1) | ✅ |
| D | Chat v2 (modération + photos + « sur place ») | M-L | photo + bucket privé | ✅ |
| E | Sorties près de toi + fil prises mesurées | M | notif CHECK | ✅ |
| VERIF | revue + QA | S | — | ❌ |

---

## WS A — Matching enrichi (niveau + départements limitrophes)

### Tâches
1. **Adjacence départements (net-neuf)** : `DEPARTMENT_ADJACENCY: Record<string,string[]>` côtière dans `lib/geo/departments.ts` (ex. 29↔22/56, 56↔44, …), testée (`lib/geo/__tests__/departments.test.ts`). Aucune notion de limitrophe aujourd'hui (seul `DEPARTMENT_REGION` existe).
2. **Filtre niveau** : `profiles.level` (`001:26`) existe. L'exposer pour les propositions (jointure host→profiles ou ajout à `outing_proposals_for_viewer`), et l'ajouter aux filtres `OutingFilters.tsx` (aujourd'hui espèce + date) + `getDeptProposals` (`queries.ts:50`).
3. **Filtre limitrophes** : option « inclure les départements voisins » dans le board → `getDeptProposals` accepte une liste de dépts (le dépt + ses adjacents). **Jamais de point GPS** (toujours département + `area_label`).

### Critères d'acceptation
- Filtrer par niveau et/ou inclure les dépts voisins renvoie les bonnes sorties ; zéro coordonnée exposée.

---

## WS B — Réputation / avis post-sortie

### Tâches
1. **Migration `outing_reviews`** : table `(id, proposal_id → outing_proposals, reviewer_id → auth.users, reviewee_id, rating smallint CHECK 1-5, comment text ≤500, created_at, UNIQUE(proposal_id, reviewer_id, reviewee_id))`. RLS : INSERT par un participant `accepted`/hôte d'une sortie **passée** (`planned_at < now()`) ; SELECT public agrégé (note moyenne, pas les commentaires nominatifs si sensible). Modération via `reports` (target_type à étendre, cf WS D).
2. **Flux d'avis** : après une sortie passée (`planned_at < now()` + statut `accepted`/hôte), proposer « note ta sortie avec X ». 1 avis/participant/sortie.
3. **Affichage réputation** : note moyenne + nb d'avis sur le profil public `app/(app)/u/[username]/page.tsx` (hero `:135-190`). Descriptif, jamais un classement.
4. **(option) poser `done` en DB** : greffon dans un cron existant (pas de 5e cron) qui set `status='done'` aux sorties passées, pour déclencher proprement l'avis.

### Critères d'acceptation
- Après une sortie, chaque participant peut noter l'hôte (1-5 + commentaire) une fois ; la note moyenne s'affiche sur le profil.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D4)** : note 1-5 + texte (reco), et commentaires nominatifs publics ou agrégés seulement ?

---

## WS C — Loguer à plusieurs

**⚠️ Point de design** : `catches.outing_id` existe mais lie aux sorties **solo** (`public.outings`), pas au **co-pêchage** (`outing_proposals`).

### Tâches
1. **Liaison (D1)** : option (a) nouvelle FK `catches.coop_outing_id → outing_proposals(id) ON DELETE SET NULL` (lien fort, exposé dans `catches_for_viewer`) ; option (b) léger v1 : pré-remplir le form (département + espèces + note « sortie partagée avec @… ») **sans** FK. Reco : (b) v1, (a) si tu veux le lien dur.
2. **Préremplissage** : sur le modèle `SpotContext` (`CatchForm.tsx:112-211`), créer un `OutingContext { proposalId, department, species[] }` qui pré-remplit `outing_id`/`coop_outing_id` + département (façade) + 1ʳᵉ espèce, depuis une sortie passée. Chaque participant `accepted` (via `getProposalParticipants`) valide SA prise (coords = celles de SON log, flou habituel, **jamais partagées via la sortie**).
3. Entrée « loguer cette sortie » sur la `ProposalCard` d'une sortie passée.

### Critères d'acceptation
- Depuis une sortie passée, je crée une prise pré-remplie (dépt + espèce), chacun la sienne ; aucune coordonnée partagée via la sortie.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : FK dure `coop_outing_id` ou pré-remplissage léger sans FK ?

---

## WS D — Chat v2 (modération + photos + « sur place »)

### Tâches
1. **Modération** : généraliser `reportPost` (`app/actions/feed.ts:571`) en `reportTarget(targetType, targetId, reason, details?)` (ou `reportOutingMessage`), `target_type='outing'` déjà accepté (`053:197`). `ReportDialog` paramétré sur un message de chat. Suppression d'un message = service-role (le chat est append-only, pas de DELETE policy) via une action modérateur (modèle `moderatorDeletePost` `feed.ts:447`). Étendre `reports`/`target_type` si on cible un message précis (sinon `target_id` = proposalId).
2. **Photos du chat (bucket PRIVÉ)** : colonne `outing_messages.photo_path text` (migration) + **bucket privé `outing-photos`** (RLS owner-scoped `${uid}/…`, modèle `catches` `006`). Upload via `PhotoInput` (resize client WebP, EXIF strippé) + strip serveur (réutiliser `sharp` de `public-share-photo.ts:53`, mais **vers le bucket privé**). Lecture par **signed URL** gatée par l'appartenance à la sortie (service-role, modèle `attachPostMedia` du fil). Caption soumise au `LOOKS_LIKE_COORD`.
3. **Statut « sur place » (net-neuf léger)** : un **message de chat spécial** (type/flag) « je suis arrivé » (réutilise tout le Realtime `useOutingChatRealtime`, **zéro migration**, cf D2) plutôt qu'une colonne d'état. Texte, **zéro coordonnée**.

### Critères d'acceptation
- Signaler un message de chat → report en modération ; un modérateur peut le retirer.
- Envoyer une photo dans le chat → visible **uniquement** par les participants (signed URL), EXIF strippé, jamais publique.
- « Je suis sur place » s'affiche en temps réel dans le chat.

### Garde-fous
- **Bucket chat = PRIVÉ** (jamais le public `share-photos`). Chat fail-closed (hôte + accepté). `LOOKS_LIKE_COORD` sur les captions.
- ⚠️ **(D2)** : « sur place » = message spécial (reco, 0 migration) ou colonne `on_site_at` + Realtime ?

---

## WS E — Sorties près de toi + fil des plus grosses prises mesurées

### Tâches
1. **« Sortie près de toi » (event-driven)** : à la fin de `proposeOuting` (`actions.ts:33`, aucune notif aujourd'hui), notifier les pêcheurs du département (`profiles` `home_department = d.department`, service-role) + push (`sendPushToUser`). Nouveau type notif (CHECK migration, liste complète répétée). **Gating** : si `notification_prefs` (sprint 49) est posé, le respecter ; sinon best-effort/opt-in simple (cf alerte 2).
2. **Fil « plus grosses prises mesurées »** : section (ou onglet `FeedTabs`) dans `app/(app)/fil/[department]/page.tsx`, lisant `catches_for_viewer` filtré `département` (via le spot joint, `066:51`) + `measured_length_cm IS NOT NULL` + `privacy='public'`, trié `measured_length_cm DESC`, `limit N`. **Descriptif, PAS un classement** (anti-leaderboard). Gérer le cas « prise sans spot » (pas de département dans la vue).

### Critères d'acceptation
- Une nouvelle sortie ouverte dans mon département me notifie (selon ma pref).
- Le fil départemental montre les plus grosses prises mesurées (descriptif, pas un classement compétitif).

### Garde-fous
- ⚠️ **(D3)** : « sortie près de toi » gatée par `notification_prefs` (coordonner avec 49) ou opt-in dédié ?
- Fil mesurées : descriptif, jamais « le meilleur pêcheur ».

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : build + typecheck + lint + tests verts.
2. **QA (qa-chrome)** : matching niveau/limitrophes ; avis post-sortie + réputation profil ; loguer à plusieurs ; report + photo (privée) + « sur place » dans le chat ; sortie près de toi ; fil mesurées.
3. **Passe sécurité / anti spot-burning (non négociable)** : **zéro coordonnée** (matching = dépt/area_label, chat caption `LOOKS_LIKE_COORD`, loguer à plusieurs ne partage aucune coord) ; **chat photo en bucket PRIVÉ** (signed URL, jamais public) + EXIF strippé ; chat RLS fail-closed ; réputation/fil sans classement compétitif.
4. **Passe honnêteté** : avis réels, fil descriptif, notif best-effort.
5. **Passe copy** : tutoiement, pas de tiret cadratin (`node scripts/lint-copy-dashes.mjs`).
6. Livrer `docs/sprint-50/RECAP.md` : fait / comment tester / statut D1-D4.

---

## Décisions pour John
- **D1 (loguer à plusieurs)** — FK dure `catches.coop_outing_id → outing_proposals` ou pré-remplissage léger sans FK (reco v1) ?
- **D2 (« sur place »)** — message de chat spécial (reco, 0 migration) ou colonne `on_site_at` + Realtime ?
- **D3 (sortie près de toi)** — gater par `notification_prefs` (coordonner avec 49) ou opt-in dédié ?
- **D4 (avis)** — note 1-5 + texte ; commentaires nominatifs publics ou agrégés ?

## Reste manuel John (post-sprint)
- Appliquer les migrations (outing_reviews, chat photo + bucket privé, notif CHECK, FK si D1=a), regen types, merger `sprint-50` → `main`, déployer, QA.
- **Roadmap correctifs+enrichissements (42→50) terminée** : prochaine grande étape = la **phase mobile** (gate `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`).

---

> **Invariants (rappel)** : pas de push sans validation · RLS jamais désactivé (chat fail-closed) · migrations = nouveaux fichiers + regen `lib/types.ts` · CHECK types = liste COMPLÈTE répétée · **zéro coordonnée** (matching/chat/loguer à plusieurs) · **chat photo = bucket PRIVÉ** + EXIF strippé · réputation/fil **descriptifs, zéro leaderboard** · aucun 5e cron · copy sans tiret cadratin.
