# Sprint 4 + Sprint 7 — Récap technique

> Période : mai 2026  
> Périmètre : Carte interactive + Données environnementales + SEO programmatique  
> Rédigé par Claude Code après la phase 8C

---

## A. Fichiers créés

### `components/map/`
| Fichier | Rôle |
|---|---|
| `MapView.tsx` | Carte MapLibre GL, gestion markers HTML (< 200 spots) et clustering GeoJSON natif (≥ 200), cercles floutés freemium, gestion WebGL fallback |
| `MapShell.tsx` | Orchestrateur : state global (spot sélectionné, filtres, géoloc, sheets), RPC `get_spots_for_map`, 3 breakpoints responsifs |
| `MapFilters.tsx` | Panneau filtres (espèce / technique / département), sync URL bidirectionnelle, gating tier |
| `SpotPopup.tsx` | Desktop = popup absolue `top-4 right-4 w-80` ; mobile = Sheet bottom drawer snap 60vh ; `useMediaQuery` pour switcher |
| `NearbyPanel.tsx` | Liste spots "autour de moi", Sheet multi-snap (20/50/90vh), compteur résultats par tier |
| `UserLocationMarker.tsx` | Marker GPS utilisateur, pulse animation CSS, lazy-load MapLibre depuis le cache module |
| `UpsellBanner.tsx` | Bandeau freemium réutilisable (texte + CTA configurable) |

### `components/conditions/`
| Fichier | Rôle |
|---|---|
| `TideChart.tsx` | Courbe marée 24h avec recharts, ligne "maintenant", coefficients AM/PM |
| `WeatherGrid.tsx` | Grille météo : vent (vitesse + direction), températures air/eau, pression, nébulosité |
| `WavesCard.tsx` | Hauteur vagues, houle, période, direction via icône flèche rotative |

### `components/spots/`
| Fichier | Rôle |
|---|---|
| `SpotConditionsSection.tsx` | Assemblage TideChart + WeatherGrid + WavesCard sur la fiche spot |
| `SpotMiniMap.tsx` | Mini-carte statique MapLibre (non-interactive) avec marker spot, lazy-chargé |

### `components/ui/`
| Fichier | Modification |
|---|---|
| `sheet.tsx` | Refonte majeure : union discriminante Dialog (sans snapPoints) / Drawer Base UI (avec snapPoints). `toDrawerSnapPoint()` convertit `'60vh'` → `0.6`. Snap points flottants via `--drawer-snap-point-offset` |

### `hooks/`
| Fichier | Rôle |
|---|---|
| `use-media-query.ts` | Init synchrone depuis `window.matchMedia()` pour éviter flash SSR, listener `change` proprement cleanup |

### `lib/auth/`
| Fichier | Rôle |
|---|---|
| `tier.ts` | `getUserTier()` : lit `subscriptions` en DB via Supabase server, retourne `'discovery' | 'local' | 'itinerant'` |

### `lib/geo/`
| Fichier | Rôle |
|---|---|
| `departments.ts` | `COASTAL_DEPARTMENTS` + `DEPARTMENT_LABELS`. Note : colonne DB `char(3)` → toujours `.trim()` avant lookup |
| `department-centroids.ts` | `DEPARTMENT_CENTROIDS` : coordonnées [lng, lat] pour centrer la carte par défaut sur le département de l'utilisateur |

### `lib/conditions/`
| Fichier | Rôle |
|---|---|
| `spot-forecast.ts` | Fetch Open-Meteo Marine API, cache `unstable_cache` 1h, retourne `SpotForecast` structuré |
| `weather-codes.ts` | Table WMO → libellé français + icône |
| `format.ts` | Helpers formatage (Beaufort, direction vent, hauteur vagues) |

### `lib/spots/`
| Fichier | Rôle |
|---|---|
| `filters-schema.ts` | Zod schema `MapFiltersSchema` : dept, species, technique, tier |
| `filter-url.ts` | `parseFiltersFromUrl()` + `serializeFiltersToUrl()` : query params simples (pas CSV) |
| `nearby.ts` | `getNearbySpots()` : appel RPC `nearby_spots` avec rayon par tier |

### `lib/map/`
| Fichier | Rôle |
|---|---|
| `utils.ts` | `SpotMarker` type, `createFuzzyCircle()` GeoJSON, `getBoundsForSpots()` |

### `lib/`
| Fichier | Rôle |
|---|---|
| `labels.ts` | `SPECIES_LABELS` + `TECHNIQUE_LABELS` + `STRUCTURE_LABELS` partagés web/OG |

### `app/`
| Fichier | Rôle |
|---|---|
| `sitemap.ts` | 7 pages statiques + tous les spots publics (lastModified) + 3 guides placeholder |
| `robots.txt` | Allow marketing + auth ; disallow API/app intérieur |
| `og/spot/[slug]/route.tsx` | Edge route ImageResponse 1200×630 : nom du spot, département (avec `.trim()`), espèces |
| `og/spots/route.tsx` | Edge route ImageResponse 1200×630 : compteur spots en live |
| `api/spots/nearby/route.ts` | Route API REST `/api/spots/nearby` pour la géolocalisation client |

