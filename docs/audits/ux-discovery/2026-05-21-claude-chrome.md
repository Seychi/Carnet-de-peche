# Audit UX discovery — Claude in Chrome

> **Date** : 2026-05-21
> **Auditeur** : Claude Sonnet 4.5 via extension Claude in Chrome
> **Compte utilisé** : Seychi (redkps4@gmail.com, tier Discovery, 11 prises loguées)
> **Périmètre** : prod https://www.carnet-de-peche.com
> **Brief source** : `docs/tests/claude-in-chrome-ux-discovery.md`
> **Rapport conservé tel quel pour mémoire** — sert de baseline pour les futurs audits UX

---

## Interim findings (résumé en tête)

🚨 **Critical**
- `/fil`, `/especes`, `/techniques`, `/contact` (4 footer links) → 404
- `/legal/confidentialite` et `/legal/mentions-legales` contiennent `[À COMPLÉTER PAR JOHN]` placeholders → **RGPD non-conforme**

⚠️ **Major**
- Trial period inconsistency — hero says "14j essai", pricing + bottom CTA say "7 jours"
- `/home` says "Le carnet, la carte et la communauté arrivent bientôt" but `/carnet` works → stale waitlist page
- Date input format is US (MM/DD/YYYY) — French users expect DD/MM/YYYY
- Form validation error in English ("Invalid input") on `/carnet/nouvelle`
- "Saisir manuellement" lat/long fields display values as placeholders not actual values → user thinks fields are filled, submission fails

⚠️ **Bugs**
- Guide listing says "8 min de lecture", actual guide page says "20 min de lecture"
- Map on `/carte` blank for ~3s on first paint (slow first render)
- `/spots/pointe-du-raz` says "Données de marée non disponibles" — but it's a tide-sensitive bar spot
- Bouton "Spots autour de moi" but drawer title "Spots autour de toi"
- Carnet has 3 identical "Bar · Leurres · 52cm · 1.80kg" entries → seed data sloppy
- Carnet shows non-coastal locations (Grazac, Vallauris) for "pêche à la canne du bord"
- Label "COMMENT" on prise detail (instead of "MÉTHODE" / "TECHNIQUE")
- Testimonials look AI-generated (full names + cities pattern, generic phrasing)

✅ **Good**
- Tarifs page is excellent (clear, toggle works, économie shown)
- Guide content is genuinely expert ("ratio 5.6:1 à 6.2:1", real brand names)
- Auto-snapshot des conditions works (météo, houle, pression captured at submit)
- Confidentialité par défaut "Privée" + toggles précises = pro privacy UX
- 404 page has friendly tone ("Cette page a glissé du hameçon · Pas de panique, les poissons sont encore là")
- Empty state on Prises récentes → "Sois le premier à loguer une prise ici" + CTA

---

## 1. Première impression

Le site donne d'emblée une impression assez pro côté direction artistique et copywriting : la typo généreuse en serif foncé, la palette teal+ivoire+navy, le mockup mobile en hero, le tagline "Le carnet, la carte, et la communauté qui partage" ont du caractère. La voix est cohérente (tutoiement assumé, vocabulaire pêcheur — "coef. 88", "Shad kaki", "Pointe du Raz"), les sections de la home enchaînent un argumentaire clair (Strava pour pêcheurs · Anti-Fishbrain · 3 piliers), et le ton "zéro bullshit" est tenu. Les guides éditoriaux, quand ils s'ouvrent, sont d'une qualité technique étonnamment haute (canne 2,70-3 m / 15-60 g / ratio 5.6:1 à 6.2:1, vrais noms de marques Major Craft Crostage / Tenryu Injection SP / Sakura Speciment X / Daiwa Ballistic) — un vrai pêcheur de loisir comprend qu'un autre pêcheur a écrit.

Mais dès qu'on creuse, on tombe sur une série de fragilités très "alpha publique" qui cassent la promesse : 4 des 7 liens du footer renvoient en 404 (/fil, /especes, /techniques, /contact), la page Confidentialité contient encore `[À COMPLÉTER PAR JOHN]` en clair, les mentions légales n'ont pas de SIRET, l'essai gratuit est annoncé "14j" en hero puis "7 jours" partout ailleurs, le `/home` post-login affiche un message de waitlist ("Le carnet, la carte et la communauté arrivent bientôt") alors que `/carnet` fonctionne déjà avec 11 prises, les inputs de date sont en format US (MM/DD/YYYY) et un message d'erreur de validation est carrément en anglais ("Invalid input"). Bref, le squelette est très beau, mais la finition est cousue à gros points.

