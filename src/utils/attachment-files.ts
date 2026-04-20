export const ATTACHMENT_IMAGE_ACCEPT = "image/*";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2048;
const COMPRESSED_IMAGE_TYPE = "image/jpeg";
const COMPRESSED_IMAGE_QUALITY = 0.82;

const ALLOWED_ATTACHMENT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const ALLOWED_ATTACHMENT_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
]);

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

export function validateAttachmentImageFile(file: File) {
  const hasAllowedMimeType = !!file.type && ALLOWED_ATTACHMENT_IMAGE_TYPES.has(file.type);
  const hasAllowedExtension = ALLOWED_ATTACHMENT_IMAGE_EXTENSIONS.has(
    getFileExtension(file.name),
  );

  if (!hasAllowedMimeType && !hasAllowedExtension) {
    return "Only JPG, PNG, WEBP, or iPhone HEIC/HEIF images are supported.";
  }

  return null;
}

function changeExtension(fileName: string, nextExtension: string) {
  const normalized = nextExtension.startsWith(".") ? nextExtension : `.${nextExtension}`;
  const index = fileName.lastIndexOf(".");
  return index === -1 ? `${fileName}${normalized}` : `${fileName.slice(0, index)}${normalized}`;
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to process this image on this device."));
      nextImage.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressRasterImage(file: File) {
  const image = await loadImageElement(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image compression is not available in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Unable to optimize the selected image."));
          return;
        }
        resolve(nextBlob);
      },
      COMPRESSED_IMAGE_TYPE,
      COMPRESSED_IMAGE_QUALITY,
    );
  });

  return new File([blob], changeExtension(file.name, "jpg"), {
    type: COMPRESSED_IMAGE_TYPE,
    lastModified: file.lastModified,
  });
}

export async function prepareAttachmentImageFile(file: File) {
  const validationError = validateAttachmentImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const isBrowserCompressible = /^(image\/jpeg|image\/png|image\/webp)$/i.test(file.type);

  if (!isBrowserCompressible) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        "This image is too large to upload directly from mobile. Please choose a smaller photo or convert it to JPG first.",
      );
    }
    return file;
  }

  if (file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const compressedFile = await compressRasterImage(file);
  if (compressedFile.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      "This image is still too large after optimization. Please choose a smaller photo.",
    );
  }

  return compressedFile;
}
