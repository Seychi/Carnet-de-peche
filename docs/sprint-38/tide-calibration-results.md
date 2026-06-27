# Sprint 38 — WS E · Résultats de calibration marées (F3)

> Figé le **2026-06-27** (audit lancé via `pnpm verify-tides --markdown`). Décision John **D3** : on **affiche la précision mesurée seulement**, on n'applique **aucun offset** en prod. `tide_coefficient` reste null partout, aucune heure de marée n'est corrigée.

## Méthodo

On compare les heures de pleine mer (PM) et basse mer (BM) **dérivées d'Open-Meteo Marine** (`sea_level_height_msl`, le pipeline réellement en prod depuis le sprint 9.5) aux horaires **officiels SHOM** saisis dans `scripts/fixtures/shom-tides.json` (source : `maree.info`, prédictions SHOM, `retrieved_at: 2026-06-11`).

- **Méthode mesurée** : raffinement parabolique (3 points autour de l'extremum horaire) → estimation sub-horaire de l'extremum, puis appariement PM↔PM / BM↔BM à ±3 h.
- **Écart médian** : médiane des écarts absolus (minutes) PM/BM dérivés vs SHOM.
- **Biais signé** : médiane des écarts signés. Négatif = Open-Meteo en **avance** sur le SHOM (extremum trop tôt).
- **Fenêtre auditée** : 2026-06-12 → 2026-06-18 (7 jours, 27 extrema PM/BM par port).

> Honnêteté (invariant) : on n'audite **que** les ports pour lesquels on a un étalon SHOM figé. On n'invente aucun horaire SHOM pour gonfler la couverture. La Méditerranée est traitée à part (voir plus bas).

## Résultats mesurés (fenêtre 2026-06-12 → 2026-06-18)

| Port | Façade | n | Écart médian (min) | Biais signé médian (min) | Résidu après biais (min) | Fenêtre | Audité le | Source |
|---|---|---|---|---|---|---|---|---|
| Saint-Malo | Manche | 27 | **31** | -31 | 3 | 7 j · 27 extrema | 2026-06-27 | SHOM (maree.info) vs Open-Meteo Marine |
| Brest | Atlantique | 27 | **48** | -48 | 1 | 7 j · 27 extrema | 2026-06-27 | SHOM (maree.info) vs Open-Meteo Marine |
| Pornichet | Atlantique | 27 | **32** | -32 | 8 | 7 j · 27 extrema | 2026-06-27 | SHOM (maree.info) vs Open-Meteo Marine |
| Les Sables-d'Olonne | Atlantique | 27 | **34** | -34 | 5 | 7 j · 27 extrema | 2026-06-27 | SHOM (maree.info) vs Open-Meteo Marine |
| Arcachon (Eyrac) | Atlantique | 27 | **93** | -93 | 4 | 7 j · 27 extrema | 2026-06-27 | SHOM (maree.info) vs Open-Meteo Marine |

**Façades couvertes** : Manche (Saint-Malo) + Atlantique (Brest, Pornichet, Les Sables, Arcachon).

### Méditerranée — non auditée (volontairement)

La marée méditerranéenne est une **micro-marée** (marnage ~0,2 m à Marseille / Sète) dominée par la **météo** (vent, pression atmosphérique) bien plus que par l'astre. Un extremum « astronomique » dérivé d'un modèle global y a très peu de sens physique, et `maree.info` ne publie pas de PM/BM SHOM exploitables comme sur l'Atlantique. **On n'invente donc pas de chiffre** : la fiche spot d'un département méditerranéen n'affiche **pas** d'encart de calibration (au lieu d'un faux écart). C'est l'option honnête.

## Lecture des résultats

1. **Biais systématique négatif** : sur tous les ports, Open-Meteo place les extrema ~30 à ~50 min **en avance** sur le SHOM (Arcachon jusqu'à ~93 min, attendu : bassin semi-fermé difficile pour un modèle global). Le **résidu après soustraction du biais est très petit** (1 à 8 min) : l'erreur est presque entièrement un **décalage de phase constant par port**, pas du bruit. Une calibration par port (offset) ramènerait l'écart sous les 10 min — c'est exactement la **v2 (offset appliqué)** que John a choisi de **ne pas** activer pour l'instant (D3).
2. **Verdict copy** : ❌ on **ne peut pas** revendiquer « horaires de marée vérifiés à la minute ». On affiche l'écart mesuré tel quel, sourcé + daté (anti-Fishing Grid : on est transparents sur notre précision là où eux ne le sont pas).
3. **Ce qui est affiché en prod** : sur la fiche spot, un encart « Marées calées sur le port de référence X, écart médian N min vs SHOM, audité le JJ/MM », le port étant choisi selon la façade du département du spot.

## Reproduire l'audit

```bash
pnpm verify-tides            # tableau console + bloc seed
pnpm verify-tides --markdown # sortie markdown (ce rapport)
```

Le script appelle Open-Meteo Marine (sans clé) et lit le fixture SHOM local. Le **bloc seed** (une ligne par port) est imprimé en fin de sortie, prêt à insérer en service-role dans `tide_calibration`.

## Bloc seed `tide_calibration` (à insérer en service-role)

`verified_at = 2026-06-27` (date d'audit).

| port | lat | lng | facade | median_error_min | bias_min | sample_window | source |
|---|---|---|---|---|---|---|---|
| Saint-Malo | 48.69 | -2.03 | manche | 31 | -31 | 2026-06-12 → 2026-06-18 · 27 extrema PM/BM | SHOM (maree.info) vs Open-Meteo Marine (interpolation parabolique) |
| Brest | 48.3 | -4.6 | atlantique | 48 | -48 | 2026-06-12 → 2026-06-18 · 27 extrema PM/BM | SHOM (maree.info) vs Open-Meteo Marine (interpolation parabolique) |
| Pornichet | 47.22 | -2.38 | atlantique | 32 | -32 | 2026-06-12 → 2026-06-18 · 27 extrema PM/BM | SHOM (maree.info) vs Open-Meteo Marine (interpolation parabolique) |
| Les Sables-d'Olonne | 46.46 | -1.83 | atlantique | 34 | -34 | 2026-06-12 → 2026-06-18 · 27 extrema PM/BM | SHOM (maree.info) vs Open-Meteo Marine (interpolation parabolique) |
| Arcachon (Eyrac) | 44.66 | -1.21 | atlantique | 93 | -93 | 2026-06-12 → 2026-06-18 · 27 extrema PM/BM | SHOM (maree.info) vs Open-Meteo Marine (interpolation parabolique) |
