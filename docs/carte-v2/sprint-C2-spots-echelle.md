# Sprint Carte-v2 / C2 — Brief d'exécution
## Passer à 1000+ spots (communauté + import) — changer de modèle

> Rédigé le 2026-06-22. Épique **Carte v2 — AVANT la beta** (cf `docs/excellence/CARTE-V2.md`, pilier 3 ; décision John 2026-06-22). Durée : 1,5-2 semaines.
> **Principe** : la curation manuelle (lots de 25 validés à la main) ne scale pas à 1000. On passe à **3 sources** : curé (socle vérifié), communautaire (proposé + modéré), importé (OSM). Avec la carte vivante (C1), le besoin de « 1000 épingles » baisse — mais on industrialise quand même le volume.

**Préalable (manuel John)** :
1. La modération de posts (Sprint 17, page `/moderation` + `is_moderator`) existe — on **réutilise le même socle** pour les spots.
2. Prochain numéro de migration libre.

---

## 🚀 Ligne de lancement (à copier-coller par John)
> ultracode — effort xhigh. Exécute `docs/carte-v2/sprint-C2-spots-echelle.md`. **Connecté** : **supabase-guard** (RO) lit le schéma `spots` + RLS AVANT migration ; **docs-researcher** pour l'API Overpass/OSM (import) ; **qa-chrome** vérifie la carte (badges source) + le flux de proposition. `/verif-sprint` + deploy-watch. Ne push pas. Docker optionnel. **Effort max, esprit critique.** Garde-fous : **anti-spam + anti-spot-secret + dédup géo** ; le badge « Vérifié » reste réservé aux spots curés.

## ⚙️ Environnement & posture (exigence John)
Docker optionnel. Effort max + esprit critique : vérifie le vrai code, passe adversariale (modération contournable ? dédup ? fuite ?), `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

---

## Objectif du sprint en une phrase
Un pêcheur peut **proposer un spot** (modéré, dédupliqué), on **importe en masse** les structures publiques OSM, et la carte distingue clairement **curé / communautaire / importé** — cap mis vers 1000+.

## Workstreams & dépendances
| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Migration : `source`, `submitted_by`, modération, dédup géo | 1 j | numéro migration | ✅ |
| B | Formulaire « Proposer un spot » + anti-doublon | 2 j | A | ❌ |
| C | File de modération spots (réutilise Sprint 17) | 1,5 j | A | ⚠️ |
| D | Import OSM scripté (ports/jetées/caps) | 2 j | A | ✅ |
| E | Affichage carte différencié par source (badges) | 1 j | A | ⚠️ |
| VERIF | `/verif-sprint` + anti-abus | 1 j | tous | ❌ (dernier) |

---

## Bloc A — Migration : modèle multi-source
### Tâches
1. Migration `0NN_spots_sources.sql` : `spots.source` enum (`curated` | `community` | `imported`), `submitted_by uuid null`, `moderation_status` (`pending`|`approved`|`rejected`, default `approved` pour curated/imported, `pending` pour community), `verified` reste distinct (badge éditorial). **RLS** : un spot `community` `pending` n'est visible que de son auteur + modérateurs ; `approved` visible de tous.
2. **Dédup géo** : contrainte/fonction `ST_DWithin` (ex. < 150 m + même `structure` ⇒ doublon probable) utilisée à la proposition et à l'import.
3. Régénérer `lib/types.ts`.

### Critères d'acceptation
- Un spot communautaire `pending` n'apparaît pas sur la carte publique.
- Proposer un spot à 50 m d'un existant similaire est détecté comme doublon.

## Bloc B — Proposer un spot (utilisateur)
### Tâches
1. Form « Proposer un spot » (nom, point sur carte, structure ∈ CHECK, espèces, techniques, accès) — `source='community'`, `moderation_status='pending'`, `verified=false`.
2. Anti-doublon (Bloc A) + **anti-secret-spot** : copy explicite « uniquement des lieux publics et connus » + rate-limit (anti-spam).
3. Validation zod serveur (réutiliser les enums centralisés `lib/labels.ts`).

### Critères d'acceptation
- Je propose un spot → il part en modération, je le vois marqué « en attente », il n'est pas public.
- Doublon/spam bloqués proprement (message FR).

## Bloc C — Modération des spots
### Tâches
1. Étendre `/moderation` (Sprint 17) avec un onglet **Spots en attente** : approuver (→ public, `community`) / rejeter / fusionner avec un doublon. Réservé `is_moderator`.
2. Notifier le proposant (réutiliser les notifications in-app du Sprint 17) : accepté/refusé.

### Critères d'acceptation
- Un modérateur approuve → le spot devient public ; le proposant est notifié.

## Bloc D — Import OSM (volume)
### Tâches
1. Script (Node, `scripts/import-osm-spots.ts`) : requête **Overpass** des structures côtières publiques FR (`man_made=pier/breakwater`, `natural=cape`, ports, môles…), filtre côtier, géocode = la géométrie OSM (précise), mappe vers `structure` ∈ CHECK, `source='imported'`, `verified=false`.
2. **Dédup** contre l'existant (curated + community) via ST_DWithin → n'importe que le nouveau.
3. Sortie = `supabase/seed-spots-import-osm-NN.sql` (donnée, **revue avant insertion**, pas d'écriture sauvage) — par lots géographiques, espèces/techniques laissées vides ou heuristiques (à enrichir plus tard).

### Critères d'acceptation
- L'import produit des centaines de structures publiques sans doublonner les 157 curés.
- `structure`/`department` valides (CHECK), `verified=false`, `source='imported'`.

### Garde-fous
- ⚠️ Respecter la **licence OSM (ODbL)** : attribution OpenStreetMap sur la carte. Ne PAS importer de POI privés/maison.

## Bloc E — Carte différenciée
### Tâches
1. Markers/popups distinguent **Vérifié (curé)** / **Communautaire** / **Importé** (badge + style). Le badge « Vérifié » = garantie éditoriale, réservé `curated`.
2. Filtre carte « afficher : vérifiés / communautaires / importés ».

### Critères d'acceptation
- Sur la carte, un spot curé porte un badge « Vérifié » qu'un spot communautaire/importé n'a pas.

## Workstream VERIF
1. `/verif-sprint`.
2. Passe anti-abus : un `pending` n'est jamais public ; dédup efficace ; rate-limit proposition ; RLS spots community correctes ; attribution OSM présente.
3. `docs/carte-v2/RECAP-C2.md`.

## Reste manuel John
- Revue + insertion des lots d'import OSM ; arbitrage du seuil de dédup ; application migration + types.
