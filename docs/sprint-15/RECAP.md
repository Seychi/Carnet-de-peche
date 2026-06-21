# Sprint 15 — RECAP : Instruments marins

> Exécuté le 2026-06-21 (mode ultracode, effort xhigh). **Code-complet, non mergé, non déployé.**
> Branche : `sprint-14-home` (les sprints 12→14 + excellence lots 1-2 y sont).
> Gates VERIF : `tsc --noEmit` ✅ · `vitest run` **348/348** ✅ · `next build` ✅ · `next lint` ✅.

L'objectif du sprint : rendre nos forces (marées précises + scoring personnalisé honnête) **spectaculaires et lisibles**, pour qu'un produit générique paraisse plat à côté. Tout est dérivé de **données réelles** (Open-Meteo, EMODnet, l'historique de prises de l'utilisateur, le barème solunar existant). **Aucune valeur inventée.**

---

## Ce qui a été fait, bloc par bloc

### Bloc A — Courbe de marée interactive ✅
- **`lib/conditions/tide.ts`** (nouveau, pur + testé) : `tideTrendAt`, `refineExtremumHour` (interpolation parabolique sub-horaire), `dailyMarnage`, `upcomingExtrema`, `formatHourFraction`, `formatCountdown`. 16 tests verts (`tide.test.ts`).
- **`TideChart.tsx`** réécrit :
  - Curseur **« maintenant » live** : horloge client (maj chaque minute) → ligne verticale à l'heure **fractionnaire** de Paris (XAxis passé en `type="number"`), bouge sans recharger.
  - **Tooltip enrichi** : heure + hauteur + **tendance** (montante / descendante / étale) calculée depuis les points réels.
  - **Bandeau PM/BM live** : prochaine pleine et basse mer avec heure (interpolée des données horaires) + **compte à rebours** « dans Xh Ymin ».
  - Tous les chiffres en `font-mono`.
- **`TideStrengthBand.tsx`** (nouveau) : bande **« force des marées · 7 jours »**. ⚠️ **Choix d'honnêteté assumé** : on n'a PAS de coefficient SHOM (Open-Meteo ne le fournit pas). On affiche le **marnage** = amplitude RÉELLE mesurée (max−min des hauteurs du jour, en mètres), avec intensité couleur **relative à la semaine** (vives-eaux ↔ mortes-eaux). On ne fabrique aucun « coef 0-120 ».
- **Bonus** : le calendrier 7 jours (`WeeklyCalendar`, qui acceptait déjà `tidesByDate` inutilisé) affiche désormais les **vraies PM/BM** par jour.
- Perf : la courbe interactive (recharts) **reste lazy** (`TideChartLazy`, `ssr:false`). La bande marnage est server-rendue (légère).

### Bloc B — Score circulaire décomposé ✅
- **`ScoreBreakdown.tsx`** (nouveau) : autour du `ScoreRing`, 3 barres **Astro / Marée / Vent** avec contribution lisible (`contribution = facteur × poids × 100`, poids **40/35/25**). Les valeurs viennent des `factors` déjà calculés par `lib/solunar/scoring.ts` — **rien de recalculé arbitrairement**.
- Rendu sur la **fiche spot** (`DayBestMoments`, décomposition du meilleur créneau du jour) **et le carnet** (`NextWindowInsight`, décomposition du prochain créneau).
- **Distinction générique / perso** honorée : note explicite « Score générique — identique pour tous ; tes tendances perso vivent dans ton carnet ». Aucun multiplicateur fabriqué (décision sprint 7.5 respectée). L'empty-state perso (`PersonalScoreSection`) dit déjà « logue X prises ».
- Honnêteté collatérale : la modale « Comment c'est calculé » disait « coefficient » pour la marée alors que `scoreTide` n'utilise **pas** de coefficient → reformulé en « bonus si PM/BM dans le créneau » (= le vrai algo).

### Bloc C — Insights perso enrichis (honnêtes) ✅
- **`lib/catches/insights.ts`** (nouveau, pur + testé, **sans migration**) : lit les vraies prises (`catches_for_viewer` filtré sur `user_id`) et calcule :
  1. **Taille moyenne jour (7h–21h) vs nuit** + delta % (ex. « +25% plus grosses en journée »), gardé à ≥4 prises taillées par créneau et delta ≥5%.
  2. **Meilleur mois** (≥8 prises).
  3. **Jour de la semaine fétiche** (si un jour se détache de 50%).
