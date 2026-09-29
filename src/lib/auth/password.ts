import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
// scrypt needs about 128 * N * R bytes, which is right at Node's 32 MiB default.
const MAX_MEM = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Format: scrypt$N$r$p$salt$hash. The parameters travel with the hash so they can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEM });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEM,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let decoy: Promise<string> | null = null;
/**
 * Burn the same time a real check would. Called when the email is unknown so
 * response time does not reveal which emails have accounts.
 */
export async function verifyAgainstDecoy(password: string): Promise<void> {
  decoy ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await decoy);
}