**Note globale : 6,5/10.** Le produit est largement plus mature qu'une démo (algorithme solunar, score 0-100, auto-snapshot conditions, floutage GPS, contrôles confidentialité fins, dialog de suppression irréversible), mais le visiteur exigeant repérera la couture en moins de 5 minutes. Verdict subjectif : "fait pro" sur 70 % du parcours, "fait amateur" sur les 30 % qui touchent à la confiance (légal, footer, copy chiffrés, locale).

---

## 2. Top 18 opportunités d'amélioration (priorisées)

| # | Page/Flow | Problème observé | Recommandation | Effort | Impact |
|---|---|---|---|---|---|
| 1 | Footer global | `/fil`, `/especes`, `/techniques`, `/contact` → 404 sur 4 des 7 liens "Communauté + Contact" | Soit stubber des pages "bientôt — inscris-toi pour être prévenu", soit retirer les liens du footer jusqu'à livraison | S | L |
| 2 | `/legal/confidentialite` & `/legal/mentions-legales` | Placeholders `[À COMPLÉTER PAR JOHN]`, `[À COMPLÉTER]` SIRET/adresse encore visibles en prod | Compléter avant tout autre chantier — non-conformité RGPD/L.10 Code Conso | S | L |
| 3 | Home hero vs CTA bas vs `/tarifs` | "14j" en hero, "ESSAI 7 JOURS" en CTA bas, "7 jours" partout sur `/tarifs` | Aligner sur 7 jours (ou 14 si décision produit), trouver/remplacer global | S | L |
| 4 | `/home` post-login | Affiche "Le carnet, la carte et la communauté arrivent bientôt" alors que `/carnet`, `/profil`, `/carnet/nouvelle` fonctionnent | Refaire `/home` en vrai dashboard : "Bienvenue Seychi · 11 prises · plus belle Bar 71cm · prochaine session optimale 18h30-21h30" + CTA "Loguer une prise" | M | L |
| 5 | `/carnet/nouvelle` | Validation "Invalid input" en anglais sur champ Espèce manquant | Traduire + rendre spécifique ("Choisis une espèce pour continuer") | S | M |
| 6 | `/carnet/nouvelle` lieu manuel | Lat/long s'affichent comme placeholders mais ne sont pas pré-remplies → user croit valider, submission rejetée | Soit pré-remplir réellement avec la dernière position, soit changer placeholder en "ex : 48.0382" pour éviter la confusion | S | M |
| 7 | Inputs date (carnet, profil) | Format MM/DD/YYYY (US) au lieu de DD/MM/YYYY (FR) | `<input type="datetime-local" lang="fr-FR">` ou champ custom | S | M |
| 8 | `/carte` premier paint | Map tiles blank pendant ~3s, aucun skeleton/spinner sur la map elle-même (juste filtres visibles) | Skeleton sur la zone carte ou tile basse résolution en preview, puis upscale | M | M |
| 9 | `/spots/pointe-du-raz` | "Données de marée non disponibles" sur un spot manifestement à marées | Brancher SHOM ou Open-Meteo Marine pour la zone — c'est LE feature attendu | M | L |
| 10 | Home — section "Une communauté qui démarre fort" | Témoignages avec full name+city pattern (Yann L. Finistère, Sophie M., Loïc B…) sentent l'IA générée | Soit recruter 5-10 vrais testeurs et publier prénom+initiale+département+vraie photo, soit retirer la section jusqu'à avoir du réel | M | M |
| 11 | Carnet (seed data) | 3 prises identiques "Bar · Leurres · 52cm · 1.80kg · il y a 8 jours" + spots non-côtiers (Grazac, Vallauris) sur un site "à la canne du bord" | Nettoyer la seed-data, n'autoriser que des spots du référentiel côtier dans le picker | S | M |
| 12 | Tap targets header & footer | Nav header 39px, footer links 17px (W3C/Apple recommandent ≥44px) | Padding vertical +6px sur nav, +12-16px sur footer-li | S | M |
| 13 | Fiche prise | Section nommée "COMMENT" (qui veut dire "How" en anglais) au lieu de "MÉTHODE" ou "TECHNIQUE" | Renommer + ajouter appât/leurre · marque · coloris visible | S | S |
| 14 | `/carte` drawer | Bouton "Spots autour de moi" mais titre du drawer "Spots autour de toi" | Aligner sur une variante (probablement "moi" car action user-initiée) | S | S |
| 15 | Guides | Liste = 3 guides seulement; durée affichée "8 min" en liste vs "20 min" sur la page guide | Synchroniser durée + ajouter 5-10 guides avant ouverture pub | M | M |
| 16 | Guides — cards | 2 cards sur 3 sans hero image (placeholder teal vide) | Ajouter une image par guide (1 dorade + 1 bar = même registre que celui qui marche) | S | M |
| 17 | `/spots/pointe-du-raz` itinéraire | Seulement Google Maps; pas de Waze ni Apple Maps (essentiel iOS) | Ajouter un picker "Itinéraire · Google Maps · Apple Plans · Waze" comme strava.com | S | M |
| 18 | Stripe absent | CGU + tarifs mentionnent Stripe mais aucun écran de paiement réellement testé (compte Seychi visiblement Discovery non payant) | À auditer dès que test cards Stripe en place — pas de checkout = pas de revenue | M | L |

