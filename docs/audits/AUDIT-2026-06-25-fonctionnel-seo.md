# 🧪 Audit fonctionnel (live) + SEO/contenu — Carnet de Pêche

> Réalisé le **2026-06-25**, sur la **prod live** `www.carnet-de-peche.com`, **connecté** (compte @Seychi), en navigateur réel (Chrome) + lecture du code (`main`).
> Demande de John : *« audit complet, teste toutes les fonctionnalités, trouve ce qu'il y a à améliorer. »* Axes choisis : **fonctionnel & UX live** + **SEO & contenu**.
>
> **Cet audit COMPLÈTE** `AUDIT-UX-2026-06-24.md` (IA/navigation) et `AUDIT-POST-S28-2026-06-24.md` (espace perso). Il ne refait PAS l'audit nav (résolu au S27/S28 — vérifié OK ci-dessous). Il ajoute : **parcours fonctionnels testés un par un**, **pass SEO technique chiffré**, **profondeur éditoriale**.

---

## 0. Périmètre & honnêteté méthodo

**Vérifié en live (desktop, connecté @Seychi)** : home marketing, `/tarifs`, `/especes` + `/especes/bar`, `/guides`, `/spots` + fiche spot (`/spots/port-tino-rossi-ajaccio`), `/carte`, `/techniques`, `/peche/bar/leurres` (programmatique), `/home` (dashboard), `/carnet`, `/carnet/nouvelle` (formulaire testé, **sans créer de fausse prise**), `/fil` → `/fil/06`, `/compte/abonnement`, `/profil`, `/notifications`. **Console + réseau lus sur chaque page : zéro erreur JS / zéro requête en échec.**

**Pass SEO technique** : `robots.txt`, `sitemap.xml` (live, fetché), balises `title`/`description`/`canonical`/`robots`/`og`/JSON-LD extraites en direct sur 6 gabarits + lecture `app/sitemap.ts`, `app/robots.ts`, `lib/seo/programmatic.ts`.

**Contenu** : lecture des 26 fichiers `lib/especes/content/*.ts` + 5 guides `content/guides/*.mdx`.

**⚠️ NON vérifié cette session (limites à connaître — détail §5)** :
- **L'expérience GRATUITE.** @Seychi est **Itinérant actif** (vu sur `/compte/abonnement`, prélèvement 22/06/2027, facture comp'd 0 €). Je vois donc TOUT en précis. Le **floutage GPS**, le **gating 3 spots/dépt**, les **paywalls carte** et l'**état du badge score** côté gratuit n'ont **pas pu être testés**. → à rejouer avec un compte gratuit dédié. **C'est le parcours le plus critique non couvert.**
- **Le rendu mobile réel.** Le resize du navigateur piloté est inopérant (display 1920 px fixe → `innerWidth` reste 1920 même après resize). Même limite que les audits du 24/06. Constats mobile = code + captures 390 px du 22/06, **pas re-vérifiés visuellement** ce jour.
- **Flux à effet de bord, volontairement non déclenchés** : Checkout Stripe (vraie CB), suppression de compte (destructif), upload photo réel, publication d'un post, soumission d'une prise. La pastille ronde sombre milieu-droite des captures = **barre d'outils Vercel** (déjà identifiée, non-produit).

---

## 1. Verdict global

**Le site est solide, rapide et propre.** Sur les ~18 pages parcourues, **aucune erreur console, aucune requête en échec, aucun écran cassé**. La DA v2 est tenue partout, la carte est concurrentielle, les fiches spots tiennent tête à spot-de-peche.com, et — surtout — **le pôle Espèces est en réalité TERMINÉ (26 fiches profondes live)**, bien au-delà du « 6/20 » encore écrit dans `CLAUDE.md`. Les chantiers nav (S27/S28) et espèces (S29 : +barracuda, tassergal, liche, marbré, lieu noir, merlan) ont **bien landé**.

Tu n'as donc **pas** de problème de stabilité ni de features. Les axes d'amélioration sont **ciblés** :

1. **Une incohérence produit nette** : on promet 26 espèces (fiches + carte + onboarding), mais le **carnet n'en accepte que 6 à loguer**.
2. **Du polish SEO/honnêteté** : un bug de titre `/fil` qui scale sur ~24 départements, et des mockups marketing « perso » non marqués *Exemple* qui sur-vendent le moat.
3. **Le vrai frein reste non-technique** : le **réservoir est vide** (8 prises sur ton compte, 1 post dans le fil 06, scores « en attente de la communauté ») — pré-lancement de fait. Connu (Chantier D), mais c'est ce qui plombe le plus l'expérience perçue aujourd'hui.

