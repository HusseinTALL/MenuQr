/**
 * Twilio Voice Controller
 * Handles masked calling between customers and drivers
 */

import { Request, Response } from 'express';
import { twilioVoiceService } from '../services/twilioVoiceService.js';
import { logger } from '../utils/logger.js';

// ============================================
// Customer Endpoints
// ============================================

/**
 * Initiate call from customer to driver
 * POST /api/calls/customer/initiate
 */
export const customerInitiateCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = (req as any).user?.customerId;
    const { deliveryId } = req.body;

    if (!customerId) {
      res.status(401).json({
        success: false,
        message: 'Authentification client requise',
      });
      return;
    }

    if (!deliveryId) {
      res.status(400).json({
        success: false,
        message: 'ID de livraison requis',
      });
      return;
    }

    const result = await twilioVoiceService.initiateCustomerToDriverCall(
      deliveryId,
      customerId
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('Error in customerInitiateCall:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation de l\'appel',
    });
  }
};

// ============================================
// Driver Endpoints
// ============================================

/**
 * Initiate call from driver to customer
 * POST /api/calls/driver/initiate
 */
export const driverInitiateCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.driverId;
    const { deliveryId } = req.body;

    if (!driverId) {
      res.status(401).json({
        success: false,
        message: 'Authentification livreur requise',
      });
      return;
    }

    if (!deliveryId) {
      res.status(400).json({
        success: false,
        message: 'ID de livraison requis',
      });
      return;
    }

    const result = await twilioVoiceService.initiateDriverToCustomerCall(
      deliveryId,
      driverId
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('Error in driverInitiateCall:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation de l\'appel',
    });
  }
};

// ============================================
// Call Status Endpoints
// ============================================

/**
 * Get call session status
 * GET /api/calls/status/:sessionId
 */
export const getCallStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = twilioVoiceService.getCallSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session d\'appel non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        duration: session.duration,
        createdAt: session.createdAt,
        answeredAt: session.answeredAt,
        endedAt: session.endedAt,
      },
    });
  } catch (error) {
    logger.error('Error in getCallStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
    });
  }
};

/**
 * End an active call
 * POST /api/calls/end/:sessionId
 */
export const endCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const success = await twilioVoiceService.endCall(sessionId);

    if (!success) {
      res.status(400).json({
        success: false,
        message: 'Impossible de terminer l\'appel',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Appel terminé',
    });
  } catch (error) {
    logger.error('Error in endCall:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la terminaison de l\'appel',
    });
  }
};

/**
 * Get call history for a delivery
 * GET /api/calls/delivery/:deliveryId/history
 */
export const getDeliveryCallHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deliveryId } = req.params;

    const history = twilioVoiceService.getDeliveryCallHistory(deliveryId);

    res.json({
      success: true,
      data: history.map((session) => ({
        id: session.id,
        callerType: session.callerType,
        recipientType: session.recipientType,
        status: session.status,
        duration: session.duration,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
      })),
    });
  } catch (error) {
    logger.error('Error in getDeliveryCallHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
    });
  }
};

// ============================================
// Twilio Webhooks
// ============================================

/**
 * Twilio webhook for call connection
 * GET/POST /api/twilio/voice/connect
 */
export const twilioConnect = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Erreur de session. Veuillez réessayer.</Say>
  <Hangup/>
</Response>`);
      return;
    }

    const twiml = twilioVoiceService.generateConnectTwiML(sessionId);
    res.type('text/xml').send(twiml);
  } catch (error) {
    logger.error('Error in twilioConnect:', error);
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Une erreur est survenue. Veuillez réessayer.</Say>
  <Hangup/>
</Response>`);
  }
};

/**
 * Twilio webhook for call status updates
 * POST /api/twilio/voice/status
 */
export const twilioStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.query.sessionId as string;
    const { CallSid, CallStatus, CallDuration } = req.body;

    if (sessionId && CallSid) {
      twilioVoiceService.handleStatusCallback(
        sessionId,
        CallSid,
        CallStatus,
        CallDuration ? parseInt(CallDuration, 10) : undefined
      );
    }

    // Always return 200 to Twilio
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error in twilioStatus:', error);
    res.status(200).send('OK');
  }
};

/**
 * Check if masked calling is enabled
 * GET /api/calls/enabled
 */
export const isCallingEnabled = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    enabled: twilioVoiceService.isEnabled(),
  });
};
