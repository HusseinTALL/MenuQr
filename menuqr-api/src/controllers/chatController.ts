/**
 * Chat Controller
 * Handles REST API endpoints for chat functionality
 */

import { Request, Response } from 'express';
import * as chatService from '../services/chatService.js';
import Delivery from '../models/Delivery.js';
import logger from '../utils/logger.js';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  restaurantId?: string;
}

/**
 * Get chat history for a delivery
 */
export const getChatHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deliveryId } = req.params;
    const { limit, before } = req.query;

    // Verify user has access to this delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      res.status(404).json({ success: false, message: 'Delivery not found' });
      return;
    }

    // Check access based on user role
    const hasAccess = await verifyDeliveryAccess(delivery, req);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Get participant info for filtering
    let participantType: 'driver' | 'customer' | 'restaurant' | undefined;
    if (req.userRole === 'driver') {
      participantType = 'driver';
    } else if (req.restaurantId) {
      participantType = 'restaurant';
    } else {
      participantType = 'customer';
    }

    const messages = await chatService.getChatHistory(deliveryId, {
      limit: limit ? parseInt(limit as string) : 50,
      before: before ? new Date(before as string) : undefined,
      participantType,
      participantId: req.userId,
    });

    // Mark messages as sender's own
    const formattedMessages = messages.map(msg => ({
      _id: msg._id.toString(),
      sender: {
        type: msg.sender.type,
        name: msg.sender.name,
      },
      recipient: {
        type: msg.recipient.type,
      },
      messageType: msg.messageType,
      content: msg.content,
      imageUrl: msg.imageUrl,
      location: msg.location,
      quickReplyOptions: msg.quickReplyOptions,
      createdAt: msg.createdAt,
      isOwn: msg.sender.id?.toString() === req.userId,
      isRead: msg.metadata?.isRead,
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        deliveryId,
      },
    });
  } catch (error) {
    logger.error('Failed to get chat history:', error);
    res.status(500).json({ success: false, message: 'Failed to get chat history' });
  }
};

/**
 * Send a chat message
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deliveryId } = req.params;
    const { content, recipientType, messageType, imageUrl, location } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Message content is required' });
      return;
    }

    // Verify user has access to this delivery
    const delivery = await Delivery.findById(deliveryId).populate('orderId');
    if (!delivery) {
      res.status(404).json({ success: false, message: 'Delivery not found' });
      return;
    }

    const hasAccess = await verifyDeliveryAccess(delivery, req);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Determine sender type and name
    let senderType: 'driver' | 'customer' | 'restaurant' = 'customer';
    let senderName = 'Client';

    if (req.userRole === 'driver') {
      senderType = 'driver';
      senderName = 'Livreur';
    } else if (req.restaurantId) {
      senderType = 'restaurant';
      senderName = 'Restaurant';
    }

    const message = await chatService.sendMessage({
      deliveryId,
      orderId: delivery.orderId.toString(),
      senderType,
      senderId: req.userId,
      senderName,
      recipientType: recipientType || 'all',
      messageType: messageType || 'text',
      content: content.trim(),
      imageUrl,
      location,
    });

    res.status(201).json({
      success: true,
      data: {
        messageId: message._id.toString(),
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    logger.error('Failed to send message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * Mark messages as read
 */
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deliveryId } = req.params;

    // Determine reader type
    let readerType: 'driver' | 'customer' | 'restaurant' = 'customer';
    if (req.userRole === 'driver') {
      readerType = 'driver';
    } else if (req.restaurantId) {
      readerType = 'restaurant';
    }

    const count = await chatService.markMessagesAsRead(
      deliveryId,
      readerType,
      req.userId!
    );

    res.json({
      success: true,
      data: { markedAsRead: count },
    });
  } catch (error) {
    logger.error('Failed to mark messages as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deliveryId } = req.params;

    // Determine participant type
    let participantType: 'driver' | 'customer' | 'restaurant' = 'customer';
    if (req.userRole === 'driver') {
      participantType = 'driver';
    } else if (req.restaurantId) {
      participantType = 'restaurant';
    }

    const count = await chatService.getUnreadCount(
      deliveryId,
      participantType,
      req.userId!
    );

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    logger.error('Failed to get unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;

    // Determine deleter type
    let deleterType: 'driver' | 'customer' | 'restaurant' = 'customer';
    if (req.userRole === 'driver') {
      deleterType = 'driver';
    } else if (req.restaurantId) {
      deleterType = 'restaurant';
    }

    const deleted = await chatService.deleteMessage(
      messageId,
      req.userId!,
      deleterType
    );

    if (!deleted) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete this message',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    logger.error('Failed to delete message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
};

/**
 * Get quick reply suggestions
 */
export const getQuickReplies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let userType: 'driver' | 'customer' | 'restaurant' = 'customer';
    if (req.userRole === 'driver') {
      userType = 'driver';
    } else if (req.restaurantId) {
      userType = 'restaurant';
    }

    const quickReplies = chatService.getQuickReplies(userType);

    res.json({
      success: true,
      data: { quickReplies },
    });
  } catch (error) {
    logger.error('Failed to get quick replies:', error);
    res.status(500).json({ success: false, message: 'Failed to get quick replies' });
  }
};

/**
 * Helper function to verify delivery access
 */
async function verifyDeliveryAccess(delivery: any, req: AuthenticatedRequest): Promise<boolean> {
  // Drivers can access if they're assigned
  if (req.userRole === 'driver') {
    return delivery.driver?.toString() === req.userId;
  }

  // Restaurant staff can access if it's their restaurant
  if (req.restaurantId) {
    return delivery.restaurant?.toString() === req.restaurantId;
  }

  // Customers can access their own deliveries
  // For now, allow access if authenticated (customer verification would need orderId check)
  return !!req.userId;
}

export default {
  getChatHistory,
  sendMessage,
  markAsRead,
  getUnreadCount,
  deleteMessage,
  getQuickReplies,
};
