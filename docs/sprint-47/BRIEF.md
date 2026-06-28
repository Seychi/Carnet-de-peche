# Sprint 47 — Brief d'exécution
## « Le partage viral » (photo du poisson + Wrapped + handle + thèmes + 1-tap + PR board · ~5-6 j)

> Rédigé le 2026-06-28. Enrichissement phare (roadmap `docs/ROADMAP-CORRECTIFS-ENRICHISSEMENTS-2026-06-28.md` §7). Le moteur de partage (sprint 38) est excellent mais **viral-faible sans le poisson** : on débloque la photo, on ajoute le « Wrapped », le handle, les thèmes, le 1-tap et un PR board.
> **Constats clés (re-vérifiés)** : `sharp` **est installé** → strip EXIF serveur possible (défense en profondeur). `getMyRecordsBySpecies()` + le composant `RecordsBySpecies` **existent déjà** (sprint 45) → le PR board les réutilise. Le moteur de partage (`shared_cards`, route OG, `useShareCard`, `ShareButton`, `ShareOptInDialog`, `/c/[slug]`) se réutilise en ajoutant des kinds.

**⚠️ État / coordination** : migrations à **077** ; **45 et 46 sont en cours** et n'ont pas encore posé leurs migrations (45 → records ; 46 → `gearbox` + gear photo/usure). **Confirmer le dernier numéro avant de créer** (47 démarre ~`080`+). **Le sprint 46 modifie `app/actions/share.ts` + `app/og/card/[slug]/route.tsx` (ajout kind `gearbox`)** → reconfirmer les ancres de ces 2 fichiers post-46 ; ici je donne les ancres **structurelles** (noms de fonctions, switch, CHECK) + les lignes exactes des fichiers stables.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-47/BRIEF.md`. **Confirme le dernier numéro de migration** et reconfirme les ancres `share.ts`/`route.tsx` (modifiées par le sprint 46). Réutilise le moteur de partage + `getMyRecordsBySpecies`. Invariants : **photo = opt-in explicite + strip EXIF serveur (sharp) + bucket public dédié** ; carte **toujours geom-free** (zéro spot/coord) ; `location_label` déjà sanitisé (sprint 44). Migrations numérotées, regen `lib/types.ts`. Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Strip EXIF serveur (sharp), copie privé→public Storage | **docs-researcher** → Context7 | API `sharp` (re-encode + suppression métadonnées) + Supabase Storage copy. |
| Migrations (bucket public, CHECK kind, pref profil), payloads | **supabase-guard** → Supabase (RO d'abord) | Confirmer numéros, bucket public, étendre le CHECK kind, regen types. |
| QA partage réel (photo publique, preview OG, Web Share device) | **qa-chrome** → Claude in Chrome | Vérifier le rendu + 0 fuite (geom-free, EXIF strippé). |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Workstreams & dépendances

| WS | Bloc | Effort | Migration | Parallèle J1 |
|----|------|--------|-----------|--------------|
| A | **Photo du poisson** (bucket public + strip EXIF + payload + OG) | L | bucket public | ✅ (cœur) |
| B | Wrapped récap (`kind='recap'`) | M | CHECK kind | ✅ |
| C | PR board records (`kind='records'`, réutilise sprint 45) | S-M | CHECK kind | ✅ |
| D | Polish viral : handle + thèmes + 1-tap | M | pref profil | ✅ |
| VERIF | revue + QA | S | — | ❌ |

Les migrations « CHECK kind » (B+C) se regroupent en **une** (ajouter `recap` + `records` aux kinds, en plus de `gearbox` posé par 46).

---

## WS A — 🎣 Photo du poisson (la feature virale manquante)

Aujourd'hui les cartes de partage sont **sans photo** (le bucket `catches` est privé, l'edge ne peut pas signer). On copie la photo (déjà WebP, EXIF strippé au upload) vers un **bucket public dédié**, re-strippée serveur (sharp, défense en profondeur), et l'edge la rend via une URL publique.

