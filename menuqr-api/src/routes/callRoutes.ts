/**
 * Call Routes - Masked Calling via Twilio
 */

import { Router } from 'express';
import {
  customerInitiateCall,
  driverInitiateCall,
  getCallStatus,
  endCall,
  getDeliveryCallHistory,
  twilioConnect,
  twilioStatus,
  isCallingEnabled,
} from '../controllers/twilioVoiceController.js';
import { authenticateCustomer } from '../middleware/customerAuth.js';
import { authenticateDriver } from '../middleware/auth.js';

const router = Router();

// ============================================
// Public Endpoints
// ============================================

// Check if calling is enabled
router.get('/enabled', isCallingEnabled);

// ============================================
// Customer Endpoints (requires customer auth)
// ============================================

// Initiate call to driver
router.post('/customer/initiate', authenticateCustomer, customerInitiateCall);

// ============================================
// Driver Endpoints (requires driver auth)
// ============================================

// Initiate call to customer
router.post('/driver/initiate', authenticateDriver, driverInitiateCall);

// ============================================
// Call Management (authenticated users)
// ============================================

// Get call status
router.get('/status/:sessionId', getCallStatus);

// End active call
router.post('/end/:sessionId', endCall);

// Get call history for delivery
router.get('/delivery/:deliveryId/history', getDeliveryCallHistory);

// ============================================
// Twilio Webhooks (no auth - validated by signature)
// ============================================

// Connection webhook
router.get('/twilio/voice/connect', twilioConnect);
router.post('/twilio/voice/connect', twilioConnect);

// Status callback webhook
router.post('/twilio/voice/status', twilioStatus);

export default router;
