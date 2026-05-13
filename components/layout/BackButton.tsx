'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

type BackButtonProps = {
  /** URL de repli si pas d'historique (ex : ouverture directe via lien partagé) */
  fallbackHref?: string
  /** Label optionnel à afficher à côté de la flèche (sinon aria-label uniquement) */
  label?: string
  /** Classes additionnelles */
  className?: string
}

/**
 * Flèche retour mobile (pattern iOS/Android).
 * Caché sur desktop (md+) où la navigation se fait via le header.
 * Comportement : router.back() si historique dispo, sinon fallbackHref.
 */
export function BackButton({
  fallbackHref = '/',
  label,
  className = '',
}: BackButtonProps) {
  const router = useRouter()

  function handleClick() {
    // history.length === 1 = pas d'historique (onglet ouvert direct sur cette page)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label ?? 'Retour'}
      className={`md:hidden flex items-center gap-1.5 -ml-2 px-2 py-1.5 rounded-[8px] text-ink-700 active:bg-slate-100 transition-colors ${className}`}
    >
      <ArrowLeft size={20} strokeWidth={2.25} />
      {label && <span className="text-[14px] font-medium">{label}</span>}
    </button>
  )
}
