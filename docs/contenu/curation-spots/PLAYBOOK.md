# PLAYBOOK — Curation des 941 spots importés (exécutée par Claude, lot par lot)

> Rédigé le 2026-08-05. Ce document est **autonome** : une session Fable fraîche doit pouvoir exécuter un lot avec ce fichier + `LOTS.md` (état vivant) uniquement.
> Lancement type par John : « Traite le lot suivant selon `docs/contenu/curation-spots/PLAYBOOK.md` ».
> Décision produit : c'est Claude qui fait la curation (recherche + rédaction + SQL), John ne fait que valider les lots (mode A) ou spot-checker (mode B).

---

## 1. État initial (vérifié en SQL live le 2026-08-05)

- **941 spots `source='imported'`, `moderation_status='pending'`** (backlog créé par la migration 072, sprint 42 : masqués de la carte/fiches/nearby tant que non approuvés). Champs contenu **vides** : `species=[]`, `hazards=[]`, pas de `description`, pas d'`access_notes`, `difficulty=3` par défaut, `structure` déduite d'OSM (fiable à vérifier), `visibility='public'`.
- Répartition : 29→222 · 56→123 · 13→103 · 22→87 · 17→58 · 50→55 · 14→51 · 44→42 · 66→31 · 34→28 · 35→25 · 33→24 · 62→22 · 83→19 · 76→15 · 64→14 · 40→14 · 30→4 · 59→2 · 11→2.
- **Pollution connue** : ~94 lignes en doublon interne (35 noms dupliqués, ex. « Caisson Phoenix » ×7 dans le 14) ; **33 spots à < 400 m d'un spot curé** (doublons probables du catalogue) ; **28 noms suspects** (« Accueil », « slip », vides…). → traités au **Lot 0** (§7).
- Les fiches curées de référence (215) font : description ~300-450 caractères, access_notes ~120-250 avec ⚠️ quand utile, 2-4 hazards, 4-7 espèces, difficulty renseignée.
- Contraintes DB (à ne pas violer) : `structure` ∈ {digue, plage, pointe_rocheuse, estuaire, cale, passe, cassure} · `difficulty` 1-5 · `moderation_status` ∈ {pending, approved, rejected} · `verification_level` ∈ {communaute, ambassadeur, equipe, NULL} · `verified=true` réservé à `source='curated'`.

## 2. Invariants d'honnêteté (NON NÉGOCIABLES, cf CLAUDE.md §8/§19)

1. **On n'invente JAMAIS un fait local.** Un parking nommé, un danger spécifique, une interdiction, une profondeur précise : seulement si une source le dit. Sans source, on écrit le générique honnête du type de poste (« accès à pied depuis [commune] », pas « parking gratuit rue X »).
2. **Espèces = potentiel du poste, jamais des prises affirmées.** La liste `species` vient de la matrice façade × structure (§5) affinée par la recherche. La copy dit « poste à bar et sar » ou « on y cherche le bar », jamais « ça sort régulièrement du 60+ » sans source.
3. **Hazards = vocabulaire fermé, dangers STRUCTURELS du type de poste.** Un danger local spécifique (baïne précise, zone interdite) exige une source. Vocabulaire canonique : `baignade_dangereuse`, `baines`, `courants_forts`, `falaise`, `isolation`, `rejet_eaux_usees`, `ressac`, `rochers_glissants`, `sentier_expose`, `submersion_maree`, `vagues`, `vagues_scelerats`. (Variantes `courants` et `sentier_exposé` existent en base : à normaliser au Lot 0, ne pas en créer de nouvelles.)
4. **Interdiction découverte = reject.** Réserve naturelle, port militaire, propriété privée, arrêté anti-pêche → `moderation_status='rejected'` + raison dans le RECAP du lot. Dans le doute sur une interdiction, on NE publie PAS.
5. **Pas de badge menti** : `verified` reste `false`, `verification_level` reste `NULL` (les 3 valeurs autorisées impliquent une vérification humaine/terrain qu'on n'a pas). `source` reste `'imported'`. La vérification terrain viendra de la communauté/l'équipe.
6. **Charte copy** : tutoiement, AUCUN tiret cadratin dans la copy (lint `node scripts/lint-copy-dashes.mjs`), pas de jargon corporate, pas de promesse produit.
7. **Ne JAMAIS toucher** : `geom`, `geom_public`, `visibility`, `source`, `verified`, les policies RLS. Le floutage et le gating carte ne sont pas le sujet.

