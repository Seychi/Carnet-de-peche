# 🔍 Audit complet du site (post sprint 50) — Carnet de Pêche

> **Date** : 2026-06-29 · **Auteur** : Claude (Cowork) · **Pour** : John
> **Demande** : re-faire l'audit complet après sprints 47→50, **en ajoutant la QA visuelle live page par page**.
> **Méthode** : code lu **au commit de prod** (`git show HEAD` = `7c23f5c`, sprint-50) car l'index git local est corrompu ; **base live** (Supabase `glgciwwnpmgifyhbvxsw`) ; **advisors** sécurité/perf ; **Sentry** ; **vérifs live SSR** (fetch direct) ; et **QA visuelle live via navigateur** (desktop, connecté en tant que Seychi). 3 sous-agents ont re-ratissé le code (partage/S47-48, push/co-pêchage S49-50, nav/légende/modération/advisors).

> ⚠️ **Limite de la passe visuelle** : l'extension navigateur a un plancher de largeur (~500 px), donc je n'ai **pas pu rendre un vrai viewport mobile 390 px**. Le desktop est couvert ; le mobile reste à valider sur appareil réel ou en device-mode DevTools. Captures clés décrites ci-dessous.

> ⚠️ **État du dépôt local** : l'index git est de nouveau corrompu (`fatal: unknown index entry format 0x00730000`). La **prod est saine** (HEAD `7c23f5c` déployé). Mais `git status`/`git diff` locaux sont cassés. Avant de coder : `del .git\index.lock` si présent, puis au besoin reconstruire l'index (`git read-tree HEAD` ou `git restore .` après backup). Lecture du code faite via `git show HEAD:` (fiable).

---

## 0. Synthèse priorisée

**Sprints 47→50 : du très bon travail.** Le co-pêchage v2, la boîte à matériel, le badge de confiance, la photo de partage, le digest push : tout est livré, en prod, et fonctionne. Les invariants tiennent (zéro coordonnée GPS exposée, RLS fail-closed partout, EXIF strippé). Sentry est propre (2 issues, 0 user). Les findings ci-dessous sont des correctifs ciblés, pas une remise en cause de l'architecture.

| # | Constat | Domaine | Sév. | Statut vs 28/06 |
|---|---|---|---|---|
| **A1** | Push « fenêtre optimale » : le toggle s'affiche « Activé » aux **gratuits** alors que c'est payant (ils ne reçoivent rien) | Push (S49) | 🔴 P1 | **NOUVEAU** |
| **B1** | `outing_reviews` : clause RLS tautologique → on peut **noter n'importe quel utilisateur** (avis public nominatif = vecteur de harcèlement) | Co-pêchage (S50) | 🔴 P1 | **NOUVEAU** |
| **C** | Légende carte : lignes fantômes **« Zone active » + « Importé »** (couches mortes) | Carte | 🟠 P1 | **TOUJOURS OUVERT** |
| **D** | 6 espèces (barracuda, tassergal, liche, marbré, lieu-noir, merlan) sur **0 spot** | Espèces / data | 🟠 P1 | **TOUJOURS OUVERT** |
| **E** | Modération : « supprimer » avale le résultat → échec silencieux quand le post est déjà supprimé | Modération | 🟠 P1 | **TOUJOURS OUVERT** |
| **F** | Pages orphelines : « Proposer un spot » + « Mes propositions » (carte uniquement) ; « Mes sorties » caché si 0 sortie | Navigation | 🟠 P1 | **TOUJOURS OUVERT** |
| **G** | Cartes de partage **format story (1080×1920) cassées** : texte qui déborde, titre qui chevauche, 70 % de vide | Partage | 🟠 P1-visuel | aggravé/précisé |
| **H** | OG image : **aucune police chargée** (gras plat) | Partage | 🟡 P2 | **TOUJOURS OUVERT** |
| **C1** | Spot : un créateur peut **auto-confirmer** son propre spot communautaire (gonfle le compteur « N pêcheurs confirment ») | Confiance (S48) | 🟡 P2 | **NOUVEAU** |
| **A2** | In-app : les 5 nouveaux types de notif s'affichent « **Un pêcheur a interagi avec toi** » (faux pour les notifs système) | Push (S49) | 🟡 P2 | **NOUVEAU** |
| **A4** | Copy du toggle push maître : « Réservé aux abonnés » alors qu'il gouverne aussi 3 push gratuits → étouffe les push gratuits | Push (S49) | 🟡 P2 | **NOUVEAU** |
| **K** | Partage : description « **dans 17 .** » au lieu du nom du département (confirmé live) | Partage | 🟡 P2 | **TOUJOURS OUVERT** |
| **I** | Filtre carte : 6 chips d'espèces toujours à 0 résultat (= D) ; **toggle « Importés (OSM) » mort** (215→215 spots) | Carte | 🟡 P2 | élargi |
| **J** | Data : `alose` sur 3 spots sans fiche ; technique `stickbait` sur 5 spots (non canonique) | Data hygiène | 🟡 P2 | **TOUJOURS OUVERT** |
| **L** | Nav : `/techniques` stub lié comme une vraie page ; `/spots` ne renvoie pas vers `/carte` | Navigation | 🟡 P2 | **TOUJOURS OUVERT** |
| **G2** | OG image catch (paysage) : **« 1 » parasite** en haut à droite (glitch de rendu) | Partage | 🟡 P2 | **NOUVEAU** |
| **P** | `/carte` : tuiles de fond **lentes/instables à charger** (spinner persistant > 4 s) | Perf | 🟡 P2 | connu, re-confirmé |
| **A3** | In-app : les 3 notifs système routent vers `/fil` au lieu de `/carte`//`especes`//`home` | Push (S49) | 🟢 P3 | **NOUVEAU** |
| **B2** | Chat co-pêchage **non fermé** sur sortie passée/`done` (ouvert seulement bloqué si `cancelled`) | Co-pêchage (S50) | 🟢 P3 | **NOUVEAU** |
| **N** | Page `/c/[slug]` : emoji bruts (📏⚖️🌊) ; **typo « Loggue »** (double g) sur les fiches espèces | Copy | 🟢 P3 | **TOUJOURS OUVERT** |
| **M** | Advisors DB : FK non indexées (nouvelles tables), `spatial_ref_sys` (système), policies permissives | Sécurité/perf | 🟢 P3 | mineur |

