import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Challenge } from "./types";

/*
 * File-backed challenge store for development, like src/lib/auth/users.ts.
 * Swap these functions for your database before deploying: everything else
 * goes through them.
 */

const DIR = process.env.USER_STORE_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "challenges.json");

let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Challenge[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Challenge[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(all: Challenge[]): Promise<void> {
  await mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(all, null, 2), { mode: 0o600 });
  await rename(tmp, FILE);
}

/** The user's newest challenge (active, passed or failed), or undefined. */
export async function getLatestChallenge(userId: string): Promise<Challenge | undefined> {
  const mine = (await readAll()).filter((c) => c.userId === userId);
  return mine.sort((a, b) => b.createdAt - a.createdAt)[0];
}

/**
 * Read-modify-write the user's latest challenge under a lock so two trades
 * cannot overwrite each other. The updater may throw to abort.
 */
export function updateLatestChallenge(
  userId: string,
  updater: (c: Challenge) => Challenge,
): Promise<Challenge> {
  return locked(async () => {
    const all = await readAll();
    const mine = all.filter((c) => c.userId === userId).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!mine) throw new Error("no challenge");
    const next = updater(mine);
    await writeAll(all.map((c) => (c.id === mine.id ? next : c)));
    return next;
  });
}

/** Creates a challenge unless the user already has an active one. */
export function createChallenge(c: Challenge): Promise<Challenge | "already_active"> {
  return locked(async () => {
    const all = await readAll();
    if (all.some((x) => x.userId === c.userId && x.status === "active")) return "already_active";
    await writeAll([...all, c]);
    return c;
  });
}
