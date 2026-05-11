import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, onboarded")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[480px] text-center">
        {/* Icône */}
        <div
          className="w-20 h-20 rounded-[24px] grid place-items-center mx-auto mb-6 text-4xl"
          style={{
            background: "linear-gradient(135deg, var(--navy-900), var(--teal-500))",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
          </svg>
        </div>

        <h1 className="text-[28px] sm:text-[36px] mb-3">
          Bienvenue{profile?.username ? `, ${profile.username}` : ""} !
        </h1>

        <p className="text-ink-500 text-[16px] leading-relaxed mb-8">
          Le carnet, la carte et la communauté arrivent bientôt.
          <br />
          Tu seras parmi les premiers à les découvrir.
        </p>

        <div
          className="bg-white rounded-[22px] p-6 border border-ink-100 text-left mb-6"
          style={{ boxShadow: "0 4px 24px rgba(10,47,61,.06)" }}
        >
          <div className="text-[12px] font-semibold text-ink-500 uppercase tracking-wide mb-3">
            Ton compte
          </div>
          <div className="flex items-center justify-between py-2 border-b border-ink-100">
            <span className="text-[14px] text-ink-700">Pseudo</span>
            <span className="text-[14px] font-semibold text-navy-900">
              {profile?.username ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[14px] text-ink-700">Email</span>
            <span className="text-[14px] font-semibold text-navy-900">
              {user.email}
            </span>
          </div>
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}
