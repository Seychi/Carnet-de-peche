"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "trial_banner_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Bandeau "essai bientôt fini". Dismissible : masqué 24h après un clic sur la
// croix (localStorage). Rendu null tant que l'état n'est pas résolu côté client
// → pas de mismatch d'hydratation (le serveur rend aussi null au premier passage).
export function TrialBanner({
  daysLeft,
  amount,
  dateLabel,
}: {
  daysLeft: number;
  amount: string | null;
  dateLabel: string;
}) {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    const dismissedAt = raw ? parseInt(raw, 10) : 0;
    setVisible(Date.now() - dismissedAt > DISMISS_TTL_MS);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="bg-teal-500 text-navy-950 text-sm">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <p>
          Il te reste{" "}
          <span className="font-mono font-semibold">
            {daysLeft} jour{daysLeft > 1 ? "s" : ""}
          </span>{" "}
          d&rsquo;essai.{" "}
          {amount ? (
            <>
              Tu seras prélevé(e) de <span className="font-mono">{amount}</span> le{" "}
              <span className="font-mono">{dateLabel}</span>.
            </>
          ) : (
            <>
              Ton essai finit le <span className="font-mono">{dateLabel}</span>.
            </>
          )}{" "}
          <Link href="/compte/abonnement" className="underline font-semibold">
            Gérer
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer"
          className="shrink-0 text-navy-950/70 hover:text-navy-950 text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
