/**
 * Image Processing Service
 *
 * Provides image optimization, WebP conversion, and resizing utilities.
 * Uses sharp for local image processing before uploading to Cloudinary.
 */

import sharp from 'sharp';

// Image size presets for different use cases
export const IMAGE_PRESETS = {
  thumbnail: { width: 150, height: 150 },
  card: { width: 400, height: 300 },
  dish: { width: 800, height: 600 },
  cover: { width: 1200, height: 400 },
  profile: { width: 200, height: 200 },
  full: { width: 1920, height: 1080 },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export interface ProcessedImage {
  buffer: Buffer;
  format: 'webp' | 'jpeg' | 'png';
  width: number;
  height: number;
  size: number;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: { r: number; g: number; b: number; alpha?: number };
}

/**
 * Process and optimize an image buffer
 * Converts to WebP by default for better compression
 */
export async function processImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    fit = 'inside',
    background = { r: 255, g: 255, b: 255, alpha: 0 },
  } = options;

  let pipeline = sharp(inputBuffer);

  // Resize if dimensions provided
  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit,
      background,
      withoutEnlargement: true, // Don't upscale small images
    });
  }

  // Convert to target format with optimization
  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: 4 });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 8 });
      break;
  }

  const processedBuffer = await pipeline.toBuffer();
  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    format,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: processedBuffer.length,
  };
}

/**
 * Process image using a preset configuration
 */
export async function processImageWithPreset(
  inputBuffer: Buffer,
  preset: ImagePreset,
  options: Omit<ImageProcessingOptions, 'width' | 'height'> = {}
): Promise<ProcessedImage> {
  const presetConfig = IMAGE_PRESETS[preset];
  return processImage(inputBuffer, {
    ...options,
    ...presetConfig,
  });
}

/**
 * Generate multiple sizes of an image
 * Useful for responsive images and srcset
 */
export async function generateImageVariants(
  inputBuffer: Buffer,
  sizes: number[],
  options: Omit<ImageProcessingOptions, 'width'> = {}
): Promise<Map<number, ProcessedImage>> {
  const variants = new Map<number, ProcessedImage>();

  // Get original dimensions
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 800;

  // Filter out sizes larger than original
  const validSizes = sizes.filter(size => size <= originalWidth);

  // Process each size
  await Promise.all(
    validSizes.map(async (width) => {
      const processed = await processImage(inputBuffer, { ...options, width });
      variants.set(width, processed);
    })
  );

  return variants;
}

/**
 * Extract dominant color from image
 * Useful for placeholder backgrounds
 */
export async function extractDominantColor(inputBuffer: Buffer): Promise<string> {
  const { dominant } = await sharp(inputBuffer)
    .resize(10, 10, { fit: 'cover' })
    .toBuffer()
    .then(buf => sharp(buf).stats());

  if (!dominant) {
    return '#f3f4f6'; // Default gray
  }

  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
}

/**
 * Generate a blur hash placeholder
 * Returns a small base64 blurred version of the image
 */
export async function generateBlurPlaceholder(inputBuffer: Buffer): Promise<string> {
  const blurredBuffer = await sharp(inputBuffer)
    .resize(20, 20, { fit: 'inside' })
    .blur(2)
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${blurredBuffer.toString('base64')}`;
}

/**
 * Validate image file
 * Check format and dimensions
 */
export async function validateImage(
  inputBuffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    maxSize?: number;
    allowedFormats?: string[];
  } = {}
): Promise<{ valid: boolean; error?: string; metadata?: sharp.Metadata }> {
  const {
    maxWidth = 4096,
    maxHeight = 4096,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedFormats = ['jpeg', 'png', 'webp', 'gif'],
  } = options;

  try {
    // Check file size
    if (inputBuffer.length > maxSize) {
      return {
        valid: false,
        error: `Le fichier est trop volumineux. Taille maximale: ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    // Get metadata
    const metadata = await sharp(inputBuffer).metadata();

    // Check format
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Format non supporté. Formats acceptés: ${allowedFormats.join(', ')}`,
      };
    }

    // Check dimensions
    if (metadata.width && metadata.width > maxWidth) {
      return {
        valid: false,
        error: `L'image est trop large. Largeur maximale: ${maxWidth}px`,
      };
    }

    if (metadata.height && metadata.height > maxHeight) {
      return {
        valid: false,
        error: `L'image est trop haute. Hauteur maximale: ${maxHeight}px`,
      };
    }

    return { valid: true, metadata };
  } catch {
    return {
      valid: false,
      error: 'Le fichier n\'est pas une image valide',
    };
  }
}

/**
 * Get image file extension for a format
 */
export function getExtensionForFormat(format: string): string {
  const extensions: Record<string, string> = {
    webp: '.webp',
    jpeg: '.jpg',
    png: '.png',
    gif: '.gif',
  };
  return extensions[format] || '.jpg';
}

/**
 * Get MIME type for a format
 */
export function getMimeTypeForFormat(format: string): string {
  const mimeTypes: Record<string, string> = {
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
  };
  return mimeTypes[format] || 'image/jpeg';
}

export default {
  processImage,
  processImageWithPreset,
  generateImageVariants,
  extractDominantColor,
  generateBlurPlaceholder,
  validateImage,
  IMAGE_PRESETS,
  getExtensionForFormat,
  getMimeTypeForFormat,
};
