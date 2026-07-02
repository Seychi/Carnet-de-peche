# 🧹 Audit copy — « smell IA » dans le texte du site

> **Date** : 2026-06-26
> **Périmètre** : qualité éditoriale des textes visibles uniquement (pages marketing, app, 26 fiches espèces, 6 guides MDX, emails). Pas de perf/SEO/sécurité ici — c'est couvert ailleurs (`AUDIT-2026-06-26.md` + `docs/sprint-35/BRIEF.md`).
> **Demande de John** : « beaucoup de texte avec des — typiques de l'IA partout, pas pro ».
> **Statut** : audit + plan. **Aucun fichier de code n'a été modifié.**

---

## 1. Verdict en 30 secondes

La bonne nouvelle d'abord : **ta copy est bien écrite.** Voix humaine d'expert ("LA saison du loup : les coups d'est brassent digues et embouchures"), tutoiement **100 % cohérent** (0 fuite « vous » hors pages légales), et les tics IA classiques du français (« que vous soyez », « véritable », « incontournable », « plongez dans », « votre allié », « au cœur de ») sont **quasi absents** (0 à 2 occurrences chacun, souvent légitimes).

Le problème que tu repères est réel mais c'est **un seul tic, et c'est de la ponctuation** : le **tiret long « — » en pleine phrase**, surtout la **double incise** (« Ce gadidé — cousin de la morue — vit collé… »). C'est LA signature la plus reconnaissable d'un texte généré, et elle est partout.

| Indicateur | Chiffre |
|---|---|
| Tirets « — » en prose **à corriger** (Tier 1) | **~557 occurrences / 108 fichiers** |
| dont **doubles incises** (« — x — », signal le plus fort) | **54 lignes / 30 fichiers** |
| Concentration n°1 : **26 fiches espèces** (`lib/especes/content/`) | **327 occ.** |
| Concentration n°2 : **6 guides MDX** (`content/guides/`) | **75 occ.** |
| Tirets **légitimes à NE PAS toucher** (placeholders, titres, code, ranges) | **~434 occ.** |

**Conclusion** : ce n'est PAS un chantier de réécriture. C'est un **nettoyage de ponctuation ciblé**, fiche par fiche, en gardant le fond intact. Comptable en quelques sessions.

---

## 2. ⚠️ À NE PAS toucher (anti-faux-pas)

Sur plus de **1 000 tirets « — »** présents dans le repo, **~434 sont parfaitement légitimes et professionnels**. Un `chercher-remplacer` aveugle « — » → autre chose **casserait le site et l'UI**. À préserver absolument :

| Usage légitime | Exemple réel | Pourquoi on garde |
|---|---|---|
| Placeholder « donnée vide » | `value ?? '—'`, `<span>—</span>` | Convention UI standard et propre |
| Séparateur de `<title>` | `title: 'Ton abonnement — Carnet de Pêche'` | Convention SEO universelle |
| Commentaires de code | `{/* Stats — 4 cartes */}` | Invisible pour l'utilisateur |
| Libellés structurés | `'29 — Finistère'` (filtre dept), `'— 10 m'` (bathy) | Donnée tabulaire, pas de la prose |
| Ranges de couleurs/échelles | `10–29` dans une rampe MapLibre | Technique |

👉 **Règle d'or de l'exécution : on relit chaque phrase en contexte, jamais de regex aveugle.**

---

## 3. Le problème en détail : le tiret « — » en prose

### 3.1 Pourquoi ça « fait IA »
En français soigné, on n'utilise quasiment jamais le tiret cadratin « — » comme pause dramatique au milieu d'une phrase. On utilise la virgule, les parenthèses, les deux-points ou le point. Le « — » à toutes les sauces — et surtout la **double incise** — est devenu le marqueur visuel n°1 du texte généré. C'est exactement ce que ton œil détecte.

### 3.2 Inventaire par surface (Tier 1 — à corriger)

| Surface | Occ. | Fichiers | Priorité |
|---|---:|---:|---|
| **Fiches espèces** `lib/especes/content/*.ts` | 327 | 26 | 🟠 Cœur SEO (le gros) |
| **Guides éditoriaux** `content/guides/*.mdx` | 75 | 6 | 🟠 Cœur SEO |
| **Autres composants UI** `components/**` | 63 | 38 | 🟡 Long traîne |
| **Pages marketing publiques** `app/(marketing)/**` | 54 | 17 | 🔴 Vitrine (vu en premier) |
| **Composants home/marketing** `components/marketing`, `components/home` | 19 | 8 | 🔴 Vitrine |
| **Emails transactionnels** `emails/**` | 11 | 6 | 🟡 |
| **UI app connectée** `app/(app)/**` | 8 | 7 | 🟡 |

> Note d'honnêteté sur la précision : ce ~557 inclut une petite marge de cas **limites/stylistiques** (numéros de section « 01 — Le moat », libellés de CTA « Créer mon carnet — gratuit », ~16 tirets dans la CGU qui est du texte légal). On les arbitre au Lot 6. L'ordre de grandeur et la répartition, eux, sont solides.

### 3.3 La signature à tuer en priorité : la double incise (54 lignes / 30 fichiers)

C'est le motif le plus reconnaissable. Exemples **réels** du repo avec la correction proposée :

**Accueil** (`app/(marketing)/page.tsx`, très visible) :
> ❌ « Le carnet apprend tes patterns — marée, marnage, vent, heure — et te dit… »
> ✅ « Le carnet apprend tes patterns (marée, marnage, vent, heure) et te dit… »

**Hero** (`components/marketing/home-v3/Hero.tsx`) :
> ❌ « …traitée comme un instrument de précision — pas comme un lac. »
> ✅ « …traitée comme un instrument de précision, pas comme un lac. »

