# Sprint 62 — Brief d'exécution
## Séries actives & badges publics

> Rédigé le 2026-06-30. Durée cible : **1 grosse passe Fable** (effort `xhigh`), L.
> Contexte : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` §2.2.2, §2.2.3, §1.4 ; `docs/ROADMAP-POST-AUDIT-2026-06-30.md` Phase B.
> Décisions John 2026-06-30 : dopamine **solo**, **tasteful** — séries avec **joker** (pas de culpabilisation), badges **publics** mais **jamais** de classement ici (ça, c'est la Phase E).
> **Préalable** : **Sprint 60 mergé** (les colonnes `user_progress.current_week_streak`/`longest_week_streak` sont posées mais **à 0** — ce sprint les remplit). **Migration : 099.**

> **🔀 Parallélisation** : peut tourner **en parallèle du Sprint 61** (61 = 0 migration, 62 = **099**, donc **pas de collision** — 61 ne crée aucune migration). Point de contact : la **primitive `CelebrationOverlay`** (créée par 61) que 62 réutilise pour fêter les nouveaux badges → voir coordination.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-62/BRIEF.md`. Prérequis : Sprint 60 mergé.
> Ancre le schéma + le pattern `084`/`056_gamification` via supabase-guard AVANT d'écrire la
> migration 099. Lance le Bloc 0 (DB) et le Bloc 3 (framing, sans DB) en parallèle ; Blocs 1
> et 2 après le Bloc 0. Termine par VERIF. Ne push pas. `⚠️ DEMANDER À JOHN` pour toute
> famille de badge ambiguë.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant migration 099 | **supabase-guard** → Supabase (RO) | Lire `user_badges` (sprint 56, `recompute_my_badges`), `user_progress`, `catches`/`outings` pour le calcul de série ; pattern `084`. `list_migrations` (099 libre). `get_advisors` après. |
| Fonctions/trigger SQL de série | **docs-researcher** → Context7 (Postgres) | `date_trunc('week')`, agrégats, SECURITY DEFINER. |
| Regen types + advisors après | **supabase-guard** | `lib/types.ts` + `get_advisors security`. |
| QA badges/série | **qa-chrome** | Vérifier paliers, joker, partage. |
| Clôture | **`/verif-sprint`** | Complet. |

## Objectif du sprint en une phrase

Une **série hebdomadaire vivante** (avec urgence douce + joker mensuel) et des **badges publics à paliers** (dont le Pokédex enfin à **26**), sans aucun classement.

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 0 — Migration 099 (séries + badges tiers) | L | Sprint 60 | ✅ |
| B  | Bloc 1 — StreakCard active (joker, J-2) | M | Bloc 0 | ❌ |
| C  | Bloc 2 — Badges publics à paliers | M | Bloc 0 | ❌ |
| D  | Bloc 3 — Réécriture framing « anti-comparaison » | S | — | ✅ |
| VERIF | revue finale | S | tous | ❌ |

---

## Bloc 0 — Migration `099_badges_tiers.sql` (séries + paliers de badges)

Deux volets : **remplir la série** (colonnes posées vides au Sprint 60) et **enrichir les badges**.

> **Connecteurs** : **supabase-guard** — lire `recompute_my_badges()` (sprint 56) et la structure `user_badges` avant de l'étendre ; confirmer que le calcul « semaine active » se fait proprement depuis `catches` + `outings`.

