# Investigation floutage GPS des spots — réconciliation « 199 m » vs « 1 km »

> READ-ONLY. Aucun write SQL. Prod Supabase `glgciwwnpmgifyhbvxsw` (eu-west-1), 2026-06-22.
> Audit déclencheur : `docs/audits/AUDIT-MOBILE-S16-S17-2026-06-22.md` §2 (« offset moy 199 m / max 401 m, 100% < 500 m »).

## TL;DR

- **Pas de régression.** La fonction `blur_spot_geom()` en prod est exactement la version de la migration **028** (`ST_Buffer(ST_Project(geom, 500 + random()*400, …), 500)`), inchangée. Tous les spots (139, sur 3 batchs : 2026-05-11, 06-21, 06-22) sont floutés au même rayon.
- **Le rayon réel de jitter est 500–900 m** (azimut aléatoire), pas 1 km, pas 200 m.
- **L'audit mobile et la note 11.6 mesurent deux choses différentes — les deux sont « justes » :**
  - **Note 11.6 « 510–898 m »** = distance du point réel au **centre du polygone public** (`ST_Centroid(geom_public)`). **C'est le bon chiffre sécurité** : c'est ce point-là que les RPC renvoient comme coordonnée publique. **Mesuré aujourd'hui : moy 695 m / médiane 690 m / max 899 m / min 503 m.**
  - **Audit mobile « 199 m »** = `ST_Distance(geom, geom_public)` = distance du point réel à **l'arête la plus proche du polygone** (le buffer de 500 m). Comme le jitter (500–900 m) dépasse le rayon du buffer (500 m), le point réel tombe souvent juste à l'extérieur du disque → la distance au bord ≈ jitter − 500 m ≈ **~196 m en moyenne**. C'est un **artefact de mesure** (point→polygone au lieu de point→centre), pas le flou réellement appliqué.
- **Verdict : le flou réel est ~700 m en moyenne (et toujours ≥ 500 m).** « 199 m » est une fausse alerte de méthodologie. Mais « 1 km » dans la copy reste **trompeur** : le flou est < 1 km dans 100 % des cas.

## Détails chiffrés (prod live)

Fonction live (`pg_get_functiondef`), identique à `028_spot_geom_blur_jitter.sql` :

```sql
new.geom_public := ST_Buffer(
  ST_Project(new.geom, 500 + random() * 400, random() * 2 * pi()),  -- distance en MÈTRES (geom = geography)
  500
);
```

Types confirmés : `spots.geom` = `geography(Point,4326)`, `spots.geom_public` = `geography(Polygon,4326)`.
→ `ST_Project` sur une **geography** interprète la distance en **mètres** (correct). Pas de bug d'unité degrés/mètres.

Distribution mesurée sur les 139 spots (geom non nul), distance point réel → **centroïde** du polygone public (= le point réellement publié) :

| n | min | moy | médiane | p90 | max | % < 300 m | % < 500 m | % > 800 m |
|---|-----|-----|---------|-----|-----|-----------|-----------|-----------|
| 139 | 503 m | **695 m** | 690 m | 846 m | 899 m | 0 % | 0 % | 21,6 % |

Même mesure faite avec 5 définitions différentes du « point public » — toutes convergent vers ~695 m, **sauf** la distance point→polygone (artefact) :

| Méthode | moy | max |
|---|---|---|
| Centroïde polygone (`ST_Centroid` geom & geog, `PointOnSurface`, centre bbox) | **694,7 m** | 898,5 m |
| **Distance point→polygone (`ST_Distance(geom, geom_public)`)** ← l'audit | **196,1 m** | (≈401) |

Cohérence par batch (distance au centroïde) — **homogène, aucun lot sous-flouté** :

| Batch (jour de création) | n | min | moy | max |
|---|---|-----|-----|-----|
| 2026-05-11 (seed initial) | 10 | 562 | 723 | 846 |
| 2026-06-21 (lot 1 / re-flou 028) | 73 | 510 | 699 | 899 |
| 2026-06-22 (lot le plus récent) | 56 | 503 | 685 | 877 |

