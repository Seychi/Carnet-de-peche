# 🔎 Audit SEO & acquisition + feuille de route — Carnet de Pêche

> Rédigé le **2026-06-25**, après sprint 34 (refonte home premium livrée). Demande de John : *« audit pour la suite, axé SEO — que n'importe qui qui cherche « application de pêche » ou « spot de pêche » tombe sur le site »* + corriger le **nom affiché dans Google** (`carnet-de-peche.com` → `Carnet de Pêche`).
>
> **Cet audit est SEO-led.** Il complète (ne refait pas) `AUDIT-2026-06-25-fonctionnel-seo.md` (pass technique live) et `AUDIT-2026-06-25-profond.md`. Sources : lecture du code `main` (file tools) + recherche web (doc Google Search Central, SERP FR pêche, SEO concurrents) + relevé live du 25/06.
>
> ⚠️ **Anomalie repo détectée pendant l'audit — à traiter en premier (voir §7).** `.git/config` était tronqué (git cassé) et plusieurs fichiers du working tree apparaissent corrompus (octets nuls en fin de fichier) côté shell. À nettoyer avant tout commit.

---

## 0. TL;DR — les 3 leviers

1. **Le nom dans Google ≠ un bug de balise.** Tes signaux sont **déjà bons** (`WebSite.name`, `og:site_name`, manifest, `<title>` = tous « Carnet de Pêche »). Google retombe sur le domaine parce qu'il **manque de confiance** (site jeune, peu de mentions externes) + pas encore de recrawl. → Fix code mineur **appliqué** (`alternateName` + `application-name`), mais le **vrai déblocage est dans la Search Console + le temps + les backlinks de marque** (§2).
2. **« Application pêche » est un terrain perdu d'avance en SEO web pur.** Ces SERP sont tenues par les **App Stores** et des comparatifs. Sans app native (tu es en PWA), tu ne peux pas y apparaître. → Choix stratégique à faire : app native (ASO) ou contournement (§4.A).
3. **Ton vrai gisement gagnable = le local longue-traîne.** « pêche du bord [département] », « où pêcher [espèce] [ville] », « spot de pêche [ville] » : faible concurrence, forte intention, et tu as la matière (157 spots, 26 espèces, 337 pages programmatiques). C'est là qu'il faut pousser (§4.B). C'est exactement ce qui fait gagner spot-de-peche.com et FishFriender.

**Note d'honnêteté :** ton SEO **technique est déjà très solide** (canonical partout, JSON-LD riche, sitemap ≈536 URLs, `/techniques` en noindex propre). Le travail restant n'est pas de la plomberie technique — c'est **stratégie mots-clés + contenu + notoriété**. Et **un point dur non-SEO** : un site bien référencé qui amène du trafic sur un **produit au réservoir vide** (≈8 prises, 1 post) fait fuir les visiteurs. Le SEO et l'amorçage (S31) doivent avancer **ensemble** (§6).

---

## 1. État des lieux SEO (ce qui est déjà fait, vérifié dans le code)

**Fondations techniques — fortes :**

