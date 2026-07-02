# Sprint 4 — Carte intelligente + spots interactifs

> Brief découpé en **8 phases**. Chaque phase est un bloc copier-coller pour Claude Code (entre triples backticks). Donne-lui les phases dans l'ordre — chaque phase a ses propres commits et peut être validée + pushée avant la suivante.
>
> **Périmètre du sprint** : transformer `/carte` (actuellement page "coming soon") en vraie carte interactive MapLibre. Enrichir `/spots` et `/spots/[slug]` avec carte mini + tabs. Brancher la RPC `nearby_spots`. Gérer le freemium (carte basique pour gratuit, complète pour Local/Itinérant). Polir le mobile.
>
> **Pré-requis** : sprint 3.5 mergé et pushé (auth password + Google opérationnels). Quelques spots seed dans la DB (cf. `supabase/seed.sql` — si vide, je donne un bloc pour seeder).

---

## ▶ Phase 0 — Setup MapTiler + dépendances (15 min — fait par toi)

> **Budget** : 15-20 min
> **Difficulté** : easy
> **Pré-requis** : sprint 3.5 mergé, accès à Vercel Project Settings

### Partie 0A — Création du compte MapTiler

1. Crée un compte sur https://cloud.maptiler.com/auth/widget (gratuit jusqu'à 100k tiles/mois, largement suffisant pour le dev + early users).
2. Confirme l'email reçu.
3. Connecte-toi au dashboard.

### Partie 0B — Génération de la clé API

1. Va dans **Account → API keys → + New key**.
2. Nomme-la `Carnet de Pêche Web` pour la distinguer si tu en crées d'autres plus tard (mobile, staging, etc.).
3. **Restrictions HTTP referrer** (sécurité recommandée) : ajoute `http://localhost:3000/*`, `https://carnet-de-peche.vercel.app/*`, et `https://*.vercel.app/*` pour les previews. Sans ces restrictions, n'importe qui qui chope ta clé peut consommer ton quota.
4. Copie la clé (format alphanumérique ~20 caractères).

### Partie 0C — Configuration des env vars

1. Ouvre `.env.local` (à la racine du repo) et ajoute :
   ```
   NEXT_PUBLIC_MAPTILER_KEY=xxxXXXxxxXXXxxxXXX
   ```
2. Mets à jour `.env.example` (sans la valeur, juste le nom) — fichier committé qui sert de template.
3. Va sur Vercel → Project Settings → Environment Variables → Add :
   - Key : `NEXT_PUBLIC_MAPTILER_KEY`
   - Value : la clé MapTiler
   - Environments : coche Production + Preview + Development
4. Sauvegarde.

### Partie 0D — Vérification

1. Relance `pnpm dev` (les changements `.env.local` ne sont pas hot-reloadés).
2. Ouvre n'importe quelle page, console DevTools, tape :
   ```js
   console.log(process.env.NEXT_PUBLIC_MAPTILER_KEY)
   ```
   Tu dois voir ta clé.
3. Test minimal manuel (avant de lancer la phase 1) : dans un onglet, va sur `https://api.maptiler.com/maps/streets-v2/style.json?key=TA_CLE` — tu dois recevoir un JSON (pas une 401). Si 401, la clé est fausse ou les referrers sont trop restrictifs.

### Checkpoint pré-phase 1

Avant de coller le prompt de la phase 1 dans Claude Code, vérifie :
- [ ] La clé existe dans `.env.local`
- [ ] La clé existe dans Vercel (3 environnements)
- [ ] Le test JSON via curl/navigateur fonctionne
- [ ] Sprint 3.5 est bien sur `main` (sinon Claude Code va commiter sur une branche bizarre)

---

## ▶ Phase 1 — Carte publique interactive sur /carte

> **Budget Claude Code** : 1-2 jours
> **Difficulté** : medium (MapLibre nouvelle dans le projet, mais bien documenté)
> **Pré-requis** : phase 0 OK (clé MapTiler accessible)

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 du Carnet de Pêche. Actuellement /carte (app/(marketing)/carte/page.tsx) est une page marketing "coming soon" — pas de vraie carte. On va la remplacer par une vraie carte MapLibre GL JS interactive, qui sera la page principale du produit pour les visiteurs.

Objectif de cette phase : avoir une carte fonctionnelle qui affiche les spots publics, avec markers cliquables et popups minimalistes. Comportement adaptatif selon auth + abonnement :
- Anonyme / gratuit : 3 spots populaires par département max, coords floutées (utilise geom_public via la vue spots_for_viewer), pas de filtre, CTA register
- Local / Itinérant : on garde la version de base pour cette phase, on enrichira en phase 2

────────────────────────────────────────────────────────────────────────
PARTIE 1A — Dépendances + types Database (~30 min)
────────────────────────────────────────────────────────────────────────

1. Vérifier l'état actuel des deps :
   ```
   pnpm list maplibre-gl
   ```
   Si présent : skip. Sinon :
   ```
   pnpm add maplibre-gl
   pnpm add -D @types/maplibre-gl
   ```

2. Regénérer les types TypeScript depuis Supabase (au cas où le schema a évolué) :
   ```
   pnpm dlx supabase gen types typescript --project-id glgciwwnpmgifyhbvxsw > lib/types.ts
   ```
   Vérifie que `spots_for_viewer` et `nearby_spots` apparaissent bien dans les types générés. Si absent, c'est que la vue/RPC n'a pas été créée — alerte-moi.

3. Décision schema vs JS pour extraire les coords :
   - Supabase peut retourner les geom en GeoJSON natif si tu sélectionnes correctement : `select('geom_public, geom_precise')` avec PostGIS active devrait fonctionner. Vérifie le format réel renvoyé en testant un fetch.
   - Si Supabase retourne du WKB ou un format opaque : crée une RPC simple `spots_geojson()` qui retourne `ST_AsGeoJSON(geom)::json as geom`.
   - **Choisis la solution la plus simple** et documente ton choix dans un commentaire au sommet de `lib/map/utils.ts`.

────────────────────────────────────────────────────────────────────────
PARTIE 1B — Composant MapView (~3-4 h)
────────────────────────────────────────────────────────────────────────

