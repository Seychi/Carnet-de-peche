# 🗺️ ROADMAP PRÉ-MOBILE — « Rendre le web parfait avant le natif »

> Issue de l'audit transverse **`docs/audits/AUDIT-2026-06-26.md`** (2026-06-26).
> Principe directeur (décision John, maintenue) : **on n'attaque pas le mobile tant que le web n'est pas complet** — la PWA fait le pont.
> Objectif de cette roadmap : transformer « très solide » en « parfait », puis ouvrir le natif sur des fondations propres.

---

## 0. Lecture rapide

Trois familles de travaux, dans l'ordre :

1. **Sprint 35 — Vérité & bugs visibles** (rapide, P0) : corriger les 4 défauts nets + nettoyer la dette de surface.
2. **Sprint 36 — Carte instantanée** (perf, P0) : le sprint perf déjà cadré (sprint 33) jamais exécuté.
3. **Sprint 37 — Les Cent Premiers** (amorçage, P0 business) : remplir le réservoir pour rendre le moat visible.
4. **Sprint 38 — Contenu & SEO** (P1, en parallèle, lane César) : guides + illustrations.
5. **Gate mobile** : décisions + pré-requis opérationnels avant Expo.

> ⚠️ **3 décisions bloquantes pour John** sont listées au §6. Sans elles, S37 et le gate mobile ne peuvent pas démarrer.

---

## 1. Sprint 35 — « Vérité & bugs visibles » (P0 · ~3-5 j)

But : zéro donnée fausse visible, durcissement sécurité, doc qui dit la vérité. Tout est cadré et exécutable sans décision produit.

| WS | Tâche | Critère d'acceptation |
|---|---|---|
| **A** | **M1 — Géocodage du log de prise.** Brancher l'API BAN (`api-adresse.data.gouv.fr`) sur le champ « Ville ou lieu » : autocomplétion → coordonnées. Garder GPS + saisie manuelle en secours. | Sur desktop sans géoloc, je tape « Camaret », je choisis une suggestion, la prise s'enregistre sans saisir de lat/long. Test e2e. |
| **B** | **M2 — Heures de soleil.** Corriger parsing/TZ `sunrise/sunset` (cockpit + partout où affiché). Auditer si ça biaise la composante Astro du score générique. | Brest le 26/06 → lever ~06:17 / coucher ~22:14. Test de non-régression solunar. Impact score documenté. |
| **C** | **M3 — En-têtes de sécurité HTTP.** Bloc `headers()` dans `next.config.ts` : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS. **CSP en `report-only`** d'abord (valider MapLibre/Stripe/PostHog). | Headers présents (vérif curl) ; aucune régression carte/paiement/analytics ; rapport CSP collecté avant passage en enforce. |
| **D** | **M4 — Resync `CLAUDE.md`** (§2 état sprint 34, §4 stack mobile, §7 `current_tier`, §8 floutage 500-900 m, §9 roadmap). Fermer F12. | Un lecteur neuf du `CLAUDE.md` a l'état réel ; plus de contradiction avec l'audit. |
| **E** | **Hygiène Sentry (m5).** Résoudre `NEXTJS-2/3` (corrigés/transitoires) ; investiguer `NEXTJS-6/7` (`/especes/[slug]` `'rest'`) sur le slug fautif. | Issues transitoires fermées ; cause du `'rest'` identifiée + corrigée ou confirmée bot. |
| **F** | **Polish copy + DB + repo (m1, m6, m7).** Copy « tous les spots » → « carte complète » ; index FK `invite_codes.created_by` + `outings.spot_id` ; gitignore `.playwright-mcp/`, élaguer branches mortes. | Copy gating juste ; advisors FK clean ; repo propre. |
| **VERIF** | `/verif-sprint` (tests + build + lint + types + revue indépendante + passe anti-régression GPS/gating/RLS). | Vert. |

**Cible de sortie S35 :** 0 bug visible, headers en place, doc vraie, Sentry propre.

---

## 2. Sprint 36 — « Carte instantanée » (P0 perf · ~5 j)

= le sprint 33 « perf carte » planifié puis reporté. **C1 de l'audit.**

| WS | Tâche | Critère d'acceptation |
|---|---|---|
| **A** | Différer le **mount MapLibre** : afficher d'abord un skeleton/carte statique légère, monter l'instance interactive au 1er geste / après hydration. | Long task d'init sortie du chemin critique ; pas de canvas noir. |
| **B** | Chargement **progressif des spots** (viewport-driven), couches GPU déjà en place (sprint 34). | Pas de jank au pan/zoom. |
| **C** | Budget JS : auditer le bundle `/carte`, code-split les couches avancées (bathy/vent) hors du chemin gratuit. | Bundle `/carte` réduit, mesuré. |
| **VERIF** | **Mesure Lighthouse mobile prod** sur `/carte` avant/après. | **Perf ≥ 70 / TBT < 600 ms** (baseline 35 / 3 920 ms). |

> C'est le verrou « feel natif » : fermer la perf carte = effacer le dernier avantage perçu d'une app concurrente avant de faire la nôtre.