---

## 3. Friction par parcours

### Anonyme → "Je veux comprendre ce que c'est"

**Ça coule** : tagline immédiatement intelligible, sous-tagline qui précise (carnet + carte + communauté), 3 piliers explicités, CTAs clairs.

**Ça frotte** : la 4e statistique "14j" en hero pose une promesse qui devient "7 jours" 800 px plus bas — le visiteur attentif perçoit l'incohérence comme un signal de "produit pas prêt".

**Abandon probable** : footer cliqué par curiosité → 4 liens 404 → "ah ils ne sont pas finis, je reviendrai plus tard". Beaucoup ne reviendront pas.

### Anonyme → "Je veux m'abonner"

**Ça coule** : `/tarifs` est franchement excellent — 3 cards lisibles, toggle Mensuel/Annuel calcule l'économie en € au mois ("Soit 49 €/an · tu économises 9,80 €"), "CB requise · annulation 1 clic" sous chaque CTA = honnête.

**Ça frotte** : "Pour démarrer ton carnet et voir si l'app te parle" sur la card Découverte — mention "App iOS / Android (sprint 13+)" laisse fuiter le vocabulaire interne de l'équipe (sprint = mot dev, pas user). Faut écrire "Bientôt sur iOS / Android".

**Abandon probable** : utilisateur clique "Essayer 7 jours" mais on n'a pas pu tester le flow Stripe en aval. Si le compte Seychi n'a pas pu être upgradé en Local, beaucoup d'autres ne le pourront pas non plus.

### Discovery → "Je veux voir si ça vaut le coup d'upgrader"

**Ça coule** : le bandeau "Tu vois 5 spots max. Passe Local pour 20, Itinérant pour 50" sur `/carte` est exemplaire — chiffré, non-culpabilisant, place le CTA à côté.

**Ça frotte** : les filtres grisés avec "Filtres disponibles avec Local ou Itinérant — Débloquer les filtres" sont OK, mais le lien envoie à `/tarifs` sans contextualiser "tu cherchais à filtrer par espèce, voici ce que Local débloque". Manque le `?from=carte&filter=espece` qui ferait un upsell finement adressé.

**Abandon probable** : utilisateur n'arrive jamais sur `/carte` parce qu'il a d'abord visité `/home` qui dit "arrivent bientôt".

### Local → "Je veux loguer ma première prise"

**Ça coule** : `/carnet/nouvelle` a une hiérarchie nette (espèce > mesures > technique > lieu > date > photo > confidentialité), un sticky CTA "Loguer la prise" bien visible, des champs conditionnels (Leurres → Marque + Modèle/coloris), un picker confidentialité élégant (Privée/Amis/Publique + 2 toggles précises), un auto-snapshot conditions (température air/eau, vent, pression, houle, période houle, nuages) qui est vraiment LA killer feature.

**Ça frotte** :
- (a) "Saisir manuellement" affiche lat/long en placeholders et non en valeurs → user croit que c'est rempli, submission échoue avec message rouge sous le bloc
- (b) Date au format US
- (c) Message d'erreur "Invalid input" en anglais sur champ Espèce

