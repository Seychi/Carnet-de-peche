# Sprint 30 — Brief d'exécution
## « Aujourd'hui » — faire de /home le cockpit du jour + désempiler l'espace perso

> Rédigé le 2026-06-24. Durée cible : ~1-1,5 semaine.
> Contexte : audit `docs/audits/AUDIT-POST-S28-2026-06-24.md` (§2, le sujet `/home`). **Décision John 2026-06-24 : cockpit « Aujourd'hui »** (pas la fusion).
> Périmètre : **IA + composition d'UI**. On réutilise au maximum l'existant (conditions, solunar, perso, gamification). **Pas de nouvelle source de données.** Migration **seulement si** un compteur k-anon manque (préférer réutiliser `get_catch_heatmap`).

**Le problème (rappel).** Trois pages se marchent dessus : `/home` = sous-ensemble backward de `/carnet` ; `TES TENDANCES` (= `components/scoring/PersonalTendencies.tsx`) est affiché **2 fois** (`/carnet` **et** `/profil`) ; la **gamification** (sprint 26) est enterrée en bas de `/carnet`. Et la home marketing vend un copilote du jour que `/home` ne livre pas.

**Le principe.** Découper par **horizon temporel**, une page = un job :
- **`/home` = présent + futur + progression** (« qu'est-ce que je fais aujourd'hui »).
- **`/carnet` = passé** (le journal + ce qu'il m'apprend).
- **`/profil` = réglages**.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-30/BRIEF.md`. Lance le Bloc 2 (extraction gamification) tôt car le Bloc 1 en dépend, puis Bloc 1 (cockpit) et Bloc 3 (états froids) en parallèle, et termine par VERIF. Réutilise les composants existants (AppInstruments/conditions, solunar, PersonalTendencies, gamification) — ne réécris pas ce qui existe. Sois critique : si une donnée perso n'est pas dispo proprement, affiche un état honnête, n'invente pas un score. Garde-fou GPS : « près de toi » passe par le k-anon, jamais de coord précise. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Patterns Next 15 (server components, streaming, `Suspense`) | **docs-researcher** → Context7 | Composer le dashboard sans casser le perçu. |
| Lire RPC perso/heatmap/feed + vérifier le k-anon avant de coder « près de toi » | **supabase-guard** → Supabase (RO) | `get_catch_heatmap` (K=3), `get_spot_activity`, scoring perso. Aucune fuite GPS. |
| QA du cockpit (desktop + **device mobile**) | **qa-chrome** | Le `/home` est le futur « tab Aujourd'hui » natif → doit être impeccable au pouce. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + anti-régression (GPS, gating, perf). |

---

## Objectif du sprint en une phrase

**Ouvrir l'app le matin a une vraie valeur** : `/home` répond à « où/quand ça vaut le coup aujourd'hui, et qu'est-ce qui bouge près de moi » — pendant que `/carnet` et `/profil` cessent de se dupliquer.

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| A  | Bloc 2 (extraction gamification + dédup profil) | 0,5-1 j | — | ✅ (à faire tôt) |
| B  | Bloc 1 (cockpit /home) | 2-3 j | Bloc 2 (bloc gamification réutilisable) | ✅ (sections en parallèle) |
| C  | Bloc 3 (états froids / honnêteté) | 1 j | Bloc 1 (structure) | ⚠️ après squelette Bloc 1 |
| VERIF | revue finale | 0,5 j | tous | ❌ (en dernier) |

---

## Bloc 1 — Cockpit `/home` « Aujourd'hui »

Reconstruire `app/(app)/home/page.tsx` en dashboard **présent/futur/progression**. **Réutiliser** les fetchs et composants existants (aucune nouvelle API météo/solunar).

> **Connecteurs** : **supabase-guard** (RO) pour les RPC ; **docs-researcher** (Context7) pour le streaming/Suspense.

### Sections (de haut en bas)
1. **En-tête « Aujourd'hui sur ta côte »** : `Salut {pseudo}` + date + département. (remplace « Voici ton tableau de bord »).
2. **Maintenant** : conditions du jour (marée/coef, vent, houle) + **TON créneau du jour** avec score. Réutiliser **`lib/conditions/spot-forecast.ts` (`fetchSpotConditions`)** + **`lib/conditions/dept-window.ts` (`getDeptNextWindow`)** + `DEPARTMENT_SEA_COORDS` — exactement les fetchs de `components/layout/AppInstruments.tsx` (les mutualiser pour ne PAS double-fetcher ; `weather_cache` couvre déjà Open-Meteo). Afficher le score du créneau ; si perso disponible, l'**overlay honnête** (cf `components/catches/NextWindowInsight.tsx` / moteur perso sprint 22) avec niveau de confiance ; sinon score générique + « loggue plus pour personnaliser ».
3. **Cette semaine** : 2-3 prochains bons créneaux / grandes marées (réutiliser le solunar 7 j déjà câblé : `getDeptNextWindow` étendu / le calendrier `DayBestMoments`). Lien « voir la carte ».
4. **Près de toi** : signal communautaire honnête — « X prises loguées dans le {dept} cette semaine » (via **`get_catch_heatmap`**, k-anon K=3 → un **compte**, jamais de point précis) + 1-2 posts récents du fil départemental (`app/actions/feed.ts` → `getFeedPage`, lecture seule). CTA « ouvrir le fil ».
5. **Ta progression** : monter le **bloc gamification** extrait au Bloc 2 (streak + pokédex « 6/26 espèces »). C'est ici qu'il vit désormais, pas en bas du carnet.
6. **Action du jour** (barre/encart) : nudge contextuel — « Pas encore de sortie aujourd'hui → logue-la » (`/carnet/sortie`) ou « Grande marée demain (coef 95) ». Garder le FAB/Loguer accessible.

### Critères d'acceptation
- `/home` n'affiche plus de simple sous-ensemble du carnet : il montre conditions + créneau du jour + activité communauté + progression (vérifiable à l'œil + qa-chrome).
- Le créneau et les conditions proviennent des **fetchs existants** (pas de nouvel appel API ; pas de double-fetch avec le bandeau instruments — vérifier le réseau).
- « Près de toi » n'expose **aucune coordonnée précise** (que des comptes k-anon + posts publics). Vérifier réseau/payload.
- Score perso : si < seuil de prises → état honnête (« tendance » / « loggue X pour personnaliser »), **jamais un chiffre inventé**.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : le score perso du cockpit reste-t-il **gratuit** (argument d'acquisition) ou est-il l'**accroche payante** (Chantier F) ? **Défaut : aperçu gratuit** (créneau + tendance), le détail avancé reste là où il est gaté aujourd'hui.
- Floutage GPS : « près de toi » = k-anon strict (jamais `geom`). Réutiliser les RPC gatées, ne pas requêter les tables directes.
- Perf : `/home` reste dans le shell app (déjà dynamique) ; streamer les sections lourdes (Suspense) pour un premier paint rapide.

---

## Bloc 2 — Désempiler `/carnet` + dédupliquer `/profil`

> **Connecteurs** : aucun (refacto UI). **supabase-guard** non requis.

### Tâches
1. **Extraire la gamification** de `app/(app)/carnet/page.tsx` vers un **bloc réutilisable** (`components/gamification/GamificationHub.tsx` est déjà le hub — l'exposer proprement pour montage sur `/home`). La **retirer du bas de `/carnet`**.
2. **Dédupliquer `TES TENDANCES`** : retirer `components/scoring/PersonalTendencies.tsx` de **`app/(app)/profil/page.tsx`**. Le **garder sur `/carnet`** (c'est « ce que ton journal t'apprend » — passé). `/profil` redevient : avatar + infos + espèces favorites + abonnement + zone de danger.
3. **`/carnet`** après extraction : journal (liste prises) + MES STATS + `PersonalTendencies` (1 fois) + log/import/sortie. Vérifier que la page respire (moins de scroll).

### Critères d'acceptation
- `PersonalTendencies` n'apparaît plus que sur **une** page (`/carnet`).
- La gamification n'est plus sur `/carnet` ; elle est sur `/home` (Bloc 1).
- `/profil` ne contient que des réglages (plus de dashboard de patterns).
- Aucune régression de données (les mêmes RPC alimentent les composants, juste déplacés).

### Garde-fous
- Déplacement de composants, **pas** de changement de logique/scoring.

---

## Bloc 3 — États froids & honnêteté (le réservoir est vide)

Le fil est quasi vide (pré-lancement). Le cockpit doit **vendre le futur** sans mentir, et marcher pour un nouvel utilisateur sans historique.

### Tâches
1. **Cold start (0 prise)** : `/home` montre quand même de la valeur — conditions + créneau du jour (générique, honnête) + « loggue 3 prises pour débloquer TON score » + CTA import/log. (S'appuyer sur l'empty state actuel, l'enrichir vers le futur.)
2. **Sans département** : si `home_department` absent, inviter à choisir sa côte (réutiliser le pattern `DepartmentChooser` de `app/(marketing)/fil/page.tsx`) plutôt qu'un cockpit vide.
3. **« Près de toi » vide** : si 0 prise communautaire cette semaine, message honnête (« Sois le premier à loguer dans le {dept} cette semaine ») — pas de faux chiffres.
4. **Progression à zéro** : streak 0 / pokédex 0/26 → encourager, pas culpabiliser.

### Critères d'acceptation
- Un compte neuf (0 prise, dépt défini) voit un `/home` utile en < 2 min, sans bloc vide ni chiffre inventé.
- Aucun état ne ment (pas de fausse activité, pas de score perso sans données).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue indépendante. Puis **deploy-watch**.
2. **Anti-régression** : (a) **GPS** — « près de toi » ne renvoie que du k-anon, `git diff` ne touche aucune RPC de floutage ; (b) **gating tier** intact ; (c) **perf** — pas de double-fetch conditions, `/home` paint rapide (Suspense), pas de nouvelle dépendance lourde ; (d) **carte/carnet** inchangés.
3. **IA** : `PersonalTendencies` sur une seule page ; gamification sur `/home` ; `/profil` = réglages. Vérifier les 3 pages à l'écran.
4. **qa-chrome device** : `/home` au pouce (cockpit = futur tab natif), états froids simulés.
5. Livrer `docs/sprint-30/RECAP.md` : fait / comment tester / reste manuel John + captures avant/après des 3 pages.

---

## Reste manuel John (post-sprint)

- Trancher le gating du score perso du cockpit (gratuit vs accroche payante).
- Relire `/home` sur ton téléphone (c'est LA page quotidienne) → merge → `main` → déploiement.
- Noter : le cockpit prépare directement le **« tab Aujourd'hui »** du futur app natif + le **contenu des notifications push** (sprint notifications à venir).

---

## Rappels invariants (cf `CLAUDE.md`)

- Pas de push sans validation. RLS jamais désactivé. Pas de migration sauf compteur k-anon manquant (préférer réutiliser `get_catch_heatmap`) → sinon fichier numéroté + regen `lib/types.ts`.
- Réutiliser l'existant > réécrire. Honnêteté du scoring (« révèle TES patterns », jamais « prédit le mordant »). Tutoiement partout.
