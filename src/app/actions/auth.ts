"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, verifyAgainstDecoy, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { clearFailures, isThrottled, recordFailure } from "@/lib/auth/throttle";
import { createUser, findUserByEmail } from "@/lib/auth/users";
import type { AuthFormState } from "@/lib/auth/form-state";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

async function clientKey(email: string): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded ?? "local"}:${email}`;
}

export async function signup(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const name = text(formData, "name").trim();
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const values = { name, email };

  const errors: NonNullable<AuthFormState["errors"]> = {};
  if (!name) errors.name = "Enter your name.";
  else if (name.length > 60) errors.name = "Use 60 characters or fewer.";
  if (!EMAIL.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password.length > 128) errors.password = "Use 128 characters or fewer.";
  if (Object.keys(errors).length) return { errors, values };

  let userId: string;
  try {
    const result = await createUser({ name, email, passwordHash: await hashPassword(password) });
    if (!result.ok) {
      return { errors: { email: "An account with this email already exists. Log in instead." }, values };
    }
    userId = result.user.id;
  } catch (err) {
    console.error("[signup] could not create user", err);
    return { errors: { form: "We couldn't create your account. Try again in a moment." }, values };
  }

  await createSession(userId);
  redirect("/dashboard");
}

export async function login(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const values = { email };

  if (!email || !password) {
    return { errors: { form: "Enter your email and password." }, values };
  }

  const key = await clientKey(email);
  if (isThrottled(key)) {
    return { errors: { form: "Too many attempts. Wait a few minutes and try again." }, values };
  }

  let userId: string | null = null;
  try {
    const user = await findUserByEmail(email);
    if (user && (await verifyPassword(password, user.passwordHash))) userId = user.id;
    else if (!user) await verifyAgainstDecoy(password);
  } catch (err) {
    console.error("[login] lookup failed", err);
    return { errors: { form: "We couldn't log you in right now. Try again in a moment." }, values };
  }

  if (!userId) {
    recordFailure(key);
    return { errors: { form: "That email and password don't match an account." }, values };
  }

  clearFailures(key);
  await createSession(userId);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}
