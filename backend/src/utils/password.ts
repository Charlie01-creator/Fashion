import bcrypt from "bcrypt";

// 12 rounds is a reasonable production default (as of 2026 hardware) —
// balances brute-force resistance against login latency. Revisit upward
// as hardware improves; never go below 10.
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
