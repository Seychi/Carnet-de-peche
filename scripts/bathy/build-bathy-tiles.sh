#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Carte-v2 / C3a — Pipeline GDAL : bathymétrie GeoTIFF → tuiles "grille colorée"
# (MBTiles → PMTiles), façade pilote = Bretagne.
#
# CECI EST LA VOIE "SELF-HOST" (option, cf docs/carte-v2/data-sources.md §3 + README).
# Par défaut le produit consomme directement le WMS EMODnet (0 € d'hébergement) ;
# ce pipeline sert à s'affranchir des quotas/uptime EMODnet, faire de l'offline, ou
# appliquer une palette daltonien-safe maison + la HR côtière SHOM Litto3D.
#
# Reproductible via Docker (image GDAL épinglée) :
#   docker run --rm -v "$PWD:/data" -w /data \
#     ghcr.io/osgeo/gdal:ubuntu-small-3.11.4 bash scripts/bathy/build-bathy-tiles.sh
#
# Entrée attendue : data/in/bathy_bretagne.tif
#   = MNT profondeur (EMODnet DTM ~115 m, ou SHOM MNT/Litto3D), profondeur NÉGATIVE
#     sous le niveau de la mer (convention EMODnet). Voir README pour l'acquisition.
# Sortie : data/out/bathy_bretagne.mbtiles  (+ .pmtiles si go-pmtiles dispo, cf README)
#
# ⚠️ Image épinglée (pas -latest) : GDAL 3.13 a déprécié gdal2tiles et change des
#    défauts. On reste sur 3.11.4 + `gdal_translate -of MBTILES` (déterministe).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IN="${BATHY_IN:-data/in/bathy_bretagne.tif}"
WORK="data/work"
OUT="data/out"
mkdir -p "$WORK" "$OUT"

# BBox façade Bretagne (WGS84). Ajuster par façade pour limiter le volume.
LON_MIN="${LON_MIN:--5.30}"; LAT_MIN="${LAT_MIN:-46.90}"
LON_MAX="${LON_MAX:--1.00}"; LAT_MAX="${LAT_MAX:-49.10}"
MINZOOM="${MINZOOM:-6}"; MAXZOOM="${MAXZOOM:-12}"

if [ ! -f "$IN" ]; then
  echo "ERREUR : entrée introuvable : $IN" >&2
  echo "Télécharge d'abord le MNT (cf scripts/bathy/README.md § Acquisition)." >&2
  exit 1
fi

echo "[1/4] gdalwarp → EPSG:3857 + découpe bbox Bretagne"
gdalwarp -t_srs EPSG:3857 \
  -te "$LON_MIN" "$LAT_MIN" "$LON_MAX" "$LAT_MAX" -te_srs EPSG:4326 \
  -dstnodata -9999 -r cubic -multi -wo NUM_THREADS=ALL_CPUS \
  -of GTiff -co TILED=YES -co COMPRESS=DEFLATE "$IN" "$WORK/bathy_3857.tif"

echo "[2/4] gdaldem color-relief → rampe BLEUE séquentielle (daltonien-safe)"
# Luminosité monotone clair(peu profond) → foncé(profond). PAS de rouge↔vert.
# Format : <valeur_profondeur_négative> R G B A. nv = nodata → alpha 0 (terre transparente).
cat > "$WORK/bathy_ramp.txt" <<'RAMP'
   0   222 235 247 255
  -5   198 219 239 255
 -10   158 202 225 255
 -20   107 174 214 255
 -50    66 146 198 255
-100    33 113 181 255
-200     8  81 156 255
-500     8  48 107 255
-9999    0   0   0   0
nv       0   0   0   0
RAMP
gdaldem color-relief -alpha "$WORK/bathy_3857.tif" "$WORK/bathy_ramp.txt" \
  "$WORK/bathy_rgba.tif" -of GTiff -co TILED=YES -co COMPRESS=DEFLATE

# (optionnel) relief ombré sous-marin — décommenter si l'image GDAL embarque hsv_merge.py
# gdaldem hillshade -z 3 -compute_edges "$WORK/bathy_3857.tif" "$WORK/hs.tif" \
#   -of GTiff -co TILED=YES -co COMPRESS=DEFLATE
# python3 /usr/share/gdal/scripts/hsv_merge.py "$WORK/bathy_rgba.tif" "$WORK/hs.tif" \
#   "$WORK/bathy_rgba.tif"

echo "[3/4] gdal_translate -of MBTILES + gdaladdo (overviews)"
gdal_translate -of MBTILES -co TILE_FORMAT=PNG \
  -co MINZOOM="$MINZOOM" -co MAXZOOM="$MAXZOOM" \
  "$WORK/bathy_rgba.tif" "$OUT/bathy_bretagne.mbtiles"
gdaladdo -r average "$OUT/bathy_bretagne.mbtiles" 2 4 8 16 32

echo "[4/4] OK → $OUT/bathy_bretagne.mbtiles"
echo "Étape PMTiles (hors image GDAL, cf README) :"
echo "  pmtiles convert $OUT/bathy_bretagne.mbtiles $OUT/bathy_bretagne.pmtiles"
