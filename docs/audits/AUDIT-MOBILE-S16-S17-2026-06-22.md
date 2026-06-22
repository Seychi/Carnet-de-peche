# 📱 Audit mobile post-déploiement — Sprints 16 & 17

> Réalisé le 2026-06-22 via Claude in Chrome (vue mobile) sur **prod live** `www.carnet-de-peche.com`, après déploiement des sprints 16 (polish mobile/fluidité) + 17 (cohérence produit & social). Protocole : `docs/audits/PROTOCOLE-AUDIT-MOBILE-CHROME-S16-S17.md`.
> Comptes : **A** = `redkps4@gmail.com` (@Seychi, modérateur, itinerant, dépt 06) · **B** = `redkps4+lambda@gmail.com` (@test_lambda, discovery/gratuit, dépt 06).
> Migrations confirmées en prod : `notifications` (037) + `fix_reports_policy` (038) ✅.

## ⚠️ Limites d'environnement (à lire avant les findings)

1. **Largeur de fenêtre plancher ≈ 500px CSS** (Chrome/Windows refuse < ~568px). Le layout mobile s'active (breakpoint 960px) ; les checks 360px sont faits par **mesure DOM**, pas à la fenêtre → certains marqués « à confirmer device ».
2. **`prefers-reduced-motion: reduce` ACTIF** (OS de John) → j'audite le chemin reduced-motion ; le chemin animations actives n'est pas testable ici.
3. **4G/ressenti device** : le vrai téléphone reste l'arbitre (déjà prévu brief 16).

---

## Verdict global : **8,5 / 10** (vs 7,5 au 22/06)

Les deux sprints livrent l'essentiel. Le sprint 17 (cohérence/social) est **très réussi** : le « trou central » (carnet public) est comblé, notifs + modération + recherche fonctionnent, tarifs assainis. Le sprint 16 (fluidité) a **nettement amélioré** la carte et le scroll. Restent **2 résidus P1 à fixer avant pub** (header illisible, copy « notifications créneaux ») et **1 alerte sécu pré-existante** (flou GPS ~200 m vs « 1 km » annoncé).

| Section | Note | État |
|---|---|---|
| A. Sprint 16 (fluidité/bugs) | 8/10 | Carte 1,7 s ✅, scroll OK ✅, image fil ✅, filtres /spots ✅, checkboxes teal ✅ — **1 résidu : header « Nouvelle prise » navy/navy** ; bandeau+onglets 360px à confirmer device |
| B. Sprint 17 (cohérence/social) | 9/10 | Carnet public ✅, notifs ✅, modération ✅, recherche ✅, onboarding↔profil ✅, tarifs ✅ — 1 résidu copy « créneaux optimaux » |
| C. UX mobile global | 8,5/10 | 0 débordement, images OK, app shell cohérent, Vercel toolbar ≠ produit |
| D. Sécu anti-régression | 8/10 | `geom` verrouillé ✅, RLS notifs/reports ✅, gating tier ✅ — **flou GPS faible (~200 m) vs copy « 1 km »** |
| E. Perf | 8/10 | Carte 1ʳᵉ tuile 1,7 s ✅, fil SSR sans cascade REST — round-trips SSR + Lighthouse = device/repo (John) |

---

## A. SPRINT 16 — Polish mobile & fluidité

### A2 — Scroll sans flash blanc
**⚠️→✅.** Les captures prises *pendant* le scroll montraient des zones crème vides, mais la capture juste après montre le contenu peint ; `prefers-reduced-motion` actif, règles `@media` présentes, aucune transition reveal en vol → **artefact de capture, pas le flash de 1-2 s du 22/06**. **John a confirmé en séance que le scroll de la home est fluide sur son téléphone → A2.1 = ✅ CONFORME.** (Chemin animations actives à valider device, par prudence.)

### A1 / E — Perf navigations & carte (compte B)
- **Carte : 1ʳᵉ tuile à 1,7 s** (Performance API), rendu perçu ~4-6 s, **skeleton « CARTE »** propre → **nette amélioration vs ~8 s au 22/06**.
- **Fil** : DCL ~3,0 s / load ~4,6 s (connexion réelle) ; **données SSR** (0 REST/RPC client), ~5 appels supabase client (auth/session + realtime) → **pas de cascade REST côté client**. Le compte des round-trips auth SSR (middleware+layout) n'est pas mesurable depuis le navigateur → à croiser avec `pnpm lhci` + device.
- ⚠️ Outil réseau Chrome instable → Performance API utilisée.

