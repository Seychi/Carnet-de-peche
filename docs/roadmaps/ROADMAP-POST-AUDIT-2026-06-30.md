# Roadmap post-audit — de l'audit à l'exécution (2026-06-30)

> Ce document **opérationnalise** `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md` : il range **tout** ce que l'audit a trouvé (bugs, perf, mobile, la couche dopamine, l'amorçage) en **phases → sprints numérotés**. Le disque va jusqu'au sprint **58**, donc on démarre à **59**.
>
> **Périmètre :** uniquement les trouvailles de l'audit. La phase **mobile (Expo/React Native)** et les autres items de roadmap préexistants restent **hors de ce document** (cf `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`).

---

## 0. Comment lire / discipline

**Légende effort** (relatif, pas de jours fermes — dépend de tes sessions Fable) : **S** = une petite session · **M** = une session focalisée · **L** = grosse session ou deux. Chaque sprint est taillé pour tenir en **une passe Fable `ultracode` / effort `xhigh`** quand c'est possible.

**Rituel par sprint (toujours) :**
1. Écrire un **brief** selon `docs/BRIEF-TEMPLATE.md` (ligne de lancement + workstreams parallèles + critères vérifiables + WS-Vérif dédié).
2. **Migrations** = fichiers numérotés `NNN_*.sql` (à partir de 098), **jamais** éditer un ancien fichier ; appliquer via le connecteur Supabase (write) **après validation** ; **regénérer `lib/types.ts`**.
3. Terminer par **`/verif-sprint`** (tests + build + lint + types + revue croisée + passe anti-régression). Pas de « code-complet » sans ça.
4. **Pas de push sans validation de John.**

**Garde-fous permanents (à re-vérifier à chaque passe adversariale) :** floutage GPS, RLS, **honnêteté des données (0 chiffre inventé)**, RGPD, **anti spot-burning** (aucune métrique/classement n'expose de coordonnée).

---

## 1. Vue d'ensemble — la carte des phases

| Phase | Sprints | Objet | Dépend de | Effort |
|---|---|---|---|---|
| **A — Hygiène & dette rapide** | 59 | Tous les petits bugs/copy/a11y + triage perf. Partir propre. | — | M |
| **B — Moteur dopamine (solo)** | 60 → 63 | XP/rangs, records+célébrations, séries, badges publics, défis, cockpit. **Le vrai chantier.** | A (hydratation) | L ×4 |
| **C — Carte : perf & fixes** | 64 | Filtre fantôme + tuiles lentes. | — (parallèle) | M |
| **D — Mobile & honnêteté** | 65 | Contraste, clipping, fontes, copie honnête. | — (parallèle) | M |
| **E — Dopamine multi-joueur** | 66 → 67 | Classements, saisons, rangs vivants, rareté. | B + réservoir | L ×2 |
| **F — Amorçage & lancement** | 68 | Beta fondateurs (`invite_codes`), décision seed. | B | M |

**Idée-force :** l'audit dit que l'enjeu n'est pas de *réparer* mais de *transformer*. Donc **A** nettoie vite (peu cher), **B** construit la dopamine **solo** (marche à 0 donnée, pousse à loguer, **remplit le réservoir**), **C/D** tournent en parallèle (fichiers disjoints), **F** amorce quand la dopamine solo est prête, **E** (multi) vient en dernier car il a besoin du réservoir.

**Ordre recommandé (dev solo)** : `59 → 60 → 61 → [64] → 62 → 63 → [65] → 68 → 66 → 67` (les `[ ]` = parallélisables).

```
A 59 ─▶ B 60 ─▶ 61 ─▶ 62 ─▶ 63 ─▶ F 68 ─▶ E 66 ─▶ 67
              C 64  ∥ (indépendant)
              D 65  ∥ (indépendant)
```

---

## 2. Les phases en détail

### PHASE A — Hygiène & dette rapide

#### Sprint 59 — « Vérité & polish » · Effort **M** · migrations : 0
**Objectif :** liquider tous les petits bugs/copy/a11y de l'audit + trier la perf, pour repartir sur une base propre (et corriger l'hydratation qui touche **tous** les users).

