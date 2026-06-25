# 🔬 Audit profond (fonctionnel + destructif) — Carnet de Pêche

> Réalisé le **2026-06-25**, sur la **prod live** `www.carnet-de-peche.com`, en navigateur réel (Chrome), connecté sur un **2e compte** (`@Seychi12`) + lecture du code `main`.
> Demande de John : *« audit encore plus profond où tu testes toutes les fonctionnalités (y compris la suppression de message). »*
>
> **Complète** `AUDIT-2026-06-25-fonctionnel-seo.md` (audit 1, parcours + SEO). Ici : **flux destructifs réellement déclenchés** (création → suppression), social avancé, contrôle d'accès, + 2 findings techniques nouveaux (a11y, perf).

---

## 0. Périmètre & honnêteté méthodo

**Réellement testé en live (connecté @Seychi12)** : `/compte/abonnement`, `/carnet`, **fil `/fil/06` — création d'un post de test PUIS suppression complète** (avec modale de confirmation), `/sorties` (co-pêchage), `/moderation` (test d'accès en non-modérateur). Console lue à chaque étape.

**⚠️ Le « compte gratuit » n'en était pas un.** Le compte connecté (`@Seychi12`) est en **essai Itinérant** (« Essai en cours, il reste 7 jours », démarré le 24/06). Il voit donc **tout en premium**. → **L'expérience GRATUITE réelle (floutage GPS, gating 3 spots/dépt, paywall carte, badge score côté Découverte) reste NON testée.** Il faut un compte **sans abonnement ET sans essai en cours**. C'est le trou n°1 à combler (cf §4).

**Non testé cette session (à faire, cf §4)** : gating gratuit, onboarding d'un compte neuf, auth en déconnecté, édition/suppression d'une **prise** et d'un **commentaire** (le schéma de suppression est prouvé sur les posts), upload photo, Checkout Stripe LIVE, suppression de compte, signalement, onglets `Tes follows` / `Toute la côte`. **Flux à effet de bord volontairement non déclenchés** sauf le post de test (créé puis supprimé immédiatement).

---

## 1. Verdict

**La couche sociale et destructive est solide.** Le flux **création → suppression d'un post fonctionne proprement** : feedback (toast « Posté ! » / « Post supprimé. »), **insertion et retrait optimistes** (pas de reload), et **modale de confirmation explicite** (« Cette action est irréversible. Le post et ses commentaires seront définitivement supprimés. » → Annuler / Oui, supprimer). Le co-pêchage marche de bout en bout, le contrôle d'accès modération est correct.

**3 nouveaux problèmes** sortent de ce pass profond, tous **rapides à corriger** :
1. 🟠 **a11y** — la modale de confirmation (Radix `DialogContent`) **n'a pas de `DialogTitle`** → inaccessible aux lecteurs d'écran (warning console ×2).
2. 🟠 **perf** — interaction sur le **composer du fil = INP ~460 ms** (Core Web Vital « médiocre »).
3. 🟠 **i18n** — le bug d'article « **du** Alpes-Maritimes » de l'audit 1 est **systémique** (titres fil **+** sous-titre co-pêchage « dans **le** Alpes-Maritimes »).

Et le rappel qui prime : **le parcours gratuit n'est toujours pas vérifié.** Avant de refaire la page marketing (qui poussera surtout des inscriptions **gratuites**), il faut s'assurer que ce qu'elles voient en arrivant tient debout.

---

## 2. Nouveaux findings (deep)

### 🟠 1 — Modale de suppression sans `DialogTitle` (accessibilité)
**Repro** : `/fil/06` → supprimer un post → la modale s'ouvre, et la **console émet 2×** :
`DialogContent requires a DialogTitle for the component to be accessible for screen reader users.` (Radix UI).
**Impact** : un lecteur d'écran n'annonce pas le titre de la boîte de dialogue → confirmation de suppression inaccessible. Probablement le **même composant Dialog** réutilisé ailleurs (suppression de prise, modale post). **Fix** : ajouter un `<DialogTitle>` (masqué via `VisuallyHidden` si non désiré visuellement) sur chaque `DialogContent`. **Effort : S.**

### 🟠 2 — Composer du fil : INP ~460 ms
**Repro** : `/fil/06` → cliquer/écrire dans le composer « Quoi de neuf sur le bord ? » → un relevé INP signale *« Event handlers on this element blocked UI updates for 459.7 ms »* sur la `<textarea>`.
**Impact** : 460 ms > seuil « poor » (200 ms) de l'INP — interaction qui « accroche » sur la page sociale la plus utilisée. À **profiler** (handler `onChange`/auto-resize, re-render du fil à la frappe ?). **Fix** : debounce / `useTransition` / isoler le re-render. **Effort : M.** *(À confirmer hors overlay de mesure.)*

