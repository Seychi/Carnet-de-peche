# Rapport d'audit QA — Carnet de Pêche (production)

**Date :** 2026-06-21
**Cible :** https://www.carnet-de-peche.com (prod réelle, Stripe LIVE)
**Méthode :** audit live navigateur (clic réel, multi-comptes) + corroboration backend Supabase (lecture seule, projet `glgciwwnpmgifyhbvxsw`).
**Auditeur :** Claude (QA)

---

## 0. Méthodologie & limites (à lire avant les bugs)

- **Comptes testés :** Anonyme · Discovery (`qa-discovery`) · Local (`qa-local`, dépt 29) · Itinérant (`qa-itinerant`) · Compte vierge (`qa-fresh`, onboarding + suppression) · Seychi (modérateur, dépt 06).
- **Sécurité respectée :** aucun achat finalisé (tunnel Stripe non engagé) ; posts/commentaires de test marqués `[QA test]` et **supprimés** ; aucune donnée d'autrui supprimée ; le clic de suppression de compte a été fait **par John** (action irréversible).
- **Nettoyage :** toutes les données de test créées par l'audit ont été supprimées (prise carnet, post + commentaire fil, follow). Vérifié en base : 0 résidu. Le compte `qa-fresh` existe toujours (la suppression a échoué — voir BUG-03).
- **Captures :** les captures ont été prises **en direct** pendant la session mais **ne peuvent pas être jointes au fichier** dans cet environnement. Chaque ligne cite donc la **preuve exacte** observée (texte à l'écran, coordonnées, statut HTTP, requête API). Tout est reproductible.
- **Mobile :** testé en réduisant la fenêtre à **500 px** (largeur minimale autorisée par l'OS ; ~390 px refusé). Suffisant pour valider la bascule mobile (< 960 px).
- **Non testable sur les comptes fournis :** le **portail Stripe / annulation** — les abonnements `qa-local`/`qa-itinerant` ont été créés en base **sans client Stripe** (`stripe_customer_id` nul), donc le bouton de gestion est masqué (normal). À tester avec un compte passé par un vrai Checkout.

---

## 1. Synthèse

**18 bugs** confirmés + 3 constats sécurité backend (advisors Supabase).

| Sévérité | Nb |
|---|---|
| 🔴 Critique | 1 |
| 🟠 Haute | 5 |
| 🟡 Moyenne | 7 |
| 🔵 Basse | 5 |

### Les 5 plus urgents

1. **🔴 Le floutage GPS est cosmétique — les coords exactes de tous les spots fuitent à n'importe qui** (BUG-01). La promesse « zone floutée 1 km / anti spot-burning » est fausse. Le correctif (migration 025) **n'est pas déployé**.
2. **🟠 La suppression de compte est cassée** (BUG-03, RGPD) — « Erreur lors de la suppression. Contacte le support. » Droit à l'effacement non fonctionnel en prod.
3. **🟠 Le bridage freemium est purement visuel** (BUG-02) — l'API renvoie les 38 spots (coords exactes) au rôle anonyme ; seuls 3 sont affichés. Contournement trivial.
4. **🟠 `/follows` n'affiche pas tes abonnements** (BUG-04) — le suivi est bien enregistré mais la page affiche « Tu suis (0) ».
5. **🟠 Listes de départements incohérentes + risque d'effacement du département** (BUG-05) — l'onboarding propose 24 dépts, l'édition profil seulement 17 ; le select profil ne se pré-remplit pas.

---

## 2. Tableau des bugs (trié par sévérité)

| # | Page (URL) | Compte/Tier | Sévérité | Problème observé | Comportement attendu | Preuve (capture live) |
|---|---|---|---|---|---|---|
| 01 | `/spots/<slug>`, `/carte` | Anonyme + tous tiers gratuits | 🔴 Critique | **Floutage GPS factice.** `geom_public` est un cercle de ~1 km **centré exactement sur le point réel** → son centroïde = le point exact. La fiche affiche « ZONE FLOUTÉE 1 KM / Coordonnées approchées » mais les 3 boutons d'itinéraire (Google/Plans/Waze) pointent sur le caillou exact. | Un utilisateur non abonné doit recevoir une position **réellement décalée** (~1 km), jamais le GPS exact. | Anon sur `/spots/cap-frehel` : itinéraires → **48.6852, -2.31970** = `geom` exact en base (`POINT(-2.3197 48.6852)`). API anon `get_spots_for_scoring` → 38 points, distance min au vrai Cap Fréhel = **0 m**. Advisor Supabase : `get_spots_for_scoring` exécutable par `anon`. Migration **025 (le fix) non appliquée** (liste s'arrête à 024). |
| 02 | `/carte` (+ `?species=`, `?department=`) | Anonyme / Discovery | 🟠 Haute | **Cap « 3 spots/dépt » et limite « 1 département » = côté client uniquement.** L'appel API renvoie tout ; le front n'affiche que 3 pins. | Le serveur doit limiter à 3 spots/dépt pour les gratuits et ne pas exposer les autres. | API anon `get_spots_for_map{dept_filter:'29'}` → **18 lignes** ; sans filtre → **38 lignes** (tous départements). UI n'affiche que **3** pins. `is_precise=false` mais coords = centroïde = exact (cf BUG-01). Param `?department=22` ignoré par l'UI (revient à 29) mais l'API n'a aucun garde-fou. |
| 03 | `/profil` → « Supprimer mon compte » | qa-fresh (jetable) | 🟠 Haute | **Suppression de compte échoue** : toast rouge « Erreur lors de la suppression. Contacte le support. » | Le compte et ses données doivent être supprimés (droit RGPD à l'effacement, promesse « annulation/suppression en ligne »). | Après clic « Supprimer définitivement » : erreur. Base : `qa-fresh` **toujours présent** (auth + profil = 1/1). Logs GoTrue : **aucun** `DELETE /admin/users` → l'échec survient **côté serveur avant** l'appel admin. Cascades DB OK. **Cause probable : `SUPABASE_SERVICE_ROLE_KEY` manquant/mal configuré en prod Vercel**, ou route de suppression qui throw. |
| 04 | `/follows` | Discovery (et +) | 🟠 Haute | **La liste « Tu suis » ne s'affiche pas.** Après avoir suivi un pêcheur, la page affiche « Tu suis (0) — Tu ne suis personne ». On ne peut donc pas non plus se désabonner depuis cette page. | La page doit lister les comptes suivis et permettre de les gérer. | `qa_discovery` suit `Seychi` → le profil `/u/Seychi` affiche bien « Suivi(e) » et la base contient `qa_discovery → Seychi`, mais `/follows` reste à « Tu suis (0) » même après refresh. |
| 05 | `/profil` vs `/onboarding/2` | Connecté (tous) | 🟠 Haute | **Listes de départements incohérentes + département non pré-rempli.** Onboarding = **24 dépts** (06,11,13,30,59,2A,2B inclus) ; édition profil = **17 dépts** (ces 7 manquent). De plus, le select dépt du profil affiche « Sélectionne ton département » alors que le compte est en 29. | Les deux listes doivent être identiques ; le select profil doit pré-sélectionner le département enregistré ; sauvegarder ne doit pas effacer le département. | `/onboarding/2` select : 24 options. `/profil` select : 17 options (manquent 06,11,13,30,59,80,2A,2B). `document.querySelector(select).value === ""` alors que dépt=29. Des users réels existent en 06/11/83 (via onboarding) → impactés : sauvegarde profil = risque d'écrasement à NULL → `/fil` renverrait vers le sélecteur de côte. |
| 06 | `/carte`, mini-map fiche | Tous | 🟠 Haute | **Carte noire au montage.** Le canvas s'affiche entièrement sombre (tuiles non peintes) au chargement ; n'apparaît qu'après un resize de fenêtre / interaction. Intermittent. | La carte doit s'afficher dès le chargement. | `/carte` anon & Local : noir total ; `map.resize()` (déclenché par resize fenêtre) → rendu OK. MapTiler `style.json`/`tiles.json` = 200 (clé OK). S'est affichée correctement pour Itinérant (donc **intermittent**, pas systématique). Mini-map fiche aussi noire par moments. |
| 07 | `/` (home), `/tarifs` | Anonyme | 🟡 Moyenne | **Copy fausse / sur-promesse.** Home : « Export GPX/JSON prévu cette année » (fonctionnalité inexistante + engagement de date). Tarifs FAQ « Vous couvrez toute la France ? » → « **27 départements côtiers couverts** ». | Pas d'annonce de fonctionnalité/date non tenue ; le nombre de départements « couverts » doit refléter la réalité. | Seulement **4 départements** ont des spots en base (22, 29, 35, 56 = Bretagne) ; la fonction de post autorise **25** dépts, pas 27. Sprint 7.5 prétendait avoir retiré la mention « exports ». Aussi : « App iOS/Android — bientôt », « Corse prévue fin 2026 ». |
| 08 | `/spots/<slug>` | Local (dépt 29) | 🟡 Moyenne | **Gating fiche trop permissif.** Un abonné **Local** voit les coords **précises** d'un spot **hors de son département**. | Local = précision sur **son** département seulement ; hors-dépt = réservé à Itinérant. | `qa_local` (29) sur `/spots/cap-frehel` (dépt **22**) : « GPS PRÉCIS DISPONIBLE — 48.68520, -2.31970 », aucune mention de floutage. `get_spot_by_slug` gate sur `has_active_subscription` (tout abonné) sans vérifier le département. Sape l'upsell Local→Itinérant. |
| 09 | `/fil/<dept>` | Discovery (et +) | 🟡 Moyenne | **Un post publié n'apparaît pas sans refresh ;** un post supprimé reste affiché (avec spinner). | Le post doit apparaître/disparaître immédiatement (optimistic update / realtime). | Après « Publier » : toast « Posté ! » mais le fil reste « Sois le premier à poster » ; le post n'apparaît qu'après rechargement (confirmé en base : `likes_count` etc. OK). Idem suppression : toast « Post supprimé » mais le post reste visible avec un spinner. (Les **commentaires**, eux, s'affichent bien immédiatement.) |
| 10 | `/tarifs` → « Essayer 7 jours » | Anonyme | 🟡 Moyenne | **#7 — Contexte de plan perdu.** Le bouton porte bien le plan choisi, mais le redirect le supprime. | Après inscription/connexion, revenir sur le plan choisi (ou son Checkout). | Lien « Essayer 7 jours » = `/auth/register?...plan...` → mais `/auth/register` **redirige (307) vers `/auth/login`** en **supprimant** le paramètre (`finalKeepsPlan:false`). Le plan est perdu avant même l'inscription. |
| 11 | routes protégées (`/fil/29`, `/carnet`…) | Anonyme → login | 🟡 Moyenne | **#6 — Redirection perdue.** Les routes protégées renvoient vers `/auth/login` **sans** paramètre de retour. | Après login, atterrir sur la page demandée (`/fil/29`). | `fetch('/fil/29')` déconnecté → redirige vers `/auth/login` **sans** `?redirect=` (`keepsTarget:false`, pas de query). Donc après login → page par défaut, pas la destination. (Idem `/carnet`, `/profil`, `/compte/abonnement`, `/home`, `/onboarding`, `/follows`, `/u/<x>`.) |
| 12 | `/onboarding/*` | qa-fresh | 🟡 Moyenne | **Latence d'interaction élevée (INP ~2 s)** sur le bouton « Continuer » de l'onboarding. | Interaction < 200 ms. | Overlay Web-Vitals signalant « Event handlers blocked UI updates for **2096.2 ms** » sur « Continuer » ; latence réelle ~2 s ressentie entre étapes. ⚠️ **L'overlay lui-même est très probablement une extension navigateur** (pas l'app), mais la latence mesurée est réelle et à investiguer. |
| 13 | base (schéma) | — (latent) | 🟡 Moyenne | **FK non-cascade → suppression impossible pour modérateurs/résolveurs.** `feed_posts.moderated_by` et `reports.resolved_by` référencent `profiles(id)` **sans `ON DELETE`**. | Toutes les FK vers l'utilisateur doivent CASCADE ou SET NULL. | Même après correction de BUG-03, supprimer un compte ayant **modéré un post** ou **résolu un signalement** échouera (violation FK). À corriger en même temps. |
| 14 | `/especes/dorade-royale`, `/especes/orphie` | Anonyme | 🔵 Basse | **#4 — Faute d'article.** H1 « **Le** dorade royale » et « **Le** orphie ». | « **La** dorade royale » et « **L'**orphie ». | H1 extraits : `"Le dorade royale Sparus aurata"`, `"Le orphie Belone belone"`. (bar/lieu/maquereau/sar = corrects.) Article codé en dur « Le ». |
| 15 | `/fil/<dept>` | Connecté | 🔵 Basse | **Suppression de post sans confirmation.** Supprimer un post du fil le supprime immédiatement, sans modale. | Cohérence avec la suppression de prise (qui, elle, a une modale « action irréversible »). | Menu « … » → « Supprimer » → suppression directe (toast). Risque de suppression accidentelle + incohérence UX. |
| 16 | `/carnet/nouvelle` → détail prise | Discovery | 🔵 Basse | **Heure de prise décalée (~ -2 h).** Saisie `06:46` → affichée « 04:46 ». | L'heure affichée doit correspondre à la saisie (fuseau Europe/Paris). | À reconfirmer avec une saisie propre (le formulaire contenait des valeurs auto-remplies — cf BUG-18). Écart cohérent avec un bug de timezone (stockage UTC affiché sans reconversion). |
| 17 | `/fil/<dept>` (mobile) | Connecté | 🔵 Basse | **Onglets du fil qui débordent sur mobile.** La rangée « Ton département / Tes follows / Tous les départements côtiers » déborde (scroll horizontal, 3ᵉ onglet coupé). | Onglets adaptés ou repliés proprement en < 500 px. | Constaté à 500 px sur `/fil/06`. |
| 18 | `/carnet/nouvelle` | Discovery | 🔵 Basse / Info | **Formulaire « nouvelle prise » pré-rempli de valeurs périmées.** Ville « Antibes (test audit) », leurre « Black Minnow 120 kaki (test audit) », date du 12 juin — non saisies par l'auditeur. | Formulaire vierge (ou autofill maîtrisé). | Probable autofill navigateur / brouillon résiduel (à confirmer hors extension). Conséquence observée : prise enregistrée avec des valeurs incohérentes (GPS Égypte mais ville « Antibes »). |

