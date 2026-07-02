# 🎯 Sprint 57 — « Performance & SEO » — RECAP

> **Statut : CODE-COMPLET. NON commité / NON poussé (feu vert John). 0 migration.**
> Exécuté le 2026-06-30 (ultracode). Base : `docs/sprint-57/BRIEF.md`, ancres revérifiées contre HEAD `7dd7ec0` (post sprint-56 ; le brief était ancré sur `aa4a28d`).
> Vérif : suite **611/611**, typecheck 0, lint 0, build OK, `lint-copy-dashes` propre.

---

## Décisions John (importantes — recadrage du périmètre)

- **WS-A (perf carte) = ON PASSE.** John mesurera Lighthouse lui-même. Rappel factuel : le **Sprint 36 « Carte instantanée »** a déjà ramené le TBT prod de 3920 → ~0 via le montage différé (`useDeferredMount`). Le brief (écrit avant, contre sprint-51) posait encore le TBT à ~3,9 s : **contradiction non tranchée faute de mesure** (chrome-devtools indisponible dans l'environnement). Je n'ai PAS touché à l'init carte.
- **WS-C `/spots` = Landing SEO** (sitemap + maillage), pas noindex.

**Donc le Sprint 57 livré = WS-C (SEO) uniquement.** WS-A et WS-B sont **différés** (voir plus bas).

## Ce qui a été fait (WS-C SEO)

| Item | Détail | Fichier |
|---|---|---|
| **Titres espèces < 65 car.** | Nom latin sorti du `<title>` (gardé en OG title, H1, JSON-LD headline). `baseTitle = « {label} : pêche du bord, saisons & taille légale »` ; suffixe « · Carnet de Pêche » seulement si `baseTitle.length ≤ 47` (sinon le titre seul, déjà < 65). Avant : ~88-91 car. → tronqué en SERP. | `app/(marketing)/especes/[slug]/page.tsx` |
| **Schema tarifs `AggregateOffer`** | Les 2 formules payantes en `AggregateOffer` (`lowPrice 4.90`, `highPrice 9.90`, `offerCount 2`, `priceCurrency EUR`, `priceValidUntil` ~1 an glissant, `availability InStock`). **Offre à 0 € (Découverte) retirée** (pas un SKU achetable → supprime le warning Rich Results). | `app/(marketing)/tarifs/page.tsx` |
| **`/spots` landing SEO** | **Sitemap** : une URL par **département** (`/spots?dept=CODE`) et par **espèce** (`/spots?species=KEY`) ayant ≥1 spot public (facette simple = contenu réel ; URLs alignées sur le canonical auto de `/spots`). PAS de produit croisé dept×espèce (pages trop minces — laissées atteignables mais non déclarées). **Maillage** : section « Explorer les spots » sur `/spots` (liens vers chaque landing dept + espèce, `aria-current` sur la facette active). | `app/sitemap.ts`, `app/(marketing)/spots/page.tsx` |
| **SearchAction** | **Différé** : aucun endpoint de recherche par query n'existe (SearchModal route seulement vers `/u/[username]`). Conforme au brief (« seulement si un endpoint existe »). | — |

## Différé (à valider/exécuter séparément)

- **WS-A — perf carte (TBT)** : différé sur décision John. À valider d'abord par une **mesure Lighthouse CI mobile** (`lighthouserc.mobile.json`) sur la prod actuelle (qui inclut déjà le defer S36). Si le TBT est réellement mauvais, le vrai fix sans coût UX = découper l'init MapLibre en tâches < 50 ms (`MapView.tsx`), pas le « hack timeout ».
- **WS-B — perf annexes** : différé. Le seul item **non-carte** à fort ROI = **PostHog en import dynamique gaté consentement** (ne plus charger ~50-60 KB de tracker pour la majorité qui n'accepte jamais ; gain sur TOUTES les pages + meilleure posture RGPD). NON fait ici car il touche le chemin consentement→opt-in (sensible) et le bénéfice n'est pas mesurable dans cet environnement. **Recommandé en suivi ciblé** (dis-moi si tu veux que je le fasse). Items carte (heatmap cold fetch, polices mono) = laissés avec WS-A.

## Migrations / types
**Aucune.** `lib/types.ts` inchangé.

## Vérification
- `pnpm typecheck` 0 · `pnpm lint` 0 · `pnpm test` **611/611** · `pnpm build` OK.
- `node scripts/lint-copy-dashes.mjs` : aucun tiret introduit (le « — » du `<title>` `/spots` et les kickers data sont des séparateurs tolérés pré-existants).
- Invariant GPS : `fetchSpotFacets` + sitemap ne lisent que `department`/`species`/`slug` (jamais `geom`).
- **Revue croisée indépendante = GO** (avec réserve mineure corrigée) : elle a calculé que la borne `≤ 47` donnait des titres à **exactement 65 car.** pour 11 espèces (le critère est « < 65 ») → corrigé en `≤ 46` (pire cas = 64 car.). AggregateOffer valide, alignement sitemap↔canonical exact, invariant GPS respecté, aucun noindex/tiret introduit.
- **Rattrapage S56** : la revue a relevé que `components/conditions/WeatherGrid.tsx` (changement S56 WS-E « chiffres météo secondaires en mono ») était **resté non commité** (oubli de staging au S56) → inclus dans le commit S57.

## Reste avant merge (John)
1. **Rich Results Test** sur `/tarifs` (AggregateOffer sans warning) + une fiche espèce (Article OK, titre < 65 car. en SERP).
2. **(Perf, séparé)** Lighthouse CI mobile `/carte` pour trancher WS-A ; greenlight éventuel du PostHog dynamique (WS-B).
3. **Commit + push** (push manuel, §13).
