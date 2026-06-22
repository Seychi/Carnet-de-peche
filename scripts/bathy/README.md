# `scripts/bathy/` — Pipeline tuiles bathymétrie/fond (Carte-v2 / C3a)

Génère des tuiles raster **profondeur** (et, en option, **substrat**) auto-hébergées,
pour s'affranchir du WMS EMODnet (quotas/uptime), faire de l'offline, ou appliquer une
palette daltonien-safe maison + la HR côtière SHOM Litto3D.

> **Pas obligatoire pour la v1.** Par défaut, la couche carte consomme le WMS EMODnet
> en direct (0 € d'hébergement, CORS OK — cf `lib/map/bathymetry-layer.ts`). Ce pipeline
> est la **voie self-host** documentée dans `../../docs/carte-v2/data-sources.md`.

## Prérequis

- **Docker** (démarré). Aucune installation GDAL locale requise.
- Image GDAL **épinglée** : `ghcr.io/osgeo/gdal:ubuntu-small-3.11.4`.
  (Ne pas utiliser `-latest` : GDAL 3.13 déprécie `gdal2tiles` et change des défauts.)
- Pour l'étape PMTiles : `go-pmtiles` (`pmtiles`), hors image GDAL (cf. plus bas).

## 1. Acquisition du MNT (entrée `data/in/bathy_bretagne.tif`)

Profondeur **négative** sous le niveau de la mer (convention EMODnet).

- **EMODnet Bathymetry (recommandé, CC-BY 4.0, ~115 m)** : télécharger la/les tuile(s)
  DTM couvrant la Bretagne en **GeoTIFF** via l'EMODnet Map Viewer / portail bathymétrie,
  puis mosaïquer si besoin (`gdalbuildvrt` + `gdal_translate`). Réf. + licence :
  `../../docs/carte-v2/data-sources.md §1`.
  - Alternative scriptable (à vérifier) : driver WCS GDAL sur
    `https://ows.emodnet-bathymetry.eu/wcs` (couche `emodnet:mean`). Tester le
    GetCapabilities WCS avant d'industrialiser.
- **SHOM (HR côtier, Licence Ouverte 2.0, ~1–5 m Litto3D Bretagne)** : télécharger les ASC/XYZ
  sur `data.shom.fr` (Litto3D Bretagne / MNT façade Atlantique), convertir en GeoTIFF
  (`gdal_translate`/`gdalbuildvrt`). Attribution « Source : Shom ». Réf. : `data-sources.md §3`.

Placer le résultat dans `data/in/bathy_bretagne.tif`.

## 2. Génération des tuiles

```bash
docker run --rm -v "$PWD:/data" -w /data \
  ghcr.io/osgeo/gdal:ubuntu-small-3.11.4 \
  bash scripts/bathy/build-bathy-tiles.sh
```

Variables surchargeables : `BATHY_IN`, `LON_MIN/LAT_MIN/LON_MAX/LAT_MAX`, `MINZOOM/MAXZOOM`.
Sortie : `data/out/bathy_bretagne.mbtiles`.

## 3. MBTiles → PMTiles (servi en statique, sans tile-server)

`pmtiles` n'est pas dans l'image GDAL. Avec go-pmtiles installé :

```bash
pmtiles convert data/out/bathy_bretagne.mbtiles data/out/bathy_bretagne.pmtiles
```

## 4. Hébergement — Cloudflare R2 (recommandé, ~0 €/mois)

PMTiles = **un seul fichier**, lu par HTTP **Range requests** → pas de tile-server.
R2 a l'**egress gratuit** (décisif : chaque pan/zoom = des range requests).

- Bucket R2 + domaine custom (ou `r2.dev` temporaire). CORS : autoriser `GET`, `Range`,
  exposer `ETag`/`Content-Length`.
- Brancher dans le produit via env (`.env.local` + Vercel) :
  ```
  NEXT_PUBLIC_BATHY_DEPTH_TILES_URL=pmtiles://https://tiles.carnet-de-peche.com/bathy_bretagne.pmtiles/{z}/{x}/{y}
  ```
  Et installer le protocole côté client : `pnpm add pmtiles` puis, avant `new Map()`,
  `maplibregl.addProtocol('pmtiles', new (await import('pmtiles')).Protocol().tile)`.
  (À faire au moment où on bascule sur le self-host — non câblé en v1.)

## 5. Substrat vectoriel (option avancée — popup natif)

Le popup « Fond » utilise aujourd'hui le **WMS GetFeatureInfo serveur** (cf `/api/seabed`),
suffisant et sans hébergement. Si un jour on veut le substrat en **vecteur cliquable** :

```bash
# Reprojeter + clipper + ne garder que la classe de fond
ogr2ogr -t_srs EPSG:4326 -clipdst $LON_MIN $LAT_MIN $LON_MAX $LAT_MAX \
  -select substrate subs_bretagne.gpkg eusm2025_subs_full.gpkg
# Tuiles vectorielles (tippecanoe) → PMTiles
tippecanoe -o subs_bretagne.pmtiles -Z6 -z13 --coalesce \
  --drop-densest-as-needed --detect-shared-borders -l substrate subs_bretagne.gpkg
```

Source substrat (GeoPackage/Shapefile) : EMODnet Seabed Habitats `eusm2025_subs_full`
(CC-BY 4.0, ~1,85 Go 2025). Réf. : `data-sources.md §2`.

## Licences & attribution

**Obligatoire et visible** dans le produit. Récap + chaînes exactes :
`../../docs/carte-v2/data-sources.md`. EMODnet = CC-BY 4.0 ; SHOM bathy = Licence Ouverte 2.0
(« Source : Shom ») ; **SHOM sédimento = NON commercial → interdit** ; GEBCO = domaine public + attribution.