### Tâches
1. **Migration — bucket public** `share-photos` (modèle `036_avatars_storage.sql` : `public=true`, mimes `image/webp`, écriture owner-only `<uid>/…`). Lecture publique (URL stable, `getPublicUrl`).
2. **Copie + strip EXIF serveur** : dans `createCatchCard` (server action `app/actions/share.ts`), si l'utilisateur opte pour la photo et que la prise a un `photo_path` (bucket `catches` privé) : télécharger l'objet (service-role), **re-encoder via `sharp` en WebP en supprimant toutes les métadonnées** (`.withMetadata(false)` / rotate + strip), uploader dans `share-photos/<uid>/<uuid>.webp`, récupérer l'URL publique, l'ajouter au payload (`photo_url`). Util réutilisable `lib/storage/public-share-photo.ts` (réutilisé par le chat sprint 50).
3. **Payload** : ajouter `photo_url?: string` au type du payload catch (geom-free ; aucune coord, `location_label` déjà sanitisé sprint 44). **La photo est le seul élément non-texte ; rien d'autre ne change côté anti spot-burning.**
4. **Rendu OG** : dans `CatchCard` (`app/og/card/[slug]/route.tsx:205-316`), si `p.photo_url`, afficher `<img src={p.photo_url}>` (next/og rend les images distantes) en hero de la carte (formats OG 1200×630 + story 1080×1920, `format` prop déjà géré `:206`). Page `/c/[slug]` : afficher aussi la photo.
5. **Opt-in + révocation** : toggle « inclure ma photo (elle sera publique) » dans `ShareOptInDialog` ; à la révocation (`deleteShareCard`), **supprimer aussi l'objet public** `share-photos`.

### Critères d'acceptation
- Partager une prise avec photo → la carte publique et la preview OG montrent le poisson ; sans opt-in photo → carte texte comme avant.
- Le fichier public est WebP **sans EXIF/GPS** (vérif metadata) ; payload toujours **geom-free** (zéro coord/spot).
- Révoquer la carte supprime la photo publique.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : photo incluse par défaut (toggle ON) pour une prise qui en a une, ou opt-in strict OFF par défaut ?
- Photo **uniquement** sur action explicite de l'utilisateur (jamais auto). Bucket `catches` reste privé (on COPIE, on n'expose pas l'original).

---

## WS B — Carte récap « Wrapped » (`kind='recap'`)

### Tâches
1. **CHECK kind** (migration partagée avec C) : ajouter `'recap'` (et `'records'`) au CHECK de `shared_cards`.
2. **Payload** `createRecapCard` (modèle des kinds existants, geom-free) depuis `getMyCatchStats()` (`lib/catches/queries.ts:70`, `MyCatchStats` : total, plus grosse, espèce favorite, taux relâché) + `getMyCatchesBreakdown()` (espèces/mois) : `{ period: '2026'|'2026-06', totalCount, speciesCount, biggest, topSpecies, topMonth, releasedRate }`.
3. **Layout OG** `RecapCard` (modèle `CatchCard`) façon « Wrapped » (gros chiffres, mer en fond) + branche dans le dispatch OG (`route.tsx:~527`) + `/c/[slug]` (`CardRecap`/`cardHeadline`/`cardDescription`).
4. **Déclencheur** : bouton « Mon année de pêche » sur le carnet (période courante par défaut), via `ShareButton`/`useShareCard`.

### Critères d'acceptation
- « Mon année » génère une carte récap partageable (total, espèces, plus grosse, mois fort), geom-free, descriptive.

---

## WS C — PR board records (`kind='records'`)

**Réutilise le sprint 45** : `getMyRecordsBySpecies()` (`lib/catches/queries.ts:101`, type `SpeciesRecord`) + `RecordsBySpecies` (`components/catches/RecordsBySpecies.tsx`) existent déjà.

### Tâches
1. **Payload** `createRecordsCard` depuis `getMyRecordsBySpecies()` : `{ records: [{ species, size_cm, weight_g? }] }` (top espèces). Geom-free (taille/poids + espèce, jamais de lieu).
2. **Layout OG** `RecordsCard` (liste « tes records » façon segments Strava) + branche dispatch + `/c/[slug]`.
3. **Déclencheur** : bouton « Mes records » à côté de `RecordsBySpecies` sur le carnet.

