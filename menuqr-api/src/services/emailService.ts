/**
 * Email Service
 * Handles sending emails using various providers (SMTP, SendGrid, Mailgun, or mock)
 */

import nodemailer from 'nodemailer';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { EmailTemplate } from '../models/EmailTemplate.js';

// Email options interface
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

// Template render options
export interface TemplateRenderOptions {
  templateSlug: string;
  to: string | string[];
  language?: 'fr' | 'en';
  variables: Record<string, string>;
  replyTo?: string;
}

// Create transporter based on provider
const createTransporter = () => {
  const { provider, smtp } = config.email;

  if (provider === 'mock' || config.isDevelopment) {
    // Use ethereal for development/testing
    return null; // Will be handled specially
  }

  if (provider === 'smtp') {
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
  }

  // For SendGrid and Mailgun, we'd use their specific transport
  // For now, fall back to SMTP-style configuration
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });
};

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
export const initializeEmailService = async (): Promise<void> => {
  try {
    if (config.email.provider === 'mock') {
      logger.info('Email service initialized in mock mode');
      return;
    }

    transporter = createTransporter();
    if (transporter) {
      await transporter.verify();
      logger.info('Email service initialized successfully', { provider: config.email.provider });
    }
  } catch (error) {
    logger.error('Failed to initialize email service', { error });
    // Don't throw - allow app to continue without email
  }
};

/**
 * Send an email
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const { to, subject, html, text, replyTo, attachments } = options;

  try {
    // Mock mode - just log the email
    if (config.email.provider === 'mock' || !transporter) {
      logger.info('Email (mock mode)', {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        textLength: text?.length || 0,
        htmlLength: html.length,
      });

      // In development, also log to console for visibility
      if (config.isDevelopment) {
        console.log('\n📧 =============== EMAIL (MOCK) ===============');
        console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
        console.log(`Subject: ${subject}`);
        console.log(`From: ${config.email.fromName} <${config.email.from}>`);
        console.log('HTML Preview available in logs');
        console.log('=============================================\n');
      }

      return true;
    }

    // Send actual email
    const info = await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html,
      replyTo,
      attachments,
    });

    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email', {
      error,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
    });
    return false;
  }
};

/**
 * Send email using a template
 */
export const sendTemplateEmail = async (options: TemplateRenderOptions): Promise<boolean> => {
  const { templateSlug, to, language = 'fr', variables, replyTo } = options;

  try {
    // Get template from database
    const template = await EmailTemplate.findOne({ slug: templateSlug, isActive: true });

    if (!template) {
      logger.error('Email template not found', { templateSlug });
      return false;
    }

    // Render template with variables
    const rendered = template.render(language, {
      ...variables,
      platformName: variables.platformName || 'MenuQR',
      year: variables.year || new Date().getFullYear().toString(),
      supportEmail: variables.supportEmail || 'support@menuqr.fr',
    });

    return sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.body,
      replyTo,
    });
  } catch (error) {
    logger.error('Failed to send template email', { error, templateSlug });
    return false;
  }
};

/**
 * Send login notification email
 */
export const sendLoginNotificationEmail = async (options: {
  to: string;
  userName: string;
  loginTime: Date;
  ipAddress?: string;
  device?: {
    type?: string;
    browser?: string;
    os?: string;
  };
  location?: string;
  isNewDevice?: boolean;
  isNewIP?: boolean;
}): Promise<boolean> => {
  const { to, userName, loginTime, ipAddress, device, location, isNewDevice, isNewIP } = options;

  // Check if login notifications are enabled
  if (!config.email.loginNotification.enabled) {
    return true; // Skip silently
  }

  // Determine if we should send this notification
  const shouldNotify =
    (isNewDevice && config.email.loginNotification.notifyNewDevice) ||
    (isNewIP && config.email.loginNotification.notifyNewIP);

  if (!shouldNotify) {
    return true; // Skip silently
  }

  const formattedDate = loginTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = loginTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const deviceInfo = device
    ? `${device.browser || 'Navigateur inconnu'} sur ${device.os || 'OS inconnu'}`
    : 'Appareil inconnu';

  const alertType = isNewDevice ? 'Nouvel appareil détecté' : 'Nouvelle adresse IP détectée';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 500; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    .warning { color: #ef4444; font-size: 14px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Alerte de Connexion</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>⚠️ ${alertType}</strong>
      </div>

      <p>Bonjour ${userName},</p>
      <p>Une nouvelle connexion à votre compte MenuQR a été détectée :</p>

      <div class="details">
        <div class="detail-row">
          <span class="label">Date</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Heure</span>
          <span class="value">${formattedTime}</span>
        </div>
        <div class="detail-row">
          <span class="label">Appareil</span>
          <span class="value">${deviceInfo}</span>
        </div>
        <div class="detail-row">
          <span class="label">Adresse IP</span>
          <span class="value">${ipAddress || 'Non disponible'}</span>
        </div>
        ${location ? `
        <div class="detail-row">
          <span class="label">Localisation</span>
          <span class="value">${location}</span>
        </div>
        ` : ''}
      </div>

      <p><strong>Si c'était vous</strong>, vous pouvez ignorer cet email.</p>

      <p class="warning"><strong>Si ce n'était pas vous</strong>, nous vous recommandons de :</p>
      <ul>
        <li>Changer immédiatement votre mot de passe</li>
        <li>Activer l'authentification à deux facteurs</li>
        <li>Vérifier les sessions actives dans votre compte</li>
      </ul>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement pour protéger votre compte.</p>
      <p>&copy; ${new Date().getFullYear()} MenuQR. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `🔔 ${alertType} - MenuQR`,
    html,
  });
};

