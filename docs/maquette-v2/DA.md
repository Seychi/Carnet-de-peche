# Direction artistique v2 — « Instrument de précision marine »

> Rédigé le 2026-06-11. Contexte : refonte visuelle complète décidée par John après comparaison avec fishing-grid.fr (v2.0 design, juin 2026).
> ✅ **VALIDÉE PAR JOHN le 2026-06-11** (y compris le volet mobile-first, `mobile.html` = référence produit). Prête pour l'implémentation au sprint 10.5.
> Maquettes : `docs/maquette-v2/*.html` (ouvrables directement dans un navigateur, CSS partagé `assets/style.css`).
> Implémentation : **ne pas coder pendant le sprint 10** (conflits). Sprint 10.5 dédié, cf §6.

---

## 1. Le diagnostic en 3 lignes

Le site actuel a une bonne copy et une bonne structure, mais une exécution visuelle de maquette pré-sprint 1 : sections plates, emojis en guise d'icônes, mockups simplistes, pas de hiérarchie typographique forte. Fishing Grid vient de sortir une v2 très éditoriale (sections numérotées, micro-données, sobriété). On ne les copie pas : on prend une position visuelle qu'eux ne peuvent pas tenir — **l'instrument de précision**.

## 2. Le concept

Fishing Grid = chaleureux, artisanal, généraliste. Nous = **la précision marine**. Le site doit ressembler à ce que le produit promet : un instrument fiable — carte marine SHOM, montre de marée, station météo. Chaque écran respire la donnée exacte : coordonnées, coefficients, horaires PM/BM à la minute.

**4 principes :**
1. **Mobile-first, toujours.** Le produit final est une app mobile (PWA sprint 11, natif sprints 12-19) utilisée au bord de l'eau : une main, plein soleil, doigts mouillés. Chaque écran se conçoit en 390 px d'abord, le desktop est l'adaptation — jamais l'inverse. Contrastes élevés (soleil), tap targets ≥ 44 px, actions clés dans la zone du pouce.
2. **La donnée est l'ornement.** Pas de décoration gratuite : ce qui décore, ce sont les courbes de marée, les isobathes, les coordonnées GPS, les coefficients. Tout élément décoratif doit pouvoir être lu.
3. **Sobre comme une carte marine.** Fonds clairs sable, encres profondes, UN accent teal. Le blanc espace, la typo hiérarchise. Jamais plus de 2 couleurs d'accent par écran.
4. **Le tutoiement pêcheur, l'exécution suisse.** La voix reste chaleureuse et directe ; le pixel est rigoureux (grille 4px, alignements stricts, radius cohérents).

## 3. Tokens (v2 — évolution, pas révolution)

On garde l'ADN (navy/teal/sand) — le logo et la prod en dépendent — mais on étend l'échelle et on ajoute la signature mono.

### Couleurs

```css
/* Encres & fonds */
--navy-950: #04141C;   /* fonds sombres profonds (hero, footer) */
--navy-900: #0A2F3D;   /* primaire (inchangé) */
--navy-800: #0E3D4F;
--navy-700: #155A73;
--ink-900:  #0E1A22;   /* texte (inchangé) */
--ink-600:  #44545E;   /* texte secondaire */
--ink-400:  #7E8C95;   /* texte tertiaire, légendes */
--sand-50:  #FBF8F2;   /* fond clair (inchangé) */
--sand-100: #F4EEE0;   /* fond de section alterné */
--sand-200: #E8DFCB;   /* bordures sur sable */
--white:    #FFFFFF;

/* Accents */
--teal-600: #0E9488;
--teal-500: #14B8A6;   /* accent principal (inchangé) */
--teal-300: #5EEAD4;   /* accent sur fond sombre */
--gold-500: #D9A53C;   /* score exceptionnel, badges premium — NOUVEAU */
--coral-500:#E5604F;   /* alertes, signal fort, marée descendante — NOUVEAU, parcimonie */

/* Sémantique score (carte, créneaux) */
--score-low:  var(--ink-400);
--score-mid:  var(--gold-500);
--score-high: var(--teal-500);
```

### Typographie

| Usage | Fonte | Note |
|---|---|---|
| Display / titres | **Space Grotesk** 500-700 | inchangé, mais plus grand : h1 marketing 56-72px, tracking -2% |
| UI / corps | **Inter** 400-600 | inchangé |
| **Données** | **JetBrains Mono** 400-500 | **NOUVEAU — la signature.** Coords GPS, coefs, horaires PM/BM, tailles, stats. Toujours en mono, souvent uppercase 11-12px letterspacing +8% |

La règle : **un chiffre métier = du mono.** C'est ce qui rend l'interface « instrument ».

### Géométrie

- Radius : 8 / 14 / 22 / 32 (inchangés)
- Spacing : grille 4px (inchangé), sections marketing 96-128px de respiration verticale
- Bordures : 1px `--sand-200` sur clair, 1px rgba(blanc 10%) sur sombre. **Les bordures remplacent 80% des ombres.**
- Ombres : 2 niveaux max (`--shadow-sm` cartes, `--shadow-lg` éléments flottants), jamais de drop-shadow lourd

