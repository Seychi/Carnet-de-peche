import { z } from 'zod'

// Localise en français tous les messages d'erreur standard de zod
// (« Invalid input », « Required », « Number must be… », etc.).
// Module à effet de bord : il suffit de l'importer une fois dans le graphe
// (client comme serveur) avant la première validation. On l'importe donc en
// tête des fichiers de schéma. z.config est global au singleton zod.
z.config(z.locales.fr())
