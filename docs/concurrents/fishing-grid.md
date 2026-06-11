# Analyse concurrentielle — Fishing Grid

> Rédigé le 2026-06-11. Sources : fishing-grid.fr (home, à-propos), App Store FR, Google Play, avis utilisateurs.
> **Màj 2026-06-11 (soir)** : crawl complet du site (tutos + vidéos IA, forum, espèces, blog, updates) → voir §8. Nuance la force « vélocité » et confirme les faiblesses 1, 4 et 8.
> Verdict court : **concurrent direct #3, le plus proche de nous en esprit** (carnet + carte + communauté, made in France, par des pêcheurs). Menace réelle mais pas frontale : ils sont généralistes et 100% gratuits, nous sommes spécialistes mer avec un moteur de personnalisation. Le vrai danger : ils ont déjà les apps natives iOS/Android que nous n'aurons qu'aux sprints 12-19.

---

## 1. Fiche d'identité

| | |
|---|---|
| Produit | Fishing Grid — « L'app sociale 100% pêche » |
| Équipe | 2 frères (dont Marin Tostivint, dev), Pornic (44), **sans financement extérieur** |
| Lancement | v1.0 août 2025, refonte complète v1.1 mars 2026, **lancement public avril 2026**, v2.0 (refonte design) juin 2026 |
| Plateformes | **iOS natif + Android natif** (iOS 17.6+, Android 8+), FR uniquement |
| Traction | **5K+ téléchargements** Android, 4.7/5 (76 avis) Play, 4.8/5 (47 notes) App Store. Présence TikTok/Insta active |
| Modèle éco | **100% gratuit, sans pub, sans abonnement.** Monétisation = **boutique/marketplace** (vendeurs partenaires, artisans FR) + affiliation |
| Périmètre | **Généraliste** : eau douce ET mer, toutes techniques. 266 espèces documentées, 209 groupes locaux |

## 2. Features (état juin 2026)

- **Carnet de prises** : photo, espèce, taille/poids, spot, **conditions météo auto-loggées**, stats de saison. → Frontal avec notre cœur de produit.
- **IA reconnaissance d'espèces** : photo → identification on-device → débloque l'espèce dans un « Pokedex ». Feature signature, très marketable.
- **Carte communautaire** : sessions et groupes sur la carte, **heatmap d'activité**, recherche par espèce. Spots = générés par la communauté (pas de base curée).
- **Météo / marées / solunaire** : indice solunaire 0-10 calculé à la position, pression, lune, vent, « meilleur créneau ». **Générique, identique pour tous** (comme spot-de-peche).
- **Social** : groupes locaux + chat temps réel, défis saisonniers (validation communautaire, badges Bronze/Argent/Or), classements, quiz du jour, « Moments Pêche Story ».
- **Encyclopédie 266 espèces** : tailles légales, périodes, habitats, techniques — indexée web (SEO).
- **Surface web SEO** : fiches espèces, pages marées, réglementations, techniques, tutoriels, forum, blog. → Concurrence directe de notre sprint 10.
- **Boutique web** : produits de vendeurs partenaires français (checkout intégré).
- Confidentialité : spots privés par défaut, flou paramétrable, hébergement UE, pas de tracker tiers.

## 3. Forces

1. **Apps natives iOS + Android déjà en prod** — notre plus gros gap (mobile prévu sprints 12-19).
2. **Gratuit total** : l'argument #1 dans les avis (« pas d'abonnement, enfin ! »). Attaque directe du pricing de tout le marché, y compris le nôtre.
3. **Vélocité** : ~10 releases entre août 2025 et juin 2026, dont 2 refontes complètes. Petite équipe mais qui ship. ⚠️ *Nuancé par le crawl du 2026-06-11 : leur page `/updates` affiche la v1.3 du 11 mars 2026 comme dernière release — 3 mois sans mise à jour visible (cf §8.1).*
4. **IA espèces + Pokedex** : hook d'acquisition fort, viral sur TikTok.
5. **Image artisanale crédible** : « deux frères, pas de VC, vie privée d'abord » — un storytelling qui parle aux pêcheurs.
6. Communauté qui prend : 209 groupes, des groupes Bretagne/Normandie/Marseille à 20-130 membres.

## 4. Faiblesses (vérifiées)

