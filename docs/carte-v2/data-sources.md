# Carte v2 / C3a — Sources de données & licences (profondeur + nature du fond)

> Rédigé le 2026-06-22 (sprint Carte-v2 / C3a). **Toutes les licences et tous les
> endpoints ci-dessous ont été vérifiés en direct le 2026-06-22** (curl + recherche
> sur les pages officielles), pas par mémoire. Si une donnée n'était pas vérifiable,
> c'est dit. Brief : `sprint-C3a-bathymetrie-fond.md`. Vision : `../excellence/CARTE-V2.md`.

## TL;DR (la décision)

| Donnée | Source retenue | Licence | Usage commercial | Statut |
|---|---|---|---|---|
| **Profondeur** | **EMODnet Bathymetry** (DTM 2024) | CC-BY 4.0 | ✅ avec attribution | **RETENU** |
| **Nature du fond** | **EMODnet Seabed Habitats — EUSeaMap** (`eusm2025_subs_full`) | CC-BY 4.0 | ✅ avec attribution | **RETENU** |
| Profondeur (HR côtier) | SHOM Litto3D / MNT façade | Licence Ouverte Etalab 2.0 | ✅ avec attribution | Option (self-host, WMS sous abonnement) |
| Nature du fond (SHOM) | SHOM sédimentologie `NATURES_FOND_*` | **CC BY-SA 4.0 NON commerciale** | ❌ | **ÉCARTÉ** (cf. §4) |
| Profondeur (fallback global) | GEBCO_2026 | Domaine public + attribution | ✅ | Option (trop grossier côtier — cf. §5) |

**Le point clé :** tout ce dont on a besoin (profondeur **et** nature du fond) est
disponible en **CC-BY 4.0, usage commercial autorisé**, via **EMODnet**. On ne dépend
PAS du SHOM, dont la sédimentologie est non-commerciale (incompatible avec un produit
freemium payant). Attribution EMODnet **obligatoire et visible** (gérée par MapLibre,
cf. `lib/map/bathymetry-layer.ts`).

---

## 1. EMODnet Bathymetry — PROFONDEUR ✅ (retenu)

- **Produit** : DTM (Digital Terrain Model) 2024 Release (publié 2025-03-24). Résolution
  **1/16 × 1/16 arc-min ≈ 115 m**. Formats de téléchargement : ESRI ASCII, XYZ, EMODnet CSV,
  NetCDF-CF, GeoTIFF, SD. Téléchargement par tuiles via l'EMODnet Map Viewer.
- **Licence** : **CC-BY 4.0**. `AccessConstraints = None`, `Fees = None` (vu dans le
  GetCapabilities WMS). Usage commercial autorisé, attribution obligatoire.
- **Attribution (à afficher)** :
  > Bathymétrie : EMODnet Bathymetry (DTM 2024) — https://emodnet.ec.europa.eu/en/bathymetry — CC-BY 4.0.
- **Endpoints vérifiés en direct (2026-06-22)** :
  - **REST profondeur au point** (utilisé par `lib/conditions/bathymetry.ts`) :
    `https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(lng lat)`
    → JSON `{min,max,avg,stdev,smoothed,...}`. Testé `POINT(-4.79 48.04)` → `avg:-34.79964`,
    `POINT(-3.92 47.85)` → `avg:-5.45`. Valeurs **négatives** = sous le niveau de la mer.
  - **WMS visuel** : `https://ows.emodnet-bathymetry.eu/wms` (1.3.0). Couche
    **`emodnet:mean`** (rampe BLEUE séquentielle, luminosité monotone → daltonien-safe).
    GetMap testé → `200 image/png`, **CORS `Access-Control-Allow-Origin: *`** (donc
    utilisable comme source raster MapLibre côté navigateur). GetFeatureInfo JSON supporté.
  - **WMTS** : `https://tiles.emodnet-bathymetry.eu/wmts/1.0.0/WMTSCapabilities.xml` (200, alt.).
- ⚠️ **NE PAS utiliser `emodnet:mean_multicolour`** (palette arc-en-ciel rouge↔vert,
  illisible en deutéranopie — John est daltonien, cf. mémoire `john-colorblind`).

## 2. EMODnet Seabed Habitats / EUSeaMap — NATURE DU FOND ✅ (retenu)

