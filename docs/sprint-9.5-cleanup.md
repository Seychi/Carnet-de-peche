# 🧹 Sprint 9.5 — Cleanup avant merge `sprint-9` → `main`

> **Date** : 2026-05-21
> **Durée cible** : 1/2 à 1 jour ouvré
> **Branche** : `sprint-9.5-cleanup` (à créer depuis `main`)
> **Critère de sortie** : tous les ✅ P0 retenus cochés, ≥3 P1 cochés
> **Source de l'audit** : `docs/audits/AUDIT-2026-05-21-post-sprint-9.md`
>
> **Décisions John 2026-05-21 (post-audit)** :
> - **T0.5 médiateur conso retiré** — pas de souscription, promesse retirée de la CGU Art. 14 (commit séparé déjà appliqué dans `app/(marketing)/legal/cgu/page.tsx`). Risque résiduel assumé : non-conformité L612-1 (cf §7).
> - **T1.1 durée guide bar retirée** — incohérence 8 min / 20 min assumée comme non-bloquante au lancement.

---

## 0. Pourquoi ce sprint court

Le sprint 9 (Stripe) est code-complet sur la branche `sprint-9`. Avant de le merger en prod, trois **bloquants UX/SEO** (metas in body, `/fil` soft-404, markers carte invisibles) dégradent la première impression que les visiteurs auront en arrivant via les CTAs Stripe.

Tenter de tout faire en sprint 10 ferait porter ces bugs pendant 2 semaines de plus, en pleine activation des paiements.

Le médiateur conso et la durée guide bar ont été assumés comme non-bloquants (voir cadre Décisions ci-dessus + §7).

---

## 1. Branche et workflow

```bash
# Au début
git checkout main
git pull
git checkout -b sprint-9.5-cleanup

# Commits Conventional Commits
git commit -m "fix(seo): metas SEO dans <head> au lieu de <body>"
git commit -m "fix(seo): /fil — stub publique au lieu de redirect auth"
# etc.

# Fin
git checkout sprint-9
git rebase sprint-9.5-cleanup     # ou git merge, selon préférence
# QA finale
git checkout main
git merge sprint-9
git push
```

**Alternative plus simple** : merger `sprint-9.5-cleanup` direct sur `main`, puis `git rebase main` sur `sprint-9`. Pas de bonne ou mauvaise réponse, c'est selon ton confort git.

---

## 2. Tickets P0 — bloquants

### T0.1 — Metas SEO dans `<head>` (3h)

**Contexte** : sur `/`, `/tarifs`, `/auth/login`, `/contact`, `/especes`, `/techniques`, `/guides/peche-au-bar-au-leurre`, les balises `description`, `og:*` et `twitter:*` sortent dans `<body>` au lieu de `<head>`. Sur `/spots` et `/spots/[slug]` c'est OK.

**Étapes**

1. **Reproduire en navigation privée Chrome SANS extensions** (10 min) :
   - Ouvrir `chrome://extensions/`, désactiver toutes les extensions
   - Ouvrir `chrome://incognito` (ou nouvelle fenêtre privée)
   - Aller sur `https://www.carnet-de-peche.com/`
   - F12 → Console → `({head: document.head.querySelectorAll('meta').length, body: document.body.querySelectorAll('meta').length})`
   - Si `head: 12+, body: 0` → c'est une extension qui faussait l'audit, fermer le ticket avec note. Si `head: 3, body: 9` → continuer.

2. **Comparer SSR brut** (15 min) :
   - View Source (`Ctrl+U`) sur `/` (KO supposé) et `/spots` (OK)
   - Chercher où sont les balises `<meta property="og:*">` dans le HTML brut
   - Si elles sont dans `<head>` en SSR brut → c'est un problème React hydration côté client
   - Si elles sont dans `<body>` en SSR brut → c'est un problème Next.js metadata API

