import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage, deleteImage, getPublicIdFromUrl } from '../middleware/upload.js';
import imageService from '../services/imageService.js';

const router = Router();

// Memory storage for local image processing
const memoryStorage = multer.memoryStorage();
const localUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  },
});

// Custom interface for multer file with Cloudinary response
interface CloudinaryFile extends Express.Multer.File {
  path: string; // Cloudinary URL
  filename: string; // Public ID
}

// Upload single image
router.post(
  '/image',
  authenticate,
  authorize('owner', 'admin'),
  (req: Request, res: Response, next: NextFunction): void => {
    uploadImage.single('image')(req, res, (err): void => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            message: 'Le fichier est trop volumineux. Taille maximale: 5MB',
          });
          return;
        }
        res.status(400).json({
          success: false,
          message: err.message || 'Erreur lors de l\'upload',
        });
        return;
      }
      next();
      return;
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file as CloudinaryFile | undefined;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni',
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Image uploadée avec succès',
        data: {
          url: file.path,
          publicId: file.filename,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload de l\'image',
      });
    }
  }
);

// Delete image by URL
router.delete(
  '/image',
  authenticate,
  authorize('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          message: 'URL de l\'image requise',
        });
        return;
      }

      const publicId = getPublicIdFromUrl(url);

      if (!publicId) {
        res.status(400).json({
          success: false,
          message: 'URL invalide',
        });
        return;
      }

      const deleted = await deleteImage(publicId);

      if (deleted) {
        res.json({
          success: true,
          message: 'Image supprimée avec succès',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la suppression de l\'image',
        });
      }
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de l\'image',
      });
    }
  }
);

// ============================================
// Image Optimization Endpoints
// ============================================

/**
 * POST /api/v1/upload/optimize
 * Optimize and convert image to WebP
 * Returns the processed image as base64 or buffer
 */
router.post(
  '/optimize',
  authenticate,
  authorize('owner', 'admin'),
  localUpload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni',
        });
        return;
      }

      // Parse options from query/body
      const width = req.body.width ? parseInt(req.body.width, 10) : undefined;
      const height = req.body.height ? parseInt(req.body.height, 10) : undefined;
      const quality = req.body.quality ? parseInt(req.body.quality, 10) : 80;
      const preset = req.body.preset as keyof typeof imageService.IMAGE_PRESETS | undefined;

      let processed;
      if (preset && preset in imageService.IMAGE_PRESETS) {
        processed = await imageService.processImageWithPreset(req.file.buffer, preset, { quality });
      } else {
        processed = await imageService.processImage(req.file.buffer, {
          width,
          height,
          quality,
          format: 'webp',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          base64: processed.buffer.toString('base64'),
          format: processed.format,
          width: processed.width,
          height: processed.height,
          size: processed.size,
          mimeType: imageService.getMimeTypeForFormat(processed.format),
        },
      });
    } catch (error) {
      console.error('Image optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'optimisation de l\'image',
      });
    }
  }
);

/**
 * POST /api/v1/upload/validate
 * Validate an image file
 */
router.post(
  '/validate',
  authenticate,
  localUpload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni',
        });
        return;
      }

      const maxWidth = req.body.maxWidth ? parseInt(req.body.maxWidth, 10) : 4096;
      const maxHeight = req.body.maxHeight ? parseInt(req.body.maxHeight, 10) : 4096;
      const maxSize = req.body.maxSize ? parseInt(req.body.maxSize, 10) : 10 * 1024 * 1024;

      const result = await imageService.validateImage(req.file.buffer, {
        maxWidth,
        maxHeight,
        maxSize,
      });

      if (result.valid) {
        res.status(200).json({
          success: true,
          data: {
            valid: true,
            format: result.metadata?.format,
            width: result.metadata?.width,
            height: result.metadata?.height,
            size: req.file.size,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
          data: { valid: false },
        });
      }
    } catch (error) {
      console.error('Image validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la validation de l\'image',
      });
    }
  }
);

/**
 * POST /api/v1/upload/placeholder
 * Generate a blur placeholder for an image
 */
router.post(
  '/placeholder',
  authenticate,
  localUpload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni',
        });
        return;
      }

      const [blurPlaceholder, dominantColor] = await Promise.all([
        imageService.generateBlurPlaceholder(req.file.buffer),
        imageService.extractDominantColor(req.file.buffer),
      ]);

      res.status(200).json({
        success: true,
        data: {
          blurPlaceholder,
          dominantColor,
        },
      });
    } catch (error) {
      console.error('Placeholder generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du placeholder',
      });
    }
  }
);

export default router;
