# Sprint 25 — RECAP (Lancement & Amorçage, Chantier D + G2)

> Exécuté le 2026-06-24 (ultracode). Branche `sprint-25`, **code-complet, NON mergé, NON déployé, aucune migration ni seed appliqué en prod** (consigne respectée). Suite de `docs/sprint-25/BRIEF.md`.

---

## Décisions tranchées par John (avant code)

| Décision | Choix retenu |
|---|---|
| **D-D1** Amorçage | **Beta fondateurs + import agressif** (seul). PAS de seed démo, PAS de relâche k-anon → pas de colonne `is_demo`. |
| **D-D2** Invitation | **Codes d'invitation simples** (table `invite_codes` + gate d'inscription env-flaggé). |
| **D-D3** GPS co-pêchage | **Département + libellé libre, AUCUNE coordonnée** → zéro 4ᵉ surface de fuite. |
| **D-D4** Gating co-pêchage | **Gratuit tous tiers + anti-spam** (`can_post_in_department` + rate-limit). |

> ⚠️ Numérotation : le brief disait « prochaine = 050 », mais **050 est pris** (sprint 24). Migrations sprint 25 = **051** (outings), **052** (invite_codes), **053** (co-pêchage).

---

## Ce qui a été fait

### WS-B — Log de la bredouille ✅
- **Migration `051_outings.sql`** : table `outings` (RLS **fail-closed** owner-only, **aucune coordonnée** — département seulement) + `catches.outing_id` (FK nullable, `ON DELETE SET NULL`, append-only) + RPC `get_my_outing_stats` (sorties, % bredouille, prises/sortie — **ne touche pas** 007/008).
- `lib/outings/` (schema zod + `createOuting` + `getMyOutingStats`), composant **OutingForm** + route **/carnet/sortie**, **OutingStats** branché sur le carnet. 6 tests.
- **Isolation** : une sortie n'écrit jamais dans `catches`/heatmap/feed/scoring (table séparée).

