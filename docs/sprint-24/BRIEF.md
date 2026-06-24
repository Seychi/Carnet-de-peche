# Sprint 24 — Brief d'exécution
## Conformité & Confiance — réglementation FR + RecFishing + IA espèces + marées (Chantier C)

> Rédigé le 2026-06-23. Durée cible : ~6-7 jours. Phase **P3 — Conformité & Confiance**, après la P2 (moat réel).
> Contexte : `docs/audits/AUDIT-2026-06-23.md` + `docs/ROADMAP-2026-H2.md` (Chantier C). **Fenêtre 2026 unique** : RecFishing (déclaration obligatoire de captures sensibles depuis le 12/02/2026) + nouveaux quotas — personne ne l'outille pour la pêche du bord. C'est aussi le sprint qui sécurise les **2 risques de confiance #1** : exactitude réglementaire et précision marées.
> Décisions John 2026-06-23 : roadmap P3 validée. **Quatre décisions à trancher (cf §Décisions) avant le code.**

**Préalable avant de démarrer (manuel John)** : sprints 22-23 mergés (le pôle espèces fournit les fiches/réglementation des ~20 espèces que ce sprint structure). Trancher D-C1→D-C4. Créer un compte Fishial.AI (clé API) si D-C3 = go.

> ⚠️ **Corrections de cadrage vs la roadmap (vérifiées web + code).**
> 1. **RecFishing n'a PAS d'API tierce de soumission.** L'appli officielle UE génère elle-même les déclarations ; on **ne peut pas auto-déclarer** depuis Carnet de Pêche. v1 réaliste = **détecter une capture déclarable + rappeler les 24 h + pré-compiler les données à recopier + lien vers l'appli**. Ne JAMAIS promettre l'auto-déclaration.
> 2. **Il existe déjà une vérif de maille FAUSSE en prod** : `LEGAL_SIZES` codé en dur dans `CatchForm.tsx` (`bar: 36` au lieu de **42** Manche/Atlantique ; aucune façade) → un bar de 38 cm (légal) est marqué « sous-taille » et **auto-relâché à tort**. À corriger en priorité (brique 1).
> 3. **Marées : audit déjà fait au sprint 21** (`docs/sprint-21/marees-med.md`). Le « Marée 0/35 » en Med est un **faux négatif structurel** (seuil d'étale `0.1 m` codé en dur dans `scoreTide`), **pas** un manque de données → **NO-GO SHOM/WorldTides**. Le correctif est une repondération, pas un changement de fournisseur.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> **ultracode — effort xhigh.** Exécute `docs/sprint-24/BRIEF.md`. **Ne démarre pas** tant que D-C1→D-C4 ne sont pas tranchées. Ensuite : lance **WS-A (moteur réglementation), WS-B (RecFishing helper) et WS-D (correctif marées) en parallèle** ; **WS-C (IA espèces) dépend de WS-A** (pour la vérif maille). Termine **obligatoirement** par le **workstream VERIF**. **Ne push pas, ne déploie pas, n'applique aucune migration en prod.** Invariants : réglementation **sourcée + datée** (jamais inventée ; `null` honnête si pas de maille), **ne pas promettre l'auto-déclaration RecFishing**, clé API Fishial **jamais** côté client, marées = « marnage » jamais « coef SHOM inventé », tutoiement, zod FR, migration = fichier numéroté + regen `lib/types.ts`.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Avant l'API Fishial.AI (WS-C) | **docs-researcher** → Context7 / docs.fishial.ai | **Confirmer auth + pricing + quota + endpoint** avant de coder (pas de surprise de coût). |
| Liste officielle des espèces sensibles RecFishing (WS-B) | **docs-researcher** → web (mer.gouv.fr / FFPSA) | La liste **évolue** — la figer datée + sourcée, pas de mémoire. |
| Schéma/migration (extension `regulation`, colonne façade) | **supabase-guard** → Supabase (RO) | Vérifier `catches` (pas de colonne façade/dept), `spots.department/region`, modèle avant migration. |
| QA carnet (vérif maille, IA, rappel RecFishing) + fiche spot (marées) | **qa-chrome** → Claude in Chrome | États réels, gating, dégradation IA, libellé marée. |
| Clôture | **`/verif-sprint`** | tests + build + types + lint + revue indépendante + anti-régression. |

---

## Objectif du sprint en une phrase

Le carnet **protège et met en règle** le pêcheur : maille **exacte et façade-aware** (fini le bug `bar 36`), rappel de déclaration RecFishing pour les captures sensibles, suggestion d'espèce + vérif maille par photo (Fishial.AI), et un score marée **honnête en Méditerranée** (fini le « 0/35 » trompeur).

---

## Diagnostic (établi par lecture du code + web — point de départ)

1. **Deux sources de vérité contradictoires sur la maille.** (A) `LEGAL_SIZES` codé en dur dans `components/catches/CatchForm.tsx:40-47` (faux : `bar 36`, sans façade, auto-relâche à tort). (B) `EspeceContent.regulation.minSizeCm` (`lib/especes/content/*.ts`, **juste**, par façade, sourcé/daté). → fusionner sur (B), supprimer (A).
2. **Seul `minSizeCm` + `marquage` sont structurés.** Quotas/jour, fermetures, no-kill, zones (Parc Golfe du Lion, 48e parallèle) = **prose HTML** dans `regulation.items`. Un vrai moteur (quota, fenêtre de fermeture par date) exige d'**étendre le type `regulation`** (structuré, sourcé/daté).
3. **Pas de façade sur la prise.** `catches` n'a ni `facade` ni `department` ; `facadeOf(deptCode)` existe (`lib/seo/programmatic.ts`, Med = 06/11/13/30/34/66/83/2A/2B) mais aucun helper **lat/lng→façade**. `spots` portent `department`+`region`. → créer `getFacadeForCatch(spot_id | geom)`.
4. **Mismatch de slug** : enum prise `dorade_royale` (underscore) vs fiches `dorade-royale` (tiret). À mapper partout prise↔fiche.
5. **Pipeline photo 100 % client** : `PhotoInput.tsx` → `image-resize.ts` (WebP ≤ ~0,9 Mo, EXIF strippé) → server action `uploadCatchPhoto` → bucket `catches/${user.id}/${uuid}.webp`. **Point d'insertion IA** = après le resize, via une **nouvelle server action `suggestSpeciesFromPhoto`** (clé API serveur, quota, anti-CORS), pré-remplissage **non bloquant**.
6. **RecFishing (web, 12/02/2026)** : appli officielle UE gratuite (iOS/Android/web), déclaration sous 24 h des **espèces sensibles** (Atlantique/Manche : **bar, lieu jaune, dorade rose, thon rouge** ; Med : dorade rose, liche/pompano, thon rouge ; **y compris no-kill**). En Med, le pêcheur du bord est exempté d'enregistrement général mais **doit déclarer** une espèce sensible ; les 3 parcs marins (Calanques, Golfe du Lion, Cap Corse) imposent **CatchMachine** (RecFishing non accepté). **Aucune API tierce de soumission connue.**
7. **Marées : le ticket est déjà écrit** (`docs/sprint-21/marees-med.md §3.2`) : seuil d'étale `0.1 m` codé en dur (`lib/solunar/scoring.ts:50-51`) → en Med (swing < 0,1 m) toutes les fenêtres = 0 → « 0/35 ». Correctif = repondération conditionnelle sous un marnage seuil (~0,3 m) + propager marnage/poids effectifs à `ScoreBreakdown` (qui ne reçoit aujourd'hui que `window.factors`). NB : `scoreTide` lit `getUTCHours()` alors que les points sont en heure locale → **vérifier le décalage TZ** au passage.

