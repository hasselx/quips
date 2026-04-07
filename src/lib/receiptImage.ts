const DEFAULT_MAX_DIMENSION = 768;
const DEFAULT_INITIAL_QUALITY = 0.5;
const DEFAULT_MIN_QUALITY = 0.3;
const DEFAULT_TARGET_MAX_BYTES = 450 * 1024;
const DEFAULT_MIN_WIDTH = 360;

const estimateBase64Bytes = (base64: string) => Math.ceil((base64.length * 3) / 4);

const renderJpeg = (
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is not supported on this device");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
};

export const compressReceiptImage = async (file: File): Promise<{ base64: string; mimeType: string }> => {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        const originalWidth = image.naturalWidth || image.width;
        const originalHeight = image.naturalHeight || image.height;

        if (!originalWidth || !originalHeight) {
          throw new Error("Could not read the selected image");
        }

        const scale = Math.min(1, DEFAULT_MAX_DIMENSION / Math.max(originalWidth, originalHeight));
        let width = Math.max(1, Math.round(originalWidth * scale));
        let height = Math.max(1, Math.round(originalHeight * scale));
        let quality = DEFAULT_INITIAL_QUALITY;
        let dataUrl = renderJpeg(image, width, height, quality);

        while (
          estimateBase64Bytes(dataUrl.split(",")[1] || "") > DEFAULT_TARGET_MAX_BYTES &&
          (quality > DEFAULT_MIN_QUALITY || width > DEFAULT_MIN_WIDTH)
        ) {
          if (quality > DEFAULT_MIN_QUALITY) {
            quality = Math.max(DEFAULT_MIN_QUALITY, Number((quality - 0.08).toFixed(2)));
          } else {
            width = Math.max(DEFAULT_MIN_WIDTH, Math.round(width * 0.85));
            height = Math.max(1, Math.round((width / originalWidth) * originalHeight));
            quality = DEFAULT_INITIAL_QUALITY;
          }

          dataUrl = renderJpeg(image, width, height, quality);
        }

        resolve({
          base64: dataUrl.split(",")[1] || "",
          mimeType: "image/jpeg",
        });
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not process the selected image"));
    };

    image.src = objectUrl;
  });
};