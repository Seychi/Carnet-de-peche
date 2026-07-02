# 📊 Métriques fil — à câbler quand PostHog sera setup (sprint 11)

> Le sprint 8 ne pose pas l'instrumentation (PostHog arrive au sprint 11). Liste des events à brancher alors, avec leurs propriétés.

| Event | Propriétés | Déclencheur |
|---|---|---|
| `feed_post_created` | `region`, `has_catch` (bool), `char_count` | `createPost` réussi |
| `feed_post_liked` | `region` | `toggleLike` → liked=true |
| `feed_post_unliked` | `region` | `toggleLike` → liked=false |
| `feed_comment_created` | `region`, `char_count` | `addComment` réussi |
| `feed_post_reported` | `reason` | `reportPost` réussi |
| `feed_post_deleted` | — | `deletePost` réussi |
| `follow_added` | — | `toggleFollow` → following=true |
| `follow_removed` | — | `toggleFollow` → following=false |
| `feed_tab_changed` | `tab` (dept/follows/all) | clic onglet `FeedTabs` |
| `composer_blocked_by_tier` | `viewer_tier`, `region` | rendu du bandeau bloqué dans `PostComposer` |
| `spot_activity_seen` | `spot_id`, `catches_count_7d` | rendu de `SpotActivitySection` |

**Funnel clé à surveiller** : `composer_blocked_by_tier` → conversion `/tarifs` → abonnement (signal de demande pour le pivot social monétisé).
