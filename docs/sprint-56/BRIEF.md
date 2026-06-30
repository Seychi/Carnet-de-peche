# 🎯 Sprint 56 — « Accessibilité & copy »

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §9 + `docs/audits/AUDIT-2026-06-29-ADDENDUM-PROFONDEUR.md`.
> **Prod = HEAD `7c23f5c` (sprint-50).** Objectif : viser **AA** sur les écrans clés et éliminer les **tics de copy** (tiret cadratin = tic IA n°1, genre, typographie FR). **Aucune migration** (100 % code/copy).

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 56 (docs/sprint-56/BRIEF.md). WS-A a11y formulaires/dialogs, WS-B a11y structure (skip-link/aria-current/headings/feed), WS-C contrastes, WS-D copy (tiret cadratin + Loggue + genre + troncature), WS-E microcopy FR. Finis par WS-F (vérif : node scripts/lint-copy-dashes.mjs propre + axe/Lighthouse a11y sans erreur bloquante). Esprit critique : vérifie chaque ancre. NE PUSH PAS sans validation.
```

**Prérequis** : dépôt local réparé (la passe lint + axe lit les fichiers du disque).

---

## Posture & invariants

Effort max + critique. Invariants : **pas de tiret cadratin « — » dans la copy visible** (virgule / parenthèses / deux-points / point selon le sens — cf §6 CLAUDE.md), tutoiement, cibles ≥ 44 px, `prefers-reduced-motion`. Ne pas régresser la DA (couleurs, JetBrains Mono pour les chiffres). Pas de push sans John.

---

## WS-A — a11y : formulaires & dialogs nommés 🟠

- **`components/cofishing/OutingComposer.tsx`** (flux « Proposer une sortie ») : le `<select>` département (`:83`) n'a **ni `<label>` ni `aria-label`** (le `<option value="">Département…</option>` n'est pas un nom accessible) ; le `<input type="datetime-local">` (`:91`) n'a **aucun nom** (datetime-local ignore `placeholder`). → ajouter `aria-label="Département"` et `aria-label="Date et heure de la sortie"` (ou des `<label htmlFor>` associés).
- **`components/catches/CatchForm.tsx`** (flux n°1 du produit) : labels visibles **sans `htmlFor`** + inputs sans `id`/`aria-label` sur Taille (`:661`), Poids (`:805`), Notes (`:1151`), Lat/Long (`:1044/:1057`). (À l'inverse, `measured_length_cm`/`reference_object` SONT bien appariés `:754/:780` → s'en inspirer.) → associer `htmlFor`/`id` partout.
- **`components/catches/PhotoLightbox.tsx:29`** : lightbox plein écran = `<div onClick={onClose}>` sans `role="dialog"`, `aria-modal`, `aria-label`, ni gestion du focus (entrée/trap/retour). Son jumeau `PhotoGalleryLightbox.tsx` le fait bien → **aligner** (role, focus trap, Esc, retour focus).

**Critères** : tous les champs des formulaires (prise, sortie) ont un nom accessible ; la lightbox est un vrai dialog focus-trappé. Vérif lecteur d'écran / axe.

---

## WS-B — a11y : structure & landmarks 🟠

- **Skip-link** : aucun « Aller au contenu » nulle part. → ajouter un lien `sr-only` focusable en tête de layout pointant `#main` (les `<main>` existent comme cibles). Le poser dans le layout racine (et/ou `(app)`/`(marketing)`).
- **`aria-current`** : `components/layout/Header.tsx:43` (nav desktop marketing) et `components/mobile-nav.tsx:73` n'ont pas `aria-current="page"` sur la route active (AppSidebar/TabBar/MoreMenu l'ont). → ajouter.
- **Fil** : `components/feed/PostList.tsx:67` est un `<div>` nu sans `role="feed"`/`role="list"` ni `aria-live` → les inserts/suppressions optimistes sont muets pour les lecteurs d'écran. → `role="feed"` + `aria-busy` pendant chargement ; items en `role="article"`.
- **Titres cockpit** : `components/home/home-ui.tsx:42` (`CockpitSection`) rend les titres (« Aujourd'hui », « Près de toi », « Ta progression ») en `<span>` stylé → l'outline de `/home` = un seul h1. → passer en `<h2>`.
- **Carte** : `components/map/MapView.tsx:747` conteneur/canvas sans `role`/`aria-label`/`aria-hidden` → ajouter un `aria-label="Carte des spots"` (ou `role="application"`).

**Critères** : navigation au clavier fluide (skip-link), états actifs annoncés, hiérarchie de titres correcte (axe « heading-order » OK).

---

## WS-C — a11y : contrastes < AA 🟡

Remonter ces textes (ratio actuel ~2:1, échec AA) :
- **`text-ink-300` (#B7C2C9) en vrai texte** : `components/gamification/StreakCard.tsx:49` (9 px), `PokedexGrid.tsx:81`, `components/catches/CatchGrid.tsx:151,168`, `components/feed/PostComposer.tsx:307` (placeholder) → passer en `text-ink-500/600` (réserver `ink-300` au décoratif).
- **Libellé saison `text-gold-500` (#D9A53C) sur fond clair** : `app/(marketing)/especes/[slug]/page.tsx:87` + `components/especes/species-season-now.tsx:14` (« Bonne ») → variante plus foncée pour le **texte**, ou ajouter un fond/poids (garder le gold pour les pastilles/accents, pas le texte fin).

**Critères** : contraste ≥ 4.5:1 sur tout texte courant (vérif axe/Lighthouse).

---

## WS-D — Copy : tic IA, genre, troncature 🟠

- **Tiret cadratin dans des CTA visibles EN PROD** (tic n°1) :
  - `components/marketing/MarketingCTA.tsx:34` « Créer mon carnet **—** gratuit » (le **composant CTA unifié**) + son commentaire `:12`.
  - `components/marketing/home-v3/Hero.tsx:243` et `HomeSections.tsx:456` : `registerLabel="Créer mon carnet — gratuit"` (passent leur propre libellé).
  - `components/especes/species-score.tsx:129` « … au score **—** Itinérant » (upsell sur chaque fiche espèce).
  → remplacer par virgule/parenthèses : « Créer mon carnet, c'est gratuit » ou « Créer mon carnet (gratuit) » ; « … au score (Itinérant) ». **Idéalement centraliser** le libellé dans `MarketingCTA` et faire pointer Hero/HomeSections dessus.
- **Typo « Loggue » (double g)** vs « Logue » (charte) : `components/home/TodayPersonalOverlay.tsx:72` et `components/scoring/PersonalTendencies.tsx:58` (ce dernier rend le CTA bas de fiche espèce « Loggue tes prises de … »). → « Logue ».
- **Genre figé** : `components/gamification/PokedexGrid.tsx:84` sr-only « capturée » (féminin) pour les 26 espèces → faux pour les ~17 masculines. → dériver « capturé(e) » du champ `gender` de l'espèce.
- **Troncature espèce** : `components/layout/GuideLayout.tsx:117` `species.split(' ')[0].toLowerCase()` → « Dorade royale » devient « …prise de **dorade** » et « Multi-espèces » → « multi-espèces ». → libellé complet (cas spécial « Multi-espèces »).

**Critères** : `node scripts/lint-copy-dashes.mjs` ne signale plus de tiret dans la copy visible (hors allow-list `'—'` placeholder / kickers `NN — Titre` / libellés data) ; « Logue » partout ; genre correct ; espèce non tronquée.

---

## WS-E — Microcopy FR 🟢

- **Apostrophes mixtes** : les FAQ utilisent l'apostrophe droite `'` alors que le reste utilise la typographique `'` : `app/(marketing)/tarifs/page.tsx:82,90`, `components/marketing/home-v3/HomeSections.tsx:370`. → homogénéiser en `'`.
- **Espace insécable avant `? ! :` et dans « »** (absent quasi partout). Fixer au moins les plus visibles : titres onboarding (`onboarding-step.tsx:386` « D'où tu pêches ? » + questions sœurs), FAQ (`tarifs/page.tsx`, `HomeSections.tsx:370+`), titres de modales (`ShareOptInDialog.tsx:31,36,41,46`, `CatchDeleteDialog.tsx:36`), placeholder composer (`PostComposer.tsx:306`). → insérer `&#8239;` (fine insécable) ou un petit helper `frPunct()` réutilisable. *(Ne pas sur-investir : viser les écrans à fort trafic.)*
- **Mono incohérent** : `components/conditions/WeatherGrid.tsx:80,90,100` — les métriques secondaires (`${prob} % de risque`, `${cloud} % de nébulosité`, `Humidité ${humidity} %`) et `tempRange` (`↓ 12° ↑ 18°`) rendent hors `font-mono` alors que la valeur principale est mono. → passer ces chiffres en `font-mono` (règle DA).
- **Numérotation de section** : `components/marketing/home-v3/HomeSections.tsx:118,201` — kickers « 01 — … » et « 03 — … » mais **pas de 02** (trou visible). → ajouter le 02 ou renuméroter.

**Critères** : apostrophes homogènes, ponctuation FR correcte sur les écrans clés, chiffres en mono, numérotation continue.

---

## WS-F — Vérification (obligatoire, en dernier) ✅

1. **`node scripts/lint-copy-dashes.mjs`** propre sur la copy visible (seules restent les exceptions allow-list).
2. **a11y automatisé** : axe-core / Lighthouse a11y sur `/` (home), `/carnet`, `/carte`, une fiche espèce, `/fil`, `/notifications` → **0 erreur bloquante** (labels, contrast, heading-order, aria-current, landmark).
3. **`/verif-sprint`** : Vitest vert, build OK, lint + types OK.
4. **Anti-régression** : la DA (couleurs, mono chiffres) n'est pas dégradée ; le skip-link et les `role` n'introduisent pas de doublons de landmarks ; tutoiement intact.
5. **QA clavier** rapide : tab depuis le haut → skip-link visible au focus → saute au contenu ; dialogs (lightbox, share) focus-trappés.
6. **NE PAS PUSH** : laisser à John.

---

## Récap

| WS | Thème | Fichiers clés |
|---|---|---|
| A | a11y formulaires/dialogs | `OutingComposer.tsx`, `CatchForm.tsx`, `PhotoLightbox.tsx` |
| B | a11y structure | layouts (skip-link), `Header.tsx`, `mobile-nav.tsx`, `PostList.tsx`, `home-ui.tsx`, `MapView.tsx` |
| C | contrastes | `StreakCard/PokedexGrid/CatchGrid/PostComposer`, `especes/[slug]/page.tsx`, `species-season-now.tsx` |
| D | copy (tic IA, genre, troncature) | `MarketingCTA.tsx`, `Hero.tsx`, `HomeSections.tsx`, `species-score.tsx`, `TodayPersonalOverlay.tsx`, `PersonalTendencies.tsx`, `PokedexGrid.tsx`, `GuideLayout.tsx` |
| E | microcopy FR | `tarifs/page.tsx`, `HomeSections.tsx`, `onboarding-step.tsx`, dialogs, `WeatherGrid.tsx` |

**Décisions ouvertes (mineures)** :
1. **WS-D** : reformulation exacte du CTA (« c'est gratuit » vs « (gratuit) ») — reco « Créer mon carnet, c'est gratuit ».
2. **WS-E** : helper `frPunct()` global vs corrections ponctuelles — reco ponctuel sur les écrans clés (ne pas bloquer le sprint).

**Parallélisme** : WS-A/B/C (a11y) et WS-D/E (copy) sont indépendants → 5 agents en parallèle, puis WS-F. Aucune dépendance aux autres sprints (mais WS-D recoupe la culture anti-tiret du projet). Effort ~3-4 j.

---

*Brief Sprint 56 rédigé le 2026-06-29. Ancres a11y vérifiées par l'agent dédié contre HEAD `7c23f5c` ; « Loggue » (×2) et tirets CTA (MarketingCTA/Hero/HomeSections/species-score) + OutingComposer reconfirmés en direct. Prochain : Sprint 57 sur demande.*
