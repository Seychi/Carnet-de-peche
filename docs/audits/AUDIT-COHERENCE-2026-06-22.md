# 🧩 Audit de cohérence produit — Carnet de Pêche

> Réalisé le 2026-06-22. Méthode : exploration live (mobile, connecté) **+ analyse de code approfondie** (3 agents, lecture de toutes les routes `app/`, `app/actions/`, composants, migrations RLS). Chaque constat est **sourcé `fichier:ligne`**. Objectif : lister **tout ce qui ne fait pas sens** — pas les bugs visuels (voir `AUDIT-MOBILE-UX-2026-06-22.md`), mais les **trous de logique produit**.

## En une phrase

Le produit a une **plomberie solide** (RLS propres, pas de fuite GPS, états vides soignés, guides réels), mais il y a **un découplage central — la prise et le social ne se rencontrent jamais** — et une série de **promesses (surtout payantes) qui mènent dans le vide**. Rien de tout ça n'est une grosse construction : ce sont des **branchements manquants** entre des briques qui existent déjà.

---

## 🔴 LE TROU CENTRAL (ton exemple, confirmé et élargi)

### 1. Une prise « publique » ne vit nulle part socialement, et le carnet des autres est invisible

**Confirmé dans le code.** Le profil public `app/(app)/u/[username]/page.tsx` montre **uniquement** :
- le hero (avatar, bio, dépt, techniques, espèces, compteurs followers) ;
- une section **« Posts »** (lit `feed_posts_for_viewer`, lignes 96-102, 180-199) ;
- **un compteur mort « X prises »** = `count(catches WHERE privacy='public')` (lignes 72-77) — **un nombre, aucune liste**.

Conséquence concrète : **un pêcheur qui logue 200 prises publiques mais ne poste jamais a un profil qui affiche « 200 prises » … et juste en dessous « Aucun post pour l'instant ».** La valeur cœur du produit (le carnet) **n'a aucune surface sociale**. Et `/carnet` est strictement égocentré (`lib/catches/queries.ts:29`, toujours `.eq('user_id', user.id)`) — **aucune route ne permet de voir le carnet d'un autre**.

À quoi sert `privacy='public'` aujourd'hui ? Uniquement à alimenter **passivement** les fiches spot (« prises récentes », `spots/[slug]/page.tsx:74-94`), les fiches espèce (compteur), et le **signal social** des spots (`get_spot_activity`, migration 018 — d'ailleurs **la feature social la plus aboutie**, elle prouve que « prises publiques des autres → UI » **marche déjà**). Mais une prise publique **n'apparaît jamais** dans le fil, ni sur le profil de l'auteur, ni dans un flux chronologique. Pour qu'une prise atterrisse dans le fil, l'auteur doit **en plus** créer un `feed_posts` qui la partage (`feed.ts:103-188`). **La prise et le post sont deux objets totalement découplés.**

**La bonne nouvelle : c'est un branchement, pas une construction.** La plomberie existe déjà (la vue `catches_for_viewer` gère privacy + floutage, les policies `catches_select_public/friends` sont en place, les URLs signées des photos d'autrui se font déjà via `attachPostMedia`). Direction :
- Ajouter une **section/onglet « Prises »** sur `/u/[username]`, lisant `catches_for_viewer` filtré sur `profile.id` (la vue renvoie déjà public, + friends si le viewer suit l'auteur). **Aucune migration, aucune nouvelle RLS.**
- Décider si on veut aussi un **flux de prises** (ex. onglet « Prises près de toi » dans le fil) — c'est ce qui donnerait enfin un sens fort à « passer une prise en public ».

> 🟠 **Bug connexe sur la même page** : `/carnet/[id]/page.tsx` calcule `isOwner` (l.82) mais affiche **« Modifier » + le menu Supprimer sans le gater** (l.98-105). En ouvrant la prise publique d'un autre par lien direct, on voit les boutons d'édition (l'écriture est bloquée par RLS, mais l'UI ment). Fix : `{isOwner && (…)}`.

---

## 🔴 Promesses qui mènent dans le vide (à traiter avant tout passage payant LIVE)

### 2. Aucun système de notifications — alors que c'est vendu
Recherche repo-wide : **zéro infra** (pas de `web-push`/`PushManager`/`expo-notifications`/VAPID, pas de table `notifications`). Or « Notifications push créneaux optimaux » est un bullet du plan **Local** (`tarifs/pricing-cards.tsx:45`). Double problème : (a) **feature payante = vaporware** ; (b) **trou social majeur** — un like, un commentaire, un follow **ne préviennent jamais** personne. Le fil ne peut pas créer de boucle d'engagement (personne ne sait quand on lui répond). → Au minimum : centre de notifications **in-app** (table + badge) avant toute pub payante ; retirer la promesse « push » d'ici là.

### 3. Les signalements partent dans le vide (+ policy sur le mauvais flag)
`reportPost` écrit dans `reports` (`feed.ts:509-548`) et l'UI promet « on regarde les signalements » (`ReportDialog.tsx:58`). Mais **aucune surface ne lit cette table** (pas de `/moderation`, aucun `SELECT from('reports')` d'affichage). Pire : la RLS `reports_select_own_or_mod` est gatée sur **`profiles.is_ambassador`** (`002_rls.sql:211-216`, recopiée `024:481-487`) — **pas `is_moderator`** (le vrai flag, migration 023, celui de John). Donc même un modérateur récupère **0 ligne**. La modération existe (suppression de post via `moderatorDeletePost`) mais elle est **orpheline** : actionnable seulement en tombant par hasard sur le post dans le fil. → Page `/moderation` (liste des reports `pending`, réservée `is_moderator`) + **corriger la policy** pour viser `is_moderator`.

