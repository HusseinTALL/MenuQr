/**
 * Chat Service
 * Handles real-time messaging for deliveries
 */

import ChatMessage, { IChatMessage } from '../models/ChatMessage.js';
import * as socketService from './socketService.js';
import logger from '../utils/logger.js';
import { Types } from 'mongoose';

// Types
export interface SendMessageParams {
  deliveryId: string;
  orderId: string;
  senderType: 'driver' | 'customer' | 'restaurant' | 'system';
  senderId?: string;
  senderName: string;
  recipientType: 'driver' | 'customer' | 'restaurant' | 'all';
  recipientId?: string;
  messageType?: 'text' | 'image' | 'location' | 'quick_reply' | 'system';
  content: string;
  imageUrl?: string;
  location?: { lat: number; lng: number };
  quickReplyOptions?: string[];
}

export interface ChatMessageResponse {
  _id: string;
  deliveryId: string;
  orderId: string;
  sender: {
    type: string;
    name: string;
  };
  recipient: {
    type: string;
  };
  messageType: string;
  content: string;
  imageUrl?: string;
  location?: { lat: number; lng: number };
  quickReplyOptions?: string[];
  createdAt: Date;
  isOwn?: boolean;
}

// Quick reply templates for common messages
export const QUICK_REPLIES = {
  driver: [
    'Je suis en route',
    'Je suis arrivé au restaurant',
    'J\'ai récupéré la commande',
    'Je suis devant chez vous',
    'Pouvez-vous descendre ?',
    'Où dois-je sonner ?',
  ],
  customer: [
    'Merci !',
    'Je descends',
    'Attendez, j\'arrive',
    'Sonnez à l\'interphone',
    'Laissez devant la porte',
    'Quel est votre ETA ?',
  ],
  restaurant: [
    'La commande est prête',
    'La commande sera prête dans 5 min',
    'Merci de patienter',
    'Nous préparons votre commande',
  ],
};

/**
 * Send a chat message
 */
export async function sendMessage(params: SendMessageParams): Promise<IChatMessage> {
  const {
    deliveryId,
    orderId,
    senderType,
    senderId,
    senderName,
    recipientType,
    recipientId,
    messageType = 'text',
    content,
    imageUrl,
    location,
    quickReplyOptions,
  } = params;

  // Create message
  const message = new ChatMessage({
    deliveryId: new Types.ObjectId(deliveryId),
    orderId: new Types.ObjectId(orderId),
    sender: {
      type: senderType,
      id: senderId ? new Types.ObjectId(senderId) : undefined,
      name: senderName,
    },
    recipient: {
      type: recipientType,
      id: recipientId ? new Types.ObjectId(recipientId) : undefined,
    },
    messageType,
    content,
    imageUrl,
    location,
    quickReplyOptions,
    metadata: {
      isRead: false,
      deliveredAt: new Date(),
    },
  });

  await message.save();

  // Broadcast message via WebSocket
  broadcastMessage(deliveryId, message);

  logger.debug('Chat message sent', {
    deliveryId,
    messageId: message._id,
    senderType,
    recipientType,
  });

  return message;
}

/**
 * Send a system message (automated notifications)
 */
export async function sendSystemMessage(
  deliveryId: string,
  orderId: string,
  content: string,
  recipientType: 'driver' | 'customer' | 'restaurant' | 'all' = 'all'
): Promise<IChatMessage> {
  return sendMessage({
    deliveryId,
    orderId,
    senderType: 'system',
    senderName: 'Système',
    recipientType,
    messageType: 'system',
    content,
  });
}

/**
 * Get chat history for a delivery
 */
export async function getChatHistory(
  deliveryId: string,
  options: {
    limit?: number;
    before?: Date;
    participantType?: 'driver' | 'customer' | 'restaurant';
    participantId?: string;
  } = {}
): Promise<IChatMessage[]> {
  const { limit = 50, before, participantType, participantId } = options;

  const query: Record<string, unknown> = {
    deliveryId: new Types.ObjectId(deliveryId),
    isDeleted: false,
  };

  if (before) {
    query.createdAt = { $lt: before };
  }

  // Filter messages visible to participant
  if (participantType && participantId) {
    query.$or = [
      { 'sender.type': participantType, 'sender.id': new Types.ObjectId(participantId) },
      { 'recipient.type': participantType, 'recipient.id': new Types.ObjectId(participantId) },
      { 'recipient.type': 'all' },
    ];
  }

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return messages.reverse() as IChatMessage[];
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  deliveryId: string,
  readerType: 'driver' | 'customer' | 'restaurant',
  readerId: string
): Promise<number> {
  const result = await ChatMessage.updateMany(
    {
      deliveryId: new Types.ObjectId(deliveryId),
      'metadata.isRead': false,
      $or: [
        { 'recipient.type': readerType, 'recipient.id': new Types.ObjectId(readerId) },
        { 'recipient.type': 'all' },
      ],
      'sender.id': { $ne: new Types.ObjectId(readerId) },
    },
    {
      $set: {
        'metadata.isRead': true,
        'metadata.readAt': new Date(),
      },
    }
  );

  // Notify sender(s) that messages were read
  if (result.modifiedCount > 0) {
    const io = socketService.getIO();
    if (io) {
      io.to(`chat:${deliveryId}`).emit('chat:messages:read', {
        deliveryId,
        readBy: readerType,
        readAt: new Date(),
      });
    }
  }

  return result.modifiedCount;
}