4. Créer `components/map/MapView.tsx` (Client Component) :
   - "use client"
   - Props :
     ```ts
     type MapViewProps = {
       spots: SpotMarker[]
       initialCenter?: [number, number]  // [lng, lat]
       initialZoom?: number
       onMarkerClick?: (spot: SpotMarker) => void
       onMapReady?: (map: maplibregl.Map) => void  // pour permettre au parent d'interagir avec la map
       className?: string
       interactive?: boolean  // false pour fiche spot read-only
     }
     ```
   - Type SpotMarker :
     ```ts
     export type SpotMarker = {
       id: string
       slug: string
       name: string
       lng: number
       lat: number
       isPrecise: boolean  // true si abonné, false si flouté
       department: string
       species: string[]
       techniques: string[]
       difficulty: number
       structure?: string
     }
     ```
   - Référence DOM via useRef pour le container map (div)
   - useEffect d'initialisation :
     * `new maplibregl.Map({ container, style: STYLE_URL, center: initialCenter ?? [-2.5, 47.0], zoom: initialZoom ?? 6, attributionControl: true })`
     * STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
     * Validation : si la clé est absente, render un fallback (div gris + message "Carte indisponible") au lieu de planter
   - Ajout des markers une fois la map loaded :
     * Si `isPrecise` : marker net avec un élément HTML custom (icône MapPin teal-500, taille 28px, point au milieu)
     * Si `!isPrecise` : ajoute un GeoJSON layer Circle avec rayon ~1km (en map units), fill teal-500 opacity 0.2 + stroke teal-600. Ça représente visuellement le floutage. Plus du marker au centre.
   - Click handler : `marker.getElement().addEventListener('click', () => onMarkerClick?.(spot))`
   - Cleanup au unmount : `map.remove()` (sinon memory leak important avec MapLibre)
   - Resize observer : si le container change de taille, appelle `map.resize()` (utile pour les sheets/sidebars qui s'ouvrent/ferment)

5. Edge cases à gérer :
   - Liste de spots vide : carte rendue centrée sur la France, pas de crash
   - Clé MapTiler manquante : fallback gris + console.warn (pas console.error qui pollue Sentry plus tard)
   - WebGL non supporté (vieux navigateurs) : MapLibre throw une error — catch + affiche un message "Ton navigateur ne supporte pas la carte interactive"
   - Double-rendering en dev mode (React Strict Mode) : assure-toi que la map est bien cleanup avant re-init

6. Performance :
   - Limite max 200 markers affichés simultanément (clustering en phase 6, pour cette phase fais juste un slice si > 200)
   - Lazy load : `import('maplibre-gl/dist/maplibre-gl.css')` dans useEffect, pas dans le module top-level

────────────────────────────────────────────────────────────────────────
PARTIE 1C — Composant SpotPopup (~1-2 h)
────────────────────────────────────────────────────────────────────────

7. Créer `components/map/SpotPopup.tsx` (Client Component) :
   - Props :
     ```ts
     type SpotPopupProps = {
       spot: SpotMarker
       onClose: () => void
       userTier?: 'anonymous' | 'discovery' | 'local' | 'itinerant'
     }
     ```
   - Sur desktop : popup absolute en haut à droite de la map (largeur 320px, fond blanc, ombre, rounded-2xl), ou positionnée près du marker
   - Sur mobile : voir phase 6 pour le bottom sheet — pour cette phase, simple position fixed bottom-0 left-0 right-0 avec un drag handle visuel (drag réel en phase 6)
   - Contenu :
     * Header : nom du spot + bouton close (X)
     * Sous-titre : département + structure si dispo
     * Badges espèces (max 2 visibles + "+X" si plus) — palette teal pour positives
     * Badges techniques (idem, palette navy)
     * Si `!spot.isPrecise` : message gris discret "Coords précises réservées aux abonnés Local/Itinérant" + lien vers /tarifs
     * CTA "Voir le spot complet" → /spots/{slug} (bouton plein teal)
     * CTA secondaire "Itinéraire GPS" → `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` (deeplink, fonctionne mobile + desktop). Affiché seulement si `isPrecise`.

8. Accessibilité :
   - aria-label sur le bouton close
   - Focus trap dans la popup quand ouverte (utilise un hook ou la lib @base-ui)
   - Esc pour fermer
   - Focus retourné au marker au close

────────────────────────────────────────────────────────────────────────
PARTIE 1D — Refonte page /carte + layout (~3-4 h)
────────────────────────────────────────────────────────────────────────

9. Refonte de `app/(marketing)/carte/page.tsx` :
   - Server Component : auth (peut être null), fetch spots
   - Query : `supabase.from('spots_for_viewer').select('id, slug, name, department, geom_public, geom_precise, species, techniques, structure, difficulty')`
   - Pour anonyme : limite 3 spots par département en utilisant une window function SQL OU regroupement JS :
     ```sql
     -- Option SQL via une RPC : rank() over (partition by department order by created_at)
     -- Option JS plus simple : .reduce() pour grouper, prendre 3 par dept
     ```
     Choisis SQL si tu fais une RPC, sinon JS pour rester simple
   - Construit SpotMarker[] :
     * Pour anonyme : lng/lat = centroid de geom_public, isPrecise = false
     * Pour discovery/local/itinerant : on traite en phase 2, ici garde le comportement anonyme
   - Render layout :
     * `<MapShell>` (nouveau composant client) qui :
       - Gère l'état actif de la popup (useState)
       - Render `<MapView spots={spots} onMarkerClick={setActiveSpot} />`
       - Render `<SpotPopup spot={activeSpot} onClose={() => setActiveSpot(null)} />` si activeSpot
       - Render header collant en haut avec bouton "Me géolocaliser" (icône Navigation)
       - Render bandeau CTA en bas pour anonymes : "Crée ton carnet pour voir tous les spots" → /auth/register
   - Métadonnée SEO : garde l'existante mais améliore description (sera enrichie en phase 7)

10. Géolocalisation (bouton "Me géolocaliser") :
    - Au clic : `navigator.geolocation.getCurrentPosition(pos => map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 11, duration: 1500 }))`
    - Gère les erreurs : permission refusée (toast "Géolocalisation refusée. Active-la dans tes paramètres."), pas dispo (toast "Géolocalisation non disponible"), timeout (toast "Localisation trop lente, réessaie")
    - Visual feedback pendant le request : icône qui pulse

11. Adapter le layout `(marketing)` :
    - Vérifie `app/(marketing)/layout.tsx` — si le footer est imposé globalement, deux options :
      A. Refactor le layout pour qu'il ne render le footer que pour certaines routes (via children.props ou via segment)
      B. Sortir /carte du group (marketing) en le mettant à `app/carte/page.tsx` avec son propre layout
    - **Recommandé** : option A si possible (préserve la cohérence layout pour /spots, /guides, /tarifs)
    - Le header reste mais devient "collant transparent" sur /carte (background transparent qui devient opaque au scroll — mais en fait pas de scroll vu que la map est fullscreen, donc juste transparent fixe)

12. Helper `lib/map/utils.ts` :
    - `parseGeoJSONPoint(geom: unknown): [number, number] | null` — extrait [lng, lat] d'un GeoJSON Point retourné par Supabase. Si format inattendu, return null.
    - `parseGeoJSONPolygonCentroid(geom: unknown): [number, number] | null` — pour geom_public qui est un Polygon (zone floutée), retourne le centroïde
    - `COASTAL_DEFAULT_CENTER: [number, number] = [-2.5, 47.0]` (Bretagne, centre approximatif côtière France)
    - `COASTAL_DEFAULT_ZOOM = 6`

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

**Avant de commiter :**

1. `pnpm typecheck` → 0 erreur
2. `pnpm lint` → 0 erreur (ou warnings explicables)
3. `pnpm build` → succès. Note la taille du bundle First Load JS sur /carte (devrait être < 300 KB, sinon flag — MapLibre fait ~200 KB minifié)

**Tests fonctionnels (`pnpm dev`) :**

4. /carte non loggé :
   - La carte se charge, tiles MapTiler visibles (style streets-v2 propre, noms FR)
   - Aucun spot seedé en DB : message "Aucun spot disponible pour le moment" propre, pas de crash
   - Spots seedés : markers visibles MAX 3 par département (compte-les)
   - Markers en mode flouté (cercle teal + marker au centre)
   - Click sur un marker : popup s'ouvre, contenu correct
   - Click sur le X : popup ferme
   - Click sur CTA "Voir le spot complet" : nav vers /spots/{slug}
   - Click sur CTA register : nav vers /auth/register

5. Bouton "Me géolocaliser" :
   - Prompt navigateur s'affiche
   - Si accepté : carte se centre sur l'utilisateur en ~1.5s, marker user visible
   - Si refusé : toast d'erreur clair, carte reste où elle était

6. Edge cases console :
   - Aucune 401/403 sur les tiles
   - Aucune erreur WebGL
   - Aucune erreur React (Hydration mismatch, etc.)
   - Cleanup au navigate away (network tab : pas de requêtes tiles continuer après leave)

**Tests mobile (DevTools iPhone 14 Pro Max) :**

7. /carte mobile :
   - Map fullscreen, pas de scroll page parasite
   - Markers tappables (zone tap min 32px)
   - Popup s'affiche en bas (preview du bottom sheet de la phase 6)
   - Bouton géoloc visible et tappable

**Tests accessibilité :**

8. Navigation clavier :
   - Tab : focus visible sur les boutons header
   - Enter sur bouton géoloc : déclenche la géoloc
   - Tab dans la popup ouverte : ne sort pas du popup
   - Esc : ferme la popup

9. Lecteur d'écran (test rapide VoiceOver Mac ou NVDA Windows) :
   - Boutons annoncés correctement
   - Popup annoncée comme dialog modal

────────────────────────────────────────────────────────────────────────
COMMITS (séparés en conventional commits)
────────────────────────────────────────────────────────────────────────

- chore(deps): ajoute maplibre-gl + @types/maplibre-gl
- chore(types): régénère lib/types.ts depuis Supabase
- feat(map): composant MapView avec MapLibre GL JS + markers conditionnels
- feat(map): composant SpotPopup avec gating coord précises
- feat(map): helper lib/map/utils.ts pour parsing GeoJSON
- refactor(layout): permet de masquer le footer marketing sur /carte
- feat(carte): refonte /carte en vraie carte interactive publique
- feat(carte): bouton Me géolocaliser avec error handling

NE PUSH PAS. Préviens-moi quand c'est commité, je relirai.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Si tu hésites entre RPC SQL et regroupement JS pour la limite 3/dépt : choisis JS pour cette phase, on optimisera plus tard si perf insuffisante (sera mesurable seulement avec ~500+ spots en DB).
- Si MapLibre te pose des soucis de typing : utilise `// @ts-expect-error` ponctuellement avec un commentaire explicatif, mais évite de mettre du `any` partout.
- Si tu trouves un bug visuel sur Safari (MapLibre a parfois des comportements differents sur iOS Safari) : note-le sans le fixer, on traite en phase 6.
- Documente toute décision non-triviale dans un commentaire au-dessus de la fonction concernée (pourquoi tel choix, alternative considérée).

Si tu rencontres une question ouverte (ex: choix entre extraire les coords côté JS vs créer une RPC GeoJSON), choisis la solution la plus simple ET la plus performante pour le cas actuel, et explique-moi ta décision. On peut toujours refactor en phase 2.
```

---

## ▶ Phase 2 — Carte authentifiée premium (gating par abonnement)

> **Budget Claude Code** : 1 jour
> **Difficulté** : medium (logique tier + sécurité gating critique)
> **Pré-requis** : phase 1 mergée

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 phase 2 du Carnet de Pêche. Phase 1 a livré la carte publique /carte (3 spots/dépt, coords floutées). Maintenant on enrichit cette MÊME route pour les utilisateurs loggés :
- Free (Découverte) : pas de changement par rapport à anonyme — toujours 3 spots/dépt, floutés, message d'upsell
- Local (4.90€) : tous les spots du département principal de l'user (cf profile.department), coords précises (geom_precise), score placeholder
- Itinérant (9.90€) : tous les spots de tous les départements côtiers FR, coords précises, score

Les filtres viennent en phase 3, pas ici.

────────────────────────────────────────────────────────────────────────
PARTIE 2A — Logique de tier server-side (~2 h)
────────────────────────────────────────────────────────────────────────

1. Crée `lib/auth/tier.ts` :
   - Fonction `async function getUserTier(supabase): Promise<UserTier>` où UserTier = 'anonymous' | 'discovery' | 'local' | 'itinerant'
   - Logique :
     a. `supabase.auth.getUser()` — si pas de user : return 'anonymous'
     b. `supabase.rpc('has_active_subscription', { uid: user.id })` — si false ou erreur : return 'discovery'
     c. Si true : fetch `subscriptions.plan` actif (status='active', expires_at > now()) → return 'local' | 'itinerant' selon la valeur
     d. Fallback safe : 'discovery' si quoi que ce soit ne match
   - Cache via React `cache()` pour éviter de re-fetch dans la même requête
   - Type `UserTier` exporté

2. Hook helper `lib/auth/use-tier.ts` (Client Component) :
   - `useTier()` qui lit le tier depuis le contexte (ou via une API route si besoin client-side)
   - Pour cette phase, suffit de passer le tier en prop depuis le Server Component. On verra plus tard si on a besoin d'un context provider.

3. Sécurité (critical) :
   - Le tier ne doit JAMAIS être trustée si elle vient du client. Le gating SE FAIT SERVER-SIDE via la vue `spots_for_viewer` qui retourne geom_precise=null si pas autorisé.
   - Si tu vois un endroit où tu retournes geom_precise au client sans passer par cette vue, alerte-moi.

────────────────────────────────────────────────────────────────────────
PARTIE 2B — Constants géo + centroides départements (~1 h)
────────────────────────────────────────────────────────────────────────

4. Crée `lib/geo/departments.ts` :
   - Export `COASTAL_DEPARTMENTS: readonly string[]` avec les codes :
     - Manche/Atlantique : 14 (Calvados), 17 (Charente-Maritime), 22 (Côtes-d'Armor), 29 (Finistère), 33 (Gironde), 35 (Ille-et-Vilaine), 40 (Landes), 44 (Loire-Atlantique), 50 (Manche), 56 (Morbihan), 59 (Nord), 62 (Pas-de-Calais), 64 (Pyrénées-Atlantiques), 76 (Seine-Maritime), 80 (Somme), 85 (Vendée)
     - Méditerranée : 06 (Alpes-Maritimes), 11 (Aude), 13 (Bouches-du-Rhône), 30 (Gard), 34 (Hérault), 66 (Pyrénées-Orientales), 83 (Var), 2A (Corse-du-Sud), 2B (Haute-Corse)
   - Export `DEPARTMENT_LABELS: Record<string, string>` (ex: { '29': 'Finistère', ... })

5. Crée `lib/geo/department-centroids.ts` :
   - Export `DEPARTMENT_CENTROIDS: Record<string, [number, number]>` (lng, lat) pour les 25 dépts côtiers
   - Coordonnées approximatives (centre géographique du département) — pas besoin d'IGN, des coords moyennes suffisent
   - Exemples : '29': [-4.0, 48.4] (Finistère), '83': [6.1, 43.4] (Var), etc.
   - Fonction `getCenterForDepartment(code: string, fallback = COASTAL_DEFAULT_CENTER): [number, number]`

────────────────────────────────────────────────────────────────────────
PARTIE 2C — Fetch adapté + injection dans MapView (~2 h)
────────────────────────────────────────────────────────────────────────

6. Refonte de `app/(marketing)/carte/page.tsx` (Server Component) :
   - `const tier = await getUserTier(supabase)`
   - `const profile = tier !== 'anonymous' ? await fetchProfile(user.id) : null`
   - Centre initial map :
     * tier === 'anonymous' || pas de profile.department : `COASTAL_DEFAULT_CENTER`
     * Sinon : `getCenterForDepartment(profile.department)`
   - Fetch spots selon le tier :
     ```ts
     switch (tier) {
       case 'anonymous':
       case 'discovery':
         // 3 spots populaires (verified=true OU created_at récent) par dépt
         // SELECT id, slug, name, department, geom_public, species, techniques, structure, difficulty
         // ORDER BY department, created_at DESC LIMIT_BY_DEPT(3)
         // geom_precise NON sélectionné
         break
       case 'local':
         // Tous les spots du dept = profile.department
         // SELECT ... + geom_precise (la vue retourne précis pour cet user)
         break
       case 'itinerant':
         // Tous les spots où department IN COASTAL_DEPARTMENTS
         // SELECT ... + geom_precise
         break
     }
     ```
   - Construit SpotMarker[] :
     * Si geom_precise présent : use it as { lng, lat }, isPrecise = true
     * Sinon : centroid de geom_public, isPrecise = false

7. Passage des données au MapShell :
   - Props : `spots, initialCenter, initialZoom, tier`
   - Le MapShell render :
     * `<MapView ... />`
     * `<SpotPopup tier={tier} ... />` (enrichi en partie 2D)
     * `<UpsellBanner />` si tier === 'discovery' (partie 2D)

────────────────────────────────────────────────────────────────────────
PARTIE 2D — SpotPopup enrichi + bandeau upsell (~2 h)
────────────────────────────────────────────────────────────────────────

8. Enrichir `components/map/SpotPopup.tsx` :
   - Tient compte de la prop `userTier` introduite en phase 1
   - Sections additionnelles affichées si tier === 'local' || 'itinerant' :
     * Difficulté (badge avec stars 1-5)
     * Structure (badge avec icône appropriée : pointe rocheuse 🪨, plage 🏖️, digue 🧱, estuaire 🌊, cale ⚓, falaise 🗻)
     * Top 3 espèces (badges teal)
     * Placeholder "Score : —" (gris, tooltip "Disponible en sprint 7 — calibrage en cours" — sprint 7 = scoring perso dans CLAUDE.md)
     * CTA "Itinéraire GPS" enabled (deeplink Google Maps) — précis maintenant
   - CTA "Logger une prise ici" → `/carnet/nouvelle?spot_id={id}` (le préremplissage form sera en phase 4)
   - Section gating (si tier === 'anonymous' || 'discovery') :
     * Message gris discret : "Coords précises et fiche complète réservées aux abonnés Local"
     * Lien `/tarifs`

9. Composant `components/map/UpsellBanner.tsx` :
   - Client component, position : `fixed bottom-0 left-0 right-0 z-40`
   - Background : navy-900 avec léger teal-500 accent
   - Text : "Tu vois 3 spots par département. Passe en **Local** (4,90 €/mois) pour la carte complète, les filtres et le score."
   - CTA "Voir les tarifs" → `/tarifs` (bouton plein teal)
   - Bouton close (X) qui set un cookie `upsell-dismissed-at` pour ne pas re-afficher pendant 7 jours
   - Animation : slide-up à l'arrivée (~300ms ease-out)

10. État dismissed côté serveur :
    - Lis le cookie `upsell-dismissed-at` dans le Server Component
    - Si < 7 jours : ne render PAS UpsellBanner
    - Si > 7 jours OU absent : render

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

**Setup test : créer 3 comptes test**

1. test-anonymous : non loggé
2. test-discovery@... : signup standard, aucune row dans subscriptions
3. test-local@... : signup + insert manuel en SQL :
   ```sql
   INSERT INTO subscriptions (user_id, plan, status, current_period_end)
   VALUES ('USER_UUID', 'local', 'active', now() + interval '30 days');
   ```
4. test-itinerant@... : idem avec plan='itinerant'

**Tests fonctionnels**

5. test-anonymous → /carte : 3 spots/dépt floutés, pas de bandeau upsell (pas connecté, pas la cible discovery), CTA register visible
6. test-discovery → /carte : 3 spots/dépt floutés + bandeau upsell affiché, popup limite si click marker
7. test-local → /carte : tous les spots du dépt du profile, coords précises (markers nets), popup enrichie avec difficulté/structure/espèces
8. test-itinerant → /carte : tous les spots de TOUS les dépts côtiers, coords précises
9. Centre initial : test-local sur profile.department='29' → map centrée sur Finistère au load (pas Bretagne générique)
10. Bouton close upsell : disparaît + cookie set → reload page → toujours masqué

**Test sécurité critical (LEAK CHECK)**

11. Loggé en test-discovery, ouvre DevTools Network → recharge /carte → inspecte la response Supabase (filter "supabase" dans Network) :
    - geom_precise DOIT être null pour TOUS les spots
    - Aucune row de la table `spots` brute ne doit apparaître (seulement la vue spots_for_viewer)
12. Si tu trouves un leak : ne pas commiter, alerter John, on patch ensemble.

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(auth): helper getUserTier + lib/auth/tier.ts
- feat(geo): COASTAL_DEPARTMENTS + DEPARTMENT_CENTROIDS dans lib/geo/
- feat(carte): fetch spots adapté au tier de l'user
- feat(carte): centrage initial sur le département de l'user
- feat(map): SpotPopup enrichi pour abonnés Local/Itinérant
- feat(carte): UpsellBanner pour utilisateurs Découverte + dismiss persistent

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Tier 'itinerant' avec tous les dépts côtiers peut renvoyer beaucoup de spots si la DB est bien fournie. Pour cette phase, contente-toi d'un LIMIT 500. Le clustering vient phase 6.
- Le score 0-100 est un placeholder visible "—" (em-dash en attendant le scoring sprint 7). N'invente pas un score random.
- Si tu remarques que la DB n'a aucun spot (seed.sql vide), pause-toi et alerte John pour qu'il seede avant qu'on continue.

---

## ▶ Phase 3 — Filtres avancés (espèces + techniques + département)

> **Budget Claude Code** : 1 jour
> **Difficulté** : medium (sync URL + état + gating)
> **Pré-requis** : phase 2 mergée

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 phase 3. Phases 1+2 livrées. Maintenant on ajoute les filtres sur /carte pour les utilisateurs abonnés Local/Itinérant. Les filtres pilotent l'affichage des markers en temps réel.

────────────────────────────────────────────────────────────────────────
PARTIE 3A — Schéma de filtres + helpers parsing (~1 h)
────────────────────────────────────────────────────────────────────────

1. Crée `lib/spots/filters-schema.ts` :
   ```ts
   import { z } from 'zod'
   import { catchSpeciesEnum, catchTechniqueEnum } from '@/lib/catches/schema'
   
   export const spotFiltersSchema = z.object({
     species: z.array(catchSpeciesEnum).optional(),
     techniques: z.array(catchTechniqueEnum).optional(),
     department: z.string().regex(/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB])$/).optional(),
     structure: z.enum(['pointe_rocheuse', 'plage', 'digue', 'estuaire', 'cale', 'falaise']).optional(),
     difficulty: z.coerce.number().int().min(1).max(5).optional(),
   })
   
   export type SpotFilters = z.infer<typeof spotFiltersSchema>
   ```

2. Helpers `lib/spots/filter-url.ts` :
   - `parseFiltersFromSearchParams(params: URLSearchParams | Record<string, ...>): SpotFilters` — parse + valide via zod, ignore les invalides silencieusement
   - `serializeFiltersToSearchParams(filters: SpotFilters): URLSearchParams` — pour reconstruire l'URL
   - `hasActiveFilters(filters: SpotFilters): boolean` — pour afficher le badge "N filtres actifs"
   - `countActiveFilters(filters: SpotFilters): number`

────────────────────────────────────────────────────────────────────────
PARTIE 3B — Composant MapFilters (~3 h)
────────────────────────────────────────────────────────────────────────

3. Crée `components/map/MapFilters.tsx` (Client Component) :
   - Props :
     ```ts
     type MapFiltersProps = {
       initialFilters: SpotFilters
       userTier: UserTier
       availableDepartments?: string[]  // pour Itinérant, list des dépts dispo
       userDepartment?: string  // pour Local, dépt figé
       onFiltersChange?: (filters: SpotFilters) => void  // callback optionnel
       layout?: 'sidebar' | 'sheet'  // adapt UI selon position
     }
     ```
   - État local synchronisé avec l'URL :
     - useState pour l'état UI immédiat (instant feedback au clic)
     - useEffect qui déclenche `router.replace('?species=bar&...', { scroll: false })` après 300ms de debounce (évite spam de nav au double-click)
   - 4 sections de filtres :
     a. **Espèces** (multi-select) : 6 chips toggleables (bar, dorade royale, lieu jaune, maquereau, sar, orphie). Layout grid 3x2 mobile, ligne unique desktop.
     b. **Techniques** (multi-select) : 4 chips (leurres, surfcasting, flottante, vif). Grid 2x2 mobile, ligne unique desktop.
     c. **Structure** (single-select, optionnel) : dropdown 6 options
     d. **Département** :
        - Si userTier === 'local' : input disabled affichant userDepartment, message "Disponible avec Itinérant pour changer"
        - Si userTier === 'itinerant' : dropdown listant les dépts qui ont au moins un spot
        - Si discovery/anonymous : section entièrement disabled
   - **Difficulté** (single, 1-5) : optionnel, ne pas mettre par défaut
   - Footer du panel :
     * Bouton "Réinitialiser" (variant ghost, clear tous les filtres → URL clean)
     * Compteur "X spots correspondent" (live, server-side count via API route ou estimé client-side)
     * Bouton "Appliquer" sur mobile (sheet) pour fermer le sheet après sélection

4. Gating UX pour Discovery/Anonymous :
   - Tout le panel filtre est rendu mais avec :
     * `pointer-events: none` sur les inputs
     * `opacity-50`
     * Tooltip au hover : "Filtres disponibles avec Local ou Itinérant"
     * Bouton CTA "Débloquer les filtres" en haut → /tarifs

────────────────────────────────────────────────────────────────────────
PARTIE 3C — Intégration UI sur /carte (~1-2 h)
────────────────────────────────────────────────────────────────────────

5. Layout `/carte` :
   - **Desktop** (≥ 1024px) : MapFilters en sidebar gauche, largeur 320px, scrollable, fond blanc, shadow. Map prend l'espace restant.
   - **Tablet** (768-1023px) : MapFilters en top bar collante sous le header, format horizontal compressé. Map fullscreen en dessous.
   - **Mobile** (< 768px) : FAB "Filtres" en haut à gauche (icône SlidersHorizontal Lucide) avec badge rond rouge "N" si filtres actifs. Tap ouvre un bottom sheet avec MapFilters dedans.

6. Bottom sheet pour mobile :
   - Utilise `components/ui/sheet.tsx` s'il existe, sinon crée-le sur base de @base-ui/react/dialog en mode bottom-aligned
   - Snap points : full-screen sur mobile (gère la safe area iOS)
   - Drag handle visible en haut
   - Bouton close X en haut à droite
   - Footer collant : compteur + bouton "Appliquer X filtres" (ferme le sheet)

────────────────────────────────────────────────────────────────────────
PARTIE 3D — Application des filtres côté server + persistance (~2 h)
────────────────────────────────────────────────────────────────────────

7. Server-side : `app/(marketing)/carte/page.tsx` lit les searchParams :
   - Parse via parseFiltersFromSearchParams
   - Si userTier === 'discovery' || 'anonymous' : IGNORE les filtres (sécurité — pas de bypass via URL)
   - Sinon, applique sur la query Supabase :
     * `.contains('species', filters.species)` si filters.species
     * `.contains('techniques', filters.techniques)` si filters.techniques
     * `.eq('department', filters.department)` si filters.department
     * `.eq('structure', filters.structure)` si filters.structure
     * `.eq('difficulty', filters.difficulty)` si filters.difficulty
   - Pour Itinérant : si pas de département choisi, filtre quand même sur COASTAL_DEPARTMENTS
   - Pour Local : department est toujours = profile.department, ne pas écouter le param URL

8. Persistance localStorage :
   - Au mount du MapFilters, si pas de filters dans URL : check `localStorage.getItem('carte:last-filters')` → restaure
   - À chaque change : `localStorage.setItem('carte:last-filters', JSON.stringify(filters))`
   - À chaque clear : `localStorage.removeItem('carte:last-filters')`
   - **Priorité au mount** : URL > localStorage > vide

9. Compteur "X spots correspondent" :
   - Server-side : la page calcule le count après application des filtres et le passe au MapShell comme prop
   - Client-side : le MapFilters affiche le count reçu (pas de fetch additionnel)
   - Si compte = 0 : message "Aucun spot ne correspond. Essaie d'élargir tes filtres." dans le sheet/sidebar

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

**Tests fonctionnels (loggé en test-local sur un dépt avec ≥ 5 spots)**

1. Sélectionne "bar" → URL devient `?species=bar`, markers se filtrent, count se met à jour
2. Ajoute "leurres" → URL `?species=bar&techniques=leurres`
3. Ajoute "dorade_royale" → URL `?species=bar,dorade_royale&techniques=leurres`
4. Recharge la page : filtres persistent, markers restent filtrés
5. Clique "Réinitialiser" : URL clean, tous les spots reviennent, localStorage cleared
6. Combine filters jusqu'à 0 résultat : message "Aucun spot ne correspond..." visible

**Test Itinérant (loggé en test-itinerant)**

7. Sélectionne le dropdown département → liste les dépts ayant des spots
8. Change dépt → markers actualisés, URL `?dept=83`

**Test gating (loggé en test-discovery)**

9. Le panel filtres est visible mais disabled (opacity 50%)
10. Tap sur un filter → no-op (pointer-events none)
11. Tooltip hover : message gating
12. CTA "Débloquer les filtres" → /tarifs

**Test sécurité (bypass URL)**

13. Loggé en test-discovery, manuellement va sur `/carte?species=bar&techniques=leurres`
14. Vérifie que les filtres NE sont PAS appliqués server-side (markers identiques à sans filtres). Si appliqués : alerte critique.

**Tests mobile (iPhone 14 Pro Max DevTools)**

15. FAB "Filtres" visible en haut à gauche, badge "0" non visible quand vide
16. Sélectionne 2 filtres → badge "2" apparaît
17. Tap FAB → bottom sheet glisse depuis le bas, drag handle visible
18. Tap "Appliquer" → sheet ferme, map réactive
19. Tap close X → sheet ferme sans valider (annule les changements depuis l'ouverture)

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(spots): schéma zod + helpers parsing des filtres
- feat(map): composant MapFilters multi-select avec gating
- feat(ui): composant Sheet (bottom sheet) si pas déjà présent
- feat(carte): intégration MapFilters dans le layout (sidebar/sheet)
- feat(carte): application server-side des filtres + sécurité bypass
- feat(carte): persistence localStorage avec priorité URL

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Si tu choisis le format URL `species=bar,dorade_royale` (CSV) vs `species=bar&species=dorade_royale` (repeated) : CSV plus court, repeated plus standard. Choisis CSV pour la lisibilité. Documente le choix.
- La librairie `nuqs` est une option pour la gestion URL state — si tu la trouves trop lourde à intégrer, fais à la main, c'est OK.
- Le debounce 300ms peut paraître arbitraire. C'est le sweet spot entre réactivité et anti-spam. Ajuste si tu sens que c'est inconfortable au test.

---

## ▶ Phase 4 — Fiches spots enrichies + données environnementales (Open-Meteo)

> **Phase la plus chargée du sprint** (~3-4 jours Claude Code). Si tu veux la fractionner, fais d'abord la partie 4A (refonte page + sections statiques), puis 4B (intégration Open-Meteo + tide chart + weather card), puis 4C (Edge Function + cache + /carnet?spot_id + SEO).
>
> **Justification de l'élargissement vs brief initial** : analyse concurrentielle (cf. CLAUDE.md section 1). spot-de-peche.com a déjà tout ça en prod (courbe marée 24h, météo complète, vagues, houle). Si on sort sans, on paraît squelettique. Le différenciateur (scoring personnalisé) viendra au sprint 7 — il faut d'abord matcher la baseline.

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 phase 4. La page /spots/[slug] existe déjà en version basique. On la transforme en fiche spot riche avec carte mini + marées 24h + météo complète + vagues, alimentée par Open-Meteo Marine (gratuit, sans clé API). On expose aussi le préremplissage du form carnet depuis un spot + le SEO local.

Pourquoi gros sprint : analyse concurrentielle (CLAUDE.md section 1 mise à jour) montre que spot-de-peche.com expose déjà tout ça. Mettre un placeholder "conditions sprint 7" nous ferait paraître squelettique au lancement. On rattrape la baseline en sprint 4. Le scoring personnalisé (sprint 7) sera notre vrai différenciateur.

────────────────────────────────────────────────────────────────────────
PARTIE 4A — Refonte de la fiche spot (~1 jour)
────────────────────────────────────────────────────────────────────────

1. Refonte de app/(marketing)/spots/[slug]/page.tsx en Server Component :
   - Fetch le spot via spots_for_viewer (retourne geom_precise + geom_public selon abonnement du user)
   - Fetch 5 dernières catches publiques sur ce spot via catches_for_viewer (.eq('spot_id', spot.id).eq('privacy', 'public').order('caught_at', desc).limit(5))
   - Fetch le count total de catches sur ce spot
   - Fetch les conditions du jour (cf. Partie 4B — appelle un helper fetchSpotConditions(spot.lat, spot.lng))

2. Layout sections (pas de tabs, scroll-based, mobile-first) :
   - Hero : nom + département + badge verified + difficulty stars (1-5) + structure badge
   - Carte mini (composant MapView read-only, height 280px, zoom 13 sur le spot, coord précise ou floutée selon tier)
   - Bouton "Itinéraire GPS" sous la carte mini : ouvre Google Maps avec destination (deeplink `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` — fonctionne mobile + desktop)
   - Section "Conditions du jour" (Partie 4B)
   - Section "Prises récentes" (5 catches publiques)
   - Section "Infos pratiques" : description, access_notes, hazards (warnings stylisés), espèces ciblées, techniques recommandées
   - CTA collant en bas : "Logger une prise ici" → /carnet/nouvelle?spot_id={id} (si loggé) ou /auth/login?next=... (si pas loggé)

3. Section "Prises récentes" :
   - Cards horizontalement scrollables sur mobile, grid 2-3 col sur desktop
   - Pour chaque catch : espèce (label) · taille (cm) · date relative (il y a 2 jours) · pseudo de l'user (sans lien profil pour l'instant — sprint 8)
   - Header de la section : "X prises loguées au total sur ce spot"
   - Si aucune catch : empty state "Sois le premier à loguer une prise ici" avec bouton CTA

────────────────────────────────────────────────────────────────────────
PARTIE 4B — Open-Meteo Marine + tide chart + weather card (~2 jours)
────────────────────────────────────────────────────────────────────────

NOTE : il existe peut-être déjà un fichier lib/conditions/openmeteo.ts (utilisé par le carnet pour auto-logger les conditions à la prise). Vérifie d'abord son contenu et réutilise/étend si pertinent.

4. Helper lib/conditions/spot-forecast.ts :
   - Fonction fetchSpotConditions(lat: number, lng: number, date?: Date) qui :
     a. Vérifie le cache Supabase (table conditions_cache déjà présente dans migration 001) — clé = (lat_arrondi_0.1, lng_arrondi_0.1, date) — TTL 1 heure
     b. Si miss : appelle Open-Meteo Marine API (https://marine-api.open-meteo.com/v1/marine?...) + Open-Meteo Forecast (https://api.open-meteo.com/v1/forecast?...) en parallèle
     c. Endpoints à appeler :
        * Marine API : sea_level_height_msl (toutes les heures sur 24h), wave_height, wave_direction, wave_period, swell_wave_height, swell_wave_period, ocean_current_velocity, sea_surface_temperature
        * Forecast API : temperature_2m, weather_code, wind_speed_10m, wind_direction_10m, precipitation, precipitation_probability, pressure_msl, cloud_cover, relative_humidity_2m
        * Daily Forecast : sunrise, sunset, weather_code (pour le titre), precipitation_sum
        * Paramètres communs : timezone=Europe/Paris, forecast_days=1 (pour cette phase ; les 7 jours viendront en sprint 6)
     d. Stocke en cache + retourne un objet structuré SpotConditions
   - Type SpotConditions :
     ```ts
     type SpotConditions = {
       fetchedAt: string  // ISO
       tide: {
         points: { hour: number; height_m: number }[]  // 24 entries, hour 0-23
         extrema: { time: string; height_m: number; type: 'high' | 'low' }[]  // 2-4 entries
         currentHeight_m: number
       }
       weather: {
         airTempMin_c: number
         airTempMax_c: number
         weatherCode: number   // WMO codes
         weatherLabel: string  // "Bruine modérée" — mapping en français
         windSpeed_kmh: number
         windDirection_deg: number
         windDirectionCardinal: string  // "SSO"
         precipitation_mm: number
         precipitationProbability_pct: number
         pressure_hpa: number
         cloudCover_pct: number
         humidity_pct: number
         waterTemp_c: number
       }
       waves: {
         height_m: number
         direction_deg: number
         directionCardinal: string
         period_s: number
       }
       swell: {
         height_m: number
         period_s: number
       }
       astronomy: {
         sunrise: string  // "06:23"
         sunset: string   // "21:42"
       }
     }
     ```
   - Mapping weather_code → label français (utilise table OpenMeteo officielle, à intégrer dans lib/conditions/weather-codes.ts) :
     * 0 = "Ciel dégagé", 1-3 = "Peu nuageux/Partiellement nuageux/Couvert", 45-48 = "Brouillard", 51-55 = "Bruine faible/modérée/dense", 61-65 = "Pluie faible/modérée/forte", 71-77 = "Neige/Grésil", 80-82 = "Averses", 95-99 = "Orage"
   - Mapping direction degree → cardinal : N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSO, SO, OSO, O, ONO, NO, NNO

5. Composant client components/conditions/TideChart.tsx :
   - Props : points (24h tide data), extrema (high/low), currentHour
   - Renders une courbe SVG ou Recharts (déjà dans package.json mais sinon installe-le) :
     * Axe Y : hauteur en mètres (auto-scale selon min/max)
     * Axe X : 0h-24h
     * Courbe lissée bleue + remplissage dégradé bleu clair
     * Points marqués aux extrema (high : flèche ↑ + heure HH:MM + hauteur ; low : flèche ↓ idem)
     * Marqueur "Maintenant" (cercle orange) à la position currentHour
   - Toggle "Grille / Courbe" (state local) — Grille = table HTML avec heure / hauteur ; Courbe = le chart
   - Hauteur du composant : ~300px desktop, ~240px mobile

6. Composant components/conditions/WeatherGrid.tsx :
   - Props : weather (de SpotConditions)
   - Grid 2 colonnes sur mobile, 3-4 sur desktop
   - Cards : Météo (icône + label + temps min/max), Vent (vitesse + cardinal), Temp. eau, Précipitations (mm + %), Pression, Couverture nuageuse
   - Cards basées sur composants shadcn Card existants, icônes Lucide

7. Composant components/conditions/WavesCard.tsx :
   - Props : waves + swell (de SpotConditions)
   - Card unique : "Vagues 0.8 m · OSO · 5s" + "Houle 0.5 m · 8s"
   - Icône Waves de Lucide

8. Section "Conditions du jour" dans la fiche spot :
   - Header : "Conditions à [nom du spot] — [date du jour formatée]"
   - TideChart en premier (le plus visuellement marquant)
   - WeatherGrid en dessous
   - WavesCard à côté
   - En bas : timestamp "Mis à jour il y a X minutes" (depuis SpotConditions.fetchedAt)
   - Lien externe discret : "Météo radar" → https://www.windy.com/?{lat},{lng},10 (windy.com est plus complet pour radar)

────────────────────────────────────────────────────────────────────────
PARTIE 4C — /carnet?spot_id, SEO, Edge Function cache (~0.5 jour)
────────────────────────────────────────────────────────────────────────

9. /carnet/nouvelle : accepte ?spot_id=xxx :
   - Server-side : si présent, fetch le spot, pré-remplir location_method='spot', spot_id=xxx, latitude/longitude depuis spot.geom (utilise spots_for_viewer pour respecter le gating)
   - Affiche un bandeau en haut du form : "Tu logues une prise sur : [Nom du spot] · [Département]" + petit bouton "Changer de spot" qui clear le param (redirect /carnet/nouvelle sans spot_id)
   - La section Lieu du form passe en mode "spot" plutôt que "gps/manual" — affiche juste le nom du spot, pas de saisie coords

10. SEO sur /spots/[slug] :
    - generateMetadata : title = "Pêche à [Nom du spot] (Dépt XX) — [espèces principales] · Carnet de Pêche", description = 150-160 chars (combine description spot + espèces + structure)
    - JSON-LD Place injecté UNIQUEMENT si spot.visibility === 'public' :
      ```json
      {
        "@context": "https://schema.org",
        "@type": "Place",
        "name": "{spot.name}",
        "description": "{spot.description}",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": ...,  // arrondi à 2 décimales (~1 km) pour ne pas leaker
          "longitude": ...
        },
        "address": {
          "@type": "PostalAddress",
          "addressRegion": "{spot.region}",
          "addressCountry": "FR"
        }
      }
      ```

11. Edge Function Supabase pour cache server-side (optionnel mais propre) :
    - Si tu choisis de centraliser le fetch Open-Meteo dans une Edge Function (recommandé pour ne pas hit l'API 1 fois par visiteur) :
      * Crée supabase/functions/spot-conditions/index.ts
      * Reçoit { lat, lng, date }, vérifie cache, fetch Open-Meteo si miss, stocke en conditions_cache, retourne
      * Déploie via `supabase functions deploy spot-conditions`
      * Le helper lib/conditions/spot-forecast.ts l'appelle au lieu d'Open-Meteo direct
    - Alternative simple : fetch côté Server Component avec `unstable_cache` ou revalidate Next.js (revalidate=3600). Moins propre mais plus rapide à mettre en place. Demande à John ce qu'il préfère si tu hésites.

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. /spots/[slug] non loggé : tout charge, carte mini avec zone floutée, conditions du jour visibles (marée + météo + vagues), bouton "Itinéraire GPS" fonctionnel (s'ouvre dans nouvel onglet sur Google Maps), CTA "Logger une prise" → /auth/login?next=...

2. Loggé en local sur un spot de ton dépt : carte mini avec marker précis, conditions identiques, CTA → /carnet/nouvelle?spot_id=xxx

3. Au clic CTA loggé : redirect vers /carnet/nouvelle?spot_id=xxx, bandeau "Tu logues une prise sur : X" visible, form pré-rempli location_method=spot

4. Tide chart :
   - Courbe lisible, axes corrects, deux pics et deux creux marqués
   - Marqueur "Maintenant" à la bonne position (l'heure actuelle dans la timezone Paris)
   - Toggle Grille / Courbe fonctionnel
   - Mobile : la courbe ne déborde pas, reste lisible

5. Weather Grid : toutes les données affichées, weather_code traduit en français (test avec un spot où il pleut + un où il fait beau)

6. Waves Card : hauteur + direction + période affichés

7. Vérifie que l'API Open-Meteo n'est PAS appelée à chaque page load (cache fonctionne). Avant : 1 visite = 1 appel. Après : 1 visite = 0 appel si cache valide.

8. View source d'un spot public : JSON-LD Place présent, coord arrondies (pas de leak coord précise).

9. /carnet/nouvelle?spot_id=xxx : form prérempli, bandeau visible, bouton "Changer de spot" fonctionne.

10. Edge case : spot avec lat/lng en Méditerranée vs Atlantique → vérifie que Open-Meteo Marine répond correctement pour les deux. Si pas de marine data dispo (lac, eau douce — pas notre cas v1 mais sait-on jamais) : message d'erreur propre, pas de crash.

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(spots): refonte fiche spot en sections (hero + carte mini + bouton itinéraire)
- feat(conditions): intégration Open-Meteo Marine + Forecast avec cache
- feat(conditions): composant TideChart 24h avec marqueur "Maintenant"
- feat(conditions): composant WeatherGrid + WavesCard
- feat(spots): section "Conditions du jour" sur fiche spot
- feat(carnet): /carnet/nouvelle accepte ?spot_id= pour préremplir le form
- feat(spots): JSON-LD Place pour SEO local
- feat(spots): bouton "Itinéraire GPS" deeplink Google Maps

NE PUSH PAS. Préviens-moi quand tout est commité, je relirai et on push ensemble.

Si tu rencontres un blocage Open-Meteo (rate limit, format de réponse différent de ce qui est documenté, timezone bizarre), arrête-toi et explique-moi avant de bricoler un workaround.
```

