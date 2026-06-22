# ⚡ Fluidité max / « 0 temps de chargement » — analyse & coût (web durci vs PWA vs natif)

> 2026-06-22. Question de John : *« quel serait le coût de passer le plus de choses possible en natif pour qu'il n'y ait 0 temps de chargement et que le site soit le plus fluide possible ? »*
> Basé sur une analyse de code + docs (architecture, PWA/SW, patterns de fetch, carte, roadmap mobile). Sourcé `fichier:ligne`.

## La réponse courte (à lire en premier)

**Le « 0 temps de chargement » est réaliste — mais ce n'est PAS une question de natif.** Le « 0 chargement perçu » s'achète avec **cache + prefetch + optimistic UI**, faisables aussi bien en **web** qu'en natif. Le **natif** (Expo/React Native) apporte autre chose : le **toucher** (scroll inertiel, transitions 60 fps garanties), le **push fiable** et la **présence App Store / Play Store**. Il ne faut pas le survendre comme « la » solution à la vitesse — parce que ce n'en est pas une, et il coûte **10 à 15× plus cher** que le durcissement web.

**Le meilleur euro investi : durcir la perf web (1–1,5 sprint, ~5–10 k€).** Ça profite immédiatement à la PWA **et** préfigure le natif (mêmes patterns réutilisés plus tard).

---

## Ce qui est déjà en place (bonne base)

- **Next.js 15 + React 19**, pages marketing/SEO en **ISR** (cache CDN Vercel, région `dub1` Irlande) : home `revalidate=3600`, fiches spots `1800`, espèces/guides `86400`. → ces pages sont **quasi instantanées**.
- **App shell client persistant** (`AppShell.tsx`) : naviguer entre `/carnet`·`/carte`·`/fil`·`/profil` via `<Link>` ne recharge pas le chrome, et Next **préfetche** ces liens en prod.
- **PWA installable** (sprint 11) : manifest `standalone`, service worker (cache app-shell + assets immuables), cycle de mise à jour propre.
- **Carte lazy** (`next/dynamic`, ssr:false) + skeleton + préchargement du chunk popup ; clustering au-delà de 200 spots.
- **Sentry** (perf) + **Lighthouse CI bloquant** (FCP<2s, LCP<2,5s, CLS<0,1) — mais **seulement sur 3 pages publiques**, pas la carte ni l'app connectée.
- **Optimistic UI partiel** déjà fait (like, commentaire, follow, post).

---

## Les 4 vrais postes de latence aujourd'hui

**① La carte (~1,5–3,5 s à froid sur mobile 4G)** — le plus visible. Cumul : 5 requêtes Supabase **séquentielles** au render (`carte/page.tsx` : auth→tier→profil→spots→scores) + download MapLibre (~400 KB) + init WebGL (~300–600 ms) + tuiles MapTiler. La carte restera ~1 s à froid quoi qu'on fasse (WebGL + tuiles) ; le cache aide surtout au **retour**.

**② Navigations dans l'app = round-trips serveur en cascade** — le plus pénalisant au quotidien. Toutes les pages app sont **`force-dynamic`** (carnet, fil, follows, u/[username], compte…) → **non cachées**. Pire, le **layout app fait 2 requêtes Supabase à CHAQUE navigation** (`(app)/layout.tsx:31-46` : getUser + subscriptions) **en plus** du middleware (getUser + select onboarded, `middleware.ts:39,68`). Soit **3–4 allers-retours Supabase incompressibles avant** que la page commence son propre fetch. C'est le « ça rame entre les onglets ». **200–600 ms** de latence à chaque tap.

