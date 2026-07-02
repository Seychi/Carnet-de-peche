# 🗺️ Roadmap Correctifs & Enrichissements (sprints 42 → 50) — Carnet de Pêche

> **Date** : 2026-06-28 · **Auteur** : Claude · **Pour** : John
> **Objet** : séquencer en sprints **tous les bugs** (carte post-import + features 37-40) et **TOUS les enrichissements** proposés feature par feature, sans en perdre un seul.
> **Sources** : `docs/audits/AUDIT-2026-06-28-POST-37-41.md` (carte) + `docs/audits/AUDIT-2026-06-28-FEATURES-37-40.md` (les 7 features). Briefs déjà rédigés : **Sprint 42** (réparer la carte) + **Sprint 43** (le curage). Cette roadmap couvre **44 → 50** et place 42/43 dans le plan d'ensemble.
> **Principe directeur** : on corrige d'abord (vérité, sécurité, cohérence), puis on enrichit en **rendant visible le moat** (la donnée déjà captée), puis on muscle viralité et communauté. La reconnaissance d'espèce par IA et la mesure photo restent **différées au mobile** (décision John, fondations data déjà en place).

---

## 1. Principes & invariants

- **Bugs avant features** : un correctif de vérité/sécurité passe avant tout enrichissement.
- **Moat-first** : les enrichissements les plus rentables rendent visible la donnée qu'on capte déjà (tendance leurre, records mesurés). Faible effort, fort impact, incopiable par les concurrents génériques.
- **Une infra EXIF, réutilisée** : tout ce qui peut rendre une photo publique (partage prise, chat co-pêchage) doit la **stripper EXIF côté serveur**. On construit l'util une fois (sprint 47) et on la réutilise.
- **Différé mobile assumé** : IA reconnaissance espèce, mesure assistée par photo, push natif iOS, cartes de partage animées → phase mobile. Les schémas data sont déjà prêts (zéro migration au moment du branchement).
- **Invariants projet** (rappel, tenus à chaque sprint) : zéro coordonnée GPS exposée (partage, chat, co-pêchage), scoring **descriptif jamais prédictif**, zéro leaderboard compétitif, floutage GPS 3 couches, RLS d'abord, migrations numérotées + regen `lib/types.ts`, copy sans tiret cadratin.

---

## 2. Vue d'ensemble

| Sprint | Thème | Nature | Effort |
|---|---|---|---|
| **42** | Réparer la carte (cron scoring, masquer imports, notifs sortie) | 🔴 Correctif | ~3-4 j · *brief prêt* |
| **43** | Le curage (file de vérification des imports) | Outil + ops continu | ~5-6 j + ops · *brief prêt* |
| **44** | Cohérence & vérité (bugs features 37-40) | 🔴 Correctif | ~3-4 j |
| **45** | Le moat visible (boîte + mesure, quick wins) | ★ Enrichissement | ~4-5 j |
| **46** | Boîte à matériel v2 | Enrichissement | ~4 j |
| **47** | Le partage viral (photo + Wrapped) | ★ Enrichissement | ~5-6 j |
| **48** | Confiance visible (badge + marées) | Enrichissement | ~4-5 j |
| **49** | Push & engagement | Enrichissement | ~3-4 j |
| **50** | Communauté vivante (co-pêchage) | Enrichissement | ~5-6 j |

> **Lanes parallèles** : le **curage (43)** est une lane ops continue qui tourne pendant que les sprints dev avancent. Les correctifs **42 + 44** sont le bloc urgent ; les enrichissements **45→50** suivent, ordonnés par ratio impact/effort et dépendances.

---

## 3. Checklist exhaustive (rien n'est oublié)

**Bugs → sprint :**

