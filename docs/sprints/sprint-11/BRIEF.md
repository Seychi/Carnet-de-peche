# Sprint 11 — Brief d'exécution
## Polish + PWA + Beta privée

> Rédigé le 2026-06-11, en parallèle du sprint 10 (en cours sur Claude Code). Durée : 2 semaines (cible 2026-07-01 → 2026-07-15).
> Décision John 2026-06-11 : **PWA installable dans ce sprint** (riposte au gap mobile vs Fishing Grid, cf `docs/concurrents/fishing-grid.md`).
> Ce brief sera à re-valider 30 min en fin de sprint 10 : deux blocs dépendent de ses livrables (rapport marées → Bloc B ; copy social gratuit → emails).

**Préalables (sorties du sprint 10)** : social gratuit en prod · rapport `docs/sprint-10/tides-accuracy.md` livré · ≥ 5 guides + 6 fiches espèces en ligne · suite de tests verte.

---

## Objectif du sprint en une phrase

Passer de « ça marche » à « c'est solide et installable », et mettre le produit dans les mains de 50 vrais pêcheurs pour alimenter Gate 1 (Go/No-Go mobile, ~16 juillet).

## Ordre d'exécution

| # | Bloc | Durée | Dépend de |
|---|---|---|---|
| A | PWA installable | 2-3 j | — (commencer jour 1) |
| B | WorldTides | 0 ou 2 j | **Conditionnel** : rapport marées sprint 10 ≥ 15 min d'écart |
| C | Emails transactionnels (Resend) | 2 j | — |
| D | Monitoring Sentry | 1 j | — |
| E | Tests E2E Playwright + Lighthouse CI | 2-3 j | — |
| F | Perf + accessibilité | 1-2 j | E (mesures) |
| G | Beta privée (logistique + lancement) | continu, J1 → J14 | A, C, D livrés avant l'envoi des invitations |

Jalons : **J5 = build candidate beta** (PWA + emails + Sentry en prod) · **J7 = envoi des 50 invitations** · **J14 = données collectées pour Gate 1**.

---

## Bloc A — PWA installable

Pont vers le mobile natif (sprints 12-19), pas un substitut. Les testeurs beta doivent pouvoir poser une icône Carnet de Pêche sur leur écran d'accueil.

1. `manifest.webmanifest` : `name`/`short_name`, icônes 192/512 + maskable, `theme_color: #0A2F3D`, `background_color: #FBF8F2`, `display: standalone`, `start_url: /home`.
2. Service worker (`next-pwa` ou Workbox — trancher au setup) :
   - Cache app shell + assets statiques (stale-while-revalidate)
   - Cache des dernières données marées/spots consultés (network-first, fallback cache)
   - Page offline de repli : « Tu es hors ligne — voici tes dernières marées » (lecture seule)
   - **Rester simple** : pas de queue de sync offline, pas de background sync — ça c'est le sprint 16 mobile
3. Install prompt discret : bannière dismissable après la 2e session (`beforeinstallprompt` + localStorage du dismiss). Jamais de modal bloquante.
4. iOS : `apple-touch-icon`, vérif standalone Safari, splash basique.
5. QA : install + offline testés sur iPhone Safari réel + Android Chrome réel (pas que simulateur).

**Critères** : Lighthouse « installable » ✓ · l'app se lance en standalone depuis l'icône · mode avion → page offline propre, pas d'écran blanc.

## Bloc B — WorldTides (CONDITIONNEL)

- **Si** le rapport sprint 10 conclut écart médian < 15 min : **skip total**, la copy « horaires vérifiés » est déjà en place. 0 jour.
- **Sinon** : intégrer WorldTides (clé API + env var `WORLDTIDES_API_KEY`, ~10 $/mois) pour les PM/BM des fiches spots, Open-Meteo reste pour la courbe + météo/houle. Re-passer `scripts/verify-tides.ts` pour confirmer le gain, mettre à jour le rapport. 2 j.

## Bloc C — Emails transactionnels (Resend)

1. Setup `RESEND_API_KEY` (env + Vercel), domaine d'envoi vérifié (SPF/DKIM sur carnet-de-peche.com).
2. Templates React Email (`emails/`) : welcome (mentionner **fil 100% gratuit** — c'est l'argument différenciant post-pivot), trial start, trial J5 (« plus que 2 jours »), payment success, payment failed, password reset (remplacer le template Supabase par défaut).
3. Weekly digest (optionnel, si le temps) : cron dimanche « Tes 3 plus belles prises + 3 spots tendance dans ton dépt ».
4. Brancher les webhooks Stripe existants sur les envois (payment failed → email).

**Critères** : chaque email part en < 30 s après son événement déclencheur, rendu propre Gmail + Apple Mail, lien désinscription sur le digest.

## Bloc D — Monitoring Sentry

1. `@sentry/nextjs` + `SENTRY_DSN`, source maps via l'intégration Vercel.
2. Alertes email John : toute erreur 5xx, tout échec webhook Stripe, tout échec du cron `compute-spot-scores`.
3. Performance monitoring sur `/carte`, `/spots/[slug]`, `/carnet`, `/fil`.
4. Filtrer le bruit (extensions navigateur, bots) dès le setup pour ne pas cramer le quota free.

