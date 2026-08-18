// ⚠️ PREMIÈRE LIGNE, et elle doit le rester : les imports ESM sont hissés et
// évalués dans l'ordre source. `zod-jitless` n'importe rien, donc placé ici il
// s'exécute AVANT le chargement de zod, ce qui permet de pré-amorcer sa config
// globale. Sprint 88, Bloc 2 — le pourquoi est écrit en entier dans ce fichier.
import './zod-jitless'
import { z } from 'zod'

// Localise en français tous les messages d'erreur standard de zod
// (« Invalid input », « Required », « Number must be… », etc.).
// Module à effet de bord : il suffit de l'importer une fois dans le graphe
// (client comme serveur) avant la première validation. On l'importe donc en
// tête des fichiers de schéma. z.config est global au singleton zod.
z.config(z.locales.fr())

// Ceinture : si zod avait déjà été chargé par un autre chemin avant `zod-jitless`,
// l'objet de config existait déjà et la ligne ci-dessus l'a simplement muté — mais
// `z.config` est un `Object.assign` (core.js:77), donc le repasser ici est sans
// risque et garantit le flag quelle que soit la façon dont ce module a été atteint.
z.config({ jitless: true })
