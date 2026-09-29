export interface AuthFormState {
  errors?: Partial<Record<"name" | "email" | "password" | "form", string>>;
  /** Echoed back so a failed submit does not wipe what the person typed. Never the password. */
  values?: { name?: string; email?: string };
}
