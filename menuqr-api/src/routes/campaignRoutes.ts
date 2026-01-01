import { Router } from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  cancelCampaign,
  getCampaignStats,
} from '../controllers/campaignController.js';
import { authenticate } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../middleware/permission.js';
import { validate } from '../middleware/validate.js';
import {
  createCampaignValidator,
  updateCampaignValidator,
  campaignIdValidator,
  campaignQueryValidator,
  sendCampaignValidator,
} from '../validators/campaign.js';
import { requireFeature } from '../middleware/feature.js';
import { FEATURES } from '../config/features.js';

const router = Router();

// All routes require authentication and SMS_CAMPAIGNS feature
router.use(authenticate);
router.use(requireFeature(FEATURES.SMS_CAMPAIGNS));

// Read routes
router.get('/', hasPermission(PERMISSIONS.CAMPAIGNS_READ), validate(campaignQueryValidator), getCampaigns);
router.get('/stats', hasPermission(PERMISSIONS.CAMPAIGNS_READ), getCampaignStats);
router.get('/:id', hasPermission(PERMISSIONS.CAMPAIGNS_READ), validate(campaignIdValidator), getCampaignById);

// Create routes
router.post('/', hasPermission(PERMISSIONS.CAMPAIGNS_CREATE), validate(createCampaignValidator), createCampaign);

// Update routes
router.put('/:id', hasPermission(PERMISSIONS.CAMPAIGNS_UPDATE), validate(updateCampaignValidator), updateCampaign);

// Delete routes
router.delete('/:id', hasPermission(PERMISSIONS.CAMPAIGNS_DELETE), validate(campaignIdValidator), deleteCampaign);

// Action routes
router.post('/:id/send', hasPermission(PERMISSIONS.CAMPAIGNS_SEND), validate(sendCampaignValidator), sendCampaign);
router.post('/:id/cancel', hasPermission(PERMISSIONS.CAMPAIGNS_UPDATE), validate(campaignIdValidator), cancelCampaign);

export default router;