### 4. « Mode hors ligne » promis 3×, inexistant
`tarifs/pricing-cards.tsx:44` + home `page.tsx:522` et `:537`. Le service worker (`public/sw.js:46-55`) **bypasse explicitement `/api/` et `supabase.co`** : il cache la coquille PWA, **jamais les tuiles carte ni les marées**. Le pêcheur qui paie Local pour l'offline « au pied de la falaise » obtient « tu es hors ligne ». → Retirer la promesse **ou** implémenter un vrai precache tuiles + marées par département.

### 5. Différenciateurs « Itinérant » (9,90 €) factices ou mal étiquetés
- **« Bathymétrie SHOM premium »** (`pricing-cards.tsx:58`) : la source est **EMODnet, pas SHOM** (`lib/conditions/bathymetry.ts:4`), c'est **un seul chiffre de profondeur** (pas une couche carte), et c'est **affiché à tout le monde sans gating** (`spots/[slug]/page.tsx:552-562`).
- **« Itinéraires GPS multi-spots »** (`pricing-cards.tsx:59`) : seuls des deep-links **mono-destination** existent (`SpotPopup.tsx:240`), non gatés. « Multi-spots » est fictif.
→ La seule valeur réellement exclusive d'Itinérant est l'accès multi-départements. Retirer/requalifier ces bullets.

### 6. « Stats avancées du carnet » vendues en Local — déjà gratuites
`pricing-cards.tsx:46`. `CatchStatsDetailed` est rendu sur `/carnet` **sans aucun check de tier** (`carnet/page.tsx:116`). Payer Local n'y change rien. → Gater réellement, ou retirer du tarif.

---

## 🟠 Incohérences fonctionnelles & sociales

### 7. Le Follow est presque cosmétique
Suivre quelqu'un déclenche réellement **une seule chose visible** : l'onglet **« Suivis »** du fil filtre les **posts** des suivis (`feed.ts:656-664`). Le vrai payoff — voir les **prises `friends`** d'une personne qu'on suit — **est déverrouillé en base** (RLS `catches_select_friends`, `002:92-100`) mais **n'a aucune UI** (pas de carnet public → cf. #1). Sur le profil lui-même, suivre **ne révèle rien de plus**. → Conséquence directe de #1 : brancher les prises sur le profil donne enfin un sens au Follow.

### 8. Sémantique « amis » incohérente (à trancher)
`follows` est **uni-directionnel** (A suit B). La RLS `friends` accorde la visibilité **dès que le viewer suit l'auteur**, **sans réciprocité** — alors que le schéma (`001:84-89`) et CLAUDE.md parlent d'« amis (follows **mutuels**) ». La copy `/carnet/[id]:31` dit « Visible par tes **abonnés** » (cohérent avec le code, **incohérent** avec le schéma/doc). → Décider : modèle **« abonnés »** façon Insta public (actuel) **ou** **« amis mutuels »** (documenté), puis aligner copy + code + doc.

### 9. Aucune recherche, découverte d'utilisateurs très faible
**Aucune barre de recherche** dans tout le produit (ni user, ni spot, ni pseudo). On atteint un profil **uniquement** en cliquant un nom déjà présent dans le fil. La seule passerelle de découverte = `getFollowSuggestions` (`follow.ts:76-113`) = 5 profils du **même département**, qui **renvoie `[]` si l'utilisateur n'a pas de `home_department`** (l.88). La page `/follows` s'appelle « Trouver des pêcheurs » mais **ne contient pas de recherche** → chicken-and-egg du graphe social, surtout en département peu peuplé. → Recherche par pseudo + vraie page de découverte (récemment actifs, par espèce/technique).

