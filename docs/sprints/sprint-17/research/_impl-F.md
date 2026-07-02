# Bloc F — Implémentation tarifs vs réalité
> Sprint 17 · 2026-06-22 · COPY/marketing uniquement — zéro logique de gating touchée.

---

## Fichiers modifiés

### 1. `app/(marketing)/tarifs/pricing-cards.tsx`

**F.1 — Mode hors ligne retiré du plan Local (ligne 44 originale)**
```
- { text: 'Mode hors ligne (carte + marées 7 jours)' },
```
Supprimée de la liste `local.features`. La feature n'existe pas (SW = cache network-first des pages visitées, pas de préchargement proactif). Pas de gating touché — la ligne était purement cosmétique.

**F.5 — "push" retiré des notifications Local (ligne 45 originale)**
```
- { text: 'Notifications push créneaux optimaux' },
+ { text: 'Notifications créneaux optimaux' },
```
Le SW ne gère pas le Push API. Les notifs Bloc B sont in-app uniquement. Le mot "push" est retiré ; l'avantage (notifications créneaux optimaux) reste dans l'offre Local.

**F.4 — "Stats avancées" retirées du plan Local (ligne 46 originale)**
```
- { text: 'Stats avancées + photos HD illimitées' },
+ { text: 'Photos HD illimitées' },
```
`CatchStatsDetailed` est rendu sans vérification de tier dans `carnet/page.tsx` — c'est une feature gratuite non gatée. La retirer de l'argumentaire payant évite une promesse trompeuse. "Photos HD illimitées" est conservé (différenciateur légitime si le plan Discovery est éventuellement limité).

**F.2 — Bathy SHOM → EMODnet (ligne 58 originale)**
```
- { text: 'Bathymétrie SHOM premium' },
+ { text: 'Bathymétrie détaillée (EMODnet)' },
```
La fiche spot affiche déjà "Profondeur (bathymétrie réelle EMODnet)". La source est correcte maintenant.

**F.3 — Multi-spots → mono-spot (ligne 59 originale)**
```
- { text: 'Itinéraires GPS multi-spots' },
+ { text: 'Itinéraire GPS vers chaque spot' },
```
Le bouton "Itinéraire GPS" sur la fiche spot ouvre une URL vers un seul spot (Google Maps/Plans/Waze mono-destination). Pluriel et "multi" retirés.

---

### 2. `app/(marketing)/page.tsx`

**F.1 — "hors-ligne" retiré du teaser tarifs (ligne 522 originale)**
```
- score et le hors-ligne : à partir de 4,90 €/mois.
+ le score : à partir de 4,90 €/mois.
```

**F.1 — "hors-ligne" retiré de la card Local du teaser (ligne 537 originale)**
```
- desc: "La carte complète de ton département : coords précises, score 0-100, filtres, hors-ligne.",
+ desc: "La carte complète de ton département : coords précises, score 0-100, filtres.",
```

**F.2 + F.3 — Bathy + itinéraire corrigés dans la card Itinérant du teaser (ligne 543 originale)**
```
- desc: "Tous les départements côtiers, bathymétrie premium, itinéraires GPS multi-spots.",
+ desc: "Tous les départements côtiers, bathymétrie détaillée (EMODnet), itinéraire GPS vers chaque spot.",
```

---

### 3. `app/(marketing)/tarifs/page.tsx`

**F.1 — FAQ hors ligne remplacée (lignes 90-91 originales)**
```
- q: "L'app fonctionne-t-elle hors ligne ?"
- a: 'Oui, à partir du plan Local. Tu télécharges ton département : carte vectorielle, marées 7 jours, fiches espèces. Aucune donnée mobile nécessaire au pied de la falaise.'
+ q: "L'app fonctionne-t-elle sans connexion ?"
+ a: "Le mode hors ligne est en cours de développement. Pour l'instant, l'app se souvient des pages et fiches spots récemment visitées — pratique dans les zones à faible réseau."
```
La question est honnête sur l'état actuel (cache visite, pas de préchargement département). La formulation "en cours de développement" est neutre et vraie.

**F.1 — "hors-ligne" retiré du sous-titre hero tarifs (ligne 124 originale)**
```
- au mètre près : la carte complète, le score, le hors-ligne.
+ au mètre près : la carte complète et le score.
```

---

## Invariants respectés

- **Gating de tier** : aucun conditionnel `tier`, aucun `getUserTier()`, aucune RPC touchée. Modifications = copy dans les objets `features[]` et strings inline.
- **Floutage GPS** : non concerné par ce bloc.
- **Modèle social** : non concerné par ce bloc (Bloc E séparé).
- **RLS** : aucune migration, aucune requête DB.
- **`catches_for_viewer` / `spots_for_viewer`** : non touchées.
- **Logique Stripe Checkout / Customer Portal** : non touchée (`PlanCta` inchangé).
- **`CatchStatsDetailed`** dans `carnet/page.tsx` : non touché — on a retiré la promesse marketing sans gater la feature (Option A du plan, décision John).

---

## Ce qui reste hors périmètre Bloc F

- F.4 Option B (gater réellement `CatchStatsDetailed`) : décision John = ne pas casser le gratuit. Non fait.
- Photos HD : si Discovery est éventuellement limité en résolution, "Photos HD illimitées" dans Local deviendra un vrai différenciateur — à vérifier au moment du gating.
