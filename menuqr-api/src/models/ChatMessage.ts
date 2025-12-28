/**
 * Chat Message Model
 * For real-time messaging during deliveries between drivers, customers, and restaurants
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  _id: Types.ObjectId;
  deliveryId: Types.ObjectId;
  orderId: Types.ObjectId;
  sender: {
    type: 'driver' | 'customer' | 'restaurant' | 'system';
    id?: Types.ObjectId;
    name: string;
  };
  recipient: {
    type: 'driver' | 'customer' | 'restaurant' | 'all';
    id?: Types.ObjectId;
  };
  messageType: 'text' | 'image' | 'location' | 'quick_reply' | 'system';
  content: string;
  imageUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
  quickReplyOptions?: string[];
  metadata?: {
    isRead: boolean;
    readAt?: Date;
    deliveredAt?: Date;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    sender: {
      type: {
        type: String,
        enum: ['driver', 'customer', 'restaurant', 'system'],
        required: true,
      },
      id: {
        type: Schema.Types.ObjectId,
        refPath: 'sender.type',
      },
      name: {
        type: String,
        required: true,
      },
    },
    recipient: {
      type: {
        type: String,
        enum: ['driver', 'customer', 'restaurant', 'all'],
        required: true,
      },
      id: {
        type: Schema.Types.ObjectId,
      },
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'location', 'quick_reply', 'system'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    imageUrl: {
      type: String,
    },
    location: {
      lat: Number,
      lng: Number,
    },
    quickReplyOptions: [{
      type: String,
    }],
    metadata: {
      isRead: {
        type: Boolean,
        default: false,
      },
      readAt: Date,
      deliveredAt: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ChatMessageSchema.index({ deliveryId: 1, createdAt: -1 });
ChatMessageSchema.index({ orderId: 1, createdAt: -1 });
ChatMessageSchema.index({ 'sender.id': 1, createdAt: -1 });

// Virtual for conversation participants
ChatMessageSchema.virtual('isSystemMessage').get(function () {
  return this.sender.type === 'system';
});

const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
