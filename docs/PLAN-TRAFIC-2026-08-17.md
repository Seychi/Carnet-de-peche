# Plan trafic — après Vercel Pro et le sprint 83

> Rédigé le **2026-08-17**, après le push de 11:53 (`357c94d`).
> Sources : code du repo, build `.next` du 17/08 09:20, PostHog projet 208730 (fenêtre 90 j),
> docs Vercel. Les chiffres marqués « mesuré » viennent d'une requête réelle, pas d'une estimation.

---

## 0. En une ligne

Vercel Pro **débloque** la situation, il ne la corrige pas. Le vrai frein est dans le code :
**aucune de tes 1 088 pages SEO n'est mise en cache**, parce que le `<Header>` du layout lit
la session Supabase. Tant que c'est le cas, chaque passage de Googlebot paie un rendu serveur
complet — c'est ça qui plafonne ta vitesse d'exploration, pas ton plan d'hébergement.

---

## 1. Ce que Vercel Pro change vraiment pour le SEO

**À retenir : le plan Vercel n'est pas un facteur de classement.** Google ne sait pas sur quel
plan tu es. Ce qui compte, c'est ce que le plan change sur le comportement observable du serveur.

### Ce que ça t'apporte réellement

| Apport | Pourquoi ça compte |
|---|---|
| **Plus de plafond CPU** | Hobby inclut **4 CPU-heures/mois**. Ton relevé du sprint 83 : **7 h 34 consommées**. En dépassement sur Hobby, Vercel documente une pause de la fonction **jusqu'à ce que 30 jours soient passés**. Tu n'achetais pas de la vitesse, tu achetais le droit de rester en ligne. |
| **Skew Protection débloquée** | Réservée aux plans Pro/Enterprise. `next.config.ts` porte déjà `deploymentId: process.env.VERCEL_DEPLOYMENT_ID` — le code est prêt, l'option ne l'est pas encore. |
| **Conformité aux CGU** | Le plan Hobby est documenté « non-commercial, personal use only ». Avec Stripe en production, Pro était obligatoire quoi qu'il arrive. |
| **Marge de build** | 4 vCPU au lieu de 2, 6 000 déploiements/jour au lieu de 100, 1 jour de logs runtime au lieu d'1 heure. |
| **Régions multiples** | Pro autorise plusieurs régions de fonction (tu es en `dub1`, ce qui est déjà le bon choix pour la France). |

### Ce que ça ne t'apporte PAS

- **Aucun gain de vitesse automatique.** Le CDN, l'edge network et les temps de réponse sont
  identiques sur Hobby et Pro. Tes 1 247 ms de moyenne ne bougeront pas d'eux-mêmes.
- **Speed Insights n'est pas inclus** : c'est un add-on à **10 $/mois par projet**. Tu as déjà
  les Core Web Vitals dans PostHog (`$web_vitals`), donc inutile de payer ça.
- **Aucun effet sur l'indexation** en soi. Le lien « serveur plus rapide → Google explore plus »
  est réel mais **indirect** : Google réduit sa cadence quand le serveur traîne. C'est le
  serveur qu'il faut réparer, pas la facture.

### ⚡ À faire aujourd'hui, gratuit, 5 minutes

**Activer Skew Protection** : Vercel → projet → Settings → Advanced → Skew Protection → ON,
puis redéployer. Prérequis : « Enable access to System Environment Variables » doit être coché.

Pourquoi ça compte pour toi précisément : l'audit du 15/08 a capturé un **503 sur
`/spots/bec-de-sormiou-osm747711726?_rsc=…` à 13 h 43**, un jour à 5 déploiements. Et la doc
Vercel précise que **la fenêtre de protection est automatiquement portée à 60 jours pour les
requêtes de Googlebot et Bingbot**, justement pour absorber le délai entre le crawl du document
et son rendu. Sans l'option, un déploiement pendant un crawl peut faire voir une page cassée
à Google. Avec, non.

---

## 2. La photo du trafic (mesuré, PostHog, 90 jours)

| Métrique | Valeur |
|---|---|
| Visiteurs | **614** |
| Sessions | **1 014** |
| Pages vues | **3 565** |
| Durée de session moyenne | **6 min 10 s** |
| Taux de rebond | **22,4 %** |

**Le taux de rebond et la durée de session sont excellents.** 6 minutes sur un site de pêche,
22 % de rebond : les gens qui arrivent restent. Ton problème n'est pas la qualité des pages,
**c'est le volume d'arrivées**. Ça oriente tout le plan : pas la peine de retoucher le contenu,
il faut ouvrir le robinet.

### Par canal

