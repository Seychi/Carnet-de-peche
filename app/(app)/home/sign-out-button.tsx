"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="outline"
      className="min-h-[48px] rounded-full text-[14px] font-medium text-ink-700 border-ink-200 w-full"
    >
      <LogOut size={16} className="mr-2" />
      Me déconnecter
    </Button>
  );
}
