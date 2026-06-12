# Process de production tutos & contenu IA

> Créé le 2026-06-11. Pour John + César (production avec Claude web), en parallèle du dev sprint 10.
> ⚠️ **Màj 2026-06-11 (décision John)** : côté réseaux sociaux, on publie **uniquement des vidéos courtes** → process + 10 scripts prêts à tourner dans `docs/contenu/VIDEOS-COURTES.md`. Les tutos écrits de ce fichier restent pour le **site uniquement** (SEO, sprint 10 Bloc 1).
> Référence concurrente : `docs/concurrents/fishing-grid.md` §8 — leurs 119 tutos sont à 80 % des fiches d'1 min (texte généré + vidéo IA de 55 s). Usine à volume SEO. **On ne copie pas le volume, on copie la cadence — avec notre standard de profondeur.** La page à battre : leur tuto bar du bord au printemps (10 min, sourcé nulle part, zéro donnée live).

---

## 1. Les 3 formats (et leur rôle)

| Format | Longueur | Rôle | Cadence cible |
|---|---|---|---|
| **Tuto pilier** | 8-12 min de lecture | Dominer une requête majeure (« pêche du bar du bord », « lire une courbe de marée ») — c'est le Bloc 1 du sprint 10 | 1/semaine |
| **Tuto standard** | 3-5 min | Couvrir une question précise (« quel coefficient pour le bar ? », « monter un montage surfcasting ») | 2-3/semaine |
| **Vidéo courte** (TikTok/Reels/Shorts) | 30-60 s | Acquisition — chaque tuto pilier se découpe en 3-5 vidéos | dérivé, 3-5/pilier |

Règle : **on n'écrit jamais une vidéo ex nihilo** — elle dérive toujours d'un tuto publié, avec lien vers la page (boucle contenu → produit, comme leur boucle contenu → boutique).

## 2. Process de production d'un tuto (avec Claude web)

