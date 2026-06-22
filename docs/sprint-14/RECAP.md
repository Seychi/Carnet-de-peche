# Sprint 14 — RECAP : Effet 10 000 € (home + design)

> Branche `sprint-14-home` (part de `main` = sprints 12/12.5/13 mergés). **Pas mergé / pas poussé** (brief : « Ne push pas »). **Aucune migration** (sprint pur frontend).

## Objectif
La home ne contient plus aucun faux « Exemple » ; elle montre du vrai produit, s'anime au scroll avec finesse, hiérarchie typo nette + états de chargement → score perçu visé ≥ 8/10.

## ⚠️ Le brief était partiellement faux (vérifié contre le vrai code)
- **Bloc C déjà fait à 80 %** : `globals.css` a DÉJÀ l'échelle typo `h1/h2/h3` (clamps, l.289-291) ET un ring `:focus-visible` global (l.298-302). Pas de « h2 sans taille » ni de « focus manquant ». → C réduit à un polish mineur (Bathy scoring 0.35 → 0.45).
- **Bloc E /techniques déjà `noindex`** avec teaser. → restait : retirer `/techniques` du sitemap (incohérent avec noindex) + unifier le CTA + bandes CTA.
- **Bloc A « fetch posts réels via `feed_posts_for_viewer` en anon » impossible** : cette vue est gatée `WHERE auth.uid() IS NOT NULL` (migration 035) → anon n'obtient rien. + garde-fou consentement du brief + quasi aucun post-photo réel encore. → **décision** : pas de publication de posts d'utilisateurs réels sur la home publique ; à la place, **vrai compte de spots** + fil **illustratif anonymisé** (départements, pas d'identités inventées, pas de GPS).

## Fait

### Bloc A — plus aucun faux exemple
- `ExampleBadge` supprimé (6 usages) ; faux noms (Yann Le Bras / Sophie Marec / Loïc Briand) supprimés → fil illustratif anonymisé par département (« Un pêcheur du Finistère · 29 », etc.), sans GPS ni identité inventée.
- Faux « 3 SPOTS ACTIFS » → **vrai compte de spots publics** (`lib/marketing/home-stats.ts`, client anon sans cookies, `unstable_cache` 1 h) injecté dans le hero (stat + compteur animé) et la section carte.
- Aperçus produit (tide/score, carnet, marées Brest) conservés mais **étiquetés en prose** (« Aperçu · patterns calculés… ») — plus aucun badge « fake ».
- Vérif : grep `Exemple` dans `app/(marketing)/**` = **0** ; faux noms = 0 dans le code (restent seulement dans docs/audits).

### Bloc B — micro-animations
- `ScrollReveal` (IntersectionObserver, fade + slide-up) sur les sections sous le pli. **SSR rend le contenu visible** (SEO/no-JS safe) ; **respecte `prefers-reduced-motion`** (rien ne s'anime, tout reste visible) ; transform/opacity only.
- `AnimatedCounter` (count-up) sur les stats du hero — **valeur réelle rendue en SSR** (pas de « 0 » figé sans JS), démarre à 0 et compte au montage/scroll, désactivé en reduced-motion.
- Header : ombre + blur renforcés au scroll via `HeaderShell` (client wrapper ; le Header reste Server Component, hauteur 68px inchangée → pas de CLS).
- Hover « lift » sur les cartes tarifs + cartes home (« Pourquoi maintenant », teaser pricing) — `motion-reduce` neutralise.

### Bloc C — polish DA v2 (mineur)
- Bathy section scoring 0.35 → 0.45 (plus identitaire). Focus rings + échelle typo : déjà présents (globals.css), non régressés.

### Bloc D — états de chargement
- `app/(marketing)/guides/loading.tsx` : skeleton de la liste guides (page async). Images guides en `loading="lazy"` (dimensions/`sizes`/`aspect-[16/9]` déjà là → pas de CLS). Pas de `placeholder=blur` (covers = mix local + Unsplash distant sans blurDataURL → casserait le build). `/especes` et `/techniques` 100 % statiques → pas de skeleton (documenté).

### Bloc E — CTA & copy
- Libellé d'inscription unifié : **« Créer mon carnet — gratuit »** (hero, carnet, scoring, pricing teaser). Plus de « Voir un carnet exemple » / « Commencer à loguer ».
- `components/marketing/MarketingCTA.tsx` (bande navy + Bathy, bouton **teal** cohérent avec l'action primaire du site) ajouté avant le footer sur `/guides`, `/especes`, `/techniques`.
- `/techniques` retiré du `sitemap.ts` (déjà noindex).

## VERIF
- `pnpm typecheck` ✓ · `pnpm test` **327/327** ✓ · `pnpm lint` **0 warning/erreur** ✓ · `pnpm build` ✓.
- Revue adversariale (Workflow 3 lentilles : SEO/rendu, a11y/reduced-motion, correction/CLS/copy) — voir section ci-dessous.

## Comment tester (manuel)
1. `/` : scrolle → les sections apparaissent en fondu ; les stats comptent. Active « réduire les animations » (OS) → tout est visible d'emblée, zéro animation.
2. Header : gagne une ombre/flou après ~10px de scroll.
3. Survole les cartes tarifs / cartes home → léger lift.
4. grep « Exemple » dans le rendu de `/` → 0 badge ; aucun faux nom.
5. Le hero affiche le **vrai** nombre de spots (compte en base) ; fallback « Bretagne » si la base est injoignable.
6. `/guides`, `/especes`, `/techniques` : bande CTA « Créer mon carnet — gratuit » avant le footer.

## Reste manuel John
- **Arbitrage visuel du « waouh »** (subjectif — le brief le dit) : valider le rendu, la couleur du CTA MarketingCTA (teal retenu vs gold proposé par l'agent), l'intensité des animations.
- Fournir d'éventuelles vraies captures produit HD si tu veux remplacer les aperçus SVG par des screenshots réels.
- Si tu veux des **posts réels** en home : décider du consentement (n'exposer que du contenu explicitement public/consenti) — je rebrancherai un fetch dédié.
- Merge `sprint-14-home` → `main` + déploiement.
