/**
 * Twilio Voice Service - Masked Calling
 * Enables anonymous calls between customers and drivers
 * Neither party sees the other's real phone number
 */

import twilio from 'twilio';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Delivery } from '../models/Delivery.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { Customer } from '../models/Customer.js';

// ============================================
// Types
// ============================================

export interface CallSession {
  id: string;
  deliveryId: string;
  callerType: 'customer' | 'driver';
  callerId: string;
  callerPhone: string;
  recipientType: 'customer' | 'driver';
  recipientId: string;
  recipientPhone: string;
  twilioCallSid?: string;
  status: 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy';
  duration?: number;
  createdAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
}

export interface InitiateCallResult {
  success: boolean;
  callSessionId?: string;
  twilioCallSid?: string;
  message: string;
}

// In-memory call session storage (use Redis in production)
const callSessions = new Map<string, CallSession>();

// ============================================
// Service Class
// ============================================

class TwilioVoiceService {
  private client: twilio.Twilio | null = null;
  private enabled: boolean;
  private voiceNumber: string;
  private webhookBaseUrl: string;
  private callTimeout: number;
  private recordCalls: boolean;

  constructor() {
    this.enabled = config.twilioVoice.enabled;
    this.voiceNumber = config.twilioVoice.voiceNumber;
    this.webhookBaseUrl = config.twilioVoice.webhookBaseUrl;
    this.callTimeout = config.twilioVoice.callTimeout;
    this.recordCalls = config.twilioVoice.recordCalls;

    if (this.enabled) {
      this.client = twilio(
        config.twilioVoice.accountSid,
        config.twilioVoice.authToken
      );
      logger.info('Twilio Voice service initialized');
    } else {
      logger.warn('Twilio Voice service not configured - masked calling disabled');
    }
  }

