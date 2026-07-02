# Sprint 12.5 — RECAP : Photos de profil (avatars uploadables)

> Branche `sprint-12.5-avatars` (part de `main` = sprint 12, **indépendante du sprint 13**). **Pas mergé / pas poussé** (le brief dit « Ne push pas »). Migration **036 déjà appliquée + vérifiée en prod** par l'agent (ne pas réappliquer).

## Objectif
Un pêcheur peut ajouter / changer / retirer sa photo de profil (recadrée carré, optimisée, sans fuite EXIF) depuis son profil et à l'onboarding ; elle apparaît partout où l'avatar est déjà affiché.

## Fait

### Bloc A — Migration bucket `avatars` (public) — appliqué + vérifié en prod
- **036** : bucket Storage **public** `avatars` (`file_size_limit` 2 Mo, `allowed_mime_types` = `image/webp`). Policies `storage.objects` : **insert/update/delete** restreints à `(storage.foldername(name))[1] = auth.uid()` (dossier de l'utilisateur). **Lecture = URL publique** (bucket public → pas de policy SELECT). `catches` reste **privé**.
- **Vérifs prod (adversariales)** : `public=true`, limite 2 Mo, mime webp, 3 policies ; insert dans son dossier ✓ ; insert dans le dossier d'un AUTRE uid → **rejet RLS 42501** ✓ ; `catches.public=false` (toujours privé) ✓.
- `lib/types.ts` : **inchangé** — 036 ne touche que le schéma `storage` (pas `public`), donc aucune régénération nécessaire.

### Bloc B — Uploader avatar + actions
- **`resizeImageToSquareWebp(file, 512)`** (`lib/storage/image-resize.ts`) : crop **carré centré** via `createImageBitmap({ imageOrientation: 'from-image' })` (orientation EXIF appliquée) + `canvas.toBlob('image/webp')` → **EXIF/GPS strippé** (le canvas ne recopie aucune métadonnée). Fallback `HTMLImageElement` si `createImageBitmap` indisponible.
- **`AvatarUploader`** (`components/profile/AvatarUploader.tsx`, client) : clic sur l'avatar → sélection (`accept="image/jpeg,image/png,image/webp"`, pas de `capture` → galerie/caméra au choix), spinner pendant resize+upload, upload direct `avatars/<uid>/<uuid>.webp` (nom aléatoire = **cache-bust**), boutons « Changer ma photo » / « Retirer la photo », rollback Storage si l'action échoue.
- **Actions** (`app/(app)/profil/actions.ts`) : `updateAvatar(path)` (anti-claim : `path` doit commencer par `<uid>/` ; set `avatar_url` = URL publique ; supprime l'ancien fichier best-effort) ; `removeAvatar()` (set `null` + suppression Storage). `revalidatePath('/profil')` + `router.refresh()` côté client.
- Branché dans `profile-form.tsx` (remplace l'`Avatar` lecture seule ; ancien composant retiré).

### Bloc C — Onboarding (optionnel) + nettoyage suppression compte
- **Décision documentée** : pas de 7ᵉ étape dans le flux RHF (6 écrans, risque de régression) → **encart skippable** « TA PHOTO · OPTIONNEL » sur `/onboarding/fini` (où `onboarded` est déjà `true` → ne bloque jamais ; le CTA « Ouvrir mon carnet → » fait office de « Passer »). Réutilise `AvatarUploader` (variant `dark`).
- **`deleteAccount`** nettoie désormais **aussi** `avatars/<uid>/` (service-role, best-effort, non bloquant), en plus de `catches`.

## VERIF
- `pnpm typecheck` ✓ · `pnpm test` **327/327** ✓ · `pnpm build` ✓.
- Revue adversariale (Workflow 3 lentilles : sécurité / régression / correction-UX) — voir section ci-dessous.

## Comment tester (manuel)
1. `/profil` → clique l'avatar → choisis une image **non carrée** → elle est recadrée carré, uploadée, l'avatar se met à jour (et sur le fil / commentaires / `/u/<moi>` au prochain rendu).
2. « Retirer la photo » → repli sur les initiales.
3. Recharge `/profil` après changement → l'ancienne photo n'est plus servie (cache-bust via nom aléatoire), pas d'orphelin (ancien fichier supprimé).
4. **QA GPS** : upload une photo smartphone géolocalisée → télécharge le fichier dans le bucket `avatars` → vérifie via `exiftool` qu'il n'a **plus** de tag GPS.
5. Onboarding : termine le flux → sur l'écran final, ajoute une photo **ou** clique « Ouvrir mon carnet » → dans les deux cas tu arrives sur `/home`.
6. Supprime ton compte → vérifie que `avatars/<uid>/` est vidé.

## Revue adversariale (Workflow 3 lentilles) — corrigée
Sécurité / régression / correction-UX en parallèle, sur le vrai code + état live Supabase. Axes critiques **sains** : policies Storage gated sur `auth.uid()` (cross-uid rejeté), `catches` resté privé, EXIF/GPS strippé sur le chemin app (deux branches du resize), service-role server-only, pas de XSS (rendu `<img src>`), `updateProfile` non régressé, flux onboarding 6 étapes intact.

**Corrigé** : fermeture du bitmap en `finally` (anti-fuite mémoire si canvas échoue) ; garde anti double-clic (`busy`) + `try/catch` sur `handleRemove` ; validation **stricte** du chemin dans `updateAvatar` (`^<uid>/[A-Za-z0-9-]+\.webp$`, ferme `..`/segments) ; log des échecs de suppression Storage (plus d'orphelin silencieux) ; garde « WebP > 2 Mo après compression » ; `aria-busy` sur le bouton ; avatar affiché dans le cercle récap de `/onboarding/fini`.

**Risques résiduels assumés (faible enjeu — un avatar = photo de tête auto-publiée, pas la donnée d'autrui ni un spot)** :
- *EXIF non garanti côté serveur* : le strip est assuré pour tout upload via l'app, mais un appel API direct (token user + clé publishable) pourrait stocker un WebP avec EXIF dans le bucket public. Une vraie garantie exigerait un re-encode serveur (Edge Function) — hors scope 12.5. Commentaire migration ajusté pour ne pas surpromettre.
- *`avatar_url` directement modifiable* via la policy `profiles_update_self` (pré-existante) : un user peut pointer son propre avatar vers une URL externe (hotlink/pixel). Impact = soi-même uniquement (RLS confine à sa ligne), pas de XSS. Verrou (colonne en GRANT + SECURITY DEFINER) jugé disproportionné pour un avatar.
- *HEIC iPhone* : `accept` restreint à jpeg/png/webp **volontairement** (force la conversion HEIC→JPEG d'iOS à la sélection → décodable + EXIF strippé). À confirmer en QA mobile réelle.

## Reste manuel John
- ~~Appliquer 036 + créer le bucket~~ **déjà fait (036 en prod, bucket `avatars` public créé).** ~~Régénérer types~~ **non nécessaire (pas de schéma public touché).**
- QA upload réel sur mobile (photo géolocalisée → non-fuite GPS ; rendu rond net).
- **Merge `sprint-12.5-avatars` → `main` + déploiement.** ⚠️ Coordination avec sprint 13 (`sprint-13-photos`) : les deux branches ajoutent des migrations (035/035b vs 036) et partent de `main` → merger l'une puis l'autre ; les migrations sont indépendantes, ordre de merge sans incidence sur la prod (déjà appliquées).
