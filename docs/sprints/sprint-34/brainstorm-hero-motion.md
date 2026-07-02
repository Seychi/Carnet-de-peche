# 🧠 Brainstorm — direction hero & motion (refonte home, sprint 34)

> Passe de design réalisée le 2026-06-25 (équivalent `/brainstorm` superpowers). Cadre : **tout en réel** (marées, score, carte MapLibre, activité) + **motion la plus avancée** + perf maîtrisée. But : figer le parti pris hero/motion avant WS-1.

---

## 1. Quatre directions de hero (divergence)

**H1 — « L'instrument vivant »**
L'instrument (courbe de marée réelle + anneau de score + tags coords/coef) est LE point focal, grand, qui se dessine avec les vraies données. Isobathes en parallaxe derrière.
- Motion : entrée GSAP, scrub léger des isobathes, point « maintenant » live.
- Tout-réel : ✅ (vraie marée du jour). Perf/LCP : ✅✅ (le plus sûr). Effort : moyen.
- Verdict : la **valeur sûre**, très on-brand « instrument de précision ». Manque un peu de « waouh » seul.

**H2 — « La profondeur » (WebGL)**
Hero plein cadre en WebGL : surface de mer / caustiques / dégradé de profondeur avec particules, l'instrument flotte dedans.
- Motion : shader animé + parallaxe.
- Tout-réel : ⚠️ (ambiance, pas donnée). Perf/LCP : ⚠️⚠️ (lourd, fallback mobile obligatoire). Effort : élevé.
- Verdict : le plus **cinématique**, mais coûteux et moins « produit ».

**H3 — « Le produit d'emblée » (carte en hero)**
La vraie carte MapLibre EST le fond du hero (fly-to une façade, markers de score qui éclosent), instrument en overlay.
- Motion : animation de caméra carte + bloom des markers.
- Tout-réel : ✅✅✅ (montre le produit tout de suite). Perf/LCP : ⚠️⚠️ (MapLibre en haut = JS lourd au-dessus de la ligne de flottaison). Effort : élevé.
- Verdict : le plus « montre ce que le site propose », mais **risque LCP** majeur si mal fait.

**H4 — « Le scrollytelling » (hero épinglé qui se transforme)**
Hero `pin` + `scrub` GSAP : on traverse un récit en scrollant — aube/mer → l'instrument se compose → la carte se révèle → tes tendances.
- Motion : timeline pin/scrub = **le plus avancé**.
- Tout-réel : ✅✅ (instrument + carte réels intégrés au récit). Perf/INP : ⚠️ (complexe, doit être impeccable + reduced-motion + mobile). Effort : élevé+.
- Verdict : le plus **spectaculaire** et le plus dans l'esprit « meilleur rendu ».

---

## 2. Parti pris motion (convergence transverse)

- **Lenis (smooth scroll)** = colonne vertébrale du ressenti premium.
- **« La donnée se dessine »** = notre signature : courbe de marée qui se trace, anneau de score qui se remplit, compteurs, isobathes en parallaxe. C'est déjà notre ADN — on l'amplifie, on ne le remplace pas.
- **Retenue maîtrisée** : 1 à 2 moments « waouh » scrubbés (le hero, la carte) ; le reste = révélations sobres. Le premium, ce n'est pas un gadget par section.
- **Détails** : CTA magnétiques, halo curseur (fond sombre), bloom des markers sur la carte, micro-parallaxe.
- **Garde-fous non négociables** : SSR pour le LCP (texte + 1re frame), effets après hydratation + lazy, `prefers-reduced-motion` coupe tout, dégradé mobile.

## 3. WebGL : oui, mais à quelle dose ?

- **Pour** : rendu maximal, différenciation, « effet 1M€ ». Figma expose `get_shader_fill` / `get_shader_effect` → on peut sourcer un shader propre.
- **Contre** : LCP/INP, perf mobile, poids JS, maintenance.
- **3 niveaux** :
  1. **Aucun** — Canvas2D/SVG animé. Perf max, rendu déjà très bon.
  2. **Accent léger (recommandé)** — un **shader-fill de profondeur/caustiques DERRIÈRE l'instrument** (GPU-cheap), avec **fallback gradient statique** + **off sur mobile/reduced-motion**. 80 % de l'effet « waouh » pour 20 % du risque.
  3. **Plein (desktop-only)** — mer WebGL complète (Three.js), **hero statique sur mobile**. Rendu ultime, effort/perf max.

## 4. Recommandation (convergence)

**Hybride H4 + H1 + accent WebGL niveau 2, carte en payoff (pas en hero).**
- **Hero = scrollytelling épinglé (H4)** dont l'**ancre est l'instrument réel (H1)** qui se compose avec les vraies marées du jour ; **shader-fill de profondeur (niveau 2)** derrière, fallback + off mobile.
- **La vraie carte MapLibre arrive en section 02** (le « payoff produit »), **lazy** sous la ligne de flottaison → on garde le côté « tout réel / montre le produit » (H3) **sans tuer le LCP**.
- Mobile : le hero épinglé se simplifie (pas de pin lourd), shader off, instrument réel + entrée animée + CTA collant.

Pourquoi : c'est **le plus avancé** (pin/scrub + smooth scroll), **100 % réel** (instrument + carte live), et **perf-safe** (WebGL en accent, carte lazy). On vise le meilleur rendu sans sacrifier le mobile.

## 5. Décisions à converger (pour John)

1. **Structure du hero** : scrollytelling épinglé (recommandé) / instrument sobre / carte en hero ?
2. **Intensité WebGL** : accent léger (recommandé) / plein desktop-only / aucun ?

(La carte en **section 02 lazy** est posée comme défaut — dis si tu la veux quand même en hero.)

---

*Ces choix alimentent directement WS-3 (hero) et WS-1 (fondations motion) du `BRIEF.md`. Une fois tranchés, je mets à jour le brief + on peut sourcer le shader/motion via Figma (`get_motion_context`, `get_shader_fill`).*

---

> **Décision John 2026-06-25** : H3 (carte MapLibre en hero) + WebGL **plein** (mer). Réconcilié en *carte vivante* (mer = custom layer GL du map, LCP poster, mobile allégé). Détail dans `BRIEF.md` WS-1/WS-3/WS-4.
