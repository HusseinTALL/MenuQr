import { Router } from 'express';
import authRoutes from './authRoutes.js';
import restaurantRoutes from './restaurantRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import dishRoutes from './dishRoutes.js';
import orderRoutes from './orderRoutes.js';
import menuRoutes from './menuRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import customerAuthRoutes from './customerAuthRoutes.js';
import customerRoutes from './customerRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import { customerLoyaltyRouter, adminLoyaltyRouter } from './loyaltyRoutes.js';
import tableRoutes from './tableRoutes.js';
import { customerRouter as customerReservationRouter, adminRouter as adminReservationRouter } from './reservationRoutes.js';
import { reviewPublicRoutes, reviewCustomerRoutes, reviewAdminRoutes } from './reviewRoutes.js';
import {
  publicRouter as scheduledOrderPublicRouter,
  adminRouter as scheduledOrderAdminRouter,
  customerRouter as scheduledOrderCustomerRouter,
} from './scheduledOrderRoutes.js';
import superAdminRoutes from './superAdminRoutes.js';
import { getCaptchaConfig } from '../services/captchaService.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'MenuQR API is running',
    timestamp: new Date().toISOString(),
  });
});

// CAPTCHA configuration (for frontend)
router.get('/captcha-config', (_req, res) => {
  res.json({
    success: true,
    data: getCaptchaConfig(),
  });
});

// Admin/Staff API routes
router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/categories', categoryRoutes);
router.use('/dishes', dishRoutes);
router.use('/orders', orderRoutes);
router.use('/menu', menuRoutes);
router.use('/upload', uploadRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/loyalty', adminLoyaltyRouter);
router.use('/tables', tableRoutes);
router.use('/reservations', adminReservationRouter);
router.use('/reviews', reviewPublicRoutes);
router.use('/admin/reviews', reviewAdminRoutes);
router.use('/scheduled-orders', scheduledOrderPublicRouter); // Public routes (availability, slots)
router.use('/scheduled-orders', scheduledOrderAdminRouter); // Admin routes (settings, orders, calendar)

// Customer API routes
// Note: More specific routes must come BEFORE less specific ones
router.use('/customer/auth', customerAuthRoutes);
router.use('/customer/loyalty', customerLoyaltyRouter);
router.use('/customer/reservations', customerReservationRouter);
router.use('/customer/reviews', reviewCustomerRoutes);
router.use('/customer/scheduled-orders', scheduledOrderCustomerRouter);
router.use('/customer', customerRoutes);

// Super Admin routes
router.use('/superadmin', superAdminRoutes);

export default router;