### A4 — Bugs visibles mobile
- **A4.1 Image vide fil** : ✅ non reproduit (photo du post `[test]` + photos de A s'affichent, `broken: 0`).
- **A4.2 Filtres `/spots` pleine largeur** : ✅ (Département/Espèce/Filtrer `w-full`, left 24 / w 437).
- **A4.3 Bandeau instruments (fondu)** : ⚠️ **à confirmer device** — contenu 485px, tient à 500px (overflowX visible) ; fondu/scroll à 360/390px non vérifiable depuis fenêtre plancher 500px.
- **A4.4 Header « Nouvelle prise »** : ❌ **NON corrigé**. ✕ blanc OK, mais **titre `rgb(10,47,61)` (navy-900) sur fond `rgb(4,20,28)` (navy-950)** → contraste ~1,3:1, quasi illisible (zoom à l'appui). Fix : titre en teal-300/blanc. **→ P1 (critère A4 non tenu).**
- **A4.5 Checkboxes/radios teal** : ✅ `accent-color rgb(14,148,136)` (profil).
- **A4.6 Onglets fil ≤360px** : ⚠️ **à confirmer device** — 3 onglets = 453px de contenu, tiennent à 500px, débordement probable à 360px.
- **A4.7 Titres de section formulaires** : ✅ échelle correcte (ESPÈCE/MESURES mono).

---

## B. SPRINT 17 — Cohérence produit & social

### B1 — Carnet public sur le profil ✅ (vu par B sur `/u/Seychi`)
- Profil public = **section PRISES** (grille cliquable : Maquereau 59 cm, Bar 41 cm, photos via URL signée) + **compteurs « N abonnés · M abonnements » cliquables** + bouton Suivre + section POSTS. **Le carnet d'un autre pêcheur est enfin visible** (trou central comblé). `broken: 0`.
- **Follow optimiste** depuis le profil ✅ (A → « 2 abonnés » instantanément).
- **PhotoLightbox** des posts ✅.
- _(B1.3 privée invisible / B1.4 / B1.5 amis → vérifiés côté A + SQL.)_

### B4 — Recherche & découverte ✅
- **Recherche pêcheur par pseudo** (header loupe → « Rechercher un pêcheur… », min 2 car., résultats live avatar + dépt). On trouve un pêcheur sans le croiser dans le fil ✅. _(B4.2 /follows enrichi, B4.3 UserMenu → à confirmer.)_

### B5 — Cohérence onboarding ↔ profil ✅ (modèle « abonnés »)
- Checkboxes teal, **« années de pratique » éditable**, libellés fréquence cohérents (« Plusieurs fois par semaine »…). Copie « abonnés » (« 1 abonné/abonnement », « Suivre ») cohérente avec le modèle unidirectionnel retenu ✅.

### B6 — Tarifs vs réalité ✅ (1 résidu)
« Le carnet et la communauté sont gratuits. La précision se paie. » Tutoiement OK.
- **B6.1 Offline** ✅ retiré des cartes ; FAQ honnête (« en cours de développement »).
- **B6.2 Bathy** ✅ « Bathymétrie détaillée (EMODnet) ».
- **B6.3 Itinéraires** ✅ « Itinéraire GPS vers chaque spot » (multi-spots retiré).
- **B6.4 Stats avancées** ✅ retirées de Local (reste « Stats inter-départements » sur Itinérant).
- **B6.5 Push** ⚠️ mot retiré, MAIS Local vend encore **« Notifications créneaux optimaux »** alors que le sprint 17 n'a livré que les notifs **sociales in-app** → **promesse résiduelle à requalifier (P1 avant pub)**.

### B2 — Notifications in-app ✅ (compte A)
- La page `/notifications` de A affiche **« test_lambda s'est abonné à toi · il y a 10 minutes »** → la notif de follow remonte de bout en bout (B2.1/B2.2). RLS recipient-only + index OK (cf. D3).

### B3 — Modération ✅ (compte A modérateur)
- `/moderation` accessible en compte A → **« 2 signalements en attente »** (SPOT BURNING / CONTENU INAPPROPRIÉ) avec contenu du post, type, signaleur (@Seychi12), département, et actions **« Supprimer le post » / « Ignorer »** (B3.1/B3.2). Policy `is_moderator()` confirmée en SQL (D3.2) → un non-mod n'y accède pas. _(Actions destructrices non exécutées : vrai contenu en prod.)_

---

## C. UX mobile global

- **Pas de débordement horizontal** sur home, tarifs, spots, carnet, carte, fil, profil, /u, nouvelle prise (scrollWidth = clientWidth partout) ✅
- **Aucune image cassée** sur les écrans parcourus ✅ · **1 `<h1>`** sur la home ✅
- **App shell** cohérent (tab bar Carnet/Carte/FAB/Fil/Profil + bandeau instruments mono) sur toutes les pages app ✅
- **Tap targets** home : 5 liens < 44px de large (« Carte »/« Tarifs »/« CGU », ~36×44) — hauteur OK, largeur = largeur du mot, acceptable.
- **Pastille ronde milieu-droite = `VERCEL-LIVE-FEEDBACK`** (toolbar Vercel, invisible aux vrais users) → point ⚪ du 22/06 **résolu**.
- Mockups home toujours illustratifs (cosmétique, A4.8).

---

## D. Sécu anti-régression

### D2 — Gating de tier (compte B gratuit) ✅ (partiel)
- **Filtres carte gatés** ✅ : « Filtres disponibles avec Local ou Itinérant » + « Débloquer les filtres » ; filtre Département « non disponible ».
- **Social 100% gratuit** maintenu ✅ : B (discovery) poste/suit/like sans mur payant (D2.4).
- _(D2.2 vue payante carte → compte A.)_

### D1 — Floutage GPS (SQL)
- **Verrou colonne `geom`** ✅ : `anon` ET `authenticated` **ne peuvent pas** lire `spots.geom` (`has_column_privilege` = false) ; `geom_public` lisible par `anon` ✅. La précision ne fuit pas par la colonne.
- ⚠️ **MAIS le flou est faible** : sur les 109 spots, offset `geom`↔`geom_public` = **min 4 m / moy 199 m / max 401 m**, **100% sous 500 m, 84/109 sous 300 m**. Or `/tarifs` annonce **« coords floutées 1 km »** et le sprint 11.6 avait noté 510-898 m. Le flou réel (~200 m) est **~5× plus faible qu'annoncé** → un gratuit localise le spot à ~200 m près. **Pré-existant (pas dû à 16/17)** mais à traiter avant pub : soit augmenter le rayon de jitter, soit corriger la copy. **→ P1.**

### D3 — RLS notifications & reports (SQL)
- **`notifications`** : RLS ✅ — `select/update/delete` réservés au destinataire (`user_id = auth.uid()`), **insert client interdit** (`insert_service_only`, with_check false → écriture via service role/DEFINER only). Indexée (`user_id, created_at DESC` + partial `WHERE read_at IS NULL`) ✅. Aucune nouvelle alerte advisor.
- **`reports`** : `reports_select_own_or_mod` = `reporter_id = auth.uid() OR is_moderator()` ✅ — **le fix sprint 17 (is_moderator, plus is_ambassador) est bien en prod**. Update réservé `is_moderator()`.
- **Notif créée par le follow** ✅ : ligne `new_follower` (recipient @Seychi, actor @test_lambda, non lue) — la plomberie notif fonctionne (B2.1).
- **Données B** conformes au seed : bar 52 (public, photo), dorade 38 (friends), sar 26 (private).

### Advisors (security) — aucune régression de 16/17
- `auth_leaked_password_protection` WARN = **assumé** (Pro-only, projet Free — décision John, non re-signalé).
- `security_definer_view` sur `spots_for_viewer` = **assumé** (definer volontaire pour appliquer flou+gating, cf 11.6).
- RPC spots/feed en SECURITY DEFINER exécutables anon/authenticated = **by-design** (gating interne, migration 029) — pré-existant.
- `spatial_ref_sys` RLS off + extensions en `public` = standard PostGIS, pré-existant.
- ✅ La nouvelle table `notifications` (037) n'introduit **aucune** alerte (RLS + index en place).

### D2.2 — Vue payante carte ✅ (compte A itinerant)
- Panneau Filtres **entièrement débloqué** : espèces + techniques cliquables, structure, **Département « Tous les départements »** (vs « Filtres non disponibles » pour B), **109 spots** (vs 45 floutés pour B). Le contraste gratuit↔payant est exactement celui attendu.

### B1 (cross-compte, vérifié côté A) ✅
- A regarde `/u/test_lambda` **sans le suivre** → voit **seulement la prise publique** (Bar 52 cm). **Sar 26 (privé) absent**, **Dorade 38 (amis) absente**.
- A **suit** B → la **Dorade 38 (amis) apparaît**, sar toujours absent. A **se désabonne** → dorade redisparaît. **Confidentialité parfaite** : abonné = public+amis, jamais le privé ; non-abonné = public seul.

---

## E. Perf chiffrée
- Carte 1ʳᵉ tuile **1,7 s** ✅ ; Fil DCL ~3 s / load ~4,6 s ; données SSR, pas de cascade REST client.
- Lighthouse (`pnpm lhci`) + device réel = dépendance John (VERIF brief 16).

---

## Findings (P0 / P1 / P2)

**P0 (bloquant)** — aucun. Pas de fuite de données, pas de régression de gating/RLS, pas de promesse payante manifestement mensongère bloquante.

**P1 (à corriger avant pub)**
1. **Header « Nouvelle prise » illisible** (`/carnet/nouvelle`) : titre navy-900 sur navy-950 (~1,3:1). Fix CSS trivial (titre en teal-300/blanc). `components/catches/CatchForm.tsx`. *(Critère sprint 16 A4/#6 non tenu.)*
2. **Flou GPS trop faible vs copy** : offset réel `geom`↔`geom_public` = moy **199 m / max 401 m** (100% < 500 m) alors que `/tarifs` annonce **« coords floutées 1 km »**. Pré-existant (pas dû à 16/17) mais touche le moat GPS + le paywall freemium → **augmenter le rayon de jitter OU corriger la copy** avant pub. (Vérifier `blur_spot_geom` / migration 028.)
3. **Tarifs — « Notifications créneaux optimaux »** (plan Local) : le sprint 17 n'a livré que les notifs **sociales in-app** (like/commentaire/follow). Les alertes « créneau optimal » n'existent pas → requalifier/retirer le bullet avant pub.

**P2 (polish / à confirmer)**
4. **Bandeau instruments** (#5) & **onglets fil** (#8) à 360px : contenu 485/453px, fondu/scroll **à confirmer sur ton téléphone** (fenêtre Chrome plancher 500px ici).
5. **Device réel** : valider scroll + carte sur Android milieu de gamme (chemin animations actives non testable ici, OS reduce-motion forcé) + lancer `pnpm lhci` (budgets perf brief 16).
6. Mockups home toujours illustratifs (cosmétique).

## Ce qui est confirmé sain (à ne pas casser)
Carnet public + visibilité privacy/amis irréprochable · `geom` précis illisible par anon/authenticated · RLS notifications recipient-only + policy reports `is_moderator()` · gating tier gratuit↔payant net · social 100% gratuit maintenu · recherche pêcheur · tarifs largement assainis (offline/bathy/itinéraire/stats) · carte ~3,5× plus rapide qu'au 22/06 · 109 spots (copie exacte) · Vercel toolbar ≠ élément produit.

## Nettoyage prod (suite à l'audit)
- ✅ Follow **A → B** créé puis **retiré** pendant le test (état restauré).
- ⚠️ **Reste** : le follow **B → test_lambda → A** est encore actif (+ sa notif `new_follower` chez A). Données de test inoffensives — à retirer si tu veux l'état d'origine (te déconnecter en B et te désabonner, ou je le fais en SQL si tu valides un write). Le post `[test]` de B et les 2 signalements (créés par @Seychi12) sont **tes** données de seed/test — à toi de voir.
