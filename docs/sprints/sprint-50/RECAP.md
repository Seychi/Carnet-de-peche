# Sprint 50 — RECAP
## « Communauté vivante » (co-pêchage v2) — DERNIER de la roadmap correctifs+enrichissements

> Exécuté le 2026-06-28 (ultracode, 3 agents + 2 fixes lead). **Pas poussé.** Migrations **087/088/089/090 appliquées en prod** + `lib/types.ts` régénéré. Muscler le collaboratif.

---

## Décisions John
- **D1** = loguer à plusieurs en **pré-remplissage léger, SANS FK** (chacun ses coords privées).
- **D2** = « sur place » = **colonne `on_site_at` + Realtime** (RPC `mark_on_site`).
- **D3** = sortie près de toi gatée par `notification_prefs` (résolu : prefs existent depuis 49).
- **D4** = avis = note 1-5 + **commentaires nominatifs publics**.

## Migrations
- **087** : table `outing_reviews` (rating 1-5, comment ≤500, unique). RLS : INSERT par membre d'une sortie passée sur un autre membre, SELECT public, DELETE own.
- **088** : `outing_proposals_for_viewer` expose `host_level` (debutant/intermediaire/expert), security_invoker préservé.
- **089** : `outing_messages.photo_path` ; bucket **PRIVÉ `outing-photos`** (owner-scoped) ; `outing_participants.on_site_at` + RPC `mark_on_site` + Realtime ; `reports.target_type` + `outing_message`.
- **090** : `notifications_type_check` + `nearby_outing` (21 types).

## Fait
- **WS A — matching enrichi** : `DEPARTMENT_ADJACENCY` (24 dépts côtiers, frontières réelles, symétrie testée 19/19) + `neighborDepartments()` ; `getDeptProposals(dept, {level, includeNeighbors})` ; filtre niveau + case « dépts voisins » dans `OutingFilters` (état dans l'URL). **Zéro coordonnée** (dépt + area_label only).
- **WS B — réputation** : `createOutingReview`/`deleteOutingReview`/`moderatorDeleteOutingReview` + `getUserReputation` ; `OutingReviewDialog` (note + commentaire) sur sortie passée ; « {moyenne}/5 · N avis » + avis nominatifs publics (D4) sur le profil. **Descriptif, zéro classement.**
- **WS C — loguer à plusieurs** : « Loguer cette sortie » → `/carnet/nouvelle?outing=&dept=&species=` ; `CatchForm` lit les params + pré-remplit (dept/façade + espèce + note « sortie partagée »). **SANS FK**, coords privées de chacun.
- **WS D — chat v2** : photo en **bucket privé** (`uploadOutingPhoto` + sharp EXIF strip + `getOutingPhotoSignedUrl` gatée appartenance, **jamais publique**) ; « Je suis sur place » (`mark_on_site` + Realtime sur `outing_participants`) ; signaler un message (`reportOutingMessage`) + retrait modérateur (service-role).
- **WS E — sortie près de toi + fil mesurées** : `proposeOuting` notifie les pêcheurs du dépt (event-driven, best-effort, gaté pref `nearby_outing`, 0 coord) ; fil « Les plus belles prises mesurées du coin » (`catches_for_viewer` public + `measured_length_cm`, geom-free, **descriptif pas un classement**).

## Fixes lead
1. **Gotcha 'use server' (re-export)** : `actions.ts` ré-exportait `uploadOutingPhoto`/`getOutingPhotoSignedUrl` depuis `outing-photo.ts` → un fichier 'use server' ne peut PAS ré-exporter (build cassé). Rebranché les imports directs sur `outing-photo.ts`.
2. **Câblage board** : `app/(app)/sorties/page.tsx` lit maintenant `?level/?neighbors` → `getDeptProposals` + passe `isModerator` à `ProposalCard` (sinon les filtres et le retrait modérateur étaient inertes).

## VERIF (gate verte)
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm test` **582 verts** (+8 adjacence) · `pnpm build` **OK**.
- **Sécurité (code relu)** : `getOutingPhotoSignedUrl` ne signe **qu'après** vérif hôte/accepté (sinon null) ; bucket `outing-photos` **privé**, **0 `getPublicUrl`**, EXIF strippé serveur (sharp) ; matching dépt only ; fil mesurées sans `geom_visible`/`lat`/`lng`, `privacy='public'` ; report `outing_message` ; nearby best-effort ; chat RLS fail-closed. **Advisors baseline** (2 SDV, `outing_reviews` RLS, vue co-pêchage invoker).
- **Honnêteté** : avis/fil **descriptifs, zéro leaderboard** ; copy sans tiret cadratin.

## ⚠️ Suivis (non bloquants)
1. `on_site_at` ne couvre que les **participants acceptés** (l'hôte n'a pas de ligne `outing_participants`). Présence de l'hôte = gap v1 mineur.
2. `nearby_outing` plafonne à 500 destinataires/dépt (OK beta).

## Reste manuel John
- Relire, merger `sprint-50` → `main`, déployer, QA (chat photo privée, avis, fil mesurées, sortie près de toi, sur place, loguer à plusieurs).
- ✅ **Roadmap correctifs+enrichissements (42→50) TERMINÉE.** Prochaine grande étape = **phase mobile** (gate `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`).

---

> **Invariants tenus** : pas de push · migrations + regen types · CHECK types liste complète · **zéro coordonnée** (matching/chat/loguer/fil) · **chat photo bucket privé** + signed URL gatée appartenance + EXIF strippé · chat RLS fail-closed · réputation/fil **descriptifs, zéro classement** · notif best-effort · copy sans tiret cadratin.
