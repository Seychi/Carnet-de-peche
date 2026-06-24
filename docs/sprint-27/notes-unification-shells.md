# Note d'étude — Unifier les 3 shells ? (cadrage, décision reportée)

> Rédigé au sprint 27 (Bloc 3). **NE PAS exécuter ce sprint** — c'est un cadrage pour décider plus tard, à froid. Le sprint 27 se contente de poser des **ponts** entre shells (CTA home auth-aware, lien « Mon carnet » dans le header marketing/carte, entrées de nav croisées).

## État des lieux : 3 shells disjoints

| Shell | Layout | Header | Nav | Pour qui |
|---|---|---|---|---|
| **marketing** | `app/(marketing)/layout.tsx` | `components/layout/Header.tsx` (server, fetch user) | `Header` (liens publics) + `UserMenu` (avatar) + `MobileNav` | public + connecté de passage (`/`, `/tarifs`, `/especes`, `/guides`, `/techniques`, légal) |
| **app** | `app/(app)/layout.tsx` | `components/layout/AppHeader.tsx` (server) | `AppShell` → `AppSidebar` (desktop) + `TabBar`/`MoreMenu` (mobile) | connecté (`/home`, `/carnet`, `/fil`, `/follows`, `/sorties`, `/notifications`, `/profil`, `/compte`, `/moderation`) |
| **carte** | `app/(map)/layout.tsx` | `Header` (caché `md:` sur mobile) | `Header` + `MobileNav` | tous (`/carte`) |

Trois jeux de navigation, trois composants header, deux systèmes d'« avatar/menu » (`UserMenu` vs `AppHeader`+`TabBar`). Les espèces/guides/techniques vivent en `(marketing)` (SEO public, sans auth) alors qu'ils sont aussi des destinations « découvrir » pour un connecté → d'où les ruptures de shell.

## Option A — Garder 3 shells + ponts (statu quo, ce sprint)

**Bénéfices**
- **Zéro risque** : chaque shell garde ses contraintes (le `(marketing)` reste statique/ISR + SEO/canonical/JSON-LD intacts ; le `(app)` reste dynamique/auth-gated ; la carte garde son plein écran mobile).
- Découplage net public/privé : un bug de nav app ne touche pas le SEO.
- Coût marginal faible : les ponts (CTA auth-aware, lien « Mon carnet ») suffisent à supprimer les culs-de-sac ressentis.

**Coûts**
- Duplication des libellés/destinations dans plusieurs surfaces (`AppSidebar`, `UserMenu`, `MoreMenu`, `MobileNav`) → risque de dérive (une page reliée ici mais pas là). **Mitigation déjà posée au Bloc 4** : test de présence des liens = filet anti-régression.
- Transition visuelle entre shells (le chrome change quand on passe de `/carte` à `/home`).

## Option B — Un seul système de nav adaptatif

Un composant de nav unique (source unique des destinations) qui s'adapte au contexte : public vs connecté, et gabarit (sidebar ≥ 960 px / tab bar < 960 px), monté par un layout racine, les route-groups ne servant plus qu'au gating et au cache.

**Bénéfices**
- **Source unique des destinations** : fin de la duplication, une page reliée une fois est reliée partout. Aligne parfaitement le futur port **Expo** (un seul arbre de nav à porter).
- Continuité visuelle (plus de saut de chrome entre shells).

**Coûts / risques**
- **Risque SEO/perf élevé** : faire cohabiter pages statiques (marketing) et dynamiques (app) sous un même shell sans casser `revalidate`/canonical/JSON-LD est délicat (un composant qui lit la session trop haut rend tout dynamique). C'est exactement le piège évité au Bloc 3.
- Refactor transverse (3 layouts + 4 composants de nav + tests) → 1 sprint dédié, fenêtre de régression large (gating de tier, floutage GPS via la carte, safe-area mobile).
- Bénéfice surtout ressenti à l'échelle (beaucoup de surfaces) — aujourd'hui le périmètre est encore modeste.

## Recommandation (à valider par John, plus tard)

**Rester en Option A jusqu'au port mobile.** Les ponts du sprint 27 + le test de présence des liens (Bloc 4) couvrent le besoin réel (atteignabilité, zéro cul-de-sac) sans risque SEO/perf. **Rouvrir l'Option B au moment de cadrer Expo** : à ce moment, un arbre de nav unique et partagé web/natif devient un vrai gain structurel et justifie le refactor. Pré-requis avant de s'y lancer : extraire d'abord une **source unique de destinations** (un seul tableau `{label, href, icon, contexte, gabarit}`) que les surfaces actuelles consommeraient déjà — ça dé-risque la bascule et profite immédiatement à l'Option A.
