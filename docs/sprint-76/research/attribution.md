# Sprint 76, Bloc 7 — Pourquoi l'attribution est cassée

> Rédigé le 2026-08-14. Livrable préalable exigé par le brief : **aucun code avant ce document.**
> Auteur : Claude Code, session sprint 76.

## Ce qu'on cherche à expliquer

| Symptôme | Valeur (relevé John, 06 au 12/08) |
|---|---|
| Clics Google (GSC) | 691 |
| Pages vues attribuées « Organic Search » (PostHog) | 293 |
| Pages vues classées « Referral » avec référent `www.carnet-de-peche.com` | 461 (**53 % du trafic**, 42 % des `$pageview`) |
| Visiteurs de fiches de spots ayant vu un mur | 65 sur 156 (**42 %**) |

Côté Google, **un seul hôte est indexé** (`www`, https) : le problème est de mesure, pas de SEO.

## Méthode et limites, dites d'emblée

Je n'ai **pas** de connecteur PostHog dans cette session : les chiffres ci-dessus sont ceux relevés par John le 13/08, repris comme donnée d'entrée, **je ne les ai pas re-mesurés**. Ce document apporte donc une **preuve de code** (chemins morts et ordre d'exécution), pas une preuve HogQL. Ce qui est démontré est marqué **PROUVÉ**, ce qui reste à confirmer par John est marqué **À CONFIRMER**.

## Cause n° 1 (PROUVÉE) : la page où le visiteur accepte le bandeau n'est jamais comptée

Le chaînage actuel, tel qu'il est écrit :

1. `components/analytics/PostHogProvider.tsx` initialise PostHog avec `opt_out_capturing_by_default: true` et `capture_pageview: false`. Rien n'est capturé tant que le visiteur n'a pas accepté.
2. Les `$pageview` sont émis à la main par `PageViewTracker`, dans un `useEffect` dont les dépendances sont `[pathname, searchParams]`.
3. `components/consent/CookieBanner.tsx`, sur « Accepter », appelle `writeConsent('granted')` puis `posthog.opt_in_capturing()`. **Et rien d'autre.**

Conséquence mécanique : au moment du clic sur « Accepter », l'effet de `PageViewTracker` pour la page courante **a déjà tourné**, en pure perte (capture opt-out). Ses dépendances ne changent pas du fait du consentement, donc **il ne se rejoue pas**. La page sur laquelle le visiteur consent n'émet **jamais** de `$pageview`.

Or c'est précisément la page d'entrée, celle qui porte le `document.referrer` de Google. Le premier `$pageview` réellement enregistré est celui de la page **suivante**.

> PostHog documente ce piège mot pour mot, dans ses propres *health checks* :
> « Example of an implementation that stops capturing data by default, **which may lead to missing events if cookie preferences are not handled correctly** », avec en exemple exactement notre couple `opt_out_capturing_by_default: true` + `opt_in_capturing()` sur consentement.
> Source : `posthog.com/handbook/cs-and-onboarding/health-checks` (via Context7, consulté le 2026-08-14).

## Cause n° 2 (PROUVÉE) : le premier `$pageview` est perdu même pour un visiteur déjà consentant

React exécute les effets **des enfants avant ceux du parent**. Dans `PostHogProvider` :

```tsx
export function PostHogProvider({ children }) {
  useEffect(() => { posthog.init(key, { ... }) }, [])   // ← effet du PARENT
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />   {/* ← enfant : son effet part AVANT celui du parent */}
      {children}
    </PHProvider>
  )
}

function PageViewTracker() {
  useEffect(() => {
    if (!posthog.__loaded) return      // ← faux au premier montage : on sort
    posthog.capture('$pageview', ...)
  }, [pathname, searchParams])
}
```

Au tout premier rendu client, `PageViewTracker` teste `posthog.__loaded` **avant** que `posthog.init()` du parent n'ait tourné. La garde renvoie, et l'event est perdu **silencieusement**. Ses dépendances ne bougeant plus, il ne se rejoue pas.

Autrement dit : **le premier `$pageview` de chaque chargement de page complet est perdu, y compris pour un visiteur revenant qui a déjà consenti lors d'une visite précédente.** C'est le même symptôme que la cause n° 1, par un mécanisme différent, et il frappe une population différente.

Le même mécanisme explique une partie de l'écart **156 → 65** sur les murs : `SignupWall` émet `signup_wall_viewed` dans un effet de montage, lui aussi enfant du provider, lui aussi gardé par `posthog.__loaded` (via `capture()` dans `lib/analytics.ts`). Un mur affiché sur la page d'entrée n'est pas compté, alors que la page, elle, finit par l'être si le visiteur navigue.

> ⚠️ Cette cause n° 2 invalide au passage le diagnostic du Bloc 2 du brief, qui attribuait l'écart 156 → 65 au rendu du mur dans la branche `!spot.is_precise`. Vérification faite en base : `get_spot_by_slug` calcule `is_precise` à partir de `current_tier(auth.uid())`, qui vaut `discovery` pour un anonyme. **`is_precise` est donc toujours faux pour un visiteur anonyme, et cette branche ne lui a jamais retiré le mur.**

## Cause n° 3 (À CONFIRMER) : les vraies navigations en rechargement complet

`document.referrer` ne change pas lors d'une navigation client (`<Link>`), donc une navigation interne ne suffit pas à produire un référent interne. En revanche, un **rechargement complet** depuis une page du site en produit un. Il en reste au moins un dans le produit : le formulaire de filtres de `/spots` est un `<form method="GET">`, donc une navigation navigateur pleine et entière.

Combiné aux causes 1 et 2 (le `$pageview` d'entrée, celui qui porte Google, est perdu), il ne reste dans les données que des pageviews de second rang, dont une part porte un référent interne. **C'est cohérent avec les 42 % observés, mais je ne peux pas en établir la part exacte sans accès à PostHog.**

## Pistes écartées

- **Apex vs www.** Un seul hôte est indexé côté Google, et les 43 vues sur `carnet-de-peche.com` sont trop peu pour expliquer 461 vues en auto-référencement. La redirection 301 reste à poser (dashboard Vercel, cf « Reste manuel John »), mais **ce n'est pas la cause**.
- **Navigation client non capturée.** `PageViewTracker` dépend bien de `[pathname, searchParams]` : les navigations client SONT capturées, une fois PostHog chargé. Ce n'est pas la cause.
- **Double `$pageview` sur changement de `searchParams`.** Vérifié : l'effet ne se déclenche qu'au changement réel de `pathname` ou de l'objet `searchParams`. Il n'y a **pas** de double comptage à corriger, et le dénominateur des taux du Bloc 8 n'est pas gonflé de ce côté. Le vrai biais est inverse : on **sous**-compte.

## Correctif retenu

Le gate de consentement **ne bouge pas** : `opt_out_capturing_by_default: true` reste, rien n'est émis avant le clic.

1. **Mémoriser l'attribution d'entrée sans rien émettre** (`lib/analytics/attribution.ts`) : au tout premier chargement, on range `document.referrer` et les paramètres `utm_*` dans `sessionStorage`. Aucune requête réseau, aucun cookie tiers, aucune donnée personnelle.
2. **Émettre le `$pageview` manquant au moment du consentement** : `CookieBanner.accept()` appelle `opt_in_capturing()` puis capture explicitement la page courante, avec les propriétés d'entrée mémorisées. C'est l'event que le produit perdait.
3. **Initialiser PostHog pendant le rendu du provider, plus dans son effet**, pour que l'init précède les effets des enfants et que le premier `$pageview` d'un visiteur déjà consentant ne soit plus perdu. L'appel reste idempotent (`posthog.__loaded`) et no-op sans clé.
4. **Attacher les propriétés d'entrée au premier `$pageview` capturé** de la session, pour que la source soit Google et non la page interne d'où l'on vient.

### Ce que ce correctif ne fait PAS

- Il **ne change pas** le moment où `posthog.init()` est appelé par rapport au consentement : init avait déjà lieu au chargement de page, il a toujours lieu au chargement de page. Le correctif déplace l'appel d'un `useEffect` vers le rendu, ce qui reste **le même tick de chargement**. **Il n'améliore ni n'aggrave** la question « est-ce que `init()` lui-même parle au réseau avant consentement ».
- ⚠️ **À vérifier par John dans l'onglet Réseau** (critère non négociable du brief, que je ne peux pas trancher sans navigateur) : qu'aucune requête vers `eu.i.posthog.com` ne parte avant l'acceptation du bandeau. Si `init()` déclenche un appel de configuration distante, **c'est un défaut PRÉEXISTANT** au sprint 76, à traiter par `advanced_disable_decide` / équivalent, et il faudra rouvrir le sujet.

## Ce qu'on devrait voir après déploiement

- La part de `$referring_domain = 'www.carnet-de-peche.com'` sur les `$pageview` s'effondre (cible : sous 5 %, contre 42 %).
- La part « Organic Search » remonte à due concurrence.
- Le nombre de `signup_wall_viewed` par visiteur de fiche de spot se rapproche de 1 (cible : plus de 90 %, contre 42 %).
- L'écart avec GSC **ne se refermera jamais complètement** : les visiteurs qui refusent le bandeau ne seront jamais comptés. C'est le prix assumé du RGPD, documenté dans `METRIQUES.md`.
