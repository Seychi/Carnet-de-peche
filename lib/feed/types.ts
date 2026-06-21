import type { Database } from '@/lib/types'

// Ligne du fil telle que renvoyée par la vue feed_posts_for_viewer
// (auteur + catch floutée + liked_by_me). Source unique de vérité pour l'UI.
// `author_is_following` (sprint 12, Bloc C) n'est PAS dans la vue : il est injecté
// en batch par getFeedPage (une requête follows par page, pas par post) → optionnel,
// car les autres lectures de la vue (profil) ne le fournissent pas.
export type FeedPost = Database['public']['Views']['feed_posts_for_viewer']['Row'] & {
  author_is_following?: boolean
}

// Onglets du fil (cf E4 / décision 0.1).
export type FeedTab = 'dept' | 'follows' | 'all'
