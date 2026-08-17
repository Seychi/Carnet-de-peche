# QA — le tunnel « loguer une prise sans compte »

> Menée le **2026-08-17** sur la **production** (`www.carnet-de-peche.com`), dans un Chrome réel,
> déconnecté, sur `/carnet/nouvelle?spot_id=pointe-du-grand-minou`.
> Parcours joué de bout en bout : espèce = Bar, taille = 45 cm, puis « Garder ma prise en
> brouillon ». Mesures relevées par script dans la page, pas à l'œil.
>
> ⚠️ **Limite de la QA** : Chrome sur Windows refuse de descendre sous ~500 px de largeur de
> fenêtre. Le viewport réel était donc **501 × 660**, pas 390 × 844. Tous les points de mise en
> page sont sous le breakpoint `sm:` de Tailwind (640 px), donc la variante mobile est bien celle
> qui a été testée — mais **les hauteurs en 390 px seront plus grandes** (plus de retours à la
> ligne). À rejouer sur un vrai téléphone pour les chiffres exacts.
>
> ⚠️ **Effet de bord assumé** : ce parcours a émis **1 `pending_catch_started` et 1 impression de
> mur `pending_catch`** dans PostHog en production. Sur une base de 4 en 90 jours, c'est 25 % de
> pollution : en tenir compte à la prochaine lecture de cette métrique.

---

## 0. Le constat en une ligne

Le geste est bon, l'exécution coûte un clic de trop — et surtout **le clic de trop est plus gros,
plus visible et permanent, alors que le bon clic est plus petit et défile hors de l'écran.**

Contexte de volume : sur 90 jours, le mur `pending_catch` a été **vu 4 fois et cliqué 0 fois**.
Le tunnel n'a converti personne, sur un échantillon minuscule.

---

## 1. Ce qui marche, et qu'il ne faut pas casser

Avant les défauts, parce que trois choses sont bien faites et méritent d'être conservées :

- **Le défilement automatique fonctionne.** `CatchForm.tsx:555-558` amène le mur sous les yeux
  après l'enregistrement du brouillon. Mesuré : après le clic, le CTA « Créer mon carnet » est à
  `top: 410 / bottom: 454` dans un viewport de 660 px, **entièrement visible et non masqué par le
  footer** (dont le haut est à 579). Ce n'est donc **pas** un bug « rien ne se passe ».
- **La chaîne de rejeu est correcte.** Le CTA pointe sur
  `/auth/register?redirect=%2Fspots%2Fpointe-du-grand-minou`, et `replayPendingDrafts()` est bien
  appelé depuis les trois portes d'authentification (`auth/callback/route.ts:31`,
  `auth/confirm/route.ts:47`, `auth/login/actions.ts:359`). La prise **devient une vraie ligne**
  après inscription. Le tunnel n'est pas cassé, il est mal fini.
- **La saisie est légère et honnête** : 2 champs obligatoires seulement, « min légal 42 cm »
  affiché sous le curseur de taille, photo et notes masquées avec l'explication (« elle ne tient
  pas dans un brouillon »).

---

## 1bis. ★ Défaut n°0 — LE vrai bug : le mur oublie que le brouillon existe

> Ajouté après relance de John (« as-tu constaté le bug qui fait que le CTA n'apparaît qu'après un
> premier clic ? »). Le comportement au **premier** passage est délibéré (cf §2). Mais en creusant
> la question, il y a bien un **bug**, et il est juste à côté.

`draftState` est initialisé à `'idle'` **sans condition** (`CatchForm.tsx:249`) et n'est jamais
alimenté ailleurs qu'au moment de la soumission (`:552`). **Rien ne relit le cookie au montage.**

Pire : la fonction qui ferait exactement ça existe — `readPendingCatch()`
(`lib/drafts/client.ts:82`) — et **elle n'est appelée de nulle part**. C'est du code mort.

### Reproduit sur la production, deux fois, avec preuve

1. Formulaire rempli (bar, 45 cm) → « Garder ma prise en brouillon » → le mur avec CTA apparaît.
2. **Rechargement** de `/carnet/nouvelle?spot_id=pointe-du-grand-minou` :
   → `etatAuChargement: "paragraphe gris seulement"`, footer = « Garder ma prise en brouillon ».
   **Le CTA a disparu.**
3. Preuve que le cookie est bien vivant — `/auth/register` chargé juste après affiche, lu côté
   serveur : **« Ta prise de bar à Pointe du Grand Minou t'attend. 30 secondes, sans carte
   bancaire. »**

**Le même cookie est lu par la page d'inscription et ignoré par le formulaire.**

### Le scénario réel, et il est fréquent

> je clique « Créer mon carnet » → j'arrive sur l'inscription → j'hésite, je reviens en arrière
> pour vérifier ma taille → **le CTA n'est plus là** → je dois recliquer « Garder ma prise en
> brouillon » pour le faire revenir

C'est exactement le symptôme décrit, sauf qu'il ne se produit pas une fois : **il se reproduit à
chaque retour sur le formulaire.** Et il frappe précisément les gens les plus proches de
convertir, ceux qui sont allés jusqu'à l'inscription et sont revenus.

