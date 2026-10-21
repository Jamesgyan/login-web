// Shrinks a photo in the browser to a JPEG under maxBytes (default 500 KB).
export async function compressImage(file: File, maxBytes = 500 * 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  let quality = 0.85;
  for (let i = 0; i < 12; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size < maxBytes) return blob;
    if (quality > 0.5) quality -= 0.1;
    else scale *= 0.8;
  }
  throw new Error("Could not shrink the photo below 500 KB");
}
