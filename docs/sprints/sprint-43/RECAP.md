# Sprint 43 — RECAP
## « Le curage » (la file de vérification des spots importés)

> Exécuté le 2026-06-28 (ultracode). **Pas poussé** (John relit + merge). Migration **073 appliquée en prod** + `lib/types.ts` régénéré. Le sprint livre l'OUTIL ; le curage un par un est le travail ops continu de John.
>
> **Décisions** : D1 = curer = VÉRIFIER (un seul geste, pas de mode « enrichir sans vérifier »). D-coord = OUI à la RPC modérateur-only (afficher le pin OSM pour le vérifier). D2 = façades maigres d'abord (filtrable). D3 = pas de re-scoring immédiat (le spot apparaît curé tout de suite, coloré au prochain cron).

---

## Fait (code complet, VERIF verte)

### WS A — action de curage + schéma + constantes
- **`curateSpot(spotId, input)`** (`app/actions/spots.ts`, modèle `moderateVerifySpot`) : garde auth + uuid + `viewerIsModerator`, valide `curateSpotSchema`, **UPDATE atomique** = champs enrichis (name?, structure, species[], techniques[], difficulty, hazards[], visibility?, access_notes?, description?, geom si coord corrigée) **+ `source='curated'` + `verified=true` + `verified_at`/`verified_by` + `moderation_status='approved'`** dans le même appel (contrainte `spots_verified_only_curated` respectée). Imports OSM ont `created_by NULL` → pas de notif. revalidatePath /moderation + /carte.
- **`lib/spots/curate-schema.ts`** : espèces sur la **liste complète du carnet** (26, `catchSpeciesEnum`, pas le max(6) de la proposition) + `difficulty` (1-5) + `hazards` + `visibility` + `latitude`/`longitude` optionnels (correction). `hazardEnum`, `spotVisibilityEnum`. Messages zod FR.
- **`HAZARDS_LABELS`** (`lib/labels.ts`, 8 dangers : ressac, vagues scélérates, courants forts, roches glissantes, marée montante rapide, rochers immergés, accès falaise, zone isolée).
- **Migration 073** `get_pending_import_location(p_spot_id)` : RPC SECURITY DEFINER **gatée `is_moderator()`** (dans le WHERE), `source='imported' AND pending` uniquement → renvoie lng/lat. Vérifiée : **0 ligne sans modérateur**, anon exclu, EXECUTE authenticated. Risque assumé faible (modérateur-only, imports pending, **coords OSM publiques** : l'invariant anti spot-burning des coords user n'est pas concerné).

### WS B — onglet « Imports à curer » + formulaire
- **3ᵉ onglet `?tab=imports`** (`moderation/page.tsx`, garde `is_moderator` intacte) : imports `pending`, **filtrable par département** (façades maigres en tête, tri par compte croissant), **paginé** (25/page), **compteur de progression** « X curés / Y restants » + compteur d'onglet.
- **`CurateSpotForm.tsx`** : réutilise les chips `<Controller>` + `SpotLocationPicker` de `ProposeSpotForm`. Affiche le **pin OSM** (fetch RPC 073 au montage) sur le fond satellite → tu confirmes la position telle quelle, ou tu déplaces le point pour corriger (lien « Revenir à la position OSM »). Espèces (26), difficulté, dangers (chips daltonien-safe), visibilité. Pré-rempli depuis les données OSM. **Un seul bouton « Valider et publier »** (D1) + « Rejeter » (`moderateRejectSpot`) + navigation « suivant ». Fallback dept-centré si la RPC ne renvoie rien.
- **`ImportsCurationList.tsx`** : liste dépliable, ouvre le form, enchaîne l'import suivant après curage/rejet, `router.refresh()`.

---

## VERIF (gate verte)
- `pnpm typecheck` 0 · `pnpm lint` 0 · `pnpm test` **574 verts** · `pnpm build` OK · copy-dash 0 dans les fichiers du sprint.
- **Sécurité** : `curateSpot` modérateur-only (garde serveur + RLS `spots_update_moderator`) ; source+verified posés ENSEMBLE (CHECK filet) ; RPC 073 modérateur-only vérifiée (0 ligne sans modérateur) ; advisors = **2 `security_definer_view`** (la RPC 073 est une fonction definer, pas une vue → bucket WARN function-executable, pas de nouvelle ERROR) ; floutage GPS (geom_public) + gating 3/dépt intacts après publication.
- **Anti-régression** : rendu carte non touché ; les 2 onglets modération existants intacts ; `moderateVerifySpot`/`moderateRejectSpot` réutilisés tels quels.

---

## Comment curer (toi, en continu)
1. `/moderation?tab=imports` → choisis un département (façades maigres d'abord).
2. Pour chaque import : le pin OSM s'affiche sur le satellite. **Vérifie la position** (confirme ou déplace), renseigne **espèces + techniques + structure + difficulté + dangers + accès + description**, puis **« Valider et publier »** → le spot devient curé + vérifié + approuvé, sort du backlog, et apparaît sur la carte (coloré au prochain run du cron de scoring).
3. Import non pêchable / doublon → **« Rejeter »**. « Suivant » pour enchaîner.

Backlog au lancement : **942 imports** (Finistère 222, Morbihan 123, Bouches-du-Rhône 104, Côtes-d'Armor 87…).

## Reste manuel John
- Le **curage lui-même** (sourcer + vérifier + renseigner chaque spot), façade par façade, étalé dans le temps. L'outil est là ; la qualité vient de ta vérification un par un.
- Merger `sprint-43` → `main`, déployer. (Rappel sprint 42 : forcer un run du cron pour colorer les curés.)

---

> **Invariants tenus** : pas de push · **curer = enrichir + vérifier dans le même UPDATE** (curated+verified+approved) · pas d'invention (le modérateur saisit + vérifie la coord, RPC OSM publique modérateur-only) · réutilise l'existant (moderateVerifySpot, chips ProposeSpotForm, RLS spots_update_moderator, SpotLocationPicker) · floutage GPS + gating intacts · copy sans tiret cadratin.