### Correctif

Initialiser `draftState` depuis le cookie, avec la fonction déjà écrite :

```ts
const [draftState, setDraftState] = useState<'idle' | 'saved' | 'failed'>(() =>
  anonymousDraft && readPendingCatch()?.spot_slug === spotContext?.slug ? 'saved' : 'idle',
)
```

⚠️ Comparer le `spot_slug` : un brouillon posé sur un autre spot ne doit pas faire croire que
*celui-ci* est enregistré. Et l'initialiseur doit rester paresseux (lecture de cookie côté client
uniquement) pour ne pas casser le rendu serveur.

⚠️ Ne PAS déclencher le défilement automatique dans ce cas : au rechargement le visiteur n'a rien
cliqué, l'amener de force en bas de page serait pire. Le mur doit simplement **être là**.

---

## 2. Défaut n°1 — deux soumissions, et le leurre est plus gros que le but

C'est le défaut principal, et il explique le ressenti « pas très optimisé ».

Après l'enregistrement du brouillon, deux boutons coexistent. Mesures relevées dans la page :

| | Bouton du footer | CTA du mur |
|---|---|---|
| Libellé | **« Mettre à jour mon brouillon »** | **« Créer mon carnet »** |
| Dimensions | 454 × 57 px | 429 × 44 px |
| Surface | **25 783 px²** | 18 861 px² |
| Couleur de fond | `rgb(20, 184, 166)` | `rgb(20, 184, 166)` — **identique** |
| Taille de police | 16 px | 13,5 px |
| Comportement | **collant, toujours à l'écran** | défile, disparaît |

**Le bouton qui ne sert à rien est 1,37 fois plus grand que celui qui convertit, dans le même
teal, avec une police plus grosse, et il est le seul des deux à rester à l'écran en permanence.**

Le principe posé par le sprint 77 est juste — le commentaire de `CatchForm.tsx:1506` dit « il
n'arrive PAS avant le geste, mais après » — mais il a été implémenté comme **deux soumissions
explicites** au lieu d'une soumission qui change d'état.

### Correctif proposé

Le footer ne doit pas proposer une deuxième fois le brouillon. Après `draftState === 'saved'`, le
bouton du footer **devient** l'action d'inscription :

```
draftState === 'idle'   → footer = « Garder ma prise en brouillon »  (submit)
draftState === 'saved'  → footer = « Créer mon carnet »              (lien /auth/register)
                          + « Modifier ma prise » en lien texte secondaire, sans aplat
```

Le mur garde son rôle : il explique ce qu'on gagne. Mais l'action, elle, reste là où le pouce
l'attend. Zéro nouvel écran, zéro défilement supplémentaire.

**Variante plus ambitieuse** (à arbitrer) : après l'enregistrement, présenter le mur en
**bottom sheet** par-dessus le formulaire. Le mur est déjà le dernier élément du document, donc
sur mobile la feuille supprime tout défilement. Coût plus élevé, gain plus net.

---

## 3. Défaut n°2 — le focus reste sur le leurre

Mesuré juste après le clic : `document.activeElement` = **« BUTTON Mettre à jour mon brouillon »**.

Conséquences :
- l'anneau de focus visible est sur le mauvais bouton ;
- au clavier, **Entrée deux fois de suite ré-enregistre le brouillon** au lieu d'avancer ;
- l'ordre de tabulation depuis le point de focus ne mène pas au CTA.

### Correctif

Après `setDraftState('saved')`, déplacer le focus sur le CTA du mur (ou sur le conteneur du mur
avec `tabIndex={-1}`), dans le même `requestAnimationFrame` que le défilement déjà en place.

---

## 4. Défaut n°3 — rien n'est annoncé aux lecteurs d'écran

- Le conteneur du mur (`id="catch-pending-wall"`) n'a **ni `role`, ni `aria-live`** — relevé :
  `aucun`.
- La seule région `aria-live="polite"` de la page est **vide**.
- Le document passe de **2 150 px à 2 317 px** de hauteur, en silence.

Pour un utilisateur non-voyant, appuyer sur « Garder ma prise en brouillon » ne produit **aucun
retour** : le brouillon est posé, un bloc d'inscription est apparu, et rien ne le dit.

### Correctif

`role="status"` + `aria-live="polite"` sur le conteneur du mur, et une phrase d'annonce courte à
l'apparition : « Brouillon gardé sur cet appareil. Il ne manque que ton carnet. » C'est aussi une
amélioration pour tout le monde : un message d'état explicite vaut mieux qu'un changement de
libellé de bouton.

---

## 5. Défaut n°4 — ★ la récompense est invisible

Le plus intéressant, et le plus invisible dans le code.

Après inscription, `replayPendingDrafts()` crée la prise puis renvoie `returnPath`, calculé par
`returnPathForSlug` (`lib/drafts/schema.ts:175-178`) : **toujours `/spots/<slug>`**. Et
`actions.ts:359` utilise ce chemin *à la place* de `/onboarding/1`.

Donc le parcours complet d'un nouveau pêcheur est :

> je remplis ma première prise → je crée mon compte → **j'atterris sur la fiche du spot**

