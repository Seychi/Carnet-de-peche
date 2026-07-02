# Sprint 29 — Brief d'exécution
## Pôle Espèces v2 — +6 espèces du bord (profondes + sourcées + maillées)

> Rédigé le 2026-06-24 (recréé après ajustement). Durée cible : ~1-1,5 semaine (éditorial soutenu).
> Contexte : audit `docs/audits/AUDIT-UX-2026-06-24.md` (§5 gap espèces) + `docs/audits/AUDIT-POST-S28-2026-06-24.md` + roadmap `docs/ROADMAP-2026-H2-SUITE.md` + standard fiches du sprint 23 (`lib/especes/content/*`).
> Décisions John 2026-06-24 : étendre le catalogue (barracuda cité explicitement) ; profondeur > quantité (pas les 266 fiches creuses de Fishing Grid) ; **illustrations d'espèces REPORTÉES** (cf `docs/sprint-28/species-illustrations-lot.md`) → **aucun visuel produit ce sprint**.
> Périmètre : **éditorial + référentiel + SEO**. **Pas de migration** (espèces = `dbKey` texte libres, pas un enum Postgres — à confirmer via supabase-guard). Pas de RLS. **Pas d'illustrations.**

**Sur les visuels (important)** : les illustrations par espèce sont un **lot d'assets reporté** (`docs/sprint-28/species-illustrations-lot.md`, déco John). Les 6 nouvelles fiches gardent l'**icône générique `<Fish>`** comme les 20 actuelles. On ne produit ni glyph ni illustration ici — les 6 nouvelles s'ajouteront simplement au périmètre du lot quand il sera lancé (le futur `SpeciesArt.tsx` a un fallback `<Fish>` → elles seront couvertes sans page cassée).

