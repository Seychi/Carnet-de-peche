# Sprint 10.6 — Brief d'exécution
## Cleanup audit Claude-in-Chrome du 2026-06-11

> Rédigé le 2026-06-12. Durée : ~1 semaine (intercalé avant la reprise des Blocs 1-3 du sprint 10).
> Contexte : audit prod complet `docs/audits/AUDIT-2026-06-11-chrome.md` (constats vérifiés dans le code le 2026-06-12, verdicts en fin d'audit). RECAP précédents : `docs/sprint-10.5/RECAP.md`, `docs/sprint-9/RECAP.md`.
> Décisions John 2026-06-12 : exécuter tous les P0/P1/P2 confirmés de l'audit en une phase dédiée.

**Préalable avant de démarrer** (manuel John) :
1. **Supprimer le post arnaque** (fil 06 + profil `testIninerant`) via Supabase Studio — aucune voie admin n'existe encore (RLS `feed_posts_delete_own` = auteur uniquement). SQL : `delete from feed_posts where id = '<id du post gift cards>';` (retrouver l'id via `select id, content from feed_posts where content ilike '%gift%';`).
2. **Arbitrer les 2 comptes seed « payés sans Stripe »** (backlog sprint 9, `supabase/README.md` § anti-traîne). C'est EUX qui expliquent le P0 « pas d'annulation » de l'audit : le Customer Portal est bien branché sur `/compte/abonnement` mais ne s'affiche que si `stripe_customer_id` existe. Recommandation : repasser ces comptes en `discovery` (ou leur créer un customer Stripe test).
3. **Désactiver la toolbar Vercel en prod** (réglage projet Vercel, pas dans le repo) — suspectée par l'audit lui-même d'être la source des overlays INP.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-10.6/BRIEF.md`. Lance les workstreams
> A/B/C/D/E/F en parallèle dès maintenant, respecte les dépendances du tableau, et termine
> par le workstream VERIF avant de me rendre la main. Ne push pas.

---

## Objectif du sprint en une phrase

Zéro constat P0 et P1 de l'audit du 2026-06-11 encore reproductible en prod (hors restes manuels John listés en fin de brief).

## Triage préalable (vérifié dans le code le 2026-06-12)

| Constat audit | Verdict code | Traité par |
|---|---|---|
| Légal dit « paiements à venir » vs Stripe LIVE | ✅ Confirmé (`confidentialite` l.102-156, CGU art 5.3) | WS A |
| Pas d'annulation / portal | ⚠️ Faux positif partiel : portal branché, masqué car compte seed sans `stripe_customer_id` | Préalable John + WS A (découvrabilité) |
| Post arnaque / pas de modération | ✅ Confirmé (rate-limit fréquence seul, aucune voie admin) | Préalable John + WS B |
| Édition prise Conservé→Relâché | ✅ Confirmé (réhydratation `released`) | WS C |
| Pas de validation géo France | ✅ Confirmé (zod lat/lng monde entier) | WS C |
| Filtre dept carte affiche du 56 sous 29 | ⚠️ Partiel : filtre SQL/front corrects, pas de recentrage ; vérifier `department` de Quiberon en base | WS D |
| Carte vide fiches spot | ✅ Confirmé (race init/hauteur conteneur) | WS D |
| Scoring sature à 95-100 | ✅ Confirmé (seuils + amplitude) | WS E |
| `/fil` stub même connecté | ⚠️ Redirection codée mais inopérante en prod (cache probable) | WS F |
| INP 1-5 s | ⚠️ Incertain : toolbar Vercel suspecte + re-renders feed sans memo | Préalable John + WS F |
| Toggle annuel déconnecté | ❌ Infirmé dans le code (rendu identique) | VERIF (re-tester en prod) |
| Direction vent « 0 » | ❌ Code de conversion correct | WS D (reproduire) |
| Copy (loguer, pluriels, 1 clic, couverture) | ✅ Confirmé | WS A/C |

## Workstreams & dépendances

| WS | Périmètre | Durée | Dépend de | Parallélisable jour 1 |
|----|-----------|-------|-----------|----------------------|
| A | Légal + abonnement + copy promesses | 0,5-1 j | — | ✅ |
| B | Modération + anti-spam (migration 023) | 1-1,5 j | — | ✅ |
| C | Carnet : bug édition + validation géo + copy | 1 j | — | ✅ |
| D | Carte & spots : recentrage, mini-carte, header, direction | 1 j | — | ✅ |
| E | Calibration scoring solunar | 1 j | — | ✅ |
| F | Fil & UX : redirect, like, perf, auth, layout | 1-1,5 j | — | ✅ |
| VERIF | Revue finale indépendante | 0,5 j | tous | ❌ (toujours en dernier) |

---

## WS A — Légal, abonnement, promesses produit

Les paiements Stripe sont LIVE depuis le 2026-06-11 mais les documents légaux du sprint 7.5 disent encore « à venir ». Risque juridique immédiat (info de facturation inexacte, RGPD + droit conso). Ne PAS toucher à la logique Stripe elle-même (`app/api/stripe/*`, webhooks) : elle fonctionne.

### Tâches
1. `app/(marketing)/legal/confidentialite/page.tsx` : §3.5 « Données de paiement (à venir) » (l.102-109) → paiements actifs, décrire le réel (Stripe, CB jamais stockée chez nous, données traitées par Stripe Inc.) ; tableau sous-traitants l.139 retirer « (à venir) » ; transferts hors UE l.156 idem.
2. `app/(marketing)/legal/cgu/page.tsx` : art. 5.3 « à compter de l'activation des paiements » → réécrire au présent (essai 7 j avec CB, prélèvement à l'issue, annulation via le portail de gestion).
3. Harmoniser « Annulation en 1 clic » (badge `/tarifs`) vs « en 2 clics » (FAQ) : adopter partout **« Annulation en ligne, sans contact ni justification, depuis ton compte »** (formulation juridiquement sûre, pas de comptage de clics). Fichiers : page tarifs + FAQ + CGU 5.5 si même promesse.
4. Ajouter une entrée **« Mon abonnement »** → `/compte/abonnement` dans le menu utilisateur (dropdown avatar `components/layout/AppHeader.tsx`) ET dans la sidebar app si elle liste le compte.
5. `/tarifs` connecté-abonné : le CTA « Gérer mon abonnement » pointe vers `/compte/abonnement` — OK, garder, mais vérifier que le parcours n'est plus un cul-de-sac une fois les comptes seed arbitrés (préalable John).
6. Copy couverture réelle, home `app/(marketing)/page.tsx` : l.227 `{ v: "100+", l: "spots curés au lancement" }` et l.354 « spots curés · couverture France entière » → remplacer par la réalité datée : **« Spots curés en Bretagne — extension Atlantique en cours »** + compteur honnête (pas de chiffre > réel). La copy « 100+ » reviendra quand la curation sprint 10 l'aura atteint.

### Critères d'acceptation
- `grep -rn "à venir" app/(marketing)/legal/` ne retourne plus aucune occurrence liée aux paiements.
- Aucune occurrence de « 1 clic »/« 2 clics » sur l'annulation : `grep -rn "clic" app/ components/` ne matche plus la promesse d'annulation.
- Le menu utilisateur connecté contient un lien vers `/compte/abonnement` (vérifiable dans le JSX d'AppHeader).
- `grep -n "100+" app/(marketing)/page.tsx` ne retourne plus rien ; aucune mention « France entière » pour les spots.

### Garde-fous
- Ne pas toucher : `app/api/stripe/**`, `lib/stripe*`, webhooks, migration 021.
- ⚠️ DEMANDER À JOHN AVANT : si une reformulation légale dépasse la simple mise à jour factuelle (ex. modifier les durées de conservation).

---

## WS B — Modération minimale + anti-spam

Un post arnaque (gift cards + code + « contact us ») est passé : le rate-limit du Bloc 0 (10 posts/24 h, migration 022) ne filtre que la fréquence, pas le contenu, et aucune voie admin de suppression n'existe (RLS `feed_posts_delete_own` = auteur uniquement, `app/actions/feed.ts` `deletePost` filtre `author_id`). La table `reports` existe déjà (statuts pending/resolved/dismissed). Pas de modération IA : hors périmètre v1.

### Tâches
1. **Migration `supabase/migrations/023_moderation.sql`** (nouveau fichier, ne pas éditer les anciennes) :
   - `alter table profiles add column is_moderator boolean not null default false;`
   - Policy delete sur `feed_posts` et `feed_comments` : auteur OU `exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator)`.
   - Policy update `reports.status/resolved_by` pour les modérateurs.
   - RLS reste activé partout (règle 3 de `CLAUDE.md`).
2. Régénérer `lib/types.ts` après migration.
3. `app/actions/feed.ts` : nouvelle Server Action `moderatorDeletePost(postId)` (et commentaire équivalent) — vérifie `is_moderator` côté serveur, loggue dans `reports` (status `resolved`, `resolved_by`), supprime. Bouton « Supprimer (modération) » visible dans `components/feed/PostCard.tsx` uniquement si le viewer est modérateur.
4. **Filtre anti-spam minimal à la création** (`createPost`/`addComment` dans `app/actions/feed.ts`, côté serveur) :
   - Rejet si > 1 URL dans le contenu.
   - Rejet sur patterns spam évidents (insensible casse) : `gift card`, `coupon code`, `promo code`, `whatsapp \+?\d`, `telegram @`, suites type code promo `[A-Z]{2,}-[A-Z0-9]{4}(-[A-Z0-9]{4})+`.
   - Message d'erreur zod en français, tutoiement : « Ton message ressemble à du spam. Si c'est une erreur, reformule sans lien ni code promo. »
   - Les rejets ne sont PAS silencieux (règle erreurs `CLAUDE.md` §6).
5. Tests Vitest : patterns bloqués (le post arnaque réel de l'audit doit être rejeté), faux positifs évités (un post avec 1 lien vers un article météo passe), suppression modérateur OK / refusée pour non-modérateur.

### Critères d'acceptation
- Le texte exact du post arnaque de l'audit (« Gift Cards #1 — Genuine Code: OP-SBNG-TFBC — Please contact us… ») rejeté par `createPost` avec erreur FR propre (test Vitest).
- Un utilisateur avec `is_moderator=false` qui appelle `moderatorDeletePost` reçoit une erreur ; avec `true`, le post disparaît et une ligne `reports` resolved est créée (tests).
- `pnpm test` vert ; aucune table sans RLS (vérifier la migration).
- Régression interdite : `deletePost` auteur et rate-limits 10/50 inchangés.

### Garde-fous
- ⚠️ DEMANDER À JOHN AVANT : qui passe `is_moderator=true` (John seul ? John + César ?) — la migration ne flagge personne par défaut.
- Ne pas toucher : policies de lecture du fil (vue `feed_posts_for_viewer`), Realtime (migration 020).
- Pas d'appel Claude API / modération IA (explicitement OUT v1).

---

## WS C — Carnet : bug édition, validation géo, copy

Deux bugs confirmés qui polluent le cœur du produit (le carnet alimente le scoring perso). Le formulaire est par ailleurs excellent (audit) — ne pas le refondre, corriger chirurgicalement.

### Tâches
1. **Bug Conservé→Relâché** : `lib/catches/actions.ts` l.~152 (`if (data.released !== undefined)`) + `components/catches/CatchForm.tsx` — en édition, `released` n'est pas réhydraté dans les defaultValues, repart à sa valeur par défaut et écrase la valeur en base. Fix : initialiser `released` depuis la prise existante en mode édition, et côté action n'updater le champ que s'il est réellement soumis. Test Vitest : édition de l'espèce seule ne modifie pas `released`.
2. **Validation géo France métropolitaine** : `lib/catches/schema.ts` (l.42-43) — ajouter une bbox France métro + bande côtière (lat 41,0→51,5 ; lng −5,8→9,9). Comportement (pré-arbitré) : hors bbox → la prise reste enregistrable mais (a) avertissement UI clair « Position hors France métropolitaine — conditions et score non calculés », (b) PAS d'appel `fetchConditionsAt` (`lib/catches/actions.ts` l.~50), (c) flag `out_of_coverage` dans le jsonb `conditions` pour exclusion du scoring (`lib/solunar`/cron `compute-spot-scores` : ignorer ces prises).
3. **Pluriels** : `components/catches/CatchStatsRow.tsx` l.25 « 1 prises au total » → singulier/pluriel correct. Vérifier le « double comptage » suspecté par l'audit : le carnet affichait 2 prises mais « pas encore assez de données » — contrôler que le compteur et le seuil du scoring perso lisent la même source.
4. **Copy « loguer »** (pré-arbitré : graphie **« loguer / logué(e) »**, cohérente avec la tagline « Logue. Partage. Progresse. ») : corriger les 6 occurrences mixtes trouvées (`app/(app)/home/page.tsx`, `components/catches/CatchForm.tsx`, pages marketing) — `grep -rniE "logg" app/ components/` doit retourner zéro résultat UI.

### Critères d'acceptation
- Test Vitest : update partiel d'une prise ne touche jamais `released`.
- Test Vitest schema : (48.0, −4.7) accepté avec conditions ; (27.4, 33.67) accepté sans conditions + flag `out_of_coverage` ; messages zod en français.
- « 1 prise au total » au singulier (test ou capture).
- `grep -rniE "\blogg" app/ components/` → 0 occurrence.

### Garde-fous
- Ne pas toucher : contrôles de confidentialité (precise_for_friends / reveal_precise_to_public), conversion WebP, vue `catches_for_viewer`.
- ⚠️ DEMANDER À JOHN AVANT : si tu préfères un refus strict hors France plutôt que l'enregistrement flaggé (le brief pré-arbitre l'enregistrement flaggé pour ne pas perdre les prises des utilisateurs en déplacement).

---

## WS D — Carte & spots

Le filtre département est correct côté SQL et front (vérifié), mais il manque le recentrage, et la mini-carte des fiches spot ne rend pas ses tuiles. Le fix `map.resize()` du sprint 9.5 (T0.4) est dans `MapView` mais la fiche spot souffre probablement d'une race init/hauteur de conteneur.

### Tâches
1. **Recentrage département** : `components/map/MapShell.tsx` — au changement de filtre département, `flyTo` vers le centroïde (`lib/geo/department-centroids.ts`) avec un zoom adapté.
2. **Donnée Quiberon** : vérifier en prod `select name, department from spots where slug like '%quiberon%';` — si `department='29'`, corriger la donnée (pas de migration, fix data) ; si `'56'`, le constat audit était un effet du non-recentrage uniquement → documenter dans le RECAP.
3. **Mini-carte fiche spot** : `components/spots/SpotMiniMap.tsx` + `app/(marketing)/spots/[slug]/page.tsx` (conteneur `height: 280`, l.376-391) — fiabiliser l'init (s'assurer que le conteneur a une hauteur CSS définie avant `new Map`, déclencher `map.resize()` post-mount via le ResizeObserver existant de `MapView`, vérifier la clé MapTiler côté pages marketing). Reproduire d'abord en local pour confirmer la cause exacte.
4. **Header `/spots`** : `app/(marketing)/spots/page.tsx` l.295-301 — fusionner en une ligne « Finistère · 8 spots » (garder le pluriel conditionnel existant).
5. **Direction vent « 0 »** : le code de conversion degrés→cardinal est correct dans `WeatherGrid.tsx`, `WavesCard.tsx`, `AppInstruments.tsx` (vérifié). Reproduire en local le rendu « VENT 0 2 » / « Direction 0 (273°) » : chercher un chemin d'affichage qui rend la valeur brute au lieu d'appeler `compass()`/`degreesToCompass()` (probable composant dashboard ou fiche spot qui passe `wind_direction_deg` directement). Corriger le chemin fautif trouvé ; si non reproductible, le noter au RECAP avec preuve (capture locale).

### Critères d'acceptation
- Sélection « 29 » sur `/carte` → la vue se recentre sur le Finistère (flyTo observable, test manuel + code review).
- `/spots/anse-de-terenez` : tuiles visibles au premier chargement (capture locale).
- Requête SQL Quiberon documentée au RECAP avec verdict.
- Plus aucun affichage de direction sous forme de degré brut « 0 » : revue de tous les usages de `wind_direction_deg`/`wave_direction` dans `components/`.
- Régression interdite : gating Discovery (pin flouté cliquable du 9.5 T0.3) intact.

### Garde-fous
- Ne pas toucher : RPC `nearby_spots`, vue `spots_for_viewer`, logique de floutage 1 km.

---

## WS E — Calibration du scoring « Meilleurs moments »

6 jours sur 7 notés « 100 · Exceptionnelle » : le différenciateur produit perd toute crédibilité. Causes diagnostiquées : seuil `exceptionnelle` bas (90), amplitude négative quasi nulle (vent fort = min 0.2, marée absente = 0.5 neutre), bonus lune qui saturent.

### Tâches
1. `lib/solunar/config.ts` + `lib/solunar/scoring.ts` (l.156-162) : recalibrer —
   - seuil `exceptionnelle` 90 → **95**, resserrer `tres_bonne` (75 → 80) ;
   - étendre l'amplitude négative : vent > 25 km/h doit pouvoir tirer la composante vers 0 (pas plancher 0.2), absence de données marée → composante 0.35 max au lieu de neutre 0.5 ;
   - plafonner le cumul des bonus solunaires pour que « exceptionnelle » exige la conjonction de TOUS les facteurs (événement solunaire fort + marée favorable + vent idéal).
2. **Test de distribution** dans `lib/solunar/__tests__/scoring.test.ts` : sur un échantillon synthétique de 7 jours × 24 créneaux × conditions variées, exiger `exceptionnelle ≤ 10 %` des créneaux et au moins 20 % sous `bonne`. C'est le critère qui empêche la régression future.
3. Mettre à jour les badges/justifications si des seuils sont affichés en dur côté UI.

### Critères d'acceptation
- Test de distribution vert (≤ 10 % exceptionnelle sur l'échantillon synthétique).
- Les tests existants ajustés en conséquence, suite complète verte.
- Sur Anse de Térénez en local : le calendrier 7 jours affiche une palette variée (capture au RECAP).

### Garde-fous
- Ne pas toucher : le scoring personnalisé (sprint 7, mode descriptif) ni le cron `compute-spot-scores` — uniquement le solunar générique.
- ⚠️ DEMANDER À JOHN AVANT : si la recalibration implique de changer les libellés de badges visibles (Faible/Bonne/Très Bonne/Exceptionnelle).

---

## WS F — Fil, perf, UX diverses

Série de fixes indépendants confirmés dans le code. La perf INP est à traiter en deux temps : d'abord les causes côté code (re-renders feed), la toolbar Vercel étant retirée par John en parallèle (préalable).

### Tâches
1. **`/fil` connecté** : `app/(marketing)/fil/page.tsx` (l.37-52) — la redirection vers `/fil/{home_department}` existe mais ne s'exécute pas en prod (page probablement servie statique). Ajouter `export const dynamic = 'force-dynamic'` (la page lit `auth.getUser()`, elle ne peut pas être statique) et vérifier le comportement connecté/anonyme.
2. **Compteur like** : `components/feed/PostCard.tsx` (l.44-78, 182) — incrémenter/décrémenter `likeCount` dans l'update optimiste du clic (pas seulement `liked`), et dédupliquer avec l'event Realtime entrant (ignorer le delta si l'event correspond à sa propre action, ex. via un flag local).
3. **Perf feed** : `React.memo` sur `PostCard`, `useCallback` sur les handlers, et regrouper les abonnements Realtime par liste (un channel pour la page, pas un par post) si le refactor reste contenu — sinon documenter au RECAP pour un chantier dédié. Mesurer avant/après avec le profiler React en local.
4. **Bouton « Me déconnecter »** : `app/(app)/home/sign-out-button.tsx` l.25 — retirer `w-full` (ou `shrink-0` + largeur auto).
5. **Email reset pré-rempli** : `app/auth/login/page.tsx` (l.370, 410) — au clic « Mot de passe oublié ? », copier l'email saisi du state signin vers le state reset.

### Critères d'acceptation
- Connecté, `GET /fil` → 307 vers `/fil/<dept>` (vérifiable en local avec un compte test) ; anonyme → teaser inchangé.
- Liker son propre post affiche « 1 » immédiatement, sans double incrément après l'event Realtime (test manuel cross-onglets + revue code).
- `PostCard` memoïsé : un like sur un post ne re-rend pas les autres cartes (React DevTools profiler, preuve au RECAP).
- Bouton déconnexion à largeur naturelle (capture).
- L'email tapé sur le login se retrouve pré-rempli dans le formulaire reset.
- Régression interdite : Realtime du fil fonctionne toujours (nouveau post visible cross-onglets).

### Garde-fous
- Ne pas toucher : Server Actions du fil hors `feed.ts` anti-spam (WS B s'en charge), RPC `get_feed_unread_counts`.
- Ne pas introduire de virtualisation lourde (react-window etc.) sans accord John — hors périmètre.

---

## Workstream VERIF (obligatoire, agent indépendant)

1. `pnpm test` (suite complète verte, y compris nouveaux tests B/C/E) + `pnpm build` (OK).
2. Relire chaque critère d'acceptation des WS A→F et cocher ✅/❌ avec preuve (commande, extrait, capture).
3. Passe sécurité : migration 023 → RLS jamais désactivé, policies modérateur minimales ; aucune écriture qui contourne `*_for_viewer` ; pas de secret commité ; `lib/types.ts` régénéré après 023.
4. Passe copy : tutoiement partout, zod en français, plus aucune promesse mensongère (paiements, couverture spots, « 1 clic »).
5. Re-tester les 2 constats infirmés : toggle annuel `/tarifs` déconnecté (le code semble correct — vérifier en local nav privée) et direction vent « 0 » (cf WS D.5) ; consigner le verdict.
6. Livrer `docs/sprint-10.6/RECAP.md` : fait / comment tester / reste manuel John.

## Reste manuel John (post-sprint)

- Les 3 préalables s'ils ne sont pas déjà faits : suppression du post arnaque (ou via le bouton modération du WS B une fois `is_moderator` activé sur ton compte), arbitrage des 2 comptes seed sans Stripe, désactivation de la toolbar Vercel.
- Appliquer la migration 023 en prod (Studio ou `supabase db push`) puis flagger ton compte : `update profiles set is_moderator = true where id = '<ton uuid>';`.
- Re-mesurer l'INP en prod APRÈS retrait de la toolbar Vercel — si les blocages > 500 ms persistent, ouvrir un chantier perf dédié.
- QA manuelle des parcours abonnement (compte avec vrai `stripe_customer_id` : portal, annulation, factures).
- Relecture → merge → déploiement. **Pas de push sans validation.**

---

*Checklist template vérifiée : ligne de lancement ✅ · blocs autonomes ✅ · parallèle maximisé (6 WS jour 1) ✅ · critères vérifiables ✅ · décisions tranchées ou ⚠️ ✅ · VERIF en dernier ✅ · invariants rappelés ✅.*
