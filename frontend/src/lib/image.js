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

// Normalize camera and gallery images before encrypting them for transfer.
export async function prepareChatPhoto(file) {
  if (file.size > 32 * 1024 * 1024) throw new Error("Choose a photo smaller than 32 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("This photo cannot be opened. Try a JPEG, PNG or WebP image."); });
    const scale = Math.min(1, 1440 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.83, 0.65, 0.45]) {
      const photo = canvas.toDataURL("image/jpeg", quality);
      if (photo.startsWith("data:image/jpeg;base64,") && photo.length < 740000) return photo;
    }
    throw new Error("This photo is too detailed to send. Crop it and try again.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
