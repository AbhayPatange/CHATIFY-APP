export async function encryptionKeyFingerprint(publicKey) {
  const jwk = JSON.parse(publicKey);
  if (jwk.kty !== "RSA" || typeof jwk.n !== "string" || typeof jwk.e !== "string") throw new Error("Invalid contact encryption key.");
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase().match(/.{1,4}/g).join(" ");
}