3. **Hypothèses à tester** :
   - **Conflit `title` static** : dans `app/layout.tsx`, `metadata.title` est une string. Dans les pages enfants, c'est aussi une string. Next.js prévoit `title.template` pour gérer ces cas. À tester en passant `metadata.title = { template: '%s · Carnet de Pêche', default: 'Carnet de Pêche — Le réseau...' }` dans le root layout.
   - **Composant client en `body`** : `<Toaster>` est un client component dans le root layout, après `{children}`. Vérifier s'il a un side-effect sur le `<head>`.
   - **`suppressHydrationWarning` sur `<body>`** : masque peut-être un mismatch qui force le re-rendu en body. À retirer le temps du test pour voir les warnings.

4. **Fix** : selon le diag.

**Validation** (5 min)
- Re-lancer la console JS : `headMetas` >= 12 sur les 7 pages KO
- Facebook Sharing Debugger sur `https://www.carnet-de-peche.com/` : `og:image`, `og:title`, `og:description` détectés
- Twitter Card Validator : carte `summary_large_image` valide

---

### T0.2 — `/fil` : retirer du sitemap OU stub publique (1-2h)

**Contexte** : `/fil` redirige vers `/auth/login` mais reste dans le sitemap. Soft-404 SEO + friction visiteurs froids.

**Option A — Retirer (15-30 min, recommandé si pas de temps)**

1. `app/sitemap.ts` : retirer l'entrée `/fil` (garder `/fil/[department]` hors sitemap aussi)
2. `components/layout/Footer.tsx` : retirer ou conditionner le lien "Fil régional" pour les utilisateurs anonymes (peut être affiché aux connectés)
3. Tester `/sitemap.xml` : confirmer absence
4. Tester footer en navigation privée : confirmer absence
5. Commit : `fix(seo): retire /fil du sitemap et footer anonyme (pas de stub publique)`

**Option B — Stub publique (1-2h, recommandé pour la valeur SEO long terme)**

1. Créer `app/(marketing)/fil/page.tsx` :
   - `export const metadata` : title "Fil régional — Bientôt ouvert · Carnet de Pêche", description riche en mots-clés
   - Composition : hero "Le fil des pêcheurs de ton département" + bloc "Comment ça marche" (3 cards : poste / interagis / suis) + CTA "Crée ton compte pour rejoindre ton fil"
   - Optionnel : `<EmailCapture>` (mini-form Resend si dispo, sinon `mailto:contact@?subject=Préviens-moi quand le fil ouvre`)
2. Adapter `app/(app)/fil/page.tsx` pour qu'il ne capture que les chemins authentifiés (déjà OK).
3. Si conflit de routing entre les deux groups : préfixer la route publique différemment (`/decouvrir-le-fil`) et update sitemap.
4. Tester en navigation privée : `/fil` → page publique riche, pas de redirect.
5. Commit : `feat(seo): stub publique /fil avec teaser + capture email`

**Validation**
- `/fil` ne déclenche plus de 302/redirect pour anonyme
- `curl -I https://www.carnet-de-peche.com/fil` → 200 OK
- Title spécifique présent en SSR

---

### T0.3 — Markers carte visibles pour Discovery (2h)

**Contexte** : `/carte` annonce "5 spots" mais 0 marker DOM. La légende couleurs est affichée mais inutile.

**Étapes**
1. Ouvrir `components/map/MapView.tsx` (ou nom équivalent ; `grep -r 'maplibregl-marker' components/`).
2. Trouver la logique de rendu des markers — typiquement une boucle qui crée des `Marker` depuis une liste `spots`. Vérifier :
   - La liste `spots` côté client (Discovery) contient bien des entrées avec `geom_public` ou `lat/lng`
   - Les markers sont effectivement `.addTo(map)`
   - Pas de classe CSS `opacity-0`, `hidden`, ou de display:none parent
3. Test rapide : ajouter `console.log('markers count', spots.length)` au mount, ouvrir `/carte`, vérifier le log
4. Le commit `0bcb0cf` du 20/05 ("retire position:relative inline sur les marqueurs") a peut-être cassé le positionnement → l'élément existe mais est à `top: 0, left: 0` du body. À vérifier visuellement avec DevTools Elements.
5. Fix selon diagnostic.

