# 📱 Protocole d'audit mobile (Claude in Chrome) — Sprints 16 & 17

> **Statut : PRÊT À DÉROULER.** Rédigé le 2026-06-22 pendant que les sprints 16 (polish mobile & fluidité) et 17 (cohérence produit & social) sont en cours.
> **Déclencheur** : John dit « c'est bon, les sprints sont finis » → je déroule ce protocole de A à E et je produis le rapport `docs/audits/AUDIT-MOBILE-S16-S17-<date>.md`.
> **Méthode** : Claude in Chrome (= rôle **qa-chrome** de CLAUDE.md §20) en **viewport mobile**, complété par **supabase-guard** (lecture base, RLS, floutage) pour ce qui ne se voit pas à l'écran, et par les mesures perf du repo (`pnpm lhci`).
> **Sources** : `docs/sprint-16/BRIEF.md`, `docs/sprint-17/BRIEF.md`, `docs/audits/AUDIT-MOBILE-UX-2026-06-22.md`, `docs/audits/AUDIT-COHERENCE-2026-06-22.md`.

---

## 0. Décisions de cadrage (validées avec John, 2026-06-22)

| Paramètre | Choix retenu | Conséquence sur l'audit |
|---|---|---|
| **Étendue** | Complet + **perf chiffrée** | Sections A→E ci-dessous : critères 16/17 + balayage UX global + passe sécu anti-régression + mesures perf avant/après. |
| **Environnement** | **Production** `www.carnet-de-peche.com` (décision John 2026-06-22) | Audit **post-déploiement** : John merge + déploie 16/17 en prod, puis je déroule sur le site live. ⚠️ **Données réelles, vrais utilisateurs** → règles de sûreté §1 + nettoyage obligatoire (§4). |
| **Comptes** | **2 comptes** fournis par John | Compte A = **modérateur** (John, `is_moderator`), compte B = pêcheur lambda. Indispensable pour prouver la non-fuite cross-compte (carnet public, notifs RLS, prises privées/amis). |
| **Modèle social** | **« Abonnés »** unidirectionnel (façon Insta) — décision John 2026-06-22 | **Pas de migration de réciprocité.** Suivre B ouvre la visibilité des prises « amis » de B **sans** réciprocité = comportement actuel. L'audit vérifie que copy + doc + commentaires schéma sont alignés sur ce modèle (plus aucun « amis mutuels » résiduel). |

---

## 1. Pré-vol (à confirmer au moment du lancement)

Cocher avant de commencer. Tant qu'un point n'est pas vert, l'audit serait faussé.

- [ ] **Sprints 16 + 17 mergés et déployés en prod** (`www.carnet-de-peche.com`) — l'audit se fait **après** le déploiement.
- [ ] **Migrations 037 (notifications) + 038 (policy modération) appliquées en prod** AVANT le déploiement du code (`list_migrations` via supabase-guard ; rappel incident 2026-06-13 : code promu avant migration = page en erreur).
- [ ] **`lib/types.ts` régénéré** après 037/038.
- [x] **Compte A (modérateur + abonné)** — `redkps4@gmail.com` (Seychi) : `is_moderator=true` ✅, `subscriptions` = **itinerant / active** (valide ~juin 2027), `current_tier()` → `itinerant` ✅, dept 06, onboardé. ⚠️ **Se reconnecter** pour que le nouveau tier soit pris en compte avant l'audit.
- [x] **Compte B (lambda gratuit)** — `redkps4+lambda@gmail.com` (mdp fourni en session) : `test_lambda` / « Pêcheur test », dept 06, **discovery**, non-modérateur. Semé : 3 prises (**publique** bar 52 cm + photo, **amis** dorade 38 cm, **privée** sar 26 cm) + 1 post fil `[test]` lié à la prise publique. Photo vérifiée (URL signée HTTP 200, `image/webp`).
- [ ] **Les 2 comptes dans le même département (06)** pour que fil / follows / signal social se rencontrent.
- [ ] **Claude in Chrome connecté** (`list_connected_browsers`) + onglet propre.
- [ ] **Fenêtre redimensionnée en mobile** : `resize_window` → **390 × 844** (gabarit iPhone). Repasses ciblées à **360 × 800** (petit Android) pour les tests de débordement (#8 onglets fil).
- [ ] **Barre d'outils Vercel neutralisée** : tester en **fenêtre de navigation privée / non connectée au compte Vercel**, sinon la pastille ronde milieu-droite (barre Vercel, hors-produit) pollue les captures (cf. point ⚪ de l'audit mobile).