---

## 1. ✅ Ce qui a été CORRIGÉ depuis le 28/06 (vérifié)

- **Photo du poisson sur la carte de partage** : livré (bucket public `share-photos`, `photo_url` dans le payload, `<img>` héro, **EXIF strippé serveur** via `sharp` sans `withMetadata`). Le levier viral n°1 est en place. ✓
- **Offset de marée** : appliqué partout (graphe + grille + 7j), badge de fraîcheur honnête (« ±N min · calé SHOM », masqué en Méditerranée plutôt qu'un chiffre inventé). ✓
- **Badge de confiance daté** : « Vérifié le JJ/MM par l'équipe » + fraîcheur + « N prises depuis la vérif » (k-anon). Honnête et sourcé. ✓
- **Heures de soleil sur `/home`** : semblent corrigées (j'ai vu `05:52–21:16` cohérent pour Alpes-Maritimes, plus le `08:19–00:23` cassé de Brest). À re-vérifier sur quelques façades. ✓ (probable)
- **Sécurité partage / co-pêchage** : zéro coordonnée GPS exposée, RLS fail-closed sur `outing_messages`/`outing_reviews`/`outing_participants`, EXIF strippé sur les photos de chat aussi. ✓

---

## 2. 🔴 P1 — à traiter en priorité

### A1 — Push qui ment aux gratuits
`components/notifications/NotificationTypeToggles.tsx:96-103` rend les 6 toggles à **tous** les users, sans test de tier. Or le push « fenêtre optimale » (`optimal_window`) est **payant** : le cron le gate derrière `current_tier ∈ {local, itinerant}` (`app/api/crons/personal-window/route.ts:152-157`). Un gratuit voit donc « Fenêtre optimale : Activé », l'active, et **ne reçoit jamais rien**, sans explication. (Vu live : « Alertes activées » sur `/home` et `/carnet` — légitime pour un abonné, trompeur pour un gratuit.) **Fix** : masquer/désactiver le toggle `optimal_window` pour les non-abonnés, ou le libeller « Réservé aux abonnés ». Les 5 autres types sont honnêtes (ils partent pour tous).

### B1 — `outing_reviews` : on peut noter n'importe qui
Policy `outing_reviews_insert_member` (`supabase/migrations/087_outing_reviews.sql:58`) : dans la branche « le noté est membre de CETTE sortie », le `proposal_id` non qualifié se lie au `op.proposal_id` interne → la condition devient `op.proposal_id = op.proposal_id`, **toujours vraie** (confirmé dans `pg_policies` live). Conséquence : un utilisateur peut laisser un **avis public nominatif** (note + commentaire) ciblant **quelqu'un qui n'a jamais participé à sa sortie**, du moment que cette personne est participant accepté **d'une sortie quelconque**. Vecteur de harcèlement/faux avis. **Fix** : qualifier `op.proposal_id = outing_reviews.proposal_id`. (L'action serveur ne compense pas, elle s'appuie entièrement sur cette clause.)

### C — Légende « Zone active » + « Importé » (confirmé live)
`components/map/MapLegend.tsx:61` (« Importé ») et `:69` (« Zone active », carré pointillé corail). **Vu en vrai** sur `/carte` : la légende bas-gauche affiche « Curé vérifié · Communauté · Importé · Zone active ». La couche « Zones actives » a été supprimée (S42.1, `074_remove_active_zones.sql`) sans retirer la ligne ; « Importé » et « Communauté » ne rendent jamais rien (imports `pending`, seule communauté `rejected`). **Fix** : supprimer le bloc « Zone active » (~`:63-70`) ; retirer ou requalifier « Importé »/« Communauté » tant qu'aucune donnée ne les produit. 10 min.

### D — 6 espèces sur 0 spot (inchangé)
Base live identique au 28/06 : `barracuda, tassergal, liche, marbre, lieu_noir, merlan` taguées sur **aucun** spot. Vu live : `/especes/barracuda` rend une fiche superbe **mais sans aucune section « Meilleurs spots »** (le composant se masque, `components/especes/species-top-spots.tsx:14`), et ces 6 chips sont offerts sur la carte (`/carte`) pour 0 résultat. **Fix** : migration data `058_tag_sprint29_species.sql` (taguer par listes de slugs curées : lieu-noir/merlan sur Manche-Atlantique rocheux/sableux, barracuda/tassergal/liche/marbré sur Méditerranée+Corse). Append-only idempotent.

### E — Modération : échec silencieux (inchangé)
`app/(app)/moderation/page.tsx:72-103` : les 8 wrappers (`deletePostAction`… `reverifySpotAction`) font `await moderatorDeletePost(...)` et **jettent le résultat**. Les actions renvoient `{ok:false,error}` (pas d'exception). Pas de `res.ok`, pas de throw, pas de toast → échec invisible. Le cas réel : un post déjà supprimé → `fail('Post introuvable.')` avalé → bouton qui « ne fait rien ». (Vu live : la file Signalements est vide actuellement, donc le bug ne se déclenche que sur un signalement dont le post est déjà parti. La RLS modération, elle, est **correcte**.) **Fix** : surfacer l'erreur (`if(!res.ok) throw`/toast) + traiter « déjà supprimé » comme succès et résoudre le signalement.

### F — Pages orphelines (inchangé)
`/spots/proposer` + `/spots/mes-propositions` : toujours **carte uniquement** (`MapShell.tsx:479,787`), absents de MoreMenu/AppSidebar/UserMenu. `/carnet/sorties` (« Mes sorties ») toujours gated `outingStats.totalOutings > 0` (`carnet/page.tsx:156`) → inatteignable à 0 sortie. Aucun **nouvel** orphelin introduit par S47-50 (vérifié : co-pêchage `/sorties` bien lié). **Fix** : ajouter un groupe « Contribuer/Mes spots » à `MoreMenu` + `AppSidebar` ; dé-gater « Mes sorties » ; étendre `nav-reachability.test.ts`.

### G — Cartes de partage : format story cassé (confirmé live, aggravé)
**Vu en vrai** sur `/og/card/<slug>?format=story` (1080×1920) : le titre « Mes conditions gagnantes » **chevauche** le sous-titre, les chips de droite (« au pr… », « le me… », « par v… », « la nu… ») **débordent hors cadre**, et **~70 % de la carte est vide**. C'est exactement tes 2 captures. En revanche le **format paysage 1200×630 est correct** (propre, on-brand). Donc le bug est la **mise en page story** : un layout pensé paysage est collé en haut du canvas vertical sans re-flow. Comme le partage mobile (Web Share) utilise le **story**, c'est ce que les gens reçoivent. **Fix** : layout dédié story (largeur contrainte, `flexWrap`, taille de police adaptative + troncature `…`, contenu réparti sur la hauteur). Fichiers : `app/og/card/[slug]/route.tsx` + `lib/og/template.tsx`.

---

## 3. 🟡 P2 — qualité / cohérence

- **H — Aucune police chargée dans l'OG image** : 0 `fonts:` dans les 5 `new ImageResponse(...)` (`route.tsx:981`, `og/spot/[slug]:67`, `opengraph-image:34`, `og/spots:48`, `especes/[slug]/opengraph-image:34`). Les gras 700/800/900 retombent en regular plat. **Fix** : `lib/og/fonts.ts` qui `fetch` Space Grotesk / Inter / JetBrains Mono. À faire avec G.
- **C1 — Auto-confirmation de spot** : `confirmSpot` (`app/actions/spots.ts:228-246`) n'exclut pas `created_by` ; la RLS (`084:28-30`) ne teste que `user_id = auth.uid()`. Un créateur peut gonfler « N pêcheurs confirment cette position » de +1 (lui-même). **Fix** : exclure `created_by` dans `confirmSpot` (+ `with check` joignant `spots.created_by <> auth.uid()`).
- **A2 — Libellés in-app faux** : `describe()` (`app/(app)/notifications/page.tsx:21-57`) n'a pas de `case` pour `big_tide`/`species_closure`/`weekly_digest`/`followed_catch`/`nearby_outing` → tous « Un pêcheur a interagi avec toi » (faux pour les 3 types système sans acteur). **Fix** : ajouter les cas.
- **A4 — Copy toggle push maître** : `PushSettingsToggle.tsx:24-31` dit « Réservé aux abonnés Local et Itinérant » alors que ce switch gouverne désormais **6** types dont 3 gratuits → un gratuit n'active pas le push et perd les notifs gratuites. **Fix** : reformuler en interrupteur global.
- **K — « dans 17 . »** (confirmé live) : la meta `og:description` du partage affiche « Une prise loguée sur Carnet de Pêche **dans 17 .** » (département `char(3)` non trimé). L'image OG trime, **pas** la page : `app/(marketing)/c/[slug]/page.tsx:81-84` `deptLabel()`. **Fix** : `.trim()` au lookup + à la source (`share.ts:362`).
- **I — Filtre/Toggle morts** : les 6 chips espèces à 0 résultat (= D) ; **toggle « Importés (OSM) » mort** : vu live, l'activer passe l'URL à `?source=curated&source=imported` mais le compteur reste **215 spots** (imports `pending` exclus). **Fix** : griser/retirer le toggle tant que la curation n'approuve rien ; piloter les chips espèces sur les espèces réellement présentes.
- **J — Data orpheline** : `alose` (3 spots, pas de fiche → texte gris non cliquable), `stickbait` (technique sur 5 spots, non canonique). **Fix** : retirer `alose` de ces 3 spots (ou créer la fiche) ; normaliser `stickbait`→`leurres`.
- **L — Nav** : `/techniques` (stub « bientôt », `noindex`) lié depuis Footer/MoreMenu ; `/spots` sans lien vers `/carte`. **Fix** : masquer/relibeller « Techniques » ; ajouter « Voir sur la carte ».
- **G2 — « 1 » parasite** : sur l'OG image catch paysage, un « 1 » flotte en haut à droite au-dessus de « cm » (glitch). À traquer dans `route.tsx` (probable reliquat de rendu du poids/record).
- **P — Perf `/carte`** : vu live, les tuiles de fond restent en spinner > 4 s à plusieurs reprises (Lighthouse mobile ~35 connu). Le sprint perf « carte instantanée » reste à faire.

---

## 4. 🟢 P3 — mineur

- **A3** — In-app, les 3 notifs système cliquent vers `/fil` au lieu de `/carte`//`especes`//`home` (`hrefFor()`, `notifications/page.tsx:100-127`). Les URL de push, elles, sont correctes.
- **B2** — Chat co-pêchage non fermé sur sortie passée/`done` (bloqué seulement si `cancelled`). Vu live : une sortie « Passée » garde « Relire la conversation ». Probablement voulu (débrief), à confirmer.
- **N** — `/c/[slug]` : emoji bruts (📏⚖️🗓️) au lieu d'icônes Lucide ; **typo « Loggue tes prises »** (double g) en bas des fiches espèces vs « Logue » ailleurs.
- **M — Advisors** : FK non indexées sur les nouvelles tables (`outing_messages.user_id`, `outing_reviews.reviewer_id`, `spot_confirmations.user_id`, `spots.verified_by`) — INFO, index B-tree cheap. `spatial_ref_sys` (PostGIS système, bénin). Policies permissives multiples (connu). **Aucune** nouvelle table 080-090 sans RLS/policy ; bucket `share-photos` OK ; aucun `security definer` app sans `search_path`. RAS critique côté nouvelles tables.

---

## 5. QA visuelle live — page par page (desktop, connecté Seychi)

| Page | Verdict | Notes |
|---|---|---|
| `/` (home) | ✅ Bon | Hero « Sache quand et où ça va mordre » + widget marée live (Cap Sizun, score 85). Propre, on-brand. |
| `/carte` | ⚠️ | Légende « Zone active »/« Importé » présentes (C). 26 chips espèces dont 6 morts (I). Toggle « Importés (OSM) » mort (I). **Tuiles de fond lentes** (P). |
| `/especes/[slug]` (barracuda) | ⚠️ | Fiche riche et excellente, **mais pas de section « Meilleurs spots »** (D). Typo « Loggue » (N). |
| `/c/[slug]` (partage) | ⚠️ | `og:description` « dans 17 . » (K), emoji recap (N). |
| OG image paysage 1200×630 | ✅/⚠️ | Correct et on-brand, mais « 1 » parasite en haut-droite (G2), type un peu plat (H). |
| OG image **story** 1080×1920 | ❌ | **Cassé** : débordement, chevauchement, 70 % vide (G). |
| `/home` (cockpit) | ✅ Bon | Bandeau instruments, score 84 + décomposition, tendances perso (moat) visibles. Soleil `05:52–21:16` correct. |
| `/carnet` | ✅ Bon | 8 prises, records, taux de relâche, boîte à matériel, « Mon année de pêche » (Wrapped). Note A1 (« Alertes activées »). |
| `/sorties` (co-pêchage) | ✅ Bon | Filtre niveau d'hôte + « départements voisins » (S50), sortie passée avec chat/log. Messaging privacy clair. |
| `/moderation` | ✅ Bon | Onglets Signalements / Spots / **Imports à curer 942** / Re-vérifier. File signalements vide (d'où E invisible à froid). |

**Non couvert** : vrai viewport mobile 390 px (plancher de largeur du navigateur). À valider sur appareil. Le backlog **942 imports à curer** est visible dans le panneau modération (lane ops S43, normal, mais gros volume invisible sur la carte tant que non curé).

---

## 6. Plan de correction proposé (ordre)

1. **Sécurité/honnêteté d'abord (P1)** : B1 (1 ligne SQL, migration `091`), A1 (gate tier UI). Rapides, fort enjeu.
2. **Lot « bugs visibles rapides »** : C (légende), E (modération), K (« 17 . »), G2 (« 1 » parasite), N (emoji + « Loggue »), I (toggle Importés). ~1 j.
3. **D** : migration data des 6 espèces (listes de slugs à valider par toi).
4. **F** : nav orphelines (MoreMenu/AppSidebar + dé-gating « Mes sorties »).
5. **Lot partage** : G (layout story) + H (polices) + G2 ensemble. ~1-2 j.
6. **C1, A2, A4, A3, B2, L, J, P, M** : polish + perf carte planifiée.

Invariants tenus à chaque correctif : RLS d'abord, migrations numérotées + regen `lib/types.ts`, zéro coordonnée exposée, pas de tiret cadratin dans la copy visible, pas de push sans ta validation.

---

*Audit re-fait le 2026-06-29 (post sprint-50). Vérifié contre HEAD `7c23f5c` (= prod), base live, advisors, Sentry, vérifs SSR et QA visuelle desktop. Remplace `AUDIT-2026-06-28-SITE-COMPLET.md` (dont les P1 restent ouverts). Détail fichier:ligne dans le corps.*
