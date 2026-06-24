# Sprint 24 — RECAP (Conformité & Confiance, Chantier C)

> Exécuté le 2026-06-23 (mode ultracode/xhigh). Branche `sprint-24`, **non mergée, non déployée, aucune migration appliquée en prod** (consigne respectée). Suite de `docs/sprint-24/BRIEF.md`.

---

## Décisions tranchées par John (avant code)

| Décision | Choix retenu |
|---|---|
| **D-C1** Périmètre RecFishing | **Complet** : détection + bandeau + récap pré-rempli + lien profond + **notification de rappel** + flag `declared`. Pas d'auto-déclaration. |
| **D-C2** Tier IA / maille | Vérif maille **gratuite** ; reco IA = quota gratuit puis Local+ (sans objet ce sprint, IA différée). |
| **D-C3** Fishial.AI | **NO-GO / différé** → WS-C abandonné. Le sprint livre **A + B + D**. |
| **D-C4** Profondeur moteur | **Tout structuré** : maille façade + marquage + **quotas/jour + fenêtres de fermeture** structurés, sourcés/datés. |

---

## Ce qui a été fait

### WS-A — Moteur réglementation (maille façade-aware) ✅
- **`lib/regulation/`** — module client-safe, léger (pas de prose) :
  - `data.ts` : **source structurée unique** `SPECIES_REGULATION` (20 espèces) — maille par façade, marquage, **quotas journaliers** + **fenêtres de fermeture** structurés, `source` + `verifiedAt`. Valeurs = copie exacte des fiches espèces (vérifiées Légifrance, sprint 23).
  - `facade.ts` : `getFacadeForCatch({department, lat, lng})` (département prioritaire → géoloc → **null si inconnu**) + `facadeFromLatLng` (classifieur Med/Atlantique sans collision).
  - `index.ts` : `getMinSize`, `checkSize`, `isMarquageRequired`, `getDailyQuota`, `getClosedWindows`, `isClosedSeason`, `resolveSpeciesSlug` (pont prise `dorade_royale` ↔ fiche `dorade-royale`).
  - Tests : **52** (cohérence data↔fiches sur les 20 espèces + 6 espèces × 2 façades + mismatch slug + façade inconnue + quotas + fermetures).
- **Fin du bug `LEGAL_SIZES`** : supprimé de `CatchForm.tsx`, remplacé par `checkSize` **façade-aware**. Badge « Sous-taille » + auto-relâché désormais corrects ; **aucun verdict si la façade est inconnue**. Rappel marquage ajouté.
- **Badge réglementaire** sur `CatchCard` (« Sous-maille » pour un poisson conservé sous la maille) et **carte Réglementation** sur la fiche spot (maille par espèce cible + repères quota/fermeture/marquage) + **section Réglementation** sur la page détail prise.

> ⚠️ **Correction du brief (à connaître)** : le brief disait « un bar 38 cm Manche n'est PLUS sous-taille après le fix ». **C'est inexact** — la maille Manche/Atlantique est **42 cm**, donc un bar de 38 cm **EST** sous-taille. Le vieux `bar:36` était **sous-protecteur** (laissait passer 36-41 cm) ET flaguait à tort un bar de **30 cm légal en Méditerranée**. Le fix corrige les deux. (Test de non-régression écrit en conséquence.)

### WS-B — Helper RecFishing ✅
- **`lib/regulation/recfishing.ts`** : référentiel **espèces sensibles daté/sourcé** (arrêté 7 nov. 2025 mod. 1er avril 2026, mer.gouv.fr 22/05/2026). `isDeclarable(species, facade)`, liens profonds (web UE + iOS + Android), parcs marins Med.
  - **Corrections au brief** (recherche officielle) : **thon rouge RETIRÉ** de RecFishing (01/04/2026) → absent ; **pas de liche/pompano** → c'est la **dorade coryphène** ; **maquereau ajouté** (Atlantique/Manche). Liste loggable déclarable chez nous = **bar, lieu jaune, maquereau** (Atlantique/Manche). En Méditerranée, aucune de nos espèces loggables n'est sensible (dorade rose/coryphène pas au carnet).
- **`RecfishingNotice`** (page détail prise) : bandeau « à déclarer sous 24 h », **récap pré-rempli à recopier** (espèce/taille/date-heure/lieu/quantité/technique/devenir), **boutons d'ouverture** RecFishing, bouton « j'ai déclaré ». **Aucune promesse d'auto-déclaration** (on s'authentifie via EU Login, pas d'API tierce). No-kill inclus.
- **Migration `050_recfishing.sql`** (fichier seul) : colonnes `declared` / `declared_at` / `recfishing_reminded_at` ; type notif `recfishing_reminder` ; RPC `get_pending_recfishing_catches` (service-role).
- **Action `markCatchDeclared`** (owner-gated) + **cron `/api/crons/recfishing-reminders`** (CRON_SECRET, fenêtre 48 h, façade tranchée côté serveur). Déclaré dans `vercel.json` (17:00 UTC).
  - ⚠️ **Plan Hobby = 1 exécution/jour max par cron** → le rappel-notif arrive au plus tard le lendemain ; le **bandeau** sur la fiche prise reste le rappel immédiat.

