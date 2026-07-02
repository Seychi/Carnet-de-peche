# 🗺️ Roadmap — Refonte de la page d'accueil (v2/v3 premium → production)

> Objet : porter le prototype premium (`docs/maquette-v3/accueil-premium-v3.html`, dernière version ; v1/v2 = historique) en **vraie page Next.js** `app/(marketing)/page.tsx`, au niveau « 1M€ », perf/a11y/SEO/mobile inclus.
> Place dans la roadmap globale : c'est la **Phase 3** de `docs/ROADMAP-PRE-REFONTE-2026-06-25.md`. Deviendra un BRIEF de sprint (format `docs/BRIEF-TEMPLATE.md`) au moment de la planifier.

---

## 0. Préalable verrouillé (ne PAS démarrer avant)

La home **amplifie le funnel** → elle ne doit pas re-vendre des promesses fausses. **Phase 0 (`docs/sprint-31/BRIEF.md`) doit être verte**, en particulier :
- **F2** (honnêteté perso) : la home reprend l'instrument hero avec badge **« Exemple »** tant que le score perso prédictif n'est pas livré.
- **F3** (26 espèces loguables) : la home affiche « 26 espèces » → ça doit être vrai côté carnet.
- **F1** (parcours gratuit vérifié) : on sait ce que voit un nouvel inscrit gratuit.

---

## 1. Décisions — VERROUILLÉES (John 2026-06-25)

- **Tout en réel** : données live, **vraie carte MapLibre**, vraies marées dans le hero, vrais tarifs — la home montre ce que le site propose vraiment (fini les mocks « Exemple »).
- **Motion = la plus avancée** : **GSAP + ScrollTrigger + Lenis** (smooth scroll), hero haut de gamme (option **WebGL** à confirmer).
- **Chantier long assumé** : priorité au meilleur rendu, pas à la vitesse de livraison.

Reste ouvert (tranché dans le brief) : hero **WebGL** oui/non, **A/B test vs swap**, gestion du **réservoir mince**.

→ Exécution détaillée : **`docs/sprint-34/BRIEF.md`**.

---

## 2. Workstreams

| WS | Objet | Effort | Dépend de |
|----|-------|--------|-----------|
| 1 | Architecture & composants | M | décision motion |
| 2 | Hero (instrument + entrée animée) | M | WS-1 |
| 3 | Sections (moat, carte, communauté, prix, FAQ, CTA) | L | WS-1 |
| 4 | Système de motion (reveals, parallax, magnetic, glow) | M | WS-1 |
| 5 | Mobile & responsive | M | WS-2/3 |
| 6 | SEO / meta / analytics | S | WS-3 |
| VERIF | perf + a11y + QA visuelle | M | tous |

### WS-1 — Architecture & composants
Découper le proto en composants sous `components/marketing/home/` : `Hero`, `TrustStrip`, `MoatSection`, `MapShowcase`, `CommunitySection`, `PricingPremium`, `Faq`, `FinalCta`. Réutiliser les tokens DA (`app/globals.css` @theme) et les composants signature existants (`components/ui-v2/` : TideSparkline, ScoreRing, TagData…) plutôt que de redessiner. Server Components par défaut ; `'use client'` seulement pour les blocs animés.

### WS-2 — Hero
Porter l'instrument (courbe de marée, anneau de score, tags mono), l'entrée orchestrée (montée + blur en cascade), le halo curseur + parallax (desktop), les CTA magnétiques. **Badge perso = « Exemple »** (F2). Budget **LCP** : le hero ne doit pas dépendre d'un gros JS — le texte + l'instrument rendent en SSR, les effets s'ajoutent après hydratation.

### WS-3 — Sections
- **Moat** : exemple de tendances **étiqueté « Exemple »**.
- **Carte (02)** : selon décision §1.3 (mock vs MapLibre).
- **Communauté (03)** : cartes + marquee d'espèces (réelles, 26).
- **Prix (04)** : tirer les **vrais tiers/prix** de la source Stripe/config, CTA branchés (`/auth/register?plan=…`, contexte essai).
- **FAQ** : `<details>` accessibles + **JSON-LD FAQPage**.
- **CTA final** + footer (réutiliser le footer marketing existant).

### WS-4 — Système de motion
Un hook/util réutilisable : reveals (IO), parallax (rAF, **desktop ≥760 only**), magnetic, scroll progress, cursor glow. **Invariants** : transform/opacity uniquement (pas de reflow), `prefers-reduced-motion` coupe tout, pas de CLS (réserver les hauteurs), viser **INP < 200 ms**.

### WS-5 — Mobile & responsive
Porter les optimisations v3 : **CTA collant en bas** (mobile), tags flottants masqués (pas de scroll horizontal), aurores/halo allégés, parallax coupé < 760 px, tap targets ≥ 44 px. Tester **360 / 390 / 414**. `overflow-x` verrouillé.

### WS-6 — SEO / meta / analytics
`metadata` (title/desc/canonical/OG), **JSON-LD** Organization + FAQPage (+ Offer pour les prix si pertinent), `og:image` de marque. Événements analytics sur chaque CTA (PostHog/Plausible) pour mesurer la conversion.

### WS-VERIF (obligatoire)
- **Lighthouse** (mobile) cibles : Perf ≥ 90, A11y ≥ 95, SEO ≥ 95, Best-practices ≥ 95.
- **qa-chrome** : captures desktop + mobile (360/390), console propre, **zéro scroll horizontal**, reduced-motion OK, tous les CTA routent bien.
- **E2E smoke** (Playwright) : clic « Créer mon carnet » → `/auth/register`.
- `/verif-sprint` (tests + build + lint + types) + **deploy-watch** sur la preview.

---

## 3. Critères d'acceptation (mesurables)

- **LCP < 2,5 s** et **INP < 200 ms** et **CLS < 0,1** sur mobile (Lighthouse + terrain).
- **Aucun scroll horizontal** à 360 px ; tap targets ≥ 44 px.
- Tous les CTA routent correctement ; prix = source de vérité (pas de prix en dur divergent).
- **Perso = « Exemple »** partout ; aucune promesse non livrée.
- `prefers-reduced-motion` : page entièrement utilisable sans animation.
- A11y : landmarks, focus visibles, contrastes AA, FAQ au clavier.

---

## 4. Séquencement & rollout

```
Phase 0 verte (sprint-31)  ──►  WS-1 ──► WS-2 + WS-3 + WS-4 (parallèle) ──► WS-5 ──► WS-6 ──► VERIF ──► preview ──► (A/B ou swap)
```

- Branche dédiée `sprint-NN-refonte-home` → preview Vercel → QA → décision A/B vs swap → merge `main`.
- **Garde-fous** : ne pas régresser le SEO de la home actuelle (canonical, OG, JSON-LD) ; ne pas dégrader le LCP ; pas de push sans validation John.

---

## 5. Estimation

~**1,5 à 2 sprines** selon les décisions §1 (MapLibre réel + A/B test = +1 semaine). Le gros du risque est sur **WS-2/WS-4** (motion sans nuire à LCP/INP) et **WS-5** (mobile réel — à tester sur device, l'émulation a manqué pendant les audits).

---

*Roadmap rédigée le 2026-06-25. Prototype de référence : `docs/maquette-v3/accueil-premium-v3.html`. À convertir en BRIEF de sprint (template Fable) au lancement.*
