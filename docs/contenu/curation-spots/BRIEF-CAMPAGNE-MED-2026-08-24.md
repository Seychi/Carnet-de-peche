# Campagne de curation — Méditerranée : Bouches-du-Rhône (13), Alpes-Maritimes (06) et Var (83)
## Brief d'exécution, semaine du **lundi 24/08/2026**

> Rédigé le **2026-08-19**. Chiffres **mesurés en SQL live le 19/08**, pas repris des documents.
> Cadre méthodo : `docs/contenu/curation-spots/PLAYBOOK.md` (fait foi) + `LOTS.md` (état vivant).
> À lire avant de démarrer : `INCIDENT-2026-08-06-coordonnees.md`, `lots/lot-15-22.md`,
> `docs/sprint-78/RECAP.md` § « Deux défauts de qualité trouvés APRÈS publication ».
> Décisions John 2026-08-19 : **Méditerranée (13 puis 83)** ✅ · **mode délégué + 1 lot/jour
> automatique** ✅ · le sprint 89 tourne en parallèle sur du code, cette lane ne touche que du contenu ✅.
> **Ajout du 2026-08-19 (question de John) : le 06 entre dans la campagne**, cf §1 bis et la note
> `lots/lot-13-CORRECTION-06.md` qui débloque son arbitrage.

---

## 0. Pourquoi le 13 et le 83, et pourquoi cette semaine

Trois raisons qui tiennent ensemble, et une quatrième découverte en préparant ce brief.

1. **C'est là qu'est le gisement.** 278 spots en attente dans le 13, **423 dans le 83** : le Var est
   le plus gros backlog de France, devant le Finistère.
2. **La saison méditerranéenne court plus tard** que l'Atlantique. Publier fin août sert encore
   septembre et octobre ; les mêmes fiches publiées en Bretagne arriveraient après la bascule.
3. **L'ISR fonctionne enfin** (S84 + hotfix S88, 17-18/08). Avant, publier des centaines de pages
   dynamiques aurait brûlé du CPU Vercel sans être exploré. La fenêtre est ouverte depuis trois jours.
4. ★ **Le 13 et le 83 contournent l'arbitrage bloqué.** Les cinq familles d'anomalies de
   `lots/lot-13-audit-reimport.md`, en attente de ton GO depuis le 08/08, portent sur le **85**
   (Marais poitevin), le **22/35** (frontière du Frémur), le **06** (Italie) et le **2A/2B**
   (Scandola). **Aucune ne touche le 13 ni le 83.** Choisir la Méditerranée continentale sud, c'est
   travailler une semaine entière sans avoir besoin de cet arbitrage.
5. ★ **Et le 06 se débloque tout seul, parce que son arbitrage reposait sur une erreur.** Détail au
   §1 bis : sur les « 9 spots en Italie » de l'audit, **3 le sont, 6 sont à Menton et à
   Roquebrune-Cap-Martin**. Le blocage portait sur 5 lignes, pas sur un département.

---

## 🧠 Connecteurs & sous-agents (cf `CLAUDE.md` §20)

| Quand | Sous-agent → connecteur | Pourquoi |
|---|---|---|
| Extraction du lot, écriture des fiches, contrôles post-lot | `supabase` (write) → **supabase-guard** | Lire le backlog live AVANT (les chiffres du §1 périment), écrire un UPDATE par spot, vérifier `get_advisors` après. Jamais de SQL destructif. |
| Porte 1 (position) et porte 2 (réglementation) | **WebSearch / WebFetch** | Sources primaires : Géoportail, parcs nationaux, arrêtés préfectoraux, communes. Une source par affirmation, citée au RECAP. |
| Porte 4 (lisibilité) + rendu réel des fiches | **qa-chrome** → Claude in Chrome | Lire 2-3 fiches publiées sur `/spots/[slug]` en fin de lot, sur mobile 390 px. Le gabarit ne prouve rien, la sortie si. |
| Doute sur une colonne, une contrainte ou une valeur autorisée | `supabase` (RO) | `structure`, `hazards`, `difficulty` ont des domaines fermés : les relire plutôt que les supposer. |

---

## 1. L'état réel, mesuré le 19/08 en SQL live

