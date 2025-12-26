/**
 * SMS Service for MenuQR
 * Supports multiple providers: Twilio, Orange SMS API, or mock mode for development
 */

import config from '../config/env.js';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSProvider {
  sendSMS(phone: string, message: string): Promise<SMSResult>;
}

/**
 * Mock SMS Provider for development
 * Logs SMS to console instead of sending
 */
class MockSMSProvider implements SMSProvider {
  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    console.log('\n========================================');
    console.log('📱 MOCK SMS SERVICE');
    console.log('========================================');
    console.log(`📞 To: ${phone}`);
    console.log(`📝 Message: ${message}`);
    console.log('========================================\n');

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
}

/**
 * Twilio SMS Provider
 */
class TwilioSMSProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = config.sms.twilioAccountSid || '';
    this.authToken = config.sms.twilioAuthToken || '';
    this.fromNumber = config.sms.twilioFromNumber || '';
  }

  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: this.fromNumber,
          Body: message,
        }).toString(),
      });

      const data = await response.json() as { message?: string; sid?: string };

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send SMS via Twilio',
        };
      }

      return {
        success: true,
        messageId: data.sid,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Orange SMS API Provider (for African markets)
 * Uses OAuth2 authentication
 *
 * To get credentials:
 * 1. Go to https://developer.orange.com/
 * 2. Create an account and app
 * 3. Subscribe to "SMS Burkina Faso" (or your country) API
 * 4. Get your Client ID and Client Secret
 */
class OrangeSMSProvider implements SMSProvider {
  private clientId: string;
  private clientSecret: string;
  private senderId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = config.sms.orangeClientId || '';
    this.clientSecret = config.sms.orangeClientSecret || '';
    this.senderId = config.sms.orangeSenderId || 'tel:+22600000000';
  }

  /**
   * Get OAuth2 access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 300000) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await fetch('https://api.orange.com/oauth/v3/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const data = await response.json() as {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (!response.ok || !data.access_token) {
        throw new Error(data.error_description || data.error || 'Failed to get Orange access token');
      }

      this.accessToken = data.access_token;
      // Token expires in seconds, convert to timestamp
      this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

      console.log('🔑 Orange SMS: Access token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Orange SMS: Failed to get access token:', error);
      throw error;
    }
  }

  /**
   * Format phone number for Orange API
   * Must be in format: tel:+226XXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    // Remove spaces and dashes
    let cleaned = phone.replace(/[\s-]/g, '');

    // If doesn't start with +, assume it needs country code
    if (!cleaned.startsWith('+')) {
      // If starts with 00, replace with +
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.slice(2);
      } else if (cleaned.startsWith('0')) {
        // Local number, add Burkina Faso code
        cleaned = '+226' + cleaned.slice(1);
      } else {
        cleaned = '+' + cleaned;
      }
    }

    return `tel:${cleaned}`;
  }

  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    try {
      const accessToken = await this.getAccessToken();
      const formattedPhone = this.formatPhoneNumber(phone);

      // URL encode the sender address for the endpoint
      const encodedSender = encodeURIComponent(this.senderId);
      const url = `https://api.orange.com/smsmessaging/v1/outbound/${encodedSender}/requests`;

      console.log(`📤 Orange SMS: Sending to ${formattedPhone}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outboundSMSMessageRequest: {
            address: formattedPhone,
            senderAddress: this.senderId,
            outboundSMSTextMessage: {
              message: message,
            },
          },
        }),
      });

      const data = await response.json() as {
        outboundSMSMessageRequest?: {
          resourceURL?: string;
          senderAddress?: string;
        };
        requestError?: {
          serviceException?: {
            messageId?: string;
            text?: string;
          };
          policyException?: {
            messageId?: string;
            text?: string;
          };
        };
      };

      if (!response.ok) {
        const errorMsg = data.requestError?.serviceException?.text
          || data.requestError?.policyException?.text
          || 'Failed to send SMS via Orange';
        console.error('❌ Orange SMS Error:', errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      console.log('✅ Orange SMS: Message sent successfully');
      return {
        success: true,
        messageId: data.outboundSMSMessageRequest?.resourceURL || `orange-${Date.now()}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Orange SMS Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

/**
 * SMS Service Factory
 */
class SMSService {
  private provider: SMSProvider;

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): SMSProvider {
    const providerType = config.sms.provider;

    switch (providerType) {
      case 'twilio':
        console.log('📱 SMS Provider: Twilio');
        return new TwilioSMSProvider();
      case 'orange':
        console.log('📱 SMS Provider: Orange');
        return new OrangeSMSProvider();
      case 'mock':
      default:
        console.log('📱 SMS Provider: Mock (development mode)');
        return new MockSMSProvider();
    }
  }

  /**
   * Send OTP code via SMS
   */
  async sendOTP(phone: string, code: string, restaurantName?: string): Promise<SMSResult> {
    const message = restaurantName
      ? `[${restaurantName}] Votre code de vérification est: ${code}. Ce code expire dans 5 minutes.`
      : `[MenuQR] Votre code de vérification est: ${code}. Ce code expire dans 5 minutes.`;

    return this.provider.sendSMS(phone, message);
  }

  /**
   * Send custom SMS message
   */
  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    return this.provider.sendSMS(phone, message);
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmation(phone: string, orderNumber: string, restaurantName: string): Promise<SMSResult> {
    const message = `[${restaurantName}] Votre commande #${orderNumber} a été reçue. Nous vous préviendrons quand elle sera prête.`;
    return this.provider.sendSMS(phone, message);
  }

  /**
   * Send order ready SMS
   */
  async sendOrderReady(phone: string, orderNumber: string, restaurantName: string): Promise<SMSResult> {
    const message = `[${restaurantName}] Votre commande #${orderNumber} est prête ! Vous pouvez venir la récupérer.`;
    return this.provider.sendSMS(phone, message);
  }
}

// Export singleton instance
export const smsService = new SMSService();
export default smsService;
