# QA parcours GRATUIT (Découverte) — Bloc F (F1)

> **Statut : ⏳ EN ATTENTE du compte Découverte.** Ce workstream démarre quand John
> connecte un compte **sans abonnement ET sans essai en cours** (les audits du
> 2026-06-25 n'ont jamais vu le gratuit : tous les comptes testés étaient en
> Itinérant/essai). Tant que le compte n'est pas fourni, ce fichier est le **plan de
> test** ; il sera complété avec les preuves (captures + repro) une fois le compte
> branché.

## Méthode
- Connecteurs : **qa-chrome** (navigation réelle, captures desktop + mobile, console,
  réseau) + **supabase-guard** (corréler le floutage attendu : vues `*_for_viewer`,
  `geom_public`, gating RPC de tier).
- Compte : Découverte (tier `discovery`), **lecture seule** — ne rien acheter, ne pas
  lancer d'essai réel.

## Checklist (statuer OK / KO avec preuve)

### 1. `/carte` (gratuit)
- [ ] **Gating 3 spots/dépt** : un anonyme/Découverte ne voit que 3 spots populaires par
      département (cf `NearbyPanel` TIER_LIMITS : `discovery = 5` côté « autour de moi »,
      et bandeau « 3 spots gratuits par département »). Vérifier la cohérence du nombre
      réellement affiché vs la promesse tarifs.
- [ ] **Floutage** : aucun marker précis pour un spot floutable — la position vient de
      `geom_public` (≈ 500-900 m), pas de GPS exact.
- [ ] **Absence de score** : pas de score 0-100 visible (réservé payant). Le `SpotPopup`
      gratuit affiche le message de gating « Coords précises et fiche complète réservées
      aux abonnés ».
- [ ] **Paywall couches premium** : « ton score », bathymétrie/fond, qualité détaillée →
      gatés (Local/Itinérant). La heatmap communautaire reste un teaser gratuit.

### 2. Fiche spot (gratuit) — `/spots/[slug]`
- [ ] Coords = `geom_public` (≈ 500-900 m), **pas de GPS précis**, pas d'itinéraire GPS
      exact.
- [ ] Score / « meilleurs moments » gatés (teaser flouté + lien tarifs).

### 3. `/tarifs` (gratuit)
- [ ] Les CTA Local / Itinérant affichent **« Démarrer l'essai 7 j »** (et **NON**
      « Gérer mon abonnement » — ce dernier n'apparaît que pour un abonné/essai en cours).
      ⚠️ Point explicitement signalé par l'audit (vu « Gérer » sur un compte Itinérant).

### 4. Régressions transverses à re-vérifier en gratuit
- [ ] Aucune fuite GPS (anon ne lit pas `spots.geom` / `catches.geom` — verrous 028b/041).
- [ ] `/carnet/nouvelle` : sélecteur 26 espèces OK en gratuit (Bloc C) — loguer une seiche
      de test puis la supprimer.
- [ ] Composer du fil : INP < 200 ms après Bloc E (re-mesurer **hors overlay**).

## Findings
_(à compléter — tout KO ouvre un finding chiffré pour la roadmap)._
