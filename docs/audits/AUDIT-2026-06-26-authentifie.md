# 🔐 AUDIT COMPLÉMENT — Surfaces authentifiées / payantes / modérateur (2026-06-26)

> Complément à `docs/audits/AUDIT-2026-06-26.md` (qui couvrait l'anonyme + le gratuit).
> Réalisé **connecté au compte de John (Seychi)** — tier **Itinérant**, **modérateur**. QA live en **lecture/observation** : aucune action de modération réelle, aucun changement d'abonnement/profil, aucune prise créée.
> ⚠️ Rappel statut : **le Sprint 35 n'est pas encore poussé** (confirmé par John) → les bugs M1 (géocodage) et M2 (heures de soleil) de l'audit principal sont **toujours visibles en prod**, c'est normal (en attente de push), pas une régression.

---

## ✅ Validé — l'expérience payante + le moat fonctionnent

**Carte tier Itinérant** (ce que le gratuit ne voit pas) :
- Filtres **déverrouillés** (espèces, techniques, structure, **« Tous les départements »**, difficulté, provenance dont « Importés OSM »).
- **157 spots** (catalogue complet, pas le plafond 71 du gratuit).
- Popup spot **non floutée** : **coordonnées précises** (ex. « Corniche de Gourmalon — 47.1086°N · 2.1078°O ») + **score 84/100** + prochain créneau. Aucun paywall.
- Panneau **Couches** complet : Spots, Zones de prises (heatmap, « gratuit »), **Ton score** (perso), **Fond marin** (bathy + opacité), **Qualité par espèce**. Bathymétrie EMODnet chargée (attribution OK).

**★ Le moat « scoring perso » est RÉEL et fonctionne** (impossible à voir avec le compte de test vide du 1er audit) :
- Carnet de John = **8 prises** → `/carnet` affiche « 8 prises, et la carte commence à te connaître », stats par **espèce / technique / mois**, record (Bar 71 cm), taux de relâche 62,5 %.
- **TES TENDANCES** détaillées et segmentées : 86 % au printemps (6/7), 71 % le mercredi (5/7), 57 % par vent léger (4/7), 43 % la nuit (3/7), 40 % en marée descendante (2/5) — chacune avec un niveau de confiance.
- Cockpit `/home` : « CE QUE TON CARNET EN DIT » reprend ces tendances + score générique **décomposé honnêtement** (Astro/Marée/Vent, avec reweight quand la marée est plate). 
- **Conclusion** : le différenciateur n°1 marche de bout en bout. Ce qui manque (cf C2 audit principal) n'est **pas** la couche perso mais la **donnée communautaire** (heatmap « zones de prises » vide faute de prises publiques d'autres pêcheurs).

**Modération** (`/moderation`, accès modérateur confirmé) :
- File **Signalements** + onglet **Spots en attente**. 2 signalements de test affichés (motif, type, auteur du signalement, extrait) avec actions **Supprimer le post / Ignorer**. *(Observé — non actionné.)*

**Abonnement** (`/compte/abonnement`) :
- **ITINÉRANT — Actif**, prochain prélèvement **22 juin 2027** (plan annuel). **Gérer mon abonnement** (Portail Stripe) + **Changer de plan** + **dernières factures** (21 mai 2026, 0,00 €) + préférences **emails de relance** (Activés, avec la mention honnête « les emails liés à ton compte arrivent toujours »). *(Vue seule — pas d'ouverture du portail Stripe, pas de changement.)*

**404** : page custom et soignée (« Cette page a glissé du hameçon » + Header/Footer + CTA).

---

## 🟠 Nouveaux bugs (visibles uniquement connecté / payant)

### B1 — Couche « Fond marin » (EMODnet Seabed Habitats) échoue
Activer **Fond marin** sur `/carte` déclenche **8 erreurs console** :
- `AJAXError: Failed to fetch (ows.emodnet-seabedhabitats.eu) (0): …GetMap…layers=eusm2025_subs_full…` (×6)
- `[MapView] Erreur MapLibre: The source image could not be decoded.` (×2)

La sous-couche **« nature du fond » (Seabed Habitats WMS)** ne charge pas (la bathymétrie « profondeur » semble OK — attribution affichée). C'est une **feature payante Itinérant dégradée**. Statut HTTP `(0)` = échec réseau/CORS côté navigateur (pas un blocage CSP, qui est en report-only). **À confirmer** : panne/instabilité EMODnet vs CORS/endpoint à corriger côté intégration (peut nécessiter de proxifier le WMS, comme `/api/seabed` le fait déjà pour la bathy).

### B2 — React #418 (hydration mismatch) sur l'app shell authentifié
Erreur `Minified React error #418` (×2) observée en naviguant dans l'espace connecté. #418 = **le HTML rendu côté serveur ne correspond pas au client** (texte). Cause la plus probable : le **bandeau d'instruments à heures « live »** (PM/BM, créneau, soleil) rendu différemment serveur (UTC) vs client (heure locale). **Possiblement la même cause racine que M2** (gestion timezone) → un même correctif pourrait régler les deux. À épingler (quel composant exactement).

### M2 — confirmé + diagnostic affiné (heures de soleil)
Sur `/home` pour Nice (06) : **« Soleil 07:50–23:16 »** (réel ~05:58 / ~21:25). Même **décalage systématique de +2 h** qu'à Brest (08:19/00:23 vs 06:17/22:14). → **Ce n'est PAS un swap lat/lng** (qui donnerait des heures aléatoires par lieu) mais un **bug de timezone** : l'offset été Europe/Paris (+2 h) est appliqué en trop (formatage d'une `Date` déjà locale, ou UTC re-décalé). **Affiner WS B du brief Sprint 35 en ce sens.**

---

## 🟡 Mineur
- Léger écart d'affichage : `/carnet` annonce « 8 prises » mais « TES TENDANCES » calcule sur **7 prises** (1 prise sans données suffisantes / bredouille exclue du calcul). À harmoniser ou expliciter.

---

## 👉 Implications pour le Sprint 35 (pas encore poussé — fenêtre pour intégrer)
1. **WS B (M2)** : préciser le diagnostic = **+2 h offset timezone systématique** (pas lat/lng). Et **vérifier si le correctif timezone fait aussi disparaître le React #418** (B2) sur le bandeau d'instruments.
2. **Ajouter un item B1** (ou backlog) : réparer/proxifier la couche **Fond marin EMODnet Seabed Habitats** (ou la désactiver proprement si EMODnet est instable, pour ne pas spammer la console d'un Itinérant).
3. Après push S35 : **re-vérifier en prod connecté** M1 (autocomplétion ville), M2 (heures soleil Nice/Brest), en-têtes HTTP, et que #418 a disparu.

*Aucune écriture / action destructive pendant cet audit. Compte de John inchangé.*
