# Sprint 46 — Brief d'exécution
## « Boîte à matériel v2 » (photos + usure/perte + boîte partageable · ~4 j)

> Rédigé le 2026-06-28. Enrichissement (roadmap `docs/ROADMAP-CORRECTIFS-ENRICHISSEMENTS-2026-06-28.md` §6). La boîte à matériel (sprint 37) devient visuelle, narrative et sociale.
> 3 features : (A) **photos de leurres**, (B) **usure/perte** (« ce leurre t'a sorti 12 poissons avant de te lâcher »), (C) **boîte partageable** en lecture (libellés + ce qui pêche, JAMAIS les spots).
> **Constat clé (re-vérifié)** : le pipeline photo (`resizeImageToWebp` + `PhotoInput`, EXIF strippé) et **tout le moteur de partage** (sprint 38 : `shared_cards`, `useShareCard`, `ShareButton`, route OG, `/c/[slug]`) sont **réutilisables tels quels** — il suffit d'ajouter un kind `gearbox`. Le fix d'ownership `gear_id` (sprint 44) est en place, donc la boîte partageable est sûre.

**⚠️ État** : migrations à **077** (44 a posé `075/076/077`). Le sprint 45 (en cours) peut prendre `078` (RPC records, selon sa décision D1). **Confirmer le dernier numéro avant de créer** : ce sprint vise `078`/`079` (ou `079`/`080` si 45 a pris `078`).

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-46/BRIEF.md`. **Confirme le dernier numéro de migration.** Réutilise au maximum l'existant : `PhotoInput`/`resizeImageToWebp` (photos), et le moteur de partage complet (kind `gearbox` à ajouter partout). Invariants : **bucket photo privé** (signed URL, jamais public), **boîte partagée = texte geom-free** (libellés + ce qui pêche, JAMAIS un spot ni une photo dans le payload public), moat gratuit, copy sans tiret cadratin. Regénère `lib/types.ts` après migrations. Termine par **VERIF**. **Ne push pas.** Décision ouverte → `⚠️ DEMANDER À JOHN`.

---

## 🧠 Connecteurs & sous-agents

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Migrations `078`/`079` (gear photo/usure, kind gearbox) | **supabase-guard** → Supabase (RO d'abord) | Confirmer le numéro libre ; `ALTER` gear_items ; étendre le CHECK kind ; regen types. |
| Upload/resize photo de leurre, bucket privé signed URL | **docs-researcher** → Context7 | Réutiliser le pattern `uploadCatchPhoto`/`createSignedUrl` (Supabase Storage). |
| QA (boîte avec photos, item perdu, carte de partage gearbox) | **qa-chrome** → Claude in Chrome | Vérifier rendu + 0 fuite (photo hors payload public, zéro spot). |
| Clôture | **`/verif-sprint`** | Build + typecheck + lint + tests. |

## Workstreams & dépendances

| WS | Bloc | Effort | Migration | Parallèle J1 |
|----|------|--------|-----------|--------------|
| A | Photos de leurres (upload + vignette boîte/picker) | M | `078` (photo_path) | ✅ |
| B | Usure / perte (« t'a sorti N poissons avant de te lâcher ») | S-M | `078` (champs usure) | ✅ |
| C | Boîte partageable (kind `gearbox`) | M | `079` (CHECK kind) | ✅ |
| VERIF | revue + QA | S | — | ❌ |

WS A et B partagent la **même migration `078`** (deux `ALTER` sur `gear_items`). WS C est autonome (`079`).

---

## WS A — Photos de leurres

**Net-neuf** : `gear_items` n'a pas de `photo_path` (`lib/types.ts:392-404`). On réutilise le pipeline photo des prises.

### Tâches
1. **Migration `078`** (partie photo) : `ALTER TABLE public.gear_items ADD COLUMN photo_path text;` (RLS héritée de `059`, owner-only). Étendre le type `GearItem` (`app/actions/gear.ts:34-42`) + `lib/types.ts`.
2. **Upload** : créer `uploadGearPhoto(formData)` sur le modèle **exact** de `uploadCatchPhoto` (`lib/catches/actions.ts:412-450`) : resize via `resizeImageToWebp` (`lib/storage/image-resize.ts:12-31`, **EXIF strippé** au ré-encodage), bucket **`catches` (privé)** sous-dossier `${user.id}/gear/${crypto.randomUUID()}.webp` (les policies `006:66-101` scopent par `foldername[1]=auth.uid()` → le sous-dossier `gear/` passe). **Bucket privé, jamais public** (cf D1).
3. **Saisie** : ajouter `PhotoInput` (`components/forms/PhotoInput.tsx`) dans `GearCreateForm` (`GearPicker.tsx:308-460`) et `GearEditForm` (`GearBoxItem.tsx:171-304`) ; persister `photo_path` via `createGearItem`/`updateGearItem` (`gear.ts:92-126`/`:202-238`).
4. **Affichage** : signer l'URL owner via `createSignedUrl` (modèle `lib/catches/queries.ts:103-105`) et afficher la vignette dans `GearBoxItem.tsx:34-116` et dans le picker (`GearPicker.tsx:150-173` pastille sélectionnée + `:268-285` items).

### Critères d'acceptation
- Ajouter une photo à un leurre → vignette visible dans la boîte et le picker ; photo **privée** (signed URL, pas d'URL publique).
- EXIF/GPS absent du fichier stocké (ré-encodage WebP).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D1)** : réutiliser le bucket `catches` avec sous-dossier `gear/` (reco, 0 nouveau bucket) ou créer un bucket privé `gear` dédié ?

---

## WS B — Usure / perte

**Net-neuf** : aucun champ d'état de vie du leurre. La donnée « N prises » est **déjà calculée** par la boîte (`carnet/boite/page.tsx:36-54`) → on ajoute le récit.

### Tâches
1. **Migration `078`** (partie usure) : `ALTER TABLE public.gear_items ADD COLUMN retired_at timestamptz, ADD COLUMN retired_reason text CHECK (retired_reason in ('perdu','casse','use') OR retired_reason is null);` (cf D2 pour le modèle exact). Étendre `GearItem`.
2. **Marquer perdu/cassé** : dans `GearEditForm` (`GearBoxItem.tsx:171-304`), action « j'ai perdu / cassé ce leurre » → `updateGearItem` pose `retired_at`+`retired_reason` (et **archive** l'item, cf D2). Réutiliser `ArchiveButton` (`GearBoxItem.tsx:120-167`) comme modèle d'interaction.
3. **Récit** dans `GearBoxItem` : pour un leurre retiré, afficher « Ce {leurre} t'a sorti {N} poissons avant de te lâcher » ({N} = `total` déjà agrégé). Pour un leurre actif, garder « {N} prises ».
4. Lire `retired_at`/`retired_reason` dans `listMyGear` (`gear.ts:135-163`) et dans l'agrégat boîte (`page.tsx:31`) ; afficher une section « Au cimetière des leurres » (retirés) distincte des actifs (`GearBoxList.tsx`).

### Critères d'acceptation
- Marquer un leurre perdu/cassé l'archive et affiche son palmarès final (« t'a sorti N poissons avant de te lâcher »).
- Les leurres actifs et retirés sont distingués visuellement.

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D2)** : modèle d'usure = `retired_at` + `retired_reason` enum (reco) ? Et retirer = archiver automatiquement (reco oui) ?

---

## WS C — Boîte partageable (kind `gearbox`)

**On réutilise tout le moteur de partage (sprint 38)** ; il suffit d'ajouter le kind `gearbox`. Le partage = **libellés + ce qui pêche**, geom-free, **jamais de spot ni de photo** dans le payload public.

> Note honnêteté : la boîte ne calcule **pas** un vrai « taux de réussite » (pas de dénominateur de sorties par leurre). Le partage = top leurres + **nombre de prises** + espèces dominantes (descriptif, exact), pas un pourcentage inventé (cf D3).

### Tâches
1. **Migration `079`** : étendre le CHECK `kind` de `shared_cards` (`061:26`) à `('catch','conditions','outing','gearbox')` (DROP/ADD CONSTRAINT). Regen types.
2. **Server action** (`app/actions/share.ts`) : ajouter `createGearboxCard` sur le modèle de `createCatchCard` (`:195-259`) : payload **geom-free** = `{ topGear: [{ label, kind, catchCount, topSpecies }], totalCatchesWithGear }` (lu via `catches_for_viewer` + `gear_items`, scopé `auth.uid()`, **aucun `spot_id`/geom**). Brancher dans le switch (`:173-192`), `ShareCardInput` (`:82-85`), `KNOWN_KINDS` (`:435`). Type `GearboxCardPayload` (`:47-80`).
3. **Route OG** (`app/og/card/[slug]/route.tsx`) : layout `GearboxCard` (modèle `CatchCard:205-316`) + branche (`:527-535`). Formats OG 1200×630 + story 1080×1920. **Aucune photo de leurre** dans la carte (l'edge ne peut pas signer une URL privée ; et on garde le payload public texte).
4. **Page publique** (`app/(marketing)/c/[slug]/page.tsx`) : `GearboxRecap` + cases `'gearbox'` dans `CardRecap:244-251`, `cardHeadline:96-113`, `cardDescription:115-135`.
5. **Opt-in + bouton** : entrée `gearbox` dans `ShareOptInDialog` (`COPY:19-38`, élargir le type union) ; bouton « Partager ma boîte » sur `/carnet/boite` via `ShareButton`/`useShareCard` (`components/share/use-share-card.ts:68-130`, agnostique du kind).

### Critères d'acceptation
- « Partager ma boîte » → carte publique `/c/[slug]` listant mes leurres qui pêchent (« Black Minnow : 12 prises, surtout bar ») ; preview OG riche ; révocable.
- **0 spot, 0 coordonnée, 0 photo** dans le payload public (`select payload from shared_cards where kind='gearbox'` ne contient aucune clé geo ni URL privée).

### Garde-fous
- ⚠️ **DEMANDER À JOHN (D3)** : confirmer le cadrage « nombre de prises + espèces » (pas de faux « taux de réussite » %).
- **D4** : photos de leurres exclues du payload partagé (reco) — la boîte partagée reste texte.

---

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` : build + typecheck + lint + tests verts.
2. **QA (qa-chrome)** : photo de leurre (ajout, vignette, privée) ; leurre marqué perdu (palmarès + cimetière) ; « Partager ma boîte » → carte publique correcte + preview OG.
3. **Passe sécurité / anti spot-burning** : photos en **bucket privé** (signed URL, jamais d'URL publique) ; payload `gearbox` **sans aucun spot/geom/URL privée** ; EXIF strippé ; RLS gear owner-only intacte ; le fix ownership `gear_id` (44) toujours là.
4. **Passe honnêteté** : pas de faux « taux de réussite » ; descriptif.
5. **Passe copy** : tutoiement, pas de tiret cadratin (`node scripts/lint-copy-dashes.mjs`).
6. Livrer `docs/sprint-46/RECAP.md` : fait / comment tester / statut D1-D4.

---

## Décisions pour John
- **D1 (bucket photo)** — réutiliser `catches` avec sous-dossier `gear/` (reco, 0 nouveau bucket) ou bucket privé `gear` dédié ?
- **D2 (modèle usure)** — `retired_at` + `retired_reason` enum (perdu/cassé/usé) + archivage auto (reco) ?
- **D3 (cadrage partage)** — top leurres + nombre de prises + espèces (reco, honnête) plutôt qu'un % de réussite (pas de dénominateur fiable) ?
- **D4 (photo dans le partage)** — exclure les photos du payload public (reco) ; la carte gearbox reste texte ?

## Reste manuel John (post-sprint)
- Appliquer `078`/`079`, regen types, merger `sprint-46` → `main`, déployer, QA (photo, perte, partage de boîte).

---

> **Invariants (rappel)** : pas de push sans validation · RLS jamais désactivé (gear owner-only) · migrations = nouveaux fichiers (`078`/`079`) + regen `lib/types.ts` · **photos de leurres en bucket privé** (signed URL, EXIF strippé) · **boîte partagée geom-free** (libellés + prises, jamais un spot ni une photo dans le payload public) · moat gratuit · honnêteté (pas de faux taux) · copy sans tiret cadratin.