- Chaque insight **expose sa taille d'échantillon** (vérifiable). 5 tests verts (`insights.test.ts`).
- **`PersonalInsights.tsx`** rendu dans `/carnet`. Sans données suffisantes → « continue à loguer » (jamais de chiffre fictif). **Aucun classement global** entre utilisateurs (anti-toxicité).
- Le contexte local « X prises ici aujourd'hui » existait déjà sur la fiche spot (`SpotActivitySection` / `get_spot_activity`, migration 018) — réutilisé, pas dupliqué.

### Bloc D — Fiches espèces sourcées + datées ✅ (+ corrections réglementaires)
- **Donnée structurée** : `EspeceContent.regulation` gagne `minSizeCm: Record<Facade, number|null>` + `marquage: boolean` → la maille est désormais **réutilisable** (carte/filtre/score), plus enfouie dans du HTML.
- **Badge mono visible** (DA v2) sur `/especes/[slug]` : « **Maille 42 cm · vérifié le 21/06/2026 · Légifrance** » + chip « Marquage obligatoire ».
- **Vérification réglementaire par recherche multi-agents** (6 espèces, sources Légifrance/mer.gouv.fr/DIRM, confiance haute). Corrections **sourcées** appliquées :
  - 🔴 **Maquereau — quota** : « pas de quota national » était **FAUX** → **10 maquereaux/jour** (Manche/mer du Nord/Atlantique, arrêté 1er avril 2026).
  - 🔴 **Maquereau & Sar — marquage** : disaient « aucun » → **FAUX**, les deux sont sur la liste de l'arrêté du 17 mai 2011 → corrigé en « marquage obligatoire » (dérogation maquereau : avant débarquement).
  - 🟠 **Bar** : quota/fermeture reformulés au **48e parallèle** (le no-kill fév.–mars ne vaut qu'au **nord** du 48e ; au sud, pêche ouverte 2/j) + exception Golfe du Lion.
  - 🟠 **Façade** : maille Méditerranée ajoutée (maquereau 18 cm, sar 23 cm) ; orphie « pas de maille en Médit » ; dorade « hors AMP ».
  - **Sources scindées** (maille = arrêté 26/10/2012 ; marquage = arrêté 17/05/2011 ; quotas = arrêtés dédiés) et `verifiedAt` → **21/06/2026** sur les fiches corrigées.
- Marquage : confirmé que c'est une **règle générale** (liste limitative de l'arrêté 17/05/2011), donc bar/dorade/lieu/maquereau/sar = OUI, **orphie = NON** (correct, inchangé).