### 🟠 3 — Bug d'article département **systémique** (confirme audit 1 #2)
**Repro** : `<title>` `/fil/06` = « Fil **du** Alpes-Maritimes (06) » ; sous-titre `/sorties` = « Sorties à plusieurs dans **le** Alpes-Maritimes ». Devrait être « **des** Alpes-Maritimes ».
**Portée** : ce n'est pas qu'un titre — c'est **partout** où un nom de département est collé à un article (fil, co-pêchage, et probablement fiches/SEO). Pluriels (Côtes-d'Armor, Landes, Bouches-du-Rhône, Pyrénées-Orientales/-Atlantiques → « des ») et élisions (Hérault, Aude, Eure → « de l' / dans l' »). **Fix** : une fonction centrale `articleDept(nom, prep)` dans `lib/geo/departments.ts`, appliquée partout. **Effort : S/M.**

---

## 3. Vérifié OK (live)

- ✅ **Suppression de post** : toast + retrait optimiste + **modale irréversible claire**. Comportement exemplaire (hors a11y ci-dessus).
- ✅ **Publication de post** : toast « Posté ! », insertion optimiste, composer (Photo + Prise).
- ✅ **Co-pêchage `/sorties`** : liste des sorties, « Proposer une sortie », **demande de jointure de bout en bout** (« Demande envoyée » / Retirer), design **privacy-first** (« aucune coordonnée n'est partagée ici — RDV calé en privé »).
- ✅ **Contrôle d'accès modération** : `/moderation` en non-modérateur → **404 propre** (« Cette page a glissé du hameçon »), pas de fuite d'existence ni d'accès. Bien.
- ✅ **Gating des tendances** : le carnet affiche « Encore 1 prise pour débloquer tes tendances » → seuil d'échantillon honnête (pas de stat bidon sur 1 prise).
- ✅ **Essai Itinérant** : page abonnement claire (« il reste 7 jours d'essai », prochain prélèvement daté, facture 0 €).

---

## 4. Toujours NON testé → à couvrir

| Zone | Pourquoi pas fait | Comment closer |
|---|---|---|
| **Gating gratuit** (floutage, 3 spots/dépt, paywall, badge score) | Compte connecté = essai Itinérant (premium) | **Compte Découverte sans essai** → rejouer carte + fiche spot + tarifs |
| **Onboarding compte neuf** (6 écrans, validation pseudo temps réel) | Comptes déjà onboardés | Créer un compte vierge |
| **Auth déconnecté** (login/register/reset) | Toujours connecté | Tester en navigation privée |
| **Suppression prise / commentaire** | Schéma prouvé sur les posts | Rejouer (probablement même modale → même a11y à vérifier) |
| **Upload photo, Checkout Stripe LIVE, suppression de compte, signalement** | Effets de bord / coût réel | QA dédiée sur compte jetable |

---

## 5. ✅ À FAIRE AVANT LA REFONTE MARKETING

> Logique : la nouvelle page va **amplifier** le funnel (surtout des inscriptions **gratuites**). L'amplifier avant d'avoir réglé les promesses fausses, le parcours gratuit et les bugs qu'elle héritera = gâcher la refonte. On solidifie le socle, puis on construit la vitrine.

**Bloquants (à régler avant) :**
1. **Vérifier le parcours GRATUIT en vrai** (compte sans essai) — la page enverra surtout des gratuits ; il FAUT savoir ce qu'ils voient. *(Préalable absolu.)*
2. **Honnêteté des promesses** *(audit 1 #3)* : remettre le label **« Exemple »** sur les mockups perso du hero + requalifier le badge « ⚡ Perso » (le score prédictif perso est neutralisé). La nouvelle page ne doit pas re-vendre un moat non livré.
3. **Carnet 6 → 26 espèces** *(audit 1 #1)* : trancher. La page criera « 26 espèces » ; aujourd'hui on ne peut en loguer que 6. Aligner (sélecteur + recherche) ou cadrer la promesse.
4. **Bug d'article département** *(#3 ci-dessus)* : fix centralisé — sinon la nouvelle page/SEO l'hérite.
5. **a11y modale `DialogTitle`** *(#1)* + **INP composer** *(#2)* : une page « 1M€ » se doit d'être accessible et fluide.
6. **`/techniques` meta ↔ page** *(audit 1 #6)* + **feedback de submit Nouvelle prise** *(audit 1 #4)*.

**Peut suivre la refonte (non bloquant) :** guides 5 → 20, vignettes guides, copy notif co-pêchage, spinner mini-carte, hygiène `CLAUDE.md`.

---

*Audit profond en navigateur réel sur la prod. Findings reproductibles. Le parcours gratuit reste le principal angle mort — à couvrir en priorité avant la refonte.*
