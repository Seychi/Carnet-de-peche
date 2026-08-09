# Ré-import OSM — 85, 06, 2A, 2B (les quatre départements « vides »)

> Fichier source : `supabase/seed-spots-import-osm-05-vides.sql`. Ces quatre départements n'avaient **jamais** été importés (backlog à zéro avant cette session) : 85 (Vendée), 06 (Alpes-Maritimes), 2A (Corse-du-Sud), 2B (Haute-Corse).

## Chiffres

- **882 objets bruts** extraits d'Overpass.
- **7 lignes retirées** à la relecture : 3 plages d'hôtel ou privatives hors périmètre, 4 quasi-doublons internes.
- **78 réassignements département** par contrôle point-in-polygon, dont **52 corrections 2B → 2A**. Ces 52 réassignements ont été vérifiés indépendamment (recoupement Wikipédia sur les communes concernées, notamment autour d'Osani/Girolata) : le bbox Overpass de la Haute-Corse déborde largement sur la Corse-du-Sud le long de la côte ouest, et la limite départementale y est très découpée. Sans ce contrôle, un cinquième du littoral corse-du-sud aurait été étiqueté Haute-Corse.
- **875 lignes candidates** au final, insérées en 3 blocs séquentiels.

## ⚠️ Incident de production de ce fichier (corrigé)

Ce fichier a d'abord été **corrompu par un bug de double-échappement** du script d'application des corrections : les chaînes déjà échappées SQL (`''`) étaient ré-échappées, produisant des apostrophes quadruplées (`d''''Azur`). Repéré en relisant manuellement les occurrences de « Provence-Alpes-Côte d'Azur » dans le fichier réécrit.

**Traitement** : plutôt que de tenter de désescaper mathématiquement un fichier corrompu (risque d'erreur silencieuse), le fichier a été **régénéré intégralement depuis le script d'import**, après vérification que la génération est déterministe (comptes par département identiques à ceux d'avant corruption), puis la relecture manuelle a été rejouée depuis cette base propre. Le bug lui-même a été corrigé dans les scripts d'audit (`unesc()` au parsing, dans `review-import.mjs` **et** `apply-review.mjs`).

## Vérification

Insertion vérifiée par comptage en base. Aucune ligne `verified=true` ni `approved` créée.
