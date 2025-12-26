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
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCampaignValidator,
  updateCampaignValidator,
  campaignIdValidator,
  campaignQueryValidator,
  sendCampaignValidator,
} from '../validators/campaign.js';

const router = Router();

// All routes require owner/admin authentication
router.use(authenticate, authorize('owner', 'admin'));

// CRUD routes
router.post('/', validate(createCampaignValidator), createCampaign);
router.get('/', validate(campaignQueryValidator), getCampaigns);
router.get('/stats', getCampaignStats); // Aggregate stats - must be before /:id
router.get('/:id', validate(campaignIdValidator), getCampaignById);
router.put('/:id', validate(updateCampaignValidator), updateCampaign);
router.delete('/:id', validate(campaignIdValidator), deleteCampaign);

// Action routes
router.post('/:id/send', validate(sendCampaignValidator), sendCampaign);
router.post('/:id/cancel', validate(campaignIdValidator), cancelCampaign);

export default router;