## 3. Verdicts possibles par spot

| Verdict | Quand | Effet DB |
|---|---|---|
| **curate_full** | ≥ 1 source fiable (§4 niveau A/B) ou 2 concordantes (C) : on peut écrire une fiche complète | UPDATE contenu + `approved` |
| **curate_light** | Zéro source MAIS spot géographiquement évident (nom réel, structure claire sur OSM/bathy) : fiche courte honnête du type de poste | UPDATE contenu (gabarit light) + `approved` |
| **merge** | Doublon d'un spot curé existant (< 400 m, même poste) | `rejected` (raison « doublon de [slug curé] ») |
| **reject** | Nom invalide sans toponyme retrouvable, pas pêchable du bord, interdit, hors périmètre (eau douce, pêche à pied) | `rejected` + raison au RECAP |

Garde-fou anti-thin-content : si un département dépasse **50 % de curate_light**, resserrer le tri (préférer reject aux light douteux). Une fiche light doit rester plus utile qu'une fiche Fishing Grid moyenne, sinon elle n'existe pas.

## 4. Recherche par spot (l'étape qui fait la différence)

Requêtes types (WebSearch + fetch) : `"[nom du spot]" [commune] pêche` · `"[nom]" pêche bar` · `[commune] "où pêcher"` · pour l'accès/interdictions : `[commune] arrêté pêche digue` · site de l'OT/mairie/port.

Hiérarchie des preuves :
- **A** : source officielle (mairie, office de tourisme, autorité portuaire, arrêté, SHOM).
- **B** : presse locale, guide/livre publié, site spécialisé établi.
- **C** : forums et blogs pêche (2 sources concordantes minimum).
- **D** : rien trouvé → curate_light ou reject selon §3.

Chaque fiche full note son niveau de preuve (A/B/C) + lien dans le RECAP du lot (pas dans la fiche publique).

Vérification géo systématique (sans web) : coords cohérentes avec la côte, `structure` OSM plausible, bathy EMODnet à proximité (profondeur du poste), façade réglementaire du département (source de vérité : le mapping façade du code, cf `lib/especes/season.ts`, ne pas le réinventer).

## 5. Matrice espèces façade × structure (POINT DE DÉPART, à affiner par recherche + bathy)

Slugs autorisés = les clés de `SPECIES_LABELS` (`lib/labels.ts`, 26 espèces). Base :

| Structure | Manche / Atlantique | Méditerranée |
|---|---|---|
| digue / cale portuaire | bar, mulet, maquereau (été), orphie (été), congre (soir/nuit), dorade_royale (Atl sud), sar (Atl sud), seiche (automne-hiver) | bar (dit loup : même slug `bar`), sar, dorade_royale, mulet, oblade, orphie, calmar (automne) |
| plage | bar, dorade_royale (Atl), sole (nuit), maquereau (chasses) | dorade_royale, sar, bar, oblade, sole |
| pointe_rocheuse | bar, lieu_jaune (postes profonds N-Bretagne/Manche), vieille (Bretagne), sar (sud), congre | bar, sar, dorade_royale, oblade, congre |
| estuaire | bar, mulet, sole, dorade_royale (Atl sud) | bar, mulet, dorade_royale |
| passe / courant | bar, dorade_royale, congre, maquereau | bar, dorade_royale, congre |
| cassure | selon bathy : bar, lieu_jaune, congre | selon bathy : bar, dorade_royale |

⚠️ « Loup » n'est PAS un slug : en Méditerranée le loup = le bar, slug `bar` partout (la copy de la fiche peut dire « loup »).

Règles : 4-7 espèces max (les fiches curées font ça), pas de « catalogue » ; retirer une espèce si la façade/saison la rend marginale ; en ajouter UNE seulement si la recherche la source.

## 6. Gabarits de fiche

**Difficulty (1-5)** : 1 = plain-pied sécurisé, familial (digue de port, cale) · 2 = facile, vigilance marée/glisse ponctuelle · 3 = marche d'approche ou platier, lecture de marée nécessaire · 4 = poste exposé (houle, courant), timing de marée strict · 5 = engagé (falaise, isolement, submersion), expérimentés, jamais seul.

