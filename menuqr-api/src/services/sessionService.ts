/**
 * Session Management Service
 * Handles active session tracking and device management
 */

import mongoose from 'mongoose';
import { Session, ISession } from '../models/Session.js';
import { blacklistToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';

const REFRESH_TOKEN_EXPIRY_MS = parseTokenExpiry(config.jwtRefreshExpiresIn);

/**
 * Parse token expiry string to milliseconds
 */
function parseTokenExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

export interface CreateSessionParams {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Create a new session for a user
 */
export const createSession = async (params: CreateSessionParams): Promise<ISession> => {
  const { userId, refreshToken, userAgent, ipAddress } = params;

  const deviceInfo = Session.parseUserAgent(userAgent);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  const session = await Session.create({
    userId: new mongoose.Types.ObjectId(userId),
    refreshToken,
    deviceInfo,
    ipAddress,
    lastActiveAt: new Date(),
    expiresAt,
  });

  logger.debug('Session created', { userId, sessionId: session._id });

  return session;
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = async (refreshToken: string): Promise<void> => {
  await Session.findOneAndUpdate(
    { refreshToken },
    { lastActiveAt: new Date() }
  );
};

/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (
  userId: string,
  currentRefreshToken?: string
): Promise<Array<{
  id: string;
  deviceInfo: ISession['deviceInfo'];
  ipAddress?: string;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}>> => {
  const sessions = await Session.find({
    userId: new mongoose.Types.ObjectId(userId),
    expiresAt: { $gt: new Date() },
  })
    .select('+refreshToken')
    .sort({ lastActiveAt: -1 });

  return sessions.map(session => ({
    id: session._id.toString(),
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
    isCurrent: currentRefreshToken ? session.refreshToken === currentRefreshToken : false,
  }));
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message: string }> => {
  const session = await Session.findOne({
    _id: sessionId,
    userId: new mongoose.Types.ObjectId(userId),
  }).select('+refreshToken');

  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  // Blacklist the refresh token
  await blacklistToken(session.refreshToken, userId, 'refresh');

  // Delete the session
  await Session.deleteOne({ _id: sessionId });

  logger.info('Session revoked', { userId, sessionId });

  return { success: true, message: 'Session revoked successfully' };
};

/**
 * Revoke all sessions except the current one
 */
export const revokeAllOtherSessions = async (
  userId: string,
  currentRefreshToken: string
): Promise<{ success: boolean; revokedCount: number }> => {
  const sessions = await Session.find({
    userId: new mongoose.Types.ObjectId(userId),
    refreshToken: { $ne: currentRefreshToken },
  }).select('+refreshToken');

  // Blacklist all tokens
  for (const session of sessions) {
    await blacklistToken(session.refreshToken, userId, 'refresh');
  }

  // Delete all other sessions
  const result = await Session.deleteMany({
    userId: new mongoose.Types.ObjectId(userId),
    refreshToken: { $ne: currentRefreshToken },
  });

  logger.info('All other sessions revoked', { userId, revokedCount: result.deletedCount });

  return { success: true, revokedCount: result.deletedCount };
};

/**
 * Revoke all sessions for a user (e.g., on password change)
 */
export const revokeAllSessions = async (userId: string): Promise<number> => {
  const sessions = await Session.find({
    userId: new mongoose.Types.ObjectId(userId),
  }).select('+refreshToken');

  // Blacklist all tokens
  for (const session of sessions) {
    await blacklistToken(session.refreshToken, userId, 'refresh');
  }

  // Delete all sessions
  const result = await Session.deleteMany({
    userId: new mongoose.Types.ObjectId(userId),
  });

  logger.info('All sessions revoked', { userId, revokedCount: result.deletedCount });

  return result.deletedCount;
};

/**
 * Delete session by refresh token (on logout)
 */
export const deleteSessionByToken = async (refreshToken: string): Promise<void> => {
  await Session.deleteOne({ refreshToken });
};

/**
 * Get session count for a user
 */
export const getSessionCount = async (userId: string): Promise<number> => {
  return Session.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    expiresAt: { $gt: new Date() },
  });
};

export default {
  createSession,
  updateSessionActivity,
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  revokeAllSessions,
  deleteSessionByToken,
  getSessionCount,
};