| Bug | Sév. | Feature | Sprint |
|---|---|---|---|
| Cron scoring timeout (scores + couleurs) | 🔴 | Carte | 42 |
| Imports bruts visibles (espèces/techniques vides) | 🔴 | Carte | 42 (masquer) + 43 (curer) |
| 06/Corse non importés | 🟠 | Carte | 42 (réimport) |
| Routage notifs `spot_verified`/`outing_*` → `/sorties` | 🔴 | Notifs | 42 |
| `gear_id` non validé (fuite cross-user) | 🔴 | Boîte | 44 |
| Prise mesurée affichée nulle part | 🔴 | Mesure | 44 |
| Push qui ment aux gratuits (pas de gate tier UI) | 🔴 | Push | 44 |
| Offset marée incohérent (graphe/grille/7j) | 🟠 | Marées | 44 |
| `verified_at` invisible + double clé badge | 🟠 | Badge | 44 |
| `location_label` non sanitisé (partage) | 🟠 | Partage | 44 |
| Chat non fermé sur cancelled/done + `species` hors vue | 🟠 | Co-pêchage | 44 |
| Picker perd item archivé · pas de dédup · bornes taille · VAPID muet · purge endpoints · `LOOKS_LIKE_COORD` partiel | 🟡 | divers | 44 (lot 🟡) |

**Enrichissements → sprint (les 40+ idées des audits) :**

- **Boîte à matériel** : tendance gear/espèce (45), gear×espèce×condition (45), « bon leurre aujourd'hui » (45), dédup/fusion (44/45), photos de leurres (46), stats usure/perte (46), boîte partageable (46).
- **Prise mesurée** : afficher la mesure (44), records perso/espèce (45), conversion taille→poids (45), fil « plus grosses prises mesurées » (50), mesure assistée photo (**mobile**).
- **Partage** : photo du poisson + EXIF util (47), Wrapped récap (47), handle/watermark (47), thèmes (47), 1-tap (47), PR board records (47), leaderboard anonymisé (48, *décision*), carte animée/vidéo (**mobile**).
- **Badge vérifié** : « vérifié le JJ/MM » (48), report erreur coord (48), niveaux de vérification (48), historique fiabilité (48), page admin re-vérifier (48).
- **Marées** : étendre calibration 1 port/dépt (48), corriger offset partout (44), badge précision/spot (48), fraîcheur calibration (48).
- **Web Push** : gate tier honnête (44), plus de types + digest hebdo (49), réglages granulaires (49), app badge + purge (49), push natif iOS (**mobile**).
- **Co-pêchage** : routing notifs (42), matching niveau/proximité/date (50), réputation/avis post-sortie (50), loguer à plusieurs (50), modération/signalement chat (50), fermer chat cancel (44), sorties près de toi + sur place (50), photos chat + EXIF (50).

---

## 4. Sprint 44 — « Cohérence & vérité » (correctifs features 37-40)

**Objectif** : éliminer les 3 bugs 🔴 et les 🟠 de l'audit features, pour que chaque feature tienne sa promesse.

