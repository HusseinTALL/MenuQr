/**
 * Image optimization utilities
 * Provides helpers for image format detection, optimization URLs, and responsive images
 */

// Check WebP support (cached)
let webpSupported: boolean | null = null;

export async function supportsWebP(): Promise<boolean> {
  if (webpSupported !== null) {
    return webpSupported;
  }

  if (typeof window === 'undefined') {
    webpSupported = true;
    return true;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    webpSupported = false;
  }

  return webpSupported;
}

// Check AVIF support (cached)
let avifSupported: boolean | null = null;

export async function supportsAVIF(): Promise<boolean> {
  if (avifSupported !== null) {
    return avifSupported;
  }

  if (typeof window === 'undefined') {
    avifSupported = false;
    return false;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      avifSupported = img.width > 0 && img.height > 0;
      resolve(avifSupported);
    };
    img.onerror = () => {
      avifSupported = false;
      resolve(false);
    };
    // Tiny AVIF test image
    img.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABgAHCAYQGBQCAAADAAQAADAB';
  });
}

/**
 * Generate optimized Unsplash URL
 */
export function optimizeUnsplashUrl(
  src: string,
  options: {
    width?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    blur?: number;
  } = {}
): string {
  if (!src.includes('unsplash.com')) {
    return src;
  }

  try {
    const url = new URL(src);

    if (options.width) {
      url.searchParams.set('w', String(options.width));
    }

    url.searchParams.set('q', String(options.quality || 80));
    url.searchParams.set('auto', 'format');

    if (options.format && options.format !== 'auto') {
      url.searchParams.set('fm', options.format);
    }

    if (options.blur) {
      url.searchParams.set('blur', String(options.blur));
    }

    return url.toString();
  } catch {
    return src;
  }
}

/**
 * Generate optimized Cloudinary URL
 */
export function optimizeCloudinaryUrl(
  src: string,
  options: {
    width?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg' | 'png' | 'avif';
    blur?: number;
    crop?: 'fill' | 'fit' | 'limit' | 'scale';
  } = {}
): string {
  if (!src.includes('cloudinary.com')) {
    return src;
  }

  const transforms: string[] = [];

  if (options.width) {
    transforms.push(`w_${options.width}`);
  }

  transforms.push(`q_${options.quality || 'auto'}`);
  transforms.push(`f_${options.format || 'auto'}`);

  if (options.crop) {
    transforms.push(`c_${options.crop}`);
  }

  if (options.blur) {
    transforms.push(`e_blur:${options.blur}`);
  }

  const transformString = transforms.join(',');
  return src.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * Generate responsive srcset for images
 */
export function generateSrcset(
  src: string,
  widths: number[] = [320, 480, 640, 768, 1024, 1280]
): string {
  if (!src) {
    return '';
  }

  if (src.includes('cloudinary.com')) {
    return widths.map((w) => `${optimizeCloudinaryUrl(src, { width: w })} ${w}w`).join(', ');
  }

  if (src.includes('unsplash.com')) {
    return widths.map((w) => `${optimizeUnsplashUrl(src, { width: w })} ${w}w`).join(', ');
  }

  return '';
}

/**
 * Generate sizes attribute based on common breakpoints
 */
export function generateSizes(
  config: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    default?: string;
  } = {}
): string {
  const {
    mobile = '100vw',
    tablet = '50vw',
    desktop = '33vw',
    default: defaultSize = '25vw',
  } = config;

  return [
    `(max-width: 640px) ${mobile}`,
    `(max-width: 1024px) ${tablet}`,
    `(max-width: 1280px) ${desktop}`,
    defaultSize,
  ].join(', ');
}

/**
 * Get optimal image format based on browser support
 */
export async function getOptimalFormat(): Promise<'avif' | 'webp' | 'jpg'> {
  if (await supportsAVIF()) {
    return 'avif';
  }
  if (await supportsWebP()) {
    return 'webp';
  }
  return 'jpg';
}

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(width: number, height: number): string {
  return `${width}/${height}`;
}

/**
 * Common aspect ratios
 */
export const ASPECT_RATIOS = {
  square: '1/1',
  landscape: '16/9',
  portrait: '9/16',
  widescreen: '21/9',
  photo: '4/3',
  card: '3/2',
} as const;

/**
 * Generate blur data URL for placeholder
 */
export function generateBlurDataUrl(color: string = '#e5e7eb'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 6"><rect fill="${color}" width="8" height="6"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
