# Audit UX / Design + Plan de bataille « dopamine » — 2026-06-30

> Audit transverse demandé par John après la clôture du chantier 51→58. **Focus : expérience utilisateur, design, et gamification.** Méthode : QA live sur le site de prod avec le compte abonné de John (desktop, navigateur piloté), + relecture du code et des audits récents pour vérifier chaque trouvaille et donner des `fichier:ligne` actionnables. La partie mobile a été auditée sur le code (le navigateur de la session était bloqué en largeur desktop, voir §0.3) + recoupée avec les audits mobile existants.
>
> **Ce document fait deux choses :**
> 1. **Partie 1 — Audit UX/Design** : ce qui est fort, ce qui cloche, par sévérité, avec correctifs.
> 2. **Partie 2 — Plan dopamine** : la transformation gamification (le pivot ADN du 2026-06-28 n'est PAS encore construit). Design complet : mécaniques, schéma DB, migrations, composants, wireframes, phasage.
>
> Une **Partie 3 (expérience gratuite + onboarding)** est ajoutée après le test sur compte « crash-test » gratuit.

---

## 0. Comment lire / résumé exécutif

### 0.1 Le verdict en 6 lignes

Le produit est **beau, cohérent, honnête et déjà très complet** : la DA « instrument marin » tient, les chiffres sont en mono partout, la transparence du score (« de quoi est fait ce créneau ») et les fiches espèces sont des vrais moats, et **l'expérience gratuite (onboarding + paywall + conformité RecFishing) est excellente**. **L'enjeu principal n'est donc pas de réparer, mais de transformer** : la **gamification est restée la version « anti-comparaison »** d'avant ton pivot du 2026-06-28 ; le moteur dopamine demandé (Partie 2) **reste à construire**. Côté dette : une **erreur d'hydratation React** sur ~toutes les pages (corrigeable vite, touche tous les users) et quelques **chiffres INP mesurés** valent un coup d'œil ; le reste = polish (badge « 20 espèces », filtre carte fantôme, défaut « Conservé », **célébration de badge silencieuse**). Le réservoir vide est **attendu** (pré-lancement), pas un défaut.

### 0.2 Top priorités (détail + correctifs plus bas)

| # | Sévérité | Sujet | Note |
|---|---|---|---|
| P1 | 🟠 | **Construire la Partie 2 (dopamine)** — phase solo d'abord | Le vrai chantier : transformer, pas réparer. Le profil public n'a **aucune** identité compétitive. |
| P2 | 🟠 | **Carte** : filtre `calmar` fantôme au chargement (localStorage) + ~8 s de tuiles | Première impression de la feature table-stake n°1. |
| P3 | 🟡 | **Hydratation React #418** (dates naïves) + jeter un œil aux **INP mesurés** (393 ms / 2 285 ms) | Cheap, touche tous les users. Perf *ressentie* OK côté John. |
| P4 | 🟡 | Polish : badge Pokédex « 20 »→26, défaut « Conservé », **célébration de badge** (auj. silencieuse), partage desktop sans aperçu, libellés a11y | Petits coûts, gros effet de sérieux. |
| — | 🟢 | Réservoir vide social | **Attendu** (pré-lancement, confirmé John). Conditionne le phasage gamif. |

### 0.3 Limite méthodo (honnêteté)

Le navigateur de la session est resté **bloqué en 1920 px de large** (fenêtre maximisée, `resize_window` + zoom ignorés). Je n'ai donc **pas pu rendre un vrai viewport téléphone**. La Partie « mobile » (§1.7) est un audit **code + recoupement** avec tes audits mobile existants — fiable, mais une passe sur vrai device reste recommandée (ou redimensionne ta fenêtre Chrome et je capture). Tout le reste est de la QA live réelle.

---

## 1. Audit UX / Design

### 1.0 Ce qui est fort (à ne pas casser)

- **DA « instrument marin » cohérente.** Navy/teal/gold/sand, bordures sable plutôt qu'ombres, **tous les chiffres en JetBrains Mono** (coords, coefs, PM/BM, tailles, scores). C'est lisible et ça a une vraie personnalité. Le bandeau instruments (dépt · vent · houle · ton créneau) est une signature réussie.
- **La transparence du score est excellente.** Sur `/home`, « DE QUOI EST FAIT CE CRÉNEAU » (Astro 52/62, Marée, Vent 33/38) + la phrase d'honnêteté « Score générique : … identique pour tous ; tes tendances perso vivent dans ton carnet ». Peu de produits assument ça. **À garder absolument.**
- **Le carnet raconte une histoire.** « 8 prises, et la carte commence à te connaître. » + « CE QUE TON CARNET EN DIT » (86 % au printemps, 71 % le mercredi) avec **niveaux de confiance** affichés. C'est le moat, et c'est bien mis en scène.
- **`/especes`** : 26 fiches, nom latin, copie vivante (« Le bar est LE poisson du bord en France »), **VÉRIFIÉ LE [date]**. Profondeur éditoriale rare. Le jab « pas un catalogue de 266 poissons » est bien vu.
- **Honnêteté des états vides.** La heatmap (« Pas encore assez de prises partagées… »), les confidences, le « log de la bredouille » : le produit ne ment pas. C'est un actif de confiance.
- **Le panneau « Couches » de la carte** est propre (Spots, Zones de prises « gratuit », Ton score, Fond marin, Qualité). Les couches fantômes signalées dans l'audit précédent ont **disparu** — corrigé.
- **Co-pêchage** : cadrage respectueux de la vie privée (« aucune coordonnée n'est partagée ici »).
- **Conformité RecFishing** (testée en live, §3.4) : déclaration des espèces sensibles sous 24 h, récap à recopier, **sourcé + daté**, avertissements contextuels au formulaire (marquage du bar). Vrai différenciateur de sérieux, à pousser en marketing.
- **Onboarding + paywall free-tier** (Partie 3) : fluides, honnêtes, sans friction (validation pseudo en temps réel, gating « 3 spots/dépt » clair, jamais agressif). Le cold-start « Dès 3 prises, ton carnet te dit OÙ et QUAND » est un excellent pont d'activation.

### 1.1 🟠 Performance & hydratation (revu après vérif de John)

> **Mise au point (John, 2026-06-30) :** côté machine de John, **la perf est bonne**. J'ajuste donc : je **ne** maintiens **pas** « le produit rame » comme finding n°1. Les **gels de ~30 s** vus pendant la session étaient très probablement l'**outil de capture en lutte avec le smooth-scroll Lenis** (boucle RAF continue), pas un hang réel côté utilisateur. **Ce qui reste vrai, indépendant de la machine, et corrigeable**, c'est l'erreur d'hydratation et quelques chiffres INP mesurés.

**Ce qui reste à corriger (concret, pas cher) :**
- **React #418 (hydration mismatch) sur quasi chaque page** (`/home`, `/carnet`, `/carte`), à chaque chargement. Ça arrive pour **tous** les utilisateurs (pas une question de machine) : React re-rend le client (petit coût) et ça pollue Sentry. **Cause vérifiée** = dates « timezone-naïves » rendues pareil serveur (UTC) et client (local) :
  - `components/marketing/home-v3/Hero.tsx:310`, `HomeSections.tsx:108` — `toLocaleTimeString(… Europe/Paris)` sur page ISR.
  - `lib/conditions/format.ts:33-39` — `new Date(isoNaïf)` (zone runtime). Alimente le bandeau instruments.
  - `components/catches/CatchForm.tsx:1122` — `datetime-local` par défaut depuis `new Date()` sans garde de montage.
  - *Correctif :* lire `HH:MM`/date depuis la string naïve (comme `formatWeatherTime` le fait déjà), ou `suppressHydrationWarning` sur le nœud feuille.
- **INP mesurés par le moniteur Vercel** (données factuelles, cf §3.6) : **393 ms** (bouton onboarding) et **2 285 ms** (champ de saisie au log de prise). Repères Google : > 200 ms « à améliorer », > 500 ms « médiocre ». Le handler submit/géocodage est le suspect du 2,28 s. À regarder **sans urgence**.
- **`TypeError: parentNode` null** ~9×/chargement `/carnet` (et `/carte`) : suspect = teardown des marqueurs MapLibre (`components/map/MapView.tsx` ~`:585-625`) / SVG lucide. **À confirmer dans Sentry** (la stack runtime nommera le coupable).

### 1.2 🟢 Réservoir vide = attendu (pré-lancement) — note de contexte

> **Confirmé par John (2026-06-30) :** le vide social est **normal/attendu** ; l'effet réseau viendra avec les premiers utilisateurs. Je ne le compte donc **pas** comme un blocage. Je le garde ici parce qu'il **conditionne le phasage de la gamification** (solo d'abord, multi quand ça se remplit — Partie 2) et parce qu'il reste **un petit bug cosmétique** à corriger.

**Constat (pour mémoire) :** `/fil/06` = 1 post (17 j), heatmap vide, co-pêchage = 1 sortie passée, « PRÈS DE TOI » vide.

**Le seul correctif réel ici (cosmétique) :** sur `/home`, « PRÈS DE TOI » affiche **« Pas encore de prise partagée… cette semaine. Sois le premier à loguer 🎣 »** ET, juste en dessous, **« @SHW a partagé une prise… il y a 17 j »** → l'état vide et le contenu coexistent (message contradictoire). N'afficher le « sois le premier » que si la liste est **vraiment** vide.

### 1.3 🟠 Carte : filtre fantôme + lenteur (P2)

- **Filtre `calmar` fantôme au chargement.** En arrivant sur `/carte` nu, l'URL devient `?species=calmar&source=curated` (« 2 filtres actifs », 111 spots sur ~215) et **la carte vole vers la côte atlantique** (Pornic/Noirmoutier), loin de ton département. Cause vérifiée : `MapFilters.tsx:160-187` restaure le **dernier filtre depuis `localStorage`** (`carte:last-filters`) si l'URL est vide, puis un effet debouncé `router.replace` le ré-injecte dans l'URL (`:191-213`). `calmar` est une espèce **éditoriale sans spot curé** → carte **vide**, donc très visible. → *Correctif :* soit supprimer la restauration (`:160-187`) pour qu'une visite nue reste non filtrée, soit restaurer l'état mémoire **sans** réécrire l'URL.
- **Tuiles ~8 s à apparaître** (canvas gris + spinner) à froid. Confirme le 🔴 perf carte de CLAUDE.md.
- **Bon point :** clic réinitialiser → 215 spots, panneau « Couches » propre, légende score claire.

### 1.4 🟡 MOYEN — Bugs de contenu / polish

- **Badge « Pokédex complet » dit « Les 20 espèces »** alors que le catalogue est **26** (`/especes` = « 26 ESPÈCES », le log propose 6 + « Autre espèce (20) », le Pokédex affiche 3/**26**). Pire : le **seuil SQL** récompense à **20** (`supabase/migrations/066_catch_verification.sql:146`, `count(DISTINCT species) >= 20`) → le badge tombe à 20/26, « complet » est faux. → Corriger la copie `lib/gamification/badges.ts:55` (20→26) **et** le seuil dans une **nouvelle** migration (20→26).
- **Le formulaire de prise défaut « Conservé ».** `CatchForm.tsx:247` `released: draft?.released ?? false` + zod `lib/catches/schema.ts:83` `.default(false)` + l'ordre du toggle (`:830-833`, « Conservé » en premier) → « Conservé » présélectionné, alors que le produit a un ADN no-kill et que la colonne DB `released` vaut `true` par défaut. → Défaut neutre/non sélectionné, ou « Relâché ». (Note : auto-relâche si sous-taille existe déjà, `:330-341`.)
- **Partage « Mon année de pêche » : aucun aperçu sur desktop.** Le clic ne produit **rien de visible** (le compte a `share_skip_optin`, donc pas de dialog ; et `navigator.share` de fichiers n'est pas supporté sur Chrome desktop → fallback `fallbackShare` = copie du lien `/c/{slug}` + download PNG + **toast sonner**). Ça **se lit comme « rien ne s'est passé »**. → Sur desktop / sans Web Share, afficher une **modale de succès avec la miniature de la carte + bouton « copier le lien »** au lieu d'un toast fugace. (Réf. `components/share/use-share-card.ts:138-168`, `ShareButton`.)
- **3 champs sans libellé programmatique** sur le formulaire de prise (le **slider taille**, le **datetime**, l'**input photo** — `hasLabel:false`). Lecteurs d'écran perdus sur le geste n°1 du produit. → `aria-label` / `<label for>`.
- **Incohérence taille** : l'input nombre va jusqu'à **200 cm**, le slider jusqu'à **120 cm** (« 120 cm+ »). → Aligner.
- **Bon point vérifié :** les **dates futures sont bloquées** (`max` = maintenant sur le `datetime-local`). L'ancien bug « prises dans le futur » est mitigé côté client.

### 1.5 ⚪️ MINEUR — Divers

- **Pastille flottante = Vercel « Toolbar on production ».** Ce n'est **pas** dans le code (`@vercel/toolbar` absent) : c'est `vercel.live`, injecté par un **réglage de projet Vercel**. **Invisible pour les vrais utilisateurs** (visible seulement toi, connecté à Vercel). À couper proprement : Vercel → Project → Toolbar → off en production. (Effet de bord constaté : la pastille **chevauche** le bouton « Mon année » à certaines hauteurs de fenêtre.)
- **Abonné sur `/tarifs`** : un abonné voit toujours la page de vente, pas « ton plan actuel ». Mineur.
- **`@Seychi` (profil public)** : ton avatar et une photo de prise sont des images de test (carte cadeau / logo) — donnée de test, pas un bug produit.

### 1.6 Notes par page (QA live, abonné, desktop)

- **`/home`** : cockpit excellent (présent, créneau + breakdown, tendances perso, semaine, près de toi, progression/gamif). Lourd (cf P1). Le hub gamification est l'**ancienne version privée** (cf Partie 2).
- **`/carnet`** : très bon (stats mono, record Bar 71 cm, 62,5 % relâche, « mon année », log bredouille, mes sorties, ma boîte, stats espèces/techniques/mois, records). 9× erreur `parentNode` au chargement.
- **`/carnet/nouvelle`** : formulaire propre (espèces en cartes, slider taille, GPS auto, autocomplete ville **qui marche** — « Nice · 06 » bien classé en tête, faux positif de ma part au début). Voir défauts §1.4.
- **`/carte`** : voir §1.3.
- **`/especes`** : excellent (cf §1.0).
- **`/fil/06`** : bien construit (onglets Ton dépt / Tes follows / Toute la côte, composer **avec compteur 0/2000**, post = données de prise « BAR · 50 CM · 2.9 KG · LEURRES » + badge CARNET). Vide (1 post).
- **`/profil`** : page d'édition propre (pseudo, bio compteur, photo, partage). Titre `<title>` générique (mineur, noindex).
- **`/u/Seychi`** : profil public soigné (héros navy, compteurs follows mono, galerie de prises publiques — privacy OK). **Zéro identité compétitive** (cf Partie 2, c'est la toile à remplir).
- **`/notifications`** : variées et utiles (résumé hebdo, demande co-pêchage, commentaire, like, follow). Toutes **réactives** ; aucune notif **proactive** dopamine (badge, level up, rang, série en danger, défi). Opportunité.
- **`/sorties`** (co-pêchage) : propre, filtres espèce/niveau/date, privacy OK. Vide (1 sortie passée).
- **`/tarifs`** : fort (« Le carnet et la communauté sont gratuits. La précision se paie. »), 3 plans clairs, prix mono.

### 1.7 Mobile (audit code + audits existants — voir limite §0.3)

**Bon (vérifié dans le code) :** tab bar + FAB central (`TabBar.tsx`), cibles tactiles **≥44 px** (`min-h-11`, FAB 52 px), **safe-area gérée** (`env(safe-area-inset-bottom)` partout), pas de chevauchement contenu/tab bar (`AppShell.tsx:54` `pb-[88px]`), filtres carte en **bottom sheet** propre. L'ancien bug **« Proposer un spot inatteignable sur mobile » est CORRIGÉ** (sidebar + MoreMenu, test de non-régression `nav-reachability.test.ts`). « Mes sorties » dé-gaté aussi.

**Encore ouvert :**
- 🔴 **Contraste « Nouvelle prise »** : titre navy-900 sur navy-950 (~1,3:1), toujours « NON corrigé ».
- 🟠 **Bandeau instruments clippé ≤390 px** sans dégradé/scroll cue (rendu sur **chaque** page app).
- 🟡 **Onglets Fil (3 labels) débordent ≤360 px** (à confirmer device).
- 🟡 **Texte 9–10 px / `text-ink-300`** = **71 occurrences sur 37 fichiers** (lourd sur `SpotPopup` ×8, `MapLayerSelector` ×6). Lisibilité mobile.
- 🟠 **Floutage GPS ~200 m mesuré vs « 1 km » annoncé** dans la copie `/tarifs` — item d'**honnêteté** (touche le moat + le paywall).
- 🟠 **`/tarifs` vend « notifications créneaux optimaux »** pas entièrement livrées.

---

## 2. Plan de bataille « dopamine » (le pivot ADN, à construire)

> **État actuel (vérifié dans le code) :** tout ce qui est en prod est la version **sprint-26 « anti-comparaison »** : Pokédex/séries/badges **100 % privés**, « Aucun classement, aucune comparaison », « Juste un repère, pas une obligation ». Le **pivot du 2026-06-28** (« produit dopamine, compétitif, gamifié à fond ») **n'a PAS été codé**. Cette partie est le design complet pour le construire, **prêt à exécuter par Claude Code**.
>
> **Tes choix (validés ce jour) :** (1) **phasage solo d'abord** — la dopamine mono-joueur tourne à zéro donnée, les classements multi attendent que le réservoir se remplisse ; (2) **intensité « équilibrée / tasteful »** — vrais crochets compétitifs, mais pas de dark patterns.

### 2.0 Principe directeur & garde-fous

**Le principe :** on ne jette PAS l'honnêteté du produit pour ajouter de la dopamine — on **récompense les bons gestes** (loguer, mesurer, relâcher, explorer, être régulier) avec une boucle de progression visible et gratifiante. La dopamine vient de **la progression et de la maîtrise**, pas de la manipulation.

**Garde-fous fermes (non négociables, alignés CLAUDE.md §8) :**
1. **Anti spot-burning absolu** : **aucune métrique compétitive n'expose une coordonnée**, jamais, même agrégée. On classe sur des **compteurs / tailles / espèces / diversité / régularité**, jamais sur un lieu. Les classements ne contiennent jamais de `geom`.
2. **RLS** : chaque nouvelle table RLS d'abord, policies ensuite, écritures via RPC `SECURITY DEFINER` (on calque la migration `084_spot_confirmations.sql`).
3. **Honnêteté des chiffres** : XP/rangs/records dérivés d'**événements vérifiables en SQL**. Le déclaratif (relâché) pèse peu. Les records « plus gros » privilégient les prises **mesurées + photo-vérifiées** (`measured_length_cm`, `photo_verified_at` existent déjà).
4. **RGPD / respect** : le classement public est **opt-in** (`public_ranking`), on peut redevenir privé, on peut tout désactiver. Pas de honte publique, pas de « tu es dernier ».
5. **Tasteful (ton choix)** : loss-aversion douce (série), oui ; urgence fabriquée / FOMO agressif / pay-to-win, non. La pêche n'est pas quotidienne → cadence **hebdomadaire**, jokers, pas de culpabilisation.

**Anti-pattern à éviter (important pour ce produit) :** ne pas créer une dopamine qui pousse à **tuer plus de poissons** pour scorer. Le no-kill, la mesure, la diversité et la régularité doivent **rapporter autant ou plus** que le simple volume de prises gardées. La dopamine s'aligne sur l'éthique, sinon on trahit la marque.

### 2.1 Architecture en 2 phases

| | **Phase 1 — Dopamine solo (à shipper en premier)** | **Phase 2 — Compétition (après amorçage du réservoir)** |
|---|---|---|
| Marche à 0 donnée ? | ✅ Oui, dès le 1er utilisateur | ❌ Non, a besoin de N pêcheurs/dépt |
| Mécaniques | XP & rangs, séries actives, badges publics à paliers, **records perso (PB) + célébrations**, défis solo + événements saisonniers | **Classements** (dépt / espèce / saison), duel vs tes follows, **notif de changement de rang**, resets saisonniers, rareté en % |
| Surfaces | Profil public (header compétitif), cockpit `/home`, célébrations in-app, notifs | Onglet « Classements », encarts rang sur profil & home, fil « X t'a dépassé » |
| Migrations | `098`, `099`, `100` | `101` (+ matview/cron si besoin de perf) |
| Déclencheur de mise en prod Phase 2 | — | Beta « fondateurs » (`invite_codes`, infra prête) **ou** seuil de prises publiques/dépt atteint |

**Pourquoi ça marche pour Carnet de Pêche :** la dopamine solo (battre **ton** record, finir **ta** collection, garder **ta** série, monter **ton** rang) est exactement ce qui pousse à **loguer plus** — ce qui nourrit le moat (« le carnet qui te connaît ») ET remplit le réservoir qui débloque la Phase 2. Les deux phases se renforcent.

### 2.2 Les systèmes

#### 2.2.1 XP & Rangs (le squelette)

**XP = la monnaie de progression.** Gagnée sur des événements **vérifiables**, pas sur du déclaratif pur.

| Action | XP | Note anti-triche |
|---|---|---|
| Loguer une prise | +10 | base |
| Nouvelle espèce (1re fois) | +50 | gros shot de découverte (Pokédex) |
| **Nouveau record perso** (taille, par espèce) | +30 | dopamine du PB |
| Prise **mesurée** (référence + photo) | +15 | pousse à la qualité/vérifiabilité |
| Relâcher une sous-taille | +8 | **conservation > volume** (déclaratif, mais bon geste) |
| Relâcher une prise légale | +4 | aligne dopamine et éthique |
| Loguer une **sortie bredouille** | +6 | récompense l'honnêteté & la régularité |
| Photo sur la prise | +5 | qualité du contenu |
| Compléter un défi | +50 à +200 | selon difficulté |
| Maintenir une **semaine active** (série) | +20 | régularité |
| Compléter le Pokédex (paliers 5/10/26) | +50/+150/+500 | jalons |

**Garde-fous XP :** rendements décroissants (au-delà de 3 prises de la **même espèce le même jour**, XP de prise → 0 → anti-farm) ; dates futures déjà bloquées ; le « record » vérifié en SQL (compare à l'historique). **Tout est recalculable** depuis le ledger (cf §2.4).

**Rangs (paliers, thème mer/bord, en français, à valider) :**

| Rang | XP cumulée | Vibe |
|---|---|---|
| Mousse | 0 | départ |
| Pêcheur du dimanche | 100 | |
| Habitué du bord | 300 | |
| Pilier de digue | 700 | |
| Fine gaule | 1 500 | |
| Connaisseur | 3 000 | |
| Spécialiste | 5 500 | |
| Maître du bord | 9 000 | |
| Légende locale | 15 000 | prestige |

Courbe : palier(n) ≈ `round(100 · n^1.7)` (croissance douce, jamais punitive). Le rang s'affiche sur le **profil public** (badge + barre XP) et le **cockpit home**.

#### 2.2.2 Séries (streaks) — passer de passif à actif

Aujourd'hui la série est **descriptive et passive** (« 2 SEMAINES SÉRIE MAX · Juste un repère, pas une obligation »). On la rend **active mais tasteful** :
- **Cadence hebdomadaire** : une « semaine active » = au moins 1 prise **ou** 1 sortie loguée. (Respecte le fait que la pêche n'est pas quotidienne.)
- **Loss-aversion douce** : « Série de 5 semaines 🔥 — plus que 2 jours pour la garder. » (notif J-2, une seule, désactivable).
- **Joker / grâce** : 1 « joker » par mois — rater une semaine ne casse pas la série (anti-culpabilisation, anti-churn de honte). C'est ce qui distingue *tasteful* d'*agressif*.
- **Flair public** : la série en cours s'affiche sur le profil (« 🔥 7 sem. »).

#### 2.2.3 Badges — publics & à paliers

Les **7 badges existants** (`first_catch`, `ten_catches`, `five_species`, `pokedex_complete`, `release_friendly`, `regular_4w`, `prise_mesuree`) deviennent **publics et partageables**, et on ajoute des **paliers** (bronze/argent/or) + de nouvelles familles :

- **Volume** : 10 / 50 / 200 prises (paliers).
- **Diversité (Pokédex)** : 5 / 10 / **26** espèces. → **corrige le bug** : `pokedex_complete` à 26, pas 20.
- **Records de taille** par espèce (ex. « Bar > 60 cm », « > 70 cm »).
- **Conservation** : 10 / 50 relâchés (paliers), aligné no-kill.
- **Exploration** : pêché dans 2 / 5 / 10 départements.
- **Saisons** : une prise à chacune des 4 saisons.
- **Nuit / aube** : prises hors plein jour (lié aux heures solunaires déjà calculées).
- **Régularité** : 4 / 12 / 52 semaines actives.

Chaque badge : état **obtenu/à débloquer**, **palier**, **bouton partager** (carte OG existante). La **rareté en %** (« 12 % des pêcheurs l'ont ») arrive en **Phase 2** (besoin de données).

#### 2.2.4 Records perso (PB) & célébrations — LE moment dopamine solo

Le crochet le plus puissant qui **marche à zéro donnée** : battre **son propre** record.
- À l'enregistrement d'une prise plus grosse que ton meilleur pour cette espèce → **célébration immédiate** : modale/confetti « 🎉 Nouveau record ! Bar 73 cm (+2 cm sur ton précédent) » + XP +30 + proposition de partage.
- Page **« Tes records »** (existe déjà sur `/carnet`) enrichie : barre de progression vers le prochain palier, comparaison à ton historique.
- C'est l'équivalent « PR » des apps de course/muscu : addictif, sain, sans personne d'autre.

#### 2.2.5 Défis & événements saisonniers

- **Défis solo (Phase 1)** : hebdo/mensuels, personnels. Ex. « Logue 3 espèces différentes ce mois », « Mesure une prise avec référence », « Pêche au lever du soleil », « Logue une sortie (même bredouille) ». Les **défis conservation existants** (`release_undersize`, `respect_closures`, `declare_sensitive`) sont intégrés ici.
- **Événements saisonniers (Phase 1, cadrage solo)** : « 🐟 Saison du bar (oct→déc) : attrape ton plus gros bar de la saison ». Donne un objectif récurrent et thématique sans avoir besoin des autres.
- **Phase 2** : défis communautaires / compétitifs, objectifs de groupe par département.

#### 2.2.6 Classements (Phase 2 — quand le réservoir est prêt)

- **Portées** : département / espèce / saison / national.
- **Métriques (toutes spot-safe)** : nombre de prises, **plus grosse prise vérifiée** (mesurée+photo), diversité d'espèces, XP de la saison.
- **Opt-in** (`public_ranking`), **duel vs tes follows** (le plus motivant socialement), **reset saisonnier** (ladder remis à zéro chaque saison → dopamine récurrente, pas de barrière pour les nouveaux).
- **Notif de rang** : « Tu es repassé n°3 du Finistère au bar 🎣 » / « X t'a dépassé ».
- **Jamais** de coordonnée, **k-anon** sur tout ce qui frôle la localisation, RPC `SECURITY DEFINER` calquée sur `084`.

#### 2.2.7 Notifications « dopamine »

Aujourd'hui toutes les notifs sont **réactives** (quelqu'un t'a liké/suivi/commenté). On ajoute les **proactives** (les vrais moteurs d'engagement), **toutes désactivables**, fréquence tasteful :
- Phase 1 : **level up**, **badge obtenu** (+palier), **nouveau record**, **série en danger (J-2)**, **défi qui se termine**, **défi complété**.
- Phase 2 : **rang changé / dépassé**, **saison qui se termine**, **résultats de saison**.

### 2.3 Où ça s'affiche

1. **Profil public `/u/[username]` — la toile compétitive (aujourd'hui vide).** En tête : **rang + barre XP**, **série en cours**, **3 badges phares** (or d'abord), et en Phase 2 le **rang du dépt**. C'est ce qui donne une **identité** à un pêcheur et donne envie de la remplir.
2. **Cockpit `/home` — le « DopamineCockpit »** (refonte du `GamificationHub` actuel) : barre XP + prochain palier, **série avec urgence douce**, **défis actifs** (anneaux de progression), **badges récents**, et Phase 2 le **mouvement de rang**.
3. **Carnet `/carnet`** : la **célébration de record** au moment de loguer + la page « Tes records » enrichie.
4. **Fil** (Phase 2, optionnel) : items « X a débloqué le badge Or », « nouveau record de Y » — du contenu social **généré par la gamification**, qui aide aussi à remplir le réservoir.

### 2.4 Schéma DB & migrations (prêt à exécuter)

**Numéro de départ : `098`** (le disque va jusqu'à `097`). On calque le pattern `084_spot_confirmations.sql` : `CREATE TABLE … REFERENCES auth.users(id) ON DELETE CASCADE`, `UNIQUE` pour l'idempotence, **RLS activée avant policies**, policies en `(SELECT auth.uid())`, écritures via `SECURITY DEFINER … SET search_path = public`, `REVOKE ALL FROM public, anon; GRANT EXECUTE TO authenticated`. **Regénérer `lib/types.ts` après.**

**`098_xp_progress.sql`**
- `xp_events` (ledger append-only, auditable, recalculable) :
  ```
  id bigint PK, user_id uuid → auth.users ON DELETE CASCADE,
  kind text,                  -- 'catch','new_species','personal_best','measured','release_undersize',...
  points int NOT NULL,
  ref_type text, ref_id uuid, -- ex. ('catch', <catch_id>) pour idempotence
  created_at timestamptz default now(),
  UNIQUE(user_id, kind, ref_type, ref_id)   -- empêche le double-octroi
  ```
- `user_progress` (état matérialisé) :
  ```
  user_id uuid PK → auth.users ON DELETE CASCADE,
  total_xp bigint default 0, level int default 1,
  current_week_streak int default 0, longest_week_streak int default 0,
  last_active_week date, updated_at timestamptz default now()
  ```
- RPC `award_xp(p_kind, p_points, p_ref_type, p_ref_id)` `SECURITY DEFINER` : insère dans `xp_events` (ON CONFLICT DO NOTHING) puis recompute `user_progress` (somme + niveau via table de paliers + recalcul série). Appelée **côté serveur** depuis les Server Actions de prise/sortie/défi — ou mieux, un **trigger `AFTER INSERT ON catches`** qui octroie les XP « catch / new_species / personal_best / measured / release » (plus dur à spoofer). 
- **Backfill** : à la migration, rejouer les `catches` existants pour peupler `xp_events`/`user_progress` (XP rétroactive — ton compte démarre déjà avec un rang, pas à zéro).
- RLS : `xp_events`/`user_progress` **SELECT-own** uniquement, **aucune** policy d'écriture client.

**`099_badges_tiers.sql`**
- `user_badges` (existe) : ajouter `tier smallint default 1` (+ `progress int`, `target int` pour les paliers).
- Mettre à jour `recompute_my_badges()` (existe) : nouvelles familles (§2.2.3) + paliers.
- **Corriger le seuil Pokédex** : `pokedex_complete` à `>= 26` (et non 20). *(Côté copie, `lib/gamification/badges.ts:55` « 20 »→« 26 ».)*

**`100_challenges.sql`**
- `challenges` : `id, slug UNIQUE, title, description, scope text, period_start date, period_end date, criteria jsonb, reward_xp int, active bool`.
- `user_challenge_progress` : `user_id, challenge_id, progress int, target int, completed_at timestamptz, UNIQUE(user_id, challenge_id)`.
- Seed des défis Phase 1 (les conservation existants + nouveaux solo). RPC de progression `SECURITY DEFINER`.

**`101_leaderboards.sql` (Phase 2)**
- `profiles.public_ranking bool default false` (opt-in RGPD).
- RPC `get_leaderboard(p_scope, p_dept, p_species, p_period)` `SECURITY DEFINER` → lignes `{rank, user_id, username, avatar_url, metric}` **sans aucun `geom`**. Filtre `public_ranking = true`. K-anon là où ça frôle la localisation.
- Si perf : `leaderboard_snapshots` (matview) rafraîchie par **cron Vercel** (calque les crons existants `spot_scores`/`personal-window`).

**Anti-triche (transversal) :** XP/records dérivés du SQL vérifiable ; déclaratif (relâché) pondéré bas ; boards « plus gros » sur `measured_length_cm` + `photo_verified_at` only ; rendements décroissants par espèce/jour ; cap quotidien ; dates futures déjà bloquées.

### 2.5 Composants (dans `components/gamification/`)

| Composant | Rôle | Phase |
|---|---|---|
| `LevelBadge` / `RankChip` | rang + icône, sur profil & home | 1 |
| `XpBar` | barre XP + prochain palier, anim « level up » | 1 |
| `StreakCard` (refonte) | série **active** + urgence douce + joker | 1 |
| `BadgeCard` / `BadgesGrid` (maj) | paliers, obtenu/à débloquer, partage | 1 |
| `PersonalBestCelebration` | modale/confetti au nouveau record | 1 |
| `ChallengeCard` / `ChallengesBoard` | défis + anneaux de progression | 1 |
| `ProfileCompetitiveHeader` | en-tête compétitif du profil public | 1 |
| `DopamineCockpit` | refonte du `GamificationHub` de `/home` | 1 |
| `LeaderboardTable` / `RankMovement` | classements + mouvement de rang | 2 |
| (notifs) | nouveaux types + toasts | 1 (solo) / 2 (rang) |

**À réécrire (framing) :** les commentaires « ZÉRO leaderboard / anti-comparaison » dans `056_gamification.sql`, `lib/gamification/{pokedex,badges,streaks}.ts` sont **périmés** (cf pivot) — à mettre à jour pour ne pas induire en erreur le prochain dev.

### 2.6 Wireframes (ASCII, pour cadrer l'UI)

**Profil public — en-tête compétitif (Phase 1, +rang dépt en Phase 2) :**
```
┌──────────────────────────────────────────────┐
│  (avatar)  @Seychi          🔥 7 sem.  ⚓ Lv.5 │
│            Fine gaule · 1 840 XP               │
│            XP ▓▓▓▓▓▓▓▓░░░░  1 840 / 3 000      │
│            🥇 Bar>70  🥈 50 prises  🥉 5 dépts  │
│            ── Phase 2 ──  #3 du 06 · au bar    │
├──────────────────────────────────────────────┤
│  PRISES        (galerie existante)             │
```

**Cockpit `/home` — DopamineCockpit (remplace le hub passif) :**
```
TA PROGRESSION
┌── Niveau ───────────────┐ ┌── Série ─────────────┐
│ ⚓ Fine gaule  Lv.5      │ │ 🔥 7 semaines         │
│ ▓▓▓▓▓▓▓░░ 1840/3000 XP  │ │ J-2 pour la garder    │
└─────────────────────────┘ │ (1 joker dispo)       │
                            └──────────────────────┘
DÉFIS DE LA SEMAINE
( ◔ 1/3 espèces )  ( ◑ mesure 1 prise )  ( ◕ sortie loguée )
BADGES RÉCENTS   🥇 Bar>70cm   🆕 Régulier (argent)
── Phase 2 ──  Ton rang : #3 du 06 ▲ (+1 cette semaine)
```

**Célébration de record (au log d'une prise plus grosse) :**
```
        ✨🎉✨
   NOUVEAU RECORD
   Bar · 73 cm  (+2 cm)
   +30 XP   ·  [ Partager ]  [ Continuer ]
```

**Classement (Phase 2) :**
```
CLASSEMENT · Finistère · Bar · Saison auto.
 1  ⚓ @kévin      18 prises   plus gros 78 cm✓
 2  ⚓ @marine     15          71 cm✓
 3  ⚓ @Seychi  ▲  12          71 cm✓     ← toi
 …   (opt-in · jamais de spot · prises vérifiées ✓)
```

### 2.7 Anti-triche & honnêteté (récap)

Tout est conçu pour rester **infalsifiable et honnête** : XP/rangs recalculables depuis le ledger ; « records » et « plus gros » sur données **mesurées + photo-vérifiées** ; relâché = déclaratif donc pondéré bas (mais valorisé éthiquement) ; rendements décroissants anti-farm ; dates futures bloquées ; classements **opt-in**, **k-anon**, **sans geom**. Le badge « no-kill » garde son disclaimer « sur la base de ce que tu déclares ».

### 2.8 Interaction avec le pricing

La gamification reste **gratuite** (c'est un moteur de **rétention**, cohérent avec « le carnet et la communauté sont gratuits »). Touches premium possibles pour **Itinérant**, **sans pay-to-win** sur les métriques de rang : classements **inter-départements**, cadres de badge cosmétiques, accès anticipé aux événements saisonniers. Le cœur compétitif (rangs, records, classements dépt) reste équitable et gratuit.

### 2.9 Séquencement & backlog priorisé

**Phase 1 (solo, à shipper en premier — marche à 0 donnée) :**
1. `098_xp_progress.sql` + backfill + `award_xp` (trigger sur `catches`). → XP/rangs réels.
2. `PersonalBestCelebration` + page « Tes records » enrichie. → **le crochet dopamine le plus fort, le moins cher**.
3. `StreakCard` refonte (active + joker + notif J-2).
4. `099_badges_tiers.sql` (+ **fix Pokédex 26**) + badges publics à paliers + partage.
5. `100_challenges.sql` + `ChallengesBoard` + événements saisonniers.
6. `ProfileCompetitiveHeader` (profil public) + `DopamineCockpit` (home).
7. Notifs dopamine solo (level/badge/PB/série/défi).

**Phase 2 (compétition — quand le réservoir est prêt, à coupler à la beta `invite_codes` / décision d'amorçage) :**
8. `101_leaderboards.sql` (RPC spot-safe + opt-in).
9. `LeaderboardTable` + duel vs follows + reset saisonnier.
10. Notifs de rang + rareté des badges en %.

---

## 3. Expérience gratuite & onboarding (testé en live sur le compte crash-test « testeur-bord », Finistère 29)

### 3.0 Verdict
L'expérience gratuite est **excellente**. Onboarding fluide et rassurant, cold-start qui explique la valeur et pousse à l'action, **paywall honnête et clair** (jamais agressif), et des features de conformité (RecFishing) qui surprennent par leur sérieux. Très peu de friction. Les accrocs trouvés sont mineurs.

### 3.1 Onboarding (6 étapes) — fort
- **Rythme et clarté** : barre de progression « ÉTAPE 0X/06 » + %, une question par écran, copie rassurante (« Tu peux le changer plus tard », « Honnêtement, pour calibrer… », « Dernière question, promis ! »).
- **Étape 1 pseudo** : **validation temps réel** (format + unicité → « ✓ Pseudo disponible »), erreurs inline propres (« Minimum 3 caractères » + bordure rouge).
- **Étapes 3/4/5** : « Continuer » correctement **désactivé tant qu'aucun choix**. Sélections claires (coche + fond navy). 26 espèces proposées (cohérent avec le reste).
- **Étape 2** : ville en **texte libre** (pas de géocodage, contrairement au log de prise — incohérence mineure), département = select des 24 façades.
- **Fin** : « Création… » (état de chargement propre), redirection vers `/home`.
- ⚪️ Mineur : à l'étape 6, « Créer mon carnet » semble actif avant d'avoir choisi la fréquence (validation peut-être laxiste sur ce champ).

### 3.2 Cold-start `/home` (0 prise) — très fort
- Carte **« PREMIÈRE ÉTAPE — Dès 3 prises, ton carnet te dit OÙ et QUAND ça mord pour toi »** + actions « Importer mes prises » / « Loguer une prise ». **Excellent pont d'activation** (donne le but ET le geste).
- Conditions réelles dès le départ (Finistère : marée montante, créneau 69/BONNE, breakdown astro/marée/vent) + honnêteté « score générique… tes tendances vivent dans ton carnet ».
- États vides éducatifs (« Logue tes prises et ton carnet personnalisera ce créneau »). C'est exactement ce qu'il faut à froid.

### 3.3 Paywall free-tier — honnête et clair (à garder tel quel)
- **Carte** : bandeau « Tu vois **3 spots par département**. Passe en Local (4,90 €/mois) pour la carte complète, les filtres et le score » + « Voir les tarifs ». **72 spots** (3×24) vs **215** abonné. Filtres **verrouillés** (« 🔒 Filtres disponibles avec Local ou Itinérant » + « Débloquer les filtres »), département « Filtres non disponibles ».
- **Couches** : Spots + **Zones de prises (« gratuit »)** ouverts ; **Ton score / Fond marin / Qualité** verrouillés (🔒 + « Débloquer »).
- **Fiche spot** (`/spots/[slug]`) : « **Coordonnées approchées. Abonne-toi pour le GPS précis.** » + itinéraire Google/Plans/Waze. « Meilleurs moments » (solunar) visible. « ✓ Vérifié par l'équipe » + confirmation communautaire (« Je confirme cette position »).
- Ton : informatif, jamais culpabilisant. Bon équilibre free/payant, cohérent avec `/tarifs`.

### 3.4 Loguer une prise (testé end-to-end sur le compte gratuit) — fort + 2 trouvailles
- ✅ **Le géocodage par ville MARCHE** : « Brest » → coords 48.40644 / -4.49774 résolues à la soumission, prise créée (« ✓ Prise loguée ! »). **Le bug connu « Position requise » ne s'est PAS reproduit** ici. À reconfirmer sur un cas tordu (ville sans correspondance, ou submit pendant que l'autocomplete charge), mais le chemin nominal est OK. Fallback « Saisir manuellement » (coords à la main) présent.
- 🌟 **Conformité RecFishing = pépite** : Bar 55 cm → la fiche prise affiche « ⚠️ Espèce sensible : à déclarer sur RecFishing sous 24 h » + **récap à recopier** (espèce/taille/date/lieu/quantité/technique/devenir) + « Copier » + « Ouvrir RecFishing » / App iOS/Android + « J'ai déclaré cette prise », **sourcé et daté** (« Arrêté du 7 nov. 2025… vérifié le 23/06/2026 »). + avertissement contextuel au formulaire (« ✂️ Marquage obligatoire si tu la gardes… »). Vrai différenciateur de sérieux, à mettre en avant marketing.
- ✅ **Poids auto-estimé** (~1,7 kg pour 55 cm) quand non saisi.
- 🟡 Accroc : sélectionner « Leurres » insère un sous-bloc « Leurre depuis ta boîte / saisis à la volée » qui **décale la mise en page** ; un clic destiné au champ ville a atterri dans le champ leurre. Décalage de focus à surveiller.
- ✅ **Boîte à matériel** intégrée au log (« Ta boîte est vide pour l'instant ») — bonne boucle produit.

### 3.5 Gamification à froid (0 → 1 prise) — marche, mais SILENCIEUSE
- Après la 1re prise : **badge « Première prise » obtenu** (daté 30 juin), **Pokédex 1/26** (Bar ✓ ~55 cm). Le système se met bien à jour.
- 🟠 **Mais l'attribution est silencieuse** : seul un toast « Prise loguée ! ». **Aucune célébration** du badge débloqué (il faut scroller le hub de `/home` pour le découvrir). C'est précisément **le moment dopamine manquant** que la Partie 2 vient créer (célébration + notif). Gros gain pour un petit coût.
- Confirmé en live (compte gratuit) : copie « Pokédex complet → **Les 20 espèces** » (bug §1.4), et framing « Aucun classement, aucune comparaison » (ancienne version d'avant le pivot).

### 3.6 Perf mesurée (données du moniteur Vercel, factuel)
Le moniteur **INP de Vercel** a remonté, en interaction réelle : **393 ms** sur le bouton « Continuer » (onboarding) et **2 285 ms** sur un champ de saisie au moment du log de prise. Repères Google : INP « à améliorer » > 200 ms, « médiocre » > 500 ms. Ce sont des **chiffres réels** (pas le gel de l'outil de capture, ni un ressenti) ; le handler de soumission/géocodage est le suspect du 2,28 s. À regarder à tête reposée, sans urgence.

---

## 4. Backlog priorisé global (synthèse)

| Prio | Item | Type | Réf. |
|---|---|---|---|
| 🟠 P1 | **Phase 1 dopamine** (XP/rangs, records + célébrations, séries actives, badges publics, défis, profil/home) | Gamif | §2.9 |
| 🟠 P2 | Carte : filtre `calmar` fantôme (localStorage) + perf tuiles | UX/Perf | §1.3 |
| 🟡 P3 | Hydratation #418 (dates naïves) + regarder les INP (393 ms / 2 285 ms) ; `parentNode` via Sentry | Perf/dette | §1.1 |
| 🟡 P4 | **Célébration au déblocage de badge/record** (auj. silencieux) — petit coût, gros effet | Gamif/UX | §3.5 |
| 🟡 P5 | Badge Pokédex 20→26 (copie `badges.ts:55` + seuil SQL migration 066) | Bug | §1.4 |
| 🟡 P6 | Défaut formulaire « Conservé »→neutre/Relâché | UX/valeurs | §1.4 |
| 🟡 P7 | Partage desktop : modale d'aperçu au lieu d'un toast | UX | §1.4 |
| 🟡 P8 | Fix état vide « PRÈS DE TOI » (contradiction vide + contenu) | Bug cosmétique | §1.2 |
| 🟡 P9 | a11y : libellés slider/date/photo du formulaire de prise | a11y | §1.4 |
| 🟡 P10 | Mobile : contraste « Nouvelle prise », bandeau instruments clippé, textes 9-10 px | Mobile | §1.7 |
| ⚪️ P11 | Couper Vercel Toolbar en prod (réglage dashboard) | Polish | §1.5 |
| ⚪️ P12 | Honnêteté floutage GPS « 1 km » vs ~200 m mesuré | Copie | §1.7 |
| 🟢 — | Réservoir vide = **attendu** ; trancher l'amorçage (seed / beta `invite_codes`) au moment du lancement | Décision | §1.2 |

*(Phase 2 dopamine = après amorçage du réservoir, cf §2.9.)*