### `supabase/migrations/`
| Fichier | Contenu |
|---|---|
| `009_map_helpers.sql` | RPC `get_spots_for_map(tier, dept)` : retourne spots filtrés par tier avec geom adapté |
| `010_fix_get_spots_for_map_precise.sql` | Fix : coords précises pour abonnés (geom vs geom_public) |
| `011_get_spot_by_slug.sql` | RPC `get_spot_by_slug(slug)` : fiche spot complète avec all fields |
| `012_get_spot_by_id.sql` | RPC `get_spot_by_id(id)` : même chose par ID (pour carnet/nouvelle) |

### `types/`
| Fichier | Rôle |
|---|---|
| `css.d.ts` | Déclaration pour `import 'maplibre-gl/dist/maplibre-gl.css'` (dynamic import edge) |

---

## B. Fichiers modifiés

| Fichier | Ce qui a changé |
|---|---|
| `app/(map)/carte/page.tsx` | Refonte complète : Server Component, `getUserTier()`, chargement spots RPC, passe props à MapShell |
| `app/(map)/layout.tsx` | `h-dvh overflow-hidden`, Header masqué sur mobile (`hidden md:block`), `main flex-1 min-h-0` |
| `app/(marketing)/spots/page.tsx` | Refonte SEO : Server Component, `generateMetadata` dynamique, JSON-LD ItemList, form GET HTML, `groupByDepartment` avec `.trim()` |
| `app/(marketing)/spots/[slug]/page.tsx` | `generateMetadata` enrichi (OG + Twitter + canonical), JSON-LD Place, `SpotConditionsSection`, `SpotMiniMap`, `deptKey = trim()` |
| `app/(app)/carnet/nouvelle/page.tsx` | Support `?spot_id=xxx` : pré-remplit le form, affiche bandeau spot |
| `app/layout.tsx` | Ajout `metadataBase: new URL(BASE_URL)` pour résolution relative des OG images |
| `components/catches/CatchForm.tsx` | Fix reset champs au changement de technique (bug sprint 3.5) |
| `app/globals.css` | Styles map fullscreen, animations pulse GPS, overrides MapLibre popup |
| `middleware.ts` | Ajout routes carte dans les routes protégées |

---

## C. Packages ajoutés

| Package | Version | Raison |
|---|---|---|
| `maplibre-gl` | ^5.24.0 | Carte interactive WebGL, open-source, pas de quota |
| `@base-ui/react` | ^1.4.1 | Drawer accessible avec snap points (Sheet mobile) |
| `recharts` | ^3.8.1 | Courbe de marée TideChart (SVG, léger, pas de canvas) |
| `@types/geojson` | ^7946.0.16 | Types pour les sources GeoJSON MapLibre |

**Non ajoutés (intentionnel) :**
- `supercluster` → clustering MapLibre natif suffit pour nos volumes
- `nuqs` → query params gérés manuellement (moins de dépendances)
- `suncalc` → solunar reporté au sprint 6

---

## D. Migrations DB

4 nouvelles migrations appliquées :

- **009** : RPC `get_spots_for_map` avec filtre par tier et département
- **010** : Fix coords précises pour abonnés (utilisait `geom_public` au lieu de `geom`)
- **011** : RPC `get_spot_by_slug` pour la fiche spot marketing
- **012** : RPC `get_spot_by_id` pour le carnet/nouvelle

---

## E. Décisions notables

### Format URL des filtres
**Choix** : query params simples `?dept=29&species=bar&technique=leurres`  
**Alternatives écartées** : CSV (`?species=bar,lieu`), repeated params (`?species=bar&species=lieu`)  
**Raison** : compatibilité native avec `searchParams` Next.js server-side, canonicals SEO propres, parsing zod sans lib externe

### Données carte : RPC Supabase vs Edge Function
**Choix** : RPC Supabase appelée depuis un Server Component  
**Alternative écartée** : Edge Function dédiée  
**Raison** : pas de cold start, pas de déploiement séparé, RLS Supabase s'applique naturellement, latence équivalente

### Clustering
**Choix** : clustering GeoJSON natif MapLibre (`cluster: true` sur la source) au-delà de 200 markers  
**Alternative écartée** : `supercluster` JS  
**Raison** : MapLibre gère le clustering GPU-side (plus fluide), pas de dépendance supplémentaire, suffisant pour < 10k spots

### Cache conditions météo
**Choix** : `unstable_cache` Next.js avec TTL 1h dans un Server Component  
**Alternative écartée** : Edge Function Supabase avec `conditions_cache` table  
**Raison** : Open-Meteo est gratuit et sans quota strict, cache CDN Vercel suffit en v1, table `conditions_cache` prévue pour v2 quand volume > 1k requêtes/jour

