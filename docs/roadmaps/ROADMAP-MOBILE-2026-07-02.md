# 📱 ROADMAP MOBILE — de la fin des sprints web aux apps iOS + Android en prod

> Rédigé le 2026-07-02. Remplace le §5 « Gate mobile » de `ROADMAP-PRE-MOBILE-2026-06-26.md` (dont les pré-requis web sont aujourd'hui quasi tous verts).
> **Décisions John 2026-07-02 (verrouillées)** : périmètre v1 = **parité complète avec le site** · monétisation v1 = **IAP via RevenueCat dès la sortie** (hybride avec Stripe web conservé).
> Faits stores/SDK vérifiés le 02/07/2026 (sources en annexe §10) — à re-vérifier au lancement de M1 (ces choses bougent vite).

---

## 0. TL;DR

- **Stack** : Expo **SDK 56** (RN 0.85, React 19.2, New Architecture seule) + Expo Router + monorepo **Turborepo/pnpm** + **MapLibre React Native 11.x** (Fabric, plugin Expo inclus) + Supabase (le MÊME backend : schéma, RPC, RLS, floutage — le mobile est un 2e client, pas un 2e produit) + **RevenueCat** (IAP + fusion Stripe) + Expo Notifications + Sentry RN + PostHog RN + EAS Build/Submit/Update.
- **Séquence** : lane admin (comptes stores) **dès aujourd'hui** ∥ fin des sprints web (69, 70, 72, 73 — le 71 est vacant) → M1 monorepo → M2 squelette/auth → M3 carnet offline → M4 carte → M5 dopamine → M6 social → M7 sorties → M8 spots/modération/matériel → M9 push/alertes → M10 IAP/compte → M11 contenu → M12 qualité release → M13 beta fondateurs → M14 soumission + sortie.
- **Délais réalistes** : dev ≈ 12-14 sessions Fable ; mur d'horloge ≈ **7-10 semaines** entre la fin du S73 et les 2 stores (comptes 2-4 sem EN PARALLÈLE, beta 2-3 sem, review Apple 24-48 h / **Google 1re app 7-14 j**).
- **Coûts** : Apple Developer org **99 €/an** · Play Console **25 $ one-time** · EAS free (15 builds iOS + 15 Android/mois) puis Starter 19 $/mois si besoin · RevenueCat gratuit < 2 500 $ de revenu mobile/mois · commissions ~**15 %** (Apple Small Business / Play Billing).

---

## 1. Gate d'entrée (avant M1) — état au 02/07

**Hérité du gate 2026-06-26, aujourd'hui :**
- ✅ Géocodage par ville (BAN) — corrigé (et devenu quasi obligatoire : Apple 5.1.1(iv) exige une saisie manuelle si l'utilisateur refuse la géoloc).
- ✅ Heures de soleil, en-têtes sécurité (CSP enforce au S70), cockpit, nav unifiée, carte saine (contre-mesures 02/07).
- ☐ **S69 « Intégrité » livré** (anti-cheat AVANT d'exposer les classements dans une app notée sur les stores).
- ☐ **S70/S72/S73 livrés** (vérité/bugs, alertes par port = l'argument du push natif, sorties = surface sociale v1).
- ☐ **Réservoir amorcé** (lane F : ≥ 20 fondateurs actifs, ≥ 1 classement publié) — une app store avec un fil désert se paie en avis 1★.
- ☐ Funnel PostHog signup en place (S70) pour mesurer le mobile dès J1.

**Décisions du vieux gate, tranchées ici** : D2 « prise vérifiée photo+IA » = **natif, post-v1** (v1.x, cf §8 — on ne bloque pas la sortie sur du ML) · digest hebdo = optionnel M9.

---

## 2. 🏁 LANE ADMIN JOHN — À DÉMARRER MAINTENANT (pendant les sprints web)

C'est le chemin critique CALENDAIRE, pas le dev. Tout est parallélisable avec S69-72 :

1. **Numéro D-U-N-S** pour la société (gratuit, Dun & Bradstreet, ~5 j à 2 sem ; jusqu'à 30 j côté Google). Requis par les DEUX stores pour un compte organisation.
2. **Apple Developer Program (organisation)** : 99 €/an, validation org souvent > 7 j. Compte perso interdit ici : on veut « Carnet de Pêche » comme éditeur + accès équipe.
3. **Google Play Console (organisation)** : 25 $, vérification quelques heures à quelques jours. **Compte org = exempté de la règle « 12 testeurs / 14 jours »** des comptes perso — raison de plus pour l'org. Anticiper la **developer verification obligatoire sept. 2026**.
4. **Préparer les métadonnées légales** : politique de confidentialité à jour (mentions mobile : push, IAP, RevenueCat, permissions), URL de support, coordonnées de contact modération (obligation Apple UGC 1.2).
5. Réserver le nom « Carnet de Pêche » dans App Store Connect dès l'accès ouvert (les noms se squattent).
6. ⚠️ DÉCISION À PRENDRE (pas bloquante avant M10) : **prix stores**. Web = 4,90/9,90 € ; paliers stores = 4,99/9,99 € (et 49,99/99,99 €/an). Reco : aligner TOUT sur 4,99/9,99 pour éviter « moins cher sur le web » (motif de friction review + confusion). À trancher avant la config RevenueCat.

---

## 3. Décisions techniques verrouillées

| Sujet | Choix | Pourquoi |
|---|---|---|
| Runtime | **Expo SDK 56** (RN 0.85.2, React 19.2.3, Hermes V1, New Arch only, iOS ≥ 16.4) | SDK courant (mai 2026). ⚠️ SDK 56 : `@expo/vector-icons` déprécié, expo-router forke react-navigation (codemods dispo). Re-vérifier la version stable au jour de M1. |
| Navigation | **Expo Router** (file-based, comme App Router) | Mapping mental 1:1 avec le web. |
| Carte | **@maplibre/maplibre-react-native 11.x** | Projet officiel MapLibre, Fabric-only (OK SDK 56), plugin config Expo inclus, API calquée sur GL JS (styles/couches du web quasi réutilisables). ⚠️ Pas d'`addProtocol` ni custom layers WebGL : vérifier la source bathy EMODnet en M4. |
| Monorepo | **Turborepo + pnpm workspaces** : `apps/web` · `apps/mobile` · `packages/shared` (types DB, schémas zod, client Supabase, scoring/solunar, geo/departments, copy FR, constantes tiers) | Cible déjà actée dans CLAUDE.md §4. Un seul cerveau métier, deux rendus. |
| Auth | @supabase/supabase-js + session dans **expo-secure-store** ; email/password + Google natif + **Sign in with Apple** (obligation pratique Apple 4.8 dès qu'un login social tiers existe) + reset | Même Auth Supabase que le web. |
| Paiements | **RevenueCat** (`react-native-purchases`) : IAP App Store + Play Billing, **+ intégration Stripe web** (même `app_user_id` = mêmes droits partout) | Décision John. Gratuit < 2 500 $/mois de revenu mobile. Commission stores ~15 % (Small Business Apple à demander ; Play = 10 % service + 5 % billing). |
| Push | **Expo Notifications** (APNs + FCM) | Déjà prévu CLAUDE.md. Le moteur d'alertes S71 émet, le device reçoit. |
| Offline | **expo-sqlite** + file d'attente de sync pour le LOG DE PRISE (écrire au bord de l'eau sans réseau = promesse du tier Local) ; cache lecture (marées 7 j, carte du dept) ensuite | Offline-FIRST sur l'écriture du carnet, offline-friendly sur la lecture. |
| Observabilité | **@sentry/react-native** + **posthog-react-native** (events alignés web : signup, catch_log, paywall, checkout) | Parité de mesure dès J1. |
| CI/CD | **EAS Build + Submit** branchés GitHub Actions ; **EAS Update** (OTA) pour le JS entre releases stores | Free tier : 15+15 builds/mois, 1 000 MAU Update — suffisant jusqu'à la beta. |
| E2E | **Maestro** (smoke : login → log prise → carte → paywall) | Léger, adapté RN. |
| Dev quotidien | **Development builds** (PAS Expo Go : RevenueCat/MapLibre natifs l'exigent ; achats mockés dans Go) | À poser dès M2. |

---

## 4. Architecture : ce qui ne bouge PAS

Le backend est déjà multi-client : **aucune migration « pour le mobile »** hors celles listées (push tokens M9, IAP M10, blocage utilisateur M6 si absent). Les invariants s'appliquent à l'identique : floutage GPS servi par les MÊMES vues/RPC (`*_for_viewer`, `get_spots_for_map`, `current_tier`), RLS inchangée, k-anon, zéro coordonnée dans les classements. **Interdit** : toute logique de gating dupliquée côté client mobile — on consomme les RPC, point.

---

## 5. Les sprints M1 → M12 (dev, ≈ S74+)

> Chaque M = un brief `BRIEF-TEMPLATE.md` au lancement (ligne ultracode, workstreams, VERIF). Migrations numérotées à la suite du courant. Ordre pensé pour qu'un cœur démontrable existe tôt (M1-M5) et que la parité (M6-M8, décision John) soit complète AVANT la beta.

**M1 — Monorepo & fondations** · Turborepo + pnpm workspaces ; déplacer le site dans `apps/web` SANS régression (Vercel root directory à jour, CI verte, 695+ tests intacts) ; extraire `packages/shared` (types, zod, supabase client factory, scoring, departments, constantes) consommé par le web. **Critère : prod web strictement iso, diff de comportement = 0.**

**M2 — Squelette app & auth** · `apps/mobile` Expo 56 + Router + tokens DA v2 (navy/gold/mono JetBrains) ; auth complète (email, Google natif, **Sign in with Apple**, reset, deep link de confirmation) ; session secure-store + refresh ; onboarding 6 étapes ; tab bar native (Carnet · Carte · + · Fil · Plus) ; development builds EAS pour l'équipe. **Critère : login → onboarding → cockpit vide sur device réel iOS + Android.**

**M3 — Carnet natif offline-first** · Log de prise < 30 s : caméra/galerie (resize client WebP ≤ 1920, upload Storage même chemin), espèces 26, mesure+photo (règles S69), conditions auto, géoloc au geste (purpose strings propres) + fallback ville BAN, **file offline sqlite → sync** (conflits : last-write, prise = append-only de toute façon) ; liste/détail/stats/records/matériel ; célébrations (S61) en natif (Reanimated). **Critère : mode avion au bord de l'eau → log complet avec photo → retour réseau → tout part, XP crédité une seule fois (idempotence ledger vérifiée).**

**M4 — Carte native** · MapLibre RN 11 : style MapTiler partagé, spots multi-source, clusters, heatmap k-anon, qualité par espèce, bathy (⚠️ vérifier la source EMODnet sans addProtocol ; sinon tuiles raster servies par nous), fiche spot complète (marées ±8 min, meilleurs moments, score décomposé), gating tiers via les MÊMES RPC (Découverte flouté / premium précis), itinéraire GPS (Maps/Plans/Waze). **Critère : parité visuelle et de gating avec le web sur 2 comptes, 60 fps au pan/zoom sur un mobile moyen.**

**M5 — Dopamine & cockpit** · /home natif (créneau du jour, semaine, « ce que ton carnet en dit ») ; XP/rangs/niveaux, badges + rareté, séries, défis + défis conservation RecFishing, Pokédex 26, classements + saisons (opt-in, seuils k-anon, own-rank S69), partage de cartes (share cards natives via react-native-view-shot → partage OS). **Critère : parité cockpit/classements, aucune coordonnée nulle part (passe adversariale).**

**M6 — Social complet** · Fil par département (lecture + **écriture**, photos multi, likes, commentaires), follows, profils publics, notifications in-app temps réel (Realtime RN), **signalement (existant) + BLOCAGE utilisateur** — obligation Apple UGC 1.2 (signaler + bloquer + modération réactive) : si le blocage n'existe pas encore côté web, migration + RPC partagées ici, livrées sur les DEUX clients. **Critère : boucle sociale complète sur device ; un utilisateur bloqué disparaît du fil/commentaires du bloqueur ; CGU mentionnent la modération.**

**M7 — Sorties & co-pêchage** · `/sorties` natif : proposer/rejoindre, chat temps réel de sortie, sorties groupées S72 (posts de sortie, tag co-pêcheurs avec consentement), log de la bredouille. **Critère : parité sorties, chat fiable en arrière-plan raisonnable (reconnexion propre).**

**M8 — Spots communautaires, modération, redeem** · Proposer un spot (SpotLocationPicker natif), mes propositions ; **/moderation natif** (signalements, spots en attente, imports à curer, invitations — John est mobile aussi) ; échange de code fondateur in-app (S68) ; réglages compte complets + **suppression de compte in-app** (RPC `delete_my_account` existante — obligation Apple 5.1.1(v)). **Critère : parité totale des surfaces restantes ; suppression de compte vérifiée depuis l'app.**

**M9 — Push & liens** · Migration table push tokens (ou extension `push_subs`), enregistrement Expo Notifications ; branchement des émetteurs existants : **alertes par port (S71)**, rang dépassé, défi qui expire, notifs sociales — avec préférences par canal (RGPD, opt-in explicite) ; deep links + universal links (spot/prise/classement → app) ; smart app banners sur le site ; digest hebdo (optionnel). **Critère : une alerte S71 déclenchée côté serveur sonne sur les 2 OS et ouvre le bon écran ; opt-out respecté.**

**M10 — Monétisation IAP** · RevenueCat : produits Local/Itinérant (mensuel/annuel, essai 7 j en intro offer stores), paywall natif (upsell existants rebranchés), restauration d'achats ; **fusion des droits** : webhook RevenueCat → table `iap_subscriptions` (migration) → **`current_tier` v3 = max(Stripe, comp S68, IAP)** — même rigueur que la 104 (reprendre la définition live verbatim, matrice SQL rollback en prod) ; intégration Stripe RevenueCat (même `app_user_id` supabase) pour que les abonnés web soient premium dans l'app sans re-payer. ⚠️ Prix stores tranchés (§2.6) AVANT ce sprint. **Critère : matrice 3 sources × (achat, essai, annulation, expiration, restore) verte ; un abonné Stripe web est premium dans l'app ; un acheteur IAP est premium sur le web.**

**M11 — Contenu & réglementation** · Fiches espèces 26 natives (data partagée), guides : rendu in-app (WebView habillée vers les pages `/guides` = un seul contenu à maintenir, ou MDX natif si trivial), moteur réglementation + helper RecFishing, pages légales in-app. **Critère : parité contenu, aucun cul-de-sac web non stylé.**

**M12 — Qualité release** · Perf (démarrage < 2,5 s sur mobile moyen, FlashList sur toutes les listes, images cachées), a11y (labels, tailles tap ≥ 44), Sentry + PostHog vérifiés, Maestro smoke CI, icônes/splash, **captures stores** (6,7" + 6,1" iOS, phone+7" Android, en français, honnêtes — pas de mockup mensonger), **App Privacy Apple + Data Safety Google** (localisation, photos, identifiants, SDKs PostHog/Sentry/RevenueCat déclarés), purpose strings géoloc/caméra/photos/notifications relus, revue guidelines complète (3.1.3 IAP, 4.8 login, 5.1.1 privacy, 1.2 UGC). **Critère : checklist de pré-soumission 100 % verte, documentée dans le RECAP.**

---

## 6. M13 — Beta (2-3 semaines, mur d'horloge)

1. **iOS TestFlight** : build interne (équipe) → **beta review Apple** (rapide) → groupe externe « Fondateurs » (les comptes de la lane F + codes S68).
2. **Android** : internal testing (équipe) → **closed testing** track fondateurs (compte org = pas de règle 12/14, mais vise quand même ~20 testeurs réels : c'est ta beta utile).
3. Boucle hebdo : crashs Sentry triés à J+1, feedback in-app (mailto/form), **KPIs beta** : crash-free sessions > 99,5 %, ≥ 20 prises loguées mobile, ≥ 10 testeurs actifs semaine 2, funnel signup→1re prise mesuré.
4. 2-3 builds correctifs via EAS (OTA pour le JS, build complet si natif).
5. **Gate de sortie beta** : 0 crash récurrent, parité vérifiée par une passe QA complète (desktop = référence), avis fondateurs ≥ « je l'utilise au bord de l'eau ».

---

## 7. M14 — Soumission & sortie

1. **Soumettre Google d'ABORD** (review 1re app 7-14 j) puis Apple (24-48 h) — les deux en « managed publishing »/release manuelle pour synchroniser la sortie.
2. Prévoir 1 cycle de rejet (c'est la norme en 1re soumission) : réponses préparées sur géoloc (purpose strings), UGC (signalement+blocage+contact), IAP (parcours d'achat démontrable en review notes + compte démo fourni).
3. Android : 1re publication = pas de staged rollout (updates seulement) → sortir, puis updates en rollout 10 → 50 → 100 %.
4. **Fiche store (ASO, fr-FR)** : titre « Carnet de Pêche — pêche en mer », sous-titre orienté requêtes (« marées, spots, carnet »), mots-clés (pêche bar, marées, coefficient, surfcasting…), description honnête (pas de « 10 000 spots »), captures M12.
5. Site : page `/app` + smart banners + liens stores dans le footer/fil ; bascule PWA → « installe l'app » douce (la PWA reste, elle a servi de pont).
6. Lancement coordonné avec César (le skill `video-courte-peche` a enfin son CTA : « télécharge l'app »).
7. **J+30** : crash-free > 99,5 %, note ≥ 4,5 visée (répondre à TOUS les avis), rétention D7 fondateurs, part des prises loguées depuis mobile (attendu : > 60 % — c'est l'usage naturel du produit).

---

## 8. Post-launch (v1.x, en OTA autant que possible)

- **Prise vérifiée par photo + IA espèce/mesure** (Chantier G, différenciateur natif n°1 — anti-cheat ultime des classements). Sprint dédié, modèle on-device ou API.
- Widgets marées/créneau (iOS WidgetKit / Android Glance), Live Activities marée montante (iOS)** — le « wow » pêcheur.
- Mode hors ligne étendu (carte du département en cache, tuiles offline = promesse Local complète).
- Lien externe UE (DMA/billing choice) si les fees Apple UE se stabilisent → marge améliorée.
- Apple Watch (plus tard, si demande réelle).

---

## 9. Risques & parades

| Risque | Parade |
|---|---|
| Rejet Apple 3.1.3 (IAP) | IAP présent dès v1 (décision prise) + compte démo review + notes détaillées. |
| Rejet UGC 1.2 | Blocage utilisateur livré M6, contact modération dans la fiche + l'app. |
| Rejet géoloc 5.1.1 | Purpose strings précis, géoloc au geste uniquement, fallback ville BAN (déjà exigé par 5.1.1(iv)), pas de background location en v1. |
| Review Google 1re app lente (7-14 j) | Soumettre Google en premier, sortie synchronisée en release manuelle. |
| MapLibre RN ≠ GL JS (bathy/protocols) | Spike en M4 jour 1 ; fallback tuiles raster maison ; ne JAMAIS bloquer la v1 sur une couche secondaire. |
| Monorepo casse le web | M1 a un critère unique : web iso. Un seul sprint, gate dur, rollback facile. |
| Dérive de parité (2 clients à maintenir) | `packages/shared` maximal (métier/copy/schémas) ; toute nouvelle feature = « les 2 clients ou explicitement web-only » dans son brief. |
| Comptes stores en retard | Lane admin §2 démarre AUJOURD'HUI (DUNS = chemin critique). |
| Fees/règles stores qui bougent | Re-vérifier §3/§7 au M10 (les faits datent du 02/07/2026). |

---

## 10. Récap coûts & sources

**Coûts fixes** : Apple 99 €/an · Play 25 $ · EAS free puis 19 $/mois si > 15 builds/OS/mois · RevenueCat 0 jusqu'à 2 500 $/mois de revenu mobile · commissions ~15 % (Apple Small Business à activer dès l'éligibilité ; Play 10 % + 5 % billing).

**Sources (vérifiées 02/07/2026)** : Expo SDK 56 (expo.dev/changelog/sdk-56) · EAS pricing (docs.expo.dev/billing/plans) · MapLibre RN 11 (maplibre.org/maplibre-react-native, migration v11) · Apple guidelines 3.1.3/4.8/5.1.1/1.2 (developer.apple.com/app-store/review/guidelines) · Apple DMA UE (developer.apple.com/support/dma-and-apps-in-the-eu) · Small Business 15 % · Play billing choice UE 24/06/2026 (android-developers.googleblog.com) · Play fees 30/06/2026 (support.google.com/googleplay/android-developer/answer/16954621) · règle 12 testeurs = comptes perso uniquement (answer/14151465) · developer verification sept. 2026 (developer.android.com/developer-verification) · RevenueCat Expo + Stripe (revenuecat.com/docs) · délais enrollment Apple/Google (developer.apple.com/help/account, support.google.com/googleplay/android-developer/answer/13628312).

---

## 11. Prochaines actions concrètes

1. **John, cette semaine (pendant S69-73)** : lancer DUNS → Apple Developer org → Play Console org (§2) + trancher les prix stores (§2.6).
2. Finir S69 → S73 + lane amorçage (le gate §1).
3. Brief M1 (`docs/sprint-74/BRIEF.md`) au moment du lancement — je le rédige sur demande, comme pour les S69-73.
4. Au resync CLAUDE.md (S70 Bloc F) : référencer cette roadmap en §9 et mettre à jour §4 (SDK 56, monorepo cible → en cours à M1).

*La PWA reste le pont jusqu'au jour J. À la première décision qui dévie de ce plan, mettre ce fichier à jour — c'est lui qui fait foi pour la phase mobile.*
