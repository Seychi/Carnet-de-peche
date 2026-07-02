# Sprint 18 — Brief d'exécution
## Remédiation audit mobile S16/S17 (P0 · P1 · P2)

> Rédigé le 2026-06-22. Durée cible : **3-4 jours**.
> Contexte : `docs/audits/AUDIT-MOBILE-S16-S17-2026-06-22.md` (audit live mobile post-déploiement, verdict 8,5/10, 0 P0 fonctionnel mais 1 risque à élever, 2 P1, des P2). Protocole : `docs/audits/PROTOCOLE-AUDIT-MOBILE-CHROME-S16-S17.md`.
> Décisions John 2026-06-22 : modèle social = **« abonnés »** (unidirectionnel) ; audit déroulé sur prod avec comptes A (@Seychi, itinerant, modérateur) + B (@test_lambda, gratuit).

**Préalable avant de démarrer** (manuel John) :
1. Sprints 16 + 17 mergés/déployés (fait — audit live OK). Repo stable, suite verte.
2. **Décision produit attendue (Bloc P0)** : rayon de flou cible des spots. Défaut tranché = **restaurer ~1 km** (cf. ci-dessous). Si tu veux une autre valeur, dis-la avant — la copy devra correspondre.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/sprint-18/BRIEF.md`. Lance les workstreams **A (P0), B (P1), C (P2) en parallèle dès maintenant**, respecte les dépendances du tableau, termine par le workstream **VERIF** avant de me rendre la main. **Câblé connecteurs (CLAUDE.md §20)** : tout ce qui touche la base (flou GPS, migration) passe par **supabase-guard** en lecture d'abord (lire `blur_spot_geom` + `spots_for_viewer` + les RPC spots AVANT de toucher, migration en fichier numéroté, regen `lib/types.ts`, `get_advisors` à la fin) ; QA réelle via **qa-chrome** (390/360 px + device) ; **deploy-watch** après déploiement. **Effort maximal, très attentif et critique** : mesure avant/après le flou (requête SQL), **ne JAMAIS exposer `geom` précis** à anon/authenticated, passe adversariale (gating tier, RLS, floutage). Ne push pas. `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

## ⚙️ Environnement & posture (transverse — §19)

**Docker dispo** (optionnel — utile pour jouer la migration flou en local d'abord et re-mesurer avant la prod). **Effort max + esprit critique** : le brief est un guide ; vérifie chaque hypothèse contre le vrai code/schéma, **mesure** le flou réel avant ET après, remets en cause le brief s'il se trompe.

## 🧠 Connecteurs & sous-agents (usage systématique — cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| **P0** (flou GPS, migration, re-mesure) | **supabase-guard** → Supabase (RO) | Lire `blur_spot_geom`/`spot_visible_geom`/`spots_for_viewer` + savoir si `geom_public` est stocké (trigger) ou calculé au read AVANT de coder ; migration = **fichier numéroté** ; regen `lib/types.ts` ; `get_advisors`. **Aucune fuite de `geom`.** |
| Avant de toucher MapLibre / styles carte (si P0 impacte le rendu markers) | **docs-researcher** → Context7 | API version-correcte. |
| **P1 / P2** (header, tarifs, bandeau, onglets) | **qa-chrome** → Claude in Chrome | Vérifier contraste + 390/360 px en live (captures). |
| Après déploiement | **deploy-watch** → Vercel + Sentry | Zéro régression runtime. |
| Clôture | **`/verif-sprint`** | Tests + build + lint + types + revue indépendante + anti-régression. |

## Objectif du sprint en une phrase

Le flou GPS protège réellement les spots (et la copy ne ment plus), le header « Nouvelle prise » est lisible, aucun tarif ne vend une feature absente, et le bandeau/onglets tiennent à 360 px — le tout sans aucune régression de gating, RLS ou floutage.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallélisable J1 |
|----|------|-------|-----------|----------------------|
| A | **P0** — Flou GPS réel vs « 1 km » | 1-1,5 j | lecture supabase-guard | ✅ |
| B | **P1** — Header « Nouvelle prise » + copy tarifs | 0,5 j | — | ✅ |
| C | **P2** — Bandeau instruments + onglets fil 360 px | 0,5-1 j | — | ✅ |
| VERIF | revue finale + re-mesure flou + device | 0,5 j | tous | ❌ (dernier) |

---

## Bloc P0 — Flou GPS réel vs promesse « 1 km » 🔴

**Le finding le plus sérieux de l'audit** (pré-existant, pas causé par S16/S17, mais à traiter **avant toute pub LIVE**). Mesuré sur les 109 spots : offset `geom` ↔ `geom_public` = **min 4 m / moyenne 199 m / max 401 m** (100 % < 500 m, 84/109 < 300 m). Or `/tarifs` annonce **« coords floutées 1 km »** et CLAUDE.md §8 parle de **rayon 1 km**. Conséquence : un compte gratuit localise un spot à ~200 m près → le **moat GPS** et le **paywall freemium** sont vidés de leur sens, et la promesse est **fausse**. Bon point confirmé à NE PAS casser : `anon` et `authenticated` ne peuvent **pas** lire `spots.geom` (verrou colonne 028b) — ça doit le rester.

> **Connecteurs** : **supabase-guard** d'abord, en lecture — déterminer (1) la définition de `blur_spot_geom` (ou équivalent, migration 028), (2) si `geom_public` est une **colonne stockée** alimentée par trigger **ou** calculée au read dans `spot_visible_geom`/`spots_for_viewer`/les RPC, (3) le vrai prochain numéro de migration (`list_migrations` — l'historique a des trous, ne pas supposer « 039 »). **Ne pas se fier au brief : lire le vrai code.**

