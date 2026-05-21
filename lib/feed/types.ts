import type { Database } from '@/lib/types'

// Ligne du fil telle que renvoyée par la vue feed_posts_for_viewer
// (auteur + catch floutée + liked_by_me). Source unique de vérité pour l'UI.
export type FeedPost = Database['public']['Views']['feed_posts_for_viewer']['Row']

// Onglets du fil (cf E4 / décision 0.1).
export type FeedTab = 'dept' | 'follows' | 'all'
