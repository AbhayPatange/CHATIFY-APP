const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 310_000;

const toBase64 = (bytes) => {
  let text = "";
  for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
  return btoa(text);
};
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function passwordKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function createEncryptionIdentity(password) {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passwordKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(privateJwk)));
  return {
    identity: { privateKey: pair.privateKey, publicKey: pair.publicKey },
    payload: {
      encryptionPublicKey: JSON.stringify(publicJwk),
      encryptionKeyBundle: { salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(ciphertext), version: 1 },
    },
  };
}

export async function unlockEncryptionIdentity(password, publicKey, bundle) {
  if (!publicKey || !bundle?.salt || !bundle?.iv || !bundle?.ciphertext) throw new Error("Encrypted chat is not set up.");
  const salt = fromBase64(bundle.salt);
  const iv = fromBase64(bundle.iv);
  const key = await passwordKey(password, salt);
  const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, fromBase64(bundle.ciphertext));
  const privateKey = await crypto.subtle.importKey("jwk", JSON.parse(decoder.decode(bytes)), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  const importedPublic = await crypto.subtle.importKey("jwk", JSON.parse(publicKey), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  return { privateKey, publicKey: importedPublic };
}

export async function encryptText(text, recipientPublicKey, ownIdentity) {
  const recipient = await crypto.subtle.importKey("jwk", JSON.parse(recipientPublicKey), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const messageKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, messageKey, encoder.encode(text));
  const rawKey = await crypto.subtle.exportKey("raw", messageKey);
  const [senderKey, receiverKey] = await Promise.all([
    crypto.subtle.encrypt({ name: "RSA-OAEP" }, ownIdentity.publicKey, rawKey),
    crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipient, rawKey),
  ]);
  return { version: 1, ciphertext: toBase64(ciphertext), iv: toBase64(iv), senderKey: toBase64(senderKey), receiverKey: toBase64(receiverKey) };
}

export async function decryptText(message, myId, identity) {
  if (!message.encrypted) return message.text || ""; // legacy messages
  const wrapped = message.senderId === myId ? message.encrypted.senderKey : message.encrypted.receiverKey;
  const rawKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, identity.privateKey, fromBase64(wrapped));
  const messageKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(message.encrypted.iv) }, messageKey, fromBase64(message.encrypted.ciphertext));
  return decoder.decode(plaintext);
}
