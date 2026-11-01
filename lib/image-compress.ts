const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_EDGE = 1920;
const DEFAULT_QUALITY = 0.82;

function isLikelyImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

async function loadHtmlImage(
  file: File,
): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          new Error(
            "Deze foto kan niet worden gelezen. Kies een JPG, PNG of HEIC.",
          ),
        );
      img.src = url;
    });
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return { image: img, revoke: () => URL.revokeObjectURL(url) };
}

async function decodeImage(file: File): Promise<{
  image: ImageBitmap | HTMLImageElement;
  revoke: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { image: bitmap, revoke: () => bitmap.close() };
    } catch {
      /* HEIC and some iPhone formats fail here in Chrome */
    }
  }
  return loadHtmlImage(file);
}

/** Resize and JPEG-compress a photo in the browser before upload. */
export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<Blob> {
  if (!isLikelyImage(file)) {
    throw new Error("Kies een foto (JPG, PNG of HEIC).");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Deze foto is groter dan 25 MB. Kies een kleinere.");
  }
  if (file.size === 0) {
    throw new Error("Dit bestand is leeg. Kies een andere foto.");
  }

  const { image, revoke } = await decodeImage(file);
  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  if (!width || !height) {
    revoke();
    throw new Error(
      "Deze foto kan niet worden gelezen. Kies een JPG, PNG of HEIC.",
    );
  }

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    revoke();
    throw new Error("De foto kon niet worden verwerkt. Probeer het opnieuw.");
  }
  ctx.drawImage(image, 0, 0, targetW, targetH);
  revoke();

  const quality = options?.quality ?? DEFAULT_QUALITY;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) {
    throw new Error("De foto kon niet worden verwerkt. Probeer het opnieuw.");
  }
  return blob;
}
