// app/utils/cropImage.js
export function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", error => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

export default async function getCroppedImg(imageSrc, pixelCrop, size = 240) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise(resolve => {
    canvas.toBlob(file => {
      resolve(file);
    }, "image/jpeg", 0.9);
  });
}
