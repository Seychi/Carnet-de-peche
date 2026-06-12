"use client";

import { startTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  function handleSignOut() {
    // Server Action : session révoquée côté serveur, puis redirect /auth/login
    startTransition(() => signOut("/auth/login"));
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
