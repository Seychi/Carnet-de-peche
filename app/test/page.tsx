import { createClient } from "@/lib/supabase/server";

export default async function TestPage() {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("spots")
    .select("*", { count: "exact", head: true });

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50">
      {error ? (
        <div className="max-w-lg p-6 rounded-[14px] bg-red-50 border border-red-200 text-center">
          <p className="text-[13px] font-semibold text-red-500 uppercase tracking-wide mb-2">Erreur Supabase</p>
          <p className="text-red-700 font-mono text-[14px]">{error.message}</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-[15px] font-medium text-ink-500 uppercase tracking-widest mb-3">
            Connexion Supabase ✓
          </p>
          <p className="font-display font-bold text-navy-900" style={{ fontSize: "clamp(48px, 10vw, 96px)" }}>
            {count}
          </p>
          <p className="text-[18px] text-ink-700 mt-2">spots en base</p>
        </div>
      )}
    </div>
  );
}
