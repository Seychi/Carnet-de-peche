# 🔬 Grand audit des features des sprints 37-40 — bugs & enrichissements

> **Date** : 2026-06-28 · **Auteur** : Claude (audit fonctionnel profond, 5 sous-agents + revue code) · **Commanditaire** : John
> **Périmètre** : toutes les fonctionnalités ajoutées aux sprints **37, 38, 39, 40** (la carte/sprint 41 est couverte par `AUDIT-2026-06-28-POST-37-41.md` + briefs 42/43). Pour chaque feature : comment ça marche, les **bugs/lacunes** (🔴/🟠/🟡), et des **idées d'enrichissement** pour la rendre plus riche et meilleure.
> **Verdict** : aucune des 7 features n'est cassée au point de planter, mais l'audit profond révèle **3 vrais bugs à corriger vite** (1 fuite de données privées, 1 promesse mensongère, 1 feature « fantôme »), une poignée d'incohérences 🟠, et surtout un **gros potentiel d'enrichissement** pour transformer ces briques en avantages différenciants.

---

## 0. Synthèse : les correctifs prioritaires (tous sprints confondus)

| # | Sévérité | Feature | Problème | Fix |
|---|---|---|---|---|
| 1 | 🔴 **Sécurité** | Boîte à matériel | `gear_id` **non validé à l'écriture** : un user peut rattacher sa prise au leurre d'un autre → le `brand/model/color` privé de la victime **fuite** via `gear_label` sur une prise publique. | Valider que `gear_id` appartient à `user.id` avant insert/update (`lib/catches/actions.ts:94,175`). |
| 2 | 🔴 **Feature fantôme** | Prise mesurée | La longueur mesurée + objet de référence ne sont **affichés nulle part** : la saisie disparaît, le flag ne sert qu'à un badge. | Afficher « 62 cm (mesurée, réf. X) » sur la prise/carte (données déjà dans `catches_for_viewer`). |
| 3 | 🔴 **Promesse mensongère** | Web Push | Un **gratuit** peut « activer les alertes » et voir « Alertes activées », mais ne recevra **jamais** de push (le cron filtre Local/Itinérant). | Rendre l'UI tier-aware (upsell pour les gratuits) `components/push/EnablePushAlerts.tsx`. |
| 4 | 🟠 **UX cassée** | Notifs (S37/S40) | `spot_verified` + les 6 `outing_*` tombent sur « a interagi avec toi » et vont vers `/fil` au lieu de `/sorties` / propositions. | **Déjà prévu Sprint 42 WS D** (`app/(app)/notifications/page.tsx:18-92`). |
| 5 | 🟠 **Confiance** | Marées vérifiées | L'offset corrige les cartes texte mais **pas** le graphe, la grille, ni le calendrier 7j → « PM 14h32 » affiché à côté d'un point 40 min décalé, même écran. | Appliquer l'offset partout OU expliciter « courbe brute, heures calées SHOM » (`TideChart.tsx:227-303`, `spots/[slug]/page.tsx:286-296`). |
| 6 | 🟠 **Fuite de granularité** | Partage | `location_label` est du **texte libre** non sanitisé : un user peut écrire « cale de Trez Hir, rocher à droite » → public sur la carte partagée. | Tronquer à la commune / au département dans le payload (`app/actions/share.ts:225`). |
| 7 | 🟠 **Confiance invisible** | Badge vérifié | `verified_at`/`verified_by` **jamais affichés** (la promesse « vérifié le JJ/MM par X » est codée en DB mais perdue côté UI). | Exposer `verified_at` dans `get_spot_by_slug` + l'afficher sur la fiche. |

Les bugs 1, 2, 3 méritent un **sprint correctif dédié** (proposé §9). Le 4 est dans le Sprint 42. Les 5-7 peuvent rejoindre ce correctif.

---

## 1. Sprint 37 — Boîte à matériel personnelle

