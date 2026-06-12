"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Session locale effacée même si Supabase est injoignable
    }
    router.push("/auth/login");
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="outline"
      className="min-h-[48px] self-start rounded-full text-[14px] font-medium text-ink-700 border-ink-200"
    >
      <LogOut size={16} className="mr-2" />
      Me déconnecter
    </Button>
  );
}