| Canal | Visiteurs | Lecture |
|---|---|---|
| Referral | 310 | ⚠️ **artefact.** Le tableau des domaines référents est dominé par **toi-même** : `www.carnet-de-peche.com` 287 visiteurs et `carnet-de-peche.com` 31. Ce ne sont pas des visiteurs référés, ce sont tes propres sessions recoupées (expiration de session, redirection apex → www). |
| **Organic Search** | **303** | Le vrai moteur. Google 265, Bing 16, Ecosia 8, Yahoo 6, DuckDuckGo 4, Qwant 1. |
| Direct | 81 | |
| **IA** | **15** | ChatGPT 15 visiteurs / 65 pages vues, Copilot 2, Perplexity 1. |
| Organic Social | 1 | **Le trou béant.** Voir §5. |

> **À corriger dans PostHog** : ajoute `carnet-de-peche.com` et `www.carnet-de-peche.com` aux
> domaines exclus des referrers, sinon 45 % de ton tableau d'acquisition est du bruit et tu ne
> pourras pas lire l'effet du sprint 83.

### Pages d'entrée organiques (28 j)

`/spots` (21), `/peche/bar/leurres/landes` (8), `/spots/digues-de-sausset-les-pins` (6),
`/peche/bar/leurres/gironde` (4), `/carte` (4), `/peche/bar/leurres/finistere` (4)…

**Les pages programmatiques `/peche/<espèce>/<technique>/<dépt>` fonctionnent déjà** — elles
sont 3 des 6 premières entrées organiques, avec des rebonds à 11-12 %, les meilleurs du site.
Le sprint 83 Bloc 4 vient d'en ajouter 118. C'est le bon pari, et c'est mesurable au 16/09.

---

## 3. ⛔ Le vrai frein : rien n'est mis en cache

C'est la trouvaille de cette session, et elle vaut plus que tout le reste du document.

### Le fait

`app/(marketing)/layout.tsx` rend `<Header />`. Or `components/layout/Header.tsx` est un
server component asynchrone qui fait :

```ts
const supabase = await createClient()          // → lit les cookies
const { data: { user } } = await supabase.auth.getUser()   // → appel réseau à Supabase Auth
```

En App Router, **accéder aux cookies rend la route dynamique**. Comme le `<Header>` est dans le
layout du groupe, **tout le groupe `(marketing)` est forcé en rendu dynamique** : `/`,
`/spots/[slug]`, `/peche/[...slug]`, `/especes/[slug]`, `/guides/[slug]`.

Conséquence : tes directives de cache sont **mortes** :

| Route | Déclaré dans le code | Effet réel |
|---|---|---|
| `/spots/[slug]` | `revalidate = 1800` | ❌ aucun |
| `/peche/[...slug]` | `revalidate = 86400` + `generateStaticParams` | ❌ aucun |
| `/especes/[slug]` | `revalidate = 86400` + `dynamicParams = false` | ❌ aucun (le fichier dit pourtant « cette page est ENTIÈREMENT STATIQUE ») |
| `/guides/[slug]` | `revalidate = 86400` + `generateStaticParams` | ❌ aucun |
| `/` | `revalidate = 3600` | ❌ aucun |

### La preuve, pas la déduction

Build du 17/08 à 09:20 (`.next/prerender-manifest.json`) :

```
routes pré-rendues : ["/icon.svg", "/robots.txt"]
nombre total       : 2
dynamicRoutes (ISR): []
fichiers .html dans .next/server/app : 0
```

**Zéro page HTML pré-rendue sur 1 088 pages SEO.** Aucune route ISR déclarée.

### Ce que ça coûte, chiffré

Chaque requête Googlebot sur une fiche spot déclenche : lecture de cookies, **un appel réseau
à Supabase Auth** (`getUser()`, pas `getSession()`), puis ~10 clients Supabase dans la page,
plus marée, météo, bathymétrie. Le middleware tourne aussi sur chaque requête (le matcher
attrape tout sauf les assets statiques).

C'est visible dans tes Core Web Vitals, LCP p75 sur 28 jours :

- **Bon** (< 2,5 s) : `/spots/cap-dramont` 300 ms, `/peche/dorade-royale/surfcasting/cotes-d-armor` 352 ms, `/especes/vieille` 380 ms…
- **À améliorer** : `/spots/pointe-du-grand-minou` **2 789 ms**, `/spots/cap-bear` 3 290 ms, `/spots/jetees-de-dieppe` **3 980 ms**
- **Mauvais** : `/spots/cap-couronne` 4 448 ms, `/spots/pointe-du-guern-telgruc` **7 232 ms**

Le même gabarit va de **300 ms à 7 200 ms**. Ce n'est pas la page qui varie, c'est la
température du cache et le démarrage à froid. Note que `/spots/jetees-de-dieppe` et
`/spots/pointe-du-grand-minou` sont dans tes pages d'entrée organiques — donc **les lentes sont
justement celles que Google envoie du monde**. Et `pointe-du-grand-minou` est un des deux spots
du tableau « le fait qui justifie le sprint ».