1. **Marées imprécises** — avis App Store (mai 2026) : ~30 min de décalage à Pornichet. Pour la pêche en mer, c'est disqualifiant. **Notre opportunité #1.**
2. **Scoring 100% générique** : indice solunaire standard, aucune personnalisation. Même faiblesse que spot-de-peche → notre différenciateur tient.
3. **Données environnementales pauvres pour la mer** : pas de vagues/houle/période, pas de courbe de marée riche, pas de coefficients mis en avant. Nos fiches spots sont nettement au-dessus.
4. **Pas de base de spots curée** : la carte ne montre que ce que la communauté loggue → vide hors zones actives. Nous on a des spots éditorialisés + SEO programmatique.
5. **Positionnement incohérent** : le site dit « anti-dopamine, pas de feed, pas de leaderboard public » ; l'app a des défis, classements, quiz quotidien et stories. Signe d'un produit qui se cherche.
6. **Bugs remontés dans les avis** : poids non enregistré, descriptions illisibles, crashs identification, notifications faibles.
7. **Pas de revenus récurrents** : marketplace = marges faibles, dépend du volume. Sans financement, la gratuité totale plafonne leur capacité d'investissement (données premium, support, infra). Fragilité structurelle à moyen terme.
8. Généraliste : aucune profondeur métier sur la pêche en mer du bord (réglementation maille bar, coefficients, postes selon vent/houle…).

## 5. Face-à-face

| Axe | Fishing Grid | Carnet de Pêche | Avantage |
|---|---|---|---|
| Cible | Tous pêcheurs FR | Canne du bord en mer FR | Nous (niche défendable) |
| Mobile natif | ✅ iOS + Android | ❌ (sprints 12-19) | **Eux, net** |
| Web app + SEO | Vitrine + fiches espèces | Produit web complet + SEO programmatique spots | Nous |
| Carnet | ✅ complet + IA espèces | ✅ complet, conditions Open-Meteo riches | ≈ (leur IA = hook, nos conditions = profondeur) |
| Marées/météo mer | Basique, **marées fausses** | Courbe marée + vagues/houle/période + soleil | **Nous, net** |
| Scoring | Solunaire générique | Solunaire (sprint 6) **+ scoring personnalisé** (sprint 7) | Nous (unique sur le marché) |
| Spots | Communautaires uniquement | Base curée + floutage 1 km + gating | Nous |
| Social | Groupes + chat + défis + classements | Fil par département + follows (sprint 8) | Eux en richesse, nous en ancrage local |
| Encyclopédie/guides | 266 fiches espèces | Sprint 10 à venir (20 guides) | Eux (avance SEO) |
| Prix | Gratuit total | Freemium 4,90/9,90 € | Eux en acquisition, nous en viabilité |
| Revenus | Marketplace | Abonnements Stripe (sprint 9 ✅) | Nous |

## 6. Plan d'action « le faire en mieux »

### A. Ne pas changer (le fond est bon)
- **Garder le freemium.** Leur gratuité totale est leur faiblesse économique, pas une force à copier. Mais elle impose une règle : **le payant doit porter sur ce qu'eux ne savent pas faire** (précision, personnalisation, profondeur mer), jamais sur des basiques qu'ils donnent gratuitement.
- **Garder la niche mer/canne du bord.** C'est le moat positionnement : on ne gagnera pas en largeur contre un généraliste gratuit, on gagne en profondeur.

### B. À exploiter immédiatement (quick wins, avant/pendant sprint 10)
1. **Marées = champ de bataille.** Leurs marées sont fausses (avis publics). Vérifier la précision de nos PM/BM Open-Meteo sur 4-5 ports de référence (SHOM en étalon) et si on est bons, en faire un argument de copy : « marées vérifiées port par port ». Si on est moyens, c'est un signal pour prioriser WorldTides/SHOM.
2. **Messaging anti-générique.** Décliner partout l'angle « ton score, pas celui de tout le monde » — il frappe à la fois spot-de-peche ET Fishing Grid (deux solunaires génériques).
3. **Sprint 10 (guides) devient plus urgent** : ils ont 266 fiches espèces indexées. Notre SEO programmatique espèces × départements × techniques doit sortir vite et être plus profond qu'eux sur nos 6 espèces (mailles, saisons par façade, postes par conditions).

