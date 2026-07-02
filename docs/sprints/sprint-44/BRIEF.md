# Sprint 44 — Brief d'exécution
## « Cohérence & vérité » (correctifs features 37-40 · ~3-4 j)

> Rédigé le 2026-06-28. Correctif issu de l'audit `docs/audits/AUDIT-2026-06-28-FEATURES-37-40.md` (suit la roadmap `docs/ROADMAP-CORRECTIFS-ENRICHISSEMENTS-2026-06-28.md`). Sprints 37-43 passés ; **ancres re-vérifiées sur l'état courant** ce jour.
> Objectif : que chaque feature 37-40 tienne sa promesse. 3 bugs 🔴 (1 fuite de données privées, 1 feature « fantôme », 1 promesse mensongère) + 4 🟠 de cohérence + un lot 🟡.
> **Bonne nouvelle** : 2 des 3 🔴 sont à moitié faits (Bug 2 et Bug 3 : l'infra est là, il manque le geste final).

**⚠️ État à vérifier d'abord** : migrations sur disque à **073** ; **42.1 prend `074`**, donc ce sprint démarre à **`075`** (`supabase-guard` confirme avant de créer). **Working tree avec ~20 fichiers M non commités** touchant des zones de ce sprint (`share.ts`, `spots.ts`, `spots/[slug]/page.tsx`, `notifications`, `sorties`, crons) → **committer ou jeter avant de démarrer**, sinon les ancres de ligne dérivent.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-44/BRIEF.md`. **Confirme d'abord le working tree propre** et le dernier numéro de migration (075). Les 7 workstreams sont **indépendants** : lance-les en parallèle. 3 migrations atomiques (`075` verified_at, `076` chat+vue species, `077` index unique gear) ; le reste est app-side. Respecte les invariants (moat gratuit, scoring descriptif, floutage GPS, honnêteté « mesurée » pas « vérifiée », copy sans tiret cadratin). Regénère `lib/types.ts` après les migrations. Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Migrations `075`/`076`/`077` (RPC spot, policies chat, vue, index) | **supabase-guard** → Supabase (RO d'abord) | Reprendre le corps EXACT de `get_spot_by_slug` (043:514-576) et de la vue (053:128-146) ; préserver grants ; regen types. |
| QA des écrans corrigés (prise, push, marées, fiche spot, partage, chat) | **qa-chrome** → Claude in Chrome | Vérifier le geste final de chaque fix + 0 régression. |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Workstreams & dépendances

| WS | Bloc | Sév. | Migration | Parallèle J1 |
|----|------|------|-----------|--------------|
| A | Boîte : ownership `gear_id` + picker archivé + dédup | 🔴+🟡 | `077` (index) | ✅ |
| B | Prise mesurée affichée + bornes | 🔴+🟡 | — | ✅ |
| C | Push honnête (gate tier UI) + signal VAPID | 🔴+🟡 | — | ✅ |
| D | Marées : offset partout + message Méditerranée | 🟠 | — | ✅ |
| E | Confiance spot : `verified_at` visible | 🟠 | `075` | ✅ |
| F | Partage : sanitiser `location_label` | 🟠 | — | ✅ |
| G | Co-pêchage : fermer le chat + `species` dans la vue | 🟠 | `076` | ✅ |
| VERIF | revue + QA | — | — | ❌ |

Tous indépendants. Les 3 migrations sont atomiques et sans dépendance croisée.

---

## WS A — 🔴 Boîte à matériel : fuite `gear_id` + polish

**Le bug 🔴** : `gear_id` est inséré brut, sans vérifier qu'il appartient à l'utilisateur. La FK ne vérifie que l'existence, pas le propriétaire → un user peut rattacher sa prise au matériel d'autrui, et le `gear_label` dénormalisé de `catches_for_viewer` exposerait la marque/modèle privés d'un tiers sur une prise publique.

### Tâches
1. **Validation ownership** (`lib/catches/actions.ts`) : avant l'insert (`createCatch`, `:94`) et l'update (`updateCatch`, `:175`), si `gear_id` est fourni, vérifier par un SELECT owner-scopé (`from('gear_items').select('id').eq('id', gear_id).eq('user_id', user.id).maybeSingle()`) ; sinon rejeter (ou mettre `null`). **Idem pour `spot_id`** (même trou, `:100`/`:203`) — cf D2. Modèle de scoping : `app/actions/gear.ts:147,183`.
2. **🟡 Picker archivé en édition** : `app/(app)/carnet/[id]/modifier/page.tsx:33` charge `listMyGear()` (archivé exclu, `gear.ts:148`) → un leurre archivé rattaché à la prise disparaît du picker (`GearPicker.tsx:81-84` → `selected=null`). Fix : injecter l'item archivé courant (celui du `gear_id` de la prise) dans la liste passée au form.
3. **🟡 Dédup** (migration `077`) : `CREATE UNIQUE INDEX` sur `gear_items` `(user_id, kind, lower(brand), lower(model), lower(coalesce(color,'')))` `WHERE NOT archived` (aucun index unique aujourd'hui, `059`). + dans `GearPicker`, matcher l'existant avant de proposer la création.

### Critères d'acceptation
- Rattacher une prise à un `gear_id` qui n'est pas le sien → **refusé** (test direct). `gear_label` d'autrui n'apparaît jamais sur une prise publique.
- En édition, un leurre archivé déjà rattaché reste **affiché/sélectionné** dans le picker.
- Créer 2× le même leurre → bloqué/fusionné (index unique).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D2)** : valider aussi `spot_id` (reco oui, même trou) ou seulement `gear_id` ?

---

## WS B — 🔴 Prise mesurée affichée (feature « fantôme »)

**Le bug 🔴** : `measured_length_cm`/`reference_object`/`photo_verified_at` sont saisis et **déjà dans les objets** prise (`catches_for_viewer` les expose, `066:41-43` ; `CatchRow` via `select('*')`), mais **rendus nulle part**. Geste final manquant.

### Tâches
1. Afficher la mesure là où `size_cm` est rendu (les données sont déjà présentes) :
   - **Détail** : `app/(app)/carnet/[id]/page.tsx:189-214` (bloc « Mesures ») → ajouter « Mesurée : 62 cm » + objet de référence + un picto/pastille « mesurée » quand `photo_verified_at` non null.
   - **Carte** : `components/catches/CatchCard.tsx:99-105`.
   - **Ligne** : `components/catches/CatchRowItem.tsx:44-47`.
2. **Honnêteté** : libellé « mesurée » (jamais « vérifiée »), distinct de la taille déclarée `size_cm`. Si `measured_length_cm` et `size_cm` diffèrent, montrer la mesure comme la valeur de référence (« déclarée 60 / mesurée 62 »).
3. **🟡 Bornes** : aligner `measured_length_cm` (`schema.ts:43`, 1-299) sur `size_cm` (`:37`, 10-200) — garder une borne haute large pour les grosses espèces (congre) mais cohérente. Cf D4.

### Critères d'acceptation
- Une prise mesurée affiche « Mesurée : X cm (réf. Y) » sur le détail, la carte et la ligne ; une prise non mesurée n'affiche rien de plus.
- 0 emploi du mot « vérifiée » pour la mesure.

---

## WS C — 🔴 Push honnête (gate tier UI)

**Le bug 🔴** : un gratuit voit « Activer les alertes » puis « Alertes activées », mais le cron ne lui enverra jamais rien (gate Local/Itinérant). Le **serveur gate correctement** (`personal-window/route.ts:65-70`) ; seule l'UI ment.

### Tâches
1. **Gate l'UI** : `EnablePushAlerts.tsx` (monté `carnet/page.tsx:127`, et **le tier est déjà chargé** dans le parent `carnet/page.tsx:74` via `getUserTier()`). Passer `tier` en prop ; pour un **gratuit** : remplacer le bouton « Activer les alertes » (`:113-121`) par un **CTA upsell** « Passe en Local pour être prévenu au bon moment », et **ne pas** afficher « Alertes activées ». Pour Local/Itinérant : comportement actuel.
2. **🟡 Signal VAPID absent** : `use-push-subscription.ts:99-104` `return` silencieux si la clé publique manque → l'utilisateur clique, rien ne se passe. Surfacer un état « indisponible pour l'instant » dans `EnablePushAlerts` plutôt qu'un bouton muet.
3. **Note** : `PushSettingsToggle.tsx` **n'existe pas** (pas de page réglages push) → hors périmètre ; un éventuel réglage granulaire est un enrichissement (sprint 49), pas ce correctif.

### Critères d'acceptation
- Un compte **Découverte** voit un CTA upsell, pas « Activer/Activées ». Un **Local/Itinérant** garde le flux d'abonnement.
- Si VAPID absente, l'UI le dit (pas de bouton mort).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : se limiter au gate + upsell (reco), ou créer en plus une page de réglages push (→ plutôt sprint 49) ?

---

## WS D — 🟠 Marées : offset cohérent partout

**Le bug 🟠** : l'offset de calibration (`tide-calibration.ts:107`, `-bias_min`) corrige les **cartes texte PM/BM** (`TideChart.tsx:95-99`) mais **pas** le graphe ni la grille ni le calendrier 7j → « PM 14h32 » affiché à côté d'un point décalé de 30-50 min, même écran.

### Tâches
1. `components/conditions/TideChart.tsx` : appliquer `offsetHours` (déjà calculé `:95-97`) à
   - **`ReferenceDot`** du graphe (`:227-244`, `x={ex.hour}` → `ex.hour + offsetHours`),
   - **tableau « Grille »** (`:268-303`, heures brutes `{p.hour}h` et le `find(e => e.hour === p.hour)`).
2. **Calendrier 7 jours** : `app/(marketing)/spots/[slug]/page.tsx:285-296` (`tidesByDate` construit avec `hi.hour`/`lo.hour` bruts) → câbler `getTideCalibration`/offset pour le département du spot, comme le bandeau live.
3. **Message Méditerranée** : sur les façades sans calibration (marnage faible), afficher une note honnête (« marnage faible, marée surtout météo-dominée ») au lieu d'un trou silencieux.

### Critères d'acceptation
- Sur une même fiche, les heures PM/BM du graphe, de la grille, du calendrier et des cartes texte **coïncident**.
- Une fiche méditerranéenne affiche une note marée au lieu d'un blanc.

### Garde-fous
- Ne pas inventer de coef de marée (`tide_coefficient` reste null). La courbe brute peut rester non corrigée si on l'explicite, mais les **heures PM/BM** doivent être homogènes.

---

## WS E — 🟠 Confiance spot : `verified_at` visible (migration `075`)

**Le bug 🟠** : la promesse « vérifié le JJ/MM » est codée en DB (`verified_at`/`verified_by`) mais **jamais affichée** : `get_spot_by_slug` ne renvoie pas `verified_at`, et la colonne n'est pas grantée (verrou 028b/041). Le front l'assume déjà (`spots/[slug]/page.tsx:612-616`).

### Tâches
1. `supabase/migrations/075_spot_verified_at_visible.sql` : **DROP + CREATE** `get_spot_by_slug` (base `043_spots_sources.sql:514-576`, le type de retour change donc pas de `CREATE OR REPLACE`) pour ajouter **`verified_at timestamptz`** au `RETURNS TABLE` + au SELECT final. Préserver les grants. (`verified_by` peut rester fermé → on affichera « par l'équipe ».) Regénérer `lib/types.ts`.
2. Front : étendre `SpotDetail` + le mapping `getSpotBySlug` (`spots/[slug]/page.tsx:30-78`) ; afficher la date dans l'encart « Coordonnée vérifiée » (`:617-629`) : « Vérifié le JJ/MM par l'équipe ».
3. **🟡 (option)** Unifier la clé du badge carte (`MapView.tsx`, `source==='curated'`) et fiche (`verified`) — mineur, cf audit.

### Critères d'acceptation
- La fiche d'un spot vérifié affiche « Vérifié le JJ/MM par l'équipe ».
- `get_spot_by_slug` renvoie `verified_at` ; aucune fuite de `verified_by` brut au client.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D3)** : exposer `verified_at` seul (reco) ou aussi un libellé d'auteur ?
- Ne pas dé-verrouiller d'autres colonnes `spots` au passage.

---

## WS F — 🟠 Partage : sanitiser `location_label`

**Le bug 🟠** : `location_label` est du **texte libre** (le `reverseGeocode` est propre à la commune, `CatchForm.tsx:345` zoom=10, mais le champ est éditable, `schema.ts:64` ne valide que la longueur). Il entre **tel quel** dans le payload public de partage (`share.ts:226`).

### Tâches
1. **Sanitiser à l'entrée du payload** (`app/actions/share.ts:226`) : ne sortir qu'une granularité sûre (commune connue / département), pas la chaîne libre. Au minimum, appliquer un filtre `LOOKS_LIKE_COORD` (réutiliser celui de `lib/cofishing/schema.ts:12`) et tronquer/normaliser.
2. **(option) au schéma catch** (`schema.ts:64`) : ajouter un `refine(noCoord)` pour empêcher une coord dans `location_label` à la saisie.

### Critères d'acceptation
- Une prise dont `location_label` contient un lieu-dit précis ou une coord ne le **fuite pas** dans la carte de partage (commune/département seulement).
- Le partage reste geom-free (déjà le cas pour les coords ; on ferme le vecteur texte).

---

## WS G — 🟠 Co-pêchage : fermer le chat + `species` dans la vue (migration `076`)

**Les bugs 🟠** : (a) le chat `outing_messages` reste lisible/écrivable après annulation (les policies `068:33-67` ne testent que l'appartenance, jamais le `status` de la sortie) ; (b) `species` n'est pas dans `outing_proposals_for_viewer` (`053:128-146`) → contournement coûteux 2-requêtes (`queries.ts:60-76`).

### Tâches
1. `supabase/migrations/076_outing_chat_status_and_species.sql` :
   - **Recréer les 2 policies** `outing_messages_select_member` + `outing_messages_insert_member` (`068:33-67`) en ajoutant une condition sur la sortie : `... AND p.status IN ('open','full')` (chat fermé dès `cancelled`/`done`).
   - **`CREATE OR REPLACE VIEW outing_proposals_for_viewer`** (base `053:128-146`, garder `security_invoker`) pour exposer **`species`**.
   - Regénérer `lib/types.ts`.
2. **Supprimer le contournement 2-requêtes** : `lib/cofishing/queries.ts:60-76` → lire `species` directement depuis la vue (filtre matching en SQL possible ensuite).
3. **UX annulation** : `cancelOuting` (`actions.ts:193-237`) notifie déjà les acceptés ; garder la sortie visible **grisée** pour ses participants (lecture seule du chat fermé) plutôt que disparue.

### Critères d'acceptation
- Après annulation/clôture d'une sortie, le chat est **en lecture seule** (insert refusé par la RLS) ; un `requested`/tiers ne voit toujours rien.
- `outing_proposals_for_viewer` renvoie `species` ; `queries.ts` ne fait plus 2 requêtes.

### Garde-fous
- Chat toujours **fail-closed** (hôte + accepté). Zéro coordonnée (le `LOOKS_LIKE_COORD` du chat reste).

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : build + typecheck + lint + tests verts.
2. **QA (qa-chrome)** : prise mesurée affichée (détail/carte/ligne) ; gratuit voit l'upsell push (pas « activées ») ; heures marées cohérentes (graphe = grille = calendrier = cartes) ; fiche spot « vérifié le JJ/MM » ; carte de partage sans lieu-dit libre ; chat de sortie annulée en lecture seule.
3. **Passe sécurité** : `gear_id`/`spot_id` ownership validés (test cross-user refusé) ; `verified_by` non exposé brut ; chat RLS fail-closed + statut ; floutage GPS et gating intacts ; advisors sans nouvelle alerte.
4. **Passe honnêteté** : « mesurée » jamais « vérifiée » ; push ne promet rien à un gratuit ; marées sans coef inventé.
5. **Passe copy** : tutoiement, zod FR, pas de tiret cadratin (`node scripts/lint-copy-dashes.mjs`).
6. Livrer `docs/sprint-44/RECAP.md` : fait / comment tester / statut D1-D4.

---

## Décisions pour John
- **D1 (push)** — gate + upsell seulement (reco), ou page de réglages push en plus (→ sprint 49) ?
- **D2 (ownership)** — valider aussi `spot_id` en plus de `gear_id` (reco oui, même trou) ?
- **D3 (verified_at)** — exposer la date seule (reco) ou un libellé d'auteur ?
- **D4 (bornes mesure)** — aligner `measured_length_cm` sur `size_cm` (borne basse) en gardant une borne haute large ?

## Reste manuel John (post-sprint)
- **Committer/jeter le working tree** avant de démarrer (sinon ancres décalées).
- Appliquer `075`/`076`/`077`, regen types, merger `sprint-44` → `main`, déployer, QA des 7 fixes.

---

> **Invariants (rappel)** : pas de push sans validation · RLS jamais désactivé · migrations = nouveaux fichiers (`075`/`076`/`077`) + regen `lib/types.ts` · honnêteté « mesurée » ≠ « vérifiée » · floutage GPS + gating intacts · partage/chat zéro coordonnée · scoring descriptif · copy sans tiret cadratin.