### Tâches
1. **Diagnostiquer** (supabase-guard, lecture) : pourquoi l'offset est ~200 m et non ~1 km. Identifier le rayon de jitter réel dans la fonction de floutage et où il s'applique (trigger d'insert vs calcul au read).
2. **Trancher le rayon cible** = **~1 km** (défaut, restaure l'intention + protège le moat + rend la copy vraie). *(Si John préfère une autre valeur, l'appliquer + aligner la copy.)*
3. **Migration numérotée** (numéro confirmé par supabase-guard) : corriger la fonction de floutage pour un offset cible ~1 km (jitter dans un disque de rayon ~1 km, recentré comme aujourd'hui), **puis recalculer `geom_public` pour les 109 spots existants** (UPDATE de backfill). RLS/grants inchangés : `geom_public` reste lisible par `anon`, `geom` reste **interdit** à `anon`/`authenticated`.
4. **Re-mesurer** (même requête que l'audit) : offset moyen et max après migration. Consigner avant/après dans le RECAP.
5. **Aligner la copy** si nécessaire : `/tarifs` (`app/(marketing)/tarifs/pricing-cards.tsx`), home, et CLAUDE.md §8 doivent décrire le rayon réellement appliqué. Si cible = 1 km, « floutées 1 km » redevient vrai (rien à changer côté copy, juste vérifier).
6. Regénérer `lib/types.ts` si la migration change une signature.

### Critères d'acceptation
- Requête SQL post-migration : offset `geom`↔`geom_public` **moyen ≥ ~800 m** et **max cohérent avec le rayon cible** sur les 109 spots (preuve chiffrée jointe).
- `has_column_privilege('anon','public.spots','geom','SELECT')` = **false** ET `has_column_privilege('authenticated',…,'geom',…)` = **false** (inchangé) ; `geom_public` lisible par `anon` = true.
- La carte gratuite (compte B) affiche toujours des markers floutés cohérents (pas de spot disparu, pas de marker sur la position précise) — vérif **qa-chrome**.
- La copy « floutées 1 km » (ou la valeur retenue) **correspond** au rayon réellement appliqué.
- Aucune régression gating : `get_spots_for_map`/RPC spots gardent leur gating de tier (migration 029).

### Garde-fous
- ⚠️ **DEMANDER À JOHN AVANT** uniquement si le rayon cible doit différer de ~1 km, ou si corriger le flou casse la lisibilité de la carte gratuite (trop de spots au même endroit).
- Ne JAMAIS exposer `geom` précis (ni via colonne, ni via vue, ni via RPC anon). Re-tester après la migration.
- Migration = **nouveau fichier numéroté**, jamais éditer un ancien. Appliquer en prod **avant** de promouvoir tout code dépendant (rappel incident 2026-06-13).

---

## Bloc P1 — Header illisible + tarif mensonger 🟠 (avant pub)

Deux corrections rapides mais nécessaires avant communication publique.

> **Connecteurs** : **qa-chrome** pour confirmer le contraste du header en live + relire les 3 emplacements de la copy tarifs.

### Tâches
1. **Header « Nouvelle prise »** (`components/catches/CatchForm.tsx`, header de la modale `/carnet/nouvelle`) : le titre est rendu en `rgb(10,47,61)` (navy-900) sur fond `rgb(4,20,28)` (navy-950) → contraste ~1,3:1, illisible. Passer le **titre** en texte clair (teal-300 ou blanc, comme le ✕ qui est déjà correct). Vérifier le même header sur tous les viewports.
2. **Tarifs — « Notifications créneaux optimaux »** (plan Local, `app/(marketing)/tarifs/pricing-cards.tsx`, + vérifier home) : le sprint 17 n'a livré que les **notifs sociales in-app** (like/commentaire/follow). Les alertes « créneau optimal » (solunar) **n'existent pas**. → **Retirer ou requalifier** le bullet (ex. « Notifications (likes, commentaires, follows) » si on veut garder une ligne notif honnête), tant que les alertes créneaux ne sont pas implémentées.

### Critères d'acceptation
- `/carnet/nouvelle` : le titre « Nouvelle prise » a un **contraste ≥ 4,5:1** sur son fond (mesure qa-chrome / valeur de couleur).
- `/tarifs` : **aucune ligne** ne promet des notifications de créneau/push non livrées ; toute mention « notifications » correspond à une capacité réelle.
- Pas de régression de mise en page du header ni des cartes tarifs (390 px).

### Garde-fous
- Ne pas re-toucher aux autres bullets tarifs déjà assainis au S17 (offline, bathy EMODnet, itinéraire, stats) — ils sont OK.

---

## Bloc P2 — Bandeau & onglets à 360 px + polish 🟡 (à confirmer device)

Points non concluants depuis la machine d'audit (fenêtre Chrome plancher 500 px). À vérifier puis corriger si besoin.

> **Connecteurs** : **qa-chrome** — réduire le viewport à **360 px** (device émulé ou vrai téléphone) et capturer.

### Tâches
1. **Bandeau instruments** (`components/layout/AppInstruments.tsx` / `components/ui-v2/instruments-bar.tsx`) : à 360 px le contenu (~485 px) déborde. Ajouter un **fondu dégradé** au bord droit (affordance de scroll horizontal) **ou** condenser/prioriser les items. Vérifier que le dernier item (« ▶ créneau ») n'est plus coupé sans indice.
2. **Onglets du fil** (`components/feed/FeedTabs.tsx`) : à ≤ 360 px les 3 onglets (~453 px) débordent. Rendre la barre **scrollable horizontalement avec fondu** **ou** raccourcir « Tous les départements côtiers » → « Toute la côte ».
3. *(Optionnel, si temps)* Mockups home illustratifs : laisser tel quel (cosmétique, hors périmètre) — noter seulement.

### Critères d'acceptation
- À **360 px** : bandeau instruments avec fondu/scroll visible (aucun item coupé net sans affordance) — capture qa-chrome.
- À **360 px** : les 3 onglets du fil tiennent (scroll + fondu) ou sont raccourcis — capture qa-chrome.
- `prefers-reduced-motion: reduce` toujours respecté.

### Garde-fous
- Ne pas casser le rendu desktop/≥ 500 px (déjà OK).

---

## Workstream VERIF (obligatoire, agent indépendant)

1. Lance **`/verif-sprint`** : `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm lint` verts + revue croisée indépendante du diff contre ce brief + passe anti-régression.
2. **Re-mesure flou GPS** (SQL) : offset moyen/max post-migration conforme à la cible ; `anon`/`authenticated` ne lisent toujours pas `geom`.
3. **supabase-guard `get_advisors`** (security + perf) : aucune nouvelle alerte ; RLS intactes ; gating spots (RPC) non régressé.
4. **qa-chrome** : header « Nouvelle prise » lisible ; tarifs sans promesse mensongère ; bandeau + onglets OK à 360 px ; carte gratuite toujours floutée correctement.
5. Passe copy : tutoiement, zéro promesse produit mensongère, FR correct.
6. Livrer `docs/sprint-18/RECAP.md` : fait / comment tester / **tableau flou avant→après** / reste manuel John.

## Reste manuel John (post-sprint)
- Appliquer la migration flou en **prod** (CLI/Studio) **avant** de promouvoir le code ; régénérer `lib/types.ts`.
- Valider sur ton téléphone : header lisible, bandeau/onglets à 360 px, carte gratuite floutée crédible.
- Merge → `main` + déploiement, puis **deploy-watch**.
- Nettoyage données de test de l'audit (au choix) : follow B→A + sa notif ; post `[test]` de B ; les 2 signalements de @Seychi12.