### Bloc E — Bathymétrie du spot ✅ (optionnel, fait)
- **`lib/conditions/bathymetry.ts`** (nouveau) : profondeur **réelle** via **EMODnet Bathymetry** (open data, SeaDataNet, sans clé). Cache 30 j, timeout 4,5 s, **tolérant** (null si indisponible ou point hors d'eau — jamais de profondeur inventée).
- Fiche spot : carte sidebar « Profondeur du spot ≈ X m · entre A et B m · Source EMODnet ».

---

## Nous vs la concurrence (honnête, sur les 4 axes de ce sprint)

| Axe | Fishing Grid | spot-de-peche | **Carnet de Pêche (après sprint 15)** |
|---|---|---|---|
| **Marées** | Imprécises (~30 min d'écart signalés) | Courbe 24h + curseur « maintenant » | Courbe 24h **curseur live fractionnaire** + tooltip **tendance** + **PM/BM compte à rebours** + **bande marnage 7 j** (amplitude réelle). Source Open-Meteo assumée, honnête sur l'absence de coef SHOM. |
| **Scoring** | 100% générique, opaque (un chiffre) | Solunar générique, justifié | Score **décomposé** (Astro/Marée/Vent, contributions visibles) **+** patterns perso **descriptifs** (carnet) — le seul à séparer « générique » et « le tien » sans mentir. |
| **Fiches espèces** | 266 fiches creuses | — (pas de fiches espèces) | 6 fiches profondes, **maille structurée + datée + sourcée Légifrach**, corrigées 2026, badge mono. Profondeur > quantité. |
| **Bathymétrie** | Non | Couches premium | Profondeur réelle EMODnet **gratuite** sur la fiche. |

> Honnêteté : nos marées restent issues d'un modèle global gratuit (Open-Meteo), pas du SHOM. On ne prétend pas à la précision portuaire SHOM ; on rend le réel **lisible et actionnable**. Le rapport `scripts/verify-tides.ts` (sprint 10) reste la référence pour arbitrer WorldTides.

---

## ⚠️ DEMANDER À JOHN (responsabilité éditoriale — NON tranché)

La recherche réglementaire est en confiance **haute** mais certains points relèvent d'un choix éditorial, **pas** d'un fait technique. À valider avant merge/déploiement :

1. **RecFishing (déclaration des captures d'espèces sensibles 2026)** — concerne **bar, lieu jaune, maquereau**. Les sources divergent sur l'entrée en vigueur effective (« 12/02/2026 » vs « reporté / année pédagogique » pour le bar). **Je n'ai rien ajouté aux fiches** pour ne pas annoncer une obligation peut-être pas encore opposable. → Veux-tu une mention « en cours de déploiement » ?
2. **Exceptions aires marines protégées** (bar 42 cm au Golfe du Lion ; dorade 3/j au Golfe du Lion, 3-10/j aux Calanques). Ajoutées **partiellement** (bar + dorade en note). Les intègre-t-on partout ou dans une note transverse « règles locales » ?
3. **Périmètre Méditerranée** : v1 cible la canne du bord, cœur Manche/Atlantique. J'ai ajouté les mailles Médit (maquereau 18, sar 23, orphie « aucune »). OK de les afficher, ou on assume un périmètre Atlantique ?
4. **Maquereau Mer du Nord 30 cm** (maille stricte distincte des 20 cm Manche/Atlantique). **Non ajouté** (peu/pas de spots Mer du Nord stricte en v1). À confirmer.
5. **Chaîne complète des textes** : j'ai scindé maille/marquage/quota. Cite-t-on aussi la réforme du 10/01/2026 + arrêté du 7/11/2025 pour le bar, ou on simplifie ?

> Détail complet de la vérification (verdicts + URLs Légifrance par espèce) : sortie du workflow `sprint15-regulation-verify` (transcript de session).

---

## Vérification

- **Tests** : 348/348 verts (dont **21 nouveaux** : 16 `tide.test.ts` + 5 `insights.test.ts`).
- **Build / typecheck / lint** : verts. Pages espèces toujours **SSG**, JSON-LD intact.
- **Revue indépendante** : workflow adversarial `sprint15-verif-review` (3 lentilles : zéro-invention, anti-régression, couverture brief) — voir conclusions intégrées ci-dessous / commit.
- **Anti-régression vérifiée** : aucun gating de tier contourné (le score était déjà public sur la fiche ; la décomposition n'expose rien de gated) ; `insights` filtré sur `user_id` ; RLS/floutage GPS non touchés ; bathymétrie n'expose pas plus de précision GPS que la page n'en montre déjà ; courbe interactive toujours lazy.

## Reste manuel John (post-sprint)

- **Valider l'exactitude réglementaire** (les 5 points ci-dessus) — responsabilité éditoriale.
- Arbitrer WorldTides si l'écart marées le justifie.
- Merge → `main` + déploiement. Mettre à jour `CLAUDE.md` §9 (track Excellence 12-15 terminé) et reprogrammer le mobile.

## Fichiers

**Nouveaux** : `lib/conditions/tide.ts` (+test), `components/conditions/TideStrengthBand.tsx`, `components/scoring/ScoreBreakdown.tsx`, `lib/catches/insights.ts` (+test), `components/catches/PersonalInsights.tsx`, `lib/conditions/bathymetry.ts`.
**Modifiés** : `components/conditions/TideChart.tsx`, `components/spots/SpotConditionsSection.tsx`, `components/spots/SpotBestMomentsSection.tsx`, `app/(marketing)/spots/[slug]/page.tsx`, `components/solunar/DayBestMoments.tsx`, `components/catches/NextWindowInsight.tsx`, `app/(app)/carnet/page.tsx`, `lib/especes/types.ts`, `lib/especes/content/{bar,dorade-royale,lieu-jaune,maquereau,sar,orphie}.ts`, `app/(marketing)/especes/[slug]/page.tsx`.

**Aucune migration Supabase** (Bloc B recalcule la décomposition à l'affichage ; Bloc C lit l'existant). `lib/types.ts` inchangé.
