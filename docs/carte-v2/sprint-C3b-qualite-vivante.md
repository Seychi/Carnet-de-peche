# Sprint Carte-v2 / C3b — Brief d'exécution
## Couche « QUALITÉ » VIVANTE — là où on les dépasse

> Rédigé le 2026-06-22. Épique **Carte v2 — AVANT la beta** (cf `docs/excellence/CARTE-V2.md` ; décision John 2026-06-22). Durée : 1,5-2 semaines.
> **Le point clé de toute l'épique** : spot-de-peche affiche une « Qualité : Excellent » **figée et opaque** (même pour tous, boîte noire). La nôtre est **vivante, par espèce, et transparente** — elle combine la donnée (C3a) **+ la communauté (C1) + toi**, et elle **explique pourquoi**. C'est ça qui fait paraître la leur plate.

**Préalable** : **C1 (carte vivante)** et **C3a (bathy/fond)** livrés — C3b les combine. Décision tier (probablement Itinérant pour la version complète).

---

## 🚀 Ligne de lancement
> ultracode — effort xhigh. Exécute `docs/carte-v2/sprint-C3b-qualite-vivante.md`. **Connecté** : **supabase-guard** (RO) pour les sources de données (catches agrégés C1 + bathy C3a + spot_scores) AVANT la RPC de scoring ; **docs-researcher** MapLibre ; **qa-chrome** pour le rendu + le popup explicatif. `/verif-sprint` + deploy-watch. Ne push pas. Docker optionnel. **Effort max, esprit critique.** Garde-fou n°1 : **honnêteté du score** — pas de multiplicateur fabriqué (décision sprint 7.5) ; la « qualité » doit être **décomposable et défendable**.

## ⚙️ Environnement & posture (exigence John)
Docker optionnel. Effort max + esprit critique : un score qu'on ne sait pas expliquer ne sort pas ; `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

---

## Objectif du sprint en une phrase
La carte affiche une couche **« qualité »** colorée **par espèce**, calculée à partir de la donnée + des prises communautaires + de ton historique, et le popup **explique** la note (« Excellent : fond adapté + 12 prises récentes + tes meilleures conditions »).

## Workstreams & dépendances
| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Définir + calculer le score « qualité » (décomposable) | 2-3 j | C1 + C3a | ❌ |
| B | Couche « qualité » colorée (par espèce) | 1,5 j | A | ❌ |
| C | Popup explicatif (le « pourquoi ») — notre edge | 1,5 j | A | ❌ |
| D | Sélecteur de couches final + tier + perf | 1 j | B, C | ❌ |
| VERIF | honnêteté + perf + `/verif-sprint` | 1 j | tous | ❌ (dernier) |

---

## Bloc A — Le score « qualité » (transparent, par espèce)
La « qualité » d'une cellule pour une espèce = combinaison **décomposable** de :
1. **Suitability donnée** (C3a) : la profondeur + le fond conviennent-ils à l'espèce/technique ? (ex. dorade royale = sable/vase, bar = roche/structure).
2. **Signal communautaire** (C1) : densité de prises publiques récentes de cette espèce dans la cellule (k-anonymat respecté).
3. **Perso** (optionnel, si historique) : la cellule matche-t-elle **tes** meilleures conditions ? (scoring perso, descriptif).

### Tâches
1. RPC/MV `get_quality_cells(bbox, zoom, species, days)` → par cellule : `{score 0-100, components: {data, community, perso}}`. **Garder les composantes** (pour le popup).
2. Pondération simple et documentée (pas de boîte noire). Sans donnée d'une composante → le dire (ne pas inventer).

### Critères d'acceptation
- Le score est **reproductible** et **décomposable** (les 3 composantes sortent de la RPC).
- Changer d'espèce change la carte (la qualité est par espèce, pas générique).

### Garde-fous
- ⚠️ **Honnêteté (sprint 7.5)** : aucune affirmation non démontrable ; si la composante perso manque, on l'omet, on ne la simule pas.

## Bloc B — Couche colorée
### Tâches
1. Couche MapLibre « qualité » (cellules colorées high/mid/low selon le score, tokens sémantiques DA : teal/gold/ink) — le rendu « grille colorée » de leur capture, mais **par espèce et vivant**.
2. Sélecteur d'espèce dédié à cette couche.

### Critères d'acceptation
- Visuellement clair (légende), distinct de la heatmap brute (C1).

## Bloc C — Popup explicatif (notre différenciateur)
### Tâches
1. Au clic : popup « **Qualité : Excellent** » **+ le pourquoi** : « Fond adapté (sable, 6 m) · 12 prises de dorade ces 30 j · correspond à tes meilleures sorties ». C'est exactement ce que spot-de-peche **ne montre pas** (eux = juste « Excellent »).
2. Lien vers la fiche spot si un spot curé est dans la cellule.

### Critères d'acceptation
- Le popup montre la **décomposition**, pas juste une note. Sans donnée → mention honnête.

## Bloc D — Sélecteur final + tier
### Tâches
1. Finaliser le sélecteur de couches : **Spots · Heatmap communautaire · Ton score · Profondeur · Fond · Qualité**.
2. Gating tier (qualité complète = Itinérant ; aperçu pour upsell). Via `current_tier`.

### Critères d'acceptation
- Toutes les couches s'activent indépendamment ; gating propre ; perf OK (lazy).

## Workstream VERIF
1. `/verif-sprint` + qa-chrome.
2. **Passe honnêteté** (la plus importante) : chaque note « qualité » est justifiée par ses composantes ; aucune invention ; cohérence sprint 7.5 ; k-anonymat (C1) préservé.
3. Perf carte multi-couches (device réel) : pas de régression.
4. `docs/carte-v2/RECAP-C3b.md`.

## Reste manuel John
- Pondération du score (arbitrage), décision tier, déploiement.

---

## 🏁 Fin de l'épique « Carte v2 »
Après C1+C2+C3a+C3b : une carte **vivante** (réagit aux prises), **profonde** (bathy/fond comme eux) et **plus intelligente** (qualité décomposée, par espèce, communautaire + perso) — sur un fonds de **1000+ spots** multi-sources. Leur carte, à côté, paraît figée. C'est le but.