---

## Décisions à trancher AVANT le code (⚠️ DEMANDER À JOHN)

- **D-C1 — Périmètre RecFishing v1.** Confirmer : **pas d'auto-déclaration** (pas d'API). v1 = détection capture sensible + rappel 24 h (notification) + écran « à déclarer » pré-rempli (espèce/taille/lieu/quantité/technique) + lien profond vers l'appli RecFishing. OK ? Et quelle **liste d'espèces sensibles** on suit (à figer datée/sourcée).
- **D-C2 — Tier de l'IA + de la vérif maille.** Reco : **vérif maille gratuite** (utilité légale = protège l'utilisateur, cohérent §8 CLAUDE.md) ; **reco IA** = quota gratuit limité (ex. N/mois) puis Local+. À confirmer.
- **D-C3 — Fishial.AI : go/no-go selon coût.** docs-researcher confirme pricing/quota AVANT de coder. Si coût prohibitif → différer l'IA (garder maille + RecFishing + marées) ou plafonner le quota gratuit.
- **D-C4 — Profondeur du moteur réglementation v1.** Minimum (corriger maille + façade) **maintenant**, et structurer quotas/fermetures **maintenant ou en lot suivant** ? Reco : maille+façade+marquage v1 (rapide, sécurise), quotas/fermetures structurés en WS-A2 si le temps le permet.