**Notes synthétiques (sur le périmètre audité)**
- Stabilité / qualité live : **9 / 10** (zéro erreur, perf perçue bonne).
- Fiches spots / espèces / SEO : **9 / 10** (profond, sourcé, structuré).
- Cohérence fonctionnelle : **7 / 10** (le carnet 6 espèces casse la promesse).
- Honnêteté marketing : **7,5 / 10** (mockups perso à cadrer).
- Remplissage / time-to-value à froid : **3 / 10** (réservoir vide — hors périmètre bug, mais déterminant).

---

## 2. Ce qui marche (vérifié live)

- **Home** : value prop claire, widget marée + score, stats (26 espèces / 157 spots / 100 % social gratuit). Zéro erreur.
- **Tarifs** : 3 formules lisibles, toggle annuel −17 %, réassurance (satisfait/remboursé, Stripe, annulation en ligne). FAQ.
- **Espèces** : **26 fiches profondes** (`/especes` + `/especes/[slug]`), réglementation **sourcée et datée** (`verifiedAt` 21→24/06/2026, ultra-frais), JSON-LD `Article` + `BreadcrumbList` + `FAQPage`, `title` exemplaires (« Bar (Dicentrarchus labrax) : pêche du bord, saisons, taille légale »). Bloc honnête quand la communauté manque (« le score s'allume dès que la communauté logue »).
- **Fiche spot** : au niveau des concurrents — « Meilleurs moments » solunar 7 j avec **décomposition Astro/Marée/Vent**, réglementation par espèce (mailles + marquage/quota), **fond EMODnet**, courbe de marée (curseur « maintenant », toggle Courbe/Grille), itinéraire GPS (Maps/Plans/Waze), lien Windy. **Honnêteté assumée** : « Score générique […] identique pour tous ; tes tendances perso vivent dans ton carnet. »
- **Carte** : tuiles MapTiler OK (pas de canvas noir), 157 spots, markers colorisés par score + légende, **20 filtres espèces** + techniques + structure + dépt + difficulté + provenance (vérifiés/communautaires/OSM), géoloc, « Proposer un spot ».
- **Carnet (cœur produit)** : dashboard riche (8 prises, record 71 cm, 62,5 % relâche), **log de la bredouille présent** (« Logue ta sortie »), et surtout **« Tes tendances » PERSONNALISÉES** (86 % au printemps, 71 % le mercredi, 57 % vent léger…) avec **niveaux de confiance + taille d'échantillon honnêtes** (X/7). Le « carnet qui parle » est donc **partiellement réel**, en mode descriptif.
- **Formulaire Nouvelle prise** : complet (mesures + slider taille, poids, conservé/relâché, technique, lieu GPS/ville/manuel, date-heure FR, photo HEIC 20 Mo, notes, **confidentialité Privée/Abonnés/Publique** + toggles coords précises conformes aux règles produit).
- **Fil** : `/fil` redirige bien vers `/fil/06`, onglets Ton département / Tes follows / Toute la côte, composer (Photo + Prise), like/commentaire/signalement/partage.
- **Notifications** : types variés (commentaire, likes, follows, **demande de co-pêchage** → Chantier G live), horodatage relatif.
- **Abonnement / Profil** : propres, Stripe Portal câblé, emails de relance togglables, profil éditable (pseudo/bio/ville/dépt/techniques/espèces).
- **Nav connectée (S28)** : sidebar avec Co-pêchage + groupe DÉCOUVRIR (Espèces, Guides) → **plus de pages orphelines** (audit nav du 24/06 confirmé résolu).

---

## 3. Findings priorisés

| # | Sévérité | Sujet | Type |
|---|----------|-------|------|
| 1 | 🟠 P1 | Carnet : seulement **6 espèces loguables** vs 26 promises | Cohérence produit |
| 2 | 🟠 P1 | `title` `/fil/[dept]` : « Fil **du** Alpes-Maritimes » (→ **des**) | SEO / i18n, scale ~24 dépts |
| 3 | 🟠 P1 | Mockups marketing « ⚡ Perso » non marqués *Exemple* | Honnêteté / attentes |
| 4 | 🟡 P2 | Nouvelle prise : soumission à vide → aucun retour visible près du CTA | UX form |
| 5 | 🟡 P2 | Guides : 5 seulement + 2/3 vignettes = placeholder poisson | Contenu / visuel |
| 6 | 🟡 P3 | `/techniques` : meta « inscris-toi pour être notifié » sans capture email | Copy/meta |
| 7 | 🟡 P3 | Notif « a interagi avec toi « a demandé à rejoindre ta sortie » » générique | Copy |
| 8 | 🟡 P3 | Fiche spot : mini-carte affiche un spinner au 1er paint | Perf perçue |

### 🟠 1 — Le carnet ne logue que 6 espèces, alors que le produit en promet 26
**Repro** : `/carnet/nouvelle` → section ESPÈCE n'affiche que **Bar, Dorade royale, Lieu jaune, Maquereau, Sar, Orphie**. Aucun bouton « plus / autre espèce », aucune recherche (confirmé en JS : 6 boutons, `hasMoreSpeciesControl=false`).
**Pourquoi ça compte** : les 20 autres espèces ont une **fiche profonde** ET sont marquées `inCarnet: true` dans le référentiel (`lib/seo/programmatic.ts`). Un pêcheur lit ta fiche seiche/mulet/congre… puis **ne peut pas loguer sa prise**. C'est l'angle mort de l'audit nav du 24/06 (« tes fiches sont enterrées ») poussé d'un cran : *non seulement enterrées, mais non-loguables*. Ça casse le pitch « 26 espèces de chez nous » de la home.
**Note** : peut être un reliquat de la décision 2026-06-11 (« carnet reste sur les 6 ») non re-synchronisée avec l'extension `inCarnet` du sprint 23. **Décision à trancher** : soit étendre le sélecteur aux 26 (avec recherche, vu la longueur), soit assumer publiquement un sous-ensemble « loguable ». En l'état c'est contradictoire.

### 🟠 2 — Bug de titre SEO sur le fil départemental
**Repro** : `/fil/06` → `<title>` = **« Fil du Alpes-Maritimes (06) · Carnet de Pêche »**. Le H1 (« Fil Alpes-Maritimes ») est OK, mais le `title` met « **du** » devant un nom pluriel → doit être « **des** Alpes-Maritimes ».
**Portée** : la logique d'article est probablement uniforme → suspecte aussi sur **Côtes-d'Armor, Landes, Bouches-du-Rhône, Pyrénées-Orientales, Pyrénées-Atlantiques** (« des »), et l'élision **Hérault/Aude/Eure** (« de l' »). ~24 départements côtiers = ~24 titres potentiellement fautifs, indexables. Centraliser une fonction `articleDeDepartement(nom)` (comme `SPECIES[].articleDe`) et l'appliquer au `generateMetadata` du fil.

