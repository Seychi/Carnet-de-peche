import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Le middleware gère les redirections d'auth.
// Ce layout est une sécurité secondaire (defense in depth).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <>{children}</>;
}
