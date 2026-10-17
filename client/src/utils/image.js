// Resize a photo in the browser before upload, so it fits the API's limits and
// loads fast. Returns { image, thumb } as JPEG data URLs.
// createImageBitmap honours the EXIF rotation from phone cameras.
const draw = (bitmap, maxSide, quality) => {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

export async function preparePhoto(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Choose an image file');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error("Couldn't read that image. Try a JPEG or PNG.");
  }
  // Step the quality down until the full image fits comfortably under the API limit
  let image;
  for (const q of [0.82, 0.7, 0.6, 0.5]) {
    image = draw(bitmap, 1080, q);
    if (image.length < 1_400_000) break;
  }
  const thumb = draw(bitmap, 240, 0.7);
  bitmap.close?.();
  return { image, thumb };
}
