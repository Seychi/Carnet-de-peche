# 🗺️ Roadmap — Suite (sprints 27+) — Carnet de Pêche

> Suite de `docs/ROADMAP-2026-H2.md` (Chantiers A→G, sprints 21→26 **livrés et déployés**) et de l'audit `docs/audits/AUDIT-UX-2026-06-24.md`.
> **Reframe** : les gros chantiers produit (moat perso, espèces×score, conformité, amorçage, monétisation, communauté) sont **shippés**. Le frein n'est plus la profondeur produit — c'est que **des features finies ne sont pas reliées à la navigation**, et que le **passage au mobile** exige d'abord une **IA propre**. Cette suite met l'**IA + le polish + l'éditorial espèces** en rampe de lancement **avant** le sprint mobile.
>
> Mode d'exécution : `ultracode` / effort `xhigh`, workstreams parallèles + workstream VERIF final (cf `CLAUDE.md §19`). Chaque sprint suit `docs/BRIEF-TEMPLATE.md`.

---

## 0. Où on en est (rappel honnête)

- **Fait** (sprints 21-26) : socle/tests, scoring perso « le carnet qui parle », pôle espèces 20 + score/espèce, conformité (réglementation façade-aware + RecFishing + IA + marées Med), bredouille + beta fondateurs + co-pêchage, monétisation/rétention (tunnel PostHog, notif perso payante, gamification anti-comparaison).
- **Découvert par l'audit 24/06** : plusieurs de ces features sont **mal/non reliées** (`/sorties` orphelin, éditorial inaccessible connecté, incohérence tab bar/sidebar), la home a une stat périmée, et **6 espèces pertinentes manquent** (barracuda, tassergal, liche, marbré, lieu noir, merlan).
- **Décision John maintenue** : web complet **avant** mobile ; la PWA fait le pont.

---

## 1. Séquencement (sprints 27+)

| Sprint | Nom | But | Effort |
|---|---|---|---|
| **27** ★ | **IA & Navigation** | Relier ce qui existe : 0 page orpheline, pont app↔éditorial, tab bar mobile cohérente. **Prérequis du mobile.** | moyen |
| **28** ★ | **Polish & fluidité « feel natif »** | Fermer les points fluidité (audit 22/06) sur device réel + détails design. Launch-readiness perçue. | faible-moyen |
| **29-30** ★ | **Pôle Espèces v2** | +6 espèces prioritaires (fiches profondes + réglementation sourcée) + visuels par espèce + maillage. Éditorial. | élevé (éditorial) |
| **31+** | **Mobile (Expo)** | App native iOS/Android + IAP, sur IA propre. PWA = pont. | élevé |
| **Parallèle** | **SEO / contenu (Chantier E)** | Guides phares + pages programmatiques deep + vidéo (lane César). | continu |

**Dépendances** : 27 (IA) débloque proprement le mobile (31+) → 28 (fluidité) ferme le dernier avantage perçu d'un app natif concurrent → 29-30 (espèces) nourrit l'IA refondue (les hubs espèces deviennent navigables) et le SEO. E tourne en continu.

---

## 2. ★ Sprint 27 — IA & Navigation

> Objectif : **« il ne manque plus aucun bouton »**. Toute page finie est atteignable en ≤ 2 taps, desktop ET mobile, sans rupture de contexte.

**WS1 — Atteignabilité (reprend la branche `sprint-27-quickwins-nav`)**
- `/sorties` (Co-pêchage) : entrée nav dédiée (sidebar + overflow mobile + avatar). Fin de l'orphelin.
- **Pont app → éditorial** : section « Découvrir » (Espèces, Guides, Techniques) dans la sidebar + l'overflow mobile. Un membre connecté peut enfin lire les fiches.
- Stat home « 6 → 20 » (idéalement **dynamique** depuis le référentiel espèces, pas en dur).

