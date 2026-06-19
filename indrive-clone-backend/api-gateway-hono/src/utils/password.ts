// Bun-native password hashing. Uses the built-in `Bun.password` API, which
// is argon2id under the hood — no external dependency needed.
// On Node.js, fall back to the Web Crypto PBKDF2 implementation.

export async function hashPassword(plain: string): Promise<string> {
  if (typeof Bun !== "undefined" && Bun.password) {
    return Bun.password.hash(plain, { algorithm: "argon2id" });
  }
  // Node fallback: PBKDF2 via Web Crypto, encoded as `pbkdf2$<iters>$<salt>$<hash>`
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iters = 150_000;
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iters, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `pbkdf2$${iters}$${toB64(salt)}$${toB64(new Uint8Array(hash))}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (typeof Bun !== "undefined" && Bun.password) {
    return Bun.password.verify(plain, stored);
  }
  const [scheme, itersStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const salt = fromB64(saltB64);
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: Number(itersStr), hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toB64(new Uint8Array(hash)) === hashB64;
}

const toB64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
