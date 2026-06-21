# Audit complet du site — 2026-06-21

> Audit orchestré (12 agents en parallèle) : pages publiques en live + analyse code + BDD/RLS, pour les 4 tiers (anonyme / discovery / local / itinérant). Méthode adversariale.
> Limite : pas de clic authentifié en live (automatisation navigateur indisponible) → les tiers connectés/payants sont audités par le code + la BDD. La couche « clic réel » est couverte par le prompt Claude-in-Chrome (à dérouler par John) + la suite E2E Playwright (Phase B, à construire).

## Score

| Sévérité | Nombre |
|---|---|
| 🔴 Critique | 3 |
| 🟠 Élevé | 16 |
| 🟡 Moyen | 7 |
| 🟢 Bas | 14 |
| ℹ️ Info / vérifié sain | ~20 |

**Les 3 critiques sont recoupés et reproductibles (live + SQL).** Les 2 plus graves tournent autour du **même trou** : le floutage GPS ne floute rien.

---

## 🔴 CRITIQUES

### C1 — Le floutage GPS « 1 km » est un no-op : les coords exactes des 38 spots fuitent aux gratuits/anonymes
Deux vecteurs cumulés, vérifiés en prod :
1. **`geom_public` est un buffer symétrique centré sur le point exact** → `ST_Centroid(geom_public)` = le point d'origine. Mesuré : offset moyen **0,021 m** sur les 38 spots. La RPC `get_spots_for_map` (branche non-abonné) et la fiche `/spots/[slug]` (liens itinéraire Google/Apple/Waze + pin mini-carte) renvoient donc les **coordonnées exactes** (13 décimales) pendant que l'UI affiche « ZONE FLOUTÉE 1 KM ». Vérifié en live sur `cap-frehel` (48.6852001…, -2.3197000…) et `pointe-du-raz`.
2. **Le rôle `anon` a le GRANT SELECT sur `spots.geom`** (`has_column_privilege('anon',…'geom')=true`) + policy `spots_select_visible` permissive → avec la clé publishable (dans le bundle JS), `supabase.from('spots').select('geom')` renvoie les 38 points précis.

**Impact** : le moat payant (coords précises réservées Local/Itinérant) est contourné gratuitement à 100 %, **et** la copy ment (« zone floutée », « abonne-toi pour le GPS précis »). Contredit la décision verrouillée CLAUDE.md §8.
**Localisation** : trigger `blur_spot_geom` (mig. 004) ; `get_spot_by_slug` (011) / `get_spots_for_map` ; `app/(marketing)/spots/[slug]/page.tsx` (liens itinéraire + SpotMiniMap) ; grant colonne `spots.geom`.
**Correctif** :
- `geom_public` doit être un **vrai point décalé** (jitter pseudo-aléatoire ~500–1000 m, graine stable par id), pas un buffer centré. Corriger le trigger + **recalculer les 38 lignes**.
- **REVOKE SELECT (geom) ON public.spots FROM anon, authenticated** ; n'exposer le précis que via RPC SECURITY DEFINER gated + la vue `spots_for_viewer` (qui, elle, masque déjà correctement). Régénérer `lib/types.ts`.
- QA : après fix, vérifier `ST_Distance(geom, point_public) ≥ ~500 m` et que liens itinéraire + pin des gratuits pointent au flou.

> Note : le JSON-LD de la fiche, lui, arrondit déjà à 2 décimales (~1 km) — c'est le seul endroit correct, bonne base pour le fix.

### C2 — RPC carte sans gating serveur : limites de tier contournables (aggrave C1)
`get_spots_for_map` et `nearby_spots` sont `EXECUTE` pour `anon`/`authenticated` et **ne contiennent aucune limite** « 3 spots/dépt » ni « local = home_department ». Tout le gating vit dans `app/(map)/carte/page.tsx` (Server Component). Un appel direct à la RPC (clé publishable + JWT) renvoie les 38 spots, 4 départements. Pour un abonné **Local**, `is_precise = has_active_subscription()` est vrai sans filtre département → il obtient le précis de **tous** les départements (= la feature Itinérant à 9,90 €). De même, **`/api/spots/nearby` n'a aucun garde de tier** (vérifié live : un anonyme reçoit 36 spots).
**Correctif** : porter le gating DANS les RPC (SECURITY DEFINER) en fonction de `current_tier` + `home_department` ; tronquer `/api/spots/nearby` côté serveur selon le tier.

