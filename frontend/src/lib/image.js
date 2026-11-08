export const MAX_IMAGE_MB = 3;
const ALLOWED = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Returns an error string, or null when the file is acceptable. */
export const validateImageFile = (file) => {
  if (!file) return "No file selected";
  if (!ALLOWED.includes(file.type)) return "Please choose a PNG, JPEG, GIF or WebP image";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Image must be smaller than ${MAX_IMAGE_MB} MB`;
  return null;
};

export const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