### Sheet mobile
**Choix** : union discriminante dans le composant `Sheet` existant (Dialog mode / Drawer mode selon `snapPoints`)  
**Alternative écartée** : deux composants séparés `Sheet` et `BottomDrawer`  
**Raison** : API unifiée pour les consommateurs, migration transparente sans toucher aux callsites existants

### Routing carte
**Choix** : déplacement de `app/(marketing)/carte/` vers `app/(map)/carte/` avec layout dédié  
**Raison** : le layout marketing appliquait un footer et un padding qui cassaient le fullscreen `h-dvh`. Layout séparé = isolation propre

### CSS MapLibre
**Choix** : `import('maplibre-gl/dist/maplibre-gl.css')` dynamique dans `useEffect`  
**Raison** : impossible d'importer du CSS dans un Server Component. L'import dynamique dans le client component est intercepté par Webpack et injecté dans le head au premier render client

### `char(3)` department
**Bug découvert** : PostgreSQL `char(3)` padde `'29'` → `'29 '`. Tous les lookups `DEPARTMENT_LABELS[dept]` retournaient `undefined`.  
**Fix systématique** : `.trim()` appliqué à chaque lecture de `spot.department` (fiche spot, OG route, groupByDepartment)

---

## F. Flaggé pour plus tard

| Item | Sprint cible | Note |
|---|---|---|
| Scoring 0-100 personnalisé | Sprint 7 | Overlay "ton score" sur les conditions, basé sur historique catches |
| Solunar "Meilleurs moments" | Sprint 6 | `suncalc`, fenêtres optimales par jour/spot, badges qualitatifs |
| Stripe gating subscriptions | Sprint 9 | Actuellement, tier = insert manuel en DB. Stripe Checkout + webhooks à venir |
| Mode hors ligne mobile | Sprint 12+ | Cache tuiles MapLibre + marées 7 jours en localStorage/IndexedDB |
| Polices dans les OG images | Backlog | `woff2` bunny.net incompatible avec satori. Nécessite TTF local dans `public/fonts/` |
| ESLint config | Backlog | ESLint 10 + FlatCompat + `eslint-config-next` v16 : référence circulaire. Migrer vers flat config native Next.js 15 |
| Optimisation `char(3)` → `varchar` | Backlog | Envisager migration schéma pour éviter le padding silencieux |
| Test iOS Safari | Sprint 11 beta | Sheet snap points non testés sur device physique — potentiel bug `-webkit-overflow-scrolling` |
| Test Edge / Firefox | Sprint 11 beta | MapLibre WebGL testé Chrome/Safari uniquement |
| Geoloc HTTPS only | Connu | `navigator.geolocation` indisponible sur HTTP (localhost OK, prod OK, HTTP custom domain KO) |

---

## G. Métriques

### Bundles First Load JS (build production)

| Route | First Load JS | Cible | Statut |
|---|---|---|---|
| `/` | 108 kB | — | ✅ |
| `/carte` | **218 kB** | < 250 kB | ✅ |
| `/spots` | **107 kB** | < 200 kB | ✅ excellent |
| `/spots/[slug]` | **216 kB** | < 280 kB | ✅ |
| `/carnet/nouvelle` | 172 kB | — | ✅ |
| Shared chunks | 103 kB | — | — |

Note : MapLibre (~500 kB minifié) est lazy-chargé dynamiquement (`import('maplibre-gl')` dans `useEffect`) — il n'apparaît pas dans le First Load JS, il est chargé uniquement quand la map s'initialise côté client.

### Lighthouse (à mesurer sur Vercel prod)
- `/spots/{slug}` SEO : à vérifier après deploy (OG + JSON-LD en place)
- `/carte` perf mobile : non mesuré (nécessite prod + Lighthouse CI)
- Objectif : SEO ≥ 95, Perf ≥ 70 mobile

### Temps de chargement
- Non mesuré en 3G simulé (à faire en sprint 11 avec Lighthouse CI)

---

## H. Tests skippés

| Test | Raison |
|---|---|
| Smoke test device physique iOS | Pas de device sous la main |
| Smoke test Android | Idem |
| Test Safari desktop | Testé uniquement Chrome/Edge (Windows) |
| Google Search Console soumission sitemap | GSC non configuré |
| Lighthouse CI automatisé | Non intégré (sprint 11) |
| Test 3G simulé `/carte` | Non mesuré |
| Test offline / Service Worker | Pas implémenté (sprint 12+) |
| Test avec 500+ spots en DB | Seed actuel = 10 spots. Clustering non testé avec vrai volume |
| Stripe webhooks | Paiements pas encore intégrés — tier fixé en DB manuellement |
| Test accessibilité screen reader | Sheet/Drawer `aria-label` en place mais non testé avec VoiceOver |
