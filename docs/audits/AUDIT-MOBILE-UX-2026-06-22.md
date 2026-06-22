# 📱 Audit UI/UX mobile — Carnet de Pêche

> Réalisé le 2026-06-22, en navigateur réel (Chrome) à **390 px de large** (gabarit iPhone), sur la **prod live** `www.carnet-de-peche.com`, **connecté** (compte @Seychi). Écrans parcourus : home, `/carnet`, `/carte`, `/fil/06`, `/carnet/nouvelle`, `/spots`, fiche spot (`/spots/estacade-de-chatelaillon`), `/profil`.
> Objectif (John) : **écraser la concurrence sur l'UX/UI mobile** avant d'ajouter des fonctionnalités.
> Contexte : sprints 12, 12.5, 13, 14, 15 **déployés et vérifiés en live** (follow dans le fil, photos, tide curve « Maintenant », insights perso, upload avatar « Changer / Retirer ma photo »).

---

## Verdict global

**Note mobile : 7,5 / 10.** La fondation est déjà **bien au-dessus** de la concurrence sur le **contenu et la data-viz** (bandeau instruments, courbe de marée interactive, fil social riche, scoring). Ce qui empêche le « 9/10 » et l'effet app native, ce n'est pas le manque de features — c'est la **fluidité** : des **flashs blancs au scroll** sur tout l'app, une **carte lente** (~8 s), et une poignée de bugs de finition. **On gagne le match mobile en réglant la sensation de fluidité, pas en ajoutant des écrans.**

---

## ✅ Ce qui est déjà excellent en mobile (à ne pas casser)

- **App shell natif** : tab bar bas (Carnet · Carte · **FAB +** · Fil · Profil), FAB teal surélevé, atteignable au pouce. C'est la bonne base, ça fait « app », pas « site ».
- **Bandeau instruments** (mono : dépt, BM, marée ▼, vent N4, houle, créneau ▶) — distinctif et premium, aucun concurrent web n'a ça.
- **Courbe de marée interactive** (fiche spot) avec ligne rouge **« Maintenant »**, PM/BM annotés, toggle **Courbe / Grille**, lien Windy, carte de meilleur créneau (anneau de score « 75 · Bonne »). **C'est notre arme.** spot-de-peche a le curseur, nous on l'égale + on ajoute le perso.
- **Fil** : composer avec **Photo + Prise**, **bouton Suivre dans le fil**, pseudos/avatars cliquables, vraies photos de prises avec bandeau données mono, like/commentaire/partage. UX sociale solide.
- **Form de prise** : cartes espèces tappables, slider taille, segmenté Privée/Amis/Publique, CTA collant « Loguer la prise », **toggles coords recentrés** (le fix a shippé).
- **Profil** : insights perso **honnêtes** (« Par vent Léger — 1/1 », « Plutôt La nuit », note « Renseigne la marée… » au lieu d'inventer), **upload avatar** (changer/retirer, crop rond).
- **Copy** forte : « Strava pour pêcheurs. Sans la toxicité. ».

---

## 🔴 Critique (à régler en priorité — c'est ça qui plombe l'effet premium)

### 1. Flashs blancs / jank au scroll, sur TOUT l'app
**Écrans** : home, `/fil`, `/carnet/nouvelle`, fiche spot, `/profil` — partout.
**Constat (reproduit + vérifié)** : pendant qu'on scrolle, le contenu **flashe en blanc/crème** pendant un instant, puis « pop » après ~1-2 s. Vérifié proprement : juste après un scroll, la capture est **entièrement vide** ; après 2 s d'attente, le contenu apparaît en fondu.
**Cause probable** : (a) les **animations d'apparition au scroll** (ScrollReveal, sprint 14) se déclenchent **trop tard** (l'élément n'apparaît qu'une fois bien dans le viewport) ; (b) possible **jank de repaint** dû à l'empilement de couches fixes (header + bandeau instruments + tab bar). Ironie : l'animation censée faire « premium » fait « laggé/cassé » sur mobile.
**Reco** :
- Déclencher les reveals **plus tôt** (IntersectionObserver `rootMargin` négatif / threshold bas), ou **les désactiver sous le breakpoint mobile**, et respecter `prefers-reduced-motion`.
- **Tester le scroll sur un vrai Android milieu de gamme** (DevTools throttling ≠ ressenti réel). Vérifier qu'aucune couche fixe ne force un repaint plein écran (`will-change`, `transform: translateZ(0)` ciblés).
- Fichiers à regarder : composant ScrollReveal (sprint 14), `components/layout/AppShell.tsx`, `components/layout/AppInstruments.tsx`, `app/globals.css`.
**Acceptation** : scroller du haut en bas de la home et du fil **sans aucun écran blanc** intermédiaire, sur un vrai téléphone.

