import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * A deliberately small file-backed user store so the app runs with zero setup.
 *
 * It is fine for local development. It is NOT suitable for production: it does
 * not survive on serverless hosts (read-only or ephemeral disk) and does not
 * scale past one server. To move to Postgres/Supabase, reimplement the four
 * exported functions below; nothing else in the app touches storage directly.
 */

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  /** Virtual USD in cents. No real money is held. */
  balanceCents: number;
}

export type PublicUser = Omit<UserRecord, "passwordHash"> & { accountNo: string };

export const STARTING_BALANCE_CENTS = 1_000_000;

const DIR = process.env.USER_STORE_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "users.json");

// Serialise every read-modify-write so two signups cannot clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<UserRecord[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as UserRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(users: UserRecord[]): Promise<void> {
  await mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(users, null, 2), { mode: 0o600 });
  await rename(tmp, FILE);
}

export function toPublic({ passwordHash: _omit, ...user }: UserRecord): PublicUser {
  void _omit;
  return { ...user, accountNo: `MV-${user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}` };
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  return (await readAll()).find((u) => u.email === email);
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  return (await readAll()).find((u) => u.id === id);
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<{ ok: true; user: UserRecord } | { ok: false; reason: "email_taken" }> {
  return locked(async () => {
    const users = await readAll();
    if (users.some((u) => u.email === input.email)) return { ok: false, reason: "email_taken" } as const;
    const user: UserRecord = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
      balanceCents: STARTING_BALANCE_CENTS,
    };
    await writeAll([...users, user]);
    return { ok: true, user } as const;
  });
}