### ⚠️ Règles de sûreté PROD (audit sur le site live)

On écrit dans la vraie base, visible des vrais pêcheurs du dépt 06. Discipline stricte :
- **Interactions sociales uniquement entre Compte A et Compte B** — ne jamais liker / commenter / suivre / signaler le contenu d'un **vrai** utilisateur (ça lui enverrait notif / signalement réels).
- **Contenu de test marqué** (préfixe `[test]`) et **éphémère** : créé pour le check, **supprimé juste après**.
- **Modération** : ne supprimer que **nos propres** posts de test, jamais ceux d'un vrai pêcheur.
- En cas de doute sur un effet de bord réel → **s'abstenir** et noter « à vérifier en base (supabase-guard) » plutôt qu'agir en prod.
- **Nettoyage final obligatoire** : checklist de sortie en §4.

### Méthode de capture (réflexes systématiques)
- `navigate` → `resize_window 390×844` → laisser charger → **`computer` screenshot** (preuve visuelle) + **`get_page_text`/`read_page`** (structure/texte).
- **`read_console_messages`** après chaque écran (erreurs JS, images 404, warnings).
- **`read_network_requests`** pour les mesures de round-trips et le time-to-tiles (section A & E).
- **`find`** pour localiser un élément précis ; **`gif_creator`** pour prouver un scroll fluide / sans flash.
- ⚠️ **Esprit critique (exigence John §19)** : on **mesure**, on ne suppose pas. Avant/après chiffré pour la perf. Si un écran a bougé depuis le brief, on audite le **vrai écran**, pas le brief.

---

## 2. Écrans & URLs à parcourir

| # | Écran | URL (preview) | Auth | Notes |
|---|---|---|---|---|
| E1 | Home | `/` | public | reveals scroll, mockups |
| E2 | Tarifs | `/tarifs` | public | section F (promesses) |
| E3 | Espèces (index + 1 fiche) | `/especes`, `/especes/bar` | public | |
| E4 | Guides (index + 1 guide) | `/guides`, `/guides/<slug>` | public | état vide / pluriel |
| E5 | Spots (liste + filtres) | `/spots` | public | bug #4 filtres |
| E6 | Fiche spot | `/spots/<slug>` | public | mini-carte, courbe marée |
| E7 | Auth | `/auth/login`, `/auth/register` | public | titres, tap targets |
| E8 | Carnet | `/carnet` | A & B | scroll, stats |
| E9 | Nouvelle prise | `/carnet/nouvelle` | A | header contraste #6 |
| E10 | Fiche prise | `/carnet/<id>` | A & B | gating `isOwner`, mini-carte |
| E11 | Carte | `/carte` | A (gratuit) & abonné | tuiles <2,5 s, gating tier |
| E12 | Fil | `/fil`, `/fil/06` | A & B | scroll, image vide, onglets |
| E13 | Profil public | `/u/<username>` | A regarde B | **carnet public** (cœur S17) |
| E14 | Mes pêcheurs | `/follows` | A | nav, découverte, recherche |
| E15 | Profil (édition) | `/profil` | A | checkboxes teal, onboarding↔profil |
| E16 | Notifications | `/notifications` (S17) | A & B | nouvelle surface |
| E17 | Modération | `/moderation` (S17) | A=mod, B=non-mod | nouvelle surface, RLS |
| E18 | 404 | `/zzz-inexistant` | public | header/footer |

---

## A. SPRINT 16 — Polish mobile & fluidité