---

## 🟠 Important

### 2. Carte lente à charger (~8 s de skeleton)
**Écrans** : `/carte` (tuiles) + mini-carte des fiches spots.
**Constat** : au mount, un dégradé navy→teal s'affiche **~6-8 s** avant que les tuiles MapTiler n'apparaissent. Pour un produit **centré carte**, c'est une mauvaise première impression (et pire en 4G).
**Reco** : précharger/optimiser MapTiler (style allégé mobile, `prefetch` des tuiles autour du centre initial), vérifier le cache des tuiles, afficher un skeleton plus « carte » que dégradé, et confirmer que `map.resize()` au `load` (fix sprints 9.5/11.6) tient bien sur ce viewport. Fichiers : `components/map/MapView.tsx`, `MapShell.tsx`, `components/spots/SpotMiniMap.tsx`.
**Acceptation** : tuiles visibles **< 2,5 s** sur 4G simulée.

### 3. Image vide/cassée dans le fil
**Écran** : `/fil/06`, post @Seychi « testing ».
**Constat** : le post affiche un **grand rectangle beige vide** là où devrait être la photo (photo échouée, vide, ou URL signée non résolue). Sur un vrai tel, ça fait « cassé ».
**Reco** : **fallback gracieux** si une photo ne charge pas (placeholder mono propre, ou masquer le bloc image), + investiguer la cause (URL signée expirée/échouée, upload 0 octet, état de chargement). Fichiers : `components/feed/PostCard.tsx`, `app/actions/feed.ts` (URLs signées en batch, sprint 13).
**Acceptation** : aucun post ne montre de bloc image vide ; une photo en cours de chargement montre un skeleton, une photo échouée disparaît proprement.

### 4. Filtres `/spots` flottés à droite (espace gauche gaspillé)
**Écran** : `/spots`.
**Constat** : sur mobile, le bloc **Département / Espèce / Filtrer** est **aligné à droite** sur ~la moitié droite, toute la **moitié gauche est vide**. Déséquilibré, pas premium.
**Reco** : passer les selects + bouton en **pleine largeur** sous le breakpoint mobile (grille 1 colonne, `w-full`). Fichiers : `app/(marketing)/spots/page.tsx`, `app/(marketing)/spots/spot-filters.tsx`.

### 5. Bandeau instruments tronqué, sans indice de scroll
**Écran** : toutes les pages app (`/carnet`, `/fil`, `/profil`…).
**Constat** : le bandeau (dépt · BM · marée · vent · houle · **créneau**) **déborde** : le dernier item « ▶ 18:40 → 20:40 » est **coupé** au bord droit. Il **scrolle horizontalement** (confirmé) mais **aucune affordance** (pas de fondu, pas de chevron) → l'utilisateur ne sait pas qu'il manque des données.
**Reco** : ajouter un **fondu dégradé** au bord droit (et gauche au scroll) **ou** prioriser/condenser les items pour tenir en 390 px, **ou** un point d'indication. Fichiers : `components/layout/AppInstruments.tsx`, `components/ui-v2/instruments-bar.tsx`.

### 6. Contraste du header « Nouvelle prise »
**Écran** : `/carnet/nouvelle`.
**Constat** : le titre **« Nouvelle prise »** et le **✕** sont en **sombre sur navy sombre** → quasi illisibles.
**Reco** : passer le titre + l'icône en texte clair (teal-300 / blanc). Fichier : `components/catches/CatchForm.tsx` (header de la modale).

---

## 🟡 Polish (rapides, fort impact perçu cumulé)

### 7. Cases à cocher / radios **bleus par défaut** dans le profil
**Écran** : `/profil` (Espèces favorites, Niveau).
**Constat** : checkboxes et radios en **bleu OS par défaut** → jurent avec la charte teal/navy. Fait « formulaire générique » au milieu d'une app très soignée.
**Reco** : styliser (teal) via `accent-color` ou des composants custom. Fichier : `app/(app)/profil/profile-form.tsx`.