## État sécurité de la colonne (rappel, confirmé)

| privilège | anon | authenticated |
|---|---|---|
| SELECT table `spots` | **false** | (révoqué, grant colonne par colonne) |
| SELECT colonne `geom` (précis) | **false** | **false** |
| SELECT colonne `geom_public` (flou) | true | true |

→ `anon` ne peut PAS lire le point précis. Il peut lire le **polygone flou** (normal — c'est la zone publique). Les RPC (`get_spots_for_map`, `get_spot_by_slug`, `get_spot_by_id`) renvoient `ST_Centroid(geom_public)` aux gratuits/anon, le `geom` précis seulement aux tiers local/itinerant (gating 029). Conforme.

### ⚠️ Nuance d'attaquant à garder en tête (ne change pas le verdict)

Le flou de 695 m protège la **coordonnée publiée** (centroïde). Mais le polygone `geom_public` lisible par `anon` est un **disque parfait de rayon 500 m** centré sur le point jitteré : son centre = exactement la coord publiée. L'attaquant n'apprend donc rien de plus que le centroïde (il ne récupère PAS le point réel). Le point réel reste à 500–900 m du centre, dans un anneau — non récupérable depuis le polygone seul. **OK.** (Vecteur distinct, non lié, déjà au backlog : `RLS-FIX-07 nearby_spots` trilatérable via `distance_m` calculée sur `geom` précis — hors périmètre de cette investigation, mais c'est lui le vrai trou résiduel sur les spots, pas le flou.)

## Conclusion sur l'écart

1. **Régression ?** Non. Fonction = 028 verbatim, appliquée uniformément aux 139 spots.
2. **Rayon réellement appliqué ?** Jitter aléatoire **uniforme 500–900 m** (moyenne ~700 m), azimut aléatoire 0–2π. Le « 199 m » de l'audit est une mesure point→bord-de-polygone (artefact), pas le flou.
3. **La note 11.6 « 510–898 m » était juste** (c'est la mesure au centroïde, = ce qui est publié). **L'audit mobile s'est trompé de métrique**, pas la prod.

## Les 2 options pour réconcilier avec « 1 km »

### Option A — Re-flouter à ~1 km (aligner la réalité sur la copy)

Augmenter la fenêtre de jitter pour viser un flou centroïde ≈ 1 km. Nouvelle migration (à créer, **NON appliquée ici** — application délibérée par John via CLI/SQL Editor) :

```sql
-- supabase/migrations/0NN_spot_blur_widen_1km.sql  (À CRÉER — ne pas éditer 028)
-- Vise un flou centroïde ~800–1200 m (moy ~1 km). Buffer 500 m conservé.
create or replace function public.blur_spot_geom()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.geom is distinct from old.geom then
    new.geom_public := ST_Buffer(
      ST_Project(new.geom, 800 + random() * 400, random() * 2 * pi()),  -- 800–1200 m
      500
    );
  end if;
  return new;
end;
$$;

-- Re-flou des 139 spots existants (le trigger ne se redéclenche pas seul) :
update public.spots
set geom_public = ST_Buffer(ST_Project(geom, 800 + random() * 400, random() * 2 * pi()), 500)
where geom is not null;
```

Vérif post-application attendue : `ST_Distance(geom, ST_Centroid(geom_public))` ∈ ~[800, 1200] m, moy ~1000 m.

- **Coût** : 1 migration + re-flou des 139 lignes + regen `lib/types.ts` (inchangé en pratique, mais discipline) + re-run advisors. Trigger déjà branché → les futurs inserts héritent du nouveau rayon.
- **Impact sécurité / moat** : ✅ renforce honnêtement la promesse anti spot-burning et la valeur du paywall (coord précise = payante, flou plus large = gratuit moins exploitable). Le centroïde s'éloigne, donc un gratuit qui « pêche autour de l'épingle » a une zone de recherche plus large (~3 km² vs ~1,5 km²).
- **Risque produit** : un flou plus large peut faire chevaucher des spots proches sur la carte et dégrader l'UX gratuite (pins qui « sautent » d'un quartier à l'autre). À sonder. `⚠️ DEMANDER À JOHN` si ce sont vraiment 1 km souhaités, ou ~700 m actuels suffisent.
- **Ne PAS oublier** : la promesse « anti spot-burning » repose surtout sur le **gating de `geom` précis** (déjà OK) — élargir le flou est cosmétique vs ce gating, pas un substitut.

### Option B — Corriger la copy (aligner la copy sur la réalité ~700 m)

Garder le flou actuel (déjà solide : ≥ 500 m, moy ~700 m) et arrêter d'annoncer « 1 km ». Chiffre honnête recommandé : **« plusieurs centaines de mètres »** (formulation robuste qui reste vraie même si le rayon évolue) ; à défaut un chiffre, **« ~500 m »** (plancher mesuré, jamais dépassé par le bas) plutôt que « 700 m » (moyenne, donc dépassée la moitié du temps vers le bas pas pour la promesse — ici la promesse est un *minimum* de flou, donc « au moins 500 m »).

Fichiers à corriger (copy publique « 1 km » → formulation honnête) :

- `app/(marketing)/tarifs/pricing-cards.tsx:25` — « coords floutées 1 km »
- `app/(marketing)/page.tsx:444` — « floutée à 1 km, systématiquement »
- `app/(marketing)/fil/page.tsx:34` — « rayon d'1 km »
- `app/(marketing)/peche/[...slug]/page.tsx:324` — « Coordonnées floutées à 1 km »
- `app/(marketing)/legal/confidentialite/page.tsx:120,151` — « floutée à 1 km » (⚠️ page légale : à formuler prudemment, « plusieurs centaines de mètres »)
- `components/catches/CatchForm.tsx:873` — « coords floutées à 1 km » (⚠️ ceci concerne les **catches**, pas les spots — le flou catches est un autre code, `blur_catch_geom`, jitter ±0.009° ≈ ±1 km : à vérifier séparément avant de toucher cette ligne)
- Guides MDX : `content/guides/peche-au-bar-au-leurre.mdx:235`, `content/guides/peche-a-la-dorade-royale-au-surfcasting.mdx:172`, `docs/guides/peche-dorade-royale-surfcasting-debutant.md:155` (idem : ce sont des **catches**, vérifier le flou catches avant)
- Doc interne (non public, à aligner sans urgence) : `CLAUDE.md:286,318,344`, `docs/BRIEF.md:43`

- **Coût** : édition de copy, zéro migration, zéro risque DB. Le plus rapide.
- **Impact sécurité / moat** : neutre (le flou ne change pas). Honnêteté de la promesse rétablie. Légèrement moins « vendeur » (700 m < 1 km), mais évite une affirmation fausse exploitable (RGPD/marketing).

## Reco

**B en priorité, immédiat** (corriger la copy publique vers « plusieurs centaines de mètres » / « au moins 500 m ») : le flou actuel est sain, « 199 m » est une fausse alerte, et la seule vraie inexactitude est la copy « 1 km ».

**A seulement si John veut tenir littéralement « 1 km »** comme argument produit — c'est un choix marketing, pas une correction de bug. `⚠️ DEMANDER À JOHN`.

⚠️ **Attention scope** : plusieurs occurrences « 1 km » concernent les **catches** (`CatchForm`, guides), pas les spots. Le flou catches (`blur_catch_geom`, ±0.009° ≈ ±1 km via `random()-0.5`, donc moyenne ~500 m, max ~1,4 km en diagonale) n'a PAS été mesuré dans cette investigation (hors périmètre). Ne pas modifier la copy catches sans une mesure dédiée de `catches.geom` ↔ `catches.geom_public`.

---
*Investigation read-only, 2026-06-22. Aucun write. Migrations lues : 004, 028, 029. Mesures : prod live via connecteur Supabase (SELECT seulement).*