**Validation**
- `document.querySelectorAll('.maplibregl-marker').length === 5` (Discovery) sur Bretagne zoomée
- Markers colorés selon le score (légende cohérente)
- Test sur 1 page mobile (DevTools responsive 390×844)

---

### T0.4 — Carte chargement initial (1h)

**Contexte** : la carte rend un canvas uniforme au premier mount. Se débloque sur interaction.

**Fix typique**
1. Dans le composant `MapView`, après `new maplibregl.Map(...)`, ajouter :
   ```ts
   useEffect(() => {
     if (!map.current) return
     const resizeObserver = new ResizeObserver(() => map.current?.resize())
     if (containerRef.current) resizeObserver.observe(containerRef.current)
     // Also force resize when style loaded
     map.current.on('load', () => map.current?.resize())
     return () => resizeObserver.disconnect()
   }, [])
   ```
2. Vérifier également la fiche spot — même composant a priori.

**Validation**
- Navigation directe `/carte` → tuiles visibles dès le premier render
- Navigation directe `/spots/pointe-du-raz` → mini-carte rendue
- Pas de régression sur clic / zoom

---

### ~~T0.5 — Médiateur de la consommation~~ — **RETIRÉ (décision John 2026-05-21)**

Pas de souscription à un médiateur de la consommation au lancement. La promesse de désignation à l'activation des abonnements a été supprimée de la CGU Art. 14 (renommé « Règlement des litiges », commit séparé). Risque résiduel assumé : non-conformité à l'article L612-1 du Code de la consommation (cf §7).

---

## 3. Tickets P1 — à prendre sur le sprint 9.5 si temps

### ~~T1.1 — Durée guide bar~~ — **RETIRÉ (décision John 2026-05-21)**

Incohérence 8 min (card) vs 20 min (page) sur `/guides/peche-au-bar-au-leurre` assumée comme non-bloquante au lancement. À reprendre si le sprint 10 (Guides) refactor la lib MDX et qu'on doit toucher le code de toute façon.

---

### T1.2 — Titres `<title>` spécialisés sur `/auth/*` et 404 (30 min)

**Symptôme** : `/auth/login`, `/auth/login?tab=register`, `/inexistant-404` ont tous `<title>` = `"Carnet de Pêche — Le réseau des pêcheurs à la canne du bord"` (titre du layout root).

**Fix** :
1. `app/auth/layout.tsx` : ajouter `export const metadata: Metadata = { title: { template: '%s · Carnet de Pêche', default: 'Carnet de Pêche' } }`
2. `app/auth/login/page.tsx` : ajouter `export const metadata = { title: 'Connexion' }` (ou async si on lit `searchParams.tab`)
3. `app/not-found.tsx` : ajouter `export const metadata = { title: 'Page introuvable · Carnet de Pêche' }` (si pas déjà géré par root layout)

**Validation** : `document.title` ≠ titre home sur ces 3 pages.

---

### T1.3 — 404 : ajouter Header/Footer (30 min)

**Symptôme** : `/inexistant-404` est une page nue (illustration + 2 CTAs) sans navbar ni footer. Si le visiteur ne clique pas un des 2 CTAs, il est coincé.

**Fix** : `app/not-found.tsx` — wrapper dans `<Header />` + `<Footer />` ou utiliser un layout adapté. La copy "Cette page a glissé du hameçon" est jolie, garder.

**Validation** : 404 affiche navbar + footer comme les autres pages publiques.

---

### T1.4 — Marées Pointe du Raz (2h, à reporter si pas de temps)

**Symptôme** : "Données de marée non disponibles pour ce spot" sur la fiche spot phare.

**Diagnostic**
1. Vérifier en local : `pnpm dev` → naviguer `/spots/pointe-du-raz` → ouvrir Network → chercher la requête `marine-api.open-meteo.com` ou similaire. Statut ? Réponse ?
2. Vérifier la coordonnée : Pointe du Raz ≈ `48.038°N, -4.738°W`. Open-Meteo Marine ne couvre **que les zones marines** ; si la requête est trop "à terre", elle peut échouer. Réessayer avec une coordonnée légèrement décalée vers l'ouest.
3. Vérifier la table `tide_cache` : `SELECT * FROM tide_cache WHERE spot_id = '<id pointe du raz>'`. Si vide, le cron n'a peut-être pas tourné, ou l'API a renvoyé une erreur silencieuse.