C'est **la** donnée qui produit « Fond : Vase ». La donnée rare et commercial-friendly.

- **Couche** : **`eusm2025_subs_full`** (substrat, classification Folk simplifiée). Classes
  observées : `Sand`, `Mud to muddy sand`, `Coarse substrate`, `Mixed sediment`,
  `Rock or other hard substrata`, `Sediment`, `Seabed`… → mappées FR dans
  `lib/conditions/bathymetry.ts` (`substrateToFr` : Sable / Vase / Sédiment grossier /
  Sédiment mixte / Roche…). Classe inconnue → libellé brut (jamais d'invention).
- **Licence** : **CC-BY 4.0**. Usage commercial autorisé, attribution obligatoire.
- **Attribution (à afficher)** :
  > Nature du fond : EMODnet Seabed Habitats (EUSeaMap) — https://emodnet.ec.europa.eu/en/seabed-habitats — CC-BY 4.0.
- **Endpoints vérifiés en direct (2026-06-22)** :
  - **WMS GetFeatureInfo** (utilisé par `/api/seabed`) :
    `https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms` (1.3.0).
    `LAYERS=QUERY_LAYERS=eusm2025_subs_full`, `CRS=EPSG:4326`, **BBOX en ordre lat,lon**
    (axes WMS 1.3.0), mini-fenêtre `WIDTH=HEIGHT=101 I=J=50`, `INFO_FORMAT=application/json`,
    **`&propertyName=substrate`** pour alléger (réponse ~120 Ko de géométrie → quelques
    octets `{geometry:null, properties:{substrate}}`). Testé Pointe du Raz → `"Rock or other
    hard substrata"`, baie de Concarneau → `"Sand"`.
  - **WMS visuel (overlay)** : même service, `request=GetMap`, `emodnet:`→`eusm2025_subs_full`.
    GetMap testé → `200 image/png` RGBA transparent, **CORS `*`** (overlay MapLibre OK).
- ⚠️ Éviter le groupe `eusm2023_subs_group` (renvoyait `LayerNotQueryable`). On reste sur
  `eusm2025_subs_full` (queryable=1).

## 3. SHOM — bathymétrie (Litto3D / MNT) — option self-host

- **Produits** : Litto3D (cotier haute résolution, ex. Bretagne 2018-2021, mailles 1 m / 5 m,
  EPSG:2154, ASC/XYZ), MNT de façade Atlantique (~111 m, projet Homonim). Données **sources
  brutes** (à convertir soi-même en hillshade / iso-bathes pour MapLibre).
- **Licence** : **Licence Ouverte Etalab 2.0** → **usage commercial autorisé**, attribution
  « Source : Shom » + date de dernière mise à jour. Ex. « Shom - IGN, 2024 » (Litto3D Bretagne) ;
  « SHOM, 2015. MNT Bathymétrique de façade Atlantique (Projet Homonim) ».
- **Endpoints** : `services.data.shom.fr/INSPIRE/{wms/v, wms/r, wfs, wmts}`. ⚠️ Le **WMS est
  marqué « Soumis à abonnement »** : même si la donnée est en licence ouverte, l'accès au
  service confortable nécessite un compte/abonnement. → en pratique : **télécharger les
  rasters bruts puis tuiler nous-mêmes** (pipeline `scripts/bathy/`), pas brancher le WMS.
- **Quand l'activer** : si on veut une résolution côtière FINE (Litto3D > EMODnet 115 m),
  offline, ou une palette daltonien-safe maison. C'est le « poste GIS » du brief. Pas requis
  pour la parité de base (EMODnet suffit).

## 4. SHOM — sédimentologie (nature du fond) — ❌ ÉCARTÉ

- **Couche** : `NATURES_FOND_150_BDD_4326_WMSV` (services.data.shom.fr).
- **Licence** : **CC BY-SA 4.0 — usage NON commercial uniquement** (confirmé sur les
  métadonnées GeoNetwork officielles SHOM). Le **Share-Alike** est en plus incompatible avec
  un produit propriétaire. **NO-GO en l'état** pour Carnet de Pêche (freemium payant).
- Usage commercial = **licence payante** (redevance / contrat, contact `bps@shom.fr`).
- **Décision** : on utilise **EMODnet Seabed Habitats** (§2, CC-BY) à la place. Le SHOM
  sédimento ne sera (ré)envisagé que si on veut une finesse côtière supérieure ET qu'on
  négocie une licence commerciale.

## 5. GEBCO — bathymétrie globale — option fallback (probablement inutile)

- **Produit** : GEBCO_2026 Grid (sorti 2026-04), 15 arc-sec (**~460 m**), NetCDF 4 ~7 Go
  global ; export de zones en GeoTIFF / ESRI ASCII via `download.gebco.net`.
- **Licence** : domaine public, **usage et exploitation commerciale autorisés**, attribution
  obligatoire. Ex. : `GEBCO Compilation Group (2026) GEBCO_2026 Grid (doi:10.5285/...)`.
  ⚠️ Terms of Use : ne **jamais** présenter comme aide à la **navigation / sécurité en mer**.
- **Rôle** : fallback mondial seulement. **~460 m est trop grossier pour la pêche du bord** ;
  EMODnet (~115 m) et SHOM couvrent la côte FR. → **probablement redondant pour la v1**.

---

## Attribution dans le produit (obligation légale — RGPD/licences)

- La couche carte porte son attribution via la **source MapLibre** (`lib/map/bathymetry-layer.ts`,
  constante `ATTRIBUTION`) → s'affiche dans le contrôle d'attribution MapLibre **quand la couche
  est active**. Liens vers EMODnet Bathymetry + Seabed Habitats + mention CC-BY 4.0.
- La fiche spot affiche « Source EMODnet Bathymetry · EMODnet Seabed Habitats (EUSeaMap) »
  sous le bloc « Fond & profondeur ».
- Le popup carte affiche « Source : EMODnet ».

## Architecture retenue (rappel)

- **Visuel** (Bloc C) : 2 sources raster EMODnet WMS (profondeur + substrat), CC-BY, CORS `*`,
  **lazy** (chargées à l'activation), **zoom ≥ 9**, opacité réglable. Surclassables en tuiles
  **PMTiles auto-hébergées** (R2) via env `NEXT_PUBLIC_BATHY_DEPTH_TILES_URL` /
  `NEXT_PUBLIC_BATHY_SUBSTRATE_TILES_URL` (pipeline `scripts/bathy/`).
- **Popup** (Bloc D) : `/api/seabed?lat&lng` (gated Itinérant) → `depth_sample` + GetFeatureInfo,
  agrégé **côté serveur** (évite CORS/quotas client, profite du cache 30 j). **Aucune migration**
  (lookup HTTP, pas de table PostGIS).
- **Perf** : pas de retour au « 8 s de chargement » — la couche n'est jamais dans le 1er load,
  `raster-fade-duration:0`, bornée en zoom.

## ⚠️ DEMANDER À JOHN

1. **Tier** : le brief C3a dit **Itinérant** ; les tarifs (§8 CLAUDE.md) listent « Couches
   avancées (bathymétrie) » côté **Local** ET « Bathymétrie SHOM premium » côté **Itinérant**.
   Implémenté en **Itinérant** (constante unique `BATHY_TIER` dans `BathyLayerControl.tsx`).
   → Confirmer Local vs Itinérant (1 ligne à changer).
2. **Hébergement tuiles** : pour la v1 on **n'héberge rien** (WMS EMODnet direct, 0 €). Si on
   veut s'affranchir des quotas/uptime EMODnet ou une palette maison → pipeline GDAL→PMTiles→**R2**
   (egress gratuit, ~0 €/mois ; cf. `scripts/bathy/README.md`). Décision : quand, et domaine R2 ?
3. **SHOM sédimentologie** : non-commerciale → écartée. La négocier (payant) un jour pour une
   finesse côtière, ou rester sur EMODnet ? (Recommandation : rester EMODnet.)
4. **GEBCO** : utile comme fond global, ou EMODnet/SHOM suffisent sur la côte FR ? (Recommandation :
   inutile pour la v1.)
5. **Quotas OWS EMODnet** : non testés sous charge. Mitigés par : lazy + zoom ≥ 9 + gating
   Itinérant + cache serveur 30 j pour le popup. Le self-host R2 les supprime totalement.
6. **Référence verticale** de `depth_sample` (MSL ?) : non confirmée — affiché en « ≈ X m »
   (approx assumée), cohérent avec l'existant.
