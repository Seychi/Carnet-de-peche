# Sprint 13 — Brief d'exécution
## Photos & contenu (le fil devient visuel)

> Rédigé le 2026-06-21. Durée : 1,5-2 semaines.
> Contexte : `docs/excellence/ROADMAP.md` · audit 2026-06-21 (plainte n°1 fonctionnelle : « on ne voit pas les photos »). Diagnostic : la table `feed_posts` n'a **aucune colonne photo** ; une image n'apparaît que si un post « partage une prise » (`catch_id`) qui a elle-même une photo (`CatchEmbed` dans `components/feed/PostCard.tsx`). Aucun upload de photo libre.
> Décision John 2026-06-21 : **upload direct** — n'importe quel post peut porter 1..n photos (façon Instagram), EN PLUS du partage de prise.

**Préalable avant de démarrer** (manuel John) :
1. Sprint 12 mergé sur `main` (ce sprint part de là).
2. Confirmer le prochain numéro de migration libre (≥ celui du sprint 12).
3. Décider du quota photos/post (défaut proposé : **4**) — ⚠️ tranché ici à 4, dire si autre.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-13/BRIEF.md`. Lance A en premier (migration + Storage) ; B et C démarrent dès que A est appliquée et `lib/types.ts` régénéré ; D et E en parallèle dès maintenant. Termine par VERIF. Ne push pas. **Docker dispo si besoin** (`supabase start`) — optionnel, seulement quand c'est utile (migration sensible, repro d'un bug), pas un passage obligé. **Effort maximal, très attentif et critique** : vérifie le vrai code, remets en cause le brief s'il se trompe, passe adversariale anti-régression (cf §Environnement & posture). Invariants : RLS d'abord sur toute nouvelle table, photos privées + URLs signées, **strip EXIF/GPS à l'upload**, resize client avant upload, régénère `lib/types.ts` après migration.

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

Un pêcheur peut publier un post avec une ou plusieurs photos (uploadées directement, redimensionnées, sans fuite GPS EXIF), tout le monde les voit en galerie + plein écran, et le fil défile en infini avec des skeletons et un envoi optimiste.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable jour 1 |
|----|------|-------|-----------|----------------------|
| A | Migration `feed_post_photos` + bucket Storage + RLS | 1 j | numéro migration | ✅ |
| B | Composer : upload multi + resize + EXIF strip + preview | 2-3 j | A | ❌ |
| C | PostCard : galerie + lightbox + URLs signées en batch | 2 j | A | ❌ |
| D | Fiabiliser le partage de prise + meilleur sélecteur | 1 j | — | ✅ |
| E | Fluidité : infinite scroll + skeletons + optimiste | 2 j | — | ✅ |
| VERIF | Revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

---

## Bloc A — Migration : photos de post + Storage

### Tâches
1. Migration `supabase/migrations/0NN_feed_post_photos.sql` :
   - Table `public.feed_post_photos` : `id uuid pk`, `post_id uuid references feed_posts on delete cascade`, `user_id uuid` (= auteur, pour RLS), `storage_path text not null`, `position smallint not null default 0`, `width int`, `height int`, `created_at timestamptz default now()`. Index `(post_id, position)`.
   - **RLS d'abord** : `select` = mêmes conditions de visibilité que le post parent (via `feed_posts`/`feed_posts_for_viewer`) ; `insert/delete` = `auth.uid() = user_id` ET ownership du post. Contrainte : max 4 lignes par post (trigger ou check applicatif documenté).
2. Bucket Storage privé `feed-photos` (ou réutiliser un bucket existant avec préfixe `feed/`). Policies Storage : lecture via URL signée serveur, écriture `auth.uid()` = dossier `feed/<user_id>/<post_id>/<n>.webp`.
3. Mettre à jour la vue `feed_posts_for_viewer` pour exposer les photos (agrégat `array_agg(storage_path order by position)` en colonne `photo_paths text[]`), OU prévoir un fetch séparé dans `getFeedPage` (choix tranché : **agrégat dans la vue**, plus simple côté lecture). Conserver `security_invoker`.
4. Régénérer `lib/types.ts`.

### Critères d'acceptation
- Insérer 2 photos sur un post → `feed_posts_for_viewer.photo_paths` renvoie 2 chemins ordonnés.
- Un user ne peut pas insérer une photo sur le post d'un autre (RLS rejette).
- `anon` ne lit pas les chemins d'un post non visible.

### Garde-fous
- RLS AVANT toute policy. Migrations = nouveau fichier.
- Ne pas réutiliser le bucket `catches` (séparation prise vs post).

## Bloc B — Composer : upload multi + resize + EXIF strip

`components/feed/PostComposer.tsx` permet aujourd'hui d'attacher une prise, pas une photo. On ajoute l'upload direct. Réutiliser la logique de redimensionnement client de `components/forms/PhotoInput.tsx` (déjà utilisée pour les prises).

### Tâches
1. `PostComposer` : `<input type="file" accept="image/*" multiple>` (max 4), preview en grille avec retrait avant envoi, barre de progression.
2. Resize client max 1920px → WebP (réutiliser/extraire le helper de `PhotoInput`). **Strip EXIF (surtout GPS)** : le re-encodage canvas→WebP supprime déjà l'EXIF — le vérifier explicitement (une photo prise au smartphone porte souvent la position GPS ; la laisser fuirait le spot, incohérent avec notre promesse de floutage).
3. `app/actions/feed.ts` → `createPost` : accepter les chemins photos uploadés, insérer dans `feed_post_photos`. Upload Storage côté client (signed upload URL) ou côté action.
4. Garder le partage de prise existant ; un post peut avoir photos **et** prise (ou l'un, ou l'autre, ou texte seul).

### Critères d'acceptation
- Je publie un post avec 3 photos → elles apparaissent dans le fil après envoi.
- Une photo > 1920px est redimensionnée (vérifier le poids/dimensions du fichier en Storage).
- Une photo avec GPS EXIF en entrée → le fichier stocké n'a **plus** de tag GPS (vérifier via `exiftool`/lecture binaire).
- Rate-limit anti-spam existant (`feed.ts`) toujours actif.

### Garde-fous
- Pas de localStorage pour les fichiers. Nettoyer les uploads orphelins si l'envoi échoue.

## Bloc C — PostCard : galerie + lightbox

`PostCard.tsx` n'affiche une image que via `CatchEmbed` (prise). On ajoute la galerie des photos du post.

### Tâches
1. `app/actions/feed.ts` → `getFeedPage` : générer les **URLs signées en batch** pour tous les `photo_paths` de la page (même pattern que les photos de prise déjà signées dans `getFeedPage`). Injecter dans `FeedPost`.
2. `PostCard` : si `post.photo_urls?.length`, afficher une galerie responsive : 1 photo = grand format, 2 = côte à côte, 3+ = grille avec « +N ». Clic → lightbox.
3. Lightbox : réutiliser `components/catches/PhotoLightbox.tsx` (ou `PhotoViewer.tsx`) pour le plein écran + navigation entre photos.

### Critères d'acceptation
- Un post à 1 / 2 / 4 photos s'affiche correctement (layouts distincts), clic = plein écran navigable.
- Les URLs signées sont générées une fois par page (pas par photo en N+1).
- Un post sans photo et sans prise s'affiche normalement (texte seul).

### Garde-fous
- Conserver le `memo` de `PostCard`. `next/image` non requis (bucket signé) mais `loading="lazy"` + dimensions pour éviter le CLS.

## Bloc D — Fiabiliser le partage de prise + meilleur sélecteur

### Tâches
1. Vérifier la robustesse des URLs signées de prise dans `getFeedPage` (l'audit a confirmé que ça marche si la prise a `photo_path`). Ajouter un fallback propre si la signature échoue.
2. Sélecteur de prise dans `PostComposer` : aujourd'hui limité aux 20 dernières (`app/(app)/fil/[department]/page.tsx`). Ajouter une recherche / scroll au-delà de 20.

### Critères d'acceptation
- Partager une prise ancienne (>20e) est possible.
- Une prise sans photo partagée affiche l'encart compact (pas d'image cassée).

## Bloc E — Fluidité réseau (infinite scroll, skeletons, optimiste)

`components/feed/FeedClient.tsx` charge via un bouton « Voir plus » manuel ; pas de skeleton ; création de post/commentaire non optimiste.

### Tâches
1. Remplacer « Voir plus » par un **infinite scroll** (IntersectionObserver sur une sentinelle). Garder un fallback bouton accessible.
2. Skeletons : carte `PostCardSkeleton` au chargement initial du fil et entre pages.
3. Optimiste : insertion immédiate du post publié (`PostComposer`) et du commentaire (`CommentThread`) avec rollback en cas d'échec (le like est déjà optimiste — s'en inspirer).

### Critères d'acceptation
- Le fil charge la page suivante au scroll, sans clic, sans doublon ni saut.
- Un post publié apparaît **instantanément** en tête, confirmé/rollback selon la réponse serveur.
- Skeletons visibles pendant les chargements (pas d'écran blanc).

### Garde-fous
- Ne pas casser le realtime du fil département (sprint 8) ni le `memo` des cartes.

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` + `pnpm build` + `pnpm typecheck` verts.
2. Cocher chaque critère A→E avec preuve.
3. Passe sécurité : RLS `feed_post_photos` (lecture alignée sur la visibilité du post), Storage privé + signé, **EXIF/GPS strippé** (test avec une photo géolocalisée), pas d'orphelins Storage à l'échec.
4. Passe copy : tutoiement, messages d'upload FR, rien de mensonger.
5. Livrer `docs/sprint-13/RECAP.md`.

## Reste manuel John (post-sprint)

- Appliquer migration + créer le bucket Storage si l'agent ne l'a pas fait ; régénérer `lib/types.ts`.
- QA upload réel (smartphone, photo géolocalisée → vérifier non-fuite GPS).
- Merge → `main` + déploiement.
- Penser modération images (hors périmètre v1, « modération libre au lancement » — backlog Claude Vision).