**Fix** : selon le diag — soit décaler la coordonnée API (sans changer `geom`), soit améliorer le fallback UI ("Marées non disponibles pour cette zone précise — voir [Brest](#)" plutôt que message terminal).

**Validation** : ajouter un test E2E (sprint 11) ou au moins un snapshot du composant marées avec mock.

---

### T1.5 — Mockups home marqués "exemple" (30 min)

**Symptôme** : Yann Le Bras / Sophie Marec / Loïc Briand avec prises chiffrées dans le bloc "communauté", + mockup phone "14 prises · 7 sessions", + "Mon année 2026 · 14 sessions · 23 prises".

**Fix options**
- **Option A (minimale)** : ajouter un badge subtil "Exemple" dans chaque mockup ($1text top-right opacity-60)
- **Option B** : remplacer les prises chiffrées du bloc communauté par des cards textuelles "Comment ça marche" (sans personne nommée)
- **Option C** : retirer les noms inventés, ne garder que la structure UX visible.

Recommandation : option A. Pas mensonger, montre la valeur, mais désamorce la critique "vous inventez des utilisateurs".

**Validation** : visuel — chaque mockup a un marqueur "Exemple" identifiable en 2s.

---

### T1.6 — Tab `/auth/login` synchronisation URL (15 min)

**Symptôme** : sur `/auth/login?tab=register`, cliquer "Connexion" garde `?tab=register` dans l'URL alors que le tab actif est "Connexion".

**Fix** : dans le composant tab login/register, utiliser `router.replace({pathname: '/auth/login', query: {tab: newTab}})` pour rester en sync.

---

## 4. Tickets P2 — backlog post sprint 9.5

À programmer dans le sprint 10 ou plus tard (cf. audit §1 P2):

- **P2.1** Typo « Vagues Scelerats » → « Vagues scélérates » (5 min, fix dans le seed `supabase/seed.sql` ou table `spots.dangers`)
- **P2.2** Hero images guides Bar et Dorade royale (1h, image + composant `<Image>`)
- **P2.3** « Modération IA prévue post-beta » : roadmapper (15 min copy + ticket)
- **P2.4** « Export GPX/JSON prévu cette année » : roadmapper (15 min copy + ticket)
- **P2.5** « 100+ spots ciblés » : reformuler "Objectif lancement" en plus explicite (10 min)
- **P2.6** Capture email seul sur stubs (`/especes`, `/techniques`, `/fil` si Option B au-dessus) — 2h Resend
- **P2.7** Z-index toasts carte (15 min)
- **P2.8** Vérifier comptes sociaux Instagram/TikTok/YouTube — coord avec César (admin)
- **P2.9** Retirer "Stripe Inc. (à venir)" dans `/legal/confidentialite` — à faire **au merge sprint-9** (5 min)
- **P2.10** « Apple OAuth · Bientôt » : décider date, retirer la mention ou roadmapper (5 min)
- **P2.11** Filtre `/spots` vide state non-Bretagne (à tester quand >1 dept seedé)
- **P2.12** A/B test 1 spot précis gratuit (post sprint 22)

---

## 5. Checklist avant merge sprint-9 → main

### Bloquants (tous obligatoires)
- [ ] T0.1 Metas SEO en `<head>` (validé Facebook + Twitter)
- [ ] T0.2 `/fil` n'est plus dans sitemap ou pointe une page publique
- [ ] T0.3 Markers carte visibles pour Discovery (≥1 sur Bretagne)
- [ ] T0.4 Carte chargement initial OK (canvas rendu dès le mount)
- [x] ~~T0.5 Médiateur conso~~ — retiré, promesse supprimée de la CGU (commit séparé)
- [ ] QA Stripe checklist `docs/sprint-9/qa-checklist.md` cochée

