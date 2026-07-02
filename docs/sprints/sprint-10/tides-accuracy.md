# Sprint 10 — Bloc 4 : précision de nos marées vs SHOM

> Rédigé le 2026-06-11. Script : `scripts/verify-tides.ts` · fixture étalon : `scripts/fixtures/shom-tides.json`.
> Étalon : prédictions SHOM publiées par maree.info (Brest=82, Saint-Malo=52, Pornichet=116, Les Sables-d'Olonne=125, Arcachon Jetée d'Eyrac=136), collectées le 2026-06-11 et vérifiées contre le HTML brut des pages.
> Fenêtre : **2026-06-12 → 2026-06-18** (7 jours, coefficients 60 → 98, soit mortes-eaux → vives-eaux : le cycle est bien couvert).

## TL;DR

1. **❌ NO-GO sur la copy « horaires de marée vérifiés »** en l'état : médiane d'écart 31 à 93 min selon le port. On ne communique pas, conformément au critère du brief (< 15 min partout).
2. **MAIS** l'analyse de l'écart signé change la donne : l'erreur est un **biais constant par port** (Open-Meteo systématiquement **en avance** de 31 à 93 min), pas du bruit. Une fois ce biais soustrait, le **résidu médian tombe à 2-9 min** — sous le seuil des 15 min, sur tout le cycle mortes-eaux/vives-eaux.
3. → Deux options pour le sprint 11, décision John (cf. § Décision).

## Méthode

