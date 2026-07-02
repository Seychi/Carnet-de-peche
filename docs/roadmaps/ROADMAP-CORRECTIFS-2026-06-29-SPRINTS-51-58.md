# 🗺️ Roadmap correctifs (sprints 51 → 58) — Carnet de Pêche

> **Date** : 2026-06-29 · **Auteur** : Claude · **Pour** : John
> **Objet** : séquencer en sprints **100 % des findings** des trois audits récents, étape par étape, sans en perdre un seul.
> **Sources** : `docs/audits/AUDIT-2026-06-28-SITE-COMPLET.md` + `docs/audits/AUDIT-2026-06-29-SITE-COMPLET-POST-S50.md` + `docs/audits/AUDIT-2026-06-29-ADDENDUM-PROFONDEUR.md`.
> **Principe directeur** : on corrige dans l'ordre **argent/confiance/sécurité → bugs visibles → données → structure → partage → a11y/copy → perf/SEO → nettoyage**. Chaque sprint finit par une passe de vérification (`/verif-sprint` : tests + build + lint + types + revue croisée + anti-régression).

---

## 0. Prérequis (avant de coder)

- **Réparer le dépôt local** : l'index git est corrompu (`fatal: unknown index entry format`). `del .git\index.lock` (si présent) → reconstruire (`git restore .` après backup, ou `git read-tree HEAD`) → `pnpm install && pnpm build` au vert. La **prod est saine** (HEAD `7c23f5c` = sprint-50).
- **Rappel discipline** : toute migration = **fichier numéroté** (`supabase/migrations/NNN_*.sql`, prochain libre = **091**) + regen `lib/types.ts`. Pas de SQL destructif sans validation. Pas de push sans ton feu vert.

---

## 1. Invariants (tenus à chaque sprint)

Zéro coordonnée GPS exposée (partage, chat, co-pêchage, classements) · RLS d'abord · migrations numérotées + regen types · scoring descriptif jamais prédictif · honnêteté des données (pas de chiffre inventé) · **pas de tiret cadratin « — » dans la copy visible** · floutage GPS 3 couches · conformité RGPD · pas de push sans validation John. (Note ADN : le pivot « dopamine/compétition » du 2026-06-28 autorise leaderboards/XP/streaks publics **sans** fuite de spot.)

---

## 2. Vue d'ensemble

| Sprint | Thème | Nature | Effort | Risque si non fait |
|---|---|---|---|---|
| **51** | Argent, confiance & sécurité | 🔴 P1 | ~2-3 j | tier corrompu, double facturation, harcèlement, push qui ment |
| **52** | Bugs visibles & liens cassés | 🟠 P1/P2 | ~2-3 j | 404, légende fantôme, modération KO |
| **53** | Données & saisies | 🟠 P2 | ~2-3 j | espèces invisibles, dates futures, doublon username |
| **54** | Navigation, résilience & auth | 🟠 P2 | ~2-3 j | pages inatteignables, écrans blancs, beta contournable |
| **55** | Le partage, beau (cartes OG) | 🟠 P1-visuel | ~3-4 j | partage moche = viralité cassée |
| **56** | Accessibilité & copy | 🟡 P2/P3 | ~3-4 j | a11y AA, tic IA visible, agréments FR |
| **57** | Performance & SEO | 🟡 P2/P3 | ~2-3 j | carte lente (TBT ~3,9 s), SEO sous-exploité |
| **58** | Nettoyage, polish & vérif finale | 🟢 P3 | ~2 j | dette, code mort, détails |

> **Lane parallèle** : le **curage des 942 imports OSM** (panneau modération, lane ops S43) continue en fond, indépendant de ces sprints.

---

## 3. Checklist exhaustive de couverture (finding → sprint)

**Aucun finding n'est laissé de côté.** ID = ceux des audits.

