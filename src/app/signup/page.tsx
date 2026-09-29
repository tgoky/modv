import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Open an account | modv" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell
      title="Open your account"
      intro="You'll start with a virtual balance and a live dashboard."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