## Bloc E — Tests E2E Playwright + Lighthouse CI

1. `@playwright/test`, 4 scénarios :
   - Inscription → onboarding 6 étapes → première catch loguée
   - Connexion → carte → fiche spot → conditions visibles
   - Essai Local (Stripe test) → tier upgradé → carte complète accessible *(scénario mis à jour post-pivot : le fil n'est plus le marqueur du tier, la carte oui)*
   - Poster sur le fil en `discovery` → visible cross-session *(nouveau, vérifie le Bloc 0 du sprint 10)*
2. CI GitHub Actions : Playwright sur PR + main (contre un projet Supabase de test ou des mocks — trancher selon l'effort).
3. `@lhci/cli` : budgets FCP < 2 s, LCP < 2,5 s, CLS < 0,1. Bloque la PR si régression > 10 %.

## Bloc F — Perf + accessibilité

- Audit bundle (`next build` analyze), `next/dynamic` sur charts + map, purge des deps mortes.
- Audit RLS des requêtes chaudes (EXPLAIN sur fil + carte).
- axe-core sur 5 pages clés ; fix contraste/labels/focus/clavier sur la carte ; test VoiceOver iOS sur 3 parcours.

## Bloc G — Beta privée

### Logistique (John + César, démarre J1)
- Liste 50 invités : 20 Bretagne, 15 Atlantique, 15 Méditerranée. César pilote le recrutement (groupes FB/forums/Insta), John valide la liste.
- Code `BETA2026` : coupon Stripe **6 mois Itinérant gratuit**, limité à 60 redemptions.
- Canal feedback : Discord privé « Beta Carnet de Pêche » (3 salons : #annonces, #bugs, #idées).
- Email d'invitation (template Resend dédié) avec lien d'install PWA pas-à-pas (iOS et Android).

### Questionnaire testeurs (J10-J14, alimente Gate 1)
1. NPS (0-10) + verbatim libre
2. **« L'absence d'app App Store / Play Store est-elle un frein pour toi ? »** (oui bloquant / gênant / non)
3. **« As-tu installé la PWA sur ton écran d'accueil ? »** (+ pourquoi non)
4. Feature la plus utile / la plus manquante
5. « Paierais-tu 4,90 €/mois pour la carte complète + le score perso ? » (oui / peut-être / non + pourquoi) — *le vrai test du pricing post-pivot social gratuit*

### Métriques à collecter (instrumenter PostHog/Plausible si pas déjà fait)
- Activation : % invités → inscrit → 1re catch loguée en 14 j (cible ≥ 60 %)
- Rétention : % actifs semaine 2
- Social : posts/jour, % users qui postent (le pivot gratuit doit se voir ici)
- PWA : % d'installs parmi les actifs
- Conversion intention : réponses question 5

## Gate 1 — préparation (J14)

Compiler dans `docs/sprint-11/GATE-1.md` : NPS, activation, verbatims, réponses app native/PWA/pricing + recommandation Go/No-Go mobile. Critères Go inchangés (ROADMAP) : NPS ≥ 30, ≥ 30/50 actifs, ≥ 5 demandes mobile spontanées, 0 P0 ouvert, Stripe stable.

## Risques du sprint

| Risque | Mitigation |
|---|---|
| Service worker qui cache trop → bugs de version fantôme | `skipWaiting` + bouton « Mettre à jour » + versionning du SW ; tester le cycle de déploiement AVANT la beta |
| Recrutement 50 testeurs plus lent que prévu | César démarre J1 ; seuil minimum 30 testeurs pour ne pas décaler ; compléter par 10 interviews qualitatives |
| Bugs beta qui mangent le sprint | Triage strict : P0/P1 immédiat, le reste en backlog sprint 12 ; ne pas toucher aux features |
| Délivrabilité emails (SPF/DKIM frais) | Configurer le domaine J1, warm-up avec les emails internes avant l'envoi des 50 invitations |
| Quota Sentry free dépassé | Filtres bruit dès le setup ; plan Team (26 €/mois) si besoin, à valider John |

## Critères de sortie du sprint

- PWA installable en prod, testée sur iOS + Android réels
- Décision WorldTides exécutée (skip documenté ou intégré + re-vérifié)
- 6 templates email branchés et testés en prod
- Sentry capte les 5xx avec stack traces ; alertes John actives
- Playwright CI vert sur les 4 scénarios ; Lighthouse CI en place
- Lighthouse Perf ≥ 70 mobile / ≥ 90 desktop sur `/carte`, `/spots/[slug]`, `/`
- ≥ 30 testeurs invités actifs, Discord ouvert, questionnaire envoyé
- `docs/sprint-11/GATE-1.md` rempli → décision mobile

## Ce qu'on ne fait PAS dans ce sprint

- ❌ Features produit nouvelles (le sprint est polish + beta, point)
- ❌ Sync offline complexe / background sync (sprint 16 mobile)
- ❌ Modération Claude API (seulement si > 5 reports/jour en beta)
- ❌ Setup Expo / monorepo (sprint 12, après Gate 1)
