/**
 * Session Management Controller
 * Handles device/session viewing and revocation
 */

import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as sessionService from '../services/sessionService.js';
import * as auditService from '../services/auditService.js';

/**
 * Get all active sessions for current user
 * GET /auth/sessions
 */
export const getSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id.toString();

  // Get refresh token from body or authorization header
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

  const sessions = await sessionService.getUserSessions(userId, refreshToken);

  res.json({
    success: true,
    data: {
      sessions,
      totalCount: sessions.length,
    },
  });
});

/**
 * Revoke a specific session
 * DELETE /auth/sessions/:sessionId
 */
export const revokeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const userId = user._id.toString();
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required');
  }

  const result = await sessionService.revokeSession(userId, sessionId);

  if (!result.success) {
    throw new ApiError(404, result.message);
  }

  // Audit log
  await auditService.createAuditLog({
    action: 'logout',
    category: 'authentication',
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    description: `User ${user.email} revoked session ${sessionId}`,
    metadata: { sessionId },
    request: { ip: req.ip, userAgent: req.get('user-agent') },
  });

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * Revoke all sessions except current
 * DELETE /auth/sessions
 */
export const revokeAllOtherSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const userId = user._id.toString();

  // Get current refresh token
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    throw new ApiError(400, 'Current refresh token is required');
  }

  const result = await sessionService.revokeAllOtherSessions(userId, refreshToken);

  // Audit log
  await auditService.createAuditLog({
    action: 'logout',
    category: 'authentication',
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    description: `User ${user.email} revoked all other sessions (${result.revokedCount} sessions)`,
    metadata: { revokedCount: result.revokedCount },
    request: { ip: req.ip, userAgent: req.get('user-agent') },
  });

  res.json({
    success: true,
    message: `${result.revokedCount} session(s) revoked successfully`,
    data: {
      revokedCount: result.revokedCount,
    },
  });
});

export default {
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
};