```sql
select trim(department) dept, coalesce(generation_batch,'(aucun)') batch, moderation_status, count(*)
from spots where trim(department) in ('13','83') group by 1,2,3 order by 1,2;
```

| Dépt | Publiées | dont lot `S78-MED-01` | En attente | Rejetées | Cible | Reste à écrire |
|---|---|---|---|---|---|---|
| **13** Bouches-du-Rhône | **36** | 25 | **278** | 10 | 100 | **64** |
| **06** Alpes-Maritimes | **34** | 25 | **114** | 1 | 60 | **26** |
| **83** Var | **36** | 25 | **423** | 0 | 100 | **64** |
| **Total** | 106 | 75 | **815** | 11 | 260 | **154** |

Structure des spots en attente (c'est ce qui dicte l'ordre de traitement) :

| Dépt | `plage` | `pointe_rocheuse` | `digue` | `cale` | `passe` | `NULL` (à trancher) |
|---|---|---|---|---|---|---|
| 13 | 54 | 63 | 10 | 2 | 0 | **149** |
| 83 | **192** | 109 | 5 | 2 | 1 | **114** |
| 06 | (majorité `plage`, cf requête du §6) | | | | | |

Base entière au 19/08 : **607 fiches publiées** · 3 818 importées en attente · 9 fiches curées
dépubliées (incident du 06/08, reprises par le **Bloc D du sprint 89**, pas ici) · 4 605 spots.

**154 fiches à écrire pour finir trois départements.** À 25 par lot, la semaine en couvre 125 : le
13 et le 06 sont **finis**, le 83 arrive à ~85/100 et se termine au début de la semaine suivante.
C'est un périmètre qui se termine, pas un robinet qu'on ouvre.

---

## 1 bis. Le cas du 06 — le blocage n'était pas là où on croyait

**État mesuré le 19/08** : **34 fiches publiées** (25 du lot `S78-MED-01` + 9 antérieures),
**114 en attente**, 1 rejetée, **cible 60** → il reste **26 fiches à écrire**. C'est **un lot et
demi**, et le département est fini.

Le 06 était écarté de cette semaine parce qu'il figure dans l'arbitrage en attente
(`lot-13-audit-reimport.md` §3.3, « 9 spots situés en Italie »). **Vérification faite à la
coordonnée, ce verdict est faux aux deux tiers.**

| | Longitude | Verdict corrigé |
|---|---|---|
| Spiaggia del Darsenún · Punta Garavano · Spiaggia di Capo Mortola | 7,537 à 7,541 | 🇮🇹 hors France, **rejet justifié** |
| Plage Hawaï · Plage Rondelli · Plage des Sablettes · Plage du Marché · Plage du Casino | 7,494 à 7,525 | 🇫🇷 **Menton**, à curer |
| Plage du Buse | 7,462 | 🇫🇷 **Roquebrune-Cap-Martin**, à curer |

La frontière franco-italienne atteint la mer à **≈ 7,5266 °E** (pointe Saint-Ludovic). Six postes
réels partaient en `rejected` parce que trois voisins italiens avaient donné leur nationalité à la
grappe. Analyse complète et verdicts corrigés : **`lots/lot-13-CORRECTION-06.md`**.

★ **Ce que l'audit n'avait pas vu, et qui compte davantage : Monaco.** La bbox du 06 englobe la
Principauté, État souverain où la pêche relève du droit monégasque et où la **réserve marine du
Larvotto** est réglementée. Deux lignes sont concernées (« Plage du Solarium » 7,42928 et
« Anse de la Grue » 7,42130). ⚠️ **Ne pas filtrer par tranche de longitude** : « Plage Marquet »
et « Plage Pointe des Douaniers » sont à **Cap d'Ail**, en France, et « Pointe de la Veille » à
Cap Martin. Chaque ligne se tranche sur sa coordonnée contre le tracé réel.

**Porte 2 spécifique au 06** : la question n'est pas la zone de non-prélèvement (le 06 n'a ni parc
national marin ni ZNP comparables aux Calanques) mais la **frontière** : Italie à l'est, Monaco au
milieu. Le premier lot du 06 produit, comme livrable réutilisable, **la liste des spots hors
territoire français**, tranchée ligne par ligne.

---

## 2. ★ La décision de méthode : cette campagne écrit à la main, et c'est mesurable

