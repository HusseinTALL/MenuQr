/**
 * Chat Routes
 * API endpoints for delivery chat functionality
 */

import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// Get chat history for a delivery
router.get('/delivery/:deliveryId/messages', chatController.getChatHistory);

// Send a message
router.post('/delivery/:deliveryId/messages', chatController.sendMessage);

// Mark messages as read
router.post('/delivery/:deliveryId/read', chatController.markAsRead);

// Get unread message count
router.get('/delivery/:deliveryId/unread', chatController.getUnreadCount);

// Delete a message (soft delete)
router.delete('/messages/:messageId', chatController.deleteMessage);

// Get quick reply suggestions
router.get('/quick-replies', chatController.getQuickReplies);

export default router;