### 8. Onglets du fil serrés
**Écran** : `/fil`.
**Constat** : « Ton département / Tes follows / **Tous les départements côtiers** » tient à 390 px mais **le 3ᵉ label risque de déborder ≤ 360 px**.
**Reco** : raccourcir (« Toute la côte ») ou rendre la barre d'onglets scrollable horizontalement avec fondu. Fichier : `components/feed/FeedTabs.tsx`.

### 9. Titres de section surdimensionnés dans les formulaires
**Écrans** : `/profil` (« Informations », « Zone de danger »), form de prise.
**Constat** : ces titres de section sont **très grands** sur mobile → beaucoup d'espace vertical, rythme inégal.
**Reco** : réduire l'échelle des `h2` de section dans les formulaires app (≈ 18-20 px).

### 10. Visuels « mockup » de la home
**Écran** : home (« Ton année » bar chart, « Record perso / Spot fétiche »).
**Constat** : plus de badge « Exemple » (bien), mais ces visuels restent **illustratifs** (pas de vraie data). Acceptable en illustration ; à arbitrer si on veut du 100 % réel.

---

## ⚪ Non-bug à confirmer (pas côté utilisateur)

- **Pastille sombre ronde fixée au milieu-droite** sur **toutes** les pages (icône « liste »). Elle est **absente du DOM** (introuvable dans l'arbre d'accessibilité) et **pinned à la même position** quel que soit l'écran → c'est **quasi certainement la barre d'outils Vercel** (visible seulement par toi, propriétaire du déploiement), **pas** un élément produit. **À confirmer en navigation privée** (elle doit disparaître). Si par hasard c'en est un, sa position milieu-droite qui chevauche le contenu serait à revoir.

---

## 🥊 Benchmark mobile vs concurrents

| Axe mobile | Fishing Grid (app native) | spot-de-peche (web) | Nous (web/PWA) |
|---|---|---|---|
| **Fluidité scroll / perf** | ✅ natif, instantané | ~ correct | 🔴 **flashs blancs au scroll** ← notre vrai retard |
| **Vitesse carte** | ✅ native | ~ | 🟠 ~8 s au mount |
| **Data-viz marées** | ❌ générique, imprécis | ✅ curseur live | ✅ **courbe + « Maintenant » + perso** (≥ eux) |
| **Bandeau instruments** | ❌ | ❌ | ✅ unique |
| **Fil social mobile** | ✅ groupes + chat | ❌ | ✅ composer photo/prise + follow inline |
| **Scoring perso** | ❌ générique | ❌ générique | ✅ honnête + insights |
| **App shell (tab bar/FAB)** | ✅ natif | ❌ (web) | ✅ très proche du natif |

**Lecture** : sur le **contenu et la data**, on **dépasse déjà** les deux. Le seul axe où une **app native** nous bat, c'est la **sensation de fluidité brute** (scroll/carte). C'est **exactement** le point 🔴 #1. **Régler la fluidité = effacer leur dernier avantage perçu.**

---

## 🎯 Plan d'action mobile (avant toute nouvelle feature)

**Lot 1 — Fluidité (le plus gros levier perçu)**
1. Reveals au scroll : déclenchement précoce / désactivation mobile + `prefers-reduced-motion` (#1).
2. Carte : tuiles < 2,5 s + skeleton propre (#2).
3. Test scroll/perf sur vrai Android milieu de gamme (#1).

**Lot 2 — Bugs de finition visibles**
4. Fallback image fil + cause du bloc vide (#3).
5. Filtres `/spots` pleine largeur (#4).
6. Fondu/affordance bandeau instruments (#5).
7. Contraste header « Nouvelle prise » (#6).

**Lot 3 — Polish charte**
8. Checkboxes/radios teal profil (#7) · onglets fil (#8) · échelle titres formulaires (#9).

> Découpable en un **Sprint 16 — Polish mobile & fluidité** au format maison (`docs/BRIEF-TEMPLATE.md`) — un workstream « perf/scroll », un « bugs de finition », un « polish charte », + workstream VERIF (test sur device réel). À faire **avant** d'empiler de nouvelles fonctionnalités, comme demandé.

---

*Audit visuel sur prod live, mobile 390 px, connecté. Captures non jointes (session navigateur). Reproductible en rejouant les écrans listés. À confirmer : barre Vercel en navigation privée, test scroll/carte sur device physique.*
