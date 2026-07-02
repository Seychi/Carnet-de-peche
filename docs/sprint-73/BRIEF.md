# Sprint 73 — Brief d'exécution
## « Sorties groupées » : 1 sortie = 1 post riche, la densité sociale avec peu de pêcheurs

> Rédigé le 2026-07-02. Durée cible : 1 session Fable. Prérequis : S69 mergé (S72 non requis : fichiers disjoints, exécutable avant/après/en parallèle du 72 si besoin).
> Contexte : `docs/roadmaps/ROADMAP-POST-AUDIT-2026-07-02.md` Phase E · audit §6.C · inspiration Fishbrain « Trips ». Problème visé : le réservoir (fil quasi vide) — un post de SORTIE (N prises + participants + conditions) rend le fil vivant avec 5 pêcheurs là où il faudrait 50 posts individuels. Dernier sprint web avant la phase mobile (S74+, cf `ROADMAP-MOBILE-2026-07-02.md`).
>
> **Faits ancrés (SQL live, 02/07)** : `catches.outing_id` **existe déjà** ; tables `outings` (user_id, spot_id, department, started_at, ended_at, species_targeted, technique, notes), `outing_participants`, `outing_messages`, `outing_reviews`, `feed_posts` + `feed_post_photos` existent. Le gros du modèle est là : ce sprint CONNECTE sortie → fil, il ne reconstruit rien.
>
> **Décisions verrouillées (roadmap 02/07)** :
> - **Tags v1 = participants de la sortie uniquement** (le consentement = avoir accepté la sortie via `outing_participants`). Taguer un non-participant : v2, pas ici.
> - **Privacy** : le post de sortie n'expose JAMAIS plus précis que la plus floue des prises incluses ; photos et prises `private` n'apparaissent jamais dans le post public ; un spot affiché = celui de la sortie selon les règles de floutage existantes du viewer.
> - **ZÉRO nouvel événement XP dans ce sprint** : la surface anti-farm vient d'être scellée au S69, on ne l'élargit pas. (Un défi « sortie » éventuel = sprint ultérieur, après observation.)
> - **La bredouille compte** : une sortie sans prise est postable (« 3 h au flotteur, rien, mais quelle marée ») — cohérent avec le log de bredouille S25.