### WS-D — Correctif marées (Méditerranée honnête) ✅
- `lib/solunar/scoring.ts` + `config.ts` : sous un **marnage journalier < 0,3 m** (Med ~0,15 m), la marée devient **non discriminante** → son poids (0.35) est **retiré et renormalisé** sur astro+vent (au lieu d'imposer `tide=0` → faux « 0/35 »). Seuil d'étale rendu **relatif au marnage** (plafonné 0,1 m → **Atlantique inchangé**).
- **Fix TZ** : `scoreTide` lisait `getUTCHours()` alors que les `tidePoints` sont en **heure locale Paris** → décalage 1-2 h du créneau. Corrigé via `getParisHour`.
- `ScoreBreakdown` reçoit désormais les **poids effectifs** + le **marnage** : affiche « Marée plate (marnage 0,15 m) · peu déterminante » au lieu de « 0/35 ». Somme du score cohérente.
- Tests : Med plat (neutralisé, renormalisé) + Atlantique fort (marée pleinement comptée) + ISO de test réalignées sur l'heure locale.

---

## Vérification (workstream VERIF)

- **`pnpm test` : 420 tests verts** (37 fichiers ; +31 vs baseline).
- **`tsc --noEmit` : 0 erreur.**
- **`next lint` : 0 warning / 0 erreur.**
- **`next build` : OK** (toutes les routes compilent, dont le nouveau cron).
- Anti-régression : `grep LEGAL_SIZES components` = **0** ; aucun code Fishial / clé client (NO-GO) ; récap RecFishing **ne fuit pas** de geom (montre le lieu, pas lat/lng) ; Atlantique non impacté par la renormalisation.

### Revue indépendante adversariale (5 agents séparés, lecture seule)

| Dimension | Verdict | Action |
|---|---|---|
| Exactitude réglementaire | concerns | mitigé (voir ci-dessous) |
| Copy + données RecFishing | **ok** | aucune (verbes conformes, liste exacte, thon rouge absent, no-kill inclus) |
| Correctif marées (Atlantique) | **ok** | + fix wrap minuit |
| Sécurité (GPS/RLS/secrets) | concerns→**corrigé** | **blocker CHECK corrigé** |
| Intégration & régression | blocker→**corrigé** | **blocker CHECK corrigé** |

**🔴 BLOCKER trouvé ET corrigé** (confirmé contre le code) : la migration 050 reconstruisait `notifications_type_check` à partir de la liste de 037, ce qui **supprimait** `spot_approved`/`spot_rejected` ajoutés par la **043** → aurait cassé les notifs de modération de spots (live). **Corrigé** : le CHECK de 050 inclut désormais les 8 types (043 + `recfishing_reminder`). *(050 n'avait PAS été appliquée en prod — la revue avait sur-interprété un commentaire « appliquée par John » qui était une instruction future.)*

**Autres correctifs appliqués suite à la revue :**
- `scoreTide` robuste au **passage de minuit** (fenêtres 22h–01h ne tombent plus en NO_DATA à tort) + test de non-régression.
- `getFacadeForCatch` : un département **non côtier** ne produit plus un faux « Manche/Atlantique » (retombe sur géoloc/inconnu).
- `RecfishingNotice` affiche désormais **source + date** de la liste (AC WS-B).
- Note Med enrichie : **maille locale parfois plus stricte en parc marin** (mitige le risque « bar 35 cm affiché légal en Med alors que 42 cm dans le Golfe du Lion »).
- Commentaire trompeur « on clipe » retiré de `index.ts`.

**Non corrigé (assumé, non bloquant)** : arrondi d'affichage ±1 pt sur la décomposition du score (double `round`, cosmétique, pré-existant).

---

## ⚠️ À valider par John (exactitude légale — données structurées)

Remontées par l'extraction des fiches (chaque point est une **incertitude**, pas une erreur connue) :

1. **Mailles locales dérogatoires des parcs marins** non modélisées (`minSizeCm` = une valeur/façade) — signalées en prose seulement : Golfe du Lion (bar 42, dorade royale/pageot 25-30, rouget/oblade 20, congre jusqu'à 120). À arbitrer : modéliser les mailles zonées ?
2. **Chinchard** : interdiction de la pêche de loisir en **zone CIEM VIIIa** (golfe de Gascogne / Vendée, règlement UE 2024/257) — **non représentable** dans le modèle façade/mois actuel (interdiction de zone, pas de mois). Risque de masquer une règle majeure → à traiter (mapping zone CIEM → dépt) si pertinent.
3. **Lieu jaune** : incohérence de date interne `verifiedAt` (21/06 vs 12/06 cité dans la prose de la fiche) — recopié `21/06/2026`.
4. **Quotas en zone parc** (oblade 10/j Golfe du Lion encodé ; congre/pageot/rouget mentionnent un quota **non chiffré** → non encodés, honnête).
5. La liste RecFishing **évolue chaque année** (déjà 2 changements en 2026) — re-vérifier avant chaque release.

---

## Reste manuel John (post-sprint)

1. **Appliquer la migration 050** en prod (`declared` + RPC + type notif), puis **régénérer `lib/types.ts`** + `get_advisors`. ⚠️ Rappel `migration repair` 025/026/027/044 (dérive d'historique) avant tout `db push`.
2. Vérifier les points « À valider » ci-dessus (exactitude légale).
3. Ajouter le **2ᵉ cron** confirmé côté Vercel (le `vercel.json` le déclare déjà) ; vérifier que `CRON_SECRET` couvre les deux crons.
4. (Si reprise de l'IA plus tard) créer le compte Fishial + clé serveur — voir recherche pricing en tête de session.
5. Relire → merge `sprint-24` → `main` → déploiement. `deploy-watch` + `qa-chrome` (maille, rappel RecFishing, marée Med).

---

*Sprint exécuté en parallèle (recherche/extraction/revue en agents, edits en boucle principale). Décision d'archi : la donnée réglementaire structurée vit dans `lib/regulation/data.ts` (léger, client-safe) plutôt que dans `EspeceContent.regulation` (qui aurait alourdi le bundle client du CatchForm) — cohérence garantie par test. Écart au brief assumé et documenté.*