  /**
   * Check if Twilio Voice is available
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Initiate a masked call from customer to driver
   */
  async initiateCustomerToDriverCall(
    deliveryId: string,
    customerId: string
  ): Promise<InitiateCallResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        message: 'Service d\'appels masqués non disponible',
      };
    }

    try {
      // Get delivery details
      const delivery = await Delivery.findById(deliveryId);

      if (!delivery) {
        return { success: false, message: 'Livraison non trouvée' };
      }

      if (delivery.customerId?.toString() !== customerId) {
        return { success: false, message: 'Non autorisé' };
      }

      if (!delivery.driverId) {
        return { success: false, message: 'Aucun livreur assigné' };
      }

      // Get phone numbers
      const customer = await Customer.findById(customerId);
      const driver = await DeliveryDriver.findById(delivery.driverId);

      if (!customer?.phone || !driver?.phone) {
        return { success: false, message: 'Numéros de téléphone non disponibles' };
      }

      // Create call session
      const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: CallSession = {
        id: sessionId,
        deliveryId,
        callerType: 'customer',
        callerId: customerId,
        callerPhone: customer.phone,
        recipientType: 'driver',
        recipientId: driver._id.toString(),
        recipientPhone: driver.phone,
        status: 'initiating',
        createdAt: new Date(),
      };
      callSessions.set(sessionId, session);

      // Initiate call via Twilio
      const call = await this.client!.calls.create({
        to: driver.phone,
        from: this.voiceNumber,
        url: `${this.webhookBaseUrl}/api/twilio/voice/connect?sessionId=${sessionId}`,
        statusCallback: `${this.webhookBaseUrl}/api/twilio/voice/status?sessionId=${sessionId}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: this.callTimeout,
        record: this.recordCalls,
        machineDetection: 'Enable',
      });

      session.twilioCallSid = call.sid;
      session.status = 'ringing';
      callSessions.set(sessionId, session);

      logger.info(`Call initiated: ${sessionId} (${call.sid})`);

      return {
        success: true,
        callSessionId: sessionId,
        twilioCallSid: call.sid,
        message: 'Appel en cours...',
      };
    } catch (error) {
      logger.error('Error initiating customer to driver call:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'initiation de l\'appel',
      };
    }
  }

  /**
   * Initiate a masked call from driver to customer
   */
  async initiateDriverToCustomerCall(
    deliveryId: string,
    driverId: string
  ): Promise<InitiateCallResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        message: 'Service d\'appels masqués non disponible',
      };
    }

    try {
      // Get delivery details
      const delivery = await Delivery.findById(deliveryId);

      if (!delivery) {
        return { success: false, message: 'Livraison non trouvée' };
      }

      if (delivery.driverId?.toString() !== driverId) {
        return { success: false, message: 'Non autorisé' };
      }

      // Get phone numbers
      const driver = await DeliveryDriver.findById(driverId);
      const customer = await Customer.findById(delivery.customerId);

      if (!driver?.phone || !customer?.phone) {
        return { success: false, message: 'Numéros de téléphone non disponibles' };
      }

      // Create call session
      const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: CallSession = {
        id: sessionId,
        deliveryId,
        callerType: 'driver',
        callerId: driverId,
        callerPhone: driver.phone,
        recipientType: 'customer',
        recipientId: customer._id.toString(),
        recipientPhone: customer.phone,
        status: 'initiating',
        createdAt: new Date(),
      };
      callSessions.set(sessionId, session);

      // Initiate call via Twilio
      const call = await this.client!.calls.create({
        to: customer.phone,
        from: this.voiceNumber,
        url: `${this.webhookBaseUrl}/api/twilio/voice/connect?sessionId=${sessionId}`,
        statusCallback: `${this.webhookBaseUrl}/api/twilio/voice/status?sessionId=${sessionId}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: this.callTimeout,
        record: this.recordCalls,
      });

      session.twilioCallSid = call.sid;
      session.status = 'ringing';
      callSessions.set(sessionId, session);

      logger.info(`Call initiated: ${sessionId} (${call.sid})`);

      return {
        success: true,
        callSessionId: sessionId,
        twilioCallSid: call.sid,
        message: 'Appel en cours...',
      };
    } catch (error) {
      logger.error('Error initiating driver to customer call:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'initiation de l\'appel',
      };
    }
  }

  /**
   * Generate TwiML response for call connection
   * This is called by Twilio when the recipient answers
   */
  generateConnectTwiML(sessionId: string): string {
    const session = callSessions.get(sessionId);

    if (!session) {
      // Return error message
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Désolé, cette session d'appel n'existe plus.</Say>
  <Hangup/>
</Response>`;
    }

    // Determine who is being called and create appropriate message
    const callerLabel = session.callerType === 'customer' ? 'un client' : 'votre livreur';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Vous avez un appel de ${callerLabel} MenuQR concernant une livraison.</Say>
  <Dial callerId="${this.voiceNumber}" timeout="${this.callTimeout}" ${this.recordCalls ? 'record="record-from-answer-dual"' : ''}>
    <Number>${session.callerPhone}</Number>
  </Dial>
  <Say language="fr-FR">L'appel est terminé. Merci d'avoir utilisé MenuQR.</Say>
</Response>`;
  }

  /**
   * Handle call status updates from Twilio
   */
  handleStatusCallback(
    sessionId: string,
    _callSid: string,
    callStatus: string,
    callDuration?: number
  ): void {
    const session = callSessions.get(sessionId);

    if (!session) {
      logger.warn(`Status callback for unknown session: ${sessionId}`);
      return;
    }

    // Update session status
    switch (callStatus) {
      case 'initiated':
        session.status = 'initiating';
        break;
      case 'ringing':
        session.status = 'ringing';
        break;
      case 'in-progress':
      case 'answered':
        session.status = 'in-progress';
        session.answeredAt = new Date();
        break;
      case 'completed':
        session.status = 'completed';
        session.endedAt = new Date();
        session.duration = callDuration;
        break;
      case 'busy':
        session.status = 'busy';
        session.endedAt = new Date();
        break;
      case 'no-answer':
        session.status = 'no-answer';
        session.endedAt = new Date();
        break;
      case 'failed':
      case 'canceled':
        session.status = 'failed';
        session.endedAt = new Date();
        break;
    }

    callSessions.set(sessionId, session);
    logger.info(`Call ${sessionId} status updated: ${callStatus}`);

    // Clean up completed sessions after 1 hour
    if (['completed', 'failed', 'no-answer', 'busy'].includes(session.status)) {
      setTimeout(() => {
        callSessions.delete(sessionId);
      }, 3600000);
    }
  }

  /**
   * Get call session status
   */
  getCallSession(sessionId: string): CallSession | null {
    return callSessions.get(sessionId) || null;
  }

  /**
   * End an active call
   */
  async endCall(sessionId: string): Promise<boolean> {
    const session = callSessions.get(sessionId);

    if (!session || !session.twilioCallSid || !this.client) {
      return false;
    }

    try {
      await this.client.calls(session.twilioCallSid).update({ status: 'completed' });
      session.status = 'completed';
      session.endedAt = new Date();
      callSessions.set(sessionId, session);
      return true;
    } catch (error) {
      logger.error('Error ending call:', error);
      return false;
    }
  }

  /**
   * Get call history for a delivery
   */
  getDeliveryCallHistory(deliveryId: string): CallSession[] {
    const history: CallSession[] = [];
    callSessions.forEach((session) => {
      if (session.deliveryId === deliveryId) {
        history.push(session);
      }
    });
    return history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Validate Twilio webhook signature
   */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    if (!this.enabled) {return false;}

    try {
      return twilio.validateRequest(
        config.twilioVoice.authToken,
        signature,
        url,
        params
      );
    } catch (error) {
      logger.error('Error validating Twilio signature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const twilioVoiceService = new TwilioVoiceService();
export default twilioVoiceService;
