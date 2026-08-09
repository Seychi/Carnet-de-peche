# Prompt Claude Code — ré-import OSM complet (génération, relecture, insertion)

> À copier-coller tel quel dans Claude Code, à la racine du repo. Écrit le 2026-08-07, après le lot 11.
> Le mode d'exécution suit CLAUDE.md §19 (`ultracode` + effort `xhigh`).
> Ce prompt est **autonome** : Claude Code n'a pas besoin d'autre contexte que le repo.

---

```
ultracode, effort xhigh.

Mission : exécuter le ré-import OSM des spots de bout en bout, pour TOUS les départements
côtiers restants — génération, relecture critique, insertion en base, vérification, mise à
jour de la doc. Tu fais tout toi-même, je ne veux pas d'étape manuelle qui me revienne.

Lis d'abord ENTIÈREMENT, dans cet ordre :
1. docs/contenu/curation-spots/PLAYBOOK.md (méthode, invariants d'honnêteté §2, stratégie §9)
2. docs/contenu/curation-spots/LOTS.md (état vivant, plan des 24 départements, décisions)
3. docs/contenu/curation-spots/INCIDENT-2026-08-06-coordonnees.md
4. docs/contenu/curation-spots/lots/lot-08-audit-geo.md (la passe de relecture de référence)
5. scripts/import-osm-spots.ts (en entier, y compris l'en-tête de commentaires)
Ces fichiers font foi, pas ce prompt. Si l'un d'eux contredit ce que j'écris ici, c'est lui
qui gagne, et tu me le signales.

═══════════════════════════════════════════════════════════════════════
ÉTAT DE DÉPART (vérifié en SQL live le 2026-08-07, à re-vérifier toi-même)
═══════════════════════════════════════════════════════════════════════
- 353 spots approved (206 curés + 145 importés + 2 communautaires), 648 pending.
- Le 56 est à 67 fiches publiées (lots 6, 7, 9, 10, 11), 39 pending.
- Deux fichiers SQL sont déjà générés et NON insérés :
    supabase/seed-spots-import-osm-04-56.sql    512 lignes, RELU au lot 8       → à insérer
    supabase/seed-spots-import-osm-05-vides.sql 882 lignes (2A 327, 2B 206,
                                                85 193, 06 156), JAMAIS RELU    → à relire PUIS insérer
- Il reste 19 départements à générer : 22, 50, 35, 14, 17, 44, 33, 40, 64, 83, 34, 66, 11,
  30, 76, 62, 59, puis 29 et 13 en dernier (ils ont déjà du backlog, mais le ré-import leur
  apporte les plages, et pour le 29 il fournit enfin le jeu de contrôle qui manque pour
  rejouer l'audit géographique sur ses 94 fiches publiées).

═══════════════════════════════════════════════════════════════════════
CE QUE FAIT (ET NE FAIT PAS) LE SCRIPT
═══════════════════════════════════════════════════════════════════════
    pnpm tsx scripts/import-osm-spots.ts --dept=XX --out=supabase/seed-spots-import-osm-NN-xx.sql

Il interroge l'API Overpass (https://overpass-api.de) par bbox départementale sur 14 tags,
mappe vers le modèle `spots`, filtre les noms invalides (`isInvalidName`), et ÉCRIT UN
FICHIER SQL. Il n'écrit JAMAIS en base : l'insertion est une seconde étape, c'est voulu.
C'est exactement le piège dans lequel je suis tombé hier en croyant avoir ré-importé.

Notes d'exécution :
- Node 18+ requis (fetch natif), aucune dépendance npm.
- Pause de 3 s entre deux requêtes Overpass. Lance les départements un par un ou par petits
  groupes, pas les 19 d'un coup : Overpass throttle et coupe.
- Le script affiche en fin d'exécution une ligne « Positionnement » : le nombre d'objets dont
  le sommet retenu s'écarte de plus de 300 m de l'ancien centre de bbox. Reporte ce chiffre
  dans ton RECAP, c'est la mesure de ce que l'ancienne méthode plaçait de travers.
- Le SQL généré insère en source='imported', moderation_status='pending', verified=false, et
  porte un `where not exists (... ST_DWithin(150 m))` qui déduplique contre TOUT l'existant
  au moment de l'insertion. Les lignes entrent donc en backlog, masquées de la carte, des
  fiches, de nearby et du sitemap. L'insertion est sans risque produit.

═══════════════════════════════════════════════════════════════════════
LA PASSE DE RELECTURE — OBLIGATOIRE SUR CHAQUE FICHIER AVANT INSERTION
═══════════════════════════════════════════════════════════════════════
C'est l'étape qui a le plus de valeur. Sur le 56, elle a retiré 7 pontons de marina et
réassigné 42 lignes au 44. Ne l'expédie pas. Pour chaque fichier généré :

A. DÉBORDEMENT DE BBOX vers un département voisin.
   Les bbox sont volontairement généreuses. Réassigne `department` et `region` quand un objet
   est manifestement chez le voisin.
   ⚠️ RÈGLE DURE : le critère se formule TOUJOURS en DEUX dimensions (lat ET lon). Un critère
   à une seule dimension est un piège avéré : sur le 56, « lat < 47.435 » aurait envoyé
   Belle-Île, Houat et Hœdic en Loire-Atlantique. Vérifie chaque réassignation en confrontant
   le point à un toponyme connu, jamais à une intuition de proximité.
   Départements à risque de chevauchement : 44/56 (presqu'île guérandaise), 29/22, 22/35,
   35/50, 50/14, 14/76, 76/62, 62/59, 17/33, 33/40, 40/64, 66/11, 11/34, 34/30, 30/13,
   13/83, 83/06.

B. NOMS INVALIDES qui passeraient à travers `isInvalidName`.
   Lettres ou numéros seuls, « Accueil », « Visiteur », « Avitaillement », « Épices »,
   « Quai A », « Panne 3 », « Slip ». Tout nom commençant par « Ponton » est déjà rejeté par
   le script depuis le durcissement du 06/08 ; vérifie que ça tient, et signale-moi tout
   nouveau motif de pollution que tu repères, pour qu'on durcisse le prédicat à la source
   plutôt qu'en aval.

C. OBJETS QUI NE SONT PAS DES POSTES DE BORD.
   Appontements de marina, quais de commerce, cales privées, objets à l'intérieur des terres,
   plans d'eau douce. Retire-les du fichier avec un commentaire SQL expliquant pourquoi.

D. POSITIONS ABERRANTES.
   Le script prend le sommet médian de la géométrie (`out geom`), donc un point qui appartient
   à l'objet par construction. Ça règle le bug du centre de bbox, mais contrôle quand même par
   sondage que les plages et les anses tombent bien sur le trait de côte, pas dans les terres
   ni au large. Deux règles héritées de l'incident du 06/08 :
     - une coordonnée arrondie à 2 décimales est fausse jusqu'à preuve du contraire ;
     - on ne dérive jamais une position d'un centre de boîte englobante.

E. DOUBLONS INTERNES au fichier (même nom à moins de 300 m) : garde la ligne la mieux placée.

Documente chaque retrait et chaque réassignation. Un fichier relu doit porter, dans son
en-tête de commentaires, le compte final et le résumé des corrections, comme le 04-56.

═══════════════════════════════════════════════════════════════════════
INSERTION
═══════════════════════════════════════════════════════════════════════
Tu as le connecteur Supabase en mode WRITE (.mcp.json, décision John du 2026-06-23).
Insère avec `execute_sql`, PAS avec `apply_migration` : ce sont des seeds de données, pas
du DDL, et ça n'a rien à faire dans supabase/migrations/.

Ordre imposé :
  1. supabase/seed-spots-import-osm-04-56.sql (déjà relu, insère-le en premier, c'est le
     déblocage le plus urgent : 207 plages qui ouvrent le niveau 2 du playbook §9.1)
  2. supabase/seed-spots-import-osm-05-vides.sql APRÈS l'avoir relu (85, 06, 2A, 2B : ces
     quatre départements n'ont jamais rien eu, ils sont bloqués à ~10 fiches sans ça)
  3. les 19 autres, dans l'ordre des vagues du tableau de LOTS.md, un fichier par département

Après CHAQUE insertion, compte les lignes réellement entrées et compare au nombre de lignes
du fichier. L'écart, c'est le dédoublonnage à 150 m : normal, mais il doit rester modeste.
Un écart énorme veut dire que tu réimportes ce qui est déjà là, dis-le moi.

═══════════════════════════════════════════════════════════════════════
INTERDITS ABSOLUS
═══════════════════════════════════════════════════════════════════════
- Aucun SQL destructif : pas de DELETE, pas de DROP, pas de TRUNCATE, pas d'UPDATE en masse.
- Ne touche JAMAIS geom, geom_public, visibility, source, verified, verification_level sur
  des lignes existantes. Tu n'écris que des INSERT de nouvelles lignes en `pending`.
- Ne modifie aucune policy RLS.
- Aucun spot n'entre en `approved` : le ré-import ne publie rien, il remplit le backlog.
  La curation éditoriale, c'est un autre chantier (PLAYBOOK.md), pas celui-ci.
- Pas de `git push`. Commits locaux en conventional commits, et tu t'arrêtes là.

═══════════════════════════════════════════════════════════════════════
VÉRIFICATION (workstream final dédié, cf CLAUDE.md §19)
═══════════════════════════════════════════════════════════════════════
En SQL live, après l'ensemble des insertions :
- backlog `pending` par département, avant/après, et total ;
- répartition par `structure`, en vérifiant que `plage` est enfin non nul partout (c'est le
  but de l'opération) ;
- 0 slug dupliqué ; 0 ligne avec verified=true ou verification_level non nul sur `imported` ;
- 0 ligne approved créée par le ré-import ;
- 0 coordonnée arrondie à 2 décimales parmi les nouvelles lignes ;
- aucun nouvel ERROR dans `get_advisors` ;
- contrôle croisé « en mer ou à terre » par sondage : la piste recommandée dans
  INCIDENT-2026-08-06-coordonnees.md est de passer un échantillon à Open-Meteo Marine, qui
  renvoie une erreur sur un point terrestre. Fais-le sur au moins 30 plages tirées au hasard.

Puis, tant que tu as le jeu de contrôle sous la main :
- REJOUE L'AUDIT GÉOGRAPHIQUE DU LOT 8 SUR LES 94 FICHES PUBLIÉES DU 29. C'est planifié dans
  LOTS.md et impossible avant le ré-import du 29, faute de jeu de contrôle. Méthode dans
  lots/lot-08-audit-geo.md : pour chaque fiche publiée, distance à l'objet OSM homonyme du
  même import ; écart supérieur à ~1 km = objet mal nommé ou mal placé, tu dépublies
  (`pending`, contenu vidé, slug OSM restauré) et tu me le listes. Sur le 56, ça avait trouvé
  1 erreur sur 22.

═══════════════════════════════════════════════════════════════════════
LIVRABLES
═══════════════════════════════════════════════════════════════════════
1. Un RECAP par fichier relu : docs/contenu/curation-spots/lots/reimport-DD.md — nombre de
   candidats bruts, retraits par motif, réassignations avec leurs coordonnées, ligne
   « Positionnement », lignes réellement insérées.
2. Mise à jour de docs/contenu/curation-spots/LOTS.md : colonne « Backlog » et colonne
   « Ré-import requis » du tableau des 24 départements, compteurs vérifiés en SQL, une ligne
   de journal par département, et retrait des blocs devenus faux (le bloc « ⚠️ Reste à
   exécuter par John » n'aura plus lieu d'être).
3. Un RECAP de l'audit du 29, si des fiches ont été dépubliées.
4. Un résumé court pour moi à la fin : ce qui est entré, département par département, ce que
   tu as retiré et pourquoi, ce qui reste bloqué, et le nouveau backlog total.

Posture (CLAUDE.md §19) : effort maximal, très critique. Ce prompt est un guide, pas une
vérité. Vérifie chaque hypothèse contre le vrai code et la vraie base, remets-le en cause s'il
se trompe, et préfère « ⚠️ DEMANDER À JOHN » à l'invention. Si un département renvoie un
résultat qui te paraît absurde (zéro objet, ou dix fois trop), arrête-toi et dis-le moi plutôt
que d'insérer.
```

---

## Pourquoi ce prompt est écrit comme ça

- **Il commence par la lecture des 5 fichiers qui font foi**, et dit explicitement qu'ils priment sur le prompt. C'est ce qui évite qu'une session fraîche parte sur des chiffres périmés.
- **Il sépare génération et insertion**, parce que c'est exactement la confusion qui a coûté une journée le 07/08 : le script écrit un fichier, il n'insère jamais.
- **Il impose le critère de réassignation en deux dimensions.** L'erreur à une seule dimension est avérée deux fois sur ce chantier (la fausse alerte Piriac / Hœdic, et le critère `lat < 47.435`).
- **Il fait rejouer l'audit géo du 29** pendant que le jeu de contrôle est disponible, ce qui n'est possible qu'après le ré-import du 29. C'est la seule fenêtre.
- **Il verrouille les interdits** au niveau où ils comptent : rien en `approved`, rien sur `geom`, pas de destructif, pas de push.