**Fiche FULL** :
- `description` (300-450 car.) : ce qu'est le poste, ce qu'on y cherche et quand (créneau/saison), un conseil concret de pêche. Voix pêcheur, tutoiement.
- `access_notes` (120-250 car.) : comment on y arrive à pied, contrainte réelle (marée, distance, réglementation locale sourcée). ⚠️ en tête si contrainte sérieuse.
- `hazards` : 2-4 du vocabulaire (§2.3). `species` : §5. `techniques` : 1-3 parmi les slugs existants (leurres, surfcasting, flottante, vif). `difficulty` : barème ci-dessus. `structure` : corriger si OSM s'est trompé.

Style cible (fiche curée réelle, à imiter) : « Accès à pied depuis Saint-Martin-de-Ré, sur la digue extérieure (reste hors des accès pontons). ⚠️ Marnage important : … »

**Fiche LIGHT** (honnête, courte) :
- `description` (150-250 car.) : le poste et son type, la façade, ce qu'on y cherche typiquement, invitation à compléter (« Tu pêches ici ? Logue tes prises, la fiche s'affinera. »).
- `access_notes` générique honnête (« Accès à pied depuis [commune]. »), hazards structurels du type uniquement, espèces = matrice §5 resserrée (3-5), difficulty prudente (jamais 1 sans certitude).

**Renommage** : nom OSM pauvre mais toponyme retrouvé → renommer proprement (« [Toponyme] : [structure] ») et régénérer le slug AVANT approbation (jamais après publication, l'URL devient stable à l'instant où le spot passe `approved`).

## 7. Lot 0 — Assainissement (première session, AVANT tout lot éditorial)

