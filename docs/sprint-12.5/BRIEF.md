# Sprint 12.5 — Brief d'exécution
## Photos de profil (avatars uploadables)

> Rédigé le 2026-06-21. Durée : **3-4 jours** (petit sprint).
> Contexte : `docs/excellence/ROADMAP.md`. État vérifié 2026-06-21 :
> - `profiles.avatar_url` **existe déjà** (migration `001_init.sql:22`) et s'affiche **partout** : `app/(app)/profil/profile-form.tsx` (composant `Avatar`), `components/feed/PostCard.tsx`, `components/feed/CommentThread.tsx`, `app/(app)/u/[username]/page.tsx`, vues `catches_for_viewer.avatar_url` + `feed_posts_for_viewer.author_avatar_url`. Repli initiales quand l'avatar est nul.
> - **Ce qui manque = l'upload** : aucun moyen pour l'utilisateur de choisir/changer sa photo. Le form profil affiche l'avatar en lecture seule.
> - Pipeline réutilisable déjà en place : `lib/storage/image-resize.ts` → `resizeImageToWebp()` (resize + WebP + **strip EXIF/orientation** via `browser-image-compression`), pattern bucket Storage dans `006_catches_storage_extension.sql` et `035_feed_post_photos.sql`.
> - Migrations en cours : `034_catches_viewer_lnglat.sql` (sprint 12) et `035_feed_post_photos.sql` (sprint 13) existent déjà → **prochaine migration libre = 036**.

**Préalable avant de démarrer** (manuel John) :
1. Idéalement après le sprint 13 (réutilise le helper resize + le pattern Storage), mais indépendant : peut aussi être fait juste après le sprint 12.
2. Décisions tranchées dans ce brief : bucket **public** dédié `avatars`, crop **carré**, étape onboarding **facultative et skippable**. Dire si tu veux autrement.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-12.5/BRIEF.md`. Lance A (migration bucket) en premier ; B et C démarrent dès que A est appliquée et `lib/types.ts` régénéré. Termine par VERIF. Ne push pas. **Docker dispo si besoin** (`supabase start`) — optionnel, seulement quand c'est utile (migration sensible, repro d'un bug), pas un passage obligé. **Effort maximal, très attentif et critique** : vérifie le vrai code, remets en cause le brief s'il se trompe, passe adversariale anti-régression (cf §Environnement & posture). Invariants : RLS/policies Storage d'abord, resize client + WebP avant upload (EXIF strippé), pas de localStorage, régénère `lib/types.ts` après migration.

---

## ⚙️ Environnement & posture d'exécution (transverse — exigence John 2026-06-21)

**Docker est disponible** sur la machine de John — **optionnel, à utiliser seulement si nécessaire** (pas un passage obligé) :
- Quand une migration est **sensible** ou qu'un bug est **dur à reproduire**, `supabase start` (stack Supabase local sous Docker) permet de jouer la migration / le scénario en local AVANT la prod (RLS/policies, requêtes des critères, vérifier qu'`anon` n'accède à rien d'interdit). Sinon, ne te complique pas avec Docker.
- Lance tests + e2e Playwright (et Lighthouse pour le sprint UI) contre une base/instance jetable, jamais la prod.
- Conteneurise le build si ça aide à reproduire un comportement.

**Effort maximal + esprit critique** (exigence, pas une option) :
- `ultracode` + effort `xhigh` : parallélise au max, ne bâcle aucun bloc, va au bout des critères d'acceptation.
- **Très attentif et critique** : le brief est un guide, pas une vérité. Vérifie chaque hypothèse (chemins, lignes, schéma) contre le **vrai code** avant d'agir ; si un élément cloche, **remets en cause le brief** au lieu de l'exécuter aveuglément.
- **Passe adversariale** sur ton propre travail : traque les régressions (gating de tier, floutage GPS, RLS, perf INP, SEO), les cas limites et les fuites de données. En cas de doute : `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

---

## Objectif du sprint en une phrase

Un pêcheur peut ajouter, changer et retirer sa photo de profil (recadrée en carré, optimisée, sans fuite EXIF) depuis son profil et à l'onboarding ; elle apparaît immédiatement partout où l'avatar est déjà affiché.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Migration : bucket public `avatars` + policies | 0,5 j | numéro 036 confirmé | ✅ |
| B | Uploader avatar dans le profil + actions | 1,5-2 j | A | ❌ |
| C | Étape onboarding (facultative) + nettoyage suppression compte | 1 j | A | ⚠️ UI dès J1 |
| VERIF | Revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc A — Migration : bucket Storage `avatars` (public)

Les avatars sont destinés à être vus (profils publics, fil, home). Un bucket **public** donne des URLs stables sans gestion de signature — contrairement à `catches` (privé, car position sensible). Mirror du pattern `006` / `035`.

### Tâches
1. Migration `supabase/migrations/036_avatars_storage.sql` :
   - `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)` → bucket `avatars`, `public = true`, limite ~2 Mo, mimes `image/webp` (et `image/jpeg,image/png` en entrée si l'upload n'est pas pré-converti — mais on uploade du WebP, donc `image/webp` suffit).
   - Policies Storage : **lecture publique** (bucket public) ; **insert/update/delete** réservés à `auth.uid()` sur son propre dossier (`name like auth.uid() || '/%'`). Mirror exact des policies `catches` (006) en remplaçant `bucket_id`.