**Comment ça marche.** Table `gear_items` owner-only (`059_catch_gear.sql:17-29`), FK `catches.gear_id` non destructive (`ON DELETE SET NULL`, `:60-61`), `gear_label` dénormalisé en LEFT JOIN vivant dans `catches_for_viewer` (`:122-127`, se met à jour au rename, survit à l'archivage). Picker combobox avec création inline filtré par technique (`GearPicker.tsx`, `CatchForm.tsx:136-138`), fallback texte legacy conservé, backfill des leurres legacy (`059:151-181`). 6ᵉ facteur `gear` du scoring perso descriptif (`buckets.ts:89-98`, `tendencies.ts:68-71`), rendu « X % de tes prises {leurre} », page `/carnet/boite`. Bien testé (`gear.test.ts`).

**Bugs / lacunes :**
- 🔴 **Ownership `gear_id` non validé** (cf §0 #1) — fuite cross-user du matériel privé via `gear_label` exposé sur les prises publiques. `actions.ts:94,175` insèrent `data.gear_id` sans SELECT owner-scoped. **À corriger avant tout partage de boîte.**
- 🟠 **Picker perd un matériel archivé en édition** : `listMyGear` exclut `archived` (`gear.ts:148`), donc un leurre archivé rattaché à une vieille prise apparaît vide dans le picker en mode édition (`GearPicker.tsx:81-84`). Fix : injecter l'item courant même archivé.
- 🟠 **Pas de déduplication** : créer 2× « Black Minnow chartreuse » fait 2 items → la boîte `/carnet/boite` répartit les prises sur 2 cartes (compteur dilué, leurre vedette sous-estimé). Pas d'index unique. Fix : unique partiel `(user_id,kind,lower(brand),lower(model),lower(color))` + matcher l'existant dans le picker.
- 🟡 `size_mm='0'` rejette toute la création inline (zod `min(1)`, message générique) ; `MIN_PER_FACTOR=2` peut afficher « 100 % au leurre X » dès 2 prises (statistiquement creux pour du matériel) ; prises legacy sans leurre saisi non rattrapables (honnête mais à expliciter).
- ✅ Archivage non destructif, rename live, RLS owner tenue partout, absence-≠-valeur respectée.

**Enrichissements (ranked) :**
1. **(fort/faible)** Tendance gear par espèce sur `/especes/[bar]` (« sur tes bars : 60 % au Black Minnow ») — réutilise `getPersonalTendencies({species})`, quasi gratuit, fort SEO/rétention.
2. **(fort/moyen)** Croisement leurre × espèce × condition (« ton shad : 7 bars, dont 5 en descendante, surtout le matin ») — c'est LE moat que FishFriender (catalogue générique 160k) ne peut pas copier.
3. **(fort/moyen)** « Le bon leurre pour aujourd'hui selon ton historique » sur `/home` (descriptif, pas prédictif).
4. **(moyen/faible)** Dédup + fusion d'items (corrige le 🟠 et fiabilise le moat).
5. **(moyen/moyen)** Photos de leurres (réutilise le pipeline WebP) — boîte visuelle, comble le Pokédex de Fishing Grid.
6. **(moyen/faible)** Stats d'usure/perte (« ce leurre t'a sorti 12 poissons avant de te lâcher ») — narratif pêcheur unique.
7. **(moyen/moyen)** Boîte partageable en lecture (libellés seuls, jamais les spots) — social viral, post-fix #1.

---

## 2. Sprint 37 — Badge « spot GPS vérifié »

**Comment ça marche.** `060_spot_verification.sql` ajoute `verified_at`/`verified_by`, backfille les curés en `verified=true`, étend `nearby_spots`/`get_top_spots_for_species`. `moderateVerifySpot` (`spots.ts:257-304`) pose verified+source=curated+approved + notifie. Badge ✓ keyé `source==='curated'` sur la carte (`MapView.tsx:148`), `~`/`◦` pour community/imported ; fiche keyée sur `verified` (`spots/[slug]/page.tsx:361,617`). Contrainte `verified⇒curated` (`043:54-56`).

**Bugs / lacunes :**
- 🔴/🟠 **Notif `spot_verified` non routée/libellée** (cf §0 #4, dans Sprint 42).
- 🟠 **Double clé badge** : carte sur `source`, fiche sur `verified`. Un futur curé inséré sans `verified=true` aurait le ✓ sur la carte mais pas l'encart fiche. Fix : même condition (idéalement `verified`) + trigger d'auto-verified à l'insertion curée.
- 🟠 **`verified_at`/`verified_by` invisibles** (cf §0 #7) — `get_spot_by_slug` ne les renvoie pas, l'encart dit « on n'affiche pas de date ». La promesse centrale est perdue côté UI.
- 🟠 **« Marquer vérifié » inatteignable post-approbation** : la modération ne liste que `pending` (`moderation/page.tsx:336`) → un spot approuvé ne peut plus être vérifié. (Le Sprint 43 ajoute une file `imports`, mais le re-verify d'un spot live reste à prévoir.)
- ✅ Pas de fuite de badge sur les imports OSM (`◦`, jamais `✓`).

**Enrichissements :**
1. **(fort/faible)** Afficher « Vérifié le JJ/MM par l'équipe » (exposer `verified_at`) — transforme un badge déco en preuve datée, frappe Decathlon.
2. **(fort/moyen)** Report d'erreur de coordonnée par les users (« cette position est fausse » → file modération via `reports`/`target_type='spot'`) — boucle de confiance vivante, unique.
3. **(moyen/moyen)** Niveaux de vérification (communauté confirmée → ambassadeur → équipe) au lieu d'un booléen.
4. **(moyen/moyen)** Historique de fiabilité (« vérifié il y a 8 mois · 23 prises confirmées depuis »).
5. **(moyen/faible)** Page admin « re-vérifier un spot live » (lever la limite `pending`-only).

---

## 3. Sprint 38 — Marées « vérifiées port par port »

**Comment ça marche.** `tide_calibration` (`062`/`064`, port/façade/bias/résidu/date/source), `verify-tides.ts` compare Open-Meteo vs SHOM figé (5 ports), offset `-bias_min` appliqué par département (`lib/conditions/tide-calibration.ts:107`) aux **cartes live PM/BM** (`TideChart.tsx:95-99`), encart de confiance affichant le résidu (1-8 min) + date (`TideCalibrationNote.tsx`).

**Bugs / lacunes :**
- 🟠 **Offset incohérent** (cf §0 #5) : appliqué aux cartes texte, **pas** aux `ReferenceDot` du graphe (`:227-244`), à la Grille (`:268-303`), ni au calendrier 7j (`page.tsx:286-296`). L'utilisateur lit « PM 14h32 » à côté d'un point 40 min décalé. **Mine la crédibilité sur le même écran.**
- 🟠 **Couverture faible** : 5 ports, 2 façades. Manche (22/50/76/59/62) toute calée sur Saint-Malo (jusqu'à 200 km), côte basque sur Arcachon, **Med = 0 port**. Claim géographiquement fragile.
- 🟡 **Communication des écarts** : l'encart annonce le résidu (1-8 min) pendant que le graphe montre l'erreur brute (31-93 min). Le RECAP-38 décrit encore l'ancienne copy « écart médian » (drift doc/code).
- 🟡 **Méditerranée muette** : pas d'offset (choix honnête, micro-marée), mais aucun message rassurant (« marnage faible, marée météo-dominée »).

**Enrichissements :**
1. **(fort/moyen)** Étendre la calibration à ~1 port/département côtier (le pipeline `verify-tides.ts` existe) — rend « calé sur TON port » crédible, arme anti-Fishing Grid.
2. **(fort/faible)** Corriger l'offset partout (ou l'expliciter) — prérequis de crédibilité.
3. **(fort/faible)** Badge de précision marée lisible par spot (« marées ±3 min, calé SHOM ») — rend visible le travail invisible (après le fix offset).
4. **(moyen/moyen)** Historique/fraîcheur de la calibration.

---

## 4. Sprint 38 — Moteur de partage social (façon Strava)

**Comment ça marche.** Architecture edge-safe propre : server action geom-free → `shared_cards` → route OG edge anon (`app/og/card/[slug]/route.tsx`). 3 cartes : **catch**, **conditions** (Wrapped descriptif), **outing** (sortie privée agrégée). Formats OG 1200×630 + Story 1080×1920 (`lib/og/template.tsx:41-44`). Web Share avec fichier image + fallbacks (`use-share-card.ts`). Page `/c/[slug]` publique, slug non énumérable (base62, `crypto.randomBytes`), révocation (`deleteShareCard` + `ManageShareCards`), opt-in obligatoire (`ShareOptInDialog`).

**Bugs / lacunes :**
- 🟠 **`location_label` non sanitisé** (cf §0 #6) — texte libre éditable, part public tel quel. Le claim geom-free tient pour les coords, pas pour ce que le user écrit. Fix : tronquer commune/département.
- 🟡 **Carte orpheline** : pas de FK vers `catches`, donc la carte survit à la suppression de la prise (snapshot figé, `is_personal_best` figé). À assumer.
- 🟡 **Aucun rate-limit anti-spam** sur `createShareCard` (dédup 24h limite les doublons, pas le volume).
- 🟡 **Photo absente** — bucket privé, edge ne peut pas signer. Bon choix technique mais **lacune virale majeure** (une carte de pêche sans le poisson).
- 🟡 **`/c/[slug]` indexable** par défaut (décision SEO à trancher : acquisition vs dilution).
- 🟡 Double fetch de la carte (`generateMetadata` + page, pas de `cache()`).
- ✅ Accents FR OK, valeurs nulles bien gérées, record perso sain (anti-comparaison), slug solide.

**Enrichissements (façon Strava) :**
1. **(fort/élevé)** **Photo du poisson** via bucket public opt-in + strip EXIF — LA feature qui manque pour la viralité.
2. **(fort/moyen)** Carte récap mensuel/annuel « Wrapped » (`kind='recap'`) — effet Spotify Wrapped en décembre.
3. **(moyen/faible)** Handle/@pseudo sur la carte — appropriation, chaque capture reste attribuée.
4. **(moyen/moyen)** Thèmes/variantes de carte (`?theme=`) — donne envie de re-partager.
5. **(moyen/faible)** Partage 1-tap (opt-in une fois, « ne plus demander ») — réduit la friction.
6. **(moyen/moyen)** « PR board » records perso par espèce partageable.
7. **(moyen/élevé)** Leaderboard d'espèces **anonymisé** k-anon — ⚠️ à arbitrer vs l'ADN anti-comparaison du projet.

---

## 5. Sprint 39 — Web Push « fenêtre optimale »

**Comment ça marche.** Hook `usePushSubscription` (détection `supported`/`unsupported`/`ios-needs-pwa`, opt-in **sur geste** uniquement, rollback si POST échoue). 2 points d'entrée : `EnablePushAlerts` sur `/carnet` (après 1ʳᵉ prise) + `PushSettingsToggle` dans `/notifications`. Table `push_subscriptions` owner-only, upsert par endpoint. `sendPushToUser` best-effort (no-op si VAPID absent, purge 404/410), greffé au cron `personal-window` (hérite gate tier + idempotence 1/jour). SW handlers push/notificationclick.

**Bugs / lacunes :**
- 🔴 **Pas de gate tier réel sur l'UI** (cf §0 #3) — un gratuit s'abonne, voit « Alertes activées », ne reçoit jamais rien. Promesse mensongère.
- 🟠 **VAPID absent en prod = push muet sans signal** : le bouton ne fait rien de visible (pas de toast). Edge case si déploiement avant pose des clés Vercel.
- 🟡 Pas de réglage par type (toggle binaire global) ; abonnements morts purgés seulement à l'envoi (jamais périodiquement) ; désync possible navigateur↔base si permission révoquée hors app.
- ✅ Opt-in sur geste, rollback propre, RLS owner, idempotence/gate hérités du cron.

**Enrichissements :**
1. **(fort/faible)** Gate tier honnête + upsell pour les gratuits (corrige le 🔴).
2. **(moyen/moyen)** Plus de types : grandes marées (coef > seuil), nouvelle prise d'un suivi, rappel réglementation/fermeture ; **digest hebdo** (faible risque de fatigue).
3. **(moyen/moyen)** Réglages granulaires par type.
4. **(faible/faible)** `setAppBadge()` compteur PWA + purge périodique des endpoints morts.
- Rappel : **push natif iOS plein écran = différé au mobile** (Expo).

---

## 6. Sprint 39 — Prise mesurée

**Comment ça marche.** `066_catch_verification.sql` ajoute `measured_length_cm`/`reference_object`/`photo_verified_at` (+ exposés par `catches_for_viewer`). Form : toggle « Prise mesurée » révélant longueur + objet de référence (`CatchForm.tsx:662-717`). `photo_verified_at` posé **seulement** si case + longueur + référence (`actions.ts:74-88`). Badge `prise_mesuree` (`badges.ts:71-75`, `recompute_my_badges`). Copy rigoureusement « mesurée », jamais « vérifiée » (honnête).

**Bugs / lacunes :**
- 🔴 **La valeur mesurée n'est lue/affichée NULLE PART** (cf §0 #2) — le pêcheur saisit longueur + référence qui disparaissent. Aujourd'hui, juste un flag pour débloquer un badge. `size_cm` et `measured_length_cm` coexistent sans réconciliation.
- 🟡 Bornes incohérentes : `size_cm` 10-200 vs `measured_length_cm` 1-299 (un congre de 250 cm passe en mesuré mais pas en `size_cm`).
- ✅ Honnêteté du flag correcte, badge bien calculé.

**Enrichissements :**
1. **(fort/faible)** **Afficher la mesure** (corrige le 🔴) : « 62 cm (mesurée, réf. X) » + picto règle.
2. **(fort/faible-moyen)** Records perso par espèce (« ta plus grande dorade : 48 cm ») depuis `measured_length_cm`.
3. **(moyen/faible)** Conversion taille→poids par espèce (W = a·Lᵇ) — enrichit la fiche prise.
4. **(moyen/moyen)** Fil « plus grosses prises mesurées » (descriptif, pas compétitif — respecter l'anti-leaderboard).
5. **(fort/élevé, différé mobile)** Mesure assistée par photo (le champ `reference_object` est la fondation ; IA on-device au mobile).

---

## 7. Sprint 40 — Co-pêchage musclé

**Comment ça marche.** `outing_proposals` + `species`/`reminded_at` (`067`), zéro geom (invariant tenu). Matching espèce **en mémoire** (`queries.ts:79-83`, l'index GIN n'est jamais utilisé). Chat `outing_messages` (`068`) append-only, RLS fail-closed (hôte + `accepted` seulement, ne réutilise PAS la policy trop large des participants). Trigger statut open↔full (`067:34-77`). Notifs groupe (full/cancelled/message/reminder). Rappel veille fusionné dans le cron RecFishing (idempotent `reminded_at`, + push).

**Bugs / lacunes :**
- 🔴/🟠 **Notifs outing mal routées** (cf §0 #4, Sprint 42) — vont vers `/fil` au lieu de `/sorties`.
- 🟠 **Chat non fermé sur `cancelled`/`done`** : la RLS chat ne référence pas le statut → après annulation, le chat reste lisible/écrivable via l'API, mais la sortie disparaît du board (incohérence). Fix : `AND p.status IN ('open','full')` aux policies 068 + garder la sortie grisée pour ses participants.
- 🟠 **`species` non exposé par la vue** → 2 requêtes + filtre JS, index GIN inutilisé (`queries.ts:63-85`). Dette perf. Fix : ajouter `species` à `outing_proposals_for_viewer`.
- 🟡 `canChat` UI peut être en retard sur une acceptation live (pas de Realtime sur `outing_participants`) — fail-closed correct, juste pas réactif ; `LOOKS_LIKE_COORD` contournable (DMS, liens Maps, 2 décimales) ; **aucune modération/signalement du chat** (`reports` accepte pourtant `target_type='outing'`) ; pas de notif « une place s'est libérée » au re-open ; re-candidature après refus impossible (PK).
- ✅ Chat fail-closed correct, rappel idempotent + push, zéro coordonnée.

**Enrichissements :**
1. **(fort/XS)** Routing + libellés notifs outing (Sprint 42) — sans ça la boucle d'engagement casse en in-app.
2. **(fort/moyen)** Matching par niveau (`profiles.level`) + départements limitrophes (jamais un point) — l'espèce seule est faible.
3. **(fort/moyen)** Profils de confiance + avis post-sortie (`outing_reviews`) — réputation que Decathlon/Fishing Grid n'ont pas.
4. **(fort/moyen)** « Loguer à plusieurs » : depuis une sortie `done`, pré-remplir une prise pour chaque participant — lie le social au moat carnet.
5. **(moyen/S)** Modération/signalement du chat (dette de sécurité avant montée en charge).
6. **(moyen/S)** Fermer le chat sur cancelled/done + bannière read-only.
7. **(moyen/S-M)** « Sorties près de toi » (notif opt-in par dépt) + statut « sur place » (texte, zéro coord).
8. **(moyen/M)** Photos dans le chat — **strip EXIF GPS obligatoire** avant upload (sinon spot-burning par métadonnée).

---

## 8. Thèmes transversaux

- **Le moat sous-exploité** : la boîte à matériel et la prise mesurée produisent de la donnée riche (leurre gagnant, longueur) qui **n'est pas encore remontée** à l'utilisateur. Les afficher (tendance gear par espèce, records mesurés) est le meilleur ratio valeur/effort de tout l'audit.
- **Confiance = à rendre visible** : badge vérifié daté + marées précises au port sont des armes marketing (anti-Decathlon, anti-Fishing Grid) mais aujourd'hui **invisibles ou incohérentes**. Les rendre lisibles est prioritaire.
- **Viralité = la photo** : le moteur de partage est techniquement excellent mais sans le poisson, il est viral-faible. Le bucket public opt-in + strip EXIF est le déblocage clé.
- **EXIF GPS** : récurrent (partage photo, chat photo, prise mesurée photo) — toute photo qui peut devenir publique doit être **strippée EXIF côté serveur**. À traiter une fois, proprement, et réutiliser.
- **Honnêteté** : globalement très bonne (prise « mesurée » pas « vérifiée », marées résiduelles, anti-leaderboard). Deux entorses involontaires à corriger : le push qui ment aux gratuits, et l'offset marée incohérent.

---

## 9. Plan de correction & d'enrichissement

### Sprint 44 — « Cohérence & vérité des features 37-40 » (correctif, ~3-4 j)
Regroupe les bugs de cet audit non couverts par 42/43 :
- 🔴 Valider l'ownership `gear_id` à l'écriture (fuite cross-user).
- 🔴 Afficher la prise mesurée (longueur + référence) sur la prise/carte.
- 🔴 Push tier-aware (upsell gratuits, ne plus mentir).
- 🟠 Offset marée appliqué partout (ou explicité) + message Méditerranée.
- 🟠 Exposer `verified_at` sur la fiche spot + unifier la clé du badge.
- 🟠 Sanitiser `location_label` dans le payload de partage.
- 🟠 Fermer le chat co-pêchage sur cancelled/done + exposer `species` dans la vue.
- (Le routing des notifs est déjà dans le Sprint 42.)

### Vague d'enrichissement (à prioriser, post-correctifs)
Par ordre de ratio impact/effort, en réutilisant le moat et en frappant les concurrents :
1. **Tendance gear par espèce** + **records mesurés par espèce** (le moat rendu visible, quasi gratuit).
2. **Photo du poisson dans le partage** + **Wrapped récap** (viralité = acquisition).
3. **Marées 1 port/département** + **badge précision** + **« vérifié le JJ/MM »** (confiance visible, anti-concurrents).
4. **Avis post-sortie / réputation** + **loguer à plusieurs** (moat communautaire).
5. **Plus de types de push** + **digest hebdo** (rétention).

> Ces enrichissements peuvent devenir les sprints 45+ (après le curage des spots, sprints 42-43). Aucun ne nécessite le mobile sauf la mesure photo par IA (différée) et le push natif iOS (différé).

---

### Annexe — fichiers clés par feature
- **Boîte** : `059_catch_gear.sql`, `app/actions/gear.ts`, `components/catches/GearPicker.tsx`, `lib/catches/actions.ts:94,175`, `lib/scoring/personal/*`, `app/(app)/carnet/boite/page.tsx`.
- **Badge vérifié** : `060_spot_verification.sql`, `app/actions/spots.ts:257-304`, `components/map/MapView.tsx:148`, `app/(marketing)/spots/[slug]/page.tsx:361,617`, `app/(app)/moderation/page.tsx:336`.
- **Marées** : `062`/`064_tide_calibration*.sql`, `scripts/verify-tides.ts`, `lib/conditions/tide-calibration.ts`, `components/conditions/TideChart.tsx:95-303`, `components/spots/TideCalibrationNote.tsx`.
- **Partage** : `061_shared_cards.sql`, `app/actions/share.ts`, `app/og/card/[slug]/route.tsx`, `app/(marketing)/c/[slug]/page.tsx`, `lib/og/*`, `components/share/*`, `components/catches/CatchForm.tsx:342-351`.
- **Web Push** : `065_push_subscriptions.sql`, `lib/push/send.ts`, `app/api/push/*`, `public/sw.js`, `components/push/*`, `app/api/crons/personal-window/route.ts:137-145`.
- **Prise mesurée** : `066_catch_verification.sql`, `components/catches/CatchForm.tsx:662-717`, `lib/catches/actions.ts:74-88`, `lib/gamification/badges.ts:71-75`.
- **Co-pêchage** : `067_outings_matching.sql`, `068_outing_chat.sql`, `lib/cofishing/*`, `components/cofishing/*`, `app/(app)/sorties/page.tsx`, `app/api/crons/recfishing-reminders/route.ts`.