### Tâches
1. **Séries** : fonction SQL qui calcule, pour un utilisateur, `current_week_streak` et `longest_week_streak` = nombre de **semaines consécutives actives** (une semaine est active si ≥ 1 `catch` OU ≥ 1 `outing` cette semaine, `date_trunc('week')`), avec **règle du joker** : une semaine manquée par mois ne casse pas la série. Mettre à jour `user_progress` (via une extension d'`award_xp` ou une fonction dédiée appelée au même trigger). Créditer l'XP `+20` par semaine active maintenue (barème §2.2.1) — idempotent.
2. **Badges tiers** : ajouter `tier smallint default 1` (+ `progress int`, `target int`) à `user_badges` ; étendre `recompute_my_badges()` avec les **nouvelles familles** (§2.2.3) : volume 10/50/200, diversité Pokédex 5/10/**26**, records de taille par espèce, conservation 10/50, exploration (dépts), saisons, nuit/aube, régularité 4/12/52 semaines.
3. **Fix Pokédex** : le seuil `pokedex_complete` passe de `>= 20` à `>= 26` (le bug SQL de `066_catch_verification.sql:146`). Corriger dans **099** (nouveau fichier), pas en éditant 066.
4. RLS : `user_badges` reste **privé au propriétaire** (déjà le cas) ; les badges deviennent **affichables publiquement** via l'UI (Bloc 2) mais la table reste own-only en lecture directe — l'exposition publique passe par une **vue/RPC gatée** qui ne renvoie que les badges d'un profil public (pas de données privées). Regen `lib/types.ts`.

### Critères d'acceptation
- Après application : `current_week_streak`/`longest_week_streak` sont **remplis** et cohérents pour les comptes existants (vérif SQL) ; le joker ne casse pas une série sur une semaine manquée isolée.
- `recompute_my_badges()` attribue les paliers ; `pokedex_complete` tombe à **26** distinctes (plus à 20).
- **Sécurité** : `user_badges` toujours RLS own-only en lecture directe ; l'exposition publique (Bloc 2) ne fuit aucun badge/champ privé ; `get_advisors` sans nouveau warning ; toute nouvelle fonction en `SECURITY DEFINER SET search_path=public`.

### Garde-fous
- Migration = **nouveau fichier `099_*.sql`**, RLS avant policies, jamais éditer 066/056.
- ⚠️ **DEMANDER À JOHN AVANT** : la liste finale des familles/seuils de badges (proposée §2.2.3) et le barème série `+20`.

---

## Bloc 1 — StreakCard active (joker + urgence douce)

Aujourd'hui la série est passive (« Juste un repère »). La rendre **active mais tasteful**.

> **Connecteurs** : **qa-chrome** pour rejouer les états (série en cours / J-2 / joker utilisé).

### Tâches
1. Refondre `StreakCard` : afficher **la série en cours** (« 🔥 7 semaines »), un **repère d'urgence douce** quand la semaine se termine sans activité (« plus que 2 jours pour la garder »), et l'**état du joker** (« 1 joker dispo ce mois »). Lire `user_progress` (Bloc 0).
2. Notif « série en danger » (J-2) — nouveau type, **opt-out**, une seule par semaine (pas de spam). *(Le gros des notifs dopamine est au Sprint 63 ; ici, juste la série en danger si c'est simple ; sinon le déférer au 63 et le noter.)*

### Critères d'acceptation
- La carte montre série en cours + joker + urgence J-2 quand pertinent.
- Ton **tasteful** : pas de culpabilisation, joker visible.

### Garde-fous
- Cadence **hebdomadaire** (pas quotidienne). Pas de « tu vas tout perdre » agressif.

---

## Bloc 2 — Badges publics à paliers

> **Connecteurs** : **qa-chrome** ; réutilise `CelebrationOverlay` du **Sprint 61** pour fêter un nouveau badge (voir coordination).

### Tâches
1. `BadgeCard`/`BadgesGrid` : paliers **bronze/argent/or**, état obtenu/à débloquer, **bouton partager** (carte OG existante).
2. **Exposition publique** : afficher les badges phares sur le **profil public `/u/[username]`** (via la vue/RPC gatée du Bloc 0), sans fuite de champ privé.
3. Câbler la **célébration** au déblocage d'un nouveau badge en réutilisant `CelebrationOverlay` (Sprint 61).

### Critères d'acceptation
- Badges à paliers visibles + partageables ; les badges phares apparaissent sur le profil public.
- Débloquer un badge de nouvelle famille déclenche `CelebrationOverlay`.

### Garde-fous
- ⚠️ **COORDINATION Sprint 61** : `CelebrationOverlay` est **créé par 61**. Si 61 et 62 tournent en parallèle, 62 **consomme** la primitive (import) sans la réécrire ; si 61 n'est pas encore mergé, prévoir un fallback (toast) et câbler la primitive au merge. Ne pas dupliquer la primitive.
- Aucun classement, aucune comparaison chiffrée entre pêcheurs (ça, c'est la Phase E).

---

## Bloc 3 — Réécriture du framing « anti-comparaison » périmé

Le pivot du 2026-06-28 rend les mentions « Aucun classement, aucune comparaison » / « Juste un repère » **périmées**.

> **Connecteurs** : aucun (copy/commentaires) ; respecter `CLAUDE.md` §6.

### Tâches
1. Mettre à jour les textes UI + commentaires code qui affirment l'ancien ADN (`056_gamification.sql` commentaires, `lib/gamification/*`, hub `/home`, sous-titres badges/séries). Nouveau ton : progression, jalons, fierté — **sans** encore promettre les classements (Phase E).

### Critères d'acceptation
- Plus aucune mention « aucun classement / anti-comparaison » qui contredise le pivot ; ton cohérent avec la nouvelle direction.

### Garde-fous
- Ne pas sur-promettre les classements (pas encore livrés). Tutoiement, pas de tiret cadratin.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` + **deploy-watch**.
2. Chaque critère (Blocs 0-3) coché avec preuve (SQL série/pokedex, `qa-chrome` badges/joker).
3. **Passe sécurité** : `user_badges` RLS own-only ; exposition publique via vue/RPC gatée sans fuite ; nouvelles fonctions `SECURITY DEFINER SET search_path` ; `get_advisors` propre.
4. **Passe honnêteté/copy** : Pokédex = 26 partout, framing à jour, no-kill valorisé, pas de comparaison chiffrée.
5. `docs/sprint-62/RECAP.md` : fait / tester / reste John (familles de badges + barème série validés ?).

## Reste manuel John (post-sprint)
- **Valider** les familles/seuils de badges + le barème série (⚠️ Bloc 0).
- Confirmer l'application de **099** + regen types. Merge → déploiement → QA.