> Objectif du sprint : navigations quasi instantanées, scroll qui ne flashe **jamais** blanc, carte < 2,5 s, bugs de finition corrigés. Chaque ligne ci-dessous reprend un **critère d'acceptation** ou un **item de l'audit mobile (#1→#10)**.

### A1 — Perf des navigations (Bloc A) — *le gros levier*
- [ ] **A1.1 Plus de cascade auth.** Sur E12→E8→E11→E15 (changements d'onglet), `read_network_requests` : **un tap d'onglet ne déclenche plus 3-4 allers-retours auth** en cascade (double `getUser` middleware+layout, `subscriptions` partout). *Preuve : trace réseau, nb de requêtes auth par navigation.*
- [ ] **A1.2 Retour instantané.** Revenir sur un onglet **déjà visité** (fil → carnet → fil) = **rendu immédiat depuis le cache** (React Query/SWR), revalidation discrète en fond. *Preuve : capture + absence de skeleton plein écran au retour.*
- [ ] **A1.3 Cohérence après mutation.** Liker/commenter un post → revenir → **compteur cohérent** (invalidation de cache OK, pas de donnée périmée).
- [ ] **A1.4 (sécu) Aucune page `(app)` tier/GPS en cache CDN partagé** — vérifié en D. Le cache doit être **client**, pas ISR.

### A2 — Scroll sans flash blanc (Bloc B / audit #1)
- [ ] **A2.1** Scroller **de haut en bas** de la **home (E1)** : **aucun écran blanc/crème** intermédiaire, aucun « pop » tardif. *Preuve : `gif_creator` du scroll.*
- [ ] **A2.2** Idem sur le **fil (E12)**, le **profil (E15)** et le **form de prise (E9)**.
- [ ] **A2.3 `prefers-reduced-motion: reduce`** activé → **contenu visible d'emblée, zéro animation** (émuler via `javascript_tool`/DevTools ou réglage OS).
- [ ] **A2.4** `read_console_messages` : pas d'erreur de layout/repaint pendant le scroll.

### A3 — Carte plus rapide (Bloc C / audit #2)
- [ ] **A3.1 Tuiles MapTiler visibles < 2,5 s** sur **E11** en **4G simulée** (throttling). *Preuve : timestamp première tuile via trace réseau.* ⚠️ Le throttling DevTools ne remplace pas le ressenti device → marqué « à confirmer sur téléphone (John) ».
- [ ] **A3.2** **Skeleton « carte »** au mount (pas un simple dégradé navy→teal).
- [ ] **A3.3** Mini-carte des **fiches spot (E6)** et de la **fiche prise (E10)** : même rapidité, pas de canvas noir, `map.resize()` au `load` OK.
- [ ] **A3.4** 5 requêtes Supabase de `carte/page.tsx` **parallélisées** (vérif supabase-guard : indépendantes + aucune fuite de geom précis au tier gratuit).

### A4 — Bugs visibles mobile (Bloc D) — passe **390 px** (et 360 px pour #8)
- [ ] **A4.1 (#3) Image vide dans le fil** corrigée : aucun **rectangle beige vide** ; photo en cours = skeleton, photo échouée = masquée proprement. *Écran E12.*
- [ ] **A4.2 (#4) Filtres `/spots`** en **pleine largeur** (1 colonne `w-full`), plus d'alignement à droite avec moitié gauche vide. *Écran E5.*
- [ ] **A4.3 (#5) Bandeau instruments** : **fondu dégradé** au bord (affordance de scroll horizontal), le dernier item (« ▶ créneau ») n'est plus coupé sans indice. *Toutes pages app.*
- [ ] **A4.4 (#6) Header « Nouvelle prise »** : titre + ✕ en **texte clair lisible** sur navy (plus de sombre sur sombre). *Écran E9.*
- [ ] **A4.5 (#7) Checkboxes / radios** du profil en **teal** (charte), plus de bleu OS. *Écran E15.*
- [ ] **A4.6 (#8) Onglets du fil** non tronqués à **≤ 360 px** (« Toute la côte » ou barre scrollable). *Écran E12 @ 360 px.*
- [ ] **A4.7 (#9) Titres de section** des formulaires à l'échelle mobile réduite (~18-20 px). *Écrans E9, E15.*
- [ ] **A4.8 (#10) Mockups home** : acceptable en illustratif ; noter s'ils sont passés en data réelle ou non (arbitrage cosmétique).

---

## B. SPRINT 17 — Cohérence produit & social

> Objectif du sprint : une prise publique **vit** sur le profil de l'auteur, on **voit le carnet des autres**, signalements/follows **servent**, on peut **chercher un pêcheur**, et **plus aucune promesse ne ment**.

### B1 — Carnet public sur le profil (Bloc A / audit #1) 🔴 *le trou central — nécessite 2 comptes*
- [ ] **B1.1** Sur **E13 `/u/<B>`** (A regarde B) : une **grille de prises publiques** de B s'affiche (photos via URL signée), **cliquables** vers la fiche prise.
- [ ] **B1.2** Sur la fiche prise d'autrui (**E10**, A ouvre une prise de B) : **aucun bouton « Modifier » / menu Supprimer** (gating `isOwner`).
- [ ] **B1.3 (confidentialité)** Une prise **privée** de B **n'apparaît jamais** chez A. *Preuve croisée : écran + requête supabase-guard.*
- [ ] **B1.4 (confidentialité)** Mes **propres prises privées** n'apparaissent pas sur **mon** profil public.
- [ ] **B1.5 (amis)** A **suit** B → A voit en plus les prises **« amis »** de B ; A **ne suit pas** → ne les voit pas. *2 comptes obligatoires.*
- [ ] **B1.6 (sécu GPS)** Les prises affichées sur le profil respectent le **floutage** (pas de coords précises d'autrui). Recoupé en D.

### B2 — Notifications in-app (Bloc B / audit #2 / migration 037)
- [ ] **B2.1** B **like/commente/suit** A → **notif créée** chez A ; **badge cloche** s'incrémente (realtime ou au refetch).
- [ ] **B2.2** Ouvrir **E16 `/notifications`** → liste groupée, **marquage lu** fonctionne, badge retombe.
- [ ] **B2.3 (RLS)** A ne lit **que ses** notifs (B ne voit pas celles de A). *Vérif supabase-guard.*
- [ ] **B2.4 (anti-bruit)** Pas de notif quand l'acteur = destinataire (je m'auto-like → rien).

### B3 — Modération (Bloc C / audit #3 / migration 038)
- [ ] **B3.1** Compte **A (modérateur)** accède à **E17 `/moderation`** → **file des `reports` `pending`** avec lien vers le post.
- [ ] **B3.2** Actions « ignorer » / « supprimer le post » (réutilise `moderatorDeletePost`) → report passe `resolved`.
- [ ] **B3.3 (RLS)** Compte **B (non-mod)** : **pas d'accès** à `/moderation` **et** ne lit pas `reports`. *Vérif : la policy `reports_select_own_or_mod` vise bien `is_moderator()` après 038, plus `is_ambassador`.*
- [ ] **B3.4** Bout-en-bout : B signale un post → il apparaît dans la file de A.

### B4 — Recherche, découverte & nav (Bloc D / audit #9-10-12)
- [ ] **B4.1** **Recherche d'un pêcheur par pseudo** (champ/route `/recherche` ou modale) → je trouve B **sans le croiser dans le fil**.
- [ ] **B4.2** **E14 `/follows`** enrichi (« récemment actifs », par espèce/technique), pas juste 5 suggestions du même département.
- [ ] **B4.3 (nav)** Depuis le **UserMenu** (même sur une page marketing connecté), j'atteins **« Fil régional »** et **« Mes pêcheurs »**. `/follows` joignable hors état-vide.

### B5 — Cohérence onboarding ↔ profil + modèle social (Bloc E / audit #8-11) — *modèle « abonnés » verrouillé (John, 2026-06-22)*
- [ ] **B5.1** **Libellés identiques** partout (fréquence de pêche : plus de « daily » = « plusieurs fois/semaine » d'un côté et « presque tous les jours » de l'autre).
- [ ] **B5.2** **Regex username identique** inscription/édition (`jean.pecheur` accepté — ou refusé — des deux côtés).
- [ ] **B5.3** **`years_practicing` éditable** au profil.
- [ ] **B5.4** Onboarding **rejette les valeurs hors enum** (zod partagé) ; **≥ 1 technique/espèce** exigé aussi au profil.
- [ ] **B5.5 (modèle social = « abonnés »)** Vérifier que toute mention **« amis mutuels »** résiduelle est corrigée en **« abonnés »** : commentaires schéma (`001:84-89`), `CLAUDE.md §8`, copy type `/carnet/[id]:31` (« Visible par tes abonnés »). **Aucune migration de réciprocité** ; la RLS `catches_select_friends` reste telle quelle (suivre l'auteur suffit à voir ses prises « amis »).

### B6 — Tarifs vs réalité (Bloc F / audit #4-5-6) 🔴 *avant pub LIVE*
- [ ] **B6.1 Offline** retiré des **3 emplacements** (`tarifs/pricing-cards.tsx:44`, home `:522`, `:537`) tant que le SW ne cache pas tuiles+marées.
- [ ] **B6.2 Bathy** requalifiée **« profondeur (EMODnet) »** (plus « SHOM premium ») et/ou **gatée** (plus affichée à tous).
- [ ] **B6.3 Itinéraires** : « **multi-spots** » retiré (mono-destination aujourd'hui).
- [ ] **B6.4 Stats avancées** : soit **gatées** derrière le tier, soit retirées du plan Local (aujourd'hui `CatchStatsDetailed` est gratuit).
- [ ] **B6.5 Push** : mention « push » retirée tant que c'est **in-app only** (B2).
- [ ] **B6.6** Lecture finale de **E2 `/tarifs`** : **aucune ligne** ne décrit une capacité absente ou déjà gratuite.

---

## C. Balayage UX mobile global (toutes pages, 390 px)

> Au-delà de 16/17 : la cohérence d'ensemble. Sur **chaque** écran E1→E18.

- [ ] **C1 Tap targets ≥ 44 px** (boutons, onglets, liens nav, FAB).
- [ ] **C2 Aucun débordement horizontal** (pas de scroll latéral parasite, pas de texte coupé) en 390 px **et** 360 px.
- [ ] **C3 Contraste AA** : texte/fond, liens footer (déjà remontés en S-excellence), labels de formulaire, états désactivés.
- [ ] **C4 App shell** : tab bar (Carnet · Carte · FAB+ · Fil · Profil) + bandeau instruments cohérents et stables sur toutes les pages app ; pas de saut de layout.
- [ ] **C5 États vides** soignés (carnet, fil, follows, notifs, recherche, modération vide) : icône + copy + CTA.
- [ ] **C6 États de chargement** : skeletons (pas d'écran blanc), images lazy + blur.
- [ ] **C7 Cohérence DA v2** : JetBrains Mono sur **tout chiffre métier** (coords, coef, PM/BM, tailles, stats) ; tokens navy/gold/coral/teal respectés ; icônes Lucide (plus d'emoji-icône).
- [ ] **C8 Tutoiement** systématique, **zéro mention « sprint X »** visible, zéro lien mort (footer réseaux à vérifier hors-code).
- [ ] **C9 Formulaires** : labels associés, focus visible, clavier mobile adapté (`type=email`, etc.), autofill off là où voulu.
- [ ] **C10 404 (E18)** avec Header/Footer et `<title>` propre.
- [ ] **C11 Console propre** : `read_console_messages` sur chaque écran = pas d'erreur rouge, pas d'image/asset 404.

---

## D. Passe adversariale sécurité (anti-régression) — *la plus importante*

> Invariants CLAUDE.md §8/§11 + briefs. Combine **qa-chrome** (ce qui se voit) et **supabase-guard** (ce qui ne se voit pas). **Un seul échec ici = P0 bloquant, même si tout le reste est vert.**

### D1 — Floutage GPS
- [ ] **D1.1** Compte **gratuit** sur **E11 `/carte`** : spots floutés = **cercle ~500-900 m** (jitter `blur_spot_geom`), **jamais** le `geom` précis. *Mesure : cliquer un spot flouté, comparer aux coords précises côté abonné.*
- [ ] **D1.2** **Carnet public** (B1) : aucune coord précise d'autrui ne fuit (la grille passe par `catches_for_viewer`).
- [ ] **D1.3 (base)** supabase-guard : `anon` **ne lit pas** `spots.geom` (verrou colonne, migrations 028/029) ; `get_spots_for_scoring`/RPC spots gatés par tier.
- [ ] **D1.4** Signal social spot (`get_spot_activity`) n'expose **aucune coordonnée**.

### D2 — Gating de tier
- [ ] **D2.1** Compte **gratuit** : carte limitée (**3 spots/dépt**, floutés, pas de score, pas de filtres), 1 seul département.
- [ ] **D2.2** Compte **abonné** : carte complète (coords précises, score 0-100, filtres espèces/techniques). *Bascule de tier vérifiée.*
- [ ] **D2.3 (sécu cache S16)** **Aucune page `(app)` dépendant du tier/GPS n'est mise en cache CDN partagé** (sinon fuite cross-utilisateur). Le cache S16 doit être **client/SWR**. *Vérif : headers de réponse + comportement 2 comptes.*
- [ ] **D2.4** Le **social reste 100% gratuit** (fil lecture+écriture, likes, commentaires, follows) tous tiers / tous dépts côtiers (décision 2026-06-11) — pas de régression de gating qui re-bloquerait l'écriture.

### D3 — RLS & isolation des données
- [ ] **D3.1** **Notifications** (037) : RLS lecture/maj = destinataire only (B2.3). `get_advisors` security = **0 nouvelle alerte**.
- [ ] **D3.2** **Reports** (038) : SELECT visée sur `is_moderator()` (B3.3), pas `is_ambassador`.
- [ ] **D3.3** **Prises privées** invisibles cross-compte (B1.3/B1.4) ; **jamais** d'accès brut à `catches` à la place de `catches_for_viewer`.
- [ ] **D3.4 `get_advisors` (security + perf)** lancé en fin d'audit : pas de RLS désactivée, pas de nouvelle alerte sur les tables touchées (`notifications`, `reports`). *(Rappel : WARN `auth_leaked_password_protection` = assumé, projet Free — ne pas le re-signaler comme TODO.)*

### D4 — Accessibilité du mouvement
- [ ] **D4.1** `prefers-reduced-motion: reduce` respecté partout (recoupe A2.3) : reveals/animations désactivés, contenu d'emblée.

---

## E. Perf chiffrée (avant/après)

> Le sprint 16 **exige** des mesures, pas des impressions. Deux sources complémentaires.

### E1 — Mesures live (Claude in Chrome)
- [ ] **E1.1 Round-trips auth par navigation** : compter via `read_network_requests` les requêtes vers `auth/v1/*` + `rest/v1/*` sur 3 changements d'onglet. **Cible : effondrement vs l'état décrit (3-4 cascades → 1).** *Tableau avant/après.*
- [ ] **E1.2 Time-to-first-tile carte** (E11) en 4G simulée : horodatage de la 1ʳᵉ tuile MapTiler. **Cible < 2,5 s.**
- [ ] **E1.3 Time-to-interactive ressenti** au retour sur onglet caché (cache hit) : ~immédiat.
- [ ] **E1.4** Mesures consignées dans un tableau **AVANT (état pré-sprint, cf. audit du 22/06) / APRÈS**.

### E2 — Lighthouse mobile (repo)
- [ ] **E2.1** `pnpm lhci` (ou `/verif-sprint` qui l'inclut) : **Perf ≥ 70 mobile**, LCP < 2,5 s, CLS < 0,1 sur `/`, `/carte`, `/spots/[slug]`, `/fil`. *(Budget sprint 11.)*
- [ ] **E2.2** Pas de régression **SEO/a11y** vs la dernière passe.

### E3 — Device réel (rappel — **John**, hors Chrome)
- [ ] **E3.1** Le brief 16 impose la validation finale du **scroll + carte sur un vrai Android milieu de gamme** (le throttling ne suffit pas). → Reste à la charge de John ; je le note comme **dépendance** dans le rapport, pas comme « fait ».

---

## 3. Grille de synthèse (à remplir pendant l'audit)

Statut par check : ✅ conforme · ⚠️ partiel · ❌ régression/échec · ⬜ non testé (préciser pourquoi).

| Section | Portée | ✅ | ⚠️ | ❌ | Note /10 |
|---|---|---|---|---|---|
| A. Sprint 16 (fluidité/bugs) | A1→A4 (≈ 19 checks) | | | | |
| B. Sprint 17 (cohérence/social) | B1→B6 (≈ 27 checks) | | | | |
| C. UX mobile global | C1→C11 | | | | |
| D. Sécu anti-régression | D1→D4 | | | | |
| E. Perf chiffrée | E1→E3 | | | | |
| **GLOBAL** | | | | | **/10** |

**Repère** : l'audit mobile du 2026-06-22 notait **7,5/10**, plombé par (1) flashs blancs au scroll, (2) carte ~8 s, (3) bugs de finition. Le sprint 16 vise précisément ces points → **objectif post-sprint ≥ 9/10 sur l'axe fluidité**. Le sprint 17 ne change pas la note « mobile UX » mais doit faire passer la **cohérence produit** de « trous de logique » à « tout se branche ».

### Classification des findings
- **P0 (bloquant)** : toute régression sécu (D), toute promesse payante mensongère restante (B6), tout critère d'acceptation 16/17 **non tenu**.
- **P1 (important)** : bug visible non corrigé, perf hors cible (E), incohérence sociale résiduelle.
- **P2 (polish)** : cosmétique, micro-copy, nice-to-have.

---

## 4. Livrable, nettoyage & suite

1. Je produis **`docs/audits/AUDIT-MOBILE-S16-S17-<date>.md`** : verdict global + note /10, grille remplie, findings classés P0/P1/P2 avec **`fichier:ligne` quand pertinent** et **captures**, tableau perf avant/après, et la liste « reste manuel John ».
2. Si des **P0** sont trouvés (régression sécu, promesse mensongère, critère non tenu) → listés en tête pour **hotfix prioritaire** (le code est déjà en prod).
3. **deploy-watch** (Vercel runtime + Sentry) pendant/après l'audit → confirmer zéro nouvelle issue depuis le déploiement de 16/17 (rappel incident 2026-06-13).
4. **Nettoyage prod (obligatoire)** — supprimer le contenu de test créé pendant l'audit :
   - [ ] posts + commentaires `[test]` (comptes A & B)
   - [ ] prises de test (sauf si tu veux les garder comme seed)
   - [ ] reports de test (passés en `resolved`)
   - [ ] follows de test (pour remettre l'état initial)
   - [ ] notifications de test (se purgent avec les actions sources)

---

## 5. Limites connues de l'outillage (honnêteté)

- **4G réelle / ressenti device** : Claude in Chrome simule via throttling ; le **vrai téléphone reste l'arbitre** (dépendance John, E3).
- **Lighthouse** : ne se lance pas depuis le navigateur piloté → vient du repo (`pnpm lhci`), à croiser avec les mesures live.
- **Base de données** : ce qui ne se voit pas (RLS, floutage en base, advisors) passe par **supabase-guard** en lecture, pas par l'écran.
- **Audit sur prod live** : toute donnée de test (posts, prises, reports, follows, notifs) est **réelle et visible des vrais utilisateurs** → règles de sûreté §1 + **nettoyage obligatoire** en fin d'audit (§4).

---

*Protocole prêt. Une fois 16/17 déployés en prod (+ migrations 037/038) et les 2 comptes créés, dis « c'est bon » et je déroule A→E sur `www.carnet-de-peche.com`, puis je livre le rapport.*