/**
 * Send account lockout notification email
 */
export const sendAccountLockoutEmail = async (options: {
  to: string;
  userName: string;
  lockoutTime: Date;
  lockDurationMinutes: number;
  ipAddress?: string;
  attemptCount: number;
}): Promise<boolean> => {
  const { to, userName, lockoutTime, lockDurationMinutes, ipAddress, attemptCount } = options;

  const formattedDate = lockoutTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = lockoutTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 500; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Compte Verrouillé</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>⚠️ Votre compte a été temporairement verrouillé</strong>
      </div>

      <p>Bonjour ${userName},</p>
      <p>Votre compte MenuQR a été verrouillé suite à ${attemptCount} tentatives de connexion échouées.</p>

      <div class="details">
        <div class="detail-row">
          <span class="label">Date du verrouillage</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Heure</span>
          <span class="value">${formattedTime}</span>
        </div>
        <div class="detail-row">
          <span class="label">Durée du verrouillage</span>
          <span class="value">${lockDurationMinutes} minutes</span>
        </div>
        ${ipAddress ? `
        <div class="detail-row">
          <span class="label">Adresse IP</span>
          <span class="value">${ipAddress}</span>
        </div>
        ` : ''}
      </div>

      <p><strong>Si c'était vous</strong>, vous pouvez réessayer après ${lockDurationMinutes} minutes.</p>

      <p><strong>Si ce n'était pas vous</strong>, quelqu'un essaie peut-être d'accéder à votre compte. Nous vous recommandons de changer votre mot de passe dès que possible.</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement pour protéger votre compte.</p>
      <p>&copy; ${new Date().getFullYear()} MenuQR. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: '🔒 Compte verrouillé - MenuQR',
    html,
  });
};

/**
 * Send password changed notification email
 */
export const sendPasswordChangedEmail = async (options: {
  to: string;
  userName: string;
  changeTime: Date;
  ipAddress?: string;
}): Promise<boolean> => {
  const { to, userName, changeTime, ipAddress } = options;

  const formattedDate = changeTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = changeTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .success-box { background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 500; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    .warning { color: #ef4444; font-size: 14px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Mot de passe modifié</h1>
    </div>
    <div class="content">
      <div class="success-box">
        <strong>Votre mot de passe a été modifié avec succès</strong>
      </div>

      <p>Bonjour ${userName},</p>
      <p>Le mot de passe de votre compte MenuQR a été modifié.</p>

      <div class="details">
        <div class="detail-row">
          <span class="label">Date</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Heure</span>
          <span class="value">${formattedTime}</span>
        </div>
        ${ipAddress ? `
        <div class="detail-row">
          <span class="label">Adresse IP</span>
          <span class="value">${ipAddress}</span>
        </div>
        ` : ''}
      </div>

      <p class="warning"><strong>Si vous n'avez pas effectué ce changement</strong>, veuillez contacter immédiatement notre support à support@menuqr.fr.</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement pour protéger votre compte.</p>
      <p>&copy; ${new Date().getFullYear()} MenuQR. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: '✅ Mot de passe modifié - MenuQR',
    html,
  });
};

export default {
  initializeEmailService,
  sendEmail,
  sendTemplateEmail,
  sendLoginNotificationEmail,
  sendAccountLockoutEmail,
  sendPasswordChangedEmail,
};