---

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| **A** | Moteur réglementation (maille façade-aware + helpers) | 2-2,5 j | décisions | ✅ |
| **B** | Helper RecFishing (détection + rappel + récap + lien) | 1,5-2 j | D-C1 | ✅ |
| **C** | IA reco espèces + vérif maille par photo (Fishial.AI) | 2 j | A, D-C2/C3 | ❌ après A |
| **D** | Correctif marées (ticket sprint-21 déjà cadré) | 1 j | — | ✅ |
| **VERIF** | Revue finale indépendante | 0,5 j | tous | ❌ (dernier) |

---

## Bloc A — Moteur réglementation (maille façade-aware)

Une source de vérité unique pour la réglementation, et la fin du bug `bar 36`.

> **Connecteurs** : **supabase-guard** (RO) — `spots.department/region`, absence de façade sur `catches` ; **docs-researcher** (+ John) pour toute donnée réglementaire structurée ajoutée (sourcée/datée).

### Tâches
1. **Module `lib/regulation/`** : `getMinSize(species, facade)`, `checkSize(species, facade, sizeCm)` (lit `ESPECES_CONTENT[slug].regulation.minSizeCm`, gère le mismatch slug `dorade_royale`↔`dorade-royale`), `getFacadeForCatch({ spotId?, geom? })` (via `spots.department`→`facadeOf`, sinon dériver de la géoloc), et `isMarquageRequired(species)`.
2. **Supprimer `LEGAL_SIZES`** de `CatchForm.tsx` et brancher `checkSize` (badge « sous-taille » + auto-flag `released` corrigés). Si la façade est inconnue (prise sans spot ni geom), ne pas afficher de verdict faux (état « façade inconnue »).
3. **(D-C4) Étendre le type `regulation`** (`lib/especes/types.ts`) avec du structuré sourcé/daté : `dailyQuota`, `closedWindows[]` (façade + dates + zone), `verifiedAt` normalisé ISO. Remplir au moins les espèces sensibles (bar, lieu jaune…). Helpers `getDailyQuota`, `isClosedSeason(species, facade, date)`.
4. Afficher la maille là où elle manque : **fiche spot** + **CatchCard** (badge réglementaire), en plus de la fiche espèce.

### Critères d'acceptation
- `getMinSize('bar','manche-atlantique') === 42` et `=== 30` en Med ; un bar **38 cm Manche n'est PLUS « sous-taille »** ni auto-relâché (test de non-régression du bug).
- `grep -n "LEGAL_SIZES" components` = 0. Tests `lib/regulation/__tests__` : 6 espèces × 2 façades + mismatch slug + façade inconnue.
- Toute donnée réglementaire structurée ajoutée a `source` + `verifiedAt` (sinon non publiée).

### Garde-fous
- ⚠️ Exactitude = bloquante. Aucune valeur réglementaire inventée ; `null` honnête si pas de maille (mulet, congre…).
- Ne pas casser le rendu des `items` HTML existants des fiches.

---

## Bloc B — Helper RecFishing (détection + rappel + récap)

Transformer une obligation légale en service. **Pas d'auto-déclaration** (pas d'API) — on aide à déclarer.

