# Sprint 15 — Brief d'exécution
## Instruments marins (la supériorité visible)

> Rédigé le 2026-06-21. Durée : 2 semaines.
> Contexte : `docs/excellence/ROADMAP.md` · `docs/concurrents/fishing-grid.md` (eux : scoring 100% générique, marées imprécises ~30 min d'écart, 266 fiches espèces creuses) + spot-de-peche (courbe de marée 24h avec curseur « maintenant »). Objectif : rendre nos forces (marées précises + scoring **personnalisé**) spectaculaires, pour que leur produit paraisse plat.
> Rappel décision sprint 7.5 (verrouillée) : le scoring perso reste **descriptif et honnête** (« où/quand tombent tes prises »), PAS de multiplicateur fabriqué (le badge `⚡ Perso` avait été neutralisé car non démontrable — cf `docs/sprint-7.5/scoring-perso-deferred.md`). Ce sprint **visualise** mieux le réel, il n'invente rien.

**Préalable avant de démarrer** (manuel John) :
1. Sprints 12-14 mergés.
2. Lire le rapport de vérif marées (sprint 10 bloc 4 / `scripts/verify-tides.ts`) : si l'écart Open-Meteo vs SHOM est mauvais, prévoir WorldTides (sinon on capitalise sur « marées précises » sereinement).
3. Confirmer le prochain numéro de migration libre si Bloc B touche `spot_scores`.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-15/BRIEF.md`. Lance A, C, D en parallèle dès maintenant ; B après vérification du format `spot_scores` ; E est optionnel (le faire en dernier si le temps). Termine par VERIF. Ne push pas. **Docker dispo si besoin** (`supabase start`) — optionnel, seulement quand c'est utile (migration sensible, repro d'un bug), pas un passage obligé. **Effort maximal, très attentif et critique** : vérifie le vrai code, remets en cause le brief s'il se trompe, passe adversariale anti-régression (cf §Environnement & posture). Invariants : aucune donnée inventée (marées = Open-Meteo réel, scoring perso = descriptif honoré), RLS intactes, régénère `lib/types.ts` après migration éventuelle.

---

## ⚙️ Environnement & posture d'exécution (transverse — exigence John 2026-06-21)

**Docker est disponible** sur la machine de John — **optionnel, à utiliser seulement si nécessaire** (pas un passage obligé) :
- Quand une migration est **sensible** ou qu'un bug est **dur à reproduire**, `supabase start` (stack Supabase local sous Docker) permet de jouer la migration / le scénario en local AVANT la prod (RLS/policies, requêtes des critères, vérifier qu'`anon` n'accède à rien d'interdit). Sinon, ne te complique pas avec Docker.
- Lance tests + e2e Playwright (et Lighthouse pour le sprint UI) contre une base/instance jetable, jamais la prod.
- Conteneurise le build si ça aide à reproduire un comportement.

**Effort maximal + esprit critique** (exigence, pas une option) :
- `ultracode` + effort `xhigh` : parallélise au max, ne bâcle aucun bloc, va au bout des critères d'acceptation.
- **Très attentif et critique** : le brief est un guide, pas une vérité. Vérifie chaque hypothèse (chemins, lignes, schéma) contre le **vrai code** avant d'agir ; si un élément cloche, **remets en cause le brief** au lieu de l'exécuter aveuglément.
- **Passe adversariale** sur ton propre travail : traque les régressions (gating de tier, floutage GPS, RLS, perf INP, SEO), les cas limites et les fuites de données. En cas de doute : `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

---

## Objectif du sprint en une phrase

Sur une fiche spot, le pêcheur voit une courbe de marée **interactive** (curseur « maintenant », PM/BM live, heatmap de coefficient), un score **décomposé** en ses facteurs, des insights personnels honnêtes et actionnables, et des fiches espèces sourcées + datées — un niveau d'instrumentation qu'aucun concurrent n'offre.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Courbe de marée interactive | 3 j | — | ✅ |
| B | Score circulaire décomposé | 3 j | format `spot_scores` confirmé | ⚠️ J1 (UI), data J2 |
| C | Insights perso enrichis (honnêtes) | 2-3 j | — | ✅ |
| D | Fiches espèces sourcées + datées | 3 j | — | ✅ |
| E | (option) Bathymétrie du spot | 2 j | — | ✅ (si temps) |
| VERIF | Revue finale indépendante | 1 j | tous | ❌ (toujours en dernier) |

---

## Bloc A — Courbe de marée interactive

`components/conditions/TideChart.tsx` (+ `TideChartLazy.tsx`) affiche une courbe ; `lib/conditions/openmeteo.ts` fournit les données ; rendue sur `app/(marketing)/spots/[slug]/page.tsx` via `components/spots/SpotConditionsSection.tsx`. spot-de-peche a un curseur « maintenant » — on fait au moins aussi bien.

### Tâches
1. Curseur **« maintenant »** mobile sur la courbe 24h : ligne verticale à l'heure courante (timezone Europe/Paris), highlight de la valeur.
2. Survol/drag : afficher l'heure + hauteur d'eau + état (montante/descendante) au point pointé. Tactile-friendly (mobile, bottom-sheet ou tooltip).
3. **PM/BM live** : marqueurs pleine/basse mer avec heure exacte et « dans Xh Ymin ».
4. **Heatmap coefficient** : bande jour/semaine colorée selon le coefficient (faible → fort), cohérente avec les tokens score (teal/gold). Réutiliser la logique solunar (`app/actions/solunar.ts`, `components/solunar/WeeklyCalendar.tsx`).

### Critères d'acceptation
- La courbe montre une ligne « maintenant » à la bonne heure (Europe/Paris), qui bouge si on recharge plus tard.
- Pointer un instant affiche heure + hauteur + tendance.
- PM/BM affichés avec compte à rebours.
- Tous les chiffres en `font-mono` (règle DA v2).

### Garde-fous
- Données = Open-Meteo réel uniquement, jamais de valeurs hardcodées de démo.
- Performance : la courbe interactive reste lazy (ne pas alourdir le first load de la fiche spot).

## Bloc B — Score circulaire décomposé

`components/ui-v2/score-ring.tsx` affiche un score 0-100 ; `components/scoring/PersonalScoreSection.tsx` + table `spot_scores` (cron `app/api/crons/compute-spot-scores`). Aujourd'hui : un nombre. On montre **de quoi** il est fait.

### Tâches
1. Vérifier ce que `spot_scores` stocke (composantes ou score final seul). Si seulement le final : exposer la décomposition (lune / vent / marée / historique perso) — soit en l'ajoutant au calcul du cron (migration colonne `breakdown jsonb`), soit en la recalculant à l'affichage à partir des conditions.
2. UI : autour/à côté du `ScoreRing`, 3-4 barres ou mini-anneaux par facteur avec libellé et contribution. Couleurs sémantiques (high teal / mid gold / low ink).
3. Distinguer **score global** (générique, comme les concurrents) et **ton score** (perso, descriptif) — sans multiplicateur fabriqué : le perso reste « tes prises tombent surtout en marée descendante, coef > 80 » (factuel).

### Critères d'acceptation
- Le score affiche ses composantes (au moins 3) avec une contribution lisible.
- Le « ton score » reste descriptif/honnête (aucune affirmation de multiplicateur non démontré).
- Si l'historique perso est insuffisant, l'UI le dit (« logue 5 prises pour débloquer ton score perso ») au lieu d'inventer.

### Garde-fous
- ⚠️ Respecter la décision sprint 7.5 : pas de promesse de personnalisation non démontrable.
- Migration éventuelle = nouveau fichier + régénérer `lib/types.ts`.

## Bloc C — Insights perso enrichis (honnêtes)

`components/catches/NextWindowInsight.tsx` + `CatchStatsDetailed.tsx` + RPC `get_my_catch_stats` / `get_my_catches_breakdown`. Les concurrents donnent des stats génériques ; nous, du perso actionnable.

### Tâches
1. Enrichir les insights factuels : ex. « Ta prise moyenne en journée est +18% plus grosse qu'à la nuit » (calcul réel depuis l'historique), « Tes meilleures sessions : marée descendante, coef 80-100 ».
2. Contexte local **sans leaderboard global** (anti-toxicité assumée) : ex. « Tu es dans tes meilleures semaines à bar du trimestre » ou « 3 pêcheurs ont pris du bar à ce spot ce matin » (réutiliser `get_spot_activity`, migration 018).
3. Brancher ces insights là où ils servent : carnet (`/carnet`, profil stats) et fiche spot.