Deux méthodes coexistent dans le repo, et personne n'a encore tranché laquelle marche.

| | Méthode PLAYBOOK (lots 1 à 15) | Méthode S78 (lot `S78-MED-01`) |
|---|---|---|
| Volume | ~20-25 par lot | 200 d'un coup |
| Rédaction | recherche par spot, écriture à la main | génération, portes de qualité automatiques |
| Longueur des descriptions | 300 à 450 caractères | **761 à 883** |
| Couverture | 29, 56, 22 | les 9 départements méditerranéens, 25 chacun |
| Verdict SEO | jamais isolé | **pas lisible avant le 03/09** (protocole de cohortes) |

La méthode S78 a publié 191 fiches le 15/08 et **on ne saura pas avant le 03/09** si elles rankent :
au débit d'exploration mesuré (~10 URL/jour), Google met environ 19 jours à les voir une première fois.
Empiler 128 fiches générées de plus avant cette date, c'est doubler une mise sans avoir vu la carte.

**Décision pour cette campagne : profondeur PLAYBOOK, traçabilité S78.**

- Chaque fiche est **recherchée et écrite par spot**, selon `PLAYBOOK.md` §4 à §6. Pas de gabarit
  rempli en série.
- Chaque fiche porte un `generation_batch` distinct : **`S89-MED-13-01`**, `S89-MED-13-02`, …,
  `S89-MED-83-01`, … (migration 113, colonne déjà en place, aucune migration à écrire).
- Résultat : au 03/09, trois cohortes comparables dans GSC **sur la même façade et la même fenêtre** :
  `generation_batch is null` (curé historique) · `S78-MED-01` (généré) · `S89-MED-*` (écrit à la main).
  **La semaine produit une réponse à la question « est-ce que la profondeur paie », sans expérience dédiée.**

⚠️ **Ne toucher à aucune fiche `generation_batch='S78-MED-01'`.** Ni contenu, ni statut, ni titre.
C'est une cohorte sous mesure jusqu'au 03/09.

---

## 3. Ce que « curée complète » veut dire, champ par champ

Aucune fiche ne part avec un champ vide. La porte est binaire : les 8 champs, ou la fiche reste `pending`.

| Champ | Règle | Source |
|---|---|---|
| `name` | Toponyme réel. Un libellé OSM générique (« Accès plage », « Mise à l'eau », « Slipway », « Quai n°1 ») est **rejeté ou renommé** avec le toponyme retrouvé. Renommage **avant** approbation, jamais après : l'URL devient stable à la publication. | `isInvalidName()` de `scripts/import-osm-spots.ts` + recherche |
| `geom` | **Non modifiée.** On publie ou on ne publie pas, on ne déplace pas un point. Un point faux est un rejet, pas une correction. | — |
| `structure` | ∈ {digue, plage, pointe_rocheuse, estuaire, cale, passe, cassure}. **149 + 114 spots sont à `NULL`** : la curation tranche, c'est une part du travail, pas un détail. | OSM + imagerie + bathy |
| `species` | **4 à 7**, issues de la matrice façade × structure (`PLAYBOOK.md` §5) resserrée par la recherche et la bathy. Potentiel du poste, **jamais des prises affirmées**. | matrice + recherche |
| `techniques` | 1 à 3 parmi `leurres`, `surfcasting`, `flottante`, `vif`. | déduit du poste |
| `difficulty` | 1 à 5, barème `PLAYBOOK.md` §6. Jamais 1 sans certitude d'accès de plain-pied sécurisé. | accès réel |
| `hazards` | **2 à 4**, vocabulaire fermé uniquement. En Méditerranée les plus fréquents : `rochers_glissants`, `ressac`, `courants_forts`, `falaise`, `sentier_expose`, `baignade_dangereuse`. **Ne pas créer de nouvelle valeur.** | type de poste |
| `description` | **300 à 450 caractères.** Ce qu'est le poste, ce qu'on y cherche et quand, un conseil concret. Tutoiement, voix pêcheur, **aucun tiret cadratin**. | recherche |
| `access_notes` | **120 à 250 caractères.** Comment on y arrive à pied, la contrainte réelle. ⚠️ en tête si contrainte sérieuse. | recherche |

> On garde volontairement **300-450** et non les 761-883 du lot S78 : c'est le calibre du catalogue
> curé historique, celui dont on veut mesurer si la profondeur paie. Changer les deux variables à la
> fois (méthode **et** longueur) rendrait la comparaison du 03/09 illisible.

---

## 4. Les quatre portes de qualité, dans l'ordre, toutes bloquantes

Aucune fiche ne franchit une porte « à peu près ». Une porte échouée = la fiche reste `pending` et
la raison va au RECAP de lot.

### Porte 1 — La position est exacte

C'est la porte qui a coûté le plus cher au projet (incident du 06/08, 9 fiches dépubliées ;
« Pointe du Bile » à 12 km au lot 6). **Les deux contrôles, pas l'un ou l'autre.**