| ID | Finding | Sprint |
|---|---|---|
| 1.1 | Stripe `paused` → crash webhook + retry infini + tier figé | 51 |
| 1.2 | `trial_converted` + email « Paiement reçu » à chaque renouvellement | 51 |
| B1 | `outing_reviews` RLS tautologique → noter n'importe qui | 51 |
| A1 | Push « fenêtre optimale » affiché « Activé » aux gratuits | 51 |
| A4 | Copy toggle push maître « Réservé aux abonnés » (gouverne le gratuit) | 51 |
| A2 | Libellés notifs système « Un pêcheur a interagi avec toi » | 51 |
| A3 | `hrefFor()` notifs système → `/fil` au lieu de la bonne page | 51 |
| C1 | Auto-confirmation de son propre spot | 51 |
| C | Légende « Zone active » + « Importé » fantômes | 52 |
| I | 6 chips espèces à 0 résultat + toggle « Importés (OSM) » mort | 52 |
| E | Modération : `ActionResult` avalé (échec silencieux) | 52 |
| — | Filtre modération `'osm'` jamais stocké → vide | 52 |
| — | Lien cassé `/spots/mes-propositions` → `/spot/` (404) | 52 |
| — | UUID malformé `/carnet/[id]` → 500 au lieu de 404 | 52 |
| K | Partage : description « dans 17 . » (département non trimé) | 52 |
| L | `/techniques` stub lié + `/spots` sans lien vers `/carte` | 52 |
| D | 6 espèces (barracuda, tassergal, liche, marbré, lieu-noir, merlan) sur 0 spot | 53 |
| J | `alose` (3 spots sans fiche) + `stickbait` (technique non canonique) | 53 |
| — | Username dupliqué + unicité case-insensitive | 53 |
| — | Prises/sorties datables dans le futur ; proposition co-pêchage dans le passé | 53 |
| — | Bornes `measured_length_cm` UI (1-299) vs zod (10-250) + pas de réconciliation `size_cm` | 53 |
| C2 | Niveaux `communaute`/`ambassadeur` morts (verif_level = `equipe` only) | 53 (décision) |
| F | Orphelins nav : proposer / mes-propositions / mes-sorties | 54 |
| — | Aucun `error.tsx`/`loading.tsx` hors `/carnet` | 54 |
| — | PWA `start_url:'/home'` auth-gated → redirection login | 54 |
| — | Google OAuth contourne `INVITE_ONLY` + consomme le code avant succès | 54 |
| — | Realtime fil/chat sans gestion reconnect ; pagination fil sans tie-breaker | 54 |
| G | Cartes de partage **format story** cassées (débordement/chevauchement) | 55 |
| H | OG image : aucune police chargée (gras plat) | 55 |
| G2 | « 1 » parasite sur la carte paysage | 55 |
| N(a) | `/c/[slug]` : emoji bruts (📏⚖️🌊) au lieu d'icônes | 55 |
| — | `peche/[...slug]` sans OG image dédiée (plus grosse surface SEO) | 55 |
| — | Schema Article fiches espèces : `dateModified` en dur, sans `datePublished`/`image` | 55 |
| — | (Décision) activer les cartes `recap` (Wrapped) / `records` dormantes | 55 |
| — | a11y : champs sans label (OutingComposer, CatchForm), PhotoLightbox sans dialog/focus | 56 |
| — | a11y : pas de skip-link, Header sans `aria-current`, fil sans `role`/`aria-live`, titres cockpit en `<span>` | 56 |
| — | a11y : contrastes < AA (`text-ink-300`, libellé saison `text-gold-500`) | 56 |
| — | Copy : tiret cadratin dans le CTA héro (`Hero:243`, `HomeSections:456`, `species-score:129`) | 56 |
| — | Copy : `PokedexGrid` « capturée » (genre) ; `GuideLayout` tronque l'espèce | 56 |
| N(b) | Typo « Loggue » (double g) sur les fiches espèces | 56 |
| — | Microcopy FR : apostrophes mixtes, espace insécable, `WeatherGrid` hors mono, numérotation « 02 » manquante | 56 |
| 1.3/P | Perf carte : root cause `useDeferredMount` (init MapLibre dans la fenêtre TBT) | 57 |
| — | Perf : `posthog-js` eager avant consentement ; heatmap ON par défaut refetch ; 3 graisses mono sur `/carte` | 57 |
| — | SEO : `<title>` espèces trop longs ; `tarifs` Product schema (price:0/AggregateOffer) ; `/spots?…` auto-canonical hors sitemap ; `WebSite` sans `SearchAction` | 57 |
| M | Advisors : FK non indexées (nouvelles tables) ; policies permissives ; `spatial_ref_sys` | 58 |
| B2 | Chat co-pêchage non fermé sur sortie passée/`done` | 58 |
| — | Détails : `city` sans `maxLength`, composer fil sans compteur, libellé notif non tronqué | 58 |
| — | Code mort : `map/utils`, `home-stats`, `brittany-coast` + `home-visuals`, `badges/streaks` orphelins | 58 |
| — | Data : 5/17 profils non onboardés / sans `home_department` (nettoyage seed) | 58 |