---

## ▶ Phase 5 — RPC nearby_spots + "Spots autour de moi"

> **Budget Claude Code** : 0.5-1 jour
> **Difficulté** : easy-medium (RPC + panel)
> **Pré-requis** : phases 1+2+3 mergées

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 phase 5. La RPC supabase nearby_spots existe déjà (cf. migration 004). On la branche dans l'UI.

Signature de la RPC :
  nearby_spots(lat, lng, radius_km=50, species_filter text[]=null, technique_filter text[]=null)
  returns : id, name, slug, department, distance_m, techniques, species, difficulty

────────────────────────────────────────────────────────────────────────
PARTIE 5A — Server Action / API route pour appeler la RPC (~1 h)
────────────────────────────────────────────────────────────────────────

1. Crée une Server Action `app/(marketing)/carte/actions.ts` :
   - "use server"
   - Function `findNearbySpots(input: { lat, lng, radius_km?, species?, techniques? }): Promise<NearbySpot[] | { error: string }>`
   - Valide input avec zod (lat ∈ [-90, 90], lng ∈ [-180, 180], radius_km ∈ [1, 200])
   - Appelle `supabase.rpc('nearby_spots', { lat, lng, radius_km: input.radius_km ?? 50, species_filter: input.species ?? null, technique_filter: input.techniques ?? null })`
   - Gère erreurs : log + return user-friendly message
   - Type NearbySpot :
     ```ts
     export type NearbySpot = {
       id: string
       slug: string
       name: string
       department: string
       distance_m: number
       techniques: string[]
       species: string[]
       difficulty: number
     }
     ```

