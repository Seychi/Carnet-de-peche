'use client'

import { useEffect, useState } from 'react'

/** Horloge « marée en direct » (Europe/Paris), isolée pour ne re-render que ce span. */
export function LiveClock() {
  const [time, setTime] = useState<string>('--:--:--')
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date())
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="text-teal-300">{time}</span>
}
