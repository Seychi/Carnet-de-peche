# Comment écrire (et publier) un guide — mode d'emploi César

> Tu écris en Markdown dans GitHub, c'est tout. Pas de CMS, pas d'outil à installer.
> Formation 30 min avec John la première fois, ensuite tu es autonome.

## Le circuit en 5 étapes

1. **Va dans le dossier** [`content/guides/`](../../content/guides/) sur GitHub.
2. **Copie le fichier `_TEMPLATE.mdx`** → bouton « Add file » → « Create new file » → nomme-le `ton-slug.mdx` (minuscules, tirets, sans accents — c'est l'URL : `carnet-de-peche.com/guides/ton-slug`).
3. **Colle le template et remplis** : le bloc entre `---` en haut (le « frontmatter ») puis le contenu.
4. **`draft: true` tant que tu rédiges.** Quand c'est prêt : passe à `draft: false`.
5. **« Commit changes »** en bas de page → John relit → merge → le guide est en ligne (le site se met à jour dans la journée, ISR 24 h).

## Le frontmatter (le bloc du haut)

| Champ | Obligatoire | Exemple |
|---|---|---|
| `title` | ✅ | `"Pêche du maquereau à la mitraillette pour débutant"` |
| `slug` | ✅ identique au nom du fichier | `peche-maquereau-mitraillette` |
| `excerpt` | ✅ 1-2 phrases vendeuses | C'est l'accroche Google |
| `category` | ✅ | `Technique`, `Spots`, `Marées`, `Matériel`, `Réglementation` |
| `species` | ✅ | `Bar`, `Maquereau`… ou `Multi-espèces` |
| `published_at` | ✅ format `2026-06-15` | Date de publication |
| `updated_at` | à chaque grosse màj | Google aime les contenus frais |
| `verified_at` | ⚠️ **obligatoire si réglementation** | Date où TU as vérifié l'arrêté |
| `howto` | si guide « comment faire » | Active le balisage SEO HowTo |
| `related` | conseillé (2-3 slugs) | Maillage interne = SEO |
| `draft` | `true` = invisible | Passe à `false` pour publier |

## Le contenu

- **Markdown standard** : `## Titre de chapitre`, `### Sous-titre`, `**gras**`, listes `-`, liens `[texte](/url)`.
- **Un seul niveau `##` structure le guide** — c'est aussi ce que Google lit. Vise 5-8 chapitres.
- **Longueur cible : 1 200-2 500 mots.** En dessous c'est du thin content, au-dessus personne ne lit.
- **Ton** : tutoiement, direct, concret, voix pêcheur. Tu écris pour un pote au bord de l'eau, pas pour un magazine.
- **Maillage** : 2-4 liens internes par guide (fiches spots `/spots/...`, autres guides `/guides/...`, la carte `/carte`). C'est ce qui fait monter tout le site.

## Les 4 composants spéciaux (notre arme anti-concurrence)

```mdx
<SpotCard slug="pointe-du-raz" />
```
Encart cliquable vers une fiche spot. Le slug = la fin de l'URL de la fiche.

```mdx
<TechniqueBadge type="leurres" />
```
Badge technique dans le texte (`leurres`, `surfcasting`, `flottante`, `vif`).

```mdx
<TideExplainer />
```
Le schéma de marée annoté (courbe + PM/BM + curseur). Pour les guides marées.

```mdx
<RegulationBox species="Bar" verifiedAt="15/06/2026">
  - **Maille légale Atlantique** : 42 cm
  - **Quota** : 2 bars/jour/pêcheur (zone CIEM 8a-b)
</RegulationBox>
```
L'encart réglementaire daté. **Règles absolues** : (1) tu vérifies l'arrêté EN VIGUEUR avant d'écrire le chiffre, (2) tu mets la date de TA vérification dans `verifiedAt`, (3) au moindre doute → demande à John. Une maille fausse = risque légal + crédibilité morte (c'est LE point faible de Fishing Grid, on ne le copie pas).

## Ce qu'on ne fait pas

- ❌ Promettre des features de l'app qui n'existent pas
- ❌ Recopier un contenu concurrent (Google le voit, et nous aussi)
- ❌ Donner des chiffres réglementaires de mémoire
- ❌ Emojis en pagaille — la charte c'est sobre, 0 ou 1 par guide max
- ❌ Vouvoyer. Jamais.

## Vérifier ton rendu

Tu ne peux pas prévisualiser depuis GitHub — c'est John (ou Claude) qui vérifie le rendu avant merge. Si un composant est mal écrit (balise pas fermée, slug inexistant), le build le signale : rien ne peut casser en prod silencieusement.
