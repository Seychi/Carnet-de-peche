# Sprint 10 — Brief d'exécution
## Guides éditoriaux + SEO programmatique + riposte Fishing Grid

> Rédigé le 2026-06-11. Durée : 2 semaines (cible 2026-06-16 → 2026-06-30).
> Contexte : `docs/concurrents/fishing-grid.md` (concurrent #3, 266 fiches espèces indexées, marées imprécises, scoring générique).
> Décisions John 2026-06-11 : **social 100% gratuit** (Bloc 0) · **vérif marées SHOM** (Bloc 4) · PWA reportée au sprint 11.
> Màj 2026-06-11 (soir), après crawl complet du site (cf `fishing-grid.md` §8) : **Bloc 4 passe en priorité 1 parallèle dès le jour 1** · Bloc 3 : leur tuto « bar du bord au printemps » devient la référence à battre · vidéos IA = piste acquisition César, hors scope dev.

**Préalable avant de démarrer** (manuel John) : merge `sprint-9.5-cleanup` → `main` + déploiement + QA Stripe LIVE (`docs/sprint-9/RECAP.md`). Le Bloc 0 part de `main` à jour.

---

## Objectif du sprint en une phrase

Sortir le moteur de contenu SEO (guides + programmatique + fiches espèces) en étant **plus profond que Fishing Grid sur nos 6 espèces**, et aligner le produit sur la décision « social gratuit ».

## Ordre d'exécution

| # | Bloc | Durée | Dépend de |
|---|---|---|---|
| 0 | Pivot social 100% gratuit | 1-2 j | merge 9.5 |
| 4 | Vérif marées SHOM (**jour 1, en parallèle du Bloc 0**) | 0,5 j | — |
| 1 | Setup MDX + guides | 2-3 j | — |
| 2 | Pages programmatiques | 2-3 j | Bloc 1 (composants partagés) |
| 3 | Fiches espèces profondes | 2 j | Bloc 1 |
| 5 | SEO global + Lighthouse + sitemap | 1 j | Blocs 1-3 |

---

## Bloc 0 — Pivot « social 100% gratuit »

Le fil, les likes, commentaires et follows deviennent gratuits pour tous les users authentifiés, sur **tous** les départements côtiers. Le payant ne porte plus que sur : carte précise/complète, scoring, filtres, offline, push, couches avancées, stats avancées, photos HD.

### Tâches

1. **Migration 022** (`supabase/migrations/022_social_free.sql`) :
   - Réécrire `can_post_in_department(uid, dept)` → `true` pour tout user authentifié si `dept` ∈ whitelist côtière (`lib/geo/departments.ts` reste la référence). Plus aucun check tier.
   - Vérifier les policies RLS `feed_posts` / `feed_comments` / `feed_likes` / `follows` : écriture = authentifié + ownership, plus de référence à `current_tier`.
   - Ne PAS toucher au RLS `spots` / `spot_scores` / vues `*_for_viewer` (le gating carte reste).
2. **Server Actions** : retirer les checks tier en écriture dans `app/actions/feed.ts` et `app/actions/follow.ts`. Garder zod + ownership.
3. **Rate-limit anti-spam** (la barrière payante saute, il faut un garde-fou) :
   - Max 10 posts / 24h et 50 commentaires / 24h par user. Implémentation simple : count en DB dans l'action avant insert (pas de Redis).
   - Message d'erreur FR clair : « Doucement moussaillon, reviens demain 🎣 » (ton maison, à ajuster).
4. **Front** : retirer CTA upgrade du composer + des cards fil ; stub publique `/fil` (teaser) mis à jour ; `/fil/[dept]` accessible à tous les connectés (plus de redirect tier).
5. **Page `/tarifs`** : Découverte gagne « Fil complet : poste, commente, like, suis » ; Local perd la ligne fil. Vérifier que la home ne promet plus « fil en écriture » comme feature payante.
6. **Tests** : adapter la suite (les tests tier-gating fil passent de « bloqué » à « autorisé » + nouveaux tests rate-limit). Cible : suite verte complète.
7. **Régénérer `lib/types.ts`** après migration 022.

### Critères d'acceptation Bloc 0
- User `discovery` poste/commente/like/follow sur n'importe quel dépt côtier.
- 11e post en 24h → erreur propre, pas de 500.
- Gating carte/scoring intact (régression interdite).
- `/tarifs` et home alignées, aucune mention « fil payant » résiduelle.

---

## Bloc 1 — Setup MDX + guides

1. Install `@next/mdx` + `next-mdx-remote` (ou `contentlayer2` si plus propre — trancher au moment du setup, pas de yak shaving).
2. `content/guides/*.mdx`, frontmatter : `title`, `slug`, `species`, `technique`, `department`, `excerpt`, `cover_image`, `author`, `published_at`, `updated_at`, `verified_at` (nouveau — pour les contenus réglementaires).
3. Composants MDX : `<SpotCard slug />`, `<TechniqueBadge type />`, `<TideExplainer />`, `<RegulationBox species />` (nouveau — encart maille/quota daté, réutilisé par le Bloc 3).
4. Routes : `app/(marketing)/guides/page.tsx` (index) + `app/(marketing)/guides/[slug]/page.tsx`. ISR `revalidate: 86400`.
5. Template + doc édition César : `content/guides/_TEMPLATE.mdx` + `docs/guides/COMMENT-ECRIRE.md`.
6. Migrer les 3 drafts existants (`docs/guides/*.md`) en MDX publiés.

**Contenu** : 5 guides minimum en ligne fin de sprint (les 3 drafts + 2 nouveaux de la liste des 20, priorité #5 « lire une courbe de marée » et #7 « meilleurs coefficients pour le bar » — les deux qui appuient notre différenciateur marées).

## Bloc 2 — Pages programmatiques

1. Route catch-all `app/(marketing)/peche/[...slug]/page.tsx` :
   - `/peche/bar/leurres` · `/peche/bar/leurres/finistere` · etc.
2. Whitelist combinatoire `lib/seo/programmatic.ts` (6 espèces × 25 dépts × 4 techniques, ~100 combos absurdes filtrés → ~500 pages).
3. Contenu par page (anti thin-content, min 400 mots uniques) : intro templatée variée + 3-5 spots populaires du dépt (RPC) + stats live (prises 30j) + guide lié + CTA « Logue ta prise ».
4. `generateStaticParams` paresseux + ISR 86400 (build < 4 min).

## Bloc 3 — Fiches espèces profondes (riposte directe)

6 fiches `/especes/[slug]` : `bar`, `dorade-royale`, `lieu-jaune`, `maquereau`, `sar`, `orphie`. Le stub `/especes` (sprint 7.5) devient le vrai index.

**Chaque fiche doit battre la fiche Fishing Grid équivalente.** Et pour le bar, la barre est plus haute : la référence à battre n'est pas leur fiche espèce mais leur tuto vedette [« Pêche du bar du bord au printemps : techniques, spots et réglementation 2026 »](https://fishing-grid.fr/tutorials/peche-bar-printemps-debut-saison-bord) (10 min, 1,6k vues, épinglé « à lire en premier ») — contenu réellement profond : cycle migratoire, conditions chiffrées (coef 70-95, temp eau, vent), spots par façade, réglementation 2026 par zone. Ses failles exploitables : réglementation **sans source ni date de vérif**, aucune donnée live, aucun maillage produit. Notre fiche bar + le guide #7 (coefficients) doivent le dépasser sur ces trois points.

Checklist comparative (à valider fiche par fiche) :

| Critère | Fishing Grid | Nous (minimum requis) |
|---|---|---|
| Maille légale | ✅ générique | ✅ par façade + source arrêté + date de vérif (`verified_at`) |
| Périodes | ✅ génériques | ✅ par façade Atlantique/Manche/Méditerranée |
| Techniques | ✅ liste | ✅ par saison + montages types du bord |
| Conditions | ❌ | ✅ marées favorables (coef, montante/descendante), postes selon vent/houle |
| Données live | ❌ | ✅ prises loguées 30j (anonymisées) + spots populaires (RPC) |
| Maillage interne | faible | ✅ liens guides + pages programmatiques + fiches spots |

- JSON-LD (`Article` + `BreadcrumbList`), OG dédiée par espèce.
- ⚠️ Réglementation : sourcer chaque maille/quota sur l'arrêté en vigueur (ex. bar : vérifier la réglementation 2026 par zone CIEM avant publication), encart « Vérifié le JJ/MM/2026 ». Une erreur de maille = risque légal + crédibilité morte.

## Bloc 4 — Vérification précision marées (étalon SHOM)

> **Priorité 1, jour 1, en parallèle du Bloc 0** (décision 2026-06-11 soir). Fishing Grid affiche sur sa propre home un témoignage « les horaires des marées ne sont pas exactes » : l'opportunité est documentée par eux-mêmes, et le résultat conditionne la copy de toutes les pages des Blocs 1-3.

1. `scripts/verify-tides.ts` : pour 5 ports — **Brest, Saint-Malo, Pornichet, Les Sables-d'Olonne, Arcachon** — comparer nos PM/BM dérivés d'Open-Meteo `sea_level_height_msl` aux horaires officiels SHOM (saisie manuelle des horaires SHOM dans un fixture JSON si pas d'API, 7 jours suffisent).
2. Sortie : écart en minutes par PM/BM, médiane + max par port → rapport `docs/sprint-10/tides-accuracy.md`.
3. Décision automatique documentée dans le rapport :
   - **Médiane < 15 min partout** → GO copy « horaires de marée vérifiés » (home + fiches spots) ; angle marketing direct vs Fishing Grid (épinglé à ~30 min d'écart à Pornichet dans ses propres avis).
   - **Sinon** → pas de comm', WorldTides passe prioritaire au sprint 11.

Pornichet est dans la liste exprès : c'est le port où Fishing Grid se fait critiquer. Si on y est précis, c'est un argument démontrable port par port.

## Bloc 5 — SEO global

- `app/sitemap.ts` : + ~500 routes programmatiques + guides + 6 fiches espèces.
- JSON-LD `Article` (guides), `HowTo` (guides « comment »), encart « Guides liés » sur `app/(marketing)/spots/[slug]/page.tsx`.
- Internal linking dense : guide ↔ fiche espèce ↔ pages programmatiques ↔ fiches spots.
- 1 h1/page, images `next/image` (`priority` sur la 1re), ping Google Search Console en fin de sprint.

---

## Hors code (en parallèle — César + Claude web)

- Production éditoriale : 2 nouveaux guides (cf Bloc 1) + relecture des 6 fiches espèces (César est le garant du ton pêcheur).
- **Vidéos IA courtes (idée reprise de Fishing Grid, côté growth uniquement)** : décliner les guides en vidéos 30-60 s pour TikTok/Insta (César, outils IA au choix). Leur format « tuto vidéo 1 min » est du volume SEO, pas une feature produit — on ne le copie pas dans l'app.
- Liste des 20 guides phares : inchangée, voir `docs/ROADMAP.md` § sprint 10.
- César : formation MDX/GitHub 30 min (doc `COMMENT-ECRIRE.md` comme support).

## Risques du sprint

| Risque | Mitigation |
|---|---|
| Thin content Google sur les pages programmatiques | 400+ mots uniques + données live |
| Erreur réglementaire fiches espèces | Sourçage arrêtés + `verified_at` + relecture John |
| Spam fil post-Bloc 0 | Rate-limit + alertes reports + modération Claude API si > 5 reports/jour |
| Le sprint déborde (5 blocs) | Ordre strict : Blocs 0 + 4 dès le jour 1 (produit + marées), puis 1→3 (SEO). Si débord : couper le Bloc 2 à ~200 pages (top dépts) et finir au sprint 11 |

## Critères de sortie du sprint

- Bloc 0 : social gratuit en prod, suite de tests verte, tarifs/home alignés
- ≥ 5 guides MDX en ligne (metadata + OG + JSON-LD)
- 6 fiches espèces en ligne, checklist comparative validée pour chacune
- ≥ 200 pages programmatiques accessibles (cible ~500)
- `docs/sprint-10/tides-accuracy.md` livré + décision WorldTides actée
- Sitemap soumis à Search Console
- Lighthouse SEO ≥ 95 sur 3 guides + 3 pages programmatiques + 2 fiches espèces tirés au sort
- `next build` < 4 min · lint/typecheck/tests verts · CI verte

## Ce qu'on ne fait PAS dans ce sprint

- ❌ PWA (sprint 11), WorldTides (sprint 11 si besoin), modération Claude API (si volume seulement)
- ❌ IA reconnaissance d'espèces (décision : pas en v1, cf analyse §6C)
- ❌ Gamification défis/badges (le signal social du sprint 8 suffit en v1)
- ❌ CMS pour César (MDX + GitHub, point final)