2. Variante alternative (à choisir si tu préfères) : API route `app/api/spots/nearby/route.ts` (GET avec query params). Cela permet à un futur app mobile native de consommer le même endpoint. Choisis selon ce qui s'intègre le mieux avec le reste du codebase.

────────────────────────────────────────────────────────────────────────
PARTIE 5B — Composant NearbyPanel (~2 h)
────────────────────────────────────────────────────────────────────────

3. Crée `components/map/NearbyPanel.tsx` (Client Component) :
   - Props :
     ```ts
     type NearbyPanelProps = {
       results: NearbySpot[]
       userLocation: { lat: number; lng: number } | null
       userTier: UserTier
       isLoading: boolean
       error: string | null
       onResultClick?: (spot: NearbySpot) => void
       onClose: () => void
       layout: 'sidebar' | 'sheet'
     }
     ```
   - Header sticky :
     * Titre "Spots autour de toi" + nombre de résultats
     * Bouton close (X)
   - Body scrollable :
     * Si isLoading : skeleton cards (3-5 placeholders)
     * Si error : message d'erreur + bouton "Réessayer"
     * Si results.length === 0 : empty state "Aucun spot dans un rayon de 50 km. Essaie d'élargir tes filtres ou de zoomer ailleurs."
     * Sinon : liste de cards :
       - Nom du spot
       - Dépt + structure
       - Distance arrondie ("à 3,4 km" ou "à 12 km")
       - Top 3 badges espèces
       - Difficulté (stars)
       - Lien vers /spots/{slug} (toute la card cliquable)
   - Footer (si tier === 'discovery') :
     * Bandeau upsell : "Tu vois 5 spots max. Passe Local pour 20, Itinérant pour 50." → /tarifs

