'use client'

/**
 * MapSkeleton — squelette affiché pendant le chargement de MapLibre + tuiles.
 *
 * Respecte prefers-reduced-motion : l'animation de pulse est conditionnée
 * via la classe Tailwind `motion-safe:animate-pulse` (CSS @media).
 * Le spinner d'activité est masqué en `prefers-reduced-motion: reduce`
 * (classe `motion-safe:animate-spin`).
 *
 * Pas de JavaScript nécessaire : tout est CSS-only → aucun listener, aucun
 * risque de fuite mémoire, rendu immédiat avant hydratation.
 */
export default function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${className ?? ''}`}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Fond océan dégradé DA v2 */}
      <div
        className="absolute inset-0 motion-safe:animate-pulse"
        style={{
          background:
            'linear-gradient(180deg, #04141C 0%, #0A2F3D 45%, #0E3D50 75%, #103E50 100%)',
        }}
      />

      {/* Silhouette côte stylisée — ligne horizontale évoquant l'horizon marin */}
      <div
        className="absolute"
        style={{
          left: '8%',
          right: '8%',
          bottom: '38%',
          height: '2px',
          borderRadius: '2px',
          background:
            'linear-gradient(90deg, transparent 0%, #14B8A6 20%, #14B8A6 80%, transparent 100%)',
          opacity: 0.25,
        }}
      />

      {/* Blocs simulant les clusters de spots (tailles aléatoires pour crédibilité) */}
      <div
        className="absolute motion-safe:animate-pulse"
        style={{
          left: '22%',
          top: '30%',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#14B8A6',
          opacity: 0.3,
          animationDelay: '0ms',
        }}
      />
      <div
        className="absolute motion-safe:animate-pulse"
        style={{
          left: '55%',
          top: '42%',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#D9A53C',
          opacity: 0.25,
          animationDelay: '200ms',
        }}
      />
      <div
        className="absolute motion-safe:animate-pulse"
        style={{
          left: '38%',
          top: '58%',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#14B8A6',
          opacity: 0.2,
          animationDelay: '400ms',
        }}
      />
      <div
        className="absolute motion-safe:animate-pulse"
        style={{
          left: '70%',
          top: '26%',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#D9A53C',
          opacity: 0.2,
          animationDelay: '100ms',
        }}
      />

      {/* Spinner central sobre — masqué si prefers-reduced-motion */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <svg
          className="motion-safe:animate-spin"
          width={28}
          height={28}
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
          style={{ opacity: 0.55 }}
        >
          <circle
            cx={14}
            cy={14}
            r={11}
            stroke="#14B8A6"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="40 30"
          />
        </svg>
        <span
          className="font-mono text-[10px] tracking-widest"
          style={{ color: '#14B8A6', opacity: 0.5, letterSpacing: '0.15em' }}
        >
          CARTE
        </span>
      </div>
    </div>
  )
}