### 🟠 3 — Les mockups « perso » de la home ne sont pas marqués *Exemple*
**Repro** : home → le widget hero affiche un anneau **« 87 · TON CRÉNEAU 18:30→21:30 · Calculé sur tes derniers bars : marée descendante, coef > 80, le soir » + badge « ⚡ PERSO »** ; plus bas, « Ton année en un coup d'œil », « Ton plus beau bar ». Aucun label *Exemple* visible.
**Pourquoi ça compte** : le **score perso prédictif est neutralisé** (le réel est un solunar **générique**, comme tu l'écris honnêtement sur les fiches spots). Le hero promet donc un moat (« calculé sur TES bars ») que le produit ne délivre pas encore en prédictif. Risque de déception à l'inscription + incohérence avec ton propre discours « score générique » ailleurs. **Reco** : remettre le label *Exemple* (la décision T1.5 du sprint 9.5 l'avait fait — semble perdu sur le hero v2) ou requalifier le badge en « ⚡ Perso *bientôt* » / passer la copy au conditionnel.

### 🟡 4 — Nouvelle prise : pas de feedback de validation près du CTA collant
**Repro** : `/carnet/nouvelle`, formulaire vide → clic « Loguer la prise » (bas, collant) : rien ne se passe, **aucun message visible**. Le bouton n'est pas `disabled` (JS), donc l'utilisateur clique « dans le vide » : le champ requis (Espèce) est tout en haut, hors écran. **Reco** : scroll-to-first-error + toast (« choisis une espèce ») au submit invalide.

### 🟡 5 — Pôle Guides en retard + vignettes placeholder
**Repro** : `/guides` annonce « **5 guides en ligne** » (vs 26 fiches espèces). 2 des 3 premières cartes utilisent l'**illustration poisson générique** au lieu d'une photo (seul « Bretagne » a une vraie image). **Reco** : c'est le pilier éditorial le plus faible — prioriser 8-10 guides phares (techniques : leurre/surfcasting/flottante/vif ; cf `/techniques` qui les promet), et donner une vignette propre à chaque guide.

### 🟡 6-8 — Polish
- **6** `/techniques` (noindex OK) : meta description = « Inscris-toi pour être notifié » mais la page n'a **pas de capture email** (CTA = « Créer mon carnet »). Aligner meta ↔ page.
- **7** Notif co-pêchage : « X a interagi avec toi « a demandé à rejoindre ta sortie » » → tournure générique + redondante. Préférer « X a demandé à rejoindre ta sortie ».
- **8** Fiche spot : la mini-carte intégrée montre un **spinner « CARTE »** au premier paint (init lente) avant de rendre. Cosmétique, mais sur la page la plus consultée.

---

## 4. SEO & contenu — résultats chiffrés (live)

**Solide.** `robots.txt` propre (disallow `/api` `/dev` `/onboarding` `/home` `/profil` `/carnet`, sitemap déclaré). `sitemap.xml` → **HTTP 200, 536 URLs** :

| Section | URLs | Note |
|---|---|---|
| `/peche/…` (programmatique) | **337** | indexable, JSON-LD, ~900+ mots/page (testé `/peche/bar/leurres` : title/desc/canonical/H1 propres, non thin) |
| `/spots/…` | ~157 (+index) | `lastModified` présent |
| `/especes/…` | 26 (+index) | JSON-LD Article+Breadcrumb+FAQ |
| `/guides/…` | 5 (+index) | ⟵ point faible (cf 🟡5) |
| statiques | ~10 | home, carte, tarifs, fil, contact, auth |

**Checks gabarits** : `title`/`description` spécialisés et bien tournés, `canonical` présent partout, `og:image` de marque par défaut, `/techniques` correctement en **`noindex`** (et exclu du sitemap), pages programmatiques et fiches **indexables**. **Pôle Espèces : éditorialement terminé et frais** (réglementation `verifiedAt` 21→24/06). **Guides : le seul retard.**

**Seul bug SEO trouvé** = le `title` du fil (🟠2). Le reste du technique est sain.

---

## 5. Limitations & à re-tester (important)

1. **Parcours GRATUIT (priorité).** Audit fait en **Itinérant** → floutage GPS, gating 3 spots/dépt, paywalls carte, badge score côté free **non vérifiés**. Créer un **compte gratuit de test** et rejouer carte + fiche spot + tarifs (le CTA « Gérer mon abonnement » que je vois sur `/tarifs` est correct pour moi, mais **vérifier qu'un gratuit voit bien « Démarrer l'essai 7 j »** et non « Gérer »).
2. **Mobile réel** : non émulable en session (1920 px fixe). Rejouer sur device la home, la carte, **le formulaire Nouvelle prise** (long, collant) et le fil. (Cf captures 390 px + audits mobile du 22/06.)
3. **Flux à effet de bord non déclenchés** : Checkout Stripe LIVE, suppression de compte, upload photo, publication post/prise, modération (`/moderation`), co-pêchage/`/sorties` bout-en-bout. À tester en QA dédiée (compte jetable).

---

## 6. Recommandations (par effort)

**Quick wins (< 1 j)**
- 🟠2 corriger l'article du `title` fil (`articleDeDepartement`) — gain SEO immédiat sur ~24 pages.
- 🟠3 remettre le label *Exemple* / requalifier le badge « ⚡ Perso » du hero.
- 🟡4 scroll-to-error + toast au submit invalide de Nouvelle prise.
- 🟡6 aligner meta `/techniques` ↔ contenu ; 🟡7 reformuler la notif co-pêchage.

**Moyen (1-3 j)**
- 🟠1 **trancher le carnet 6 vs 26 espèces** puis aligner (sélecteur avec recherche, ou cadrage explicite). C'est le finding le plus structurant.
- 🟡5 lancer 8-10 guides phares + vignettes dédiées (rattraper le pilier éditorial).

**Process**
- Mettre en place une **QA récurrente compte gratuit + device mobile** (les deux trous de cet audit) — idéalement scriptée (Playwright) sur les parcours free-gating.

---

## 7. Hygiène doc (à part)

`CLAUDE.md` est **en retard sur la prod** : il décrit « 6 espèces / ~20 », « sprint 21 », migrations « →047 », alors que le live est à **26 espèces**, **sprint 28/29**, migration **049**, nav reliée. Plusieurs audits récents le notent déjà. → re-synchroniser la synthèse §2 du `CLAUDE.md` pour qu'il reste la source de vérité (sinon les prochains briefs partent sur un état faux).

---

*Audit réalisé en navigateur réel (Chrome) sur la prod, connecté @Seychi (Itinérant), + lecture du code `main`. Zéro erreur console sur l'ensemble du parcours. Findings reproductibles ci-dessus.*