- **Sitemap** `app/sitemap.ts` : ≈536 URLs, généré dynamiquement — statiques + **157 spots** (`lastModified`) + **5 guides** + **337 pages programmatiques** `/peche/<espèce>/<technique>[/<dépt>]` + **26 fiches espèces**. `/techniques` exclu (noindex assumé).
- **robots** `app/robots.ts` : propre. Disallow `/api`, `/dev`, `/onboarding`, `/home`, `/profil`, `/carnet`. Sitemap déclaré.
- **Metadata racine** `app/layout.tsx` : `metadataBase`, `og:site_name = "Carnet de Pêche"`, `appleWebApp.title`, twitter card. `title` de marque.
- **Home** `app/(marketing)/page.tsx` : `canonical`, OG dédié, **JSON-LD `WebSite` + `Organization`** (`name = "Carnet de Pêche"`), FAQ `FAQPage` injectée par les sections.
- **Gabarits** (vérifiés à l'audit du 25/06) : `title`/`description` spécialisés et bien tournés, `canonical` partout, JSON-LD `Article` + `BreadcrumbList` + `FAQPage` sur les fiches espèces, ≈900 mots/page programmatique (non thin).
- **Réglementation sourcée et datée** (`verifiedAt` 21→24/06) — fraîcheur que les concurrents n'ont pas.
- **Grammaire FR des départements** déjà centralisée et testée (`departmentArticle` dans `lib/geo/departments.ts`) → le bug de titre « Fil **du** Alpes-Maritimes » signalé le matin du 25/06 est **déjà corrigé** (rend « **des** Alpes-Maritimes »). Rien à refaire.

**Conclusion :** tu n'as pas de dette technique SEO bloquante. Le levier n'est plus *on-page mechanics*, c'est *positionnement + volume de contenu local + notoriété*.

---

## 2. Le nom dans Google : « carnet-de-peche.com » → « Carnet de Pêche »

### Diagnostic (important à comprendre)
Google **génère** le nom de site et n'accepte qu'une *préférence*, pas un ordre. Il s'appuie, par ordre de poids, sur : **(1) le JSON-LD `WebSite.name`** sur la home, **(2) `og:site_name`**, **(3) le `<title>`** de la home, (4) le texte/heading près du logo, (5) `application-name`. **Quand il n'est pas assez confiant, il retombe sur le nom de domaine.**

**⚠️ Découverte en inspectant la PROD live (25/06, commit `9552251`) :** ta home **n'émettait pas `og:site_name`** ! Le `<head>` live a bien `og:title`, `og:type`, `og:url`, `og:description`… mais **pas `og:site_name`**. Cause : le layout racine le définit, mais la home déclare son propre bloc `openGraph` et **Next.js ne fusionne pas les `openGraph` imbriqués** → le bloc de la home **remplace** celui du layout et `siteName` disparaissait en prod. C'était **un vrai signal manquant**, sur la page exacte que Google lit pour le nom de site. → **Corrigé** (siteName réajouté au bloc openGraph de la home).

Le reste des signaux est, lui, correct (JSON-LD `WebSite.name`, `<title>`, `apple-mobile-web-app-title`, manifest = « Carnet de Pêche »). Le facteur de fond restant = **manque de confiance** (domaine récent, peu de citations externes) **+ pas encore de recrawl** depuis l'ajout du JSON-LD. C'est le cas d'école n°1 pour un site jeune.

### Ce que j'ai appliqué au code (dans le working tree, non committé)
1. **`og:site_name` = « Carnet de Pêche » réajouté au bloc `openGraph` de la home** — **le fix le plus important** : il restaure un des 3 signaux majeurs qui manquait réellement en prod. (`app/(marketing)/page.tsx`)
2. **`alternateName` dans le JSON-LD `WebSite`** de la home — voie d'escalade documentée par Google : on garde « Carnet de Pêche » en `name` + variantes (sans accent + domaine en minuscules) pour stabiliser. (`app/(marketing)/page.tsx`)
3. **`application-name`** = « Carnet de Pêche » dans la metadata racine (signal mineur, cohérent). (`app/layout.tsx`)

> Remarque : les autres pages (`/spots`, `/especes`, `/peche/…`) déclarent aussi leur propre `openGraph` et perdent donc `siteName` pareillement. Pour le **nom de site**, seule la home compte (Google le lit là) → le fix home suffit. Mais pour des partages sociaux cohérents, envisager un helper metadata partagé qui réinjecte `siteName` partout (polish, non bloquant).

> Ces deux ajouts ne *forceront* pas le changement à eux seuls. Ils enlèvent juste toute ambiguïté résiduelle côté code. **Le vrai déblocage est ci-dessous.**

### Ce que TOI seul peux faire (le vrai déblocage)
1. **Search Console → Inspection de l'URL** sur `https://www.carnet-de-peche.com/` → vérifier que Google voit bien le JSON-LD (pas bloqué) → **« Demander une indexation »**. À refaire après le déploiement du fix.
2. **Patience** : le nom se met à jour en **quelques jours à plusieurs semaines** après recrawl. Google ne le change jamais en temps réel.
3. **Valider le markup** sur `validator.schema.org` (le *Rich Results Test* ne teste PAS les site names).
4. **Notoriété / backlinks de marque** (lane César) : chaque page externe qui écrit « Carnet de Pêche » (blogs pêche, offices de tourisme côtiers, presse régionale) **augmente la confiance de Google** dans le nom. C'est le facteur de fond, et c'est ce qui manque le plus à un site jeune.

**Attendu réaliste :** avec le fix code + une demande d'indexation + 2-3 mentions externes, le nom devrait basculer sous quelques semaines. Si Google s'entête au-delà de ~6 semaines, l'escalade ultime (documentée) est de mettre le domaine en `alternateName` puis, en dernier recours seulement, en `name` — on n'en est pas là.

---

## 3. Comprendre la bataille : qui gagne et pourquoi

| Concurrent | Comment ils gagnent en SEO | Faille exploitable |
|---|---|---|
| **Fishing Grid** (fishing-grid.fr) | ~266 **fiches espèces** programmatiques (`/species/<slug>`), guides réglementation 2026, **apps natives iOS+Android** (présence stores + avis 4.7-4.8), réseaux actifs | Fiches **larges mais peu profondes**, généraliste eau douce+mer, **marées imprécises**, scoring générique, pas de spots curés |
| **spot-de-peche.com** | **10 000+ spots** déployés **département × technique × espèce × spot** (énorme surface programmatique locale), données environnementales riches | **Scoring 100 % générique**, **pas de carnet perso**, pas de fil social, pas d'app native |
| **FishFriender** | **50 000+ spots**, **blog FR** bien indexé (« meilleurs spots de pêche en France »), marque établie, multilingue, stores anciens | **Carte 100 % payante** (frustration), généraliste non-spécialisé mer FR, pas de fil régional |

**Lecture :** les trois gagnent par **volume de pages programmatiques** (espèces + spots + local) et, pour deux d'entre eux, par **présence stores + avis**. Aucun ne combine **profondeur métier mer du bord + carnet perso + scoring personnalisé + fil régional gratuit**. C'est ton angle défendable — mais le SEO se gagne d'abord sur le **volume de contenu local** et la **profondeur éditoriale**, pas sur le moat produit (que Google ne voit pas).

---

## 4. Stratégie mots-clés (le cœur de cet audit)

### A. « Application pêche » / « appli pêche en mer » — la vérité stratégique
Ces requêtes sont **dominées par les App Stores** (Google Play, App Store) et des comparatifs éditoriaux (htpratique, courantpeche…). Une grande part de l'intention est **transactionnelle store** : l'utilisateur veut **installer**, pas lire. **Tu es en PWA, sans fiche store → tu ne peux pas ranker là où ces gens cherchent.** C'est ton **angle mort n°1** face à Fishing Grid (présent dans les deux stores).

Trois options, à arbitrer (⚠️ John) :

- **(a) App native minimale (Expo)** pour exister dans les stores + faire de l'**ASO** (titre, mots-clés, avis). C'est le seul vrai moyen de capter « application pêche ». Aligné avec ta phase Mobile de roadmap — la PWA fait le pont en attendant.
- **(b) Landing SEO dédiée** `/application-peche-en-mer` optimisée sur l'intention « appli pêche du bord », qui pousse l'**installation PWA**. Capte une fraction du trafic web (pas le trafic store), mais mieux que rien à court terme.
- **(c) Assumer de ne pas chasser ce terme** et concentrer l'effort sur le local (§B), beaucoup plus rentable à effort égal.

**Reco :** (b) tout de suite (peu coûteux), (a) à planifier sérieusement (c'est la condition pour ce marché), (c) comme cadrage mental — ne sur-investis pas le SEO web sur « application pêche ».

### B. Le terrain gagnable : le local longue-traîne (priorité absolue)
Faible volume unitaire, **mais forte intention + faible concurrence + tu as déjà la donnée**. C'est le maillage `dépt → technique → espèce → spot` qu'exploitent tes concurrents.

Familles de requêtes à couvrir :

- **`pêche du bord [département]`** — Finistère, Morbihan, Loire-Atlantique, Manche, Var, Pyrénées-Orientales… (24 dépts côtiers). → **Page hub par département** manquante aujourd'hui : tu as les spots individuels mais pas la page « pêche du bord dans le Finistère » qui agrège spots + espèces + marées + guide local. **À créer** (programmatique, tu as la donnée).
- **`où pêcher [espèce] [ville/coin]`** — « où pêcher le bar à Brest », « où pêcher la dorade royale en Méditerranée ». → Tes pages `/peche/<espèce>/<technique>/<dépt>` couvrent déjà une partie ; ajouter la dimension **ville/spot** et soigner les `title`/H1 sur l'intention « où ».
- **`spot de pêche [ville]` / `coin de pêche [ville]`** — tes fiches `/spots/<slug>` ciblent déjà le spot nommé ; renforcer le maillage interne (chaque fiche espèce → spots où la pêcher ; chaque dépt → ses spots).
- **`marée pêche [ville]`** — fort volume récurrent. Tes fiches spots ont déjà la marée ; viser le `title`/contenu sur « marée pêche [ville] » et lier vers le spot.
- **`carte spots pêche gratuite` / `où pêcher gratuit`** — **angle différenciant** : FishFriender = carte 100 % payante. Pousse « carte gratuite » (3 spots/dépt en gratuit) en copy et meta.

### C. Le coup à jouer maintenant : la réglementation 2026
Depuis le **12 février 2026**, la **déclaration de capture est obligatoire** (via RecFishing) pour des espèces sensibles (bar, lieu jaune, dorade rose/royale, maquereau, thon rouge). Sujet **chaud, fort trafic, traité superficiellement** par les concurrents. → **Guide de référence** « déclaration obligatoire pêche de loisir en mer 2026 » + encart dans chaque fiche espèce concernée. Profondeur + fraîcheur = ton avantage naturel. (À vérifier/sourcer avec ta donnée `lib/regulation/`.)

### D. « Carnet de pêche » (ta marque = aussi un mot-clé générique)
Requête **ambiguë** : recherchée pour l'objet papier ET pour le permis (« carte de pêche » FNPF). Bien cadrer l'intention « **carnet numérique mer du bord** » dans le contenu pour ne pas diluer. Bon pour la marque, mais ne mise pas dessus pour l'acquisition froide.

---

## 5. Plan d'action SEO priorisé

**P0 — cette semaine (effort faible, impact direct)**
1. **Nom Google** : déployer le fix code (§2, déjà appliqué), puis **Search Console → demander l'indexation** de la home. (TOI)
2. **Nettoyer le repo** (§7) avant tout commit — sinon risque de committer des fichiers corrompus.
3. **Décider le sort de `/techniques`** : aujourd'hui noindex + meta « inscris-toi pour être notifié » sans capture email. Soit publier les 4 guides techniques (et indexer), soit aligner la meta. (cf finding 🟡6 de l'audit du matin.)

**P1 — ce mois (le gisement)**
4. **Pages hub département** « pêche du bord [dépt] » (programmatique, agrège spots + espèces + marées + intro éditoriale). C'est LA brique qui te manque face à spot-de-peche.com.
5. **Renforcer le maillage interne** : fiche espèce ↔ spots où la pêcher ↔ dépt ↔ technique. Google adore les hubs reliés ; ça fait remonter tout le cluster.
6. **Guide réglementation 2026** + encarts fiches espèces (§4.C).
7. **Rattraper les guides** (5 → 10-12 phares, techniques en premier) — pilier éditorial le plus faible aujourd'hui, et chaque guide est une porte d'entrée SEO. Vignettes dédiées (2/3 sont des placeholders poisson).

**P2 — stratégique (à arbitrer, ⚠️ John)**
8. **App native + ASO** (§4.A) : la seule voie pour « application pêche ». À cadrer dans la phase Mobile.
9. **Landing `/application-peche-en-mer`** (PWA) à court terme.
10. **Netlinking de marque** (lane César) : blogs pêche, offices de tourisme côtiers, presse régionale. Sert le ranking ET le nom Google (§2). C'est le facteur de fond qui manque le plus.

---

## 6. Résumé produit — la suite (hors SEO, mais déterminant)

Le SEO amène du trafic ; encore faut-il qu'il atterrisse sur un produit qui retient. Trois chantiers non-SEO conditionnent le ROI du SEO :

- **★ Amorçage / réservoir vide (S31 « Les Cent Premiers »)** — priorité n°1 du produit. Carte, heatmap, cockpit, fil : tout est construit mais **vide** (≈8 prises, 1 post). Un visiteur SEO qui arrive sur une carte vide rebondit. **SEO et amorçage doivent avancer en parallèle**, sinon le trafic est gâché. (⚠️ John : seed honnête oui/non, beta fondateurs, canal César.)
- **Carnet 6 vs 26 espèces** (finding 🟠1 du 25/06) — tu promets 26 espèces (fiches + carte + onboarding) mais le carnet n'en logue que 6. Incohérence qui casse le pitch « 26 espèces de chez nous » au moment exact où le visiteur SEO veut loguer sa prise. À trancher (sélecteur 26 avec recherche, ou cadrage explicite).
- **Mockups « ⚡ Perso » du hero non marqués *Exemple*** (finding 🟠3) — le score perso prédictif est neutralisé (réel = solunar générique). Le hero promet un moat non encore délivré → risque de déception post-inscription. Remettre le label *Exemple* ou passer au conditionnel.

Le reste (perf carte S33, illustrations espèces S32, prises vérifiées, mobile) est déjà cadré dans `docs/ROADMAP-SPRINTS-31-PLUS.md` — RAS à ajouter ici.

---

## 7. ⚠️ Anomalies repo détectées pendant l'audit (à traiter AVANT tout commit)

Pendant l'audit, le dépôt s'est révélé dans un état instable **côté shell** (le code lu via les outils fichier est, lui, propre) :

1. **`.git/config` était tronqué** (ligne 47 coupée en plein milieu : `github-pr-base-branch = "Se`), ce qui cassait **toutes** les commandes git (`fatal: bad config line 47`). Probable écriture interrompue. **Je l'ai réparé** (complété la ligne selon le motif des autres branches ; sauvegarde dans `.git/config.bak-truncated`). → **Vérifie dans ton vrai environnement** que `git status` fonctionne ; si ton Claude Code te sortait des erreurs git, c'était ça.
2. **Plusieurs fichiers du working tree apparaissent corrompus côté shell** (octets nuls / ~27 Ko d'espaces ajoutés en fin de fichier → git les voit comme *binaires* : `app/(marketing)/page.tsx`, `app/(app)/home/page.tsx`, `carnet/page.tsx`, `profil/page.tsx`, `components/.../UserMenu.tsx`, `mobile-nav.tsx`, `score-ring.tsx`…). Les **outils fichier voient ces fichiers propres** (le code source réel semble intact) — c'est probablement un artefact de synchronisation/écriture, pas ton WIP volontaire.
3. **`index.lock` non supprimable** (« Operation not permitted ») → une session (dev server / éditeur / Claude Code) tient des fichiers ouverts.

**Reco avant de committer quoi que ce soit :**
- Ferme les process qui tiennent le repo (dev server, etc.), supprime `.git/index.lock`.
- `git status` puis **inspecte les fichiers marqués binaires** : `git diff --stat`. Pour ceux qui ne correspondent pas à un vrai changement voulu, `git checkout -- <fichier>` pour restaurer la version committée propre.
- Vérifie qu'aucun fichier source ne contient d'octets nuls : `grep -lIr $'\\x00' app/ components/ lib/ 2>/dev/null` (doit ne **rien** renvoyer).
- Ensuite seulement : applique/committe le fix nom-Google (§2) sur une branche, lance tes gates (`pnpm build && pnpm test`), pousse.

> ⚠️ Je n'ai **pas** lancé `next build` ni d'opération git en écriture : le `.next`/l'index étant verrouillés par ta session, j'aurais risqué une collision. Les deux edits du fix (§2) sont **mineurs et additifs** (deux champs string) ; ils ne peuvent pas casser le build, mais **fais tourner tes gates avant de pousser** par principe.

---

## 8. Checklist Search Console (à garder sous la main)

- [ ] Déployer le fix nom-Google (§2).
- [ ] Search Console → Inspection d'URL sur `https://www.carnet-de-peche.com/` → **Demander une indexation**.
- [ ] Valider le JSON-LD sur `validator.schema.org`.
- [ ] Vérifier la couverture du sitemap (≈536 URLs) dans Search Console → Pages.
- [ ] Suivre les **requêtes** dans Search Console → Performances (filtrer « pêche du bord », « où pêcher », « spot de pêche [ville] ») pour valider où tu remontes.
- [ ] Relancer une demande d'indexation après chaque nouveau lot de pages hub département.

---

*Audit SEO-led réalisé le 2026-06-25. Code lu via outils fichier (propre) ; état shell instable signalé en §7. Recherche web : Google Search Central (site names), SERP FR pêche, SEO concurrents (Fishing Grid / spot-de-peche / FishFriender). Le fix nom-Google est appliqué dans le working tree (non committé) — voir §2 et §7.*