## 4. Composants signature (visibles dans les maquettes)

1. **Isobathes** (`.bathy`) : lignes de niveau bathymétriques en SVG, en fond de hero et de sections sombres. NOTRE motif identitaire — carte marine, pas vague générique.
2. **Étiquette mono** (`.tag-data`) : `47.8709°N · 4.3741°O`, `COEF 88`, `PM 06:42` — micro-données partout où c'est pertinent.
3. **Courbe de marée** (`.tide`) : sparkline SVG avec curseur « maintenant », réutilisée du hero à la fiche spot. L'élément le plus différenciant du produit, donc omniprésent.
4. **Anneau de score** (`.score-ring`) : score spot 0-100 en anneau SVG, couleur sémantique. Sur carte, fiches spots, cards.
5. **Sections numérotées** (`01 — Le carnet`) : structure éditoriale des pages marketing.
6. **Header d'app à instruments** : dans l'app connectée, le header affiche en permanence marée/coef/créneau du jour de TON département (mono). L'app « sait toujours où en est la mer ».
7. **Cards à liseré** : card blanche, bordure fine, liseré teal 3px à gauche pour les éléments « live » (activité récente, créneau en cours).

### Patterns mobiles (maquette `mobile.html` — la référence pour PWA + Expo)

8. **Tab bar 5 entrées + FAB central « + »** : Carnet · Carte · **Loguer** (bouton teal central surélevé, l'action n°1 du produit, accessible au pouce) · Fil · Profil. Identique en PWA et en natif — l'utilisateur ne réapprend rien au passage à l'app.
9. **Bandeau instruments condensé** : la version mobile du header instruments — une ligne mono compacte (dépt · PM · coef · créneau) toujours visible sous la status bar. C'est l'écran de la montre de marée.
10. **Bottom sheets, pas de modales** : fiche spot depuis la carte, filtres, composer — tout monte du bas (zone du pouce), avec poignée de drag. Les modales plein écran sont réservées au flow « Loguer ».
11. **Flow « Loguer » en 3 taps** : photo (GPS + conditions auto-captées) → espèce (chips) → enregistrer. Taille/poids/visibilité optionnels après coup. Le log doit être possible avec les mains mouillées en moins de 20 secondes.
12. **Hiérarchie d'écran mobile** : 1 idée par écran ; le scroll vertical est OK, le scroll horizontal interdit (sauf chips). Les stats détaillées passent derrière un tap, jamais en surcharge du premier écran.

## 5. Ce qu'on ne fait PAS

- ❌ Copier la mise en page de Fishing Grid (leurs sections « 01 — », on garde la numérotation mais traitement différent : à nous les isobathes + mono + courbes)
- ❌ Emojis comme icônes (remplacés par pictos ligne 1.5px, style Lucide — déjà dans la stack)
- ❌ Illustrations cartoon / stock photos génériques. Photos réelles de prises (quand on en aura) ou data-viz, rien entre les deux
- ❌ Dark mode complet (backlog — les tokens le permettront)
- ❌ Changer logo/nom/tagline

## 6. Plan d'implémentation (après validation des maquettes)

**Sprint 10.5 — Refonte UI (1 semaine, dès le merge du sprint 10)** :
1. `app/globals.css` : nouveaux tokens (+ JetBrains Mono via `next/font`)
2. Composants partagés : `tag-data`, `score-ring`, `tide-sparkline`, sections, cards (shadcn re-themé)
3. Pages marketing : home, tarifs, guides, fiches espèces (les pages SEO du sprint 10 naissent directement en v2)
4. App connectée : carnet, carte, fil, fiche spot, profil, **onboarding** (cf `onboarding.html`, validé 2026-06-11, incl. nouvel écran final « carnet prêt ») — héritent des tokens, ajustements écran par écran

Estimation : 4-5 j Claude Code + validation John écran par écran. Les pages du sprint 10 (guides, fiches espèces) seront livrées avec l'ancienne DA puis re-skinnées — coût accepté pour ne pas bloquer le SEO.

## 7. Index des maquettes

| Fichier | Écran | Type |
|---|---|---|
| `mobile.html` | **5 écrans mobiles** (carnet, carte+sheet, spot, fil, loguer) — **la référence produit** | App mobile |
| `onboarding.html` | Onboarding 6 étapes + écran final « carnet prêt » (mobile-first) | App mobile |
| `index.html` | Home marketing | Marketing |
| `tarifs.html` | Tarifs (3 plans, social gratuit intégré) | Marketing |
| `espece.html` | Fiche espèce (bar) — format Bloc 3 sprint 10 | Marketing/SEO |
| `carnet.html` | Carnet (liste + stats) | App |
| `carte.html` | Carte + panneau spot | App |
| `spot.html` | Fiche spot (marées, météo, créneaux, activité) | App |
| `fil.html` | Fil départemental | App |
| `profil.html` | Profil public | App |
