# 🎯 Track « Excellence UX + Réseau social »

> **Objectif** : passer du « MVP soigné » (audit : home ~4,5/10) au **produit qui écrase la concurrence**. On ne vise pas « un cran au-dessus » de Fishing Grid / spot-de-peche, mais le **leader incontestable**.
>
> Source : audit transverse 2026-06-21 (5 zones — home/faux exemples, fil/photos, form prise, carte prise, profils/follow) + digest concurrents.
>
> **Format** : 4 sprints. Chaque sprint = branche dédiée + agents parallèles (mode `ultracode xhigh`, cf CLAUDE.md §19) + **workstream de vérif final** (Vitest vert, build OK, relecture croisée). **Rien n'est poussé sans validation de John.**

## Numérotation
Ce track s'insère **avant** le mobile (ex-sprints 12-19, qui décalent d'autant). Numérotés 12→15 ici — à arbitrer avec John (peuvent devenir 11.7→11.10). À reporter dans `CLAUDE.md §9` une fois validé.

---

## ✅ Déjà livré dans la session du 2026-06-21 (sur `main`, **non commité**)
Quick wins sans décision produit, pour stopper l'effet « fait à la va-vite » :
- **Rond du toggle confidentialité recentré** — `CatchForm.tsx` (était `top-1` sans centrage vertical + sujet au padding UA du `<button>` → `top-1/2 -translate-y-1/2`, `p-0`, ancrage `left-1`).
- **Clic profil dans le fil** — `PostCard.tsx` : avatar + nom de l'auteur enveloppés dans un `<Link href="/u/[username]">`.
- **Clic profil dans les commentaires** — `CommentThread.tsx` : nom de l'auteur cliquable.
- **Placeholder mensonger retiré** — `carnet/[id]/page.tsx` : suppression du faux « Carte interactive à venir » (la vraie carte arrive au Sprint 12, WS4).
- **Contraste footer remonté au niveau AA** — `Footer.tsx` : liens `white/55 → white/75`, méta `white/50 → white/70`.

---

## Sprint 12 — « Réseau social joignable » 🔴 le plus urgent
**Thème** : la mécanique de follow existe mais est injoignable. On la rend utilisable + on finit les bugs structurels.

- **WS1 — Suivre depuis le fil.** Intégrer `FollowButton` au `PostCard` (état initial `isFollowing` fourni par la requête feed en batch, pas de N+1), optimiste. *AC : depuis le post d'un autre, je suis/ne suis plus sans quitter le fil.*
- **WS2 — Réparer `/follows` (BUG-04).** Diagnostiquer `listFollowing/listFollowers`, compteurs justes. *AC : un follow apparaît immédiatement dans `/follows`.*
- **WS3 — Profil riche.** Compteurs abonnés/abonnements (vue `profiles_stats` déjà en base, inutilisée) + listes cliquables + état « tu le suis ». *AC : `/u/x` affiche « N abonnés · M abonnements » cliquables.*
- **WS4 — Vraie mini-carte sur la prise.** Migration exposant `lng/lat` (`st_x/st_y(geom_visible)`) sur `catches_for_viewer` + `SpotMiniMap` branché dans `carnet/[id]`, **floutage respecté**. *AC : la fiche prise affiche une carte au marqueur à la bonne précision.*
- **WS5 — Onglet « Abonnements » du fil.** Posts des pêcheurs suivis + vides soignés. *AC : l'onglet liste les posts des follows.*
- **WS-Vérif.**

## Sprint 13 — « Photos & contenu » 📸 (upload direct — validé John)
**Thème** : « on ne voit pas les photos ». La table posts n'a pas de colonne photo ; seul le partage d'une prise affiche une image.

- **WS1 — Migration.** Photos de post (table `feed_post_photos` ou colonne array) + bucket Storage + RLS.
- **WS2 — Composer.** Upload 1..n photos (resize client max 1920px → webp), preview, suppression avant envoi.
- **WS3 — PostCard.** Galerie (1 / 2 / 3+) + lightbox (réutiliser `PhotoLightbox`).
- **WS4 — Fiabiliser le partage de prise** (URLs signées) + meilleure sélection de prise (recherche, > 20).
- **WS5 — Fluidité réseau.** Infinite scroll + skeletons + optimiste (post + commentaire).
- **WS-Vérif.**

## Sprint 14 — « Effet 10 000 € » ✨ (home + design)
**Thème** : tuer les faux « Exemple », rendre la home vivante et premium.

- **WS1 — Virer les faux exemples.** Remplacer `VisualCarnet/Carte/Communaute` (SVG figés, faux noms) par de la **data réelle** (vrais posts récents, vrais spots) ou de **vraies captures produit**. Retrait des badges « Exemple ».
- **WS2 — Micro-animations.** Scroll reveal, hover lift des cartes, compteurs animés, header sticky + blur.
- **WS3 — Polish DA v2.** Échelle typo (h2/h3 explicites), `Bathy` opacity, `TagData` lisible, **focus rings AA** partout.
- **WS4 — États de chargement.** Skeletons (fil, carte, guides), images lazy + blur.
- **WS5 — CTA & copy** cohérents sur toutes les pages marketing.
- **WS-Vérif.**

## Sprint 15 — « Instruments marins » 🧭 (la supériorité visible)
**Thème** : rendre nos forces (marées précises, scoring perso) spectaculaires pour que leur site paraisse plat.

- **WS1 — Courbe de marée interactive.** Curseur « maintenant », offset PM/BM live, heatmap coef jour/semaine (≥ spot-de-peche).
- **WS2 — Score circulaire décomposé.** Composantes visibles (lune / vent / marée / historique), pas juste un nombre.
- **WS3 — Insights perso enrichis.** « Ta prise moyenne en jour est +18% » ; contexte local (« #3 sur le bar en Morbihan ce trimestre » — **sans** leaderboard global, anti-toxicité assumée).
- **WS4 — Fiches espèces sourcées + datées** (recoupe sprint 10 bloc 3) : maille + saison par façade, `source` + `verified_at` visibles (vs leurs 266 fiches creuses).
- **WS5 — (option) bathymétrie du spot.**
- **WS-Vérif.**

---

## Cap concurrentiel
- **vs Fishing Grid** (apps natives, 100% gratuit, IA espèces, 209 groupes + chat) : on gagne en **profondeur** (marées précises, scoring perso, spots curés, fiches sourcées) et **viabilité éco**. PWA pour bridger le mobile en attendant Expo.
- **vs spot-de-peche** (data env + maps) : on les **égale** sur la data env (table stakes) et on les **dépasse** avec le carnet perso + le social + les instruments interactifs.
- **Règle** : tout ce qui est générique chez eux devient **personnalisé et instrumenté** chez nous.

*Créé le 2026-06-21 — track issu de l'audit transverse. À refléter dans CLAUDE.md §9 après validation de John.*
