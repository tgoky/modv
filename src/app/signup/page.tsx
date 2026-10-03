import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Sign up | Prerich" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell
      title="Create your account"
      intro="Then start a $100 challenge for $1 whenever you are ready."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