- 🔴 **Boîte — ownership `gear_id`** : valider que `gear_id` ∈ user avant insert/update (`lib/catches/actions.ts:94,175`). Ferme la fuite cross-user du matériel privé via `gear_label`.
- 🔴 **Mesure — afficher la valeur** : « 62 cm (mesurée, réf. X) » + picto règle sur la prise/carte/détail (données déjà dans `catches_for_viewer`). Réconcilier `size_cm` ↔ `measured_length_cm`.
- 🔴 **Push — gate tier honnête** : UI tier-aware (`EnablePushAlerts`/`PushSettingsToggle`) → upsell pour les gratuits, ne plus afficher « Alertes activées » à qui ne recevra rien.
- 🟠 **Marées — offset partout** : appliquer `offsetMinutes` au graphe (`ReferenceDot`), à la Grille et au calendrier 7j (`TideChart.tsx:227-303`, `spots/[slug]/page.tsx:286-296`), OU note « courbe brute, heures calées SHOM ». + message Méditerranée (marnage faible).
- 🟠 **Badge — `verified_at` visible** : exposer `verified_at` dans `get_spot_by_slug`, afficher « Vérifié le JJ/MM par l'équipe », unifier la clé du badge (carte + fiche sur la même condition).
- 🟠 **Partage — sanitiser `location_label`** : tronquer à la commune/au département dans le payload (`app/actions/share.ts:225`).
- 🟠 **Co-pêchage — fermer le chat** sur cancelled/done (policies 068 `AND status IN ('open','full')`) + exposer `species` dans `outing_proposals_for_viewer` (supprime la 2ᵉ requête + active l'index GIN).
- 🟡 **Lot polish** : picker injecte l'item archivé en édition, dédup matériel (index unique partiel), bornes `measured_length_cm`↔`size_cm`, signal UI si VAPID absent, purge périodique endpoints morts.

**Dépendances** : aucune bloquante. **Décisions** : aucune majeure (tous des correctifs cadrés).

---

## 5. Sprint 45 — « Le moat visible » ★ (boîte + mesure, quick wins)

**Objectif** : remonter à l'utilisateur la donnée riche déjà captée. Meilleur ratio impact/effort de toute la roadmap, et 100 % incopiable par les concurrents génériques.

- **Tendance gear par espèce** sur `/especes/[slug]` (« sur tes bars : 60 % au Black Minnow ») — réutilise `getPersonalTendencies({species})`.
- **Croisement leurre × espèce × condition** (« ton shad : 7 bars, dont 5 en descendante, le matin ») — descriptif, le cœur du moat anti-FishFriender.
- **« Le bon leurre pour aujourd'hui selon ton historique »** sur `/home` (descriptif, jamais prédictif).
- **Records perso par espèce** (« ta plus grande dorade : 48 cm ») depuis `measured_length_cm`/`size_cm`.
- **Conversion taille → poids** par espèce (W = a·Lᵇ) sur la fiche prise.
- (Dédup matériel si pas fait en 44.)

**Dépendances** : la mesure doit être affichée (44). **Angle** : différenciateur direct vs scoring générique de spot-de-peche / FishFriender / Fishing Grid.

---

## 6. Sprint 46 — « Boîte à matériel v2 »

**Objectif** : faire de la boîte une vraie feature visuelle et sociale.

- **Photos de leurres** (réutilise le pipeline WebP/Storage) — boîte visuelle, comble le Pokédex de Fishing Grid.
- **Stats d'usure / perte** (« ce leurre t'a sorti 12 poissons avant de te lâcher ») — narratif pêcheur unique.
- **Boîte partageable en lecture** (libellés seuls, jamais les spots) — social gratuit viral.

**Dépendances** : la boîte partageable exige le **fix ownership `gear_id` (44)** + une vue dédiée (pas la table). **Angle** : profondeur perso là où FishFriender n'a qu'un catalogue.

---

## 7. Sprint 47 — « Le partage viral » ★ (photo + Wrapped)