4. Tri des résultats :
   - Par défaut : distance croissante (la RPC le fait déjà mais double-check côté client)
   - Optionnel : toggle "Trier par : distance | difficulté | nombre d'espèces" si tu as le temps

────────────────────────────────────────────────────────────────────────
PARTIE 5C — Intégration UI : bouton + state management (~1-2 h)
────────────────────────────────────────────────────────────────────────

5. Sur /carte, ajoute un bouton "Spots autour de moi" :
   - Position : à côté du bouton "Me géolocaliser" (header ou FAB stack)
   - Icône Lucide Navigation
   - Au clic :
     a. Si pas de géoloc actuelle : déclenche `navigator.geolocation.getCurrentPosition`
     b. Une fois la position obtenue : appelle la Server Action `findNearbySpots`
     c. Ouvre le NearbyPanel avec isLoading=true
     d. Une fois résultat : isLoading=false, results=...

6. Highlight des nearby spots sur la map :
   - Quand le NearbyPanel est ouvert : sur le MapView, applique un style spécial aux markers correspondant aux nearby spots (cercle pulsé, couleur amber-500 au lieu de teal)
   - Pour les autres markers : reduce opacity à 50% pour focus visuel
   - Permet à l'utilisateur de visualiser les résultats sur la map en plus de la liste

7. Gating freemium côté CLIENT (en plus du server) :
   - Discovery / Anonymous : slice les results à 5 max + affiche bandeau upsell
   - Local : slice à 20 max
   - Itinerant : slice à 50 max
   - Le server-side : la RPC retourne TOUS les spots dans le rayon. Le slicing client est pour l'affichage. Pas de sécurité critique ici (les spots sont déjà filtrés par spots_for_viewer pour les coords précises).

────────────────────────────────────────────────────────────────────────
PARTIE 5D — Layout responsive (~30 min)
────────────────────────────────────────────────────────────────────────

8. Layout du NearbyPanel :
   - **Desktop** : sidebar droite, largeur 360px, hauteur full, fond blanc, shadow-lg
   - **Tablet** : remplace temporairement la sidebar gauche des filtres (les filtres deviennent un FAB pendant que le panel est ouvert)
   - **Mobile** : bottom sheet avec 3 snap points (20vh collapsed / 50vh half / 90vh full) — voir phase 6 pour le composant Sheet réutilisable

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

**Setup test : assure-toi d'avoir ≥ 10 spots dans la DB répartis sur 3+ dépts côtiers**

1. Loggé en test-local, dépt avec spots : clique "Spots autour de moi"
   - Prompt géoloc → accepte
   - Panel s'ouvre avec spinner ~1s
   - Liste apparaît, distances cohérentes (le plus proche en premier)
2. Click sur une card : nav vers /spots/{slug}
3. Combine avec filtre "bar" actif : seuls les spots avec bar dans species apparaissent
4. Refuse la géoloc : panel s'ouvre avec message d'erreur + bouton "Réessayer"
5. Pas de spot dans 50 km : empty state correct

**Gating**

6. Loggé en test-discovery : panel ouvre mais max 5 résultats + bandeau upsell visible
7. Loggé en test-itinerant : jusqu'à 50 résultats, pas de bandeau

**Mobile**

8. iPhone 14 Pro Max : bottom sheet glisse depuis le bas, drag-to-expand fonctionne
9. Swipe down sur le sheet : ferme proprement
10. Tap "Réessayer" après refus géoloc : re-prompt

**Performance**

11. Avec 50 résultats : pas de lag à l'ouverture du panel
12. Le highlight des markers sur la map se fait en < 200ms

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(carte): server action findNearbySpots avec validation zod
- feat(map): composant NearbyPanel avec skeleton + empty state + error
- feat(carte): intégration bouton "Spots autour de moi" + flux géoloc
- feat(map): highlight des nearby spots sur la map (markers amber pulsés)
- feat(carte): gating client-side nearby pour tier Découverte

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Le radius_km = 50 est un default. Si tu veux que ce soit user-controllable (slider 10-200 km), c'est nice-to-have mais pas requis. Documente la décision.
- Si la RPC `nearby_spots` retourne un format différent de ce qui est documenté (ex: la migration a été modifiée depuis CLAUDE.md), ajuste le type NearbySpot mais préviens-moi.
- Le bouton "Réessayer" après erreur doit déclencher la même action que le bouton initial — assure-toi qu'il ré-active la géoloc.

---

