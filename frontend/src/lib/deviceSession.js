// Store non-extractable CryptoKeys on this device, never passwords or raw keys.
const DB = "pinglet-device-session";
const STORE = "keys";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function saveDeviceIdentity(user, identity) {
  let privateKey = identity.privateKey;
  if (privateKey.extractable) {
    const jwk = await crypto.subtle.exportKey("jwk", privateKey);
    privateKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  }
  await transaction("readwrite", (store) => store.put({ userId: user._id, publicKey: user.encryptionPublicKey, privateKey, publicCryptoKey: identity.publicKey }, "current"));
}

export async function loadDeviceIdentity(user) {
  const saved = await transaction("readonly", (store) => store.get("current"));
  if (!saved || saved.userId !== user._id || saved.publicKey !== user.encryptionPublicKey || !saved.privateKey || !saved.publicCryptoKey) return null;
  return { privateKey: saved.privateKey, publicKey: saved.publicCryptoKey };
}

export async function clearDeviceIdentity() {
  await transaction("readwrite", (store) => store.delete("current"));
}
