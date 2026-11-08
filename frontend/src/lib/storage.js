// localStorage can throw (Safari private mode, blocked storage): never let that break the app.
export const readBool = (key, fallback = false) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "true";
  } catch {
    return fallback;
  }
};

export const writeBool = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
};