**Fiche lieu jaune** (`lib/especes/content/lieu-jaune.ts`) :
> ❌ « Ce gadidé — cousin de la morue — vit collé aux structures… »
> ✅ « Ce gadidé, cousin de la morue, vit collé aux structures… »

> ❌ « Le vif — lançon en tête — présenté en dérive… »
> ✅ « Le vif (lançon en tête) présenté en dérive… »

**Section communauté** (`components/marketing/home-v3/HomeSections.tsx`) :
> ❌ « …follows, co-pêchage — gratuit, sans pub, sans paywall. »
> ✅ « …follows, co-pêchage : gratuit, sans pub, sans paywall. »

---

## 4. Règles de réécriture (le « comment »)

Selon le rôle que joue le tiret dans la phrase :

| Le tiret sert à… | Remplacement FR correct | Exemple |
|---|---|---|
| **Apposition / incise** (le plus courant) | virgules, ou parenthèses si vraiment secondaire | « Ce gadidé, cousin de la morue, vit… » |
| **Introduire une explication / une liste** | deux-points `:` | « il se mérite : 8 à 15 m d'eau, l'aube, un leurre lent. » |
| **Aside léger en fin de phrase** | virgule | « …identique pour tous, tes tendances perso vivent dans ton carnet. » |
| **Rupture forte** | point (deux phrases) | « …apprend ton historique. Et te dit quand sortir. » |

> ⚠️ **Piège à éviter** : ne PAS remplacer tous les « — » par des « : ». Ça crée juste un nouveau tic (la sur-ponctuation au deux-points). On varie virgule / parenthèses / point / deux-points selon le sens. La cible, c'est que ça se lise comme écrit par un pêcheur, pas par une machine.

---

## 5. Autres signaux (mineurs, pour être complet)

- **Flèches « → » en microcopy** : quelques cas visibles, ex. « Sorti bredouille ? → ». Cosmétique, plutôt acceptable comme affordance de lien. À arbitrer au Lot 6, pas urgent.
- **Coches « ✓ »** : légitimes (badges « ✓ Vérifié »), on garde.
- **Tics IA lexicaux classiques** : **quasi absents** — rien à faire. C'est ce qui sauve la copy.
- **Tutoiement** : **0 fuite** « vous/votre/vos » hors pages légales. Nickel, on n'y touche pas.

---

## 6. Plan de correction priorisé (par lots)

Ordre conseillé : la vitrine d'abord (impact immédiat, peu de volume), puis le gros SEO.

| Lot | Contenu | Volume | Effort | Pourquoi cet ordre |
|---|---|---:|---|---|
| **Lot 0** | Figer la règle de style + garde-fou anti-récidive (cf §7) | — | 15 min | Pour ne pas réintroduire le tic ensuite |
| **Lot 1 — Vitrine** 🔴 | Home (`Hero`, `HomeSections`), pages `(marketing)` publiques, `tarifs`, `especes` (index), `fil`, `spots` | ~73 occ | ~45 min | C'est ce qu'un visiteur voit en premier |
| **Lot 2 — Fiches espèces** 🟠 | 26 fichiers `lib/especes/content/*.ts` | 327 occ | ~2-3 h | Le gros morceau + cœur SEO face à Fishing Grid |
| **Lot 3 — Guides** 🟠 | 6 `content/guides/*.mdx` | 75 occ | ~45 min | Cœur SEO long-format |
| **Lot 4 — Emails** 🟡 | 6 templates `emails/` | 11 occ | ~15 min | Touche les abonnés payants |
| **Lot 5 — UI app + composants** 🟡 | `app/(app)` + `components/**` (hors marketing) | ~71 occ | ~1 h | Long traîne, peu visible |
| **Lot 6 — Arbitrages** | CGU (légal), libellés de section « 01 — », CTA, flèches « → » | ~50 occ | ~20 min | Cas limites, décision au cas par cas avec toi |

**Méthode d'exécution proposée** (quand tu lances un lot) :
1. Je relis chaque chaîne de copy **en contexte**, je remplace selon les règles du §4 (jamais de regex aveugle).
2. Je préserve strictement les usages légitimes du §2.
3. Je te montre le **diff du lot** pour relecture. **Pas de push sans ton OK** (règle CLAUDE.md §13).
4. `pnpm build` + `vitest` après chaque lot touchant du `.ts/.tsx` pour zéro régression.

---

## 7. Garde-fou anti-récidive (Lot 0)

Sinon le tic reviendra au prochain contenu généré. Deux options, cumulables :

1. **Règle de style** notée dans `CLAUDE.md` : « Jamais de tiret cadratin « — » dans une chaîne de copy visible, sauf placeholder de donnée vide et séparateur de `<title>`. Utiliser virgule / parenthèses / deux-points / point. »
2. **Check automatisé** : étendre le hook `lint-changed` existant (CLAUDE.md §20.4) ou ajouter un petit script de lint custom qui **signale** un « — » dans une chaîne JSX/template (hors patterns autorisés) sur les fichiers modifiés. Avertissement, pas blocage, pour rester souple.

> À noter : le skill `video-courte-peche` et tout futur contenu généré (fiches, guides, scripts) doivent suivre la même règle, sinon on rejoue l'audit dans 3 mois.

---

## 8. Prochaine étape

Dis-moi simplement **« go lot 1 »** et je nettoie la vitrine en premier, diff à l'appui, sans rien pousser. On enchaîne lot par lot à ton rythme. Si tu préfères attaquer direct le gros (les 26 fiches espèces), dis **« go lot 2 »**.

---

*Audit produit le 2026-06-26. Chiffres issus d'un scan classifié (placeholders / titres / commentaires / ranges exclus). Aucune modification de code effectuée — ce document est un plan.*
