# Sprint 29 — Recherche réglementaire (Bloc 0) — INPUT unique des Blocs 1 & 2

> Recherche web sourcée + datée le **24/06/2026** (6 agents parallèles, 1/espèce). Source primaire = **Légifrance** (arrêté du 26 octobre 2012 modifié = tailles minimales pêche maritime de loisir ; arrêté du 17 mai 2011 modifié, complété le 30/12/2021 = marquage). Croisée avec DIRM Méditerranée/NAMO, FFPSA, tableaux spécialisés. **Aucune maille inventée** : `null` honnête là où l'espèce n'est pas listée.
> ⚠️ Ces valeurs sont la **copie exacte** à reporter dans `lib/regulation/data.ts` (`SPECIES_REGULATION`) ET dans `lib/especes/content/<slug>.ts` (`regulation.minSizeCm`/`marquage`) — le test de cohérence `regulation.test.ts` échoue à la moindre divergence.

## Table de synthèse (façades : MA = Manche-Atlantique, MED = Méditerranée)

| Espèce (slug) | dbKey | Latin | Maille MA (cm) | Maille MED (cm) | Marquage caudal | Quota nat. | Fermeture nat. | Confiance |
|---|---|---|---|---|---|---|---|---|
| barracuda | `barracuda` | *Sphyraena viridensis* | **null** | **null** | non | aucun | aucune | haute |
| tassergal | `tassergal` | *Pomatomus saltatrix* | **null** | **null** | non | aucun | aucune | haute |
| liche | `liche` | *Lichia amia* | **null** | **null** | non | aucun | aucune | haute |
| marbré | `marbre` | *Lithognathus mormyrus* | **null** | **20** | non | aucun | aucune | haute |
| lieu noir | `lieu_noir` | *Pollachius virens* | **35** | **null** | **oui** | aucun | aucune | haute |
| merlan | `merlan` | *Merlangius merlangus* | **27** | **null** | non | aucun | aucune | haute |

`null` = espèce **non listée** dans l'annexe de la façade = **pas de taille minimale réglementaire** (réponse honnête). Pour MED des espèces d'eau froide (lieu noir, merlan) : `null` = espèce **absente/non pêchée du bord** sur cette façade.

## Détail sourcé par espèce

### barracuda (*Sphyraena viridensis* / bécune) — pas de maille nationale
- **Maille : aucune (null/null)**, **noNationalSize**. Absent de l'annexe I de l'arrêté du 26/10/2012. **Marquage : non** (absent de la liste arrêté 30/12/2021). **Quota national : aucun**.
- ⚠️ **Local (à signaler en prose, pas en `minSizeCm`)** : Parc naturel marin du Golfe du Lion (66/11), arrêté préfectoral du 12/02/2024 → autorisation obligatoire (appli CatchMachine) + **taille locale 65 cm** + quota plafonné. Mesure **locale**, pas nationale.
- Reco non réglementaire : no-kill conseillé < 60 cm (sources pêche).
- Sources : Légifrance JORFTEXT000026582115 ; DIRM Méditerranée (tailles + PNM) ; arrêté marquage 30/12/2021 (préf. Loire-Atlantique) ; opalesurfcasting (PNM 65 cm).

### tassergal (*Pomatomus saltatrix* / bluefish) — pas de maille nationale
- **Maille : aucune (null/null)**, **noNationalSize**. Absent de l'annexe I (26/10/2012). **Marquage : non** (absent liste 17/05/2011 mod. 30/12/2021). **Quota : aucun** (ne pas confondre avec le quota du bar). **Fermeture : aucune**.
- Sources : Légifrance JORFTEXT000026582115 + JORFTEXT000024073619 + JORFTEXT000044807107 ; recoupé Fish-Alert, La Pêche Technique 2025, Opale Surfcasting.

### liche (*Lichia amia* / liche amie) — pas de maille nationale
- **Maille : aucune (null/null)**, **noNationalSize**. Absente annexe I (26/10/2012) + non couverte par règl. (CE) 1967/2006. **Marquage : non**. **Quota national : aucun**.
- ⚠️ **Local** : PNM Golfe du Lion → autorisation CatchMachine + **taille locale ~50 cm** + quota (~2/j) (arrêté préfectoral 12/02/2024). Local, pas national.
- Reco : maturité ~50-60 cm, no-kill conseillé sous 50 cm.
- Sources : Légifrance JORFTEXT000026582115 + JORFTEXT000024073619 (v. 2022-02-12) ; Surfcasting-Méditerranée ; Opale Surfcasting ; DIRM Méditerranée (PNM).

### marbré (*Lithognathus mormyrus*) — 20 cm Méditerranée uniquement
- **Maille : MA null / MED 20 cm**. Présent dans la **section Méditerranée** de l'annexe I (26/10/2012) à 20 cm ; **absent de la section Mer du Nord/Manche/Atlantique** → `null` MA (espèce essentiellement méditerranéenne, marginale en Atlantique sud-ouest). **Marquage : non**. **Quota/fermeture : aucun**.
- ⚠️ **Divergence tranchée** : opalesurfcasting affichait 23 cm (valeur isolée, **écartée**) au profit de Légifrance + Planète Mer + Surfcasting-Méditerranée qui convergent sur **20 cm**.
- Sources : Légifrance JORFTEXT000026582115 (annexe Med) ; Planète Mer ; Surfcasting-Méditerranée ; DIRM Méditerranée.

### lieu noir (*Pollachius virens*) — 35 cm Manche-Atlantique + marquage
- **Maille : MA 35 cm / MED null** (espèce d'eau froide Atlantique nord, quasi absente de Méditerranée, non pêchée du bord là-bas). **Marquage : OUI** — « lieu jaune/noir » figure explicitement dans l'annexe de l'arrêté du 17/05/2011 modifié (ablation partie inférieure nageoire caudale, avant débarquement). **Quota/fermeture nationale : aucun** (≠ lieu **jaune**, lui fermé jan-avr + quota — ne pas confondre).
- Sources : Légifrance JORFTEXT000026582115 (annexe I) + JORFTEXT000024073619 (marquage) ; DIRM NAMO ; recoupé Normandie-Appâts.

### merlan (*Merlangius merlangus*) — 27 cm Manche-Atlantique
- **Maille : MA 27 cm / MED null** (espèce d'eau froide, absente Méditerranée). **Marquage : non** (absent liste 17/05/2011 mod. 30/12/2021). **Quota/fermeture nationale : aucun** pour le loisir du bord. 27 cm = aussi la taille de référence UE Merlangius merlangus zones CIEM concernées.
- Sources : Légifrance JORFTEXT000026582115 (annexe I, version 14/01/2026) ; La Pêche Technique ; Opale Surfcasting ; arrêté marquage (merlan non concerné).

## Notes transverses
- **PNM Golfe du Lion** (barracuda 65 cm, liche 50 cm…) = **mesures locales préfectorales**, NON modélisées dans `minSizeCm` (une valeur par façade nationale). Cohérent avec le pattern existant (cf en-tête `lib/regulation/data.ts` + `getMarineParkNotice` sprint 24 qui affiche un avertissement Med gaté par département). → signalées **en prose** dans `regulation.items`, pas en chiffre national.
- Caveats de méthode : plusieurs PDF officiels (DIRM/PNM, annexes d'arrêtés) n'ont pas pu être ouverts directement (binaire) ; conclusions adossées à Légifrance (source primaire) + tableaux tiers concordants → confiance haute sur les valeurs nationales. Détail des quotas LOCAUX du PNM (barracuda/liche) à confirmer sur le mémento du Parc si l'app cible précisément cette zone — non bloquant (non national).
