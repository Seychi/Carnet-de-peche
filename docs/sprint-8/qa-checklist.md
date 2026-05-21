# ✅ Checklist QA manuelle — Sprint 8

> À cocher par John dans l'app lancée (avec le seed `/dev/seed-feed` + les comptes test `seed_test_accounts.sql`) **avant de merger `sprint-8` → `main`**.
> Ces tests ne peuvent pas être automatisés ici (Realtime, navigateur, multi-comptes).

## Tier `discovery` (test_disco_29)
- [ ] `/fil` redirige vers `/fil/29`
- [ ] Lecture du fil 29 OK (posts visibles)
- [ ] Composer désactivé + bandeau « Passe en Local… » + CTA `/tarifs`
- [ ] Cliquer like → toast « Passe en Local pour aimer et commenter. »
- [ ] Signaler reste accessible → ligne créée dans `reports`
- [ ] `/fil/56` accessible en lecture
- [ ] Profil public `/u/test_local_29` accessible, bouton « Suivre » actif (follow gratuit)

## Tier `local` 29 (test_local_29)
- [ ] Composer actif sur `/fil/29`
- [ ] Composer désactivé sur `/fil/56` avec bandeau « Local sur un autre département… »
- [ ] Créer un post texte → apparaît en haut du fil 29 en < 3s côté autre onglet (Realtime)
- [ ] Partager une prise → card catch s'affiche, photo OK, coords floutées
- [ ] Like sur un post → compteur +1 live côté autre onglet
- [ ] Commenter → compteur commentaires +1 live
- [ ] Supprimer mon post → disparaît, fil propre
- [ ] Suivre `test_local_56` → onglet « Tes follows » inclut ses posts

## Tier `itinerant` (test_itin)
- [ ] Composer actif sur `/fil/29`, `/fil/56`, `/fil/13`
- [ ] Onglet « Tous les départements côtiers » visible
- [ ] Poster sur `/fil/13` (Méditerranée) → OK

## Anonymous
- [ ] `/fil` → redirect login
- [ ] `/u/<username>` → décision John (recommandation : accessible mais noindex)

## Signal social spot
- [ ] Spot avec ≥ 1 catch publique 7j → encart « Activité récente » visible
- [ ] Spot avec 0 catch 7j → pas d'encart
- [ ] `view-source` : aucune lat/long précise dans le DOM de l'encart

## Sécurité (red team rapide)
- [ ] POST REST direct avec JWT discovery sur `feed_posts` → 401/403
- [ ] POST avec JWT local 56 et `region='29'` → refusé (RLS)
- [ ] DELETE le post d'un autre user → 0 ligne affectée
- [ ] En rôle `anon` (clé publishable) : `select` sur `feed_posts`/`feed_comments`/`feed_likes`/`follows` → 0 ligne (RLS-FIX-04/05)
- [ ] SELECT direct `feed_posts` avec `catch_id` pointant une catch privée d'un autre → pas de fuite geom

## Gates automatisés (déjà verts, à revérifier après merge)
- [ ] `pnpm test` ≥ 140 (actuel : 183)
- [ ] `pnpm typecheck` = 0
- [ ] `pnpm build` OK
- [ ] CI GitHub Actions verte