### WS-A — Amorçage (beta fondateurs + import) ✅
- **Migration `052_invite_codes.sql`** : table `invite_codes` (RLS **fail-closed total — aucune policy**) + RPC `consume_invite_code` (atomique, `service_role` only).
- **Gate d'inscription** dans `signUpWithPassword` : piloté par l'env **`INVITE_ONLY`** (OFF par défaut → inscription ouverte inchangée ; ON → code requis, consommé via service_role). Champ « Code d'invitation » ajouté au formulaire (optionnel côté UI).
- **Bulk import mis en avant** (levier #1 time-to-value) : payoff sur l'onboarding final + état vide de `/home` (« importe tes prises → dès 3 prises, tes tendances s'activent »).

### WS-C — Time-to-value à froid ✅
- **Fiche spot** : `SpotActivitySection` ne fait plus `return null` à vide → état « Sois le premier à loguer une prise ici » + CTA (pas de fausse promesse).
- **Fil dépt** : `EmptyFeed` variant `dept` gagne un CTA (« Trouver des pêcheurs de ton coin »).
- **/carnet/nouvelle** : hint première prise (si 0 prise) + lien « Sorti bredouille ? ».
- **Onboarding final** : encart payoff + CTA import.

### WS-D — Co-pêchage (G2) — 🔴 sous garde GPS stricte ✅
- **Migration `053_outings_cofishing.sql`** : `outing_proposals` + `outing_participants` — **AUCUNE colonne geom/lat/lng** (D-D3) ; **RLS fail-closed** (proposals : insert host+`can_post_in_department`, update/delete host only ; participants : insert self 'requested' sur sortie 'open', SELECT masque les demandes en attente d'autrui) ; **vue `outing_proposals_for_viewer` security_invoker** (affichage host+compteur, pas de geom) ; **rate-limit** trigger (5 sorties/24h) ; CHECK `notifications.type` (+`outing_join`/`outing_accepted`) + `notifications.target_type` (+`outing`) + `reports.target_type` (+`outing`) **reconstruits à partir des listes complètes** (vérifiées en prod — pas de régression).
- `lib/cofishing/` (schema + actions `proposeOuting`/`requestJoin`/`respondToParticipant`/`cancelOuting`/`withdrawJoin` + queries) ; UI **/sorties** (composer + board dépt + RSVP + gestion hôte). Notifs via `createNotification` (service_role). 5 tests.

---

## Vérification (workstream VERIF)

- **`pnpm test` : 437 tests verts** (+18 vs baseline). **`tsc --noEmit` : 0 erreur. `next lint` : 0 warning. `next build` : OK** (routes `/sorties` + `/carnet/sortie` compilées).
- Aucune migration ni seed appliqué en prod (fichiers seulement ; seules des lectures `execute_sql` ont servi à vérifier les noms de contraintes).

### Revue indépendante adversariale (3 agents, axe GPS/RLS critique)

| Dimension | Verdict | Action |
|---|---|---|
| Floutage GPS + RLS (co-pêchage) | concerns→**corrigé** | **bug self-accept corrigé** |
| Anti-fake + social-free + isolation bredouille | **ok** | aucune (tout confirmé propre) |
| Migrations + intégration | **ok** | + reformulation copy |

**🔴 BUG RLS MAJEUR trouvé ET corrigé** (confirmé par 2 agents) : la policy `outing_participants_update_scoped` laissait un participant updater **sa propre ligne** sans contrainte sur `status` → il pouvait passer `requested`→`accepted` par appel PostgREST direct et **s'auto-inscrire en contournant l'hôte**. **Corrigé** : UPDATE désormais **réservé à l'hôte** (`outing_participants_update_host`) ; le retrait participant passe par DELETE (déjà couvert). `respondToParticipant` (déjà gaté par RLS host-only) renvoie « action non autorisée » à un non-hôte.

**Autres correctifs appliqués :**
- Garde-fou anti-coordonnée côté serveur : `proposeOuting` rejette un motif lat/lng tapé en texte libre dans `area_label`/`notes` (cohérent D-D3) + 2 tests.
- Copy `/sorties` reformulée : ne suggère plus un partage GPS in-app inexistant (« RDV calé en privé, hors appli »).

**Confirmé OK par la revue (non bloquant) :** anti-fake (aucune donnée démo non étiquetée, k-anon K=3 intact), `INVITE_ONLY` fail-open (pas de lock-out), co-pêchage **sans aucun check de tier**, bredouille **isolée** (n'écrit jamais dans catches/heatmap/feed/scoring), **zéro colonne de coordonnée** sur les 3 tables co-pêchage/outings (pas de 4ᵉ surface de fuite).
**Notes (non bloquant)** : `catches.outing_id` est une colonne « en attente » (le câblage prise↔sortie viendra plus tard) ; lecture des participants `accepted` visible aux authentifiés (nécessaire au compteur via la vue `security_invoker`, bénin, non-GPS).

---

## Reste manuel John (post-sprint)

1. **Appliquer les migrations** 051 + 052 + 053 en prod (ordre), puis **régénérer `lib/types.ts`** (sortira les usages `untyped()` des casts) + `get_advisors`.
2. **Lancer la beta fondateurs** : créer des codes (`INSERT INTO invite_codes (code, max_uses) VALUES ('FONDATEUR-XX', 1);` en service-role/SQL), passer **`INVITE_ONLY=true`** dans l'env Vercel quand tu veux fermer l'inscription publique. Inviter de vrais pêcheurs à loguer publiquement (objectif : ≥3 prises + 3 pêcheurs/cellule pour allumer la heatmap k-anon).
3. (Optionnel) Ajouter une entrée **/sorties** dans la nav (la page existe, pas encore liée au menu).
4. Relire → merge `main` + déploiement. deploy-watch + qa-chrome (time-to-value compte neuf, co-pêchage, **passe adversariale floutage**).
5. (Doc) Corriger `CLAUDE.md §2` : migrations → 053, prod = 1 post/4 follows, `released` default `false`.

---

## Décisions récapitulées
- **D-D1** beta fondateurs (pas de seed démo) · **D-D2** codes d'invitation · **D-D3** dépt+label sans geom · **D-D4** co-pêchage gratuit + anti-spam.

*Sprint exécuté en mode ultracode/xhigh. Patterns réutilisés : `can_post_in_department` (022/032), rate-limit triggers (022), `createNotification` service_role (037), vue security_invoker (031). Helper `untyped()` confiné à la couche data pour coder contre les migrations 051+ non encore appliquées (à retirer après regen des types par John).*