**Abandon probable** : utilisateur en mobile, GPS refusé ou imprécis, qui tente "Saisir manuellement", ne comprend pas pourquoi la submission échoue après 30 s passés à remplir.

### Local → "Je veux retrouver mon spot fétiche"

**Ça coule** : la page `/profil` a une section "Ton profil de pêcheur · Là où tombent tes 11 prises · Plutôt La nuit (9/11) · Surtout Au printemps (11/11)" — pépite UX, le user voit son data agrégée en 2 secondes.

**Ça frotte** : pas de filtre "spot" dans `/carnet`, juste espèce / technique / période. Pour retrouver "toutes mes prises à la Pointe du Raz", il faut scroller.

**Abandon probable** : faible — c'est un beau parcours.

---

## 4. Copy & tone

### 5 phrases qui marchent particulièrement bien

1. "Strava pour pêcheurs. Sans la toxicité." — section carnet home. Référence culturelle immédiate, promesse claire.
2. "Une communauté qui partage le savoir, pas les spots." — section communauté home. Résume parfaitement la proposition anti-Fishbrain.
3. "Cette page a glissé du hameçon · Pas de panique, les poissons sont encore là." — page 404. Voix maintenue, ne casse pas le moment.
4. "Sois le premier à loguer une prise ici" — empty state Prises récentes sur fiche spot. Engage et invite.
5. "CB requise · annulation 1 clic" — sous chaque CTA payant sur `/tarifs`. Honnêteté désarmante, réduit la friction d'engagement.

### 5 phrases à reformuler

| Emplacement | Actuel | Suggestion |
|---|---|---|
| Hero home (stat #3) | `14j · Essai gratuit garanti` | `7j · Essai gratuit garanti` (cohérence avec tout le reste) |
| `/home` post-login | "Le carnet, la carte et la communauté arrivent bientôt. Tu seras parmi les premiers à les découvrir." | "Salut Seychi. 11 prises au compteur · bar moyen 52,6 cm · plus belle 71 cm. [Logger une prise →] [Voir la carte →]" |
| Fiche prise | `COMMENT` (header) | `MÉTHODE` ou `TECHNIQUE` (avec sous-ligne `Leurres · BlackMinnow · noir`) |
| `/carnet/nouvelle` erreur | `Invalid input` | `Choisis une espèce avant de loguer ta prise.` |
| `/tarifs` Découverte | `App iOS / Android (sprint 13+)` | `App iOS / Android — bientôt` (jamais exposer du vocabulaire interne) |

### 3 mots/concepts peu clairs pour un pêcheur non-tech

1. **"Solunar"** / "Lever de lune · Vent idéal" — les badges sur la fiche spot supposent qu'on connaît la théorie solunar (les phases de lune influencent l'activité halieutique). Ajouter un tooltip "Comment c'est calculé ?" qui explique en 3 lignes.
2. **"Coef. 88"** — un débutant peut ne pas savoir que c'est le coefficient de marée 0-120. Ajouter un encart explicatif premium (Discovery a déjà accès aux marées).
3. **"Score d'activité 0-100"** — clair sur le principe, mais que veut dire "79 = Très Bonne, 71 = Bonne" ? Une légende visible une fois par session (toast/onboarding) au premier "Très bonne" : "Cette plage horaire combine 3 facteurs : phase lunaire, vent < 25 km/h, et historique des prises sur ce spot."

---

## 5. Mobile vs desktop