### Le correctif (candidat sprint 84, priorité absolue)

Sortir la lecture d'auth de l'arbre statique. Le principe : **Googlebot et 100 % de ton trafic
SEO sont anonymes** — ils n'ont aucun besoin du menu utilisateur rendu côté serveur.

Deux options, par ordre de propreté :

1. **Header public statique pour le groupe `(marketing)`** : un `HeaderPublic` sans auth
   (liens « Connexion / Inscription »), et le menu utilisateur monté côté client après
   hydratation via le client Supabase navigateur. Le groupe `(app)` garde le `<Header>` serveur
   actuel. C'est un changement local, sans migration.
2. **Isoler la partie authentifiée dans un composant client** consommé par le header actuel.

Attention, second obstacle à traiter dans le même sprint : `/spots/[slug]` appelle lui aussi
`getUserTier()` et `supabase.auth.getUser()` **dans la page** (ligne ~631). Il faut donc aussi
que la coquille anonyme de la fiche soit statique et que les blocs gatés par palier soient
rendus côté client. C'est le seul vrai travail du lot.

**Gain attendu** : les fiches spots servies depuis le CDN, TTFB en dizaines de ms au lieu de
1 247 ms, LCP ramené vers les 300-500 ms déjà observés sur les pages chaudes, cadence
d'exploration Google en hausse — et ta consommation CPU Vercel qui s'effondre, donc le crédit
de 20 $ de Pro qui ne part plus en fumée.

**Compatible avec la fenêtre de mesure du sprint 83 ?** Oui pour le Bloc 1 : l'A/B des titres
est réparti par hash de slug, les deux cohortes gagnent la même vitesse, la comparaison reste
valide. Le Bloc 2 (maillage) se lit déjà en corrélation, pas en causalité, donc rien à perdre.
Et le RECAP dit lui-même que le débit de découverte est de ~10 URL/jour : c'est exactement ce
que ce correctif débloque.

---

## 4. ChatGPT et les IA : ce que ça vaut vraiment chez toi

### Ce que tu as, mesuré

**18 visiteurs sur 90 jours** : ChatGPT 15 (65 pages vues), Copilot 2, Perplexity 1.
Soit **2,9 % des visiteurs**. C'est réel, c'est en croissance partout, mais à cette échelle
c'est un signal, pas un canal.

Le mécanisme : ils arrivent avec `utm_source=chatgpt.com` (OpenAI ajoute ce paramètre),
et non par un referrer HTTP — c'est pour ça que `chatgpt.com` ne pèse que 4 visiteurs dans
le tableau des domaines référents alors que le canal IA en compte 15.

### Ce que les IA citent chez toi

| Page d'entrée depuis une IA | Visiteurs |
|---|---|
| `/guides/peche-au-bar-au-leurre` | 4 |
| `/spots/plage-napoleon-port-saint-louis` | 2 |
| `/peche/bar/leurres/finistere` | 1 (18 pages vues !) |
| 9 autres fiches spots / espèces | 1 chacune |

**Le guide arrive premier.** C'est cohérent avec ce qu'on sait du fonctionnement des moteurs
génératifs : ils citent du contenu explicatif structuré, pas des fiches de données.

### Ce qui marche, et ce qui est du folklore

**Ce qui marche (et que tu fais déjà bien)** :

- Ne pas bloquer les crawlers IA. ✅ Ton `robots.ts` autorise `/` pour `*`, donc GPTBot,
  PerplexityBot et ClaudeBot passent.
- **Données structurées.** ✅ Tu as déjà `FAQPage`, `HowTo`, `Article`, `Place`,
  `BreadcrumbList`, `ItemList`, `Organization`, `Product`. C'est du sérieux.
- **Le SEO classique reste le socle** : ~76 % des citations d'AI Overviews viennent du top 10
  des résultats Google classiques. Autrement dit : **le §3 est aussi ta meilleure action GEO.**

**Ce qui est surévalué** : `llms.txt`. Tu n'en as pas (`public/` ne contient qu'icons, images,
logo, manifest, sw.js). Aucun éditeur de LLM n'a documenté qu'il le lit. Coût 10 minutes,
bénéfice non démontré — à faire si ça t'amuse, pas comme priorité.

### Les 3 actions GEO qui valent le coup chez toi

1. **Écrire pour la question, pas pour le mot-clé.** Les guides sont ce que les IA citent.
   Un bloc de réponse de 40-60 mots directement sous chaque `<h2>` d'un guide est le format
   le plus extractible. Tu as 2 guides qui pèsent dans le trafic — il en faut 10.
