# 🎯 Sprint 53 — « Données & saisies »

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §6.
> **Prod = HEAD `7c23f5c` (sprint-50).** Objectif : fermer les trous de **données** (espèces non taguées, valeurs orphelines, unicité username) et de **validation de saisie** (dates futures, bornes mesure). Migrations **094 → 096**.

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 53 (docs/sprint-53/BRIEF.md). Workstreams : WS-A taguer 6 espèces (migration 094, listes de slugs ci-dessous À VALIDER + compléter PACA), WS-B alose/stickbait (095), WS-C unicité username case-insensitive (096), WS-D gardes de date (code), WS-E bornes mesure (code), WS-F décision niveaux de vérif. Finis par WS-G (vérif + regen types si schéma touché). Esprit critique : VÉRIFIE les listes de spots contre la base avant tout UPDATE, confirme la valeur de région PACA, et fais valider les listes par John. NE PUSH PAS sans validation. Aucune donnée écrite en prod sans accord explicite.
```

**Prérequis** : dépôt local réparé (index git corrompu). **⚠️ Ce sprint écrit en base de prod** (UPDATE spots, index) → chaque migration data se valide avec John avant application.

---

## Posture & invariants

Effort max + critique. **Les listes de slugs ci-dessous sont des candidats vérifiés en base le 2026-06-29, mais à faire valider par John** (curation éditoriale honnête, pas de tag au hasard). Migrations numérotées, append-only idempotent, pas de SQL destructif sans accord. Zéro coordonnée exposée (non concerné ici). Le `department` est `char(3)` paddé (« 64 ») → **toujours cibler par `slug`**, jamais par département brut.

---

## WS-A — Taguer les 6 espèces du sprint-29 sur des spots 🟠 [finding D]

**Problème** : `barracuda, tassergal, liche, marbre, lieu_noir, merlan` ont une fiche complète mais sont sur **0 spot** → fiche sans « Meilleurs spots », chips carte à 0, invisibles. (Vérifié : base identique depuis le 28/06.)

**Correctif** : **Migration `094_tag_sprint29_species.sql`** — un UPDATE idempotent par espèce (union dédupliquée) :
```sql
-- patron (répéter par espèce) :
update public.spots
set species = (select array(select distinct unnest(species || array['lieu_noir'])))
where source = 'curated' and slug in ( … );
```

**Listes candidates (vérifiées en base, structure + co-occurrence cohérentes, À VALIDER par John)** :

- **`lieu_noir`** (Manche/Atlantique rocheux froid, co-occurrence `lieu_jaune`) :
  `cap-de-la-hague-goury`, `cap-de-carteret`, `pointe-de-barfleur-gatteville`, `digue-de-querqueville`, `digue-de-dielette` (50), `pointe-du-chateau-plougrescant`, `cap-frehel`, `pointe-de-l-arcouest` (22), `pointe-de-primel`, `pointe-saint-mathieu`, `phare-du-petit-minou`, `pointe-du-raz`, `ile-d-ouessant-lampaul` (29), `pointe-du-grouin` (35).
- **`merlan`** (Manche/Mer du Nord sableux/demersal, co-occurrence `tacaud`/`sole`/`dorade_grise`) :
  `jetees-de-courseulles`, `jetees-de-port-en-bessin` (14), `digue-de-saint-vaast`, `pointe-d-agon`, `pointe-du-roc-granville` (50), `chenal-de-l-aa-gravelines`, `jetee-de-malo-les-bains` (59), `digue-carnot-boulogne`, `digue-de-wimereux`, `jetee-ouest-de-calais`, `cap-gris-nez` (62), `jetees-de-saint-valery-en-caux`, `jetee-du-treport`, `jetees-de-dieppe`, `jetee-de-fecamp` (76).
- **`marbre`** (Méditerranée, plages sableuses) :
  `plage-de-la-franqui`, `gruissan-plage`, `espiguette-section-ouest`, `plage-rive-gauche-grau-du-roi`, `plage-sud-port-camargue`, `pointe-de-l-espiguette`, `plage-de-frontignan`, `plage-du-lazaret-sete`, `anse-de-paulilles` (Occitanie), `plage-de-la-marana` (Corse) **+ plages PACA (à compléter, cf ⚠️)**.
- **`liche`** (Méditerranée, digues + plages, gros carangidé) :
  `mole-saint-louis-sete`, `jetees-du-grau-du-roi`, `mole-de-port-vendres`, `jetee-de-narbonne-plage`, `port-d-argeles`, `jetee-nord-port-leucate` (Occitanie), `port-de-propriano`, `port-tino-rossi-ajaccio`, `port-de-bonifacio` (Corse) **+ PACA**.
- **`barracuda`** (Méditerranée, ports/digues éclairés + pointes) :
  `port-tino-rossi-ajaccio`, `port-de-bonifacio`, `port-de-propriano`, `port-de-porto-vecchio`, `jetee-du-dragon-bastia`, `phare-de-pertusato`, `pointe-de-la-parata` (Corse), `mole-saint-louis-sete`, `mole-de-port-vendres`, `jetees-du-grau-du-roi`, `cap-d-agde`, `cap-leucate`, `cap-bear` (Occitanie) **+ PACA (06 Côte d'Azur = territoire premium)**.
- **`tassergal`** (Méditerranée, pointes/passes exposées + digues) :
  `capo-di-feno`, `pointe-de-la-parata`, `barcaggio-cap-corse`, `phare-de-pertusato` (Corse), `cap-leucate`, `cap-d-agde`, `cap-bear`, `cap-l-abeille-banyuls`, `pointe-saint-vincent-collioure`, `pointe-de-l-espiguette` (Occitanie) **+ PACA**.

**⚠️ Gotcha PACA** : la requête de candidats Méditerranée n'a **rien renvoyé pour PACA** (régions interrogées : `occitanie`, `paca`, `corse`). Soit la **valeur de région PACA diffère** (`paca` vs `provence-alpes-cote-d-azur` vs autre), soit les structures PACA ne sont pas dans `('digue','pointe_rocheuse','plage','passe')`. **Avant de finaliser les 4 espèces Med, lancer** :
```sql
select distinct region from spots where source='curated';                       -- trouver le vrai libellé PACA
select slug, department, structure, species from spots
where source='curated' and department in ('06 ','83 ','13 ') order by department; -- candidats Côte d'Azur / Var / BdR
```
puis **compléter** les listes `barracuda`/`tassergal`/`liche`/`marbre` avec les ports/digues/caps/plages PACA pertinents (le 06 est le meilleur secteur barracuda/tassergal de France métropolitaine).

**Critères d'acceptation** : les 6 espèces apparaissent sur leurs fiches (« Meilleurs spots »), sur les fiches spots concernées (liens vers `/especes/<slug>`), et leur chip carte renvoie des résultats. `select sp, count(*) from spots, unnest(species) sp group by sp` ne contient plus de fiche-espèce à 0.

---

## WS-B — `alose` & `stickbait` : nettoyer les valeurs orphelines 🟡 [finding J]

**Migration `095_clean_alose_stickbait.sql`** (slugs vérifiés en base) :

- **`alose`** (3 spots, aucune fiche → texte gris non cliquable). **Reco : retirer** (espèce amphihaline, marginale pour la pêche du bord en mer ; faire une fiche imposerait une réglementation sourcée pour 3 spots). *Décision John : retirer ou créer la 27e fiche.*
  ```sql
  update public.spots set species = array_remove(species, 'alose')
  where slug in ('baie-de-txingudi-hendaye','digue-de-port-medoc','embouchure-de-l-adour-anglet');
  ```
- **`stickbait`** (5 spots, technique non canonique = c'est un **type de leurre**). **Normaliser → `leurres`** (dédup) :
  ```sql
  update public.spots
  set techniques = (select array(select distinct unnest(array_remove(techniques,'stickbait') || array['leurres'])))
  where slug in ('belle-ile-pointe-des-poulains','ile-d-ouessant-lampaul','ile-de-sein-cale-nord','pointe-de-pen-hir','pointe-du-raz');
  ```
- Corriger le commentaire faux `supabase/seed-spots-lot-8.sql:32` (« alose déjà dans SPECIES_LABELS » : faux).

**Critères** : `select distinct s from spots, unnest(species) s where s not in (référentiel 26)` → vide ; idem techniques hors `leurres/surfcasting/flottante/vif`.

---

## WS-C — Unicité username case-insensitive 🟡 [finding « doublon username » corrigé]

**Constat corrigé** : il n'y a **pas** de vrai doublon de username. Les « 5 doublons » détectés sont **5 profils avec `username = NULL`** (tous `onboarded = false`, regroupés par `lower(NULL)`) — ce sont des comptes pré-onboarding (seed/test). Postgres autorise plusieurs NULL sur un UNIQUE.
- La contrainte actuelle `profiles_username_key UNIQUE (username)` est **sensible à la casse** → « Bob » et « bob » pourraient coexister. Pour un produit social, l'unicité doit être **insensible à la casse**.

**Correctif** : **Migration `096_username_unique_ci.sql`** :
```sql
-- Unicité insensible à la casse (NULL toujours autorisés = profils pré-onboarding).
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username)) where username is not null;
```
- **Vérifier d'abord** qu'aucune collision de casse n'existe (sinon l'index échoue) :
  `select lower(username), count(*) from profiles where username is not null group by 1 having count(*)>1;` (attendu : 0 ligne).
- Aligner la **vérif de disponibilité du pseudo** (onboarding) sur la casse : la requête de check doit utiliser `ilike`/`lower()` pour refuser « Bob » si « bob » existe (chercher dans l'action onboarding / `checkUsername`).
- **5 profils NULL/non-onboardés** : ce sont probablement tes comptes de test. *Décision John : les laisser, ou les purger* (ne PAS auto-supprimer — voir aussi S58 « data seed »).

**Critères** : impossible de créer deux pseudos différant seulement par la casse ; l'index est en place.

---

## WS-D — Gardes de date (futur/passé) 🟡

**Problème** : aucune borne temporelle → on peut loguer une **prise dans le futur**, une **sortie solo dans le futur**, ou proposer une **sortie de co-pêchage dans le passé**.

**Correctifs (code, zod + inputs)** :
- **Prise** : `lib/catches/schema.ts:42` `caught_at: z.string().datetime()` → ajouter une garde « pas dans le futur » (tolérance ~24 h pour les fuseaux). S'applique aussi à `:81` (update) et `:170` (import — le passé reste libre, mais le **futur** doit être bloqué partout). Helper partagé :
  ```ts
  const notFuture = (s: string) => new Date(s).getTime() <= Date.now() + 24*60*60*1000
  // caught_at: z.string().datetime().refine(notFuture, { error: 'La date ne peut pas être dans le futur.' })
  ```
  + `components/catches/CatchForm.tsx:1117` (`type="datetime-local"`) : ajouter `max={<maintenant en yyyy-MM-ddThh:mm>}`.
- **Sortie solo** : `lib/outings/schema.ts:12` `started_at` → même garde `notFuture` (le formulaire logue une sortie **passée**).
- **Proposition co-pêchage** : `lib/cofishing/schema.ts:27` `planned_at` → garde **« pas dans le passé »** (`new Date(s) >= Date.now() - tolérance`), c'est une sortie **à venir** ; idem borne `max` côté input `OutingComposer`.

**Critères** : impossible de soumettre une prise/sortie solo future, ni une proposition de co-pêchage passée (erreur zod claire, input borné). Tests unitaires des 3 cas.

---

## WS-E — Bornes & cohérence de la mesure 🟡

**Problème** : l'input `measured_length_cm` est `min={1} max={299}` (`CatchForm.tsx:760-761`) alors que le zod impose `min(10).max(250)` (`lib/catches/schema.ts:51-53`) → saisir 5 ou 270 passe le navigateur puis se fait rejeter avec un message qui ne colle pas. Et toggler « Prise mesurée » sans remplir les champs ne lève **aucune** erreur (juste pas de badge).

**Correctifs (code)** :
- Aligner l'input sur le zod : `CatchForm.tsx:760-761` → `min={10} max={250}`.
- Quand **« Prise mesurée »** est coché : exiger `measured_length_cm` **et** `reference_object` (refine zod conditionnel, ou validation form) au lieu du simple texte d'aide `:795`. Message clair si manquant.
- (Léger) Réconcilier `size_cm` ↔ `measured_length_cm` : si les deux sont renseignés et trop divergents, avertir (la mesure fait foi pour le badge/records). Pas bloquant, juste cohérent.

**Critères** : les bornes UI = bornes zod ; cocher « mesurée » sans longueur/référence affiche une erreur ; pas de prise « mesurée » sans données réelles.

---

## WS-F — Décision : niveaux de vérification `communaute`/`ambassadeur` 🟢 [finding C2]

**Constat** : `spots.verification_level` ne vaut jamais que `equipe` (ou `null`) — les branches `communaute`/`ambassadeur` sont du **code mort** (légende + UI). Maintenant que l'auto-confirmation est corrigée (Sprint 51 WS-D), le compteur `spot_confirmations` est fiable.

**Deux options (décision John)** :
- **(A) Câbler** : passer un spot communautaire à `verification_level='communaute'` au-delà de N confirmations distinctes (trigger ou recalcul), `ambassadeur` selon un rôle. Donne du sens au compteur + à la légende.
- **(B) Retirer** : supprimer le code mort `communaute`/`ambassadeur` (légende fiche + `MapLegend` si présent) tant que ce n'est pas câblé, pour ne pas afficher des niveaux jamais atteints.

*Reco : (B) maintenant (honnêteté), (A) plus tard en sprint communauté.* À trancher avant de coder ce WS.

---

## WS-G — Vérification (obligatoire, en dernier) ✅

1. **Migrations** 094/095 (data, pas de changement de schéma) + 096 (index) appliquées **après validation John**. Pas de regen `lib/types.ts` requis (aucune colonne/table modifiée) — regénérer seulement si WS-F option A ajoute du schéma.
2. **Requêtes de contrôle** post-migration : 0 fiche-espèce à 0 spot ; 0 espèce/technique hors référentiel ; index username CI présent.
3. **Tests** : gardes de date (3 cas), bornes mesure (UI=zod), « mesurée » exige longueur+référence.
4. **`/verif-sprint`** : Vitest vert, build OK, lint + types OK.
5. **Anti-régression** (agent indépendant) : aucune autre espèce/technique cassée, gating/floutage inchangés, le tag des 6 espèces n'a pas écrasé d'autres `species[]` (union dédupliquée vérifiée), copy sans tiret cadratin.
6. **QA live** : une fiche de chaque nouvelle espèce (ex. `/especes/barracuda`) affiche « Meilleurs spots » ; les chips carte des 6 renvoient des spots ; loguer une prise future est refusé.
7. **NE PAS PUSH** : laisser à John.

---

## Récap migrations & décisions

| Migration | Objet | Type |
|---|---|---|
| `094_tag_sprint29_species.sql` | taguer 6 espèces sur spots curés (listes validées) | data (UPDATE) |
| `095_clean_alose_stickbait.sql` | retirer `alose` (3) + `stickbait`→`leurres` (5) | data (UPDATE) |
| `096_username_unique_ci.sql` | index unique `lower(username)` | index |

**Décisions ouvertes** :
1. **WS-A** : valider/compléter les listes de slugs (surtout **PACA** manquant pour les 4 espèces Med).
2. **WS-B** : `alose` → retirer (reco) ou créer une 27e fiche ?
3. **WS-C** : purger ou garder les 5 profils NULL/non-onboardés ?
4. **WS-F** : niveaux de vérif → câbler (A) ou retirer le code mort (B, reco) ?

**Parallélisme** : WS-A/B/C (data, indépendants) ‖ WS-D/E (code, indépendants) ‖ WS-F (décision préalable). Puis WS-G. **Dépendance** : WS-F option A profite du fix auto-confirm du Sprint 51 (compteur fiable). Effort ~2-3 j.

---

*Brief Sprint 53 rédigé le 2026-06-29. Slugs, contrainte username, schémas zod (catches/outings/cofishing) et bornes `CatchForm` vérifiés en base live + HEAD `7c23f5c`. ⚠️ PACA à compléter avant migration 094. Prochain : Sprint 54 sur demande.*