### C3 — Droit à l'effacement RGPD cassé : `delete_my_account()` n'existe pas en prod
`to_regprocedure('public.delete_my_account()') = false`. La migration 005 (qui la définit) n'a jamais été appliquée (le tracking commence à 006). Le bouton « Supprimer mon compte » (`app/(app)/profil/actions.ts:82`) échoue donc systématiquement (PGRST202), alors que la **politique de confidentialité** et la **CGU** promettent une suppression « immédiate et irréversible ». Feature cassée **+ promesse légale non tenue (risque CNIL)**.
**Correctif** : appliquer `delete_my_account()` en prod (security definer, cascade auth.users → profiles/catches/storage), tester le flux complet, **puis auditer la dérive migrations vs schéma** (005, 008, 013, 019, 020, 022, 025, 026 absentes de `schema_migrations` — vérifier qu'elles sont réellement appliquées).

---

## 🟠 ÉLEVÉ (16)

**Copy / crédibilité (mensonges)**
- **`/tarifs` FAQ « 27 départements côtiers couverts » = faux** (4 dépts bretons réels) — affirmé au moment de payer. `app/(marketing)/tarifs/page.tsx:56-59`.
- **Home « Export GPX/JSON prévu cette année » = feature inexistante** (aucun code d'export). `app/(marketing)/page.tsx:317`.
- **Bug de grammaire SEO « Le dorade royale » / « Le orphie »** dans H1/title/meta/breadcrumb des fiches espèces **et** des ~dizaines de pages `/peche/*` (article masculin codé en dur). `lib/seo/programmatic.ts:177,180` ; `especes/[slug]/page.tsx:168`.

**SEO**
- **Duplicate/thin content sur ~310 pages `/peche/.../[département]`** sans spot : corps quasi identique entre dépts d'une même façade, toutes self-canonical + au sitemap → risque doorway pages / dépréciation du dossier `/peche/`. Canonical vers la page nationale tant qu'un dépt n'a pas de contenu propre.

**Sécurité / fuite données**
- **`/carnet/[id]` ne vérifie pas la propriété** → un connecté qui devine l'UUID d'une prise publique/amis d'autrui voit ses notes, conditions complètes et flags de confidentialité (+ boutons Modifier/Supprimer morts). Ajouter `if (c.user_id !== user.id) notFound()`. `app/(app)/carnet/[id]/page.tsx`.

**Auth / parcours**
- **`?redirect=` / `?next=` morts** : générés partout mais jamais lus → un deep-link vers une page protégée renvoie toujours sur `/home` après login. (2 conventions coexistent en plus.)
- **Le parcours « s'abonner depuis /tarifs » perd `plan`+`interval`** à l'inscription (`register/page.tsx` jette la query).
- **Onboarding obligatoire contournable** sur /profil, /follows, /fil, /u, /compte (le check `onboarded` n'est que sur /home,/carnet,/onboarding). Déplacer le check dans `(app)/layout.tsx`.

**Légal**
- **Garantie remboursement incohérente** : CGU = **30 jours**, tout le reste du site = **7 jours**.
- **CGU renvoie vers la plateforme ODR/RLL européenne fermée depuis le 20/07/2025** (lien mort + voie de recours inexistante).

**Modération (fil)**
- **Un modérateur ne peut pas lire la file de signalements** : la policy `reports_select_own_or_mod` gate sur `is_ambassador` (jamais migré vers `is_moderator`). John (seul modo, non-ambassadeur) voit une file vide.
- **`moderatorDeleteComment` n'est câblé à aucune UI** → impossible de supprimer un commentaire abusif depuis l'interface (seulement les posts).

**Paiement**
- **Désynchro « Actif » (UI) vs `current_tier` (accès réel)** : un abonné dont `current_period_end` est périmé (webhook de renouvellement manqué) voit « Actif » mais perd l'accès payant, silencieusement. (Aujourd'hui ce sont les comptes seed, mais le mécanisme est fragile pour un vrai client.)

**Profil**
- **La liste de départements du `/profil` omet 06/11/13/30/59/2A/2B** (présents à l'onboarding) → un Méditerranéen/Nordiste/Corse qui sauve son profil **remet `home_department` à NULL** = exactement le bug de l'incident `/fil`. `profil/profile-form.tsx:8-18`.
- **Labels de fréquence morts** sur `/onboarding/fini` et `/home` (clés `hebdomadaire/quotidienne/saisonniere` ≠ DB `weekly/daily/seasonal`) → le chip fréquence n'apparaît jamais pour 7 profils sur 11.

---

## 🟡 MOYEN (7, résumé)
- `/spots` se présente en « annuaire complet en France » (4 dépts réels).
- RPC `get_my_catches_breakdown` / `get_my_catch_stats` acceptent un `uid` arbitraire, exécutables par `anon` → agrégats des prises publiques d'un tiers (REVOKE anon).
- **En-têtes de sécurité quasi absents** (pas de CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy ; X-Powered-By exposé) → ajouter un bloc `headers()` dans `next.config.ts`.
- **`<link rel=canonical>` absent** sur accueil, /carte, /tarifs, /techniques, /contact, pages légales.
- Onboarding non forcé hors /home,/carnet (doublon du high).
- Pas d'upload d'avatar (avatar_url affiché partout mais jamais modifiable).
- `display_name` utilisé comme nom prioritaire mais **jamais collecté** (toujours NULL → fallback username).

## 🟢 BAS (14, extraits)
CTA « Voir un carnet exemple » → /auth/register ; CTA gratuits tantôt login tantôt register ; liens CGU/Confidentialité du footer **auth** en `href="#"` (morts à l'inscription = enjeu consentement) ; bouton « Renvoyer » qui ne renvoie pas ; règles mot de passe dupliquées ; pas de validation date future / poids mini sur le carnet ; `catch_visible_geom` & `get_my_catches_breakdown` à durcir (mig. 026 prête, non appliquée) ; `/fil/[non-côtier]` → login (anon) au lieu de 404 ; compteur de signalements inopérant + pas d'unique sur `reports` ; libellé département non trimmé dans UserCard ; success Stripe = IDOR mineur (session_id non scopé) ; re-Checkout possible en `past_due` (doublon sub) ; pas de skip-link a11y ; dates de MAJ légales incohérentes ; délai support 24h vs 48h.

---

## ✅ Vérifié SAIN (et fausses alertes levées)
- **Routes `/dev/*` + `/api/dev-test` = 404 en prod** (double garde NODE_ENV) — pas de fuite. (Fausse alerte initiale.)
- **Sitemap exact** : 410 URLs, **38 spots** (pas 31/1156 — erreur du 1er résumé). Dynamique, à jour.
- **PWA complète** (manifest + 5 icônes + SW + /offline + cycle de mise à jour propre).
- **Pages d'erreur** : 404 avec header/footer + vrai statut, error.tsx, global-error.tsx avec capture Sentry.
- **Pages légales complètes** (SIRET/SIREN réels, hébergeurs LCEN, RGPD détaillé, plus aucune mention « médiateur » résiduelle).
- **Pivot « fil 100 % gratuit » réellement en place** : aucun reste de gating tier, rate-limit anti-spam actif (trigger backstop), **aucune fuite de coords dans le fil** (la vue n'expose pas geom).
- **RLS catches** correcte (pas d'écriture cross-user, photos scopées au dossier user, floutage des catches OK).
- **Secrets Stripe** strictement serveur (`server-only`), webhook signé + idempotent.
- **Réglementation pêche** (bar/lieu jaune 2026) sourcée et **exacte** vs Légifrance.

---

## Plan de remédiation proposé (ordre)
1. **C1 + C2 (fuite coords + gating RPC)** — un seul chantier « durcir l'accès aux spots » : jitter réel de `geom_public` + recalcul des 38, REVOKE `geom` à anon, gating poussé dans les RPC, `/api/spots/nearby` tronqué serveur. **Bloquant avant toute promo des spots.**
2. **C3 (delete_my_account)** + audit de dérive migrations vs schéma prod.
3. **Copy mensongère** (27 dépts, export GPX, « complet en France ») + **grammaire SEO** (Le/La/L' espèces) — rapide, gros impact crédibilité.
4. **Légal** (remboursement 7 vs 30 j, retrait ODR).
5. **Fuite `/carnet/[id]`** + **onboarding gating** + **redirect/next** + **profil liste départements** (anti-régression incident).
6. **Modération** (policy reports `is_moderator`, câbler delete commentaire).
7. **SEO duplicate `/peche`**, en-têtes sécurité, canonicals.
8. Le reste (bas/info) au fil de l'eau.

## Reste de l'audit (non couvert ici)
- **Couche clic live** : prompt Claude-in-Chrome fourni (à dérouler par John, 4 comptes) — nécessite des comptes payants pour Local/Itinérant.
- **Phase B** : suite E2E Playwright « clique tout par tier » (à construire, exécution CI).