1. **Test « en mer »** — passer le point à **Open-Meteo Marine**. Un point terrestre renvoie une
   erreur, un point en mer renvoie de la houle. Le script du lot 8 est réutilisable tel quel
   (94/94 sur le 29, 48/48 sur 48 plages). **À passer sur les 25 spots du lot, en une fois, avant
   toute rédaction** : c'est le filtre le moins cher et le plus discriminant.
2. **Croisement toponymique** — confronter la coordonnée à une source qui donne la position du
   toponyme. **Écart > ~1 km : on ne publie pas.** Sources de contrôle qui ont fait leurs preuves,
   dans cet ordre : listes Wikipédia sourcées **Géoportail**, **mapcarta** pour la commune de
   rattachement, pages communales et sites d'offices de tourisme.
   ⚠️ **Ne jamais déduire la commune du seul nom de l'objet OSM.**
3. **Jamais de latitude seule.** Toute anomalie de rattachement départemental se démontre sur les
   **deux** coordonnées (fausse alerte du lot 6, levée au lot 10 : dix spots partaient dans le
   mauvais département sur une lecture de longitude).

### Porte 2 — La pêche y est autorisée

**C'est la porte spécifique à cette campagne, et elle est plus lourde qu'en Bretagne.** Le 13 et le
83 concentrent les zones réglementées les plus strictes de France métropolitaine.

- **13 — Parc national des Calanques.** Sept **zones de non-prélèvement (ZNP)** couvrent 10 % du
  territoire marin du parc : **toute pêche y est interdite en permanence**. Le parc publie les
  **coordonnées GPS des ZNP et des ZPR** : les récupérer et **tester chaque spot du lot contre ces
  polygones**, pas contre le nom de la calanque. S'y ajoutent la « réserve marine des enfants » à
  La Ciotat, un quota de 7 kg/personne/jour, le marquage par ablation de la nageoire caudale
  au-delà de 15 cm, et la déclaration obligatoire des captures.
- **83 — Parc national de Port-Cros et Porquerolles.** Zone cœur très réglementée, périmètres de
  navigation et de mouillage variables selon arrêté annuel. **Vérifier l'arrêté en vigueur à la
  date du lot**, pas un article de presse : plusieurs zones publiées au printemps 2026 portaient
  une échéance au 1er juin 2026 et ne valent plus.
- **Réflexe playbook §2.4, rappelé parce qu'il coupe dans les deux sens** : Natura 2000, aire marine
  protégée ou terrain du Conservatoire du littoral **n'interdisent pas** la pêche à la ligne du bord.
  Vérifier ce que l'arrêté interdit **réellement** (souvent : engins dormants, pêche à pied, chasse
  sous-marine) avant de rejeter. À l'inverse, **une ZNP interdit tout, et c'est un rejet sec**.
- **Dans le doute sur une interdiction, on ne publie pas.** Le verdict est `rejected` avec la raison
  et le lien de l'arrêté au RECAP.

> **Livrable attendu du premier lot du 13** : un tableau des ZNP avec leurs coordonnées et la liste
> des spots du backlog qui tombent dedans. Il servira à **tous** les lots suivants du département,
> et il se fait une fois.

### Porte 3 — Le nom est lisible et unique

Les deux défauts trouvés **après** publication du lot S78, à ne pas reproduire :

