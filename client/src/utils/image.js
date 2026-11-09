// Client-side image resizing for progress photo uploads.
// Phone photos are 3–12 MB; resizing to ~1080 px JPEG brings them to
// ~150–300 KB before they ever leave the device.

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
  img.src = url;
});

const draw = (img, maxSide, quality) => {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

// File → { image, thumb } JPEG data URLs ready for POST /api/photos
export const compressPhoto = async (file) => {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  const img = await loadImage(file);
  return { image: draw(img, 1080, 0.82), thumb: draw(img, 320, 0.7) };
};
