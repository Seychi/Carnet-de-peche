# Sprint 47 — RECAP
## « Le partage viral » (photo du poisson + Wrapped + records + handle/thèmes/1-tap)

> Exécuté le 2026-06-28 (ultracode, 3 agents par fichier + câblage final). **Pas poussé.** Migrations **080/081/082 appliquées en prod** + `lib/types.ts` régénéré. Le moteur de partage (sprint 38) débloque enfin le poisson.

---

## Décisions John
- **D1** = toggle photo **coché par défaut** (ON) pour une prise avec photo (décochable).
- **D2** = carte « records » **séparée** (pas fusionnée au Wrapped).
- **D3** = **2-3 thèmes** (marine défaut + sombre + saison).
- **D4** = `/c/[slug]` en **noindex**.

## Migrations
- **080** : bucket **PUBLIC** `share-photos` (image/webp, écriture owner-only `<uid>/…`, lecture publique). Le bucket `catches` reste PRIVÉ.
- **081** : `shared_cards.kind` accepte `recap` + `records` (+ catch/conditions/outing/gearbox).
- **082** : `profiles.share_skip_optin` (préférence 1-tap).

## Util sécurité (écrite par le lead, réutilisée sprint 50)
- `lib/storage/public-share-photo.ts` : `publishSharePhoto` télécharge la photo privée (service-role), la **re-encode via sharp en supprimant l'EXIF/GPS** (`.rotate().webp()` sans `.withMetadata()`), l'upload dans `share-photos`, renvoie l'URL publique ; `deleteSharePhoto` (révocation) ; `sharePhotoPathFromUrl`.

## Fait (3 agents + câblage)
- **Serveur** (`app/actions/share.ts`) : `photo_url` + `username` sur les payloads ; `createRecapCard` (getMyCatchStats + breakdown) ; `createRecordsCard` (réutilise `getMyRecordsBySpecies`, sprint 45) ; dispatcher/union/KNOWN_KINDS étendus ; **révocation** purge la photo publique.
- **OG edge** (`route.tsx` + `template.tsx`) : `<img>` photo en hero de CatchCard ; layouts `RecapCard` (Wrapped) + `RecordsCard` ; footer « via @pseudo » ; **3 thèmes** `?theme=` (types miroirs edge-safe, pas d'import serveur).
- **Client UX** (`/c` + dialog + hook + déclencheurs) : page publique **noindex** + rendu recap/records/photo ; toggle photo **ON par défaut décochable** ; **1-tap** (`lib/share/skip-optin.ts` + skip du dialog si pref) ; boutons « Mon année de pêche » + « Partager mes records » sur le carnet.
- **Câblage photo (gap WS A fermé par le lead)** : `CatchActionsDropdown` → `CatchActionsMenu` → `carnet/[id]/page.tsx` passent `hasPhoto={!!c.photo_path}` et `includePhoto` → le toggle photo est désormais **atteignable** sur un vrai partage de prise (sans ça, la feature phare était plombée mais invisible).

---

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **574 verts** · `pnpm build` **OK** (`/c/[slug]`, `/og/card/[slug]`, `/carnet`).
- **Passe sécurité (code relu + test empirique)** :
  - **EXIF strippé VÉRIFIÉ empiriquement** : image avec EXIF (228 o, champ GPS) → `sharp().rotate().webp()` → 0 metadata. Pas assumé, prouvé.
  - Tous les payloads (catch/conditions/outing/gearbox/recap/records) **geom-free** (grep des clés geo vide).
  - Photo **opt-in strict côté serveur** (`if (includePhoto)`), `photo_path` lu owner-scopé (`.eq('id').eq('user_id')`), bucket `catches` reste privé (on copie). **Révocation** : `deleteShareCard` purge `deleteSharePhoto(sharePhotoPathFromUrl(...))`.
  - `/c/[slug]` **noindex** (`robots: { index:false, follow:false }`).
  - Records **descriptifs**, zéro classement inter-pêcheurs.
- **Copy** : sans tiret cadratin (séparateurs `<title>`/OG tolérés §6).

## ⚠️ Suivis (non bloquants)
1. `ManageShareCards.tsx` complété par l'agent client (labels `recap`/`records`, ripple de l'union) — hors périmètre strict mais nécessaire.
2. Pendant la résolution async du 1-tap (`getShareSkipOptin`), le bouton n'est pas visuellement désactivé (un ref empêche le double-déclenchement, donc pas de double partage).

## Reste manuel John
- Relire, merger `sprint-47` → `main`, déployer, **QA partage réel** (story Insta/TikTok, lien Discord). Brancher César (chaque belle prise = une carte avec photo à repartager).

---

> **Invariants tenus** : pas de push · migrations + regen types · **photo = opt-in + EXIF strippé serveur (vérifié) + bucket public dédié** (bucket `catches` reste privé) · cartes **geom-free** · records **descriptifs** (zéro leaderboard) · `/c` noindex · util EXIF réutilisable (sprint 50) · copy sans tiret cadratin.
