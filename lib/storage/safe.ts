/**
 * Accès au stockage du navigateur qui ne lève JAMAIS.
 *
 * Sprint 88, Bloc 4. Le stockage web est refusable par l'utilisateur, par le mode
 * strict de Safari, par un navigateur in-app ou par une politique d'entreprise. Un
 * accès nu produit alors une exception, et huit issues Sentry du projet viennent de
 * là — dont `JAVASCRIPT-NEXTJS-14` (`SecurityError: Failed to read the
 * 'sessionStorage' property`), qui ne se contentait pas de polluer le dashboard :
 * elle faisait planter un `useEffect` AVANT son `addEventListener`, ce qui tuait la
 * bannière d'installation PWA en silence.
 *
 * ★ Pourquoi ces fonctions prennent `'local' | 'session'` et NON un objet `Storage` :
 * dans les navigateurs qui refusent le stockage, c'est la LECTURE DE LA PROPRIÉTÉ
 * `window.sessionStorage` elle-même qui lève, pas seulement `.getItem()`. Passer
 * `sessionStorage` en argument lèverait donc sur le site d'appel, avant même
 * d'entrer dans le try/catch du helper — le garde-fou serait purement décoratif.
 * C'est exactement le message de l'issue 14 : « Failed to read the property ».
 */

type StoreKind = 'local' | 'session'

/** Retourne le Storage demandé, ou null si le navigateur refuse ne serait-ce que d'y accéder. */
function pickStore(kind: StoreKind): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** Valeur stockée, ou `null` si absente OU si le stockage est refusé. */
export function safeGet(kind: StoreKind, key: string): string | null {
  try {
    return pickStore(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

/**
 * Écrit la valeur. Retourne `false` si le stockage est refusé ou plein (quota),
 * pour que l'appelant puisse décider — jamais d'exception.
 */
export function safeSet(kind: StoreKind, key: string, value: string): boolean {
  try {
    const store = pickStore(kind)
    if (!store) return false
    store.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** Supprime la clé. Retourne `false` si le stockage est refusé. */
export function safeRemove(kind: StoreKind, key: string): boolean {
  try {
    const store = pickStore(kind)
    if (!store) return false
    store.removeItem(key)
    return true
  } catch {
    return false
  }
}
