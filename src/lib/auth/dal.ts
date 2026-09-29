import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { findUserById, toPublic, type PublicUser } from "./users";

/** The signed-in user, or null. Verified against the store, once per request. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await findUserById(session.uid);
  return user ? toPublic(user) : null;
});

/** Use at the top of any page or action that needs a signed-in user. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
