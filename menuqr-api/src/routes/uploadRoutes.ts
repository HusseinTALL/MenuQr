import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage, deleteImage, getPublicIdFromUrl } from '../middleware/upload.js';

const router = Router();

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

export default router;