### C. Décisions produit à arbitrer (John)
1. **Pricing social** : on gate l'écriture du fil au tier Local ; eux donnent groupes + chat gratuits. Risque : passer pour radin sur le social précisément face au concurrent « 100% gratuit ». Options : (a) statu quo, (b) écriture gratuite dans SON département / interactions payantes ailleurs, (c) tout le social gratuit et gating uniquement carte/scoring. Mon avis : (b) — cohérent avec notre règle d'or (le social produit PAR l'utilisateur devrait pencher gratuit).
2. **Mobile** : leur avance native est le risque #1 sur 12 mois. Options : (a) tenir la roadmap (mobile sprints 12-19), (b) intercaler une **PWA installable** (manifest + service worker offline léger) en 1 sprint pour réduire le gap perçu en attendant Expo. Mon avis : (b) si la beta (sprint 11) remonte « il manque une app » comme frein principal.
3. **IA reconnaissance d'espèces** : ne pas copier en v1. On a 6 espèces cibles, identifiables par n'importe quel pêcheur du bord. À réévaluer phase 2 comme gadget d'acquisition seulement.

### D. À surveiller
- Leur traction (downloads, nb de groupes, avis) — re-check trimestriel.
- S'ils sortent : scoring personnalisé, spots curés mer, ou un tier payant → réévaluer immédiatement.
- Leur boutique : s'ils signent Decathlon/Pacific Pêche, ça crédibilise notre propre piste affiliation post-MVP.

## 7. Impact roadmap (résumé)

- Sprint 10 (guides/SEO) : **confirmé et durci** — profondeur > eux sur nos 6 espèces.
- Sprint 11 (beta) : ajouter une question testeurs « l'absence d'app mobile est-elle bloquante ? » pour trancher l'option PWA.
- Sprints 12-19 (mobile) : priorité confirmée, c'est LE gap concurrentiel.
- Backlog : vérification précision marées (étalon SHOM) ; arbitrage pricing social (C1).

## 8. Crawl complet du site (2026-06-11) — constats additionnels

> Pages parcourues : home, `/tutorials` (+ 2 tutos détaillés), `/forum`, `/species`, `/blog`, `/updates`. Six constats qui affinent l'analyse ci-dessus.

1. **Vélocité en question.** `/updates` (« le journal des évolutions, sans tri marketing ») n'affiche que 2 versions : v1.2 (5 mars 2026) et v1.3 (11 mars 2026). **Aucune release visible depuis 3 mois.** Soit la page est mal tenue, soit ils ont ralenti. À re-checker au prochain point trimestriel (versions App Store/Play en étalon).

2. **Tutos vidéo IA = volume, pas profondeur.** 119 tutos, mais la grande majorité durent **1 minute** : texte généré + vidéo IA ~55 s (Cloudflare Stream) + « chapitres » espacés de 5-10 secondes. Usine à contenu SEO, pas un avantage produit. Idée maligne à retenir : chaque tuto lie « Le matériel · X réf. » vers leur boutique (boucle contenu → commerce, à garder pour notre piste affiliation post-MVP).

3. **MAIS leur tuto vedette attaque notre niche frontalement.** « Pêche du bar du bord au printemps : techniques, spots et réglementation 2026 » — 10 min de lecture, 1,6k vues, épinglé « À lire en premier ». Contenu réellement bon : cycle migratoire, conditions (coef 70-95, vent, temp eau), spots par façade, matériel, réglementation 2026 par zone. C'est LA page à battre au sprint 10 (Bloc 3), pas leurs fiches espèces génériques. Point faible exploitable : réglementation affirmée **sans source ni date de vérification**.

4. **Encyclopédie : largeur avec erreurs de crédibilité.** La **carpe commune est étiquetée « Invasive »** sur leur propre home ; le catalogue (266 espèces) est gonflé d'espèces hors-sujet France métropolitaine (anguille électrique, aimara, acoupa…). Génération en masse, profondeur faible. Confirme la stratégie Bloc 3 : 6 fiches profondes sourcées + `verified_at` > 266 fiches en largeur.

5. **La critique marées est sur LEUR home.** Premier témoignage affiché : « les horaires des marées ne sont pas exactes non plus ». Ils documentent eux-mêmes notre opportunité #1. Le Bloc 4 (vérif SHOM, Pornichet inclus) devient le quick win marketing le plus rentable du sprint.

6. **Forum faible.** 121 discussions au total, beaucoup à 0 réponse, ~50-150 vues, contenu dominé par « cherche quelqu'un pour pêcher dans le XX ». C'est un play SEO, pas une communauté vivante. Le blog est embryonnaire (3 articles). Notre fil par département + Realtime n'a pas à rougir ; pas de raison de copier le format forum en v1.

### Conséquences actées (2026-06-11)
- Bloc 3 sprint 10 : leur tuto bar printemps ajouté comme **référence à battre** dans la checklist comparative.
- Bloc 4 sprint 10 : passe en **priorité 1 parallèle dès le jour 1**.
- Vidéos IA courtes : pas une feature produit — pistes d'**acquisition pour César** (déclinaison TikTok/Insta des 20 guides). Hors roadmap dev.
