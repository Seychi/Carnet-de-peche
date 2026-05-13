# Décision APIs externes — Carnet de Pêche

> Validé le 2026-05-12 via `scripts/check-apis.ts` (coords test : lat=48.04, lng=-4.73, Douarnenez, Bretagne)

---

## Résumé des tests

| API | Statut | Nécessite clé | Données fournies |
|---|---|---|---|
| Open-Meteo Marine | ✅ HTTP 200 | Non | Houle, vagues, SST |
| Open-Meteo Forecast | ✅ HTTP 200 | Non | Vent, temp., pression, pluie |
| WorldTides v3 | ⚠️ HTTP 400 (clé invalide) | Oui | **Marées** |
| StormGlass v2 | ⚠️ HTTP 403 (clé invalide) | Oui | **Marées** |

---

## 1. Open-Meteo Marine

**Endpoint :** `https://marine-api.open-meteo.com/v1/marine`  
**Gratuit, sans clé API, sans inscription.**

### Données disponibles (testées)

| Champ | Unité | Description |
|---|---|---|
| `wave_height` | m | Hauteur significative des vagues |
| `wave_direction` | ° | Direction de provenance de la houle |
| `wave_period` | s | Période de la houle |
| `sea_surface_temperature` | °C | Température de surface de la mer |

### Résultats réels (Douarnenez, 2026-05-12 23h30)
- Vague : **0,98 m**, direction **315°** (NO), période **5,25 s**
- SST : **15,1 °C**

### Limites
- Résolution temporelle : 1h, disponibilité immédiate (pas de latence).
- Résolution spatiale : ~5–10 km (modèle ERA5 + GFS).
- **Ne fournit PAS de prédictions de marées.** Confirmé par inspection exhaustive de tous les champs retournés.
- Pas de données de courants ni de bathymétrie.

### Usage dans le projet
Utiliser pour **toutes les données météo-marines** affichées dans le carnet et la carte :
- Conditions actuelles sur la page de log d'une prise
- Snapshot `conditions` jsonb stocké dans `catches.conditions`
- Couches carte : houle, vent marin

---

## 2. Open-Meteo Forecast

**Endpoint :** `https://api.open-meteo.com/v1/forecast`  
**Gratuit, sans clé API, sans inscription.**

### Données disponibles (testées)

| Champ | Unité | Description |
|---|---|---|
| `temperature_2m` | °C | Température air à 2 m |
| `windspeed_10m` | km/h | Vitesse vent à 10 m |
| `winddirection_10m` | ° | Direction vent |
| `pressure_msl` | hPa | Pression au niveau de la mer |
| `cloudcover` | % | Couverture nuageuse |
| `precipitation` | mm | Précipitations |

### Résultats réels (Douarnenez, 2026-05-12 23h30)
- Température : **12 °C**, vent : **28,5 km/h** depuis **332°** (NNO)
- Pression : **1018,4 hPa**, couverture : **59 %**

### Limites
- **Ne fournit PAS de prédictions de marées.** Confirmé.
- Résolution spatiale : ~1 km (modèle IFS/ICON/GFS selon zone).

### Usage dans le projet
Utiliser en complément d'Open-Meteo Marine pour les conditions atmosphériques :
- Carte conditions du moment
- Snapshot `conditions` jsonb dans les catches
- Page calendrier marées (colonne météo)

---

## 3. Confirmation : Open-Meteo ne fournit PAS de marées

