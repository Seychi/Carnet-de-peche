import { redirect } from "next/navigation";

// Redirige vers la page login avec le tab "Inscription" pré-sélectionné
export default function RegisterPage() {
  redirect("/auth/login?tab=register");
}