**Objectif** : débloquer la viralité du moteur de partage (aujourd'hui sans le poisson).

- **Photo du poisson** : bucket public dédié opt-in + **util de strip EXIF serveur** (construite ici, réutilisée au sprint 50), URL publique dans le payload, rendue par l'edge OG. LA feature virale manquante.
- **Carte récap « Wrapped »** mensuel/annuel (`kind='recap'`) — effet Spotify Wrapped (total, espèces, plus grosse, streak).
- **Handle/@pseudo** sur la carte (appropriation, chaque capture reste attribuée).
- **Thèmes/variantes** (`?theme=`) — donne envie de re-partager.
- **Partage 1-tap** (opt-in une fois, « ne plus demander ») — réduit la friction.
- **PR board** records perso par espèce partageable.

**Dépendances** : réutilise l'infra `shared_cards`/OG edge. **Décision** : `/c/[slug]` indexable ou noindex (SEO acquisition vs dilution). **Angle** : Strava du pêcheur, munition César.

---

## 8. Sprint 48 — « Confiance visible » (badge + marées)

**Objectif** : rendre lisibles et solides les deux arguments de confiance (anti-Decathlon « spots flous », anti-Fishing Grid « marées imprécises »).

- **Badge** : « Vérifié le JJ/MM par l'équipe » (si pas déjà en 44), **report d'erreur de coordonnée** par les users (→ `reports`/`target_type='spot'`), **niveaux de vérification** (communauté confirmée → ambassadeur → équipe), **historique de fiabilité** (« vérifié il y a 8 mois · 23 prises confirmées depuis »), **page admin re-vérifier un spot live**.
- **Marées** : **étendre la calibration à ~1 port/département** (le pipeline `verify-tides.ts` existe), **badge de précision par spot** (« ±3 min, calé SHOM », après le fix offset de 44), **fraîcheur de la calibration**.
- **Leaderboard d'espèces anonymisé** (k-anon) — *décision* : compatible ou non avec l'ADN anti-comparaison ?

**Dépendances** : badge précision marée exige le **fix offset (44)**. **Angle** : transforme un travail invisible en preuve datée.

---

## 9. Sprint 49 — « Push & engagement »

**Objectif** : faire du push un canal de rétention riche (au-delà de la fenêtre optimale).

- **Plus de types** : grandes marées (coef > seuil), nouvelle prise publique d'un pêcheur suivi, rappel réglementation/fermeture d'espèce.
- **Digest hebdo** (« ta semaine + fenêtres à venir ») — faible risque de fatigue.
- **Réglages granulaires** par type (table de préférences).
- **App badge** (`setAppBadge()`) + purge périodique des endpoints morts.

**Dépendances** : le canal Web Push (sprint 39) + le gate tier honnête (44). **Différé mobile** : push natif iOS plein écran (Expo).

---

## 10. Sprint 50 — « Communauté vivante » (co-pêchage)

**Objectif** : muscler le collaboratif au-delà du matching espèce (vs Decathlon « sorties collaboratives » et Fishing Grid « groupes »).

- **Matching enrichi** : par niveau (`profiles.level`), date, départements limitrophes (jamais un point).
- **Réputation / avis post-sortie** (`outing_reviews`) — signal de confiance unique.
- **Loguer à plusieurs** : depuis une sortie `done`, pré-remplir une prise pour chaque participant (lie le social au moat carnet ; chacun garde SA coord floutée).
- **Modération / signalement du chat** (→ `reports`/`target_type='outing'`, déjà autorisé) — dette de sécurité avant montée en charge.
- **« Sorties près de toi »** (notif opt-in par dépt) + **statut « sur place »** (texte, zéro coord).
- **Photos dans le chat** (réutilise l'**util EXIF** du sprint 47).
- **Fil « plus grosses prises mesurées »** (descriptif, pas compétitif).

**Dépendances** : photos chat réutilisent l'EXIF util (47). **Angle** : effet réseau + réputation que les concurrents n'ont pas.

---

## 11. Différé au mobile (clairement hors de cette roadmap)

Les fondations data sont déjà en place (zéro migration au branchement) :
- **Reconnaissance d'espèce par IA** (on-device) — hook d'acquisition, faible valeur d'usage sur 6 espèces, fort en marketing.
- **Mesure assistée par photo** (objet de référence → longueur auto) — le champ `reference_object` est la fondation.
- **Push natif iOS plein écran** (Expo Notifications) — le contenu + le ciblage existent.
- **Cartes de partage animées / story vidéo** — nécessite un pipeline vidéo hors edge.

---

## 12. Décisions ouvertes pour John

1. **Leaderboard d'espèces anonymisé** (sprint 48) — compatible avec « zéro leaderboard / anti-comparaison » du projet, ou on s'en tient au descriptif perso ? Reco : descriptif (fil « prises mesurées » plutôt que classement).
2. **`/c/[slug]` indexable** (sprint 47) — indexer (acquisition SEO) ou noindex (éviter la dilution par des milliers d'URLs minces) ? Reco : noindex v1, mesurer.
3. **Ordre des sprints** — la séquence 45→50 est par impact/effort ; tu peux prioriser autrement (ex. partage viral 47 avant la boîte v2 46 si César pousse la com).
4. **Photo dans le partage et le chat** — confirmer l'opt-in strict + strip EXIF serveur comme garde-fou anti spot-burning (j'en fais l'invariant).

---

> **Prochaine étape** : je peux rédiger les briefs détaillés sprint par sprint (format exécutable, ancres de code), en commençant par le **Sprint 44** (les correctifs). Dis-moi le rythme : un brief à la fois, ou par lots.

*Cette roadmap consolide 100 % des bugs et des enrichissements des audits du 2026-06-28. Détail des constats et `fichier:ligne` : `docs/audits/AUDIT-2026-06-28-POST-37-41.md` et `docs/audits/AUDIT-2026-06-28-FEATURES-37-40.md`.*