### 10. `/follows` et le Fil mal reliés à la navigation
- **`/follows` n'est lié nulle part** dans la nav (TabBar, Sidebar, UserMenu, mobile-nav) — on n'y arrive que via le CTA d'un état vide (`EmptyFeed.tsx:21`). Une fois le fil rempli, tu ne retrouves plus « tes pêcheurs ».
- Le **`UserMenu`** (dropdown avatar, partagé marketing + app) ne propose **pas le Fil** (`UserMenu.tsx:64-89`). Un connecté **sur une page marketing** n'a aucun chemin direct vers la communauté.
→ Ajouter « Mes pêcheurs » + « Fil régional » au UserMenu / à la sidebar.

### 11. Onboarding ↔ Profil : plusieurs divergences
- **Fréquence de pêche** : mêmes `value` mais **libellés opposés** — onboarding `daily` = « Plusieurs fois par semaine » (`onboarding-step.tsx:42-47`) vs profil `daily` = « Presque tous les jours » (`profile-form.tsx:280-283`).
- **Regex username** divergente : onboarding interdit le point (`onboarding-step.tsx:56`), profil l'autorise (`profil/actions.ts:16`) → `jean.pecheur` refusé à l'inscription, accepté en édition.
- **`years_practicing`** saisi à l'onboarding (`onboarding-step.tsx:582-609`), **jamais ré-éditable** (absent du profil).
- **Onboarding sans validation zod** (`onboarding/actions.ts` fait un `update` brut) là où le profil contraint via `z.enum` → un client peut écrire des valeurs arbitraires.
- **Multi-select** : ≥1 technique/espèce exigé à l'onboarding, **0 toléré au profil** (`profil/actions.ts:21-22` `.optional()`) → on peut se retrouver sans aucune technique, état qui casse filtres/insights.
→ Centraliser les listes (value+label) dans `lib/labels.ts` (déjà à moitié là) + schéma zod partagé.

### 12. Couches carte « avancées » (vent, courants) inexistantes
Implicitement vendues (home `:537`). `MapView.tsx` n'ajoute que le cercle flou + markers/clusters — **aucune couche vent/courant/raster**. Le vent/marée n'existe qu'en cartes texte sur la fiche spot. → Aligner la copy ou implémenter.

---

## 🟡 Mineurs / robustesse

13. **`/guides`** : pas de branche état-vide + « 0 GUIDE » sans pluriel (`guides/page.tsx:71,79-117`) — latent (5 guides aujourd'hui).
14. **`moderation_status`** sur `feed_posts` (`001:105`) : colonne morte, aucun code ne la passe en `pending/flagged` (cohérent avec « modération libre au lancement », à garder pour la modération IA future).
15. États vides **secondaires** en texte nu (`/follows` sections, « Aucun post ») — acceptables, pas cassés.
16. **Liens réseaux sociaux** du footer (`instagram.com/carnetdepeche`, `tiktok`, `youtube`) → à vérifier hors-code que les comptes existent (sinon liens morts).

---

## ✅ Ce qui est sain (à ne pas casser)
- **Aucune fuite GPS** sur ce périmètre : `catches_for_viewer` applique privacy + floutage, `get_spot_activity` n'expose aucune coordonnée.
- **États vides soignés** (carnet, fil, home, carte, profil) avec icône + copy + CTA.
- **Guides réels** (5 MDX longs — la note « guides pas faits » est périmée), **`/especes` honnête** (6 fiches, positionnement assumé vs les 266 creuses du concurrent).
- **Signal social spot** = la preuve que « prises publiques d'autrui → UI » fonctionne déjà.

---

## 🎯 Priorisation

**Lot 1 — Le trou central (fort impact, faible coût, plomberie existante)**
1. Section « Prises » sur `/u/[username]` (#1) → débloque aussi le sens du Follow (#7).
2. Gater `isOwner` sur `/carnet/[id]` (#1 bis).
3. Trancher « abonnés vs amis mutuels » + aligner copy (#8).

**Lot 2 — Promesses payantes (dette de confiance, AVANT pub LIVE)**
4. Notifications in-app a minima (#2) · 5. Page modération + fix policy `is_moderator` (#3) · 6. Retirer/livrer offline (#4), bathy/itinéraires (#5), stats Local (#6).

**Lot 3 — Fondations sociales (rétention)**
7. Recherche utilisateurs + découverte (#9) · 8. Relier `/follows` et le Fil à la nav (#10).

**Lot 4 — Cohérence des formulaires**
9. Aligner onboarding ↔ profil (#11) : labels, regex, zod, champs.

> Tout ça est découpable en un **Sprint 17 — Cohérence produit & social** (au format `docs/BRIEF-TEMPLATE.md`). À combiner ou séquencer avec le **Sprint 16 — Polish mobile & fluidité** (cf. l'autre audit).

*Sources : exploration live mobile + 3 agents d'analyse de code (toutes routes `app/`, `app/actions/`, migrations RLS). Aucun fichier modifié.*