1. **Doublons internes** (35 noms, ~94 lignes en trop) : par grappe même nom + < 300 m, garder la ligne la mieux placée, `rejected` pour les autres (raison « doublon interne d'import »). Grappes distantes (vrais homonymes) : garder, renommer avec le toponyme.
2. **33 spots à < 400 m d'un curé** : revue un par un ; même poste → merge (rejected), poste distinct → garder au backlog.
3. **28 noms suspects** : toponyme retrouvable → renommer et garder ; sinon reject.
4. **Normalisation hazards des fiches existantes** : `sentier_exposé` → `sentier_expose`, `courants` → `courants_forts` (UPDATE ciblés).
5. RECAP lot 0 : liste exhaustive des actions AVANT exécution → GO John → exécution → chiffres finaux dans `LOTS.md` (backlog net attendu ≈ 780-800).

## 8. Déroulé d'une session de lot (éditorial)

1. Lire `LOTS.md` → prochain lot non fait. Extraire les spots : `select id, name, slug, trim(department) dept, structure, ST_Y(geom::geometry) lat, ST_X(geom::geometry) lng from spots where source='imported' and moderation_status='pending' and trim(department)='[dept]' order by name limit 25;` (via le connecteur Supabase ; `geom` est verrouillée côté clients applicatifs mais lisible ici, elle ne sort JAMAIS du RECAP interne).
2. Par spot : vérif géo (§4) → recherche web (§4) → verdict (§3) → rédaction (§6). Travailler par sous-grappes géographiques (les spots voisins partagent commune et contexte, la recherche s'amortit).
3. Produire le **RECAP de lot** (`docs/contenu/curation-spots/lots/lot-NN-[dept].md`) : tableau `nom | commune | verdict | espèces | difficulté | hazards | preuve (A/B/C/D + lien)` + les fiches complètes en dessous.
4. **Validation** — deux modes, John choisit en début de session :
   - **Mode A (défaut)** : John répond « GO lot NN » (ou liste d'exclusions) → étape 5.
   - **Mode B (délégué)** : exécution directe, John spot-checke a posteriori ; tout spot douteux reste `pending` (le doute ne se publie jamais).
5. **Écriture DB** (connecteur Supabase, un UPDATE par spot, jamais de SQL destructif) :
   `update public.spots set name=…, species=…, techniques=…, difficulty=…, structure=…, description=…, access_notes=…, hazards=…, moderation_status='approved', updated_at=now() where id='…' and source='imported' and moderation_status='pending';`
   Rejects : `set moderation_status='rejected'`. Aucune migration nécessaire (colonnes existantes).
6. **Vérifications post-lot** : 2-3 fiches live (`/spots/[slug]`) rendent le contenu ; les nouveaux slugs apparaissent dans `/sitemap.xml` (le sitemap filtre `approved` depuis le fix du 05/08) ; `get_advisors` sans nouvel ERROR ; lint tirets sur les textes.
7. Cocher `LOTS.md` (statut, compteurs, date) et s'arrêter proprement.

## 9. Stratégie « un département à la fois » (décision John 2026-08-05)

**Objectif : ~100 spots publiés et complets par département, un département fini avant de passer au suivant.** On remplit la carte par zones denses plutôt que de saupoudrer 20 départements à moitié. Un département « fini » = ~100 fiches publiées (ou backlog épuisé, cf enrichissement §9.3), toutes avec espèces + difficulté + hazards + accès + description.

### 9.1 Ordre de traitement (par notoriété, pas alphabétique)

À l'intérieur d'un département, traiter dans cet ordre (c'est ce qui remplit la carte utilement et ce qui ranke) :
1. **Postes connus et nommés** : pointes et caps identifiés, digues et môles de ports, estacades, phares accessibles.
2. **Plages et grandes anses nommées** (surfcasting).
3. **Estuaires, passes, cales de mise à l'eau nommées.**
4. **Micro-toponymes** (rochers bretons « Beg ar … », etc.) : en dernier, et seulement s'ils passent la règle « série OSM » (cf LOTS.md, décisions du lot 1).

Requête d'ordonnancement : privilégier les noms contenant pointe/cap/digue/môle/jetée/estacade/phare/plage/anse/port, puis le reste.

### 9.2 Débit, couverture et horizon

**15-25 spots/session**, un lot/jour par la tâche planifiée. Taux de publication observé : 64 % au lot 1, ~90 % ensuite (le tri par notoriété écarte moins de spots). Un département de 100 fiches ≈ **6-8 lots ≈ 1,5 semaine**.

**Le plan couvre les 24 départements côtiers** (`COASTAL_DEPARTMENTS`, sans la Somme 80) : tableau vague par vague, cible par département et besoin de ré-import dans `LOTS.md` § « Plan de couverture ». Aucun département n'est hors périmètre.

**Objectif par département = `min(100, couverture exhaustive des postes réels)`.** La cible s'ajuste au linéaire côtier : 100 pour les grandes façades (29, 56, 22, 50, 17, 13, 83), 40-60 pour les moyennes, 20-30 pour les littoraux courts (59 Nord ≈ 40 km, 30 Gard ≈ 20 km). **On ne remplit jamais un quota en inventant des postes** : si un département n'a plus de poste réel documentable, il est fini, point. Horizon total ≈ 1 475 fiches ≈ 4-5 mois.

### 9.3 Enrichissement quand le backlog ne suffit pas (à faire AVANT d'attaquer le département)

**21 des 24 départements ont besoin du ré-import** pour atteindre leur cible (tous sauf 29 ✅ fini, 13 et 56 partiellement). Cas extrême : **85, 06, 2A et 2B ont zéro backlog** — les 6 anciens tags OSM ne trouvaient rien de nommé dans leurs bbox, alors que le script les couvre. Sans ré-import, ces quatre départements resteraient à ~10 fiches pour toujours. Deux sources d'appoint, dans cet ordre :

1. **Ré-import OSM élargi, ciblé département** (`scripts/import-osm-spots.ts`) : le script ne requête aujourd'hui que 6 tags (`man_made=pier|breakwater|groyne|quay`, `natural=cape` node+way). Tags à ajouter, tous pertinents pour la canne du bord : `natural=beach` (le plus gros gisement : plages nommées = surfcasting), `natural=bay`, `natural=reef`, `natural=strait`, `man_made=lighthouse`, `man_made=dyke`, `man_made=embankment`, `leisure=slipway`. Les nouveaux objets entrent en `pending` (comportement déjà en place), donc sans risque : ils passent par la même curation. **Filtrer à l'import les noms invalides** (lettres seules, « Panne X », « Quai A ») avec le prédicat du lot 0, pour ne pas re-polluer le backlog.
2. **Recherche éditoriale** : postes cités par les guides locaux, offices de tourisme, forums, absents d'OSM → créés à la main en `imported`/`pending` avec coords vérifiées, puis curés normalement.

### 9.4 Invariants de cadence

Chaque session est lançable par John en une ligne, ou automatisée (un lot/jour). L'état vit dans `LOTS.md` + la base, jamais en mémoire de session : un run interrompu (limite d'usage, app fermée) reprend proprement au run suivant.

## 10. Posture (cf CLAUDE.md §19)

Ce playbook est un guide, pas une vérité : vérifier les hypothèses contre le vrai schéma/code en début de session (les chiffres du §1 périment). En cas de décision produit ambiguë non couverte ici : `⚠️ DEMANDER À JOHN`, ne pas inventer. Pas de push git sans validation ; les écritures DB suivent le mode A/B choisi.