---

## 3. Verdict des 10 vérifications ciblées

| # | Vérification | Verdict | Détail |
|---|---|---|---|
| 1 | Fuite GPS (itinéraire fiche anon) | ✅ **CONFIRMÉ** | Itinéraire anon → coords exactes (48.6852, -2.3197). Floutage = cosmétique (centroïde du cercle = point réel). Voir BUG-01. |
| 2 | Carte gratuite ≤ 3/dépt + contournement URL | ✅ **CONFIRMÉ** | UI = 3 pins ; API anon = 18 (dépt) / 38 (tous). Bridage côté client uniquement. Voir BUG-02. |
| 3 | Copy fausse (« 27 départements », « Export GPX/JSON ») | ✅ **CONFIRMÉ** | FAQ tarifs « 27 départements couverts » (4 réels) ; home « Export GPX/JSON prévu cette année ». Voir BUG-07. |
| 4 | Faute de titre (« Le dorade » / « Le orphie ») | ✅ **CONFIRMÉ** | H1 « Le dorade royale » et « Le orphie ». Voir BUG-14. |
| 5 | Profil → département (manquants + perte) | ✅ **CONFIRMÉ** | Profil = 17 dépts (manquent 06/11/13/30/59/2A/2B) ; select non pré-rempli → risque d'effacement. Voir BUG-05. |
| 6 | Redirection `/fil/29` après login | ✅ **CONFIRMÉ** | `/fil/29` déconnecté → `/auth/login` **sans** paramètre de retour → destination perdue après login (confirmé au niveau HTTP/redirect). Voir BUG-11. |
| 7 | Abonnement : contexte du plan conservé | ✅ **CONFIRMÉ (perdu)** | « Essayer 7 jours » → `/auth/register?plan` → redirige `/auth/login` en supprimant le plan. Voir BUG-10. |
| 8 | Suppression de compte (RGPD) | ✅ **CONFIRMÉ (cassé)** | « Erreur lors de la suppression. Contacte le support. » Compte intact. Voir BUG-03. |
| 9 | Modération : bouton sur posts / sur commentaires | ⚠️ **PARTIEL** — Posts : ✅ **CONFIRMÉ présent** (« Supprimer (modération) » visible par Seychi sur un post d'autrui). Commentaires : ❓ **NON CONCLUANT** — le seul commentaire existant est celui du modérateur lui-même, impossible de distinguer suppression-auteur de suppression-modération. La RLS (`feed_comments_delete_moderator`) **autorise** la suppression mod des commentaires ; reste à vérifier si le **bouton UI** apparaît sur un commentaire tiers. |
| 10 | Pages dev en 404 | ✅ **CONFIRMÉ** | `/dev/seed-feed` → 404 ; `/dev/ui-v2` → 404. |

---

## 4. Ce qui fonctionne bien (à ne pas casser)

- **Auth & onboarding :** connexion OK ; onboarding 6 étapes complet, **validation FR** (« Minimum 3 caractères. »), **pseudo unique en temps réel** (« ✓ Pseudo disponible »), écran final « Ton carnet est prêt » ✅. La porte d'onboarding force bien `/onboarding` pour un compte non-onboardé.
- **Carnet :** CRUD complet (création, lecture, édition, suppression) avec toast, indicateur de taille légale, confidentialité « Privée » par défaut.
- **Fil :** like (compteur OK en base), commentaire (affichage immédiat), suppression commentaire OK.
- **Follow/unfollow :** le toggle sur le profil `/u/<x>` fonctionne (le bug est sur la page `/follows`, BUG-04).
- **Tiers payants :** Local = carte complète du dépt (18 spots), filtres débloqués, dépt verrouillé ; Itinérant = changement de département (« Tous les départements » → 38 spots), filtres OK. Affichage du tier correct (LOCAL / ITINÉRANT actif).
- **Tutoiement** respecté partout (y compris pages légales).
- **Mobile** globalement propre : nav hamburger, tab bar bas, cartes empilées, carte plein écran (rendue), typo lisible.
- **404 propres** (route inexistante → 404 avec header/footer) ; **modération de posts** côté UI.
- **Modale de suppression de prise** bien écrite (« action irréversible »), wording RGPD de la modale de suppression de compte correct (même si l'action échoue).

---

## 5. Annexe — Constats sécurité backend (advisors Supabase)

À traiter avec les bugs ci-dessus (lecture seule, non bloquant pour l'audit UI) :

1. **`get_spots_for_scoring` exécutable par `anon`** (advisor `anon_security_definer_function_executable`) — vecteur direct de la fuite GPS (BUG-01). Migrations **025 / 026 / 027 non appliquées en prod** (la prod s'arrête à `024_perf_rls`).
2. **4 vues `SECURITY DEFINER`** (`feed_posts_for_viewer`, `profile_stats`, `catches_for_viewer`, `spots_for_viewer`) — contournent la RLS de l'appelant (advisor niveau ERROR).
3. **6 fonctions à `search_path` mutable** (`blur_spot_geom`, `blur_catch_geom`, `bump_likes_count`, `bump_comments_count`, `get_my_catches_breakdown`, `touch_updated_at`) + **protection mots de passe compromis désactivée** (HaveIBeenPwned) — durcissements prévus par les migrations 026/027 non déployées.

---

*Rapport généré le 2026-06-21. Toutes les données de test créées pendant l'audit ont été nettoyées ; le compte `qa-fresh` subsiste (suppression échouée — BUG-03).*