**Open-Meteo Marine** et **Open-Meteo Forecast** ont été interrogés sur tous leurs champs disponibles.  
Aucune donnée de type marée (hauteur d'eau, coefficient, pleine mer / basse mer) n'est retournée.

> **Conclusion : une API tierce dédiée est obligatoire pour les prédictions de marées.**

---

## 4. APIs de marées testées

### 4a. WorldTides v3

**Endpoint :** `https://www.worldtides.info/api/v3`  
**Freemium — 100 calls/jour gratuit (1 call = 1 journée de prédictions).**

- Endpoint opérationnel, répond HTTP 400 avec clé invalide (comportement attendu).
- Format de réponse attendu (selon doc) : tableau `heights[]` avec `dt` (timestamp Unix) et `height` (mètres au-dessus du zéro hydrographique).
- Couvre les côtes françaises. Données issues de modèles harmoniques (précision ~10 cm).

**Comment obtenir une clé gratuite :** s'inscrire sur [worldtides.info](https://www.worldtides.info) → plan gratuit 100 calls/jour.

**Tarification si on dépasse :**
- 1 000 calls : 9 $/mois
- 10 000 calls : 49 $/mois
- Illimité : 199 $/mois

**Verdict :** ✅ **Choix principal pour les marées** — quota suffisant pour v1 (1 call/spot/jour en cache).

---

### 4b. StormGlass v2

**Endpoint :** `https://api.stormglass.io/v2/tide/sea-level/point`  
**Freemium — 10 calls/jour gratuit (trop limité).**

- Endpoint opérationnel, répond HTTP 403 avec clé invalide (comportement attendu).
- Format de réponse : tableau `data[]` avec `time` (ISO 8601) et `sg` (hauteur en mètres, source StormGlass).
- Fournit aussi vagues, vent, courants dans d'autres endpoints.

**Tarification :**
- 10 calls/jour : gratuit
- 500 calls/jour : 29 $/mois
- 2 000 calls/jour : 79 $/mois

**Verdict :** ⚠️ **Trop limité en gratuit** (10 calls/jour ≪ nos besoins). À utiliser seulement comme fallback d'urgence si WorldTides est down.

---

## 5. Décision finale

### Ce qu'on utilise et pourquoi

| Besoin | API retenue | Clé API | Coût v1 |
|---|---|---|---|
| Houle (hauteur, direction, période) | Open-Meteo Marine | Non | Gratuit |
| Température de l'eau (SST) | Open-Meteo Marine | Non | Gratuit |
| Vent (vitesse, direction) | Open-Meteo Forecast | Non | Gratuit |
| Température air, pression | Open-Meteo Forecast | Non | Gratuit |
| **Marées (hauteurs horaires)** | **WorldTides v3** | Oui (gratuit 100/j) | Gratuit → ~9 $/mois |
| Fallback marées | StormGlass v2 | Oui (10/j) | Gratuit (urgence only) |

### Stratégie de cache pour les marées

Le quota de 100 calls/jour WorldTides est suffisant en v1 **à condition de cacher agressivement** :

```
1 call = 1 point géographique + 1 journée de prédictions
→ Cache dans conditions_cache (table Supabase) avec TTL 12h
→ Clé de cache : geohash(lat, lng, precision=4) + date YYYY-MM-DD
→ Résout à ~10–20 calls/jour pour les 50 spots les plus consultés
```

En pratique : les marées sont **périodiques et prévisibles** — on peut pré-calculer les 7 prochains jours à la création d'un spot et revalider chaque matin via Edge Function cron.

### Ce qu'on ne fait PAS en v1

- **SHOM Geoservices** — open data FR officiel, plus précis, mais API plus complexe et inconnue à ce stade. À évaluer pour Sprint 7 si WorldTides pose problème.
- **Open-Meteo `wind_waves`** — champ expérimental non documenté, non testé, ne pas l'utiliser.

---

## 6. Plan d'implémentation (Sprint 7)

1. Créer la clé WorldTides (inscription gratuite)
2. Stocker la clé dans `.env.local` : `WORLDTIDES_API_KEY=...`
3. Créer une Edge Function `fetch-tides` qui :
   - Reçoit `{ lat, lng, date }` en entrée
   - Vérifie le cache `conditions_cache` (TTL 12h)
   - Si absent : appelle WorldTides, stocke en cache, retourne
   - Si présent : retourne directement depuis cache
4. Appeler cette Edge Function depuis le hook `useTides(lat, lng)` côté client
5. Afficher un calendrier de marées 7 jours sur la page spot

---

*Généré automatiquement le 2026-05-12 par `scripts/check-apis.ts`.*