**WS2 — Tab bar mobile cohérente**
- Repenser la tab bar (5 slots + FAB) avec un **onglet « Plus »** (overflow) regroupant : Accueil, Mes pêcheurs, Co-pêchage, Espèces, Guides, Notifications, Abonnement, Modération (si mod).
- Aligner desktop/mobile : mêmes destinations atteignables, hiérarchie identique.
- Cibles tactiles ≥ 44 px, `aria-current`, safe-area (déjà bien fait sur l'existant).

**WS3 — Réduire les ruptures entre shells**
- Quand connecté dans le shell **marketing/carte** : remplacer le CTA « Créer mon carnet » par **« Aller à mon carnet » → `/home`** (sans casser le cache statique de la home : CTA résolu côté client/edge, ou segment dynamique ciblé).
- Bouton/fil d'Ariane constant « ↩ Mon carnet » dans le header marketing connecté.
- (Étude) : à terme, un **système de nav unifié** plutôt que 3 shells — cadrer le coût ici, exécuter plus tard si rentable.

**WS4 — VERIF** : matrice d'atteignabilité re-vérifiée (0 ❌/🔴), tests de présence des liens, `pnpm lint && pnpm test && pnpm build` verts, passe Claude-in-Chrome desktop **+ device mobile réel**.

**Critères d'acceptation** : la matrice §2.2 de l'audit ne contient plus aucune ligne 🔴/❌ ; depuis un mobile, on atteint Accueil, Mes pêcheurs, Co-pêchage, Espèces, Guides en ≤ 2 taps ; revenir sur `/` connecté ne propose plus de se réinscrire.

**Décision John** : structure exacte de la tab bar (quels 5 fixes + « Plus » ?) ; garde-t-on 3 shells (avec ponts) ou on planifie l'unification ?

---

## 3. ★ Sprint 28 — Polish & fluidité « feel natif »

> Objectif : effacer le dernier avantage perçu d'une app native concurrente = la **sensation de fluidité**.

**WS1 — Fluidité (re-vérifier l'audit 22/06 sur device réel)**
- Flashs blancs au scroll (ScrollReveal : déclenchement précoce / désactivation mobile / `prefers-reduced-motion`).
- Carte : tuiles < 2,5 s sur 4G + skeleton « carte ».
- Bandeau instruments : fondu/affordance de scroll horizontal.
- **Confirmer ce qui a déjà été corrigé depuis le sprint 16** (ne pas re-faire l'existant).

**WS2 — Détails design**
- **Visuels par espèce** sur les cartes `/especes` (silhouettes/illustrations maison, pas de pictogramme générique) — prépare aussi le sprint 29.
- `/home` : reléguer « Me déconnecter » (déjà dans l'avatar), remettre une action utile à sa place.
- Finir les points de finition 22/06 encore ouverts (contraste header « Nouvelle prise », checkboxes teal profil, filtres `/spots` pleine largeur).

**WS3 — VERIF** : test scroll/carte sur **Android milieu de gamme réel** (capture avant/après), Lighthouse mobile, a11y AA sur les nouvelles surfaces.

**Critères d'acceptation** : scroll home + fil **sans écran blanc** sur device réel ; tuiles carte < 2,5 s ; cartes espèces avec visuel distinct.

---

## 4. ★ Sprints 29-30 — Pôle Espèces v2

> Objectif : combler le gap espèces **correctement** (profondeur, pas quantité) et faire des fiches de vrais hubs navigables (synergie avec l'IA du sprint 27).

**WS1 — +6 espèces prioritaires** (fiches profondes au standard sprint 23 + réglementation **sourcée/datée Légifrance**) : **barracuda/spet, tassergal, liche, marbré, lieu noir, merlan**.
- Pour les espèces **sans maille nationale** (barracuda, tassergal, liche) : afficher explicitement « pas de taille minimale réglementaire en France » + reco no-kill/maturité. **Jamais de chiffre inventé.**

**WS2 — Corrections/dédup réglementaires (bloquant exactitude)**
- **Enrichir la fiche chinchard** avec les synonymes **sévereau / saurel / gascon** (SEO + reconnaissance Sud) — **ne pas créer de doublon**.
- Si **bar moucheté** ajouté : fiche **séparée** du bar, maille **30 cm**, **exempté** du régime quota/fermeture du bar européen.

**WS3 — Optionnelles à arbitrer** : **raie bouclée** (45 cm + marquage caudal — matière réglementaire idéale, ⚠️ distinguer de la raie brunette protégée) ; turbot, petite roussette, flet, pagre, girelle/serran (onboarding débutant Med).

**WS4 — Maillage & visuels** : score/espèce + top spots + créneaux + tendances perso branchés sur les nouvelles fiches ; visuels par espèce ; sitemap + JSON-LD + og:image ; 0 fiche orpheline (cohérent avec l'IA du sprint 27).

**WS5 — VERIF** : test de cohérence réglementation (les mailles des fiches == `lib/regulation/data.ts`), sources datées présentes, build/SEO verts.

**Critères d'acceptation** : 26 fiches en ligne (20 + 6), chacune profonde + sourcée + scorée + maillée + visuel ; chinchard enrichi ; aucun chiffre de maille inventé.

**Décision John** : liste finale (6 prioritaires + lesquelles des optionnelles ?) ; les nouvelles espèces entrent-elles dans le **sélecteur du carnet/onboarding** ou restent-elles éditoriales d'abord ? (cf CLAUDE.md §1 : onboarding sur les 6 cœur.)

---

## 5. Sprint 31+ — Mobile (Expo)

Démarrage de l'app native **sur une IA propre** (sprint 27) et un feel fluide (sprint 28). Expo iOS/Android, Apple IAP, code partagé avec le web (Turborepo). La PWA reste le pont jusqu'au lancement natif. *(Plan détaillé à écrire au sprint 30, cf `docs/sprint-mobile/`.)*

---

## 6. Lane parallèle — SEO / contenu (Chantier E)

Continue en fond (lane éditoriale + César) : guides phares (objectif ≥ 20), pages programmatiques **deep** (espèce × département × technique, 500-800 mots locaux), harmonisation JSON-LD/og:image, refresh trimestriel `verified_at`, vidéo courte data-driven (skill `video-courte-peche`) branchée sur les hubs espèces/réglementation.

---

## 7. À mettre à jour après arbitrage

- `CLAUDE.md §2` (état réel : sprints 21-26 + cette suite) et **§9** (roadmap courante = ce fichier).
- La matrice d'atteignabilité de l'audit comme **checklist de non-régression** du sprint 27 (et des suivants : toute nouvelle page = une entrée nav).

---

*Roadmap suite produite le 2026-06-24 à partir de l'audit UX/nav. Les Chantiers A→G d'origine restent la référence « profondeur produit » ; cette suite est la couche « reliure + polish + éditorial + mobile ».*