1. **Choisir le sujet** dans le backlog (liste des 20 guides du Bloc 1 en priorité ; sinon : une question réelle vue sur les forums/groupes FB).
2. **Brief Claude web** avec le prompt §4A. Toujours fournir : l'espèce/technique, la façade concernée, et les pages produit à mailler (fiche espèce, spots, pages programmatiques).
3. **Vérification réglementaire À LA MAIN** (non délégable à l'IA) : maille, quota, périodes → vérifier sur legifrance.gouv.fr ou le site de la DIRM de la façade, noter l'arrêté + la date dans le frontmatter `verified_at`. **Une erreur de maille = crédibilité morte + risque légal.**
4. **Passe « voix pêcheur »** : tutoiement, concret, zéro jargon corporate, zéro tournure IA (« il est important de noter que », « en conclusion », listes à puces en rafale → à réécrire en prose).
5. **Checklist qualité §3** — si une case manque, on ne publie pas.
6. Publication MDX (`content/guides/` une fois le Bloc 1 livré) → 7. Découpage vidéos courtes (§5).

## 3. Checklist qualité (ce qui nous différencie de leur usine)

- [ ] **Sourcé** : toute affirmation réglementaire ou biologique a sa source (arrêté, Ifremer, SHOM) — eux n'en citent aucune.
- [ ] **Daté** : encart « Vérifié le JJ/MM/AAAA » (frontmatter `verified_at`).
- [ ] **Par façade** : jamais de généralité nationale quand Atlantique/Manche/Méditerranée diffèrent (maille bar !).
- [ ] **Chiffré** : coefficients, horaires PM/BM, températures — des nombres précis (et en `font-mono` dans le rendu, DA v2).
- [ ] **Maillé** : ≥ 3 liens internes (fiche espèce, spots, page programmatique, autre guide).
- [ ] **Actionnable** : le lecteur sait quoi faire à sa prochaine session (conditions à viser, montage, poste).
- [ ] **Voix** : tutoiement, ton pêcheur, relu à voix haute.
- [ ] **CTA produit** : « Logue ta prochaine sortie » vers l'app — chaque tuto travaille pour le carnet.

## 4. Prompts réutilisables (Claude web)

### A. Rédaction d'un tuto

```
Tu écris pour Carnet de Pêche (carnet-de-peche.com), le carnet numérique des pêcheurs
à la canne du bord en mer, en France. Voix : tutoiement, direct, concret, voix pêcheur,
pas de jargon corporate, pas de tournures IA.

Sujet : [SUJET]
Format : [pilier 8-12 min / standard 3-5 min]
Façade(s) : [Atlantique / Manche / Méditerranée]
Lecteur : [débutant / intermédiaire / confirmé]

Exigences :
- Structure : intro qui pose le problème réel → corps par conditions/saisons → section
  « Sur le terrain » (cas concret chiffré) → erreurs courantes → matériel minimal.
- Chiffres précis partout (coefficients, heures par rapport à la PM/BM, profondeurs,
  tailles). Si tu n'es pas sûr d'un chiffre, écris [À VÉRIFIER] — ne l'invente pas.
- Réglementation : rédige l'encart mais marque chaque valeur [À VÉRIFIER SOURCE] —
  je vérifie moi-même sur Légifrance avant publication.
- Ne mentionne aucun spot précis non public. Tu peux citer des types de postes
  (pointe rocheuse battue, digue portuaire, plage à baïnes).
- Termine par : 3 liens internes suggérés + le CTA carnet.
```

### B. Relecture critique (2e passe, conversation séparée)

```
Voici un tuto pêche destiné à carnet-de-peche.com. Relis-le en rédacteur en chef
impitoyable : 1) chiffres douteux ou invérifiables, 2) généralités creuses qui
pourraient sortir d'une IA, 3) affirmations réglementaires non sourcées,
4) ruptures de ton (vouvoiement, jargon), 5) ce qui manque pour battre [URL du
contenu concurrent équivalent]. Ne réécris pas : liste les problèmes par gravité.
```

### C. Découpage en vidéos courtes

```
Découpe ce tuto en [3-5] scripts vidéo de 30-60 s pour TikTok/Reels/Shorts.
Pour chaque script : HOOK (première phrase, < 2 s, qui arrête le scroll),
DÉROULÉ (texte voix-off, 70-120 mots), TEXTE À L'ÉCRAN (3-5 incrustations),
PLAN DE TOURNAGE (smartphone, bord de mer ou écran de l'app), CTA final
(« le guide complet est sur carnet-de-peche.com »).
Un seul message par vidéo. Le chiffre le plus surprenant en premier.
```

## 5. Vidéos réseaux — angles qui nous appartiennent (détail et scripts : `VIDEOS-COURTES.md`)

Leurs vidéos = IA génériques de 55 s. Nous, on tourne smartphone au bord de l'eau (authenticité = différenciation gratuite) avec des angles que eux ne peuvent pas prendre :

1. **« Les horaires de marée de ton appli sont faux »** — vulgariser le rapport SHOM (`docs/sprint-10/tides-accuracy.md`) : on a MESURÉ des écarts de 30 à 90 min selon les ports. Leur propre home affiche un avis qui s'en plaint. Angle en or, à ne sortir **que** quand notre correction (sprint 11) est en prod.
2. **« Ton carnet sait des choses que la météo ignore »** — le moat : patterns perso vs solunar générique.
3. **Série « 1 coefficient, 1 stratégie »** — 60/75/90/105 : qu'est-ce que ça change au bord.
4. **Réglementation sourcée** — « la maille du bar n'est pas la même selon où tu pêches, voilà l'arrêté » : crédibilité instantanée vs leurs fiches sans source.

**À ne pas faire** : dénigrer Fishing Grid nommément (petit milieu, ils sont sympathiques et ça nous grandirait pas), promettre des features pas en prod, montrer des spots précis non publics.

## 6. Qui fait quoi

- **John** : choix des sujets, vérif réglementaire (§2.3), validation finale, tournage si dispo.
- **César** : production des tutos avec les prompts §4, calendrier de publication réseaux, communauté. César est le garant du ton (cf brief sprint 10, « hors code »).
- **Claude Code** : intégration MDX (Bloc 1), composants `<RegulationBox>` etc. Ce fichier alimente le futur `docs/guides/COMMENT-ECRIRE.md` du Bloc 1.