---

## 4. Sprint 51 — « Argent, confiance & sécurité » 🔴

**Objectif** : éteindre les bugs qui touchent à l'argent, à la facturation, à la sécurité des avis et à l'honnêteté du push. Tous faibles en effort, élevés en enjeu.

- **1.1 Stripe `paused`** : ajouter `'paused'` au CHECK de `subscriptions.status` (migration **091**) OU clamper les statuts inconnus (`paused`→`past_due`) avant upsert (`lib/stripe/events.ts:114,128`). Regen `lib/types.ts`. Test : event `customer.subscription.updated` status=paused → 200 + ligne à jour.
- **1.2 Renouvellements** : gater `trackServer('trial_converted')` + `PaymentSuccessEmail` sur `inv.billing_reason === 'subscription_create'` (`lib/stripe/events.ts:330-348`). Test : 2e `invoice.payment_succeeded` → pas de 2e conversion ni 2e email.
- **B1 `outing_reviews`** : qualifier la clause RLS `op.proposal_id = outing_reviews.proposal_id` (migration **092**, `087:58`). Test : un user ne peut noter qu'un participant de SA sortie passée.
- **A1/A4 Push honnête** : gate tier UI sur `optimal_window` (masquer/désactiver pour non-abonnés) (`NotificationTypeToggles.tsx:96`) + reformuler la copy du toggle maître en interrupteur global (`PushSettingsToggle.tsx:24-31`).
- **A2/A3 Libellés notifs** : ajouter les `case` `big_tide`/`species_closure`/`weekly_digest`/`followed_catch`/`nearby_outing` dans `describe()` + `hrefFor()` (`app/(app)/notifications/page.tsx:21-57,103-127`).
- **C1 Auto-confirm** : exclure `created_by` dans `confirmSpot` + `with check` joignant `spots.created_by <> auth.uid()` (`app/actions/spots.ts:228`, migration **093**).

**Critères d'acceptation** : webhook 200 sur `paused` ; pas de double email/analytics au renouvellement ; review impossible hors sortie ; gratuit ne voit plus « fenêtre optimale : Activé » ; notifs système bien libellées et bien routées ; auto-confirm bloqué. **Dépendances** : aucune.

---

## 5. Sprint 52 — « Bugs visibles & liens cassés » 🟠

**Objectif** : tout ce qu'un utilisateur voit casser ou incohérent (hors image de partage).

- **C Légende** : supprimer le bloc « Zone active » (`MapLegend.tsx:~63-70`) ; retirer/requalifier « Importé » + « Communauté » tant qu'aucune donnée ne les produit.
- **I Toggle/chips morts** : retirer ou griser le toggle « Importés (OSM) » tant que la curation n'approuve rien ; piloter les chips espèces sur les espèces réellement présentes (ou griser les 6 à 0 spot). `MapFilters.tsx`.
- **E Modération** : surfacer le résultat (`if(!res.ok) throw`/toast) sur les 8 wrappers (`moderation/page.tsx:72-103`) + traiter « post déjà supprimé » comme succès et résoudre le signalement (`app/actions/feed.ts:~475,~518`).
- **Filtre modération `'osm'`** : retirer `'osm'` du whitelist + chip (`moderation/page.tsx:480,635`).
- **Lien 404** : `/spots/mes-propositions:102` → `href={\`/spots/${p.slug}\`}` (pluriel).
- **UUID `/carnet/[id]`** : `getCatchById` → `if (error.code==='22P02') return null` (`lib/catches/queries.ts:57`).
- **K « dans 17 . »** : `.trim()` au lookup `deptLabel` (`c/[slug]/page.tsx:81-84`) + à la source (`share.ts:362`).
- **L Nav** : masquer/relibeller « Techniques » tant que stub (`Footer:37`, `MoreMenu:45`) ; ajouter « Voir sur la carte » sur `/spots` + `/spots/[slug]`.