- **Notre pipeline** : Open-Meteo Marine `sea_level_height_msl` (horaire), extrema PM/BM comme dans `lib/conditions/spot-forecast.ts` (`computeExtrema`, résolution horaire). C'est ce que les fiches spots affichent depuis le sprint 9.5 (T1.4).
- **Méthode « interpolée »** : raffinement parabolique sub-horaire (3 points autour de l'extremum), pour distinguer l'erreur de quantification horaire (±30 min) de l'erreur du modèle lui-même.
- **Comparaison** : chaque PM/BM SHOM est appariée à notre événement de même type le plus proche (fenêtre ±3h). Écart en minutes ; médiane et max par port. 27 événements appariés par port, 0 non-apparié.
- Les hauteurs ne sont pas comparées (référentiels différents : SHOM = zéro hydrographique, Open-Meteo = MSL). Seuls les horaires comptent pour le pêcheur.

## Synthèse

| Port | n | Médiane horaire (min) | Max horaire | Médiane interpolée (min) | Max interpolé | Biais signé médian | Résidu médian après biais | Non matchés |
|---|---|---|---|---|---|---|---|---|
| Brest | 27 | 47 | 76 | 48 | 51 | **−48** | **2** | 0 |
| Saint-Malo | 27 | 31 | 61 | 31 | 41 | **−31** | **3** | 0 |
| Pornichet | 27 | 31 | 78 | 33 | 55 | **−33** | **9** | 0 |
| Les Sables-d'Olonne | 27 | 39 | 78 | 33 | 53 | **−33** | **6** | 0 |
| Arcachon (Eyrac) | 27 | 91 | 132 | 93 | 104 | **−93** | **4** | 0 |

Biais signé négatif = Open-Meteo annonce la marée **plus tôt** que le SHOM.

## Lecture des résultats

1. **L'interpolation sub-horaire ne sauve rien** (médianes quasi identiques à la méthode horaire) : l'erreur ne vient pas de notre échantillonnage horaire mais du **modèle global Open-Meteo lui-même** (phase de l'onde de marée décalée près des côtes).
2. **Le biais est remarquablement stable** : sur 7 jours couvrant coef 60 → 98, le résidu après soustraction du biais médian est de 2 à 9 min seulement. Le décalage de phase est une constante locale, pas une dérive.
3. **Le biais dépend du port** (−31 à −93 min) : toute correction doit être locale (par port de référence, pas globale).
4. **Arcachon est le pire cas attendu** (bassin semi-fermé qu'un modèle global ne résout pas : −93 min) — mais même là, le biais est constant (résidu 4 min).
5. **Comparaison Fishing Grid** : leurs avis publics les épinglent à ~30 min d'écart à Pornichet. Nous y sommes à 33 min de médiane brute — **on n'est pas meilleurs qu'eux aujourd'hui**, on serait à ~9 min après calibration. Raison de plus pour ne PAS communiquer tant que ce n'est pas corrigé.

## Décision (conforme au brief) + options sprint 11

**Actée** : pas de copy « horaires vérifiés » dans les Blocs 1-3 du sprint 10. L'amélioration marées passe **prioritaire au sprint 11**, avec deux options à arbitrer :

| | Option A — WorldTides API | Option B — Calibration d'offset par port |
|---|---|---|
| Principe | Remplacer/compléter Open-Meteo par WorldTides pour les PM/BM | Garder Open-Meteo + table d'offsets par port de référence (dérivée du SHOM), appliquée au spot via le port le plus proche |
| Précision attendue | ~minutes (données harmoniques) | 2-9 min de résidu mesuré sur ce panel |
| Coût | Abonnement / crédits API récurrents | 0 € récurrent ; effort one-shot : étendre ce script à ~15-20 ports de référence + table statique + mapping spot→port |
| Risques | Coût qui scale avec le trafic ; dépendance de plus | Biais à re-valider sur une 2e fenêtre (autre saison) ; ports complexes (estuaires, bassins) à traiter port par port ; maintenance annuelle légère |
| Côté app | Intégration nouvelle API | ~10 lignes dans `spot-forecast.ts` (offset + interpolation parabolique déjà prototypée dans le script) |

**Recommandation** : tenter l'option B d'abord (elle est gratuite et mesurée à 2-9 min sur ce panel), avec validation préalable sur une **2e fenêtre de 7 jours** (re-run du script avec un nouveau fixture, idéalement à une autre période du cycle lunaire / autre saison) pour confirmer la stabilité du biais. Si le biais bouge entre les deux fenêtres → bascule option A. Dans les deux cas, la copy « horaires de marée vérifiés port par port » ne sort qu'après re-mesure < 15 min partout.

## Validation fenêtre 2 — résultat intermédiaire (12/06/2026)

Fixture `scripts/fixtures/shom-tides-fenetre2.json` (19-25 juin, coef ~83 → ~46, phase lunaire inverse de la fenêtre 1). ⚠️ Open-Meteo ne prévoit que ~8 jours : seuls les 2 premiers jours ont pu être appariés (n=8/port). Sur cet échantillon partiel :

| Port | Biais fenêtre 1 | Biais fenêtre 2 (n=8) | Stabilité |
|---|---|---|---|
| Brest | −48 | −49 | ✅ 1 min |
| Saint-Malo | −31 | −34 | ✅ 3 min |
| Les Sables-d'Olonne | −33 | −30 | ✅ 3 min |
| Arcachon | −93 | −85,5 | ~ 7,5 min |
| Pornichet | −33 (résidu 9) | **−17,5 (résidu 27,5)** | ❌ instable sur ce petit échantillon |

**Conclusion intermédiaire** : la calibration tient sur 4 ports / 5 ; Pornichet (le port marketing-critique) est incohérent sur n=8. **Décision finale reportée au ~19 juin** : relancer `npx tsx scripts/verify-tides.ts --fixture scripts/fixtures/shom-tides-fenetre2.json` quand la fenêtre sera dans l'horizon de prévision (27 événements/port). Si Pornichet reste instable → WorldTides (Bloc B sprint 11) ; sinon → calibration gratuite.

## Reproduire

```bash
npx tsx scripts/verify-tides.ts            # tableau console
npx tsx scripts/verify-tides.ts --markdown # sortie markdown complète
```

Le fixture (`scripts/fixtures/shom-tides.json`) contient les horaires officiels saisis depuis maree.info (prédictions SHOM). Pour une nouvelle fenêtre : remplacer les dates/événements du fixture, le script cale automatiquement la fenêtre Open-Meteo dessus.

## Annexe — détail par port (méthode interpolée)

Sortie brute complète : `docs/sprint-10/tides-raw-output.md` (27 événements × 5 ports).
