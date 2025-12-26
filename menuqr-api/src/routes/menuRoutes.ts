import { Router } from 'express';
import { getFullMenu, getMenuBySlug } from '../controllers/menuController.js';

const router = Router();

// Public routes - Get full menu for a restaurant
router.get('/restaurant/:id', getFullMenu);
router.get('/slug/:slug', getMenuBySlug);

export default router;