**Préalable avant de démarrer (manuel John)** : rien.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-73/BRIEF.md`. Lance les workstreams A/D en parallèle dès maintenant, puis B → C selon le tableau, et termine par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Bloc 0 | **supabase-guard** → Supabase | RLS live de `outings`/`outing_participants`/`feed_posts` AVANT de connecter les deux mondes. |
| Avant le rendu fil | **docs-researcher** → Context7 | Next 15.5 (RSC + Realtime) si doute. |
| QA | **qa-chrome** | Boucle complète à 2 comptes (sortie → post → fil). |
| Clôture | **`/verif-sprint`** puis **deploy-watch** | Standard. |

## Objectif du sprint en une phrase

Deux pêcheurs qui clôturent une sortie commune produisent en 2 clics un post de sortie riche (prises publiques, participants, conditions) visible dans le fil, sans jamais exposer une coordonnée ou une prise privée — et une landing SEO « déclaration pêche en mer » capte le wedge RecFishing.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Bloc 0 — Ancrage lecture | 0,25 j | — | ✅ |
| B | Bloc 1 — Migration 107 + agrégation | 0,5 j | A | ❌ (A est court) |
| C | Bloc 2 — UX (clôture, composer, PostCard sortie) | 0,75 j | B | ❌ |
| D | Bloc 3 — Wedge RecFishing (landing SEO) | 0,5 j | — | ✅ (indépendant) |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Ancrage (lecture seule, livrable `docs/sprint-73/research/anchor.md`)

### Tâches
1. Dumper RLS + policies live : `outings`, `outing_participants` (statuts ? qui est « participant accepté » ?), `outing_messages`, `feed_posts`, `feed_post_photos`. Vérifier si `feed_posts` a déjà un type/kind ou une FK vers autre chose que l'utilisateur.
2. Cartographier le flux sortie existant (S25) : création, invitation/acceptation, clôture (`ended_at`), où le log de bredouille se branche.
3. Vérifier comment le fil rend les galeries (`feed_post_photos`) et les compteurs — le post de sortie doit réutiliser ce rendu.
4. Recenser où `catches.outing_id` est écrit aujourd'hui (le lien prise→sortie est-il posé au log pendant une sortie active ?).
5. Baseline advisors.

### Critères d'acceptation
- `anchor.md` : réponses aux 4 questions avec définitions collées ; toute hypothèse du brief invalidée = STOP + signalement.

---

## Bloc 1 — Migration **107** : connecter sortie → fil

> **Connecteurs** : supabase-guard avant/après ; regen `lib/types.ts` ; `107b` réservée aux fixes de revue.

### Tâches
1. `feed_posts.outing_id uuid null` FK → `outings` (`ON DELETE SET NULL`) + index. Contrainte : **1 post de sortie par sortie** (`unique` partiel sur `outing_id where outing_id is not null`) — pas de spam multi-post d'une même sortie.
2. **RPC/vue d'agrégation `get_outing_summary(outing_id)`** (SECURITY INVOKER de préférence ; DEFINER seulement si nécessaire, avec `search_path` + REVOKE/GRANT maison) : nb prises par espèce, plus grosse prise **photo-vérifiée** (standard S69) sinon « non vérifiée » labellisée, participants acceptés (@pseudo + avatar), conditions (marée/coef/vent au `started_at`, via le snapshot `conditions` des prises), durée. **Ne renvoie QUE les prises visibles du viewer** (passer par `catches_for_viewer`, jamais la table) et **aucune coordonnée** (le spot du post suit les règles spot existantes du fil).
3. Autorisation de publication : seul le **créateur** de la sortie OU un participant accepté peut créer LE post (server action, re-check SQL).
4. RLS : rien à assouplir — si une policy doit changer, STOP et documenter (le fil est public par département, ça suffit).

### Critères d'acceptation (matrice SQL rollback)
- 2e post pour la même sortie → violation d'unicité propre.
- `get_outing_summary` vu par un tiers : prises `private`/`friends` absentes, plus grosse = photo-vérifiée only, zéro geom.
- Non-participant tente de publier → refus (action + SQL).
- Advisors : aucun nouvel ERROR.

---

## Bloc 2 — UX : clôture → composer → PostCard sortie

### Tâches
1. **À la clôture d'une sortie** (`ended_at` posé) : écran/CTA « Raconte cette sortie » → composer pré-rempli (résumé agrégé + texte libre + photos = celles des prises publiques des participants, désélectionnables). Publier = feed_post avec `outing_id`.
2. **Depuis le carnet** : « Regrouper en sortie » — sélectionner ses prises d'une même journée sans sortie → créer une `outing` rétroactive (solo) → même composer. (Le lien `catches.outing_id` est posé à cette occasion.)
3. **PostCard « sortie »** dans le fil : bandeau distinctif (durée, spot/zone floutée selon viewer, conditions), galerie (rendu `feed_post_photos` existant), chips participants @pseudo (lien profil), stats par espèce, mention bredouille assumée le cas échéant. Likes/commentaires/signalement = mécanique existante inchangée.
4. Notification in-app aux participants quand le post est publié (« Ta sortie avec @x est en ligne ») — canal existant, pas de push nouveau ici.
5. Copy FR tutoiement, zéro tiret cadratin, états vides honnêtes.

### Critères d'acceptation
- QA 2 comptes : A crée une sortie, B accepte, chacun logue 1 prise (B en `private`), A clôture et publie → le post montre la prise de A, PAS celle de B (privée), tague A et B ; B reçoit la notif ; un 3e compte Découverte voit le post avec zone floutée.
- « Regrouper en sortie » produit le même résultat depuis 2 prises existantes.
- Aucune régression fil (posts classiques, likes, commentaires, realtime).

---

## Bloc 3 — Wedge RecFishing (landing SEO, indépendant)

Personne ne pousse « logue une fois → déclare RecFishing + analyse tes patterns ». Les colonnes `catches.declared`/`declared_at`/`recfishing_reminded_at` et le helper S24 existent déjà.

### Tâches
1. Landing `/declarer-ses-prises` (marketing, indexable) : la déclaration obligatoire 2026 expliquée (sourcée : arrêté + app RecFishing UE, réutiliser les sources du moteur réglementation S24), et le pitch « Carnet de Pêche te rappelle quoi déclarer » (helper existant en démo honnête). CTA inscription.
2. SEO : title/meta/canonical/JSON-LD (FAQPage si pertinent), entrée sitemap, liens croisés depuis les fiches espèces (bloc réglementation) et le(s) guide(s) réglementation ; 1 guide MDX court si aucun ne couvre le sujet.
3. PostHog : `landing_recfishing_viewed` + UTM (mesurer le wedge).

### Critères d'acceptation
- Page indexable (robots/sitemap OK), Lighthouse SEO ≥ 95, contenu sourcé + daté (standard fiches), zéro promesse fausse (le helper « rappelle », il ne déclare PAS à ta place — le dire).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` (tests, build, typecheck, lint, lint copy-dashes) puis **deploy-watch** après déploiement.
2. Relire chaque critère, ✅/❌ avec preuve (matrice SQL, captures QA 3 comptes).
3. **Passe adversariale privacy dédiée** (c'est LE risque du sprint) : prise privée d'un tiers dans un post ? geom précis quelque part dans le payload RPC (inspecter le JSON réseau) ? participant retiré/compte supprimé → le post reste cohérent (SET NULL, pseudo « pêcheur retiré ») ? publier une sortie d'autrui ?
4. Vérifier « zéro nouvel événement XP » : `grep` sur `award_xp`/`xp_events` dans le diff = aucun ajout.
5. Anti-régression : fil classique, notifications, RLS outings, rate-limit posts existant s'applique au post de sortie.
6. Livrer `docs/sprint-73/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Merge → main, déploiement, QA fumée.
- **Première vraie sortie groupée avec un fondateur** → le premier post de sortie du fil, à relayer par César.
- Ensuite : gate mobile (`ROADMAP-MOBILE-2026-07-02.md` §1) → lane admin stores si pas déjà faite → M1 (S74).