Il vient de loguer son premier poisson, et on ne le lui montre pas. Il ne voit ni sa prise, ni
son carnet, ni la moindre confirmation que ça a marché. Or `ReplayResult` porte **déjà**
`catchCreated: boolean` — l'information existe, elle n'est simplement pas utilisée pour choisir
la destination.

### Correctif

Quand `catchCreated === true`, envoyer sur **la prise créée** (`/carnet/<id>`) plutôt que sur la
fiche du spot. C'est le paiement de la promesse « elle y sera reportée telle quelle », et c'est
le seul moment du parcours où l'on peut enchaîner naturellement vers le seuil des 3 prises.

Cela demande de faire remonter l'`id` de la prise créée dans `ReplayResult` — `createCatch` le
renvoie déjà.

> ⚠️ Effet de bord à traiter dans le même geste : avec un brouillon, le nouvel inscrit **saute
> `/onboarding/1`** (`replayThen` remplace le fallback). Le commentaire de `actions.ts:355-358`
> l'assume (« le middleware l'impose dès la 1re route app ») — mais `/carnet/<id>` **est** une
> route app, donc le middleware le renverra aussitôt sur l'onboarding. À vérifier : il ne faut pas
> que le pêcheur voie sa prise une demi-seconde avant d'être éjecté vers l'onboarding. Soit on
> l'onboarde d'abord et on le ramène sur sa prise, soit on montre la prise sur une route non-app.
> **C'est la question à trancher avant d'implémenter ce correctif.**

---

## 6. Défaut n°5 — mineur : le formulaire fait 3,3 écrans

Relevé : `scrollHeight = 2150 px` pour un viewport de 660 px, soit **3,3 écrans** avant le mur,
qui est à `offsetTop 1916` (89 % de la profondeur de page). En 390 px de large, ce sera plus.

Ce n'est pas grave en soi — le formulaire est riche et bien découpé — mais ça se combine mal avec
le défaut n°1 : la seule chose visible en permanence pendant ces 3,3 écrans est un bouton qui
propose de garder un brouillon.

Piste, sans rien retirer : replier par défaut la carte **Confidentialité** en mode brouillon
anonyme. Un visiteur sans compte n'a pas encore d'abonnés — les deux interrupteurs « Coords
précises pour mes abonnés » / « publiques » lui demandent un arbitrage sur une audience qui
n'existe pas. Les valeurs par défaut du code (`precise_for_friends: true`,
`reveal_precise_to_public: false`) sont déjà les bonnes.

---

## 7. Récapitulatif, par rapport coût / gain

| # | Défaut | Correctif | Coût | Gain |
|---|---|---|---|---|
| **0** | ★ **BUG** — le mur oublie le brouillon à chaque rechargement | Initialiser `draftState` via `readPendingCatch()` (fonction morte déjà écrite) | **très faible** | **élevé** |
| 1 | Deux soumissions, le leurre est plus gros | Le footer devient « Créer mon carnet » après enregistrement | **faible** | **élevé** |
| 2 | Le focus reste sur le leurre | Déplacer le focus dans le `rAF` existant | très faible | moyen (a11y + clavier) |
| 3 | Aucune annonce | `role="status"` + phrase d'état | très faible | moyen (a11y) |
| 4 | La récompense est invisible | Atterrir sur la prise créée, pas sur le spot | moyen (⚠️ onboarding) | **élevé** |
| 5 | 3,3 écrans de formulaire | Replier Confidentialité en mode anonyme | faible | faible |

**Le défaut 0 est le seul vrai bug de la liste, et c'est aussi le moins cher à corriger** : une
ligne d'initialiseur, avec une fonction qui existe déjà. À faire en premier.

Les défauts 0, 1, 2 et 3 tiennent dans **un seul fichier** (`components/catches/CatchForm.tsx`) et
ne touchent ni la base, ni le rejeu, ni l'authentification. Le défaut 4 touche
`lib/drafts/replay.ts`, `lib/drafts/schema.ts` et `app/auth/login/actions.ts` : il demande la
décision d'onboarding du §5 avant d'être codé.

---

## 8. Tests livrés

`e2e/09-brouillon-anonyme.spec.ts` — un scénario Playwright déconnecté, sur la stack locale
(`pointe-du-raz`, le spot du seed e2e), en deux parties :

- **Partie A — non-régressions** : le brouillon s'enregistre, le mur apparaît, le défilement
  l'amène dans le viewport, le CTA pointe bien sur `/auth/register` avec le `redirect`.
  Ces tests doivent être **verts aujourd'hui**.
- **Partie B — les quatre défauts**, encodés en `test.fail()` : ils décrivent le comportement
  **voulu**, échouent donc aujourd'hui, et **passeront au rouge le jour où le correctif marche**.
  C'est le signal pour retirer l'annotation `test.fail()`. Chaque test porte en commentaire la
  mesure de cette QA qui le justifie.

Lancement : `pnpm exec playwright test e2e/09-brouillon-anonyme.spec.ts` (stack locale requise,
cf `e2e/README.md` — **ne jamais pointer les e2e sur le projet cloud**, ils créent des comptes).
