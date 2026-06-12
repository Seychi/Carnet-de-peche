# Audit Carnet de Pêche — 2026-06-11 (Claude in Chrome)

> Archivé le 2026-06-12. Constats vérifiés dans le code le 2026-06-12 — verdicts dans le tableau de triage en bas.
> **Plan d'action : `docs/sprint-10.6/BRIEF.md`** (phase cleanup dédiée).

## Résumé exécutif

Le produit est étonnamment abouti pour un stade aussi précoce : copy en tutoiement cohérente partout, pages légales (mentions/confidentialité/CGU) de qualité professionnelle, fiche spot riche (marée + curseur « maintenant », vagues, houle, période, score, « Meilleurs moments »), formulaire de prise excellent (auto-snapshot des conditions, contrôles de confidentialité granulaires, conversion WebP), et un fil fonctionnel (post/like/commentaire/signalement testés OK). L'architecture responsive (sidebar desktop → tab bar + FAB mobile, cibles 44px) est proprement faite, et la console de l'app est propre (les seules erreurs JS viennent de la toolbar Vercel).

Mais il y a plusieurs P0 qui touchent au cœur du business : (1) un décalage légal/commercial sur les paiements — les paiements Stripe sont bel et bien actifs (le compte test a un abonnement facturé), or la Politique de confidentialité ET les CGU affirment « paiements à venir / non disponibles actuellement » ; (2) aucun parcours d'annulation/gestion d'abonnement réel — « Gérer mon abonnement » boucle vers une page cul-de-sac, sans Stripe portal ni bouton « Annuler », ce qui contredit la promesse « annulation en 1 clic » et pose un problème de droit conso ; (3) un post arnaque visible publiquement (fil + profil), révélant l'absence de modération ; (4) une édition de prise qui modifie un champ non touché (Conservé→Relâché). S'ajoutent des problèmes de calibration (le score note quasi tout « 100 / Exceptionnelle »), de cohérence géo (prise enregistrée en mer Rouge sans validation France), et des blocages UI sévères (INP jusqu'à ~5 s).

## Constats par priorité

### P0 — Bloquant (bug, promesse mensongère, parcours cassé)

**[Légal vs Tarifs — Paiements]** — Contradiction majeure : la Politique de confidentialité (§3.5, §5.1) et les CGU (art. 5.3) affirment que les paiements sont « à venir — non disponibles actuellement » / « à compter de l'activation des paiements ». Or `/compte/abonnement` du compte test affiche « ITINÉRANT · Actif · prochain prélèvement le 19 juin 2026 » → les paiements Stripe sont réellement en production. Reproduire : comparer `/legal/confidentialite` (« Stripe à venir ») et `/compte/abonnement` (abonnement actif facturé). Suggestion : mettre à jour les documents légaux immédiatement (RGPD/droit conso exigent une info de facturation exacte) — c'est le constat le plus urgent.

**[/compte/abonnement — Gestion/annulation]** — Aucun parcours d'annulation ni de gestion réelle. La page « Ton abonnement » n'a qu'un bouton « Voir les formules » qui renvoie vers `/tarifs` ; et les CTA « Gérer mon abonnement » des cartes Tarifs bouclent vers cette même page cul-de-sac. Pas de bouton « Annuler », pas de Stripe Billing Portal, pas de Checkout déclenché (vérifié réseau : aucun appel `stripe`). Reproduire : `/compte/abonnement` → « Voir les formules » → `/tarifs` → « Gérer mon abonnement » → retour `/compte/abonnement`. Suggestion : brancher le Stripe Customer Portal (annulation/MAJ CB) ; sans cela la promesse « Annulation en 1 clic depuis ton compte » (CGU 5.5, Tarifs) est fausse et juridiquement risquée.

**[Fil + Profil public — Modération]** — Un post utilisateur de type arnaque/spam (« Gift Cards #1 — Genuine Code: OP-SBNG-TFBC — Please contact us for more information », avec bouton copier) est visible dans le fil 06 et sur le profil public `/u/testIninerant`. Reproduire : ouvrir `/fil/06` ou `/u/testIninerant`. Suggestion : supprimer ce post, et prioriser un filtre anti-spam minimal (liens/codes promo) avant la « modération IA post-beta » annoncée. (Remonté aussi comme signalement sécurité.)

**[Carnet — Édition]** — Éditer une prise modifie un champ non touché : j'ai changé uniquement l'espèce (Lieu jaune→Bar) et la taille (34→55), et « Sort de l'eau » est passé de Conservé à Relâché tout seul. Reproduire : créer une prise « Conservé », l'éditer sans toucher le toggle, enregistrer → elle devient « Relâché ». Suggestion : le formulaire d'édition ne réhydrate pas correctement l'état `released` ; corriger la valeur par défaut au chargement.

### P1 — Important (friction UX, incohérence, mobile cassé)

**[Performance — INP global]** — Blocages du thread principal récurrents et sévères sur quasiment toutes les interactions : warnings INP mesurés à 269 ms, 393 ms, 1 037 ms, 4 011 ms, 5 034 ms. Reproduire : cliquer like/commenter/naviguer ; l'overlay « INP Issue … blocked UI updates for X ms » apparaît. Suggestion : profiler les handlers (souvent sur des éléments simples : SVG cœur, liens) — probable re-render massif ou travail synchrone au clic. Impacte directement le ressenti « app lente ».

**[Carnet — Cohérence géo / validation France]** — La prise de test a été enregistrée avec un GPS en mer Rouge (27.40°N, 33.67°E, Égypte) capté par la géoloc, sans aucune validation alors que le produit est « France métropolitaine » (CGU 4.1). Résultat incohérent : GPS=Égypte, ville saisie=« Antibes », spot associé=« Anse de Térénez » (Finistère), et conditions auto = eau 26,2 °C (valeurs mer Rouge, pas Méditerranée). Suggestion : valider que le point tombe dans la zone couverte, sinon avertir / refuser ; sinon les stats et le scoring sont pollués.

**[Carte — Filtre département buggé]** — Filtrer sur « 29 — Finistère » affiche des spots de Morbihan : « Quiberon - Côte Sauvage » (47.5°N 3.13°O, fil d'Ariane « MORBIHAN · 56 ») apparaît sous le filtre Finistère, et la carte ne se recentre pas sur le département choisi. Reproduire : `/carte` → Département → 29 → cliquer le marqueur near Quiberon. Suggestion : corriger le mapping spot→département et recentrer la vue.

**[Scoring — Calibration]** — Le score « Meilleurs moments » note 6 jours/7 à « 100 · Exceptionnelle » (reste 95–98) sur Anse de Térénez ; idem « 93/95 EXCEPTIONNELLE » un peu partout. Quand tout est exceptionnel, l'argument central (« te dit quand sortir ») perd toute crédibilité. Suggestion : recalibrer la distribution (courbe plus étalée, « exceptionnel » rare).

**[Fiche spot — Carte vide]** — Le bloc carte des fiches spot reste sombre/vide (seule l'attribution « © MapTiler © OpenStreetMap » s'affiche, sans tuiles) — alors que la page `/carte` charge bien les tuiles. C'est donc spécifique aux fiches. Reproduire : `/spots/anse-de-terenez` ou `/spots/quiberon-cote-sauvage`. Suggestion : vérifier l'init de la carte sur la fiche (conteneur non monté / clé MapTiler).

**[/fil — Stub affiché même connecté]** — Taper/cliquer `/fil` (racine) montre la landing marketing « Crée ton compte pour rejoindre ton fil » même connecté ; le vrai fil est `/fil/06`. Suggestion : rediriger l'utilisateur connecté de `/fil` → `/fil/<son-dept>`.

**[Couverture réelle vs promesse]** — Marketing : « 100+ spots curés », « 27 départements côtiers couverts ». Réel : le sélecteur carte ne propose que 2 départements (29, 56) et ~10 spots ; le profil propose 17 départements. Suggestion : aligner la comm sur l'état réel (« en cours de déploiement ») pour éviter la déception à l'abonnement.

**[Tarifs — Toggle annuel sans effet (déconnecté)]** — Déconnecté, activer « Annuel −17% » ne change rien d'affiché (reste « 4,90 €/mois » / « 9,90 €/mois », pas de ligne « Soit 49 €/an »). Connecté, la ligne « Soit 49 €/an · tu économises 9,80 € » s'affiche bien. Suggestion : le visiteur non connecté (= cible d'acquisition) ne voit pas l'économie annuelle → corriger le rendu déconnecté.

**[Abonnement — Entrée manquante dans le menu]** — Le menu utilisateur (Mon profil / Mon carnet / Déconnexion) n'a aucune entrée « Abonnement / Facturation ». Pour un freemium, l'accès à la gestion d'abonnement devrait être évident. Suggestion : ajouter « Mon abonnement » au menu.

### P2 — Polish (copy, visuel, détail)

**[Global — « Logger » vs « Loguer »]** — Orthographe incohérente du verbe : « Logger une prise » (CTA dashboard) vs « Loguer une prise » (nav/header) ; toast « Prise loggée ! ». Suggestion : choisir une graphie unique (« loguer / logué » recommandé en FR).

**[Pluriels dynamiques]** — « 1 prises au total » (carnet), « Là où tombent tes 2 prises » alors que « Pas encore assez de données ». Suggestion : gérer le singulier/pluriel et fiabiliser le compteur (double comptage suspecté).

**[Tarifs — « 1 clic » vs « 2 clics »]** — Badge « Annulation en 1 clic » vs FAQ « en 2 clics ». Harmoniser.

**[Données — Direction des vagues/vent « 0 »]** — Affichages « VENT 0 2 » (dashboard), « Direction 0 (273°) » (fiche spot) : la direction cardinale n'est pas calculée et s'affiche « 0 » au lieu de « O / Ouest ». Suggestion : mapper degrés→cardinal.

**[/spots — « Finistère (29) » / « 8 spots »]** — L'en-tête « Finistère (29) » (code dept) au-dessus de « 8 spots » prête à confusion (ressemble à un compteur). Suggestion : « Finistère · 8 spots » plus clair.

**[Like — Pas de compteur sur sa propre action]** — Liker son propre post passe le cœur en rouge mais n'affiche pas « 1 » (alors qu'un autre post montre « 1 »). Mineur.

**[Auth — Email non reporté vers le reset]** — Saisir son email puis « Mot de passe oublié ? » n'auto-remplit pas le champ email du formulaire de reset. Suggestion : pré-remplir.

**[Infra — Toolbar Vercel + 503 en prod]** — La toolbar `vercel.live` (feedback/preview) tourne sur le domaine de prod `www.carnet-de-peche.com` (warnings zustand + exceptions `InvalidNodeTypeError`, et probablement la source des overlays INP). Un `GET /tarifs?_rsc=…` a aussi renvoyé un 503 ponctuel. Suggestion : désactiver la toolbar Vercel en prod ; surveiller les 503 RSC.

**[Layout — « Me déconnecter » étiré]** — Sur le dashboard, le bouton « Me déconnecter » s'étire sur toute la largeur à côté de « Salut testIninerant » (bizarre visuellement).

**[Nav — Deux systèmes de header]** — `/carte`, `/spots`, `/guides`, `/u/...` utilisent le header marketing ; `/home`, `/carnet`, `/profil`, `/fil/06` utilisent la sidebar app. Le profil public mélange même sidebar app + header marketing. Suggestion : unifier la navigation connectée.

## Ce qui marche bien (à ne pas casser)

- Pages légales exemplaires : mentions, confidentialité (RGPD complet : bases légales, sous-traitants, durées, droits), CGU détaillées — rares à ce niveau pour une si jeune app. Tutoiement parfait.
- Formulaire de prise : auto-snapshot des conditions (météo/vent/vagues/houle/pression/marée) au moment de la prise ✓, « Privé par défaut » ✓, contrôles granulaires (« Coords précises pour mes amis » / « publiques »), conversion WebP automatique avec taille affichée, indicateur « min légal 30 cm », toggle Conservé/Relâché (no-kill).
- Fiche spot : courbe de marée 24 h avec curseur « Maintenant », bascule Courbe/Grille, vagues + houle + période + temp. eau, section DANGERS (sécurité), gating propre déconnecté (coords verrouillées, score « —/100 »), badge « Zone floutée 1 km », titres SEO soignés (« Pêche à X (29) — Bar… »).
- Fil : post/like/commentaire/signalement fonctionnels ; modal de signalement avec motif métier « Spot brûlé (coords précises balancées) » — très bien pensé. Confirmation de suppression claire et irréversible.
- Suppression de prise : modal de confirmation explicite, toast, redirection propre.
- 404 brandée (« Cette page a glissé du hameçon »), landing claire et bien argumentée, guides éditoriaux de qualité.
- Responsive bien architecturé : sidebar `desk:block` → bottom tab bar mobile (Carnet/Carte/FAB Loguer/Fil/Profil), cibles `min-h-11` (44px), FAB central élevé. Console app propre.

## Top 10 des chantiers (classés par impact)

1. Corriger les documents légaux sur les paiements (Confidentialité + CGU disent « paiements à venir » alors qu'ils sont actifs) — risque juridique immédiat, effort faible.
2. Implémenter la gestion/annulation d'abonnement (Stripe Billing Portal) — la promesse « annulation 1 clic » est aujourd'hui fausse ; bloquant conso.
3. Modération anti-spam minimale + suppression du post arnaque (visible fil + profil public).
4. Performance / INP : éliminer les blocages 1–5 s sur les interactions (et retirer la toolbar Vercel de la prod).
5. Recalibrer le scoring pour qu'« Exceptionnelle » soit rare — c'est le différenciateur produit.
6. Bug d'édition de prise (Conservé→Relâché involontaire) + validation géo France (refus/avertissement hors zone).
7. Corriger le filtre département de la carte (spots Morbihan sous Finistère, pas de recentrage).
8. Réparer la carte des fiches spot (tuiles non rendues) + toggle annuel déconnecté (afficher l'économie).
9. Aligner la comm sur la couverture réelle (2 dept / ~10 spots vs « 27 dept / 100+ spots ») + ajouter « Mon abonnement » au menu + rediriger `/fil`→`/fil/<dept>`.
10. Polish copy : unifier « loguer », pluriels (« 1 prise »), « 1 clic vs 2 clics », direction vent/vagues « 0 »→cardinal, unifier les deux systèmes de navigation.

---

## Triage code (2026-06-12)

| Constat | Verdict après lecture du code | Note |
|---|---|---|
| Légal « paiements à venir » | ✅ Confirmé | `confidentialite/page.tsx` l.102-156, CGU art 5.3 |
| Pas d'annulation/portal | ⚠️ Faux positif partiel | Portal branché (`compte/abonnement/page.tsx` l.192-198, `app/api/stripe/portal/route.ts`) mais masqué si pas de `stripe_customer_id` → compte test = seed sans Stripe (backlog sprint 9 § anti-traîne) |
| Post arnaque / modération | ✅ Confirmé | Rate-limit fréquence seul (`feed.ts`, migration 022), aucune voie admin (RLS author-only) |
| Édition Conservé→Relâché | ✅ Confirmé | `lib/catches/actions.ts` l.~152 + réhydratation `CatchForm` |
| Validation géo absente | ✅ Confirmé | `lib/catches/schema.ts` l.42-43 : lat/lng monde entier |
| Filtre dept carte | ⚠️ Partiel | Filtre SQL+front corrects ; recentrage absent confirmé ; donnée Quiberon à vérifier en prod |
| Carte vide fiche spot | ✅ Confirmé | Race init/hauteur conteneur (`SpotMiniMap` + conteneur 280px) |
| Scoring sature | ✅ Confirmé | Seuil exceptionnelle 90, amplitude négative quasi nulle (`lib/solunar/config.ts`) |
| `/fil` stub connecté | ⚠️ Confirmé en surface | Redirection codée (l.44-50) mais probablement servie statique → `force-dynamic` |
| INP 1-5 s | ⚠️ Incertain | Toolbar Vercel suspecte (hors repo, réglage Vercel) + `PostCard` sans memo |
| Toggle annuel déconnecté | ❌ Infirmé dans le code | Rendu client identique connecté/déconnecté — à re-tester en prod |
| Direction vent « 0 » | ❌ Code correct | `compass()`/`degreesToCompass()` corrects — chemin fautif à reproduire |
| Menu sans « Mon abonnement » | ✅ Confirmé | `AppHeader.tsx` |
| Copy (loguer, pluriels, clics, couverture) | ✅ Confirmé | 6 occurrences « logg », `CatchStatsRow` l.25, home l.227/354 |
| Deux systèmes de nav | ✅ Confirmé, par design | Route groups `(marketing)`/`(app)`/`(map)` — non traité en 10.6 |
| Bouton déconnexion étiré | ✅ Confirmé | `sign-out-button.tsx` `w-full` |
| Email reset non repris | ✅ Confirmé | `login/page.tsx` states indépendants |

**Plan d'action complet : `docs/sprint-10.6/BRIEF.md`.**