> **Connecteurs** : **docs-researcher** → liste officielle des espèces sensibles (mer.gouv.fr / FFPSA), **datée + sourcée**. Périmètre = D-C1.

### Tâches
1. Référentiel **espèces sensibles** (datée/sourcée) par façade, dans `lib/regulation/recfishing.ts` (bar, lieu jaune, dorade rose, thon rouge… + Med liche/pompano). Helper `isDeclarable(species, facade)`.
2. À la création d'une prise déclarable : bandeau « Cette prise est à déclarer sur RecFishing sous 24 h » + écran **récap pré-rempli** (espèce, taille, date/heure exacte, lieu, quantité, technique — les champs que RecFishing demande) **à recopier**, + **lien profond** vers l'appli/le web RecFishing.
3. Rappel **notification in-app** (le système notifications existe, migration 037) à T+ quelques heures si la prise déclarable n'est pas marquée « déclarée ». Flag `declared` sur la prise (migration = fichier).
4. Mention spéciale **parcs marins Med** (Calanques, Golfe du Lion, Cap Corse) : CatchMachine requis, RecFishing non accepté → message dédié.

### Critères d'acceptation
- Loguer un **bar** déclenche le bandeau + le récap ; loguer un **maquereau** (non sensible) ne déclenche rien.
- **Aucune** UI ne prétend soumettre la déclaration à la place de l'utilisateur (revue copy).
- La liste des espèces sensibles affiche sa source + sa date.

### Garde-fous
- ⚠️ **Ne pas promettre l'auto-déclaration.** Verbes autorisés : « prépare », « rappelle », « ouvre RecFishing ». Interdits : « déclare pour toi », « envoie ta déclaration ».
- ⚠️ DEMANDER À JOHN : périmètre exact (notification + récap suffisent en v1 ?).

---

## Bloc C — IA reconnaissance d'espèces + vérif maille par photo (Fishial.AI)

La table stake manquante, transformée en garde-fou réglementaire FR.

> **Connecteurs** : **docs-researcher** → docs.fishial.ai (auth, pricing, endpoint, format réponse) **avant** de coder. Gating selon D-C2.

