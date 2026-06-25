# 🗺️ Roadmap consolidée — avant la refonte marketing

> Compile **Audit 1** (`docs/audits/AUDIT-2026-06-25-fonctionnel-seo.md` — parcours + SEO) et **Audit 2** (`docs/audits/AUDIT-2026-06-25-profond.md` — destructif + technique).
> Objectif de John : **garder la refonte marketing pour plus tard** et d'abord régler tout ce qui doit l'être **avant**. Cette roadmap classe les findings, les chiffre, et les séquence — la refonte arrive en **Phase 3**, une fois le socle propre.
>
> Sévérité : 🔴 bloquant produit · 🟠 important · 🟡 polish. Effort : **S** < 1 j · **M** 1-3 j · **L** > 3 j.

---

## 0. La logique en une phrase

La nouvelle page marketing est un **amplificateur de funnel** : elle enverra surtout des **inscriptions gratuites**. L'amplifier avant d'avoir (a) vérifié ce que voit un gratuit, (b) arrêté de promettre un moat non livré, (c) rendu vraies les promesses (« 26 espèces »), (d) corrigé les bugs qu'elle héritera (SEO/grammaire, a11y, perf) = **gaspiller la refonte**. → On solidifie le socle (Phase 0-1), **puis** on construit la vitrine (Phase 3).

---

## 1. Tableau maître des findings

| # | Finding | Source | Sév. | Effort | Action |
|---|---|---|---|---|---|
| F1 | **Parcours gratuit jamais vérifié** (floutage, gating 3 spots/dépt, paywall, badge score) | A1+A2 | 🔴 | M | Compte Découverte **sans essai** → rejouer carte + fiche spot + tarifs |
| F2 | Hero/mockups perso non marqués **« Exemple »** (score perso neutralisé = sur-promesse) | A1 | 🟠 | S | Label « Exemple » + requalifier badge « ⚡ Perso » |
| F3 | **Carnet : 6 espèces loguables / 26 promises** | A1 | 🟠 | M | Sélecteur 26 + recherche, **ou** cadrer la promesse |
| F4 | **Bug d'article département systémique** (« du/le Alpes-Maritimes » : titre fil + sous-titre co-pêchage) | A1+A2 | 🟠 | S/M | `articleDept(nom, prep)` centralisé dans `lib/geo/departments.ts` |
| F5 | **Modale de suppression sans `DialogTitle`** (a11y, warning console ×2) | A2 | 🟠 | S | `DialogTitle` (+ `VisuallyHidden`) sur chaque `DialogContent` |
| F6 | **Composer fil : INP ~460 ms** (Core Web Vital « poor ») | A2 | 🟠 | M | Profiler + debounce / `useTransition` / isoler re-render |
| F7 | Nouvelle prise : **submit à vide sans feedback** près du CTA collant | A1 | 🟡 | S | Scroll-to-error + toast |
| F8 | `/techniques` : meta « inscris-toi pour être notifié » **sans capture email** | A1 | 🟡 | S | Aligner meta ↔ page |
| F9 | **Guides : 5 / 26 fiches** + 2/3 vignettes = placeholder | A1 | 🟡 | L (contenu) / S (vignettes) | 8-10 guides phares + vignette par guide |
| F10 | Notif co-pêchage « a interagi avec toi « a demandé… » » générique | A1 | 🟡 | S | Reformuler en action explicite |
| F11 | Fiche spot : **spinner mini-carte** au 1er paint | A1 | 🟡 | S/M | Préchauffe / skeleton ciblé |
| F12 | `CLAUDE.md` **en retard** (dit « 6 espèces / sprint 21 » ; réel = 26 / sprint 28-29 / migration 049) | A1 | 🟡 | S | Resynchroniser la synthèse §2 |

**Vérifié OK (rien à faire)** : suppression de post (toast + optimiste + **modale irréversible**), co-pêchage e2e (privacy-first), accès `/moderation` (404 propre), gating tendances (seuil d'échantillon), Stripe portal/essai, SEO technique (536 URLs, JSON-LD, `noindex` /techniques), 26 fiches espèces profondes & datées, carte concurrentielle.

---

## 2. Phase 0 — Bloquants AVANT la refonte

> But : que tout ce que la page marketing promet soit **vrai**, et que le parcours d'arrivée (surtout gratuit) **fonctionne**.

1. **F1 — Vérifier le gratuit en vrai.** *(Préalable absolu — me connecter à un compte Découverte sans essai, je boucle le gating.)*
2. **F2 — Honnêteté.** Label « Exemple » + badge perso requalifié.
3. **F3 — Carnet 6 → 26.** Trancher et aligner (la home crie « 26 espèces »).
4. **F4 — Article département.** Fix centralisé (sinon la nouvelle page/SEO l'hérite).
5. **F5 — a11y `DialogTitle`** + **F6 — INP composer.** Une page « 1M€ » se doit d'être accessible et fluide.
6. **F7 — feedback submit prise** + **F8 — meta /techniques.**

**Total Phase 0 ≈ 4-6 j** (F1 M, F2 S, F3 M, F4 S/M, F5 S, F6 M, F7 S, F8 S).

---

## 3. Phase 1 — Polish (en parallèle, non bloquant)

F10 copy notif (S) · F11 spinner mini-carte (S/M) · F9b vignettes guides (S) · F12 hygiène `CLAUDE.md` (S). **≈ 1-2 j.**

---

## 4. Phase 2 — Contenu & SEO (continu, lane éditoriale)

F9a — **Guides 5 → 20** (pilier le plus faible ; les fiches espèces, elles, sont déjà au niveau). **L, étalé.** Tourne **en parallèle** des autres phases (César + lane éditoriale).

---

## 5. Phase 3 — LA REFONTE MARKETING

Une fois Phase 0 verte : reprendre la page premium déjà prototypée (`docs/maquette-v3/accueil-premium.html`), trancher la direction, puis **intégrer dans `app/(marketing)/page.tsx`** (composants DA v2, responsive, motion, perf, a11y). **L.** ← *c'est ici, pas avant.*

---

## 6. Phase 4 — QA continue (combler les angles morts)

Mettre en place une **QA récurrente** sur les deux trous de méthode :
- **Compte gratuit dédié** (F1) + **device mobile réel** (le resize navigateur est inopérant → émulation indisponible en session).
- Couvrir les flux non encore testés : onboarding compte neuf, auth déconnecté, suppression **prise/commentaire** (vérifier la même a11y modale), upload photo, **Checkout Stripe LIVE**, suppression de compte, signalement.
- Idéalement **scripter** (Playwright) les parcours free-gating + destructifs pour non-régression.

---

## 7. Séquencement recommandé

```
Phase 0 (bloquants)  ──►  Phase 3 (refonte)
   │                          ▲
   ├─ Phase 1 (polish) ───────┘   (en parallèle)
   │
   └─ Phase 2 (guides/SEO) ─────────────────────►  (continu, parallèle)
   │
   └─ Phase 4 (QA récurrente) ──────────────────►  (continu, parallèle)
```

**Prochain pas concret** : connecte-moi un **compte Découverte sans essai** → je ferme F1 (le seul bloquant que je ne peux pas trancher seul), et on attaque la Phase 0.

---

*Roadmap consolidée des audits du 2026-06-25. La refonte marketing est volontairement placée en Phase 3, derrière un socle « promesses vraies + parcours gratuit vérifié + bugs hérités corrigés ».*