1. **6 fiches portaient une étiquette OSM, pas un nom** (« Accès plage », « Mise à l'eau »). Plusieurs
   points distants de kilomètres partageaient le même libellé et produisaient un contenu strictement
   identique. Le prédicat `nom_generique` durci existe : **l'appliquer**. Il accepte un nom qualifié
   comme « Mise à l'Eau du Vidourle » et refuse le libellé nu.
2. **3 paires de vraies homonymes** se cannibalisaient (« Le Clapotis », « Le Petit Travers »).
   Contrôle d'homonymie **intra-lot ET contre les 607 fiches déjà publiées**, seuil de doublon **500 m**.
   ★ Un nom homonyme déjà rejeté ailleurs **ne vaut pas rejet** pour son homonyme : vérifier que c'est
   le même objet par la coordonnée et le slug, jamais par le nom (leçon du lot 12, les deux
   « Pointe du Vieux Château » du 56).

### Porte 4 — Le texte se lit

Leçon explicite du sprint 78 : *les tests cherchaient des mensonges, pas de la lisibilité.* Sont
passées en production « dans les Bouches-du-Rhône (Bouches-du-Rhône) » et « se prête à au sar ».
**Sur des centaines de pages, une tournure bancale répétée est le signal le plus clair possible que
le contenu est fabriqué.**

- Relire **la sortie réelle**, pas le gabarit. Au minimum 5 fiches par lot lues en entier, à voix haute.
- `node scripts/lint-copy-dashes.mjs` : **aucun tiret cadratin** dans description ni access_notes.
- Zéro répétition de département entre parenthèses, zéro double préposition, zéro accord bancal
  (`species` porte des genres différents : « la dorade », « le sar », « l'orphie »).
- **Descriptions toutes distinctes** : `select count(*), count(distinct description) from spots
  where generation_batch='S89-MED-13-01';` doit donner deux fois le même nombre.

---

## 5. Spécificités méditerranéennes à ne pas rater

- **« Loup » n'est pas un slug.** En Méditerranée le loup est le bar : slug `bar` partout. La copy de
  la fiche peut écrire « loup », la donnée non.
- **Matrice espèces Méditerranée** (`PLAYBOOK.md` §5, point de départ à affiner) : digue et cale →
  bar, sar, dorade royale, mulet, oblade, orphie, calmar (automne) · plage → dorade royale, sar, bar,
  oblade, sole · pointe rocheuse → bar, sar, dorade royale, oblade, congre · passe → bar, dorade
  royale, congre. Les 6 espèces ajoutées au sprint 29 sont méditerranéennes pour trois d'entre elles :
  **barracuda, liche, marbré** (+ tassergal, Med et Atlantique).
- **Pas de marée.** `lib/conditions/tide-departments.ts` **exclut volontairement la Méditerranée**
  (micro-marée surtout météorologique, non auditée). Conséquence directe : **aucune description ne
  doit parler de coefficient, d'étale ou de marée descendante** sur ces fiches. Le créneau se joue sur
  le vent, la lumière et la saison. C'est l'erreur la plus facile à commettre en recopiant le ton des
  fiches bretonnes.
- **Corollaire favorable** : la Méditerranée étant hors du périmètre de l'A/B des titres marée du
  sprint 83, **cette campagne ne perturbe pas la fenêtre de mesure ouverte jusqu'au 07/09**. Vérifié
  dans `DEPARTMENT_FACADE`.
- **Les 192 `plage` du 83** sont le plus gros gisement et le niveau 2 du playbook §9.1, jamais traité
  à grande échelle. Une plage nommée est un vrai poste de surfcasting : ne pas la traiter comme un
  sous-produit des pointes.

---

## 6. Déroulé d'un lot (1 par jour, 25 spots)

1. **Extraire** les 25 spots, dans l'ordre de notoriété du playbook §9.1 (pointes, caps, digues, môles,
   estacades, phares → plages et grandes anses → estuaires, passes, cales → micro-toponymes en dernier) :
   ```sql
   select id, name, slug, trim(department) dept, structure,
          ST_Y(geom::geometry) lat, ST_X(geom::geometry) lng
   from spots
   where source='imported' and moderation_status='pending' and trim(department)='13'
   order by name limit 25;
   ```
   `geom` est lisible via le connecteur, **elle ne sort jamais du RECAP interne**.
2. **Porte 1 en lot** : passer les 25 points à Open-Meteo Marine d'un coup. Écarter les échecs avant
   d'écrire quoi que ce soit.
3. **Porte 2 en lot** pour le 13 : tester les 25 contre les polygones ZNP/ZPR.
4. **Par sous-grappe géographique** (les spots voisins partagent commune et contexte, la recherche
   s'amortit) : recherche → verdict (`curate_full` / `curate_light` / `merge` / `reject`) → rédaction.
   **Garde-fou anti-thin-content : si le lot dépasse 50 % de `curate_light`, resserrer le tri** et
   préférer le rejet aux light douteux.
5. **RECAP de lot** dans `docs/contenu/curation-spots/lots/lot-NN-13.md` : tableau
   `nom | commune | verdict | espèces | difficulté | hazards | preuve (A/B/C/D + lien)`, puis les fiches.
6. **Écriture DB**, un UPDATE par spot, jamais de SQL destructif :
   ```sql
   update public.spots
      set name=…, structure=…, species=…, techniques=…, difficulty=…,
          description=…, access_notes=…, hazards=…,
          generation_batch='S89-MED-13-01',
          moderation_status='approved', updated_at=now()
    where id='…' and slug='<slug d'origine>' and source='imported' and moderation_status='pending';
   ```
   ★ **La clause `and slug='…'` est OBLIGATOIRE** (décision 15, incident du lot 10 : une fiche écrite
   sur l'identifiant d'un autre spot, en silence). Un `id` mal recopié ne modifie alors rien du tout.
7. **Vérifications post-lot** : 2-3 fiches live sur `/spots/[slug]` rendent le contenu · les nouveaux
   slugs sont dans `/sitemap.xml` · `count(distinct description) = count(*)` sur le batch ·
   `get_advisors` sans nouvel ERROR · lint tirets vert.
8. **Cocher `LOTS.md`** (statut, compteurs, date) et s'arrêter proprement. L'état vit dans `LOTS.md`
   et en base, **jamais en mémoire de session** : un run interrompu reprend au suivant.

---

## 7. Plan de la semaine

| Jour | Lot | Dépt | Contenu | Livrable en plus |
|---|---|---|---|---|
| Lun 24/08 | `S89-MED-13-01` | 13 | 25 spots, ordre notoriété | **Tableau des ZNP Calanques + spots impactés** |
| Mar 25/08 | `S89-MED-13-02` | 13 | 25 spots | — |
| Mer 26/08 | `S89-MED-13-03` | 13 | ~14 spots, dont les `structure NULL` à trancher | 13 atteint 100, **département fini** |
| Jeu 27/08 | `S89-MED-06-01` | **06** | 25 spots, Menton → Cap d'Antibes | **Liste des spots hors territoire français** (Italie, Monaco), tranchée ligne par ligne |
| Ven 28/08 | `S89-MED-06-02` | **06** | ~11 spots | 06 atteint 60, **département fini** |
| *(semaine suivante)* | `S89-MED-83-01` … | 83 | 2 lots + 1 court | 83 fini, dont les 192 `plage` |

Fin de semaine visée : **13 fini (100) et 06 fini (60)**, soit **~697 fiches publiées** au total
contre 607 aujourd'hui (+64 sur le 13, +26 sur le 06). Le 83 prend la semaine suivante.

★ **Ce que ce plan échange, sciemment** : une semaine à deux départements **terminés** plutôt qu'un
et demi. Trois départements finis au total (29, 56, 13, 06 = quatre en réalité) se raconte mieux
qu'un Var à moitié fait, et le 06 est le plus petit reste à écrire de toute la façade. Si tu préfères
attaquer le Var tout de suite, inverse simplement jeudi/vendredi avec les lots 83 : le brief tient
dans les deux ordres.

Les lots du mercredi et du vendredi sont volontairement plus courts : il ne reste que ~14 puis
~11 fiches pour boucler. **On ne remplit pas un lot pour faire du volume.**

**Cadence** : mode délégué (mode B du playbook §8.4), publication directe, spot-check a posteriori
par John. **Tout doute reste `pending` : le doute ne se publie jamais.**

---

## 8. Ce qu'il ne faut PAS faire

- ⚠️ **Ne pas toucher `geom`, `geom_public`, `visibility`, `source`, `verified`, `verification_level`,
  ni aucune policy RLS.** Le floutage et le gating carte ne sont pas le sujet de cette campagne.
  `verified` reste `false` et `verification_level` reste `NULL` : ces valeurs impliquent une
  vérification humaine ou terrain qu'on n'a pas.
- ⚠️ **Ne pas toucher la cohorte `S78-MED-01`** (50 fiches sur le 13 et le 83, 191 au total) avant
  le verdict du **03/09**.
- ⚠️ **Ne pas toucher aux titres `/spots/*`** ni au maillage interne : fenêtre S83 jusqu'au **07/09**.
  Cette campagne **crée** des fiches, elle ne **retitre** pas les existantes.
- **Ne pas remplir un quota en inventant des postes.** Si le 13 n'a plus de poste réel documentable
  avant 100, il est fini à moins de 100, et le RECAP le dit.
- **Ne pas corriger une coordonnée douteuse.** Point faux = rejet, pas déplacement.
- **Pas de migration**, pas de push git sans validation.

---

## 9. Décisions attendues de John (avant lundi, sinon l'agent s'arrête dessus)

1. **Étangs et lagunes.** Le 13 contient l'**étang de Berre** et les étangs de Camargue ; le 83
   l'**étang de Villepey** et les Salins d'Hyères. Ce sont des eaux saumâtres reliées à la mer, où on
   pêche le loup et le muge à la canne du bord. Le périmètre v1 dit « mer, pas d'eau douce » et ne
   tranche pas le cas saumâtre. **Dans le périmètre, ou rejet systématique ?** À défaut de réponse,
   l'agent les laisse `pending` et les compte à part.
2. **Cible du 83.** 100 est la cible actuelle pour un département qui a **423 spots en attente** et le
   plus long linéaire côtier de Méditerranée. **On s'arrête à 100, ou on pousse le Var à 150 ?**
   À défaut de réponse : 100, conformément au plan de couverture.
3. **La tâche planifiée.** Le mode « 1 lot/jour automatique » suppose une tâche planifiée qui ouvre
   une session fraîche chaque matin avec la ligne de lancement du §10. **Je peux la créer sur ton
   feu vert** (elle ne partira pas toute seule sans lui). Heure proposée : **7 h 00, du lundi au
   vendredi**, pour que le RECAP du lot t'attende quand tu ouvres.
4. **Le 06, lots A et B** (5 rejets seulement, cf `lots/lot-13-CORRECTION-06.md` §5) : GO sur les
   3 spots italiens et les 2 spots monégasques. **Les 6 spots de Menton et Roquebrune ne demandent
   aucun arbitrage**, ils repartent dans le flux normal. À défaut de réponse, l'agent laisse les
   5 lignes `pending` et cure le reste du 06 sans elles.
5. *(sans effet sur cette semaine)* Le reste de `lots/lot-13-audit-reimport.md` (85, 22/35, 2A/2B)
   reste ouvert. Il ne bloque ni le 13, ni le 06, ni le 83, mais il bloquera la vague suivante.
   ⚠️ **À relire avec la leçon du 06** : ces verdicts ont été pris par grappe, pas ligne par ligne.

---

## 10. Ligne de lancement (à copier-coller par John, ou portée par la tâche planifiée)

> ultracode — effort xhigh. Traite le lot suivant de la campagne Méditerranée selon
> `docs/contenu/curation-spots/BRIEF-CAMPAGNE-MED-2026-08-24.md` et `docs/contenu/curation-spots/PLAYBOOK.md`.
> Lis d'abord `LOTS.md` pour savoir où on en est, re-vérifie le backlog en SQL live avant de partir sur
> les chiffres du brief, puis exécute les 4 portes de qualité dans l'ordre avant toute rédaction.
> Mode délégué : tu publies, tout doute reste `pending`. Termine par le RECAP de lot et la mise à jour
> de `LOTS.md`. Ne push pas.

---

## 11. Posture

Ce brief est un guide, pas une vérité. Les chiffres du §1 périment : les re-vérifier en SQL live en
début de session. Le playbook prime sur ce document en cas de contradiction de méthode ; ce document
prime sur le playbook pour tout ce qui est spécifiquement méditerranéen (portes 2 et §5). Toute
décision produit ambiguë non couverte ici : **⚠️ DEMANDER À JOHN**, ne pas inventer.