2. **Publier de la donnée propriétaire.** C'est ton avantage absolu et personne d'autre ne
   l'a : « 607 spots, N prises loguées, l'espèce la plus prise en Bretagne en août ».
   Les statistiques originales sont ce qui se fait citer, et ça devient une page par saison.
3. **Suivre l'IA comme un canal.** Crée un insight PostHog sur `utm_source` ∈
   {chatgpt.com, perplexity, copilot.com, gemini.google.com, claude.ai} pour voir la courbe
   plutôt qu'un chiffre. 3 minutes.

---

## 5. Le trou : 1 visiteur d'Organic Social en 90 jours

C'est le chiffre le plus parlant du document. Ton propre doc `CIBLES-MARKETING` dit que les
**créateurs de contenu pêche sont le « relais viral n°1 »** et que « c'est ce qui a fait
décoller Fishing Grid ». Et tu es à **1 visiteur social sur 3 mois**.

Le SEO va te faire passer de 600 à peut-être 2 000 visiteurs. Il ne te fera pas passer à 20 000
avant longtemps — l'audience se compte en centaines de milliers de pratiquants réguliers, et la
saison retombe après août. Un seul créateur pêche de taille moyenne fait plus en une vidéo que
ton sprint 83 en un trimestre.

Ce n'est pas un travail de code, donc ça ne rentre pas dans un sprint, et c'est précisément
pour ça que ça ne se fait pas. À trancher comme une décision, pas comme une tâche.

Piste concrète et peu coûteuse : les **pages `/c/[slug]`** existent déjà (partage de prise) et
`app/actions/share.ts` fait 37 Ko — la mécanique de partage est là. La question est de savoir
qui l'utilise et vers où. Un `revalidate = 300` y est posé et sera lui aussi débloqué par le
correctif du §3.

---

## 6. Priorisation

| # | Action | Effort | Impact | Quand |
|---|---|---|---|---|
| 1 | **Activer Skew Protection** (Vercel → Settings → Advanced) + redéployer | 5 min | protège le crawl, 503 supprimés | **aujourd'hui** |
| 2 | Resoumettre le sitemap dans Search Console (reste manuel n°5 du RECAP) | 5 min | découverte des 118 pages | **aujourd'hui** |
| 3 | Exclure ses propres domaines des referrers PostHog | 5 min | rend l'acquisition lisible | **aujourd'hui** |
| 4 | Insight PostHog « canal IA » par `utm_source` | 5 min | mesure | aujourd'hui |
| 5 | **Sprint 84 : sortir l'auth du layout marketing → ISR réellement actif** | 1 sprint | 🔥 le plus gros levier disponible | **tout de suite après** |
| 6 | Écrire 3-5 guides, format « réponse en 40-60 mots sous chaque h2 » | continu | SEO + citations IA | en parallèle |
| 7 | Une page de statistiques propriétaires (données du carnet, par saison) | 1 bloc | GEO + backlinks | sprint 85 |
| 8 | Décider de l'approche créateurs / réseaux | décision | 🔥 le seul levier de changement d'échelle | à trancher |
| 9 | Géocodage inverse BAN → colonne `commune` (débloque la facette ville abandonnée au Bloc 3) | 1 sprint | nouvelle famille de pages | après le 07/09 |
| 10 | `llms.txt` | 10 min | non démontré | si tu t'ennuies |

### Ce qu'il ne faut PAS toucher avant le 07/09 (J+21)

Les **titres** des fiches spots et de `/especes/mulet`, et le **maillage interne**. La fenêtre
de mesure du sprint 83 a démarré au push de 11:53 aujourd'hui. Toucher un titre avant le 07/09
détruit le seul verdict causal du sprint. Le correctif du §3 ne touche ni les titres ni les
liens : il est compatible.

---

## 7. Ce que ce document ne sait pas

- **La Search Console n'est pas accessible depuis ici.** Impressions, positions et CTR réels
  viennent de là, et le RECAP note déjà que la baseline par page des 40 fiches `/spots/*` n'a
  pas été extraite avant le push. Les chiffres de ce document sont ceux de PostHog (sessions
  côté client), pas ceux de Google.
- **Le build inspecté est celui du 17/08 à 09:20**, antérieur de 2 h 30 au push. Le constat du
  §3 porte sur du code non modifié par le sprint 83 (le `<Header>` et les layouts n'y sont pas
  touchés), donc il tient — mais à re-vérifier sur le prochain build de prod avec
  `node -e "console.log(Object.keys(require('./.next/prerender-manifest.json').routes))"`.
- **PostHog ne voit pas les bots.** La cadence d'exploration de Googlebot ne se lit que dans
  les logs Vercel (1 jour de rétention sur Pro, contre 1 heure avant) ou dans Search Console →
  Statistiques d'exploration. C'est là qu'on verra si le correctif du §3 a marché.
