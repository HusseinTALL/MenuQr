import mongoose, { Document, Schema } from 'mongoose';

export type EmailTemplateType =
  | 'welcome'
  | 'email_verification'
  | 'password_reset'
  | 'order_confirmation'
  | 'order_ready'
  | 'order_delivered'
  | 'reservation_confirmation'
  | 'reservation_reminder'
  | 'reservation_cancelled'
  | 'review_request'
  | 'review_response'
  | 'loyalty_points_earned'
  | 'loyalty_reward_available'
  | 'campaign_notification'
  | 'subscription_welcome'
  | 'subscription_renewal_reminder'
  | 'subscription_expired'
  | 'subscription_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'invoice_created'
  | 'account_suspended'
  | 'account_reactivated'
  | 'login_notification'
  | 'account_lockout'
  | 'password_changed'
  | 'custom';

export interface IEmailTemplateVariable {
  name: string;
  description: string;
  example: string;
}

export interface IEmailTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string;
  type: EmailTemplateType;
  name: string;
  description: string;
  subject: {
    fr: string;
    en: string;
  };
  body: {
    fr: string;
    en: string;
  };
  variables: IEmailTemplateVariable[];
  isActive: boolean;
  isSystem: boolean;
  lastModifiedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  render(language: 'fr' | 'en', data: Record<string, string>): { subject: string; body: string };
}

const emailTemplateVariableSchema = new Schema<IEmailTemplateVariable>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    example: { type: String, required: true },
  },
  { _id: false }
);

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'welcome',
        'email_verification',
        'password_reset',
        'order_confirmation',
        'order_ready',
        'order_delivered',
        'reservation_confirmation',
        'reservation_reminder',
        'reservation_cancelled',
        'review_request',
        'review_response',
        'loyalty_points_earned',
        'loyalty_reward_available',
        'campaign_notification',
        'subscription_welcome',
        'subscription_renewal_reminder',
        'subscription_expired',
        'subscription_cancelled',
        'payment_received',
        'payment_failed',
        'invoice_created',
        'account_suspended',
        'account_reactivated',
        'login_notification',
        'account_lockout',
        'password_changed',
        'custom',
      ],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    subject: {
      fr: { type: String, required: true },
      en: { type: String, default: '' },
    },
    body: {
      fr: { type: String, required: true },
      en: { type: String, default: '' },
    },
    variables: [emailTemplateVariableSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get template by slug
emailTemplateSchema.statics.getBySlug = async function (slug: string) {
  return this.findOne({ slug, isActive: true });
};

// Static method to get template by type
emailTemplateSchema.statics.getByType = async function (type: EmailTemplateType) {
  return this.findOne({ type, isActive: true });
};

// Method to render template with variables
emailTemplateSchema.methods.render = function (
  language: 'fr' | 'en',
  data: Record<string, string>
): { subject: string; body: string } {
  let subject = this.subject[language] || this.subject.fr;
  let body = this.body[language] || this.body.fr;

  // Replace all variables
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  }

  return { subject, body };
};

