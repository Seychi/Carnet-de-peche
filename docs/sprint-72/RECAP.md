# Sprint 72 — RECAP
## « Alertes par port » : on te prévient la veille quand TES conditions arrivent sur TON spot

> Exécuté le 2026-07-02 (ultracode : A ∥ C1 → B → C2 ∥ D ∥ E → 3 revues adversariales ; session interrompue puis reprise par cache workflow, zéro perte).
> Branche `sprint-72` (depuis `main` post-S70). **Migration 106 APPLIQUÉE + PROUVÉE en prod** (matrice 17/17 en rollback, `docs/sprint-72/research/matrix-106.md`), `lib/types.ts` régénéré, `package.json` intact, **106b reste libre** pour un fix éventuel.
> **VERIF : 915/915 tests Vitest (~137 nouveaux), tsc 0 erreur, ESLint 0, build OK, QA fumée locale `next start` verte.** Non poussé (ton GO).

---

## Bloc 0 — Ancrage (docs/sprint-72/research/anchor.md)

Deux décisions structurantes, prouvées avant d'écrire :
- **Le moteur est greffé dans le cron `recfishing-reminders` (17:00 UTC = 18h/19h Paris), PAS dans `personal-window`** (07:00 UTC, calcule AUJOURD'HUI : mauvais créneau pour « la veille au soir pour DEMAIN »). Pas de 5e cron (contrainte plan répétée S40→S67), `vercel.json` inchangé, legacy intact.
- **Aucun coefficient de marée n'existe dans le code** (invariant honnêteté S49 : `tide_coefficient` toujours null). Le « coef ≥ 90 » du brief est inexécutable tel quel → l'équivalent honnête est le **marnage MESURÉ** du lendemain avec les seuils de façade S49 (Manche > 9 m, Atlantique > 5 m, Méditerranée jamais). Si tu veux un vrai coef un jour : chantier données SHOM, hors sprint.

Le score de fenêtre décomposé existait déjà (`FishingWindow` S6/S19 : solunar 0.40 / marée 0.35 / vent 0.25 + raisons FR) et les tendances perso S22 fournissent des justifications descriptives réelles. Rien n'a été réinventé.

## Bloc 1 — Migration 106 (appliquée + prouvée prod, version 20260702131434)

- **`favorite_spots`** : PK (user_id, spot_id), FK cascade ×2, index spot_id, **cap 10/user** (trigger BEFORE INSERT, message FR `max_favorite_spots`), RLS CRUD own-only ; l'INSERT exige en plus que le spot soit **visible par l'appelant** (impossible de favoriser un spot invisible).
- **`alert_settings`** : table dédiée own-only, `alerts_enabled` **default false** (opt-in RGPD), `channel_push`/`channel_email` default true, `alert_threshold` smallint default 70 CHECK 50-90.
- **`alerts_sent`** (journal de dédup) : PK (user_id, spot_id, window_date), select own **sans aucune policy d'écriture** (insert authenticated → 42501 prouvé ; le moteur écrit en service-role).
- **RPC `get_favorite_spot_coords()`** : coords précises des spots favorisés (toutes sources, approved, department trimmé à la source), **EXECUTE service_role uniquement** (authenticated → 42501 prouvé).
- `notifications_type_check` re-posé avec le type **`spot_alert`** (liste fermée 29 types).
- Matrice 17/17 : 11e favori refusé, cross-user bloqué (3 tables), 42501 sur écritures interdites, threshold hors bornes refusé, **cascade RGPD prouvée** (delete user → purge 3 objets, `delete_my_account` inchangé). Advisors : aucun nouvel ERROR (+2 WARN search_path même classe que le pattern maison).

## Bloc 2 — Le moteur (lib/alerts/ + greffon cron)

- **`lib/alerts/`** pur et testé à blanc (types, décision, message, scoring overlay, signal grande marée) + **`engine.ts`** (I/O service-role) + greffon best-effort strict dans la route (un échec n'affecte jamais RecFishing/co-pêchage).
- Batch sans N+1 : optés-in en 1 requête → favoris en 1 requête → coords en 1 RPC → journal du lendemain en 1 requête → boucle user fail-soft, `current_tier` 1×/user max, forecast mémoïsé par spot (2 users même spot = 1 pipeline).
- **Garde-fous** : quiet hours 21h-7h Paris (court-circuit avant toute requête) ; **1 alerte max/user/jour** (meilleur candidat : perso > générique > score ; journal `alerts_sent` pour les re-runs) ; journal écrit **après le 1er canal réussi** (pas d'alerte fantôme) ; **budget temps 40 s** (arrêt propre + compteur `truncated`, les restants sont servis au run suivant) ; timezone Europe/Paris partout.
- **Perso vs générique** : perso = historique suffisant (≥ 3 prises, seuil S22) **ET au moins une tendance coïncidente avec la fenêtre** (fix revue, cf plus bas) ; justification descriptive (« 6 de tes 7 prises renseignées tombent en marée descendante »), jamais prédictive, jamais un % inventé. Générique = cold start uniquement, marnage mesuré + label explicite **en tête du message** (« Alerte générique grande marée (marnage 9,7 m). Logue tes prises pour la personnaliser. »), heures PM/BM calées par `tide_calibration` quand un port de référence existe.
- Canaux : in-app (`spot_alert`, pattern actor_id NULL) → push web (morts tolérés, purge auto) → email (contrat WS E). PostHog `alert_sent` {kind, channel, spot_id, score} par canal servi + **UTM `utm_source=spot_alert&utm_medium=push|email|inapp`** sur tous les liens.

## Bloc 3 — UX

- **Étoile favori** (fiche spot + popup carte, tous tiers) : 44 px, `aria-pressed`, état par la FORME pleine/contour (daltonien-safe), anonyme → login avec `?redirect`. Cap 10 → toast FR honnête.
- **Liste des favoris** sur `/profil` (n/10 VRAI, cf revue) ; **réglages** sur `/notifications` : master switch default OFF, canaux, curseur 50-90 en mono, spots surveillés. **Découverte = teaser honnête** (étoile active, alertes verrouillées, CTA /tarifs, zéro faux score) ; l'activation est AUSSI refusée côté serveur (`current_tier` dans l'action, l'opt-out reste libre).
- **`/home`** : carte « Ta prochaine fenêtre à [spot] » quand une alerte existe pour aujourd'hui/demain (RLS own, ScoreRing avec le score réel, label distinct perso vs générique).
- **`/tarifs`** colonne Local : « Alerté la veille quand TES conditions arrivent sur TON spot favori ».

## Bloc 4 — Email (Resend + React Email)

- `lib/email/spot-alert.tsx` : `sendSpotAlertEmail(payload)` → boolean, ne throw jamais, no-op sans clé, **opt-out email global S26 respecté EN PLUS du canal** (`getEmailRecipient`), désabonnement un clic (`/unsubscribe?token=`).
- Template DA v2, objet « Demain 06:10 à [spot] : tes conditions » (ou « : grande marée »), badge « D'après ton carnet » vs label générique explicite, CTA fiche spot avec UTM. Previews HTML : `docs/sprint-72/research/email-preview-{perso,generique}.html`.

## Revues croisées (3 lentilles) et correctifs appliqués

| Finding | Sévérité | Correctif |
|---|---|---|
| ★ Alerte « perso » possible SANS tendance coïncidente (overlay calculé puis ignoré) : copy « tes conditions » mensongère | important ×2 (sécurité + correctness) | Garde dans l'engine : perso exige `overlay.kind === 'perso'` (≥ 1 tendance matchée), sinon **silence** (jamais de retombée générique) + test dédié (riche du soir vs fenêtre du matin → rien) |
| Budget < 60 s intenable à l'échelle 100 users × 10 favoris (coupure Vercel silencieuse) | important (préventif) | **Time-box 40 s** : arrêt propre, compteur `truncated` loggé et exposé, re-run idempotent. Backlog avant grosse vague : préfetch des contextes avec concurrence bornée |
| Seuils de façade dupliqués (S49 vs S72, divergence silencieuse possible) | mineur | Seuils + set Manche **exportés de `lib/notifications/big-tide`** et importés par le signal S72 : une seule source de vérité |
| Teaser Découverte trop promissif (« les alertes partiront dès que tu passes Local ») | mineur | « tu pourras activer les alertes dès que tu passes Local ou Itinérant » (opt-in default OFF) |
| Label « générique » troncable dans le fil de notifs (milieu de preview_text) | mineur | Label déplacé **en tête** du body générique |
| Tap targets 36 px sur les switches du panneau | mineur | `min-h-11` (44 px) sur SwitchButton + lien teaser |
| Compteur N/10 faux avec favoris fantômes (spot dépublié = slot irretirable) | mineur | Compteur = total réel des lignes ; les fantômes s'affichent « Spot indisponible » **avec bouton de retrait** |
| Preview email « vent NO 12 km/h » sur-promettait une direction que le moteur n'envoie pas | mineur | PreviewProps alignés sur la sortie réelle |
| Toast avec chemin brut « sur /tarifs » | mineur | « Essai 7 jours depuis la page Tarifs. » |

**Limites connues, assumées et documentées** (options « documenter » des revues) :
- Deux exécutions **simultanées** du cron peuvent doubler la livraison (la PK protège le journal, pas l'envoi en vol) → ne pas déclencher le cron à la main pendant le créneau du run planifié (17:00-17:05 UTC).
- Cap 10 favoris : une course du MÊME user peut le dépasser de 1-2 (backstop pattern maison, l'utilisateur ne peut s'attaquer qu'à lui-même).
- L'in-app est le canal de base non désactivable en v1 (seuls push/email ont un toggle).
- `alert_clicked` = `$pageview` filtré UTM (soumis au consentement cookies côté client).

## VERIF (preuves)

- `pnpm test` → **915 tests / 0 échec** (dont ~137 nouveaux S72 : engine 23, décision/message/scoring 64, route cron, actions 20, email, contrat migration 12, big-tide signal).
- `npx tsc --noEmit` → 0 ; ESLint 0 ; `lint-copy-dashes` → 17 occurrences = baseline S70 inchangée (zéro ajout S72).
- `pnpm build` → OK. QA fumée `next start` local : `/tarifs` affiche la vitrine, `/notifications` anonyme → 307 login?redirect, étoile « Ajouter aux favoris » rendue sur une vraie fiche spot, /, /carte, /spots en 200.
- Migration : SEULE la 106 (fichier + prod), package.json/pnpm-lock intacts, `lib/types.ts` régénéré (diff = les 4 nouveaux objets uniquement).
- Anti-régression : blocs RecFishing/co-pêchage du cron inchangés (tests), `personal-window` non touché, aucune coordonnée dans notif/push/email (test dédié), gating Découverte prouvé par test.

## Reste manuel John (post-sprint)

1. **Merge `sprint-72` → `main`** + déploiement (dis-le moi, je m'en charge).
2. **QA 2 comptes en prod** (critère Bloc 3) : Itinérant active tout en < 1 min depuis une fiche spot ; Découverte peut mettre en favori et voit le teaser propre.
3. **Déclencher le cron une fois** (hors 21h-7h Paris, PAS entre 17h00 et 17h05 UTC) : `curl -H "Authorization: Bearer $CRON_SECRET" https://www.carnet-de-peche.com/api/crons/recfishing-reminders` → vérifier `body.spotAlerts`, la notif in-app, la ligne `alerts_sent`, l'email. Puis logs Vercel J+1 (durée < 60 s).
4. **Activer les alertes sur TON compte** + 2-3 fondateurs → première vague réelle.
5. **PostHog** : insight funnel `alert_sent` (par kind/canal) → `$pageview` filtré `utm_source=spot_alert` groupé par `utm_medium`.
6. **Email** : ouvrir `docs/sprint-72/research/email-preview-{perso,generique}.html` + un envoi réel dans Gmail clair/sombre.
7. Décisions en attente : cadence 17:00 UTC gardée (18h/19h Paris selon saison) — dis-moi si tu préfères 15:00 UTC ; toggle in-app v2 ; stretch courants SHOM **non fait** (le sprint n'a pas respiré).