---

## 3. Sprint 37 — « Les Cent Premiers » (P0 business · cadence dédiée)

= Chantier D / amorçage. **C2 de l'audit.** Le moat est codé ; il lui manque la **donnée**.

Pré-requis : **décisions §6** prises.

| WS | Tâche | Critère d'acceptation |
|---|---|---|
| **A** | Activer la **vague beta « fondateurs »** : générer des `invite_codes`, passer `INVITE_ONLY` selon stratégie, page d'accueil beta. | N invitations envoyées (canal César), tunnel mesuré (PostHog). |
| **B** | (si décidé) **Seed honnête** : prises/spots réels documentés, jamais de faux comptes déguisés. | Réservoir > seuil de visibilité du moat (k-anon K=3 atteint sur X mailles). |
| **C** | **Time-to-value à froid** : états froids déjà honnêtes (cockpit, carte vide) → vérifier qu'un visiteur SEO sans données voit quand même une valeur (guides, fiches, spots curés). | Parcours « SEO → 1re prise » mesuré, rebond réduit. |
| **VERIF** | Mesure : nb prises publiques, nb départements actifs, 1re tendance perso réellement affichée. | Le moat « parle » sur ≥ 1 carnet réel. |

> Sans cette étape, le différenciateur n°1 (« le carnet qui apprend de TES prises ») reste théorique au lancement.

---

## 4. Sprint 38 — « Contenu & SEO depth » (P1 · parallèle, lane César/édito)

= Chantier E. Tourne **en parallèle** de S35-37.

- **Guides 5 → ~15 piliers** (techniques + saisons + espèces phares), au standard sourcé.
- **Illustrations espèces** : remplacer le `<Fish>` générique par les planches naturalistes (lot briefé sprint 28/32).
- **Vignettes guides** : retirer les placeholders.
- Cible : être **plus profond** que Fishing Grid sur nos 26 espèces (pas plus nombreux : plus utile).

---

## 5. Gate mobile — pré-requis avant Expo

À ne lancer **qu'après** S35-37 verts. Issu des docs (`sprint-mobile/`, `ROADMAP-SPRINTS-31-PLUS.md`) + audit :

**Produit (doivent être « parfaits » côté web d'abord) :**
- ✅ IA/navigation reliée (fait S27) · ✅ cockpit (S30)
- ☐ **Perf carte** (S36) · ☐ **réservoir amorcé** (S37) · ☐ **bugs M1/M2 corrigés** (S35)
- ☐ **Prise vérifiée** (mesure taille/poids par photo + IA espèce) — listée comme pré-requis mobile (ancien « S35 »). **Décider** : web-first ou natif-first ? (la caméra native est un argument pour l'attendre côté mobile, mais la mesure photo peut se prototyper web.)
- ☐ **Digest/notifications sortantes** consolidées (notif « optimal window » livrée S26 ; le digest hebdo prévu S34 reste à faire).

**Opérationnel (délais à anticiper dès maintenant) :**
- ☐ Compte **Apple Developer** (99 $/an, délai de validation) + **Google Play Console** (25 $).
- ☐ **Expo/EAS** + OAuth iOS/Android (Google/Apple Sign-in).
- ☐ **Migration monorepo Turborepo** sans régression web (code partagé web/mobile).
- ☐ Mettre à jour la cible Expo (le `CLAUDE.md` dit « SDK 51 » → viser le SDK courant).

---

## 6. ⚠️ Décisions bloquantes pour John (avant S37 + gate mobile)

| # | Décision | Pourquoi c'est bloquant |
|---|---|---|
| **D1** | **Stratégie d'amorçage** : seed honnête oui/non ? Vague beta « fondateurs » quand et combien ? Objectif chiffré (prises × départements) avant ouverture large ? | Conditionne tout le sprint 37 et la visibilité du moat au lancement. |
| **D2** | **Prise vérifiée (mesure photo + IA espèce)** : web-first ou natif-first ? | Détermine si c'est un sprint web (avant mobile) ou une feature native du gate. |
| **D3** | **Page `/techniques`** (capture email livrée, page `noindex` car jugée mince) : l'indexer (et l'étoffer) ou la laisser hors index ? | Impacte la stratégie SEO/guides du sprint 38. |

---

## 7. Séquencement visuel

```
Maintenant ──► S35 Vérité & bugs ──► S36 Carte instantanée ──► [Gate mobile]
                    │                        │
                    └── S37 Amorçage (dès D1 tranchée) ──┘
                    └── S38 Contenu/SEO (parallèle, lane César) ───────────►
```

**Web « parfait » = S35 + S36 + S37 verts.** Ensuite : prototype Expo (monorepo + comptes stores en pré-requis amorcés en parallèle).

---

*Roadmap dérivée de l'audit 2026-06-26. À valider/arbitrer par John (décisions D1-D3), puis à découper en briefs `docs/sprint-35/BRIEF.md` etc. selon `BRIEF-TEMPLATE.md`.*