// Default email templates
export const defaultEmailTemplates: Partial<IEmailTemplate>[] = [
  {
    slug: 'welcome',
    type: 'welcome',
    name: 'Bienvenue',
    description: 'Email envoyé lors de la création d\'un compte',
    subject: {
      fr: 'Bienvenue sur {{platformName}} !',
      en: 'Welcome to {{platformName}}!',
    },
    body: {
      fr: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{platformName}}</h1>
    </div>
    <div class="content">
      <h2>Bienvenue {{userName}} !</h2>
      <p>Nous sommes ravis de vous accueillir sur {{platformName}}.</p>
      <p>Votre compte a été créé avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de notre plateforme.</p>
      <a href="{{dashboardUrl}}" class="button">Accéder au tableau de bord</a>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter à {{supportEmail}}.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
      en: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{platformName}}</h1>
    </div>
    <div class="content">
      <h2>Welcome {{userName}}!</h2>
      <p>We are delighted to welcome you to {{platformName}}.</p>
      <p>Your account has been successfully created. You can now access all the features of our platform.</p>
      <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
      <p>If you have any questions, feel free to contact us at {{supportEmail}}.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    variables: [
      { name: 'platformName', description: 'Nom de la plateforme', example: 'MenuQR' },
      { name: 'userName', description: 'Nom de l\'utilisateur', example: 'Jean Dupont' },
      { name: 'dashboardUrl', description: 'URL du tableau de bord', example: 'https://menuqr.fr/admin' },
      { name: 'supportEmail', description: 'Email du support', example: 'support@menuqr.fr' },
      { name: 'year', description: 'Année en cours', example: '2025' },
    ],
    isActive: true,
    isSystem: true,
  },
  {
    slug: 'password-reset',
    type: 'password_reset',
    name: 'Réinitialisation de mot de passe',
    description: 'Email envoyé lors d\'une demande de réinitialisation de mot de passe',
    subject: {
      fr: 'Réinitialisation de votre mot de passe {{platformName}}',
      en: 'Reset your {{platformName}} password',
    },
    body: {
      fr: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .code { background: #e2e8f0; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 6px; letter-spacing: 4px; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    .warning { color: #ef4444; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{platformName}}</h1>
    </div>
    <div class="content">
      <h2>Réinitialisation de mot de passe</h2>
      <p>Bonjour {{userName}},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code ci-dessous :</p>
      <div class="code">{{resetCode}}</div>
      <p>Ce code expire dans {{expiryMinutes}} minutes.</p>
      <p class="warning">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
      en: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .code { background: #e2e8f0; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 6px; letter-spacing: 4px; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    .warning { color: #ef4444; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{platformName}}</h1>
    </div>
    <div class="content">
      <h2>Password Reset</h2>
      <p>Hello {{userName}},</p>
      <p>You have requested to reset your password. Use the code below:</p>
      <div class="code">{{resetCode}}</div>
      <p>This code expires in {{expiryMinutes}} minutes.</p>
      <p class="warning">If you did not request this reset, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    variables: [
      { name: 'platformName', description: 'Nom de la plateforme', example: 'MenuQR' },
      { name: 'userName', description: 'Nom de l\'utilisateur', example: 'Jean Dupont' },
      { name: 'resetCode', description: 'Code de réinitialisation', example: '123456' },
      { name: 'expiryMinutes', description: 'Durée de validité en minutes', example: '15' },
      { name: 'year', description: 'Année en cours', example: '2025' },
    ],
    isActive: true,
    isSystem: true,
  },
  {
    slug: 'order-confirmation',
    type: 'order_confirmation',
    name: 'Confirmation de commande',
    description: 'Email envoyé lors de la confirmation d\'une commande',
    subject: {
      fr: 'Commande #{{orderNumber}} confirmée - {{restaurantName}}',
      en: 'Order #{{orderNumber}} confirmed - {{restaurantName}}',
    },
    body: {
      fr: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 15px; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Commande Confirmée</h1>
    </div>
    <div class="content">
      <h2>Merci pour votre commande !</h2>
      <p>Bonjour {{customerName}},</p>
      <p>Votre commande #{{orderNumber}} chez {{restaurantName}} a été confirmée.</p>
      <div class="order-details">
        <h3>Détails de la commande</h3>
        {{orderItems}}
        <div class="total">Total: {{totalAmount}}</div>
      </div>
      <p>Temps de préparation estimé: {{estimatedTime}}</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
      en: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 15px; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmed</h1>
    </div>
    <div class="content">
      <h2>Thank you for your order!</h2>
      <p>Hello {{customerName}},</p>
      <p>Your order #{{orderNumber}} at {{restaurantName}} has been confirmed.</p>
      <div class="order-details">
        <h3>Order Details</h3>
        {{orderItems}}
        <div class="total">Total: {{totalAmount}}</div>
      </div>
      <p>Estimated preparation time: {{estimatedTime}}</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    variables: [
      { name: 'platformName', description: 'Nom de la plateforme', example: 'MenuQR' },
      { name: 'customerName', description: 'Nom du client', example: 'Jean Dupont' },
      { name: 'orderNumber', description: 'Numéro de commande', example: 'ORD-12345' },
      { name: 'restaurantName', description: 'Nom du restaurant', example: 'Le Bistrot' },
      { name: 'orderItems', description: 'Liste des articles (HTML)', example: '<div>...</div>' },
      { name: 'totalAmount', description: 'Montant total', example: '25,50 €' },
      { name: 'estimatedTime', description: 'Temps estimé', example: '20-30 minutes' },
      { name: 'year', description: 'Année en cours', example: '2025' },
    ],
    isActive: true,
    isSystem: true,
  },
  {
    slug: 'subscription-expired',
    type: 'subscription_expired',
    name: 'Abonnement expiré',
    description: 'Email envoyé lorsqu\'un abonnement expire',
    subject: {
      fr: 'Votre abonnement {{platformName}} a expiré',
      en: 'Your {{platformName}} subscription has expired',
    },
    body: {
      fr: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Abonnement Expiré</h1>
    </div>
    <div class="content">
      <h2>Votre abonnement a expiré</h2>
      <p>Bonjour {{userName}},</p>
      <p>Votre abonnement {{planName}} pour {{restaurantName}} a expiré le {{expiryDate}}.</p>
      <p>Pour continuer à utiliser toutes les fonctionnalités de {{platformName}}, veuillez renouveler votre abonnement.</p>
      <a href="{{renewalUrl}}" class="button">Renouveler maintenant</a>
      <p>Si vous avez des questions, contactez-nous à {{supportEmail}}.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
      en: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Expired</h1>
    </div>
    <div class="content">
      <h2>Your subscription has expired</h2>
      <p>Hello {{userName}},</p>
      <p>Your {{planName}} subscription for {{restaurantName}} expired on {{expiryDate}}.</p>
      <p>To continue using all features of {{platformName}}, please renew your subscription.</p>
      <a href="{{renewalUrl}}" class="button">Renew Now</a>
      <p>If you have any questions, contact us at {{supportEmail}}.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    variables: [
      { name: 'platformName', description: 'Nom de la plateforme', example: 'MenuQR' },
      { name: 'userName', description: 'Nom de l\'utilisateur', example: 'Jean Dupont' },
      { name: 'planName', description: 'Nom du plan', example: 'Pro' },
      { name: 'restaurantName', description: 'Nom du restaurant', example: 'Le Bistrot' },
      { name: 'expiryDate', description: 'Date d\'expiration', example: '15 janvier 2025' },
      { name: 'renewalUrl', description: 'URL de renouvellement', example: 'https://menuqr.fr/billing' },
      { name: 'supportEmail', description: 'Email du support', example: 'support@menuqr.fr' },
      { name: 'year', description: 'Année en cours', example: '2025' },
    ],
    isActive: true,
    isSystem: true,
  },
];

export const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);