### Critères d'acceptation
- Au moins 2 insights perso calculés depuis de vraies données s'affichent quand l'historique le permet.
- Aucun insight inventé : sans données, message « continue à loguer » au lieu d'un chiffre fictif.
- Aucun classement global entre utilisateurs (cohérence anti-toxicité).

### Garde-fous
- Calculs vérifiables (l'agent fournit la requête/le test qui produit le chiffre).

## Bloc D — Fiches espèces sourcées + datées

`app/(marketing)/especes/[slug]/page.tsx`. Recoupe le sprint 10 bloc 3 (6 fiches profondes). Notre angle vs leurs 266 fiches creuses : **profondeur + source + date de vérification**.

### Tâches
1. Pour les 6 espèces cœur : maille minimale **sourcée + datée** (`verified_at`, source Légifrance/IFREMER), saisons par **façade** (Atlantique / Manche / Méditerranée), postes selon houle/marée.
2. Afficher visiblement « Maille 42 cm · vérifié le JJ/MM/AAAA · source X » (mono, DA v2).
3. Structurer en données (pas du texte en dur) pour réutilisation carte/filtre/score.

### Critères d'acceptation
- Chaque fiche des 6 espèces affiche maille + `verified_at` + source + saisons par façade.
- Les chiffres réglementaires sont exacts et datés (vérifiables vs Légifrance).
- Grammaire FR correcte (accord de genre — déjà corrigé sprint 11.6, ne pas régresser).

### Garde-fous
- Ne pas inventer de réglementation ; marquer `⚠️ DEMANDER À JOHN AVANT` si une source manque.

## Bloc E —  Bathymétrie du spot

 Profondeur d'eau au spot (GEBCO/SHOM open data, cf `CLAUDE.md` §4). `components/ui-v2/bathy.tsx` existe (décoratif) ; ici = donnée réelle.

### Tâches
1. Afficher une coupe/indication bathymétrique du spot (source open data), en cohérence DA.

### Critères d'acceptation
- La fiche spot indique une profondeur .

### Garde-fous
- v1 : pas d'API SHOM payante (cf périmètre). Open data uniquement.

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` + `pnpm build` + `pnpm typecheck` verts.
2. Cocher A→D (E si fait) avec preuve.
3. Passe « zéro invention » : marées = Open-Meteo réel, scoring perso descriptif, réglementation datée et sourcée. C'est le critère le plus important de ce sprint.
4. Passe perf : composants interactifs lazy, pas de régression Lighthouse.
5. Livrer `docs/sprint-15/RECAP.md` + une comparaison honnête « nous vs Fishing Grid / spot-de-peche » sur ces 4 axes.

## Reste manuel John (post-sprint)

- Valider l'exactitude des données réglementaires (responsabilité éditoriale).
- Arbitrer WorldTides si l'écart marées le justifie.
- Merge → `main` + déploiement. Mettre à jour `CLAUDE.md` §9 (track Excellence 12-15 terminé) et reprogrammer le mobile (ex-12-13 → 16-17).
