import { redirect } from "next/navigation";

// Magic link = pas de différence entre login et register.
// Cette route existe pour le SEO et la clarté des CTAs de la homepage.
export default function RegisterPage() {
  redirect("/auth/login");
}
