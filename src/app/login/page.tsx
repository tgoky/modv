import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Log in | modv" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Log in" intro="Pick up where you left off.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