**Critères** : 0 lien 404, légende = couches réelles, modération qui confirme/échoue visiblement. **Dépendances** : aucune.

---

## 6. Sprint 53 — « Données & saisies » 🟠

**Objectif** : fermer les trous de données et de validation.

- **D 6 espèces** : migration **094** `tag_sprint29_species.sql` (append-only idempotent), par listes de slugs curées (lieu-noir/merlan = Manche-Atlantique rocheux/sableux ; barracuda/tassergal/liche/marbré = Méditerranée+Corse). Listes à valider par John (cf candidats dans l'audit 28/06).
- **J `alose`/`stickbait`** : retirer `alose` des 3 spots (`array_remove`) OU créer la fiche (décision) ; normaliser `stickbait`→`leurres` (5 spots). Migration **095**. Corriger le commentaire faux `seed-spots-lot-8.sql:32`.
- **Username dupliqué** : index unique case-insensitive sur `profiles.username` (citext ou `lower()`), migration **096** + nettoyage du doublon.
- **Gardes de date** : borne haute `caught_at` (input `max` + refine zod, `CatchForm.tsx:1117`, `lib/catches/schema.ts:54`) ; borne haute `started_at` solo (`lib/outings/schema.ts:11`) ; borne basse `planned_at` co-pêchage (`lib/cofishing/schema.ts:25`).
- **Bornes mesure** : aligner `measured_length_cm` UI (`CatchForm.tsx:760`) sur zod (10-250) + bloquer « Prise mesurée » si champs vides + réconcilier `size_cm` ↔ `measured_length_cm`.
- **C2 Niveaux de vérif (décision)** : soit câbler `communaute`/`ambassadeur` (depuis `spot_confirmations`, post-fix C1), soit retirer le code mort + la légende correspondante.

**Critères** : les 6 espèces ont des spots et passent le filtre/la fiche ; impossible de loguer une date future ; username unique. **Dépendances** : C1 (sprint 51) avant de brancher les niveaux de vérif.

---

## 7. Sprint 54 — « Navigation, résilience & auth » 🟠

**Objectif** : rendre toutes les pages atteignables et l'app robuste aux erreurs.

- **F Orphelins** : ajouter un groupe « Contribuer / Mes spots » (Proposer un spot + Mes propositions) dans `MoreMenu.tsx` + `AppSidebar.tsx` ; dé-gater « Mes sorties » (`carnet/page.tsx:137` retirer `totalOutings>0`, afficher un état vide) ; étendre `nav-reachability.test.ts` (`REQUIRED_DESTINATIONS` + ces routes).
- **error/loading** : ajouter au moins un `error.tsx` + `loading.tsx` partagés par groupe `(app)` (carte, fil, sorties, notifications, follows, home, profil, moderation, u/[username]) + `especes/[slug]`.
- **PWA** : `start_url` → `/` (ou `/carte`) dans `manifest.webmanifest`.
- **Google OAuth + invite** : appliquer le gate `INVITE_ONLY` post-OAuth (`app/auth/callback/route.ts`) ou masquer le bouton Google tant que le flag est ON ; valider le code **sans le consommer** puis le consommer seulement au succès (`auth/login/actions.ts:235,283`).
- **Resilience realtime/pagination** : inspecter `SUBSCRIBED`/`CHANNEL_ERROR` + reconnect (`useFeedRealtime`, `useOutingChatRealtime`) ; ajouter `id` comme clé secondaire de curseur fil (`app/actions/feed.ts:729`).

**Critères** : chaque route atteignable depuis une surface persistante ; une erreur serveur garde la nav ; PWA déconnectée tombe sur une page utile. **Dépendances** : aucune.

---

## 8. Sprint 55 — « Le partage, beau » 🟠 (cartes OG)

**Objectif** : rendre le partage réellement partageable (c'est la munition viral de César).

- **G Format story** : layout dédié 1080×1920 (largeur contrainte, `flexWrap`, taille de police adaptative + troncature `…`, contenu réparti sur la hauteur) (`app/og/card/[slug]/route.tsx`, `lib/og/template.tsx`).
- **H Polices** : `lib/og/fonts.ts` qui `fetch` Space Grotesk / Inter / JetBrains Mono → tableau `fonts` dans les 5 `ImageResponse`. Restaure les gras + la règle « chiffres en mono ».
- **G2 « 1 » parasite** : traquer le reliquat de rendu en haut-droite de la carte catch paysage (`route.tsx`).
- **N(a) Emoji recap** : remplacer 📏⚖️🗓️🌊🌡️ par les icônes Lucide sur `/c/[slug]`.
- **SEO partage** : `peche/[...slug]/opengraph-image.tsx` par page (espèce+technique+dépt) ; schema Article fiches espèces avec `datePublished`+`dateModified` dérivés d'un `verifiedAt` par `EspeceContent` + `image` (`especes/[slug]/page.tsx:116`).
- **(Décision) Wrapped/records** : activer les CTA `recap`/`records` (cartes dormantes) ou les laisser pour plus tard.

**Critères** : carte story belle et lisible (rendu vérifié desktop), texte net (polices), `og:image` dédiée sur les pages SEO. **Dépendances** : K (sprint 52, « 17 . ») idéalement déjà fait.

---

## 9. Sprint 56 — « Accessibilité & copy » 🟡

**Objectif** : viser AA et éliminer les tics de copy.

- **a11y labels** : associer labels/ids `OutingComposer.tsx:83,91` + `CatchForm.tsx:661/805/1151/1044/1057` ; `PhotoLightbox.tsx:29` en vrai `role="dialog"` + focus trap (calquer `PhotoGalleryLightbox`).
- **a11y structure** : skip-link global ; `aria-current` `Header.tsx:43` + `mobile-nav.tsx:73` ; `role="feed"`/`aria-live` `PostList.tsx:67` ; titres cockpit `<h2>` `home-ui.tsx:42` ; `aria-label` sur le canvas carte.
- **a11y contrastes** : remonter `text-ink-300` en texte réel (StreakCard/PokedexGrid/CatchGrid/PostComposer) ; libellé saison `text-gold-500` → variante lisible.
- **Copy tiret cadratin** : `Hero.tsx:243`, `HomeSections.tsx:456`, `species-score.tsx:129` → virgule/parenthèses/deux-points.
- **Copy genre/troncature** : `PokedexGrid.tsx:84` dériver « capturé(e) » du champ `gender` ; `GuideLayout.tsx:117` libellé espèce complet.
- **N(b) Typo** : « Loggue » → « Logue » (fiches espèces).
- **Microcopy FR** : apostrophes typographiques homogènes (FAQ `tarifs:82,90`, `HomeSections:370`) ; espace insécable avant `? ! :` + guillemets (helper partagé) ; `WeatherGrid.tsx:80-100` métriques secondaires en `font-mono` ; combler la numérotation « 02 » (`HomeSections.tsx`).

**Critères** : `node scripts/lint-copy-dashes.mjs` propre sur la copy visible ; axe-core/lighthouse a11y sans erreur bloquante sur home/carnet/carte/fiche. **Dépendances** : aucune.

---

## 10. Sprint 57 — « Performance & SEO » 🟡

**Objectif** : carte instantanée + SEO mieux exploité.

- **1.3 Carte TBT** : repousser le fallback idle hors fenêtre Lighthouse + privilégier le 1er geste (`MapShell.tsx:271`, `useDeferredMount.ts:41`) ; découper l'init MapLibre en tâches < 50 ms (`MapView.tsx:478-567`). Cible : TBT mobile en forte baisse, Lighthouse perf > 70.
- **Perf annexes** : `posthog-js` en import dynamique gaté idle + consentement (`PostHogProvider.tsx`) ; heatmap **off par défaut** ou refetch seulement après 1er `moveend` (`MapShell.tsx:211`, `useCatchHeatmap.ts:132`) ; trimmer les graisses JetBrains Mono chargées sur `/carte`.
- **SEO** : raccourcir les `<title>` espèces (< 65 car., nom latin en H1/JSON-LD) ; `tarifs` Product → `AggregateOffer` + `priceValidUntil`, retirer l'offre `price:'0'` ; trancher `/spots?dept=&species=` (sitemap + maillage si landing, sinon `noindex`/canonical `/spots`) ; `SearchAction` sur le `WebSite` JSON-LD home.

**Critères** : Lighthouse mobile `/carte` nettement amélioré (mesuré via CI) ; rich-results tarifs sans warning. **Dépendances** : aucune (mais mesurer avant/après).

---

## 11. Sprint 58 — « Nettoyage, polish & vérif finale » 🟢

**Objectif** : solder la dette et les derniers détails, puis passe de vérification globale.

- **B2 Chat sortie passée** : décider/fermer le chat sur sortie `done`/passée (ou confirmer que c'est voulu — débrief).
- **Détails UI** : `maxLength` UI sur `city` (`profile-form`) ; compteur de caractères composer fil + `access_notes`/`description` propose-spot ; tronquer le libellé notif (`notifications/page.tsx:159`).
- **Advisors** : index B-tree sur les FK signalées (`outing_messages.user_id`, `outing_reviews.reviewer_id`, `spot_confirmations.user_id`, `spots.verified_by`), migration **097** ; (option) consolider les policies permissives multiples ; laisser `spatial_ref_sys` (système).
- **Code mort** : supprimer `lib/map/utils.ts:91,102`, `lib/marketing/home-stats.ts`, la chaîne `lib/marketing/brittany-coast.ts` + `components/marketing/home-visuals.tsx`, `lib/gamification/badges.ts:95` + `streaks.ts:54` (orphelins).
- **Data seed** : nettoyer/qualifier les 5 profils non onboardés (comptes de test) ; documenter l'état du réservoir (cartes Wrapped/records encore à 0).
- **Vérif finale** : `/verif-sprint` global + une passe QA visuelle live (desktop + **mobile réel**, le viewport 390 px n'a pas pu être testé via l'extension).

**Critères** : build/tests/lint/types verts, advisors sans nouvelle alerte, 0 code mort signalé. **Dépendances** : à faire en dernier.

---

## 12. Décisions ouvertes pour John

1. **`alose`** (S53) : retirer des 3 spots (reco, léger) ou créer une 27e fiche (réglementation sourcée à produire) ?
2. **Niveaux de vérification** `communaute`/`ambassadeur` (S53) : les câbler sur `spot_confirmations` ou retirer le code mort ?
3. **Cartes Wrapped/records** (S55) : activer maintenant (munition César) ou différer ?
4. **`/spots?dept=&species=`** (S57) : landing SEO indexables (alors sitemap + maillage) ou bruit (alors `noindex`/canonical `/spots`) ?
5. **Ordre** : la séquence 51→58 est par enjeu/dépendance. Tu peux remonter le **partage (55)** juste après 52 si César pousse la com, ou la **perf carte (57)** plus tôt si la conversion souffre du chargement.
6. **Rythme** : un brief détaillé par sprint (format exécutable type `docs/BRIEF-TEMPLATE.md`, prêt pour Fable `ultracode`), à la demande, en commençant par le **Sprint 51**.

---

*Roadmap consolidant 100 % des findings des audits 2026-06-28 et 2026-06-29 (×2). Chaque finding est tracé dans la checklist §3. Détail fichier:ligne dans les audits sources. Prochaine étape possible : rédaction du brief Sprint 51.*
