import { decryptText } from "./crypto";

let database;
function openPhotos() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open("pinglet-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
  return database;
}

async function accessPhoto(owner, sender, id, value) {
  const db = await openPhotos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", value ? "readwrite" : "readonly");
    const store = tx.objectStore("photos");
    const key = [owner, sender, id];
    const request = value ? store.put(value, key) : store.get(key);
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error || new Error("Photo storage is unavailable"));
  });
}

export const savePhoto = (owner, sender, id, encrypted) => accessPhoto(owner, sender, id, encrypted);

export async function loadFileBytes(message, owner, identity) {
  const encrypted = await accessPhoto(owner, message.senderId, message.documentId);
  if (!encrypted) throw new Error("This document is unavailable on this device.");
  return decryptText({ senderId: message.senderId, encrypted }, owner, identity);
}

export async function loadPhoto(message, owner, identity) {
  const encrypted = await accessPhoto(owner, message.senderId, message.photoId);
  if (!encrypted) return null;
  const image = await decryptText({ senderId: message.senderId, encrypted }, owner, identity);
  if (!image.startsWith("data:image/jpeg;base64,")) return null;
  return image;
}