**③ Aucun cache de données côté client** — pas de SWR/React Query. Revenir sur une page = **tout refetch** (rien n'est gardé en mémoire entre navigations).

**④ Images** — `next/image` n'est utilisé que dans 4 fichiers contre 5 en `<img>` brut → resize/format/lazy de Next sous-exploités (mineur ; le fil photo a déjà des ratios fixes anti-CLS).

---

## Le plan natif : où il en est

- **Pas démarré, et repoussé.** Conditionné à **⛳ Gate 1** (Go/No-Go post-beta, ~23/07/2026). Avant ça, le brief mobile est gelé.
- Le brief « sprints 12-13 mobile » est en cours de **renumérotation → 16-17** (le track Excellence 12-15 a été inséré devant). Concrètement le natif est à **~5–7 sprints / plusieurs mois**.
- **Partage de code** (décision déjà actée dans le brief) : on partage **DB/RLS + types + tokens design + constantes** (~30–40 %), on **réécrit toute l'UI + la carte + les Server Components** (~60–70 %). Pas de `react-native-web` : « tokens partagés, composants dupliqués ». C'est normal pour ce type d'app.

---

## Les 3 voies, chiffrées

> Hypothèse coût sous-traité : **TJM freelance senior Next/React FR ≈ 450–650 €/j**. « 1 sprint » = 2 semaines ≈ 10 j-dev. Fourchette basse = dev qui connaît la stack ; haute = imprévu inclus.

| Voie | Ce que ça donne sur le « 0 chargement » | Effort | Coût sous-traité | Le piège |
|---|---|---|---|---|
| **(a) Durcir la perf web** (prefetch, dégrouper les requêtes serveur, React Query + optimistic partout, SW qui cache data+tuiles, next/image, transitions) | **Le gros levier.** Attaque ② et ③ : navigations app **quasi instantanées**, retours **0 refetch**. C'est LÀ que se gagne le « 0 perçu ». | **1–1,5 sprint** | **~4 500 – 9 750 €** | Cache = risque de **données périmées** (discipline d'invalidation). Sortir du `force-dynamic` **sans jamais cacher au CDN une page qui dépend du tier/GPS** (sinon fuite cross-utilisateur — même rigueur que les audits GPS). |
| **(b) PWA renforcée** (offline **lecture** marées/carnet, install soignée, app-like) | Prolonge (a) : « ça marche sans réseau » sur ce qui a déjà été vu. | **+0,5–1 sprint** (le gros est dans (a)) | **~2 250 – 6 500 €** | L'offline **écriture** (loguer hors-réseau + sync) est **prévu en natif sprint 16** → le refaire ici = **travail jeté**. iOS bride les PWA (push/install/stockage) → ressenti « natif » plafonné sur iPhone. |
| **(c) Natif Expo / React Native** (vraie app iOS/Android) | **Seule** voie pour gestes natifs + push fiable + stores. **MAIS ne donne pas le « 0 chargement » tout seul** (il faut quand même cache+optimistic côté mobile). | **~8–10 sprints** (monorepo+auth = 2 sprints rien que pour démarrer, puis carte/carnet/offline/push/IAP) | **~30 000 – 80 000 €+** (4–8 mois) + comptes Apple (99 $/an) & Google Play (25 $) | Ne pas lancer **avant Gate 1** (la beta doit prouver la demande). **Maintenance doublée** ad vitam (UI dupliquée). Ne dispense **pas** de faire (a). |

---

## Recommandation de séquencement

1. **D'abord (a) — durcir la perf web.** Meilleure fluidité par euro de tout le plan. Priorité interne : **(1)** dégrouper/paralléliser les requêtes layout+middleware (gain direct sur chaque tap), **(2)** React Query + optimistic sur les écrans chauds, **(3)** SW qui cache tuiles + dernières données. Bonus : ces patterns **resservent** en natif plus tard.
2. **Ensuite (b) légère** — seulement l'**offline lecture** + l'affinage install. **Ne pas** investir dans l'offline-écriture ici (jetable). La PWA est un **pont assumé**, pas une destination.
3. **(c) Natif — après Gate 1 = Go**, et après le track Excellence (12-15). C'est déjà l'ordre de la roadmap. Le natif se justifie par le **toucher + les stores + le push**, pas par la vitesse (que (a) aura réglée).

**Le « 0 chargement » est-il atteignable ?** Oui, en **grande partie**, par (a) : navigations instantanées (cache + optimistic), retours sans refetch, prefetch. La **seule** latence qui résistera est le **premier** rendu de la carte (WebGL + tuiles, ~1 s) — incompressible web comme natif, atténuable seulement par precache au retour.

**En une phrase pour toi** : *le « 0 chargement » s'achète en ~1–1,5 sprint de perf web (~5–10 k€), ça booste tout de suite la PWA et prépare le natif ; le natif (30–80 k€, plusieurs mois) reste pertinent pour le toucher et les stores — mais après la beta, et sans le présenter comme la solution à la vitesse, parce que ce n'en est pas une.*

*Sources clés : `app/(app)/layout.tsx`, `middleware.ts`, `app/(map)/carte/page.tsx`, `components/map/MapShell.tsx`+`MapView.tsx`, `public/sw.js`, `next.config.ts`, `vercel.json`, `lighthouserc.json`, `docs/sprint-12-13/BRIEF.md`, `docs/excellence/ROADMAP.md`, `docs/ROADMAP.md` (Gate 1), `docs/sprint-11/`.*