2. Régénérer `lib/types.ts` (pas de nouvelle colonne, mais garder l'habitude).

### Critères d'acceptation
- Le bucket `avatars` existe, `public = true`.
- Un user authentifié peut écrire `avatars/<son_uid>/x.webp` mais **pas** `avatars/<autre_uid>/x.webp` (policy rejette).
- L'URL publique d'un avatar est lisible sans authentification.

### Garde-fous
- RLS/policies AVANT tout. Migrations = nouveau fichier (036), ne pas éditer un ancien.
- Ne pas rendre le bucket `catches` public.

## Bloc B — Uploader avatar dans le profil + actions

`app/(app)/profil/profile-form.tsx` : le composant local `Avatar` (l.39) affiche l'image ou les initiales, en lecture seule. On le rend **éditable**. `app/(app)/profil/actions.ts` : `updateProfile` ne gère pas l'avatar → on ajoute des actions dédiées (upload séparé du save texte).

### Tâches
1. **Helper carré** : étendre `lib/storage/image-resize.ts` avec une option de **recadrage carré centré** (ou un `resizeImageToSquareWebp(file, size=512)`), réutilisant `browser-image-compression` (donc EXIF/GPS toujours strippé). Sortie ~512×512 WebP.
2. **Composant `AvatarUploader`** (client) : clic sur l'avatar → sélection fichier (galerie + caméra **frontale** : `accept="image/*"`, sans `capture="environment"` du `PhotoInput` des prises), aperçu rond, upload Storage `avatars/<uid>/<random>.webp`, bouton « Retirer la photo ». Spinner pendant l'optimisation/upload.
3. **Actions** dans `app/(app)/profil/actions.ts` :
   - `updateAvatar(path)` : valide l'ownership du chemin, set `profiles.avatar_url` = URL publique (avec cache-bust, ex. suffixe `?v=<ts>` ou chemin aléatoire), `revalidatePath('/profil')`. Supprimer l'ancien fichier best-effort.
   - `removeAvatar()` : set `avatar_url = null`, supprimer le fichier Storage.
4. Brancher dans `profile-form.tsx` (remplacer l'`Avatar` lecture seule par `AvatarUploader`). Garder le reste du form intact.

### Critères d'acceptation
- Depuis `/profil`, je choisis une image → elle est recadrée carré, uploadée, et l'avatar se met à jour **immédiatement** (et sur le fil, les commentaires, `/u/<moi>`).
- « Retirer la photo » → repli sur les initiales partout.
- Une image avec GPS EXIF en entrée → le fichier stocké n'a plus d'EXIF (vérifier).
- Je ne peux pas écrire dans le dossier d'un autre utilisateur (policy).
- Changer d'avatar ne laisse pas l'ancien fichier orphelin (best-effort) et l'URL publique est rafraîchie (pas de cache CDN figé).

### Garde-fous
- Ne pas casser `updateProfile` (le save texte reste séparé de l'upload avatar).
- `<img>` volontaire pour l'avatar (déjà toléré via eslint-disable dans le code) — pas de refacto `next/image` ici.

## Bloc C — Onboarding (facultatif) + nettoyage suppression compte

### Tâches
1. **Onboarding** (`app/(app)/onboarding/[step]/`) : ajouter une étape **facultative** « Ta photo (optionnel) » avec le même `AvatarUploader` et un bouton « Passer ». Ne PAS bloquer la complétion de l'onboarding si l'utilisateur saute l'étape. (Si l'ajout d'étape complexifie le flux 6-écrans, le proposer plutôt comme encart skippable sur l'écran final `/onboarding/fini` — décision agent, documentée.)
2. **Suppression de compte** : `deleteAccount` (`app/(app)/profil/actions.ts`) nettoie déjà le bucket `catches` ; ajouter le **nettoyage du bucket `avatars/<uid>/`** (même pattern service-role, best-effort, non bloquant).
3. Vérifier l'affichage : aucun changement de rendu attendu (avatar déjà branché partout) — juste confirmer que la nouvelle photo apparaît sur `PostCard`, `CommentThread`, `/u/[username]`, `/profil`.

### Critères d'acceptation
- À l'onboarding, je peux ajouter une photo OU passer ; dans les deux cas l'onboarding se termine (`onboarded = true`).
- Supprimer mon compte retire aussi mes fichiers `avatars/<uid>/`.
- L'avatar fraîchement uploadé est visible sur le fil et les profils sans recharger toute l'app.

### Garde-fous
- Ne pas rendre la photo obligatoire (friction onboarding).
- Ne pas régresser le flux onboarding existant (perf `useTransition` + skeleton du sprint 11.6).

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` + `pnpm build` + `pnpm typecheck` verts.
2. Cocher A→C avec preuve (upload réel, policy refusée pour un autre uid, EXIF strippé, repli initiales).
3. Passe sécurité : policies Storage `avatars` (écriture restreinte au dossier de l'uid), bucket `catches` toujours privé, pas d'orphelins à chaque changement, suppression compte nettoie `avatars`.
4. Passe copy : tutoiement, libellés FR (« Changer ma photo », « Retirer la photo », « Passer »), rien de mensonger.
5. Livrer `docs/sprint-12.5/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Appliquer la migration 036 + créer le bucket si l'agent ne l'a pas fait ; régénérer `lib/types.ts`.
- QA upload réel sur mobile (photo géolocalisée → vérifier non-fuite GPS ; rendu rond net).
- Merge → `main` + déploiement.
