import mongoose, { Document, Schema, Types } from 'mongoose';

export type AnnouncementType = 'info' | 'warning' | 'maintenance' | 'feature' | 'promotion';

export type AnnouncementTarget = 'all' | 'restaurants' | 'customers' | 'specific';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'cancelled';

export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  title: {
    fr: string;
    en?: string;
  };
  content: {
    fr: string;
    en?: string;
  };
  type: AnnouncementType;
  target: AnnouncementTarget;
  targetIds?: Types.ObjectId[];
  status: AnnouncementStatus;
  priority: number;
  displayLocation: ('dashboard' | 'banner' | 'modal' | 'sidebar')[];
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    iconName?: string;
  };
  actionButton?: {
    label: {
      fr: string;
      en?: string;
    };
    url: string;
    openInNewTab: boolean;
  };
  startsAt: Date;
  endsAt?: Date;
  dismissible: boolean;
  dismissedBy: Types.ObjectId[];
  viewCount: number;
  clickCount: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      fr: { type: String, required: true, maxlength: 200 },
      en: { type: String, maxlength: 200 },
    },
    content: {
      fr: { type: String, required: true, maxlength: 5000 },
      en: { type: String, maxlength: 5000 },
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'maintenance', 'feature', 'promotion'],
      default: 'info',
    },
    target: {
      type: String,
      enum: ['all', 'restaurants', 'customers', 'specific'],
      default: 'all',
    },
    targetIds: [{
      type: Schema.Types.ObjectId,
    }],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'expired', 'cancelled'],
      default: 'draft',
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    displayLocation: [{
      type: String,
      enum: ['dashboard', 'banner', 'modal', 'sidebar'],
      default: ['dashboard'],
    }],
    styling: {
      backgroundColor: String,
      textColor: String,
      iconName: String,
    },
    actionButton: {
      label: {
        fr: String,
        en: String,
      },
      url: String,
      openInNewTab: { type: Boolean, default: false },
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: Date,
    dismissible: {
      type: Boolean,
      default: true,
    },
    dismissedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    viewCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
announcementSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
announcementSchema.index({ target: 1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ priority: -1 });
announcementSchema.index({ createdAt: -1 });

// Virtual for checking if announcement is currently active
announcementSchema.virtual('isCurrentlyActive').get(function () {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.startsAt <= now &&
    (!this.endsAt || this.endsAt > now)
  );
});

export const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);
