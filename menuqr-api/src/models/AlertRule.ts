import mongoose, { Document, Schema, Types } from 'mongoose';

export type AlertTrigger =
  | 'subscription_expiring_7_days'
  | 'subscription_expiring_3_days'
  | 'subscription_expiring_1_day'
  | 'subscription_expired'
  | 'payment_failed'
  | 'payment_retry_failed'
  | 'account_inactive_30_days'
  | 'account_inactive_60_days'
  | 'low_sms_credits'
  | 'usage_limit_80_percent'
  | 'usage_limit_exceeded'
  | 'new_review_negative'
  | 'custom';

export interface IAlertRule extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  trigger: AlertTrigger;
  isEnabled: boolean;
  channels: ('email' | 'sms' | 'in_app' | 'push')[];
  emailTemplate?: Types.ObjectId;
  customEmailSubject?: {
    fr: string;
    en?: string;
  };
  customEmailBody?: {
    fr: string;
    en?: string;
  };
  smsTemplate?: string;
  inAppTitle?: {
    fr: string;
    en?: string;
  };
  inAppMessage?: {
    fr: string;
    en?: string;
  };
  conditions?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: string | number | boolean;
  }[];
  cooldownHours: number;
  lastTriggeredAt?: Date;
  triggerCount: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const alertRuleSchema = new Schema<IAlertRule>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    trigger: {
      type: String,
      enum: [
        'subscription_expiring_7_days',
        'subscription_expiring_3_days',
        'subscription_expiring_1_day',
        'subscription_expired',
        'payment_failed',
        'payment_retry_failed',
        'account_inactive_30_days',
        'account_inactive_60_days',
        'low_sms_credits',
        'usage_limit_80_percent',
        'usage_limit_exceeded',
        'new_review_negative',
        'custom',
      ],
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'in_app', 'push'],
      default: ['email', 'in_app'],
    }],
    emailTemplate: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate',
    },
    customEmailSubject: {
      fr: String,
      en: String,
    },
    customEmailBody: {
      fr: String,
      en: String,
    },
    smsTemplate: String,
    inAppTitle: {
      fr: String,
      en: String,
    },
    inAppMessage: {
      fr: String,
      en: String,
    },
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'],
      },
      value: Schema.Types.Mixed,
    }],
    cooldownHours: {
      type: Number,
      default: 24,
      min: 0,
    },
    lastTriggeredAt: Date,
    triggerCount: {
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
alertRuleSchema.index({ trigger: 1, isEnabled: 1 });
alertRuleSchema.index({ isEnabled: 1 });

// Default alert rules
export const defaultAlertRules: Partial<IAlertRule>[] = [
  {
    name: 'Abonnement expire dans 7 jours',
    description: 'Alerte envoyée 7 jours avant l\'expiration de l\'abonnement',
    trigger: 'subscription_expiring_7_days',
    isEnabled: true,
    channels: ['email', 'in_app'],
    inAppTitle: {
      fr: 'Votre abonnement expire bientôt',
      en: 'Your subscription is expiring soon',
    },
    inAppMessage: {
      fr: 'Votre abonnement expire dans 7 jours. Renouvelez-le pour continuer à utiliser tous les services.',
      en: 'Your subscription expires in 7 days. Renew it to continue using all services.',
    },
    cooldownHours: 168, // 7 days
  },
  {
    name: 'Abonnement expire dans 3 jours',
    description: 'Alerte envoyée 3 jours avant l\'expiration de l\'abonnement',
    trigger: 'subscription_expiring_3_days',
    isEnabled: true,
    channels: ['email', 'in_app'],
    inAppTitle: {
      fr: 'Abonnement expire dans 3 jours',
      en: 'Subscription expires in 3 days',
    },
    inAppMessage: {
      fr: 'Attention ! Votre abonnement expire dans 3 jours. Renouvelez-le maintenant.',
      en: 'Warning! Your subscription expires in 3 days. Renew it now.',
    },
    cooldownHours: 72,
  },
  {
    name: 'Abonnement expire demain',
    description: 'Alerte envoyée 1 jour avant l\'expiration de l\'abonnement',
    trigger: 'subscription_expiring_1_day',
    isEnabled: true,
    channels: ['email', 'sms', 'in_app'],
    inAppTitle: {
      fr: 'Abonnement expire demain !',
      en: 'Subscription expires tomorrow!',
    },
    inAppMessage: {
      fr: 'Urgent ! Votre abonnement expire demain. Renouvelez-le pour éviter une interruption de service.',
      en: 'Urgent! Your subscription expires tomorrow. Renew it to avoid service interruption.',
    },
    cooldownHours: 24,
  },
  {
    name: 'Abonnement expiré',
    description: 'Alerte envoyée après l\'expiration de l\'abonnement',
    trigger: 'subscription_expired',
    isEnabled: true,
    channels: ['email', 'in_app'],
    inAppTitle: {
      fr: 'Votre abonnement a expiré',
      en: 'Your subscription has expired',
    },
    inAppMessage: {
      fr: 'Votre abonnement a expiré. Renouvelez-le pour réactiver votre compte.',
      en: 'Your subscription has expired. Renew it to reactivate your account.',
    },
    cooldownHours: 72,
  },
  {
    name: 'Paiement échoué',
    description: 'Alerte envoyée lorsqu\'un paiement échoue',
    trigger: 'payment_failed',
    isEnabled: true,
    channels: ['email', 'in_app'],
    inAppTitle: {
      fr: 'Échec du paiement',
      en: 'Payment failed',
    },
    inAppMessage: {
      fr: 'Votre paiement a échoué. Veuillez mettre à jour vos informations de paiement.',
      en: 'Your payment has failed. Please update your payment information.',
    },
    cooldownHours: 24,
  },
  {
    name: 'Limite d\'utilisation à 80%',
    description: 'Alerte envoyée lorsque 80% de la limite est atteinte',
    trigger: 'usage_limit_80_percent',
    isEnabled: true,
    channels: ['in_app'],
    inAppTitle: {
      fr: 'Limite d\'utilisation bientôt atteinte',
      en: 'Usage limit almost reached',
    },
    inAppMessage: {
      fr: 'Vous avez utilisé 80% de votre limite mensuelle. Considérez une mise à niveau de votre plan.',
      en: 'You have used 80% of your monthly limit. Consider upgrading your plan.',
    },
    cooldownHours: 168,
  },
];

export const AlertRule = mongoose.model<IAlertRule>('AlertRule', alertRuleSchema);