## ▶ Phase 6 — Mobile UX polish (carte fullscreen + bottom sheet)

> **Budget Claude Code** : 1-2 jours
> **Difficulté** : medium-hard (gestures + perf + a11y)
> **Pré-requis** : phases 1-5 mergées

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 phase 6. Tout est fonctionnel mais le mobile a besoin de polish. C'est la version "app-like" qu'on visera aussi en mobile natif au sprint 12+. Objectif : passer de "ça marche sur mobile" à "ça donne envie sur mobile".

────────────────────────────────────────────────────────────────────────
PARTIE 6A — Layout fullscreen + safe areas (~2 h)
────────────────────────────────────────────────────────────────────────

1. Adapter `app/(marketing)/carte/page.tsx` pour mobile :
   - Use `100dvh` (dynamic viewport height) au lieu de `100vh` pour gérer la barre URL iOS qui s'auto-hide
   - Safe areas iOS : padding-bottom = `env(safe-area-inset-bottom, 0px)` sur les éléments sticky bottom
   - Header mobile minimal (≤ 56px) : BackButton (composant existant) à gauche + titre "Carte" centré + bouton burger (icône SlidersHorizontal) à droite pour ouvrir le sheet filtres
   - PAS de header marketing complet sur mobile (déjà géré phase 1, vérifie)
   - Map occupe : `calc(100dvh - 56px - env(safe-area-inset-bottom, 0px))`

2. FAB stack en bas à droite (mobile uniquement) :
   - 2 boutons circulaires empilés verticalement (gap 12px) :
     a. "Me géolocaliser" (icône Locate Lucide)
     b. "Spots autour de moi" (icône Navigation Lucide)
   - Taille : 56px chacun (touch target confortable)
   - Background : white avec shadow-lg + bordure teal-500 sur hover/active
   - Position : `fixed bottom-6 right-4 z-30`, marge bottom respecte safe area

3. Validation visuelle :
   - Aucun scroll page parasite sur mobile (overflow hidden sur le body de /carte)
   - La map remplit l'espace, pas de bandes blanches en haut ou en bas
   - Test orientation portrait + landscape (la map réagit, FAB reste en bas)

────────────────────────────────────────────────────────────────────────
PARTIE 6B — Composant Sheet réutilisable (~3 h)
────────────────────────────────────────────────────────────────────────