**⚠️ Confirmation rapide John (au lancement)** : liste des 6 retenue = **barracuda, tassergal, liche, marbré, lieu noir, merlan** (issue de l'audit web-sourcé). Si John veut substituer/ajouter (ex. bar moucheté), le dire avant le Bloc 0.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-29/BRIEF.md`. Commence IMPÉRATIVEMENT par le Bloc 0 (recherche réglementaire sourcée + datée) — aucune fiche ne s'écrit avant d'avoir les chiffres vérifiés. Puis Bloc 1 (référentiel), puis Bloc 2 (fiches, un agent par 2 espèces) en parallèle du Bloc 3 (chinchard), puis Bloc 4 (maillage/SEO), et termine par VERIF. Sois critique : ne recopie PAS les chiffres de ce brief sans les re-vérifier sur Légifrance/DIRM, et n'invente JAMAIS une maille — « pas de taille réglementaire en France » est une réponse valide. Pas d'illustrations ce sprint. Ne push pas.

---

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Recherche réglementation (maille/quota/fermeture par façade) | **docs-researcher** (web) → Légifrance, DIRM, FFPSA | Chiffres SOURCÉS + DATÉS. Aucune valeur de mémoire. |
| Vérifier l'absence d'enum DB espèces + le maillage spot↔espèce (RPC `get_top_spots_for_species`, colonne `text[]`) | **supabase-guard** → Supabase (RO) | Confirmer « pas de migration » ; comprendre le tagging avant de seeder. |
| Patterns Next 15 (metadata, JSON-LD, og:image) | **docs-researcher** → Context7 | og:image + Breadcrumb version-corrects. |
| QA des fiches (desktop + mobile) | **qa-chrome** | Rendu, maillage, score espèce. |
| Clôture | **`/verif-sprint`** | Tests (dont cohérence réglementation) + build + lint + revue. |

---

## Objectif du sprint en une phrase

**26 fiches espèces en ligne** (20 + 6), chacune profonde + réglementation sourcée/datée + score espèce + top spots + og:image — **zéro maille inventée, zéro doublon** (et zéro illustration : reportée).

---

## Workstreams & dépendances

| WS | Bloc(s) | Durée | Dépend de | Parallélisable jour 1 |
|----|---------|-------|-----------|----------------------|
| 0  | Bloc 0 (recherche régl.) | 1 j | — | ✅ (à faire en premier, bloquant) |
| A  | Bloc 1 (référentiel) | 0,5 j | Bloc 0 | ❌ après Bloc 0 |
| B  | Bloc 2 (6 fiches profondes) | 3-4 j | Bloc 1 | ✅ (1 agent / 2 espèces) |
| C  | Bloc 3 (chinchard sévereau) | 0,5 j | — | ✅ |
| D  | Bloc 4 (maillage + SEO) | 1 j | B | ❌ |
| VERIF | revue finale | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc 0 — Recherche réglementaire (BLOQUANT exactitude — à faire AVANT toute fiche)

Pour les 6 espèces, établir la **donnée réglementaire FR sourcée + datée**, par façade (`manche-atlantique`, `mediterranee`) : maille (cm) ou **absence de maille nationale**, quota journalier, fenêtre de fermeture/no-kill, marquage caudal obligatoire (oui/non).

> **Connecteurs** : **docs-researcher** (web) → arrêté national 26/10/2012 modifié, DIRM façades, FFPSA, Parc marin Golfe du Lion. Pour chaque chiffre : URL + date de consultation (`verifiedAt`).

### Données de départ (À RE-VÉRIFIER, ne pas recopier aveuglément)
| Espèce (slug) | Latin | Façade(s) | Technique du bord | Maille FR (à vérifier) | Marquage |
|---|---|---|---|---|---|
| barracuda | *Sphyraena* sp. | mediterranee | leurre dur, vif | **pas de maille nationale** | non |
| tassergal | *Pomatomus saltatrix* | med (+ atl) | leurre surface, surfcasting, vif | **pas de maille/quota/fermeture** | non |
| liche | *Lichia amia* | mediterranee | popper, surfcasting, vif | **pas de maille nationale** | non |
| marbre | *Lithognathus mormyrus* | med (+ atl SO) | surfcasting plage (ver) | **20 cm (Med)** ; null Manche/Atl | non |
| lieu-noir | *Pollachius virens* | manche-atlantique | leurre digue, à soutenir | **35 cm** | **oui** (caudale) |
| merlan | *Merlangius merlangus* | manche-atlantique | surfcasting hiver | **27 cm** | non |

### Critères d'acceptation
- Pour chaque espèce : `verifiedAt` (JJ/MM/AAAA), `source` (arrêtés cités), `minSizeCm` par façade (avec **`null` honnête** là où pas de maille / espèce absente), `marquage`, `dailyQuota`, `closedWindows` — **chaque valeur adossée à une URL**.
- Livrable consigné dans `docs/sprint-29/regulation-research.md` (table sourcée) — c'est l'INPUT unique des Blocs 1 et 2.

### Garde-fous
- ⚠️ **Ne jamais inventer une maille.** Sans maille nationale → `null` + le texte de fiche dit explicitement « pas de taille minimale réglementaire en France » + reco no-kill / taille de maturité.
- ⚠️ Pièges connus à re-vérifier : barracuda/tassergal/liche = pas de maille ; **bar moucheté (si jamais ajouté) = 30 cm, exempté du régime du bar** (NE PAS dans ce sprint sauf demande John).

---

## Bloc 1 — Référentiel & réglementation structurée (code)

Enregistrer les 6 espèces dans le référentiel. TypeScript **force la complétude** : ajouter un slug à `SpeciesSlug` casse le build tant que `SPECIES`, `SPECIES_REGULATION` et `ESPECES_CONTENT` n'ont pas leur entrée → garde-fou natif.

> **Connecteurs** : **supabase-guard** (RO) une fois, pour confirmer qu'aucun enum Postgres « species » n'existe (sinon migration `ALTER TYPE` — a priori non, `text[]` libre).

### Tâches
1. `lib/seo/programmatic.ts` : ajouter les 6 slugs à `SpeciesSlug` (union) + leur entrée `SPECIES` (label, labelLower, dbKey snake_case, latin, article/articleDe/gender **corrects** pour les accords FR, `inCarnet`, `hasDeepSheet: true`, `hasProgrammatic: false`). Les dérivés (`SPECIES_SLUGS`, `CARNET_SPECIES_DB_KEYS`, `catchSpeciesEnum`) se mettent à jour seuls.
2. `lib/regulation/data.ts` : ajouter les 6 entrées `SPECIES_REGULATION` à partir du Bloc 0 (valeurs EXACTES, `minSizeCm` avec `null` honnête, `dailyQuota`/`closedWindows` `[]` si rien).
3. Vérifier que le compteur d'espèces de la home (rendu dynamique au S27) affiche bien **26** sans édition manuelle.

### Critères d'acceptation
- `pnpm typecheck` vert (preuve que les 3 `Record<SpeciesSlug,…>` sont complets).
- `pnpm test` : le test de cohérence `lib/regulation/__tests__/regulation.test.ts` passe (maille `SPECIES_REGULATION` == maille de la fiche).
- Home : « 26 espèces de chez nous ».

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : `inCarnet` des 6 nouvelles. **Défaut recommandé = `true`** (loggables au carnet, cohérent avec les 20). L'**onboarding « espèces favorites » reste sur les 6 cœur** (CLAUDE.md §1) — ne pas l'élargir ici.
- Ne pas toucher les entrées existantes (genre/article des 20).

---

## Bloc 2 — 6 fiches profondes (éditorial, standard sprint 23)

Écrire les 6 `EspeceContent` au standard des fiches existantes. **Référence à imiter : `lib/especes/content/bar.ts`.** Type : `lib/especes/types.ts` (intro 2-3 §, identity, regulation{verifiedAt, source, minSizeCm, marquage, items}, saisons par façade, techniques, postes, faq).

> **Connecteurs** : **docs-researcher** pour caler saisons/techniques sur des sources sérieuses FR (pas de mémoire). 1 agent / 2 espèces (3 agents parallèles).

### Tâches
1. Créer `lib/especes/content/{barracuda,tassergal,liche,marbre,lieu-noir,merlan}.ts`, chacun un `EspeceContent` complet, **voix pêcheur, tutoiement, concret** (pas de remplissage générique).
2. Enregistrer les 6 dans `lib/especes/content/index.ts` (import + clé dans `ESPECES_CONTENT`).
3. `regulation.minSizeCm`/`marquage` de la fiche = **strictement** les valeurs du Bloc 0 (le test de cohérence échoue sinon). `regulation.items` = prose sourcée (cite l'arrêté + `verifiedAt`).
4. Pour les espèces sans maille (barracuda, tassergal, liche) : `items` dit clairement « pas de taille minimale réglementaire en France » + reco no-kill/maturité. **Aucun chiffre inventé.**

### Critères d'acceptation
- 6 fichiers fiches + index à jour ; `/especes` affiche 26 cartes ; chaque `/especes/<slug>` rend intro + identity + réglementation datée + saisons par façade + techniques + postes + FAQ.
- Façades cohérentes : barracuda/tassergal/liche/marbré centrées Méditerranée ; lieu noir/merlan Manche-Atlantique (les saisons d'une façade absente le disent honnêtement).
- Aucune fiche « creuse » : chaque section dit quelque chose de concret et spécifique à l'espèce.

### Garde-fous
- ⚠️ Voix et exactitude > volume. Pas de copier-coller entre fiches. Pas d'affirmation halieutique non sourçable.

---

## Bloc 3 — Dédup chinchard (sévereau / saurel)

« Sévereau / saurel » n'est **pas** une espèce de plus : c'est le **chinchard** déjà listé (synonyme méditerranéen). On enrichit, on ne duplique pas.

### Tâches
1. Enrichir `lib/especes/content/chinchard.ts` : mentionner les noms vernaculaires **sévereau / saurel / gascon** (intro + FAQ) — bon SEO + reconnaissance des pêcheurs du Sud.
2. (Option SEO) ajouter ces synonymes dans les mots-clés/description de la fiche si le pattern existe.

### Critères d'acceptation
- La fiche chinchard cite « sévereau / saurel » ; **aucune nouvelle entrée** `SpeciesSlug` « sévereau » n'est créée.

---

## Bloc 4 — Maillage & SEO (sans visuels)

Faire de chaque nouvelle fiche un **hub** connecté (comme les 20), pas une page isolée. **Aucune illustration ici** (lot reporté).

> **Connecteurs** : **docs-researcher** (Context7) pour `opengraph-image`/JSON-LD ; **supabase-guard** (RO) pour le tagging spot↔espèce ; **qa-chrome** pour le rendu.

### Tâches
1. **Score espèce + créneaux + tendances perso** : vérifier que les composants `components/especes/species-*` fonctionnent pour les nouveaux slugs (ils sont génériques par slug — confirmer, pas de hardcode des 20).
2. **Top spots à <espèce>** : la fiche affiche « meilleurs spots » via le maillage `dbKey` (RPC `get_top_spots_for_species`, migration 049). Les nouvelles espèces auront un **état vide honnête** tant qu'aucun spot n'est tagué → OK. Option (data, non bloquante) : taguer quelques spots curés pertinents avec les nouveaux `dbKey` via un seed SQL type `seed-species-tagging-sprint23.sql` (Med pour barracuda/tassergal/liche/marbré, Manche/Atl pour lieu noir/merlan). **Pas de migration**, seed data seulement.
3. **SEO** : og:image par fiche (vérifier/ajouter `app/(marketing)/especes/[slug]/opengraph-image.tsx` — visuel de **marque générique**, pas une illustration d'espèce), JSON-LD + Breadcrumb cohérents, sitemap inclut les 6 nouveaux slugs, liens internes croisés (espèce ↔ guides ↔ carte).

### Critères d'acceptation
- Chaque nouvelle fiche : `<Fish>` générique (intérim assumé), score espèce qui s'affiche (ou état « pas assez de prises » honnête), og:image, Breadcrumb, présente au sitemap.
- 26 espèces au sitemap ; 0 fiche orpheline ; liens internes vérifiés (qa-chrome).

### Garde-fous
- ⚠️ Top spots vide = état honnête, **pas** un faux peuplement. Si tagging, taguer des spots réellement pertinents (pas de bruit).
- ⚠️ **Ne pas produire d'illustration/glyph d'espèce** (lot reporté `docs/sprint-28/species-illustrations-lot.md`). Garder `<Fish>`.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. **`/verif-sprint`** : `pnpm test` (dont **cohérence réglementation**) + `pnpm build` + `pnpm typecheck` + `pnpm lint` + revue indépendante. Puis **deploy-watch** après déploiement.
2. **Passe exactitude réglementaire** (la plus importante) : pour chaque nouvelle espèce, `verifiedAt` présent, `source` cite un arrêté réel, `minSizeCm` cohérent avec le Bloc 0, **aucune maille inventée** (les « sans maille » disent explicitement l'absence). Croiser 2 sources si doute.
3. **Anti-doublon** : aucune entrée « sévereau » ; chinchard enrichi.
4. **SEO** : 26 entrées au sitemap, JSON-LD/og:image OK, pas de thin content (`hasProgrammatic:false` respecté → pas de pages `/peche/…` générées pour les 6).
5. **Passe copy** : tutoiement, voix pêcheur, accords de genre corrects (article/articleDe/gender), zéro promesse mensongère.
6. Livrer `docs/sprint-29/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

- Confirmer/arbitrer `inCarnet` + l'éventuel tagging de spots (Bloc 4).
- Relire les 6 fiches (exactitude halieutique + ton) → merge → `main` → déploiement.
- Penser à **ajouter les 6 nouvelles au lot illustrations** (`docs/sprint-28/species-illustrations-lot.md`) quand il sera lancé (catalogue alors à 26).
- Décider si on enchaîne sur les **optionnelles** (raie bouclée — riche en réglementation, turbot, petite roussette, flet, pagre, girelle/serran) en sprint ultérieur ou backlog.

---

## Rappels invariants (cf `CLAUDE.md`)

- Pas de push sans validation. RLS jamais désactivé. **Aucune migration** ce sprint (si supabase-guard révèle un enum DB espèces → ALTER TYPE en fichier numéroté + regen `lib/types.ts`, et le signaler à John).
- Exactitude réglementaire = **bloquante** : `⚠️ DEMANDER À JOHN` plutôt qu'inventer. Profondeur > quantité (pas les 266 fiches creuses). Illustrations = reportées.
