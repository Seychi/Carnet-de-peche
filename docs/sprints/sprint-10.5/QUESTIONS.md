# Sprint 10.5 — Questions pour John

> Points où un choix visuel touche à la structure — notés ici, pas tranchés seul (règle 1 du brief).

## Q1 — Tab bar sur `/carte` ? (Phase 3)

La maquette mobile 02 montre la tab bar SUR l'écran carte. Mais `/carte` vit dans le layout `(map)` fullscreen (header compact MapShell + bottom sheets NearbyPanel/SpotPopup) — pas dans `(app)`. Lui ajouter la tab bar mange ~70 px de carte et peut entrer en conflit avec les bottom sheets existants.

**Fait en Phase 3** : tab bar sur toutes les routes `(app)` (carnet, fil, profil, home, follows, compte, u). La carte garde son UX actuelle, l'onglet « Carte » de la tab bar y mène.

**À trancher** : ajouter la tab bar au layout `(map)` mobile aussi (fidèle maquette, carte réduite) — ou statu quo (plein écran carte, retour via flèche). Mon avis : statu quo jusqu'au re-skin carte de la Phase 4, on décidera devant l'écran.

## Q3 — Double anneau « ton score / score global » sur la fiche spot (Phase 4.3)

La maquette spot.html met un double ScoreRing dans le hero. Or le scoring spot affiché a été **neutralisé au sprint 7.5 (Bloc B)** : multiplicateur perso non démontrable, le popup carte affiche « — /100 · calibrage en cours ». Mettre un anneau avec un chiffre dans le hero = réafficher un score qu'on a volontairement retiré.

**Fait** : hero DA v2 (navy-950 + isobathes + coords mono + chips) **sans** anneau. L'anneau arrivera avec le scoring « vraie performance » (post-sprint 11). Le composant `<ScoreRing>` est prêt.

## Q2 — Coefficient de marée dans le bandeau instruments

Les maquettes affichent « COEF 88 » partout. Le coef n'est pas exposé par Open-Meteo (backlog ROADMAP : à dériver de l'amplitude PM−BM ou via WorldTides — décision liée au rapport marées du sprint 10). Le bandeau affiche en attendant : PM/BM + sens (▲/▼) + vent + houle + créneau. La place du coef est prévue dans le composant (`coef?: number`) — il s'affichera dès que la donnée existera.
