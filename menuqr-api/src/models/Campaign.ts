import mongoose, { Document, Schema } from 'mongoose';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled';

export interface ICampaignStats {
  totalRecipients: number;
  sent: number;
  success: number;
  failed: number;
}

export interface ICampaignRecipient {
  customerId: mongoose.Types.ObjectId;
  phone: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}

export interface ICampaign extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  message: string;
  status: CampaignStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  stats: ICampaignStats;
  recipients: ICampaignRecipient[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const campaignRecipientSchema = new Schema<ICampaignRecipient>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    sentAt: Date,
    error: String,
  },
  { _id: false }
);

const campaignSchema = new Schema<ICampaign>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [160, 'SMS message cannot exceed 160 characters'],
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'],
      default: 'draft',
    },
    scheduledAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    stats: {
      totalRecipients: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    recipients: {
      type: [campaignRecipientSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
campaignSchema.index({ restaurantId: 1, status: 1 });
campaignSchema.index({ status: 1, scheduledAt: 1 });
campaignSchema.index({ createdAt: -1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);
export default Campaign;
