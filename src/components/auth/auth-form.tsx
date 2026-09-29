"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COPY = {
  signup: {
    submit: "Open account",
    pending: "Opening account",
    switchText: "Already have an account?",
    switchLink: "Log in",
    switchHref: "/login",
  },
  login: {
    submit: "Log in",
    pending: "Logging in",
    switchText: "New to modv?",
    switchLink: "Open an account",
    switchHref: "/signup",
  },
} as const;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "signup" ? signup : login, undefined);
  const copy = COPY[mode];
  const errors = state?.errors;

  return (
    <form action={action} className="grid gap-5" noValidate>
      {errors?.form && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/[0.07] px-3 py-2.5 text-sm text-destructive"
        >
          {errors.form}
        </p>
      )}

      {mode === "signup" && (
        <Field id="name" label="Full name" error={errors?.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={state?.values?.name}
            aria-invalid={!!errors?.name}
            aria-describedby={errors?.name ? "name-error" : undefined}
            className="h-11 bg-card"
            required
          />
        </Field>
      )}

      <Field id="email" label="Email" error={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state?.values?.email}
          aria-invalid={!!errors?.email}
          aria-describedby={errors?.email ? "email-error" : undefined}
          className="h-11 bg-card"
          required
        />
      </Field>

      <Field
        id="password"
        label="Password"
        error={errors?.password}
        hint={mode === "signup" ? "At least 8 characters." : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-invalid={!!errors?.password}
          aria-describedby={errors?.password ? "password-error" : mode === "signup" ? "password-hint" : undefined}
          className="h-11 bg-card"
          required
        />
      </Field>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-signal text-base font-semibold text-foreground hover:bg-signal/85"
      >
        {pending ? `${copy.pending}...` : copy.submit}
      </Button>

      <p className="text-sm text-muted-foreground">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-medium text-foreground underline underline-offset-4">
          {copy.switchLink}
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-[0.92rem]">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={cn("text-sm text-muted-foreground")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
