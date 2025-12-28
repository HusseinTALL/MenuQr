/**
 * Session Management Routes
 */

import { Router } from 'express';
import {
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
} from '../controllers/sessionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all active sessions
router.get('/', getSessions);

// Revoke a specific session
router.delete('/:sessionId', revokeSession);

// Revoke all other sessions
router.delete('/', revokeAllOtherSessions);

export default router;