4. Crée `components/ui/sheet.tsx` (si pas déjà là — phase 3 peut l'avoir créé) :
   - Base sur @base-ui/react/dialog (déjà en deps) avec mode bottom-aligned
   - API :
     ```ts
     <Sheet open={open} onOpenChange={setOpen}>
       <SheetContent
         side="bottom"
         snapPoints={['20vh', '50vh', '90vh']}  // ou single height
         defaultSnap={1}
         dragHandle={true}
       >
         {/* contenu */}
       </SheetContent>
     </Sheet>
     ```
   - Drag-to-expand : utilise un événement touchmove + transform CSS, snap au snap point le plus proche au release
   - Backdrop : semi-transparent navy-900/20, tap dessus = ferme
   - Drag handle visible : barre grise rounded au top du sheet (4px x 40px)
   - Esc ou swipe-down sur le sheet = ferme

5. Animations :
   - Open : slide-up 300ms cubic-bezier(0.2, 0.8, 0.2, 1)
   - Close : slide-down 200ms cubic-bezier(0.4, 0, 0.6, 1)
   - Snap transitions : 200ms ease-out
   - Respect `prefers-reduced-motion` : skip animations si l'user a préféré

────────────────────────────────────────────────────────────────────────
PARTIE 6C — SpotPopup + NearbyPanel en bottom sheet mobile (~2 h)
────────────────────────────────────────────────────────────────────────

6. Refactor `components/map/SpotPopup.tsx` pour utiliser le Sheet sur mobile :
   - Desktop (≥ 768px) : reste en popup absolute (comme phase 1)
   - Mobile (< 768px) : utilise `<Sheet>` avec single snap '60vh' (pas de drag-to-expand pour la popup, juste open/close)
   - Détection : utilise un media query hook (`useMediaQuery('(min-width: 768px)')`) plutôt que de dupliquer le composant

7. Refactor `components/map/NearbyPanel.tsx` :
   - Desktop : sidebar droite (phase 5)
   - Mobile : `<Sheet>` avec 3 snap points (20vh collapsed = juste header + 1 card / 50vh half / 90vh full = scrollable)
   - Au load des résultats : auto-snap à 50vh
   - Drag vers le bas jusqu'à 20vh = "preview mode" pour voir la carte avec la liste visible

────────────────────────────────────────────────────────────────────────
PARTIE 6D — Feedback géolocalisation (~1 h)
────────────────────────────────────────────────────────────────────────

8. Feedback visuel au "Me géolocaliser" :
   - Bouton FAB pendant la requête : icône qui pulse (animation ping Tailwind ou custom keyframe) + opacité réduite
   - Disable le bouton pendant la requête (pas de double-tap)
   - Si succès : ajoute un marker bleu pulsé sur la position user (composant `<UserLocationMarker>` à créer dans map/) :
     * Cercle bleu plein 12px + cercle pulsant autour (40px, opacité réduite, animation ping infinite)
     * Reste affiché jusqu'à navigate away
   - Si erreur : toast (sonner déjà installé) avec message clair :
     * "Géolocalisation refusée. Active-la dans les paramètres de ton navigateur."
     * "Position introuvable. Réessaie dans un instant."
     * "Géolocalisation non supportée sur cet appareil."

9. Persistance position :
   - Stocke la dernière position user dans React state (pas localStorage — vie privée)
   - Si l'utilisateur change de page et revient : position perdue (intentionnel)
   - Si l'utilisateur clique "Spots autour de moi" après "Me géolocaliser" : utilise la position cachée, pas de re-prompt

────────────────────────────────────────────────────────────────────────
PARTIE 6E — Performance (~2 h)
────────────────────────────────────────────────────────────────────────

10. Lazy load MapView :
    - Dans `app/(marketing)/carte/page.tsx` ou MapShell : `const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false, loading: () => <MapSkeleton /> })`
    - Crée un `<MapSkeleton>` (gris uni + spinner centré) pour pendant le chargement
    - Cela évite que MapLibre (~200 KB) ne pèse sur le First Load JS

11. Clustering au-dessus de 200 markers :
    - MapLibre supporte le clustering natif via GeoJSON sources avec `cluster: true`
    - Configure :
      ```ts
      map.addSource('spots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [...] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })
      ```
    - Ajoute 2 layers : un pour les clusters (circle avec count en text), un pour les points individuels
    - Click sur cluster = zoom in
    - Click sur point = comportement habituel (popup)
    - Si < 200 markers : skip le clustering, garde l'approche markers HTML (meilleure UX pour la popup)

12. Préchargement tiles :
    - Au succès de géoloc, déclenche `map.flyTo(...)` qui charge automatiquement les tiles autour
    - Pour aller plus loin : preload manuel via `map.loadImage` ou prefetch des tiles (sprint 12+ mobile)

────────────────────────────────────────────────────────────────────────
PARTIE 6F — Accessibilité (~1 h)
────────────────────────────────────────────────────────────────────────

13. Toutes les interactions au clavier :
    - Tab : focus visible sur tous les boutons (header, FAB, filtres)
    - Enter : déclenche l'action
    - Esc : ferme popup/sheet
    - Flèches : pan la map (MapLibre le fait nativement)

14. aria-labels sur tous les boutons icon-only :
    - FAB "Me géolocaliser" : `aria-label="Centrer la carte sur ma position"`
    - FAB "Spots autour de moi" : `aria-label="Trouver les spots proches"`
    - Bouton close popup : `aria-label="Fermer le détail du spot"`
    - Markers : utilise `<button>` avec `aria-label="Spot : {nom du spot}"` (MapLibre Marker accepte un HTMLElement custom)

15. Focus management :
    - Au open de popup/sheet : focus auto sur le premier élément focusable
    - Au close : focus retourné au marker/bouton d'origine
    - Utilise un focus trap dans la popup ouverte (@base-ui le fait nativement)

16. Lecteur d'écran :
    - Test VoiceOver iOS : tape sur un marker → "Spot, Pointe du Raz, bouton" + au tap "Détail du spot ouvert"
    - Test NVDA Windows : navigation logique

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

**Visual (DevTools mode iPhone 14 Pro Max + iPad)**

1. /carte fullscreen, pas de scroll page parasite
2. Header 56px + 2 FAB en bas (56px chacun, espacés de 12px, bottom + safe area)
3. Orientation portrait / landscape : layout réactif
4. Pas de barre blanche en haut (URL bar iOS) ni en bas (safe area)

**Sheets**

5. Tap marker → SpotPopup glisse depuis le bas, occupe 60vh, drag handle visible
6. Swipe down sur le sheet → ferme proprement
7. Tap backdrop → ferme
8. Tap "Spots autour de moi" → NearbyPanel sheet à 50vh par défaut
9. Drag handle vers le haut → snap à 90vh (full)
10. Drag handle vers le bas → snap à 20vh (preview), drag encore → ferme

**Géolocalisation**

11. Tap "Me géolocaliser" → icône pulse, prompt système, marker bleu pulsé apparaît, map flyTo
12. Re-tap → re-déclenche le flyTo sur même position (cached)
13. Refus permission → toast d'erreur clair

**Performance**

14. Lighthouse mobile sur /carte → score perf ≥ 70, First Contentful Paint < 2s
15. Bundle First Load JS sur /carte ≤ 250 KB (sans MapLibre lazy)
16. Avec 200+ spots : clustering visible (cercles colorés avec nombre), tap = zoom in
17. Network throttling 3G : map utilisable en < 5s

**Accessibilité**

18. Navigation full au clavier (Tab → Enter → Esc) sur desktop : tous les états atteignables
19. VoiceOver mobile : annonces correctes (marker, popup, sheet)
20. `prefers-reduced-motion: reduce` (DevTools) : animations skipped

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(carte): layout mobile fullscreen + FAB stack + safe areas
- feat(ui): composant Sheet (bottom sheet) avec snap points
- refactor(map): SpotPopup et NearbyPanel utilisent Sheet sur mobile
- feat(map): UserLocationMarker bleu pulsé après géoloc
- feat(map): error handling géoloc avec toasts sonner
- perf(carte): lazy load MapView via dynamic import
- perf(map): clustering MapLibre natif au-dessus de 200 markers
- a11y(map): navigation clavier + aria-labels + focus management
- a11y(map): support prefers-reduced-motion

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Le drag-to-expand sur un bottom sheet est tricky à coder propre. Si c'est trop long, fais sans (single snap) — on l'ajoutera dans une itération future. Le drag handle seul + tap-to-close = déjà 80% du confort.
- MapLibre clustering avec markers HTML custom n'est pas trivial. Si tu galères, fait clustering avec layers natifs (cercles, pas HTML) et popups via mapboxgl.Popup natif au lieu de notre SpotPopup. Trade-off : moins joli mais perf garantie.
- Lighthouse score 70 sur mobile est ambitieux pour une page MapLibre. Si tu plafonnes à 60-65, c'est OK — la lazy load améliore, mais MapLibre + tiles externes restent lourds.
- iOS Safari a des bugs connus avec `100dvh` et les sheets — teste sur vrai Safari si possible, pas juste Chrome DevTools.

---

## ▶ Phase 7 — SEO programmatique (/spots index + sitemap)

> **Budget Claude Code** : 1 jour
> **Difficulté** : easy-medium (Next.js helpers natifs + générateur d'OG images)
> **Pré-requis** : phase 4 mergée (fiches spots existent)

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 phase 7. On a une vraie carte + des fiches spots détaillées avec données environnementales. Maintenant on optimise pour le SEO local : chaque spot doit être une page indexable + un sitemap propre + des OG images dynamiques. Le but est de capter le trafic SEO long-tail "pêche [espèce] [lieu]" qui est la principale source d'acquisition organique du domaine.

────────────────────────────────────────────────────────────────────────
PARTIE 7A — Refonte /spots index pour SEO (~2 h)
────────────────────────────────────────────────────────────────────────

1. Améliore `app/(marketing)/spots/page.tsx` :
   - Server Component pour SSR complet (déjà OK normalement)
   - Liste tous les spots PUBLICS (visibility = 'public'), pas de pagination en v1
   - **Si > 500 spots** : avertis John, on paginera (`/spots/page/2`) ou on splitera par dépt (`/spots/departement/29`)
   - Layout :
     * H1 : "Spots de pêche à la canne du bord en France"
     * Intro 2-3 lignes (SEO juice)
     * Filtres en haut (server-side via searchParams ; pas le composant client MapFilters, version simplifiée HTML form)
     * Sections H2 par département groupées (avec le nom complet du dépt)
     * Pour chaque spot : Link vers /spots/{slug}, badges espèces (top 3) + techniques (top 2), structure
   - Layout grid responsive : 1 col mobile / 2 cols tablet / 3 cols desktop

2. JSON-LD ItemList sur /spots :
   ```jsonld
   {
     "@context": "https://schema.org",
     "@type": "ItemList",
     "itemListElement": [
       {
         "@type": "ListItem",
         "position": 1,
         "url": "https://carnet-de-peche.vercel.app/spots/pointe-du-raz",
         "name": "Pointe du Raz"
       },
       // ...
     ]
   }
   ```

3. Filtre par dépt en URL (page server-side) :
   - `/spots?dept=29` filtre les spots affichés
   - Génère le H1 dynamique : "Spots de pêche dans le Finistère (29)"
   - Pareil pour `?species=bar` : H1 "Spots à bar en France"
   - Combinaisons : "Spots à bar dans le Finistère"

────────────────────────────────────────────────────────────────────────
PARTIE 7B — sitemap.xml + robots.txt (~1 h)
────────────────────────────────────────────────────────────────────────

4. Crée `app/sitemap.ts` (Next.js 15 supporte le default export typé) :
   ```ts
   import type { MetadataRoute } from 'next'
   import { createClient } from '@/lib/supabase/server'
   
   export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
     const supabase = await createClient()
     const baseUrl = 'https://carnet-de-peche.vercel.app'
     
     const staticPages: MetadataRoute.Sitemap = [
       { url: baseUrl, priority: 1.0, changeFrequency: 'weekly' },
       { url: `${baseUrl}/carte`, priority: 0.9, changeFrequency: 'daily' },
       { url: `${baseUrl}/spots`, priority: 0.9, changeFrequency: 'weekly' },
       { url: `${baseUrl}/tarifs`, priority: 0.8, changeFrequency: 'monthly' },
       { url: `${baseUrl}/guides`, priority: 0.8, changeFrequency: 'weekly' },
       { url: `${baseUrl}/auth/login`, priority: 0.5, changeFrequency: 'yearly' },
       { url: `${baseUrl}/auth/register`, priority: 0.7, changeFrequency: 'yearly' },
     ]
     
     // Spots publics
     const { data: spots } = await supabase
       .from('spots')
       .select('slug, updated_at, created_at')
       .eq('visibility', 'public')
     
     const spotPages: MetadataRoute.Sitemap = (spots ?? []).map(s => ({
       url: `${baseUrl}/spots/${s.slug}`,
       lastModified: new Date(s.updated_at ?? s.created_at),
       priority: 0.7,
       changeFrequency: 'monthly',
     }))
     
     // Guides MDX (énumère les fichiers du dossier docs/guides ou les routes existantes)
     const guideRoutes: MetadataRoute.Sitemap = [
       { url: `${baseUrl}/guides/peche-au-bar-au-leurre`, priority: 0.7, changeFrequency: 'monthly' },
       { url: `${baseUrl}/guides/peche-a-la-dorade-royale-au-surfcasting`, priority: 0.7, changeFrequency: 'monthly' },
       { url: `${baseUrl}/guides/les-meilleurs-spots-de-peche-en-bretagne`, priority: 0.7, changeFrequency: 'monthly' },
     ]
     
     return [...staticPages, ...spotPages, ...guideRoutes]
   }
   ```

5. Crée `app/robots.ts` :
   ```ts
   import type { MetadataRoute } from 'next'
   
   export default function robots(): MetadataRoute.Robots {
     return {
       rules: [
         {
           userAgent: '*',
           allow: ['/', '/carte', '/spots', '/tarifs', '/guides', '/auth/login', '/auth/register'],
           disallow: ['/api/', '/auth/callback', '/onboarding/', '/home', '/profil', '/carnet'],
         },
       ],
       sitemap: 'https://carnet-de-peche.vercel.app/sitemap.xml',
     }
   }
   ```

────────────────────────────────────────────────────────────────────────
PARTIE 7C — Metadata enrichies par spot (~1 h)
────────────────────────────────────────────────────────────────────────

6. Améliore `generateMetadata` sur `app/(marketing)/spots/[slug]/page.tsx` :
   ```ts
   export async function generateMetadata({ params }): Promise<Metadata> {
     const { slug } = await params
     const spot = await fetchSpot(slug)
     if (!spot) return { title: 'Spot introuvable' }
     
     const topSpecies = spot.species.slice(0, 3).map(s => SPECIES_LABELS[s]).join(', ')
     const structure = STRUCTURE_LABELS[spot.structure] ?? 'spot'
     
     return {
       title: `Pêche à ${spot.name} (${spot.department}) — ${topSpecies} · Carnet de Pêche`,
       description: `${structure} pour pêcher ${topSpecies} dans le ${DEPARTMENT_LABELS[spot.department]}. Conditions, marées et techniques recommandées.`,
       openGraph: {
         title: `${spot.name} — Spot de pêche ${structure}`,
         description: `${spot.description?.slice(0, 150)}...`,
         url: `https://carnet-de-peche.vercel.app/spots/${spot.slug}`,
         images: [{ url: `/og/spot/${spot.slug}`, width: 1200, height: 630 }],
         type: 'website',
       },
       twitter: {
         card: 'summary_large_image',
         title: spot.name,
         description: topSpecies,
         images: [`/og/spot/${spot.slug}`],
       },
       alternates: {
         canonical: `https://carnet-de-peche.vercel.app/spots/${spot.slug}`,
       },
     }
   }
   ```

7. JSON-LD Place (déjà mentionné en phase 4C, vérifie qu'il est bien inclus dans le rendering de /spots/[slug]) :
   - Type Place avec geo + address
   - Coords arrondies à 2 décimales si visibility !== 'public' OU si tier visitor !== local/itinerant

────────────────────────────────────────────────────────────────────────
PARTIE 7D — OG images dynamiques (~2 h)
────────────────────────────────────────────────────────────────────────

8. Crée `app/og/spot/[slug]/route.tsx` (Next.js OG Image API) :
   ```ts
   import { ImageResponse } from 'next/og'
   import { fetchSpot } from '@/lib/spots/queries'
   
   export const runtime = 'edge'
   
   export async function GET(_: Request, { params }: { params: { slug: string } }) {
     const spot = await fetchSpot(params.slug)
     if (!spot) return new Response('Not found', { status: 404 })
     
     return new ImageResponse(
       (
         <div style={{ /* layout: nom + département + espèces sur fond charte navy/teal */ }}>
           {/* Hero avec nom du spot en grand */}
           {/* Sous-ligne : département + structure */}
           {/* Footer : logo Carnet de Pêche + URL */}
         </div>
       ),
       { width: 1200, height: 630 }
     )
   }
   ```
   - Utilise les couleurs charte : navy-900 background + teal-500 accents
   - Format 1200x630 (standard OG)
   - Police : utilise une police web-safe ou load une font custom via `fetch` puis `fonts: [...]`

9. Si tu veux aller plus loin (optionnel) : OG dynamique pour /spots index aussi
   - `/og/spots` qui montre "X spots de pêche en France" + carte stylisée
   - Pas critique, fais-le si time permits

────────────────────────────────────────────────────────────────────────
TESTS À FAIRE
────────────────────────────────────────────────────────────────────────

1. Visite `/sitemap.xml` : XML bien formé, contient :
   - Pages statiques (7+)
   - Tous les spots publics
   - Tous les guides MDX existants
   - Lastmod cohérent

2. Visite `/robots.txt` : règles cohérentes, sitemap référencé

3. View source d'une `/spots/{slug}` :
   - `<title>` enrichi
   - `<meta name="description">` 150-160 chars
   - `<meta property="og:image">` pointe vers `/og/spot/{slug}`
   - `<link rel="canonical">` présent
   - JSON-LD Place dans `<script type="application/ld+json">`

4. Visite directe `/og/spot/{un-slug}` : image PNG s'affiche, format 1200x630, lisible

5. View source `/spots` :
   - JSON-LD ItemList présent
   - Filtres dynamiques fonctionnent (`?dept=29` → H1 change, liste filtrée)

6. Lighthouse SEO mobile sur :
   - https://carnet-de-peche.vercel.app/ → score ≥ 95
   - https://carnet-de-peche.vercel.app/carte → score ≥ 95
   - https://carnet-de-peche.vercel.app/spots/{slug} → score ≥ 95

7. Test partage social :
   - Copie une URL `/spots/{slug}` dans Slack, WhatsApp, Discord → preview avec OG image

8. Google Search Console (si déjà setup) : soumets le sitemap, vérifie qu'il est accepté

────────────────────────────────────────────────────────────────────────
COMMITS
────────────────────────────────────────────────────────────────────────

- feat(spots): index avec filtres SEO-friendly + JSON-LD ItemList
- feat(seo): app/sitemap.ts dynamique avec spots + guides
- feat(seo): app/robots.ts avec règles allow/disallow
- feat(spots): metadata enrichies (OG + Twitter + canonical)
- feat(seo): OG images dynamiques edge route /og/spot/[slug]

NE PUSH PAS.

────────────────────────────────────────────────────────────────────────
NOTES POUR TOI (CLAUDE CODE)
────────────────────────────────────────────────────────────────────────

- Pour les guides MDX, énumère-les en lisant le filesystem dans sitemap.ts (utilise `fs/promises` + glob sur `docs/guides/*.md`). Si ça pose souci en edge runtime, hardcode la liste pour cette phase et on automatisera plus tard.
- L'OG image edge route peut fail localement à cause de fonts manquantes. Si c'est le cas, utilise `fontFamily: 'sans-serif'` au lieu de loader une font custom. Le rendu sera moins joli mais fonctionnel.
- Si Vercel a un domaine custom (carnetdepeche.fr ou similaire) au moment du commit, mets-le à la place de carnet-de-peche.vercel.app dans toutes les URLs. Sinon laisse vercel.app.

---

## ▶ Phase 8 — Tests E2E + récap + push final

> **Budget Claude Code** : 0.5 jour
> **Difficulté** : easy (consolidation)
> **Pré-requis** : phases 1-7 toutes mergées localement, ZÉRO commit pushé

**Copie-colle dans Claude Code :**

```
Contexte : sprint 4 phase 8 — finale. Toutes les phases 1-7 sont commitées en local. Maintenant on consolide, on teste à fond, on push.

────────────────────────────────────────────────────────────────────────
PARTIE 8A — Vérifications automatisées (~30 min)
────────────────────────────────────────────────────────────────────────

1. `pnpm typecheck` → 0 erreur
   - Si erreur : corrige avant de continuer, ne push pas avec une regression TS

2. `pnpm lint` → 0 erreur (warnings tolérables, document chaque warning notable)
   - Avec `pnpm lint --fix` si tu peux auto-fixer

3. `pnpm build` → succès complet
   - Note la taille des bundles First Load JS par route (Next.js affiche un tableau à la fin)
   - Cibles :
     * /carte : < 250 KB (sans MapLibre lazy)
     * /spots : < 200 KB
     * /spots/[slug] : < 280 KB (inclut TideChart + recharts si utilisé)
   - Si dépassement de 20%+ : flag et explique pourquoi

4. Si Vitest est configuré : `pnpm test` → tests passent
   - Sinon : skip cette étape

────────────────────────────────────────────────────────────────────────
PARTIE 8B — Smoke test manuel structuré (~1-2 h)
────────────────────────────────────────────────────────────────────────

5. Setup test :
   - Lance `pnpm dev`
   - Ouvre 4 fenêtres / sessions browser :
     a. Incognito (anonyme)
     b. test-discovery@... loggé
     c. test-local@... loggé (subscription manuelle en DB)
     d. test-itinerant@... loggé
   - Mode mobile (DevTools iPhone 14 Pro Max) sur au moins 2 d'entre elles

6. Scénario A — Visiteur anonyme :
   - / homepage → CTAs visibles
   - /carte → carte avec 3 spots/dépt floutés, popup au tap, CTA register
   - /spots → liste groupée par dépt
   - /spots/{un-slug} → fiche avec conditions du jour (météo + marée + vagues), pas de CTA logger (redirect login)
   - /auth/login → fonctionne (régression check)

7. Scénario B — Discovery loggé :
   - /carte → 3 spots/dépt + bandeau upsell visible
   - Tap filtre → tooltip "Filtres dispo avec Local"
   - Tap "Spots autour de moi" → max 5 résultats + bandeau upsell
   - /spots/{slug} → conditions visibles, CTA "Logger une prise" → /carnet/nouvelle?spot_id=xxx
   - /carnet/nouvelle?spot_id=xxx → form prérempli, bandeau spot visible

8. Scénario C — Local loggé :
   - /carte → tous les spots du dépt, coords précises, filtres actifs
   - Filtre "bar" + "leurres" → URL update, count update, markers filtrés
   - "Spots autour de moi" → jusqu'à 20 résultats
   - Refresh : filtres persistent (URL + localStorage)
   - /spots/{slug} → carte mini précise + conditions

9. Scénario D — Itinérant loggé :
   - /carte → spots de TOUS les dépts côtiers, dropdown dépt actif
   - Change dépt → markers réactualisés
   - "Spots autour de moi" → jusqu'à 50 résultats

10. Mobile (scénarios C et D en mobile) :
    - Map fullscreen, FAB stack en bas
    - Sheet filtres glisse depuis le bas
    - Sheet nearby avec 3 snap points
    - Drag handle réactif

11. SEO + Sitemap :
    - http://localhost:3000/sitemap.xml → XML valide, spots publics listés
    - http://localhost:3000/robots.txt → règles correctes
    - View source d'un spot : JSON-LD Place + meta OG
    - http://localhost:3000/og/spot/{slug} → image PNG s'affiche

12. Régressions sur le reste du site :
    - /carnet (mode loggé) : form OK, pas de régression sprint 3
    - /carnet/nouvelle : flèche retour mobile OK, bug fix technique → reset toujours OK
    - /profil : OK
    - /auth/login : password + Google + magic link toujours fonctionnels

────────────────────────────────────────────────────────────────────────
PARTIE 8C — Récap structuré pour John (~30 min)
────────────────────────────────────────────────────────────────────────

13. Génère un fichier `docs/sprint-4/RECAP.md` avec :

    **A. Fichiers créés**, organisés par catégorie :
    - components/map/ : MapView, SpotPopup, MapFilters, NearbyPanel, UserLocationMarker, MapShell
    - components/conditions/ : TideChart, WeatherGrid, WavesCard
    - components/ui/ : Sheet (si créé)
    - lib/geo/ : departments, department-centroids
    - lib/spots/ : filters-schema, filter-url, queries (si refactoré)
    - lib/conditions/ : spot-forecast, weather-codes (si pas déjà là)
    - lib/auth/ : tier
    - lib/map/ : utils
    - app/ : sitemap.ts, robots.ts, og/spot/[slug]/route.tsx
    - app/(marketing)/carte/actions.ts
    - Migrations SQL si applicable

    **B. Fichiers modifiés** :
    - app/(marketing)/carte/page.tsx (refonte complète)
    - app/(marketing)/spots/page.tsx (refonte SEO)
    - app/(marketing)/spots/[slug]/page.tsx (refonte conditions)
    - app/(app)/carnet/nouvelle/page.tsx (support spot_id)
    - app/(marketing)/layout.tsx (masquage footer)

    **C. Packages ajoutés** :
    - maplibre-gl + @types/maplibre-gl
    - (autres si besoin : recharts, supercluster, nuqs...)

    **D. Migrations DB** :
    - Aucune (si confirmé) OU liste des nouvelles migrations

    **E. Décisions notables prises seul** :
    - Choix CSV vs repeated dans l'URL des filtres
    - Choix GeoJSON RPC vs extraction JS
    - Choix clustering MapLibre natif vs supercluster
    - Choix Edge Function vs unstable_cache pour Open-Meteo
    - Liste exhaustive des décisions avec leur justification

    **F. Trucs flaggés pour plus tard** :
    - Scoring 0-100 personnalisé (sprint 7)
    - Solunar "Meilleurs moments" (sprint 6)
    - Stripe pour vraie gating subscription (sprint 9)
    - Mode hors ligne mobile (sprint 12+)
    - Tout bug visuel iOS Safari ou Edge cases pas traités

    **G. Métriques**
    - Tailles bundles First Load JS par route
    - Lighthouse perf mobile sur /carte
    - Lighthouse SEO sur /spots/{slug}
    - Temps de chargement /carte sur 3G simulé

    **H. Tests skippés** :
    - Tests sur device physique iOS
    - Test Google Search Console (si pas setup)
    - Tout ce que tu n'as pas pu tester avec les outils dispo

────────────────────────────────────────────────────────────────────────
PARTIE 8D — Push + monitoring déploiement (~30 min)
────────────────────────────────────────────────────────────────────────

14. Affiche le récap à John, attends son OK explicite.

15. Si OK :
    ```
    git push origin main
    ```

16. Vercel auto-deploy → surveille :
    - Le déploiement réussit (pas d'erreur de build sur Vercel)
    - La preview / prod est accessible
    - Smoke test rapide sur l'URL Vercel (1 scénario par tier)
    - Vercel Analytics : pas d'error spike

17. Si rouge en prod :
    - Si critique : `vercel rollback` (ou via dashboard Vercel)
    - Si mineur : note + fix dans une PR séparée

────────────────────────────────────────────────────────────────────────
LIVRABLE FINAL
────────────────────────────────────────────────────────────────────────

- Le sprint 4 est sur main, déployé sur Vercel
- /carte est utilisable comme produit principal
- Les utilisateurs peuvent voir/filtrer/explorer/géolocaliser les spots selon leur tier
- Chaque spot a sa fiche avec conditions du jour (marée + météo + vagues)
- SEO programmatique opérationnel (sitemap, robots, OG, JSON-LD)
- Pas de régression sur carnet/auth/marketing
- Récap consigné dans docs/sprint-4/RECAP.md

Si quoi que ce soit n'est pas vert au smoke test : NE PUSH PAS, corrige d'abord et re-teste. Si tu doutes d'un choix de polish ou si une régression apparaît sur une feature antérieure : alerte-moi avant de bricoler un workaround.
```

---

## Notes pour John

### Budget temps cumulé

| Phase | Sujet | Budget Claude Code | Difficulté |
|---|---|---|---|
| 0 | Setup MapTiler | 15-20 min (toi) | easy |
| 1 | Carte publique | 1-2 jours | medium |
| 2 | Gating freemium | 1 jour | medium |
| 3 | Filtres avancés | 1 jour | medium |
| 4 | Fiches spots + Open-Meteo (4A+4B+4C) | 3-4 jours | medium-hard |
| 5 | Nearby spots RPC | 0.5-1 jour | easy-medium |
| 6 | Mobile UX polish | 1-2 jours | medium-hard |
| 7 | SEO programmatique | 1 jour | easy-medium |
| 8 | Final + push | 0.5 jour | easy |
| **TOTAL** | | **~9-13 jours** | |

Sprint 4 estimé à 2-3 semaines de travail Claude Code étalé. Si tu fais 3-4h de Claude Code par jour, compte 3 semaines calendrier. Adjusté en sprint 4 = S4-S5 dans CLAUDE.md à cause de l'élargissement.

### Décisions produit qui peuvent surgir pendant les sprints

- **Spots par dépt pour Discovery** : 3 (CLAUDE.md). Si tu veux 5 ou 2, dis-le maintenant.
- **Floutage** : 2 km (schema actuel) vs 1 km (CLAUDE.md original). Pour pas faire migration, j'ai gardé 2 km dans le brief. Ajuste si tu veux migrer.
- **Clustering threshold** : 200 markers. Ajuste si tu vois mieux après tests.
- **Départements côtiers** : 25 codes (métropole + Corse). DOM-TOM exclus (pas Réunion, pas Antilles). À toi de voir si tu veux étendre.
- **Score 0-100** : placeholder "—" (em-dash) dans toutes les UI où il apparaîtrait. Vraie implémentation = sprint 7 (scoring personnalisé, notre différenciateur).
- **Solunar "Meilleurs moments"** : pas dans ce sprint (sprint 6 dans roadmap révisée). Te ferai un brief dédié quand tu y arrives.

### Pré-requis avant chaque phase

- **Phase 0** : sprint 3.5 mergé et pushé. Compte test Outlook accessible (pour les tests authentifiés).
- **Phase 1** : phase 0 OK (clé MapTiler dans `.env.local` + Vercel).
- **Phase 2** : phase 1 OK. Spots seedés en DB (au moins 5-10 spots répartis sur quelques dépts côtiers — si vide, dis-moi je te génère un seed).
- **Phase 3** : phase 2 OK. Compte test-local avec subscription manuelle en DB.
- **Phase 4** : phase 1 OK (le composant MapView est nécessaire pour la carte mini). PAS besoin de phases 2-3 — peut se faire en parallèle si tu veux.
- **Phase 5** : phases 1-3 OK.
- **Phase 6** : phases 1-5 OK (sinon polish vide).
- **Phase 7** : phase 4 OK (sinon SEO sur des fiches squelettiques).
- **Phase 8** : phases 1-7 toutes commitées localement.

### Outils externes que tu dois configurer toi

- [x] **MapTiler** : clé API (phase 0)
- [ ] **Stripe** : pas dans ce sprint (sprint 9). Pour tester les tiers Local/Itinerant, Claude Code va te demander d'insérer une row subscriptions à la main en DB.
- [ ] **Google Search Console** : recommandé après push pour soumettre le sitemap. Pas critique, peut attendre.

### Workflow recommandé pour livrer le sprint

1. Tu fais la phase 0 (toi)
2. Tu colles le prompt phase 1 dans Claude Code. Il bosse, te ping quand commité local.
3. Tu relis les commits, fais un smoke test rapide, push si OK.
4. Tu enchaînes phase 2.
5. Etc.

**Ne pas attendre la fin du sprint pour push** — push à chaque phase mergée localement. Si une phase casse, la rollback est plus simple.

### Si une phase te paraît trop grosse ou floue

Ping-moi AVANT de la donner à Claude Code, on raffinera. Mieux vaut 30 min de discussion qu'un sprint qui part de travers.

Si Claude Code te dit "je dois faire un choix non documenté", il devrait s'arrêter et te demander. Si tu hésites, ping-moi avec sa question, je t'aide à trancher.