> ⚠️ **Limitation environnement** : la window-resize de mon outil n'a pas réellement contraint le viewport sous 1000 px (innerWidth est resté à 1201 même après resize(400×800)). Je n'ai donc pas pu auditer la version vraiment mobile rendue. Les observations qui suivent sont déduites du code DOM (présence d'un menu mobile détecté), des tailles de tap targets, et d'une lecture des composants type drawer/sheet.

### 3 forces desktop
1. Hiérarchie typo généreuse, large gutter, mock app iPhone en colonne droite qui sert de "preuve produit"
2. `/tarifs` avec 3 colonnes parfaitement alignées, badge "Le plus populaire" sur la card du milieu, CTA bien dimensionné
3. Sidebar fixe sur `/carte` pour les filtres — pattern classique mais propre

### 3 faiblesses desktop
1. Map sur `/carte` blank ~3s au premier paint (pas de skeleton sur la zone carte elle-même)
2. Le bouton flottant "Filtres" en bas-droite (icône cercle noir) entre en compétition visuelle avec la sidebar de filtres déjà visible — redondance
3. `/spots/pointe-du-raz` : zone carte beige en chargement puis pas toujours rendue côté tile

### 3 forces mobile (déduites)
1. Tap targets principaux (CTAs hero) à 51-52 px → conformes ≥44 px
2. Sticky CTA "Loguer la prise" en bas du form `/carnet/nouvelle` — bon pattern pouce
3. Drawer "Spots autour de toi" qui glisse de la droite avec icône close en X — pattern attendu

### 3 faiblesses mobile (déduites)
1. Nav header desktop = 39 px de hauteur, footer = 17 px de hauteur — sous le seuil 44 px. À auditer en vrai mobile pour confirmer que ces tailles ne sont pas conservées sous la breakpoint
2. Date input en format US (`<input type="datetime-local">` non-localisé) — sur iOS le picker affichera quand même DD/MM en mode device-fr, mais le rendu du champ vide ("MM/DD/YYYY") trahit le manque de localisation
3. Lat/long en placeholders ("Saisir manuellement") — sur mobile, le user qui tape "55" dans Taille puis remonte voir lat/long pensant qu'elles sont remplies tombe dans le piège

---

## 6. Quick wins (< 2h chacun)

1. Remplacer toutes les occurrences "14j" par "7 jours" (ou statuer + lock dans un constant `TRIAL_DAYS = 7`) — 15 min, gain massif en cohérence
2. Compléter `/legal/confidentialite` et `/legal/mentions-legales` (SIRET, dénomination, adresse, DPO) — 1 h juridique
3. Soit créer 3 pages stub "bientôt" pour `/fil`, `/especes`, `/techniques`, `/contact`, soit retirer ces liens du footer — 30 min
4. Traduire `Invalid input` → `Choisis une espèce pour continuer` dans la validation `/carnet/nouvelle` — 10 min
5. Renommer le header `COMMENT` → `MÉTHODE` sur la fiche prise — 5 min
6. Aligner "Spots autour de moi" (bouton) / "Spots autour de toi" (drawer title) — 5 min
7. Forcer `lang="fr-FR"` + `<input type="date">` localisé sur les date pickers — 30 min
8. Padding vertical +6 px sur les liens nav header et +12 px footer-li pour passer ≥44 px tap target — 30 min
9. Synchroniser durée guide listing/page (l'un dit 8 min, l'autre 20 min sur le même guide bar/leurre) — 5 min
10. Réécrire `/home` post-login comme un mini-dashboard (greeting + stats + 2 CTA) au lieu du waitlist message — 1 h

---

## 7. Bugs critiques rencontrés

| # | URL | Comportement observé | Attendu | Erreurs console |
|---|---|---|---|---|
| B1 | `/fil`, `/especes`, `/techniques`, `/contact` | 404 "Cette page a glissé du hameçon" | Soit page complète, soit stub | n/c |
| B2 | `/legal/confidentialite` | `[À COMPLÉTER PAR JOHN]` visible | Texte juridique réel | aucune |
| B3 | `/legal/mentions-legales` | `[À COMPLÉTER]` SIRET / adresse / dénomination | Mentions complètes | aucune |
| B4 | Home stat #3 vs `/tarifs` | "14j" vs "7 jours" | Cohérent | n/c |
| B5 | `/home` (logged in) | Waitlist message "arrivent bientôt" alors que `/carnet`, `/profil`, `/carnet/nouvelle` fonctionnent | Vrai dashboard | aucune |
| B6 | `/carnet/nouvelle` | Validation error "Invalid input" (en anglais) | Message FR spécifique | aucune |
| B7 | `/carnet/nouvelle` Lieu manuel | Lat/long affichées comme placeholders, pas prefilled values → submission rejetée alors que visuellement remplie | Soit valeur réelle, soit placeholder neutre | aucune |
| B8 | `/carnet/nouvelle` + `/profil` | Datetime input affiche `05/21/2026 03:16 AM` (US format) | `21/05/2026 03:16` FR | aucune |
| B9 | `/spots/pointe-du-raz` | "Données de marée non disponibles pour ce spot" sur pointe rocheuse à bar marée descendante | Données SHOM/OpenMeteo Marine | aucune |
| B10 | `/spots/pointe-du-raz` | Carte aperçu = zone beige vide jusqu'au scroll | Tile leaflet/maptiler chargée | aucune |
| B11 | `/guides/peche-bar-leurre-bord` (slug deviné) | 404 (slug réel = `peche-au-bar-au-leurre`) | Soit redirection 301, soit URL canonicale | aucune |
| B12 | `/carte` | Bouton "Spots autour de moi" → drawer titré "Spots autour de toi" | Cohérent | aucune |
| B13 | Carnet seed | 3 prises identiques Bar 52cm 1.80kg + spots non-côtiers Grazac/Vallauris | Données réalistes | aucune |
| B14 | Map `/carte` | Markers invisibles à zoom France entière sur 5 spots | Cluster ou hint "zoome sur Bretagne" | aucune |
| B15 | Liens MapTiler/OSM | `target="_blank"` sans `rel="noopener noreferrer"` sur les 2 attribution links | Avec rel sécurité | aucune (mineur) |

> Aucune erreur console JavaScript bloquante détectée — la qualité du build est correcte. Les bugs sont tous "fonctionnels" / "contenu" / "i18n".

---

## 8. Verdict final

**État global du produit en mai 2026** : Carnet de Pêche est dans une zone hybride **beta avancée → pre-launch publique**. Le cœur produit (carnet illimité, auto-snapshot conditions, scoring solunar 0-100, floutage GPS, contrôles confidentialité fins, dialog de suppression irréversible) est réellement implémenté et marche. Le copywriting, la DA et les guides éditoriaux dépassent largement le niveau d'un MVP français moyen. Il y a ici un produit qui sait pourquoi il existe et qui a fait des choix nets (canne du bord uniquement, anti-toxicité, tutoiement, anti-spot-burning).

Mais le site souffre d'une couture finale incomplète qui le ramène au niveau "alpha publique" : 4 liens footer en 404, mentions légales à compléter, incohérence 14j/7j sur le bénéfice central de l'offre, `/home` post-login qui dit l'inverse de ce que le produit fait, format de date US, et un message d'erreur de validation en anglais. Pris isolément chacun est mineur ; cumulés sur les 10 premières minutes d'un visiteur exigeant, ils détruisent la confiance que le hero et les guides ont construite.

**Recommandation chantier sprint 8/9** : avant toute nouvelle feature (notifications push, app mobile, bathymétrie SHOM…), passer 2-3 jours sur les "quick wins" de la section 6 + boucher les 4 trous légaux/footer. C'est rentabilité d'effort maximale : pour ~20 h de dev, le site passe de "fait amateur sur les zones de confiance" à "fait pro de bout en bout". Le sprint suivant peut alors attaquer les vraies opportunités (`/home` dashboard, marées sur Pointe du Raz, second 5-10 guides, bandeau upsell contextuel par filtre) avec une fondation propre.

**Mon pronostic** : si tu fais Gate 1 (beta privée) sans corriger les bugs B1-B8 ci-dessus, tu auras des retours utilisateurs qui parleront du footer 404 et du "14j vs 7j" plutôt que de tes vraies questions produit. Corrige-les avant, et la beta privée pourra se concentrer sur ce qui compte : l'adoption du logging, la cohérence du score 0-100 avec leur ressenti, et la valeur perçue du floutage GPS.

---

## Limitations de cet audit

- Audit fait dans la session existante connectée ("Seychi" — semble Discovery, 11 prises, 6/200 chars bio), pas en vrai incognito anonyme. Tous les "anonyme" du brief sont donc une approximation (header montrait "SE Seychi" en permanence).
- Pas pu tester les tiers Local + Itinérant en switchant les comptes (entrée de password interdite par mes règles de sécurité).
- Pas pu réellement contraindre le viewport sous 1000 px → audit mobile basé sur déductions du DOM + tailles tap targets, pas sur rendu mobile authentique.
- Pas de network throttling.
- Pas testé checkout Stripe ni magic link auth.
- Une prise test "Bar 55 cm · Pointe du Raz (test Claude)" a été loggée et supprimée — solde inchangé à 11 prises (vérifié).

> Bonne suite pour les sprints 8-11 — y'a vraiment un bon produit qui dort sous les coutures.