/**
 * Get unread message count
 */
export async function getUnreadCount(
  deliveryId: string,
  participantType: 'driver' | 'customer' | 'restaurant',
  participantId: string
): Promise<number> {
  return ChatMessage.countDocuments({
    deliveryId: new Types.ObjectId(deliveryId),
    'metadata.isRead': false,
    $or: [
      { 'recipient.type': participantType, 'recipient.id': new Types.ObjectId(participantId) },
      { 'recipient.type': 'all' },
    ],
    'sender.id': { $ne: new Types.ObjectId(participantId) },
  });
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(
  messageId: string,
  deleterId: string,
  deleterType: 'driver' | 'customer' | 'restaurant'
): Promise<boolean> {
  const message = await ChatMessage.findById(messageId);

  if (!message) {
    return false;
  }

  // Only sender can delete their own message
  if (message.sender.id?.toString() !== deleterId || message.sender.type !== deleterType) {
    return false;
  }

  // Only allow deletion within 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (message.createdAt < fiveMinutesAgo) {
    return false;
  }

  message.isDeleted = true;
  message.content = 'Ce message a été supprimé';
  await message.save();

  // Notify via socket
  const io = socketService.getIO();
  if (io) {
    io.to(`chat:${message.deliveryId}`).emit('chat:message:deleted', {
      messageId,
      deliveryId: message.deliveryId,
    });
  }

  return true;
}

/**
 * Broadcast message to chat room participants
 */
function broadcastMessage(deliveryId: string, message: IChatMessage): void {
  const io = socketService.getIO();
  if (!io) return;

  const messageData: ChatMessageResponse = {
    _id: message._id.toString(),
    deliveryId: message.deliveryId.toString(),
    orderId: message.orderId.toString(),
    sender: {
      type: message.sender.type,
      name: message.sender.name,
    },
    recipient: {
      type: message.recipient.type,
    },
    messageType: message.messageType,
    content: message.content,
    imageUrl: message.imageUrl,
    location: message.location,
    quickReplyOptions: message.quickReplyOptions,
    createdAt: message.createdAt,
  };

  // Emit to the chat room
  io.to(`chat:${deliveryId}`).emit('chat:message', messageData);

  // Also send push notification preview to mobile
  if (message.sender.type !== 'system') {
    io.to(`chat:${deliveryId}`).emit('chat:notification', {
      deliveryId,
      sender: message.sender.name,
      preview: message.content.substring(0, 50),
      messageType: message.messageType,
    });
  }
}

/**
 * Send automated delivery status messages
 */
export async function sendDeliveryStatusMessage(
  deliveryId: string,
  orderId: string,
  status: string,
  driverName?: string
): Promise<void> {
  const statusMessages: Record<string, string> = {
    assigned: `Un livreur (${driverName || 'Livreur'}) a été assigné à votre commande`,
    accepted: `${driverName || 'Le livreur'} a accepté votre livraison et se dirige vers le restaurant`,
    arriving_restaurant: `${driverName || 'Le livreur'} arrive au restaurant`,
    at_restaurant: `${driverName || 'Le livreur'} est arrivé au restaurant`,
    picked_up: `${driverName || 'Le livreur'} a récupéré votre commande et est en route`,
    in_transit: 'Votre commande est en route vers vous',
    arrived: `${driverName || 'Le livreur'} est arrivé à destination`,
    delivered: 'Votre commande a été livrée. Bon appétit !',
  };

  const message = statusMessages[status];
  if (message) {
    await sendSystemMessage(deliveryId, orderId, message, 'customer');
  }
}

/**
 * Get quick reply suggestions based on user type
 */
export function getQuickReplies(userType: 'driver' | 'customer' | 'restaurant'): string[] {
  return QUICK_REPLIES[userType] || [];
}

export default {
  sendMessage,
  sendSystemMessage,
  getChatHistory,
  markMessagesAsRead,
  getUnreadCount,
  deleteMessage,
  sendDeliveryStatusMessage,
  getQuickReplies,
  QUICK_REPLIES,
};