### Critères d'acceptation
- « Mes records » génère une carte partageable des records perso par espèce, sans classement inter-pêcheurs (anti-leaderboard respecté).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D2)** : records en carte séparée (reco) ou fusionnés dans le Wrapped ?

---

## WS D — Polish viral : handle + thèmes + 1-tap

### Tâches
1. **Handle / @pseudo** : ajouter le `username` (déjà sur `profiles`) au payload de chaque carte (déjà scopé au propriétaire) et l'afficher sur la carte OG (footer `lib/og/template.tsx`) : « via @pseudo · carnet-de-peche.com ». Appropriation + chaque capture reste attribuée (le « via Strava »).
2. **Thèmes** (`?theme=`) : paramétrer la palette de `lib/og/template.tsx` (constantes `NAVY950/TEAL/CORAL…` `:13-19`) en 2-3 thèmes (marine par défaut, sombre, saison). `route.tsx` lit `searchParams.get('theme')` (comme `format` `:520`). Edge-safe (juste des couleurs).
3. **Partage 1-tap** : migration — `profiles.share_skip_optin boolean default false`. Dans `ShareOptInDialog`, case « ne plus me demander » → pose la pref ; si `true`, `useShareCard` saute le dialog (mais garde le rappel geom-free une fois). Réduit la friction = plus de partages.

### Critères d'acceptation
- Chaque carte porte « via @pseudo » ; `?theme=` change le rendu ; après « ne plus demander », le partage est en 1 tap.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D3)** : nombre de thèmes v1 (reco 2-3) ?

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : build + typecheck + lint + tests verts.
2. **QA partage réel (qa-chrome)** : carte prise **avec photo** (OG + story + Web Share device) ; Wrapped ; records ; handle visible ; `?theme=` ; 1-tap après opt-out du dialog.
3. **Passe sécurité / anti spot-burning (non négociable)** : tout payload `shared_cards` **geom-free** (aucune clé lat/lng/spot) ; photo publique **EXIF strippée** (sharp) et **opt-in only** ; bucket `catches` reste privé (copie, pas exposition) ; révocation supprime la photo publique ; `location_label` sanitisé (44) intact.
4. **Passe honnêteté** : records descriptifs sans leaderboard ; Wrapped sans donnée inventée.
5. **Passe copy** : tutoiement, pas de tiret cadratin (`node scripts/lint-copy-dashes.mjs`).
6. Livrer `docs/sprint-47/RECAP.md` : fait / comment tester / statut D1-D3 + util EXIF (réutilisée sprint 50).

---

## Décisions pour John
- **D1 (photo)** — incluse par défaut (toggle ON) pour une prise qui en a une, ou opt-in strict OFF ?
- **D2 (records)** — carte séparée (reco) ou fusionnée au Wrapped ?
- **D3 (thèmes)** — combien de thèmes v1 (reco 2-3) ?
- **D4 (indexation `/c/[slug]`)** — rappel de la décision ouverte (roadmap §7) : indexer les cartes de partage (acquisition SEO) ou `noindex` (anti-dilution) ? Reco : `noindex` v1.

## Reste manuel John (post-sprint)
- Appliquer les migrations (bucket public, CHECK kind, pref profil), regen types, merger `sprint-47` → `main`, déployer, **QA partage en conditions réelles** (poster une story Insta/TikTok, coller le lien sur Discord).
- Brancher César : c'est SA munition (chaque belle prise = une carte avec photo à repartager).

---

> **Invariants (rappel)** : pas de push sans validation · migrations = nouveaux fichiers + regen `lib/types.ts` · **photo de partage = opt-in + EXIF strippé serveur (sharp) + bucket public dédié** (bucket `catches` reste privé) · cartes **geom-free** (zéro spot/coord) · records **privés/descriptifs** (zéro leaderboard) · util EXIF réutilisée par le chat (sprint 50) · copy sans tiret cadratin.
