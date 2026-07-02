# 🧭 Roadmap créative — sprints 31+ (après le cockpit)

> Écrite le 2026-06-24 (mise à jour : ajout des sprints « Prise vérifiée » et « Sentinelles de la côte »), en suite de `docs/ROADMAP-2026-H2-SUITE.md` et des audits du 24/06.
> État au moment d'écrire : nav reliée (S27), feel natif + fil sans footer (S28), Pôle Espèces v2 → 26 espèces (S29), cockpit « Aujourd'hui » + IA perso désempilée (S30).
> Esprit (demande John) : **être créatif pour la suite**, mais rester **ancré** (chaque idée s'appuie sur une brique qui existe déjà). Chaque sprint = thème · pourquoi · quoi · **angle créatif** · forme d'acceptation. `★` = priorité ; ⚠️ = décision John.

---

## Le fil rouge

Le produit est **profond et propre**. Il reste à actionner, dans cet ordre de valeur :
1. **Le remplir** (réservoir vide = tout le reste sonne creux). → S31.
2. **Le faire briller** (perçu : illustrations, perf, notifications qui ramènent). → S32-34.
3. **Le rendre fiable & défendable** (prises vérifiées, boucles communautaires, science citoyenne, conformité unique). → S35-38.
4. **Changer de plateforme** (mobile natif). → S39+.

Lanes **en parallèle** tout du long : **SEO/contenu** (César + éditorial) et **monétisation** (tuning du tunnel S26).

---

## ★ Sprint 31 — « Les Cent Premiers » (amorçage + beta fondateurs)

**Pourquoi.** C'est LE blocage réel. Le cockpit « près de toi », la carte vivante, la heatmap, le fil — tout ça est construit mais **vide**. Sans data, le moat reste invisible.

**Quoi (sur l'existant).**
- Activer la **beta « Fondateurs »** via les `invite_codes` (déjà livrés au S25) : vague d'invitations ciblées (lane César), onboarding qui **pousse à loguer publiquement** (allumer heatmap + fil + cockpit).
- **Seed honnête** à trancher (⚠️ John) : prises de démo **clairement signalées** OU assouplissement temporaire du seuil k-anon d'aperçu, le temps d'atteindre la masse critique. Respecter la culture anti-fake du produit.
- **Boucle d'activation** : badge « Fondateur » (gamification S26), objectif chiffré de prises publiques par façade avant ouverture large.

**Angle créatif.** Une **narration de lancement** : « les 100 premiers pêcheurs qui allument la carte de leur côte ». Rareté + statut + utilité. César en fait un récit (presse régionale, réseaux). Chaque prise loguée = un pixel de la carte qui s'allume.

**Acceptation (forme).** Carte/cockpit non vides sur ≥ 2 façades ; N prises publiques atteint ; flux d'invitation + badge fondateur fonctionnels.
⚠️ **John** : seed oui/non et forme ; objectif chiffré ; canal beta (César).

---

## Sprint 32 — « Planches naturalistes » (illustrations d'espèces)

**Pourquoi.** Le lot déjà cadré (`docs/sprint-28/species-illustrations-lot.md`). Maintenant qu'on a **26 espèces** (S29), on illustre **tout le catalogue d'un coup** (cohérence de style). Gros gain de **perçu** face à des concurrents illustrés.

**Quoi.** Composant `components/especes/SpeciesArt.tsx` (slug → asset, fallback `<Fish>`), 3 emplacements (cartes `/especes`, hero fiche, sélecteur CatchForm). Contraintes du lot : CLS nul, < 15-25 Ko/visuel, a11y `alt`, **originaux uniquement**.

**Angle créatif.** Style **« planche naturaliste »** (cohérent avec la DA « instrument de précision marine ») : silhouettes/illustrations semi-réalistes, palette navy/teal, comme un carnet de naturaliste. Différenciant et premium — pas des cliparts.

**Acceptation.** 26 visuels distincts en ligne, perf `/especes` non dégradée, droits propres.
⚠️ **John** : style + mode de production (illustrateur / IA validée) + budget (cf lot).

---

## Sprint 33 — « Carte instantanée » (perf carte, reportée)

**Pourquoi.** Mesuré : `/carte` Lighthouse mobile **~35**, TBT **~3920 ms**. Pour un produit centré carte, c'est le dernier point dur du « feel natif ».

**Quoi.** **Lazy-load MapLibre** (`next/dynamic`, précédent maison `TideChartLazy`), sortir le JS carte du critique, tree-shaking des contrôles, défer des couches lourdes (bathy/heatmap) au post-mount.

**Angle créatif.** Profiter du lazy-load pour un **skeleton « carte qui se révèle »** (les spots apparaissent en fondu façon sonar) → l'attente devient une micro-signature de marque au lieu d'un temps mort.

**Acceptation.** Lighthouse mobile `/carte` **≥ 70**, TBT **< 600 ms**, 1ʳᵉ tuile < 2,5 s, gating/GPS intacts (lazy = rendu only, pas la data gatée).

---

## ★ Sprint 34 — « Ramène-moi à l'eau » (notifications + digest)

**Pourquoi.** Le cockpit (S30) calcule déjà « ton créneau du jour ». Le transformer en **signal sortant** = rétention massive et prépare le push mobile.

**Quoi (sur l'existant : Resend + solunar + perso).**
- **Digest hebdo « Ta semaine de pêche »** (email Resend) : « Meilleur créneau jeudi 6-9 h (coef 92) · 4 prises près de toi · 1 espèce qui te manque au pokédex ». = le cockpit, poussé.
- **Préparer le contenu des push** (livré au mobile) : « Demain 7-9 h à ta côte : 9/10 pour toi », « grande marée ce week-end ».
- Réglages de fréquence + opt-out propre (RGPD).

**Angle créatif.** Le digest comme **bulletin de pêche personnel** (ton carnet de marin), pas une notif marketing. Une raison hebdomadaire de revenir, alignée sur le moat (TES créneaux, TES espèces).

**Acceptation.** Digest hebdo envoyé (opt-in), contenu personnalisé honnête, réglages + désinscription OK ; payload push spécifié pour le mobile.

---

## ★ Sprint 35 — « Prise vérifiée » (IA reco espèce + mesure taille/poids par photo)

**Pourquoi.** Une prise **vérifiée** (espèce + taille plausibles) rend tout le reste fiable : la **heatmap** et la qualité des spots cessent d'être déclaratives, et les **badges/défis** (S37) deviennent crédibles (pas de triche évidente). C'est aussi une **table stake** : les concurrents ont déjà la reco photo. Brique **G1** de la roadmap H2, prérequis de la communauté vérifiée et de la gamification crédible.

**Quoi (un seul pipeline photo, deux usages).**
- **Reco d'espèce par IA** via **Fishial.AI** (API cloud, ~865 espèces — **pas de modèle à entraîner**) : la photo **pré-remplit l'espèce** au `CatchForm` (commodité) **et vérifie la maille** en branchant le **moteur réglementation S24** (« ce bar ~38 cm < 42 cm sur ta façade : à relâcher »). On transforme une commodité en **garde-fou réglementaire français** — ce que personne ne fait pour le bord.
- **Mesure taille/poids** via un **objet de référence** posé sur la photo (carte bancaire, leurre calibré…) → estimation, cadrée **assistive et honnête** (marge affichée, « estimé », **pas forensique**).
- **Badge léger « vérifiée »** sur la prise (espèce + taille plausibles), réutilisé par la heatmap/qualité et les futurs défis.

**Angle créatif.** La prise devient un **document de bord** (espèce + taille estimées, datées) — le carnet gagne en confiance **sans police** : « assistée, pas flicage ». Le moment « je relâche ce bar trop court » devient un acte valorisant (badge conservation), pas une contrainte.

**Acceptation (forme).** Photo → espèce pré-remplie + maille vérifiée par façade ; taille estimée avec **marge affichée** ; badge « vérifiée » ; la heatmap/qualité peut pondérer par « vérifiée » ; tests sur l'estimation + garde-fous d'honnêteté (jamais une taille présentée comme exacte).
⚠️ **John** : niveau de vérification affiché (badge léger vs score de confiance) ; **coût API Fishial.AI** (clé + budget) ; objet(s) de référence acceptés.

---

## Sprint 36 — « Spots vivants » (vérif terrain + zones protégées)

**Pourquoi.** Deux boucles **défendables** que ni spot-de-peche (100 % curé) ni Fishing Grid (100 % communautaire) n'ont — renforcées maintenant par les **prises vérifiées** (S35).

**Quoi.**
- **« Spots vérifiés terrain »** : fusionner ta **curation** + la **fraîcheur communautaire** → « confirmé pêchable par N membres ce mois-ci » sur la fiche spot (s'appuie sur les **prises vérifiées** loguées + le multi-source carte v2).
- **Couche « zones protégées / réserves / cantonnements »** sourcée sur la carte (open data) — inexistante proprement côté mer du bord. Lien direct avec le moteur réglementation (S24).

**Angle créatif.** Un badge **« frais »** vivant (vert si confirmé ce mois, qui pâlit avec le temps) → le spot devient un organisme vivant, pas une épingle morte. Et la couche zones protégées te positionne en **app qui te garde en règle** (argument unique + presse).

**Acceptation.** Fiche spot affiche la fraîcheur communautaire ; couche zones protégées sourcée + datée + togglable ; 0 fuite GPS.

---

## ★ Sprint 37 — « Sentinelles de la côte » (défis saisonniers + science citoyenne)

**Pourquoi.** Engagement + rétention + positionnement **conservation/sérieux** + presse + partenariats assos. S'appuie sur la **gamification S26** et les **prises vérifiées S35** (badges crédibles). Prend Fishing Grid à revers : ils prêchent l'« anti-leaderboard » mais shippent un classement → **on occupe crédiblement ce terrain** (cohérence de marque = moat).

**Quoi (sur gamification S26 + prises vérifiées S35).**
- **Défis saisonniers** : collection d'espèces de saison, régularité (streaks), défis « no-kill »/relâche — **sans aucun classement public de tailles**. Les badges s'appuient sur les **prises vérifiées** (pas de triche évidente).
- **Science citoyenne — signalement d'espèces invasives** (crabe bleu, etc.) : photo + **zone géolocalisée floutée** → data utile (suivi de l'expansion) + matière à **presse et partenariats** (assos, observatoires, Ifremer).
- **Défis conservation** (ramassage déchets, relâche de gros géniteurs) → badges valorisants, alignés sur la culture « anti-toxicité ».

**Angle créatif.** Le pêcheur devient **sentinelle de sa côte** : il documente ce qui change (invasives, saisons qui glissent), au lieu de comparer des tailles. Utilité collective + fierté, zéro toxicité. Ouvre des **partenariats** (assos/observatoires) et une **histoire presse** forte (« les pêcheurs qui surveillent l'arrivée du crabe bleu »).

**Acceptation (forme).** Un membre relève un défi saisonnier + signale une invasive (photo + zone floutée) ; badges **sans classement de tailles** ; agrégat anonymisé des signalements exportable pour partenaires ; modération des signalements en place (panel existant).
⚠️ **John** : nature des défis + partenariat éventuel (asso ? observatoire ? lien RecFishing ?) ; périmètre des espèces invasives suivies.

---

## Sprint 38 — « Carte postale » (récit de session + espèces optionnelles)

**Pourquoi.** Donner du **carburant de croissance organique** (César/réseaux) + finir le catalogue espèces.

**Quoi.**
- **« Carte postale de sortie »** : transformer une sortie loguée en **visuel partageable** (conditions + prises **vérifiées** + spot **flouté** + DA marine) pour Insta/TikTok/Stories. Boucle de viralité native, respectueuse des coins secrets.
- **Espèces optionnelles** (catalogue → ~32) : **raie bouclée** (riche en réglementation : marquage caudal, espèce sensible — match parfait conformité), turbot, petite roussette, flet, pagre, girelle/serran (onboarding débutant Med).

**Angle créatif.** La carte postale = ton **trophée sans spot-burning** : on partage la fierté et l'ambiance, jamais le point GPS. Anti-toxicité assumée (« Strava pour pêcheurs, sans la toxicité ») rendue visible et partageable.

**Acceptation.** Génération d'une carte postale partageable (sans coord précise) ; +6 espèces optionnelles profondes + sourcées ; sitemap à jour.

---

## ★ Sprint 39+ — « Dans ta poche » (mobile Expo)

**Pourquoi.** Le web est complet, le cockpit + notifications + prises vérifiées sont prêts à devenir l'app native. La PWA a fait le pont ; place au natif.

**Quoi.** App **Expo iOS/Android** (code partagé via Turborepo), **Apple IAP** + **push Expo** (le contenu vient du S34), le **« tab Aujourd'hui » = le cockpit S30**, la **photo « prise vérifiée » (S35) directement depuis l'appareil**. Plan détaillé à écrire en amont (`docs/sprint-mobile/`).

**Angle créatif.** L'app native n'apporte pas de features nouvelles — elle **rend physique** ce qui existe : la notif du matin sur l'écran de verrouillage (« 9/10 pour toi à 7 h »), le carnet + la reco photo dans la poche au bord de l'eau, hors-ligne. Le natif = la promesse tenue au bon moment, au bon endroit.

**Acceptation.** App publiée (TestFlight/Play beta), parité cœur (carnet/carte/fil/cockpit), reco photo + push live, IAP testé.

---

## Lanes parallèles (tout du long)

- **SEO / contenu** (César + éditorial) : guides phares (≥ 20), pages programmatiques deep, vidéo courte (skill `video-courte-peche`) branchée sur les hubs espèces/réglementation, refresh trimestriel `verified_at`.
- **Monétisation** : tuning continu du tunnel (S26) une fois le moat visible (cockpit) et le réservoir rempli (S31) — c'est seulement là que payer a du sens.

---

## Paris créatifs « bonus » restants (à piocher selon l'énergie)

- **Distribution presse régionale** (le malin de ComptoirDesPêcheurs avec Ouest-France) : syndiquer un « où ça mord ce week-end en [région] » à la PQR. Move César, défendable par la relation. *(Synergie forte avec « Sentinelles » S37 — l'angle invasives/conservation est très presse.)*
- **« Mémoire de côte »** : récap annuel par département (« 2026 sur le 06 : 312 prises, pic en mai ») — contenu local, partageable, SEO.

---

## Anti-roadmap (rappels)

- ❌ Marketplace matériel comme pilier (Fishbrain l'a tuée). Affiliation discrète max.
- ❌ Course aux fiches creuses. Profondeur > quantité.
- ❌ Sur-promettre le scoring (« prédit le mordant ») ni la mesure photo (« taille exacte »). On révèle TES patterns ; la mesure est **assistive**, marge affichée.
- ❌ Faux peuplement de la carte/heatmap. Amorçage honnête (S31), prises vérifiées (S35).
- ❌ Classement public de tailles dans la gamification (S37) — collection/régularité/conservation, jamais la comparaison.
- ❌ Mobile avant que cockpit + notifications + prise vérifiée soient solides (S30/S34/S35 d'abord).

---

*Séquencement indicatif, à ré-arbitrer par John sprint par sprint. Chaque ★ peut être avancé si une fenêtre s'ouvre (ex. presse, partenariat). La règle : remplir → faire briller → rendre fiable & défendable → passer au natif.*
