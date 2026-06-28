# Sprint 44 — RECAP
## « Cohérence & vérité » (correctifs features 37-40)

> Exécuté le 2026-06-28 (ultracode, 5 workstreams parallèles). **Pas poussé.** Migrations **075/076/077 appliquées en prod** + `lib/types.ts` régénéré.
>
> Objectif : que chaque feature 37-40 tienne sa promesse. 3 bugs 🔴 (fuite de données privées, feature fantôme, promesse mensongère) + 4 🟠 + lot 🟡.

---

## Décisions John (tranchées avant exécution)
- **D2** = valider l'ownership de **gear_id ET spot_id** (même trou).
- **D1** = **gate + upsell seulement** (pas de page de réglages push, ce serait sprint 49).
- **D4** = aligner la borne basse de `measured_length_cm` sur `size_cm` (10), garder une borne haute large (250).
- **D3** = exposer **`verified_at` seul**, libellé « par l'équipe » (pas d'identité `verified_by`).

## Migrations (appliquées + vérifiées en prod)
- **075** `get_spot_by_slug` : DROP + CREATE pour ajouter `verified_at` au retour (re-grant anon/authenticated). `verified_by` reste fermé.
- **076** : chat `outing_messages` INSERT gaté sur `status IN ('open','full')` sur les **deux branches** (hôte + participant) → écriture refusée dès `cancelled`/`done` ; SELECT inchangé (lecture seule du chat fermé). `outing_proposals_for_viewer` expose `species` (security_invoker préservé).
- **077** : index unique partiel `gear_items_dedup_idx` sur `(user_id, kind, lower(coalesce(brand,'')), lower(coalesce(model,'')), lower(coalesce(color,'')))` WHERE NOT archived (0 doublon existant).

## Fait par workstream

### WS A — 🔴 Boîte : fuite ownership + polish
- `lib/catches/actions.ts` : `assertGearOwnership` (SELECT scopé `id`+`user_id`) et `assertSpotAccessible` (SELECT `id` sur `spots`, s'appuie sur la RLS `spots_select_visible`), appelés **avant** l'insert ET l'update, refus retourné (pas swallowed). On ne lit que `id` (aucune colonne geom dé-verrouillée). En update, `null` = détachement explicite autorisé.
- Picker archivé en édition : l'item archivé déjà rattaché est ré-injecté dans la liste du form (reste sélectionné).
- Dédup UI dans `GearPicker` (clé kind+marque+modèle+couleur normalisée) : matche l'existant au lieu de créer un doublon ; l'index 077 backstop la DB.

### WS B+F — 🔴 Prise mesurée affichée + 🟠 sanitiser le partage
- Mesure affichée sur **détail / carte / ligne** (« Mesurée : X cm (réf. Y) », pastille quand `photo_verified_at`), distincte de la déclarée (« déclarée 60 / mesurée 62 » si écart). **Libellé « mesurée », jamais « vérifiée »** (vérifié : 0 occurrence en UI, seulement des commentaires-règle).
- Bornes `measured_length_cm` : 1-299 → **10-250** (D4), messages zod FR.
- `app/actions/share.ts` : `sanitizeLocationLabel` rejette toute coord (`LOOKS_LIKE_COORD`, source unique importée) → null (département seul), borné 80 car. Refine `noCoord` ajouté à la saisie. Partage geom-free.

### WS C — 🔴 Push honnête
- `EnablePushAlerts` prend `tier` : **gratuit → CTA upsell** « Passe en Local… » (jamais « Activer/Activées ») ; Local/Itinérant inchangé. Reflète exactement le gate serveur du cron.
- Signal **VAPID absente** surfacé (« indisponible pour l'instant »), plus de bouton mort. Pas de page de réglages (D1).

### WS D+E — 🟠 Marées cohérentes + 🟠 spot vérifié
- `TideChart` : offset appliqué au **ReferenceDot du graphe** et à la **grille** (plus seulement aux cartes texte) → heures PM/BM homogènes.
- Calendrier 7j (`spots/[slug]`) : heures calibrées par département (comme le bandeau live).
- **Note Méditerranée** (marnage faible) au lieu d'un blanc. Aucun coef de marée inventé.
- `verified_at` mappé + affiché : « **Vérifié le JJ/MM par l'équipe** » dans l'encart « Coordonnée vérifiée » (si non null). `verified_by` jamais exposé.

### WS G — 🟠 Co-pêchage
- `queries.ts` : `species` lu **directement** depuis la vue (fin du contournement 2-requêtes).
- Sortie annulée/passée : **gardée visible (grisée)** à ses membres, **chat en lecture seule** (input désactivé côté UI ; la RLS 076 refuse l'INSERT côté DB). Un tiers ne voit toujours rien.

---

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **574 verts (57 fichiers)** · `pnpm build` **OK**.
- **Honnêteté** : « vérifiée » absent des affichages de prise (commentaires only) ; push ne promet rien à un gratuit ; marées sans coef inventé.
- **Sécurité** : gardes ownership gear+spot en place (refus avant insert/update) ; `verified_by` non exposé ; chat RLS fail-closed + statut ; `LOOKS_LIKE_COORD` source unique (1 def + 2 imports) ; sanitize geom-free ; floutage GPS/gating intacts.
- **Advisors** : baseline exacte (2 `security_definer_view` = `catches_for_viewer` + `spots_for_viewer` ; `outing_proposals_for_viewer` = invoker). Aucune nouvelle alerte.
- **Copy** : 1 warning copy-dashes (`content/guides/…bretagne.mdx:93`, titre pré-existant **non touché** par ce sprint).

## ⚠️ Points à trancher / suivis (non bloquants)
1. **CatchForm.tsx** garde l'attribut HTML `min=1/max=299` (la vraie borne 10-250 est portée par zod, refus au submit). Resserrer l'attribut HTML = micro-tâche séparée. ⚠️ John : on resserre ?
2. **Statut `done`** des sorties n'est posé par rien (pas de cron) → « Passée » est dérivé de `planned_at` côté UI. Un cron qui passe réellement en `done` = enrichissement futur. ⚠️ John.
3. **Spot `subscriber`** : `assertSpotAccessible` autorise le rattachement si la RLS rend le spot visible (comportement par tier). Pas une fuite ; durcissement possible si on veut interdire le rattachement à un spot subscriber pour un gratuit. ⚠️ John.
4. **Grille marées** n'affiche que les heures paires (pré-existant) : l'extremum corrigé est snappé à la ligne paire la plus proche ; l'heure exacte vit dans les cartes texte + le calendrier. À valider visuellement.
5. Commentaire JSX obsolète dans `TideCalibrationNote.tsx` (dit « aucun offset » alors que l'offset est appliqué) — cosmétique, hors fichiers du sprint.

## Reste manuel John
- Relire, merger `sprint-44` → `main`, déployer, QA des 7 fixes (qa-chrome : mesure affichée, upsell push gratuit, heures marées cohérentes, fiche « vérifié le JJ/MM », partage sans lieu-dit, chat de sortie annulée en lecture seule).

---

> **Invariants tenus** : pas de push · migrations = nouveaux fichiers (075/076/077) + regen types · « mesurée » ≠ « vérifiée » · floutage GPS + gating intacts · partage/chat zéro coordonnée · scoring descriptif · copy sans tiret cadratin · RLS jamais désactivé.