**Workstreams (parallélisables) :**
- **WS1 — Copy & valeurs** : badge « Pokédex complet » **« 20 »→« 26 »** (`lib/gamification/badges.ts:55`) ; défaut formulaire prise **« Conservé »→neutre/non sélectionné** (`CatchForm.tsx:247`, `schema.ts:83`) ; aligner **taille input (200) vs slider (120)**.
- **WS2 — État vide** : `/home` « PRÈS DE TOI » — n'afficher « Sois le premier à loguer » **que si la liste est vraiment vide** (fin de la contradiction vide+contenu).
- **WS3 — a11y & contraste** : `aria-label`/`<label>` sur **slider taille, datetime, input photo** (`CatchForm`) ; corriger le **contraste « Nouvelle prise »** (navy-900 sur navy-950 → lisible).
- **WS4 — Partage desktop** : afficher une **modale d'aperçu de la carte** (miniature + « copier le lien ») au lieu du toast fugace (`components/share/use-share-card.ts`).
- **WS5 — Hydratation #418** (le gros gain) : corriger les **dates « naïves »** rendues UTC-serveur vs local-client → lire `HH:MM`/date depuis la string naïve, ou `suppressHydrationWarning` sur le nœud feuille. Fichiers : `home-v3/Hero.tsx:310`, `HomeSections.tsx:108`, `lib/conditions/format.ts:33-39`, `CatchForm.tsx:1122`.
- **WS6 — Triage perf (pas de gros refactor)** : confirmer la source `parentNode` null dans **Sentry** ; noter les **INP** (393 ms / 2 285 ms) pour la Phase C ; **couper la Vercel Toolbar en prod** (réglage dashboard, pas de code).
- **WS7 — Focus bug** : le décalage de layout quand « Leurres » ouvre le sous-bloc leurre (un clic « ville » atterrit dans le champ leurre).
- **WS-Vérif** : `/verif-sprint` + QA live des écrans touchés (console propre = **0 erreur #418** sur home/carnet/carte).

**Critères d'acceptation :** console sans #418 ; badge « complet » = 26 ; « Conservé » non présélectionné ; labels a11y présents ; aperçu de partage visible sur desktop ; toolbar Vercel absente en prod.
**Réf audit :** §1.1, §1.2, §1.4, §1.5, §1.7, §3.4, §3.5.

---

### PHASE B — Le moteur dopamine (solo) — *Partie 2 de l'audit, phase 1*

> But de la phase : la dopamine **mono-joueur** en prod. Tout marche **à 0 donnée** et pousse à loguer.

#### Sprint 60 — « Fondations XP & Rangs » · Effort **L** · migration : **098**
**Objectif :** le squelette de progression (la monnaie + les rangs).
**Workstreams :**
- **WS1 — DB (`098_xp_progress.sql`)** : `xp_events` (ledger append-only) + `user_progress` (état matérialisé) + RPC `award_xp` `SECURITY DEFINER` + **trigger `AFTER INSERT ON catches`** + **backfill rétroactif** (rejouer les prises existantes → un compte n'arrive pas à 0) + RLS **select-own**. Regen `lib/types.ts`.
- **WS2 — Barème** : `lib/gamification/levels.ts` (paliers/rangs du §2.2.1, formule `≈ round(100·n^1.7)`, garde-fous **rendements décroissants** anti-farm).
- **WS3 — UI** : `LevelBadge`, `RankChip`, `XpBar` (anim « level up »), posés en **lecture** sur le profil public + home.
- **WS-Vérif** : tests `award_xp` (idempotence via `UNIQUE`, backfill, cap), `/verif-sprint`, passe anti-régression (RLS, aucune fuite, `xp_events` non écrivable client).

**Critères :** loguer une prise crédite l'XP correctement ; le backfill donne un rang cohérent à un compte existant ; `xp_events` illisible/inscriptible côté client.
**Réf audit :** §2.2.1, §2.4.

#### Sprint 61 — « Records perso & célébrations » · Effort **M-L** · migrations : 0
**Objectif :** LE crochet dopamine le moins cher (marche à 0 donnée) + **corrige le badge silencieux** (§3.5).
**Workstreams :**
- **WS1 — Records** : détection du **nouveau record par espèce** à l'insert ; `PersonalBestCelebration` (modale/confetti + partage).
- **WS2 — Page records** : « Tes records » (déjà sur `/carnet`) enrichie (barre vers le prochain palier, comparaison historique).
- **WS3 — Célébration générique** : **moment de fête au déblocage** de tout badge/record (résout l'attribution silencieuse constatée en live) + toast enrichi.
- **WS-Vérif** : `/verif-sprint` + QA (loguer plus gros → célébration ; débloquer « Première prise » n'est plus muet).

**Critères :** une prise plus grosse déclenche la célébration + XP ; le 1er badge se célèbre.
**Réf audit :** §2.2.4, §3.5. **Dépend de :** 60.

#### Sprint 62 — « Séries actives & badges publics » · Effort **L** · migration : **099**
**Workstreams :**
- **WS1 — DB (`099_badges_tiers.sql`)** : `user_badges` + `tier`/`progress` ; nouvelles familles ; **fix seuil SQL `pokedex_complete` 20→26** (`066` corrige, en nouveau fichier) ; maj `recompute_my_badges()`.
- **WS2 — Séries** : `StreakCard` refonte (série en cours, **loss-aversion douce J-2**, **joker mensuel**) + notif « série en danger ».
- **WS3 — Badges** : paliers **bronze/argent/or**, **publics + partage** ; familles volume / diversité (Pokédex 5·10·26) / records de taille / conservation / exploration (dépts) / saisons / nuit / régularité.
- **WS4 — Framing** : réécrire les commentaires/textes **« anti-comparaison » périmés** (`056_gamification.sql`, `lib/gamification/*`) pour ne pas induire en erreur.
- **WS-Vérif** : `/verif-sprint` + passe anti-régression.

**Critères :** badges publics à paliers partageables ; série avec joker ; « Pokédex complet » = 26 (copie **et** seuil).
**Réf audit :** §2.2.2, §2.2.3, §1.4. **Dépend de :** 60.

#### Sprint 63 — « Défis, cockpit & notifs dopamine » · Effort **L** · migration : **100**
**Workstreams :**
- **WS1 — DB (`100_challenges.sql`)** : `challenges` + `user_challenge_progress` + seed des défis solo & conservation + RPC de progression.
- **WS2 — UI défis** : `ChallengeCard` (anneaux), `ChallengesBoard`, **événements saisonniers** (cadrage solo).
- **WS3 — Cockpit** : `ProfileCompetitiveHeader` (profil public) + `DopamineCockpit` (refonte du `GamificationHub` de `/home`).
- **WS4 — Notifs dopamine (solo)** : level up, badge, record, série, défi → nouveaux types + réglages opt-out.
- **WS-Vérif** : `/verif-sprint` + QA live.

**Critères :** défis actifs avec progression ; profil/home montrent l'identité de progression ; notifs dopamine opt-out.
**Réf audit :** §2.2.5, §2.2.7, §2.3. **Dépend de :** 60, 61, 62.

> **Fin de Phase B = la dopamine solo est en prod.** Elle tourne à 0 donnée, pousse à loguer, et commence à **remplir le réservoir** qui débloquera la Phase E.

---

### PHASE C — Carte : perf & fixes *(parallélisable avec B)*

#### Sprint 64 — « Carte instantanée » · Effort **M** · migrations : 0
**Objectif :** réparer la 1re impression de la feature table-stake n°1.
**Workstreams :**
- **WS1 — Filtre fantôme** : `MapFilters.tsx:160-213` — la restauration `localStorage` (`carte:last-filters`) réécrit l'URL avec un filtre périmé (`calmar` → carte vide). **Choix :** supprimer la restauration sur entrée nue, **ou** restaurer l'état mémoire **sans** réécrire l'URL. Une visite `/carte` nue reste **non filtrée** et centrée correctement.
- **WS2 — Tuiles** : profiler le premier paint (~8 s constaté) ; le `useDeferredMount` est déjà là, optimiser le reste (viser Lighthouse mobile > ~60, réduire le TBT).
- **WS3 — INP** : si le **2 285 ms** au log de prise se trace ici (handler submit/géocodage), le rendre **non bloquant** (async/déférer).
- **WS-Vérif** : Lighthouse avant/après + QA live (mobile + desktop).

**Critères :** `/carte` nu = non filtré ; tuiles < ~2 s ; INP de l'input de log < 200 ms.
**Réf audit :** §1.1, §1.3. **Dépend de :** — (indépendant).

---

### PHASE D — Mobile & honnêteté *(parallélisable)*

#### Sprint 65 — « Mobile & copie honnête » · Effort **M** · migrations : 0
**Workstreams :**
- **WS1 — Débordements** : bandeau instruments — **dégradé/scroll-cue ≤ 390 px** ; onglets Fil (3 labels) qui débordent **≤ 360 px**.
- **WS2 — Lisibilité** : passe sur les **fontes 9-10 px / `text-ink-300`** (71 occurrences, surtout `SpotPopup`, `MapLayerSelector`) → cibles data mobile lisibles (≥ 12 px).
- **WS3 — Honnêteté copie** : floutage GPS **« 1 km » → « ~500-900 m »** (aligner sur le réel, migration 028) ; `/tarifs` « **notifications créneaux optimaux** » — **soit livrer** la feature, **soit ajuster** la promesse.
- **WS-Vérif** : passe sur vrai device (ou fenêtre étroite) + relecture copie.

**Critères :** plus de clip sans cue ; fontes data ≥ 12 px ; copie alignée au réel.
**Réf audit :** §1.7. **Dépend de :** — *(le contraste « Nouvelle prise » est déjà traité au Sprint 59).*

---

### PHASE E — Dopamine multi-joueur *(gated : a besoin du réservoir)* — *Partie 2 de l'audit, phase 2*

#### Sprint 66 — « Classements » · Effort **L** · migration : **101**
**Workstreams :**
- **WS1 — DB (`101_leaderboards.sql`)** : RPC `get_leaderboard(scope, dept, species, period)` `SECURITY DEFINER` → lignes `{rank, user, avatar, metric}` **SANS aucun `geom`** ; `profiles.public_ranking` **opt-in** ; k-anon là où ça frôle la localisation ; matview + cron si perf.
- **WS2 — UI** : `LeaderboardTable` (dépt/espèce/saison/national) + **duel vs tes follows** (le plus motivant).
- **WS3 — RGPD** : opt-in + réglages de visibilité + retour arrière.
- **WS-Vérif** : **passe adversariale dédiée** — aucune coordonnée exposée, opt-out respecté, « plus gros » sur prises **vérifiées** (mesurées + photo).

**Critères :** classements affichés **sans fuite de spot** ; opt-out fonctionne ; métriques honnêtes.
**Réf audit :** §2.2.6. **Dépend de :** B (`user_progress`) **+ réservoir** (Phase F ou seuil de données atteint).

#### Sprint 67 — « Saisons & rangs vivants » · Effort **M-L** · migration : 0-1
**Workstreams :**
- **WS1** : **resets saisonniers** (ladder remis à zéro) + notif **changement de rang** / « X t'a dépassé ».
- **WS2** : **rareté des badges en %** (« 12 % l'ont » — nécessite des données).
- **WS3** : événements **compétitifs** saisonniers.
- **WS-Vérif** : `/verif-sprint`.

**Critères :** reset de saison OK ; notifs de rang ; rareté affichée.
**Réf audit :** §2.2.6, §2.2.7. **Dépend de :** 66.

---

### PHASE F — Amorçage & lancement

#### Sprint 68 — « Codes fondateurs = abonnement offert (comp) » · Effort **L** · migration : **1** (≈ 102)
**Objectif :** amorcer le réservoir en **offrant l'abonnement Local** aux fondateurs via des codes à échanger, **sans jamais bloquer une inscription** (décision John 2026-06-30 : **PAS** de gate `INVITE_ONLY`). Détail : `docs/sprint-68/BRIEF.md`.
**Workstreams :**
- **WS1 — Socle comp** : table `comp_grants` + `current_tier` = **max(Stripe, comp)** + RPC `redeem_comp_code` (offre **Local**, révocable/expirable). ⚠️ touche la RPC de gating → VERIF sécurité.
- **WS2 — UX d'échange** : code **optionnel** à l'inscription + échange dans le compte (utilisateurs existants).
- **WS3 — Admin** : mint + révocation des codes dans `/moderation` (modérateur-only).
- **WS4 — Amorçage** *(⚠️ John — zéro donnée inventée)* : vague fondateurs + runbook + check de lancement.
- **WS-Vérif** : passe sécurité gating (jamais plus permissif ; downgrade correct) + QA end-to-end.

**Critères :** échanger un code → Local activé sans carte ni Checkout ; révoquer → downgrade ; inscription **jamais** bloquée.
**Réf audit :** §1.2. **Dépend de :** B.

---

## 3. Traçabilité — chaque item d'audit → un sprint

| Item d'audit | § | Sprint |
|---|---|---|
| Hydratation React #418 (dates naïves) | 1.1 | **59** |
| INP 393 ms / 2 285 ms | 1.1 / 3.6 | **59** (triage) → **64** (fix input) |
| `parentNode` null (~9×/carnet) | 1.1 | **59** (triage Sentry) |
| État vide « PRÈS DE TOI » contradictoire | 1.2 | **59** |
| Réservoir vide → amorçage | 1.2 | **68** |
| Carte : filtre `calmar` fantôme | 1.3 | **64** |
| Carte : tuiles ~8 s | 1.3 | **64** |
| Badge Pokédex « 20 » : copie | 1.4 | **59** |
| Badge Pokédex « 20 » : seuil SQL | 1.4 | **62** |
| Défaut « Conservé » | 1.4 | **59** |
| Partage desktop sans aperçu | 1.4 | **59** |
| a11y : labels slider/date/photo | 1.4 | **59** |
| Taille input 200 vs slider 120 | 1.4 | **59** |
| Vercel Toolbar en prod | 1.5 | **59** |
| Abonné voit la page de vente `/tarifs` | 1.5 | *backlog (mineur)* |
| Contraste « Nouvelle prise » (mobile) | 1.7 | **59** |
| Bandeau instruments clippé ≤390 px | 1.7 | **65** |
| Onglets Fil overflow ≤360 px | 1.7 | **65** |
| Fontes 9-10 px | 1.7 | **65** |
| Floutage GPS « 1 km » vs ~200 m | 1.7 | **65** |
| `/tarifs` « notifications » non livrées | 1.7 | **65** |
| **Gamification — solo (XP, records, séries, badges, défis, cockpit)** | 2 | **60 → 63** |
| **Gamification — multi (classements, saisons, rareté)** | 2 | **66 → 67** |
| Framing « anti-comparaison » périmé | 2.5 | **62** |
| Onboarding : validation fréquence laxiste | 3.1 | **59** *(mineur)* |
| Décalage focus leurre/ville au log | 3.4 | **59** |
| Attribution de badge silencieuse | 3.5 | **61** |

*(Le géocodage par ville « Position requise » n'a **pas** pu être reproduit en live — §3.4 : pas de sprint dédié, à re-tester sur un cas tordu lors du Sprint 64.)*

---

## 4. Récapitulatif migrations

| # | Sprint | Contenu |
|---|---|---|
| 098 | 60 | `xp_events` + `user_progress` + `award_xp` + trigger + backfill |
| 099 | 62 | `user_badges` paliers + familles + **fix seuil Pokédex 26** |
| 100 | 63 | `challenges` + `user_challenge_progress` |
| 101 | 66 | `get_leaderboard` (spot-safe) + `profiles.public_ranking` |

*(Sprint 59, 64, 65 : 0 migration — fixes client/copy. 67 : optionnelle (saisons). **68 : 1 migration ≈ 102** — `comp_grants` + `current_tier` = max(Stripe, comp) + `redeem_comp_code`.)*

---

## 5. Notes

- **Ce n'est pas figé.** L'ordre recommandé privilégie « propre d'abord, puis le transform dopamine ». Si tu veux **attaquer la dopamine tout de suite**, on peut lancer le Sprint 60 en parallèle du 59 (fichiers largement disjoints) — la seule vraie dépendance est l'hydratation (WS5 du 59) qui aide tout le monde.
- **Chaque sprint mérite son brief** (`BRIEF-TEMPLATE.md`) avant exécution : c'est là qu'on fige la ligne de lancement, les critères vérifiables et le WS-Vérif.
- **Rien ici ne casse les garde-fous** : floutage GPS, RLS, honnêteté data, RGPD, anti spot-burning restent non négociables à chaque passe.

*Source : `docs/audits/AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md`. Dernière mise à jour : 2026-06-30.*