### Recommandés (≥3 sur 5)
- [x] ~~T1.1 Durée guide bar~~ — retiré, assumé
- [ ] T1.2 Titres pages auth + 404
- [ ] T1.3 404 avec navbar/footer
- [ ] T1.4 Marées Pointe du Raz
- [ ] T1.5 Mockups marqués "exemple"
- [ ] T1.6 Tab `/auth/login` synchronisé

### Doc à jour
- [ ] `CLAUDE.md` section 2 — sprint 9 déployé, sprint 10 (Guides) suivant
- [ ] `docs/ROADMAP.md` — sprint 9.5 ajouté en historique
- [ ] `docs/audits/AUDIT-2026-05-XX-post-sprint-9.5.md` — post-mortem du nettoyage

### Déploiement Stripe LIVE
- [ ] Vars `STRIPE_*` LIVE dans Vercel Production
- [ ] Endpoint webhook Stripe LIVE créé + secret configuré
- [ ] 2 comptes seed `redkps4+local` / `redkps4+itinerant` arbitrés (cf `supabase/README.md` § anti-traîne)
- [ ] Confidentialité : retirer "Stripe Inc. (à venir)" (P2.9)

---

## 6. Estimation totale

| Item | Effort min | Effort max |
|---|---|---|
| T0.1 Metas | 2h | 3h |
| T0.2 /fil (option A retrait) | 30min | 30min |
| T0.2 /fil (option B stub) | 1h | 2h |
| T0.3 Markers carte | 1h30 | 2h |
| T0.4 Carte init | 30min | 1h |
| **P0 total** | **5h20** | **8h30** |
| T1.2 → T1.6 (3 sur 5) | 1h30 | 2h |
| Code review + QA manuelle | 1h | 2h |
| **Sprint 9.5 total** | **7h50** | **12h** |

Soit **1 jour ouvré, max 1.5 jour si tu prends le temps**.

---

## 7. Risques résiduels assumés au lancement

### 7.1 — Pas de médiateur de la consommation désigné (L612-1)

**Décision** : 2026-05-21, John, post-audit.

**Contexte** : l'article L612-1 du Code de la consommation impose à tout professionnel qui s'adresse à des consommateurs de garantir « le recours effectif à un dispositif de médiation de la consommation ». Sanction maximale (article L641-1) : 15 000 € pour une personne morale, 3 000 € pour une personne physique. En pratique, ces amendes sont rarissimes pour les petits e-commerces beta, mais le risque n'est pas zéro.

**Mitigation appliquée** :
- La promesse « le médiateur sera désigné lors de l'activation des abonnements payants » a été supprimée de la CGU Article 14 (renommé « Règlement des litiges »).
- Le canal de réclamation préalable reste cité : `contact@carnet-de-peche.com`, réponse sous 48 h ouvrées, recherche d'une solution amiable.
- Le lien vers la plateforme RLL européenne (`ec.europa.eu/consumers/odr`) est conservé — c'est l'obligation directe pour le e-commerce vendant dans l'UE (Règlement 524/2013).

**Re-évaluation** : à reprendre si :
- Premier litige consommateur formel reçu par mail (déclenchement)
- Lettre d'avertissement DGCCRF (déclenchement)
- Passage à >500 abonnés payants (seuil de visibilité)
- Demande presse / fédération de pêche qui regarde la conformité (anticipation)

**Coût quand on le fera** : ~120 €/an pour CM2C ou Médicys + 1h admin + 10 min code (réintroduire le nom du médiateur dans Art. 14).

### 7.2 — Durée du guide bar incohérente

**Décision** : 2026-05-21, John, post-audit.

`/guides` annonce "8 min de lecture", `/guides/peche-au-bar-au-leurre` dit "20 min". Bug visible mais ne casse rien. À traiter naturellement dans le sprint 10 (Guides) quand on refactorera la lib MDX et qu'on touchera ces fichiers de toute façon.

---

*Plan livré le 2026-05-21 (Cowork), édité après décisions John, en complément de `docs/audits/AUDIT-2026-05-21-post-sprint-9.md`.*