### Tâches
1. **Server action `suggestSpeciesFromPhoto(formData)`** (`lib/catches/` ou `app/actions/`) : relaie le WebP (déjà resize) à Fishial.AI **côté serveur** (clé API en env, jamais client), parse la réponse (espèces + polygones), mappe le 1er résultat vers l'enum `catchSpeciesEnum` (gérer slug↔enum). Quota + `try/catch` + **dégradation silencieuse** (échec API = carnet utilisable sans IA).
2. Brancher dans `PhotoInput.onChange` (après resize) : suggestion **non bloquante** → `setValue('species', …)` (l'utilisateur peut corriger). Indiquer « suggéré par photo » (pas de fausse certitude).
3. **Vérif maille** post-suggestion : si `size_cm` saisi < maille (via `checkSize` de WS-A pour la façade de la prise) → message « ce [espèce] ~X cm est sous la maille (Y cm) : à relâcher ». Honnête, pas bloquant.
4. Gating selon D-C2 (maille gratuite ; reco IA quota gratuit puis Local+).

### Critères d'acceptation
- Sur une photo test de bar, la suggestion pré-remplit `species='bar'` ; échec/timeout API → le carnet reste pleinement utilisable (pas d'erreur bloquante).
- **Clé API Fishial absente du bundle client** (`grep` build) ; quota respecté ; latence n'empêche jamais le submit.
- La vérif maille réutilise WS-A (pas de nouvelle table de tailles).

### Garde-fous
- ⚠️ D-C3 : si Fishial est prohibitif, ce bloc est **différé** (le sprint reste valable avec A+B+D).
- La mesure de taille « par photo » (objet de référence) **n'est PAS** dans ce sprint (c'est le Chantier G) — ici, taille = saisie utilisateur, l'IA suggère seulement l'espèce.

---

## Bloc D — Correctif marées (Méditerranée honnête)

Appliquer le ticket déjà cadré au sprint 21. Indépendant, rapide.

> **Connecteurs** : **qa-chrome** sur 3-4 spots Med/Corse + 2 Atlantique (contrôle). Réf : `docs/sprint-21/marees-med.md §3.2`.

### Tâches
1. `lib/solunar/scoring.ts` : repondération conditionnelle — sous un marnage journalier seuil (~0,3 m, via `dailyMarnage()` de `lib/conditions/tide.ts`), traiter la marée comme **non discriminante** et **renormaliser** son poids 0.35 sur solunar/vent (au lieu d'imposer `tide=0`). Rendre le seuil d'étale `0.1 m` **relatif** au marnage local.
2. Propager **marnage + poids effectifs** jusqu'à `components/scoring/ScoreBreakdown.tsx` (qui ne reçoit que `window.factors`) → afficher « marée plate (marnage 0,15 m) · peu déterminante » au lieu de « 0/35 ».
3. **Vérifier/corriger le décalage TZ** `getUTCHours()` vs heure locale des `tidePoints` (signalé au diagnostic).

### Critères d'acceptation
- Un spot Corse (2A/2B) **n'affiche plus « Marée 0/35 »** mais un libellé honnête ; **Atlantique (Brest, marnage ~3 m) NON impacté** (toujours 21-28/35).
- Somme du score cohérente (renormalisation, rien d'inventé) ; tests `scoreTide` (cas Med plat + Atlantique fort).

### Garde-fous
- ⚠️ NO-GO SHOM/WorldTides (le bug est sémantique). Garder « marnage mesuré », jamais « coef SHOM ».

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `/verif-sprint` : `pnpm test` + `typecheck` + `lint` + `build`, puis revue croisée du `git diff main...HEAD` contre les AC.
2. **Passe anti-régression** : (a) **exactitude réglementaire** — maille = `EspeceContent` (plus de `LEGAL_SIZES`), aucune valeur inventée ; (b) **copy RecFishing** — aucune promesse d'auto-déclaration ; (c) **clé Fishial** absente du client ; (d) marée Atlantique non impactée ; (e) gating (D-C2) cohérent ; (f) floutage GPS intact (le récap RecFishing ne fuit pas de geom précis).
3. Vérifier qu'aucune migration n'a été appliquée en prod par les agents (fichiers seulement).
4. Livrer `docs/sprint-24/RECAP.md` : fait / comment tester / reste manuel John.

---

## Reste manuel John (post-sprint)

1. Créer le compte/clé **Fishial.AI** + l'ajouter aux env Vercel (si D-C3 = go). Valider la **réglementation structurée** ajoutée (exactitude légale).
2. Appliquer la/les migration(s) (flag `declared`, éventuelle colonne façade) en prod + regen `lib/types.ts` + `get_advisors`.
3. Relire → merge `main` + déploiement. deploy-watch + qa-chrome (maille, IA, rappel RecFishing, marée Med).

---

## Décisions récapitulées
- **D-C1** périmètre RecFishing (pas d'auto-déclaration) + liste espèces sensibles · **D-C2** tier IA/maille · **D-C3** go/no-go Fishial selon coût · **D-C4** profondeur moteur réglementation v1.

## Sources réglementaires (à dater dans le code)
- [mer.gouv.fr — Pêche de loisir en mer](https://www.mer.gouv.fr/peche-de-loisir-en-mer) · [RecFishing obligation 12/02/2026 (peche.com)](https://www.peche.com/article/51243/recfishing-l-obligation-de-declaration-entre-en-vigueur-le-12-fevrier-2026) · [FFPSA — RecFishing obligatoire](https://www.ffpsa.net/lappli-recfishing-devient-obligatoire-en-france-pour-declarer-les-peches-de-loisir-en-mer/) · [Fishial.AI — API](https://docs.fishial.ai/api) · audit marées : `docs/sprint-21/marees-med.md`.

*Brief produit le 2026-06-23 (mode ultracode/xhigh, suit `docs/BRIEF-TEMPLATE.md`). Cartographie source : exploration code conformité/marées + recherche web RecFishing/Fishial 2026.*
