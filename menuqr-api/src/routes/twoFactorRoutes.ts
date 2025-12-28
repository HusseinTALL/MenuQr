/**
 * Two-Factor Authentication Routes
 */

import { Router } from 'express';
import {
  getTwoFactorStatus,
  initTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactor,
  regenerateBackupCodes,
} from '../controllers/twoFactorController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public route - 2FA verification during login
router.post('/verify', verifyTwoFactor);

// Protected routes - require authentication
router.get('/status', authenticate, getTwoFactorStatus);
router.post('/setup', authenticate, initTwoFactorSetup);
router.post('/enable', authenticate, enableTwoFactor);
router.post('/disable', authenticate, disableTwoFactor);
router.post('/regenerate-backup-codes', authenticate, regenerateBackupCodes);

export default router;
