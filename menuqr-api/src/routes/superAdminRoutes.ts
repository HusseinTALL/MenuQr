import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/superAdmin.js';
import {
  dashboardController,
  restaurantController,
  userController,
  subscriptionController,
  settingsController,
  auditController,
  notificationController,
  reportController,
  bulkController,
  backupController,
  monitoringController,
  gdprController,
} from '../controllers/superAdmin/index.js';

const router = Router();

// All routes require authentication and super admin role
router.use(authenticate);
router.use(isSuperAdmin);

// Dashboard routes
router.get('/dashboard/stats', dashboardController.getDashboardStats);
router.get('/dashboard/activity', dashboardController.getRecentActivity);
router.get('/dashboard/charts', dashboardController.getChartData);

// Restaurant management routes
router.get('/restaurants', restaurantController.getAllRestaurants);
router.get('/restaurants/:id', restaurantController.getRestaurantById);
router.get('/restaurants/:id/orders', restaurantController.getRestaurantOrders);
router.get('/restaurants/:id/staff', restaurantController.getRestaurantStaff);
router.get('/restaurants/:id/menu', restaurantController.getRestaurantMenu);
router.put('/restaurants/:id', restaurantController.updateRestaurant);
router.put('/restaurants/:id/status', restaurantController.updateRestaurantStatus);
router.delete('/restaurants/:id', restaurantController.deleteRestaurant);
router.post('/restaurants/:id/impersonate', restaurantController.impersonateRestaurant);
router.post('/end-impersonation', restaurantController.endImpersonation);

// User management routes
router.get('/users', userController.getAllUsers);
router.get('/users/stats', userController.getUserStats);
router.get('/users/:id', userController.getUserById);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.put('/users/:id/reset-password', userController.resetUserPassword);

// Subscription Plan management routes
router.get('/subscription-plans', subscriptionController.getPlans);
router.get('/subscription-plans/:id', subscriptionController.getPlan);
router.post('/subscription-plans', subscriptionController.createPlan);
router.put('/subscription-plans/:id', subscriptionController.updatePlan);
router.delete('/subscription-plans/:id', subscriptionController.deletePlan);

// Subscription management routes
router.get('/subscriptions', subscriptionController.getSubscriptions);
router.get('/subscriptions/stats', subscriptionController.getSubscriptionStats);
router.get('/subscriptions/:id', subscriptionController.getSubscription);
router.post('/subscriptions', subscriptionController.createSubscription);
router.put('/subscriptions/:id', subscriptionController.updateSubscription);
router.post('/subscriptions/:id/extend', subscriptionController.extendSubscription);

// Invoice management routes
router.get('/invoices', subscriptionController.getInvoices);
router.get('/invoices/:id', subscriptionController.getInvoice);
router.put('/invoices/:id/status', subscriptionController.updateInvoiceStatus);

// Settings management routes
router.get('/settings', settingsController.getAllSettings);
router.get('/settings/:category', settingsController.getSettings);
router.put('/settings/:category', settingsController.updateSettings);
router.post('/settings/:category/reset', settingsController.resetSettings);

// Email templates management routes
router.get('/email-templates', settingsController.getEmailTemplates);
router.get('/email-templates/:id', settingsController.getEmailTemplate);
router.post('/email-templates', settingsController.createEmailTemplate);
router.put('/email-templates/:id', settingsController.updateEmailTemplate);
router.delete('/email-templates/:id', settingsController.deleteEmailTemplate);
router.post('/email-templates/:id/preview', settingsController.previewEmailTemplate);
router.post('/email-templates/initialize', settingsController.initializeEmailTemplates);

// SMS configuration routes
router.get('/sms/stats', settingsController.getSMSStats);
router.post('/sms/test', settingsController.testSMSConfig);
router.post('/email/test', settingsController.testEmailConfig);

// Audit logs routes
router.get('/audit-logs', auditController.getAuditLogs);
router.get('/audit-logs/stats', auditController.getAuditLogStats);
router.get('/audit-logs/:id', auditController.getAuditLogById);

// Login history routes
router.get('/login-history', auditController.getLoginHistory);
router.get('/login-history/stats', auditController.getLoginStats);
router.get('/login-history/user/:userId', auditController.getUserLoginHistory);

// System alerts routes
router.get('/alerts', auditController.getSystemAlerts);
router.get('/alerts/stats', auditController.getAlertStats);
router.get('/alerts/:id', auditController.getAlertById);
router.put('/alerts/:id/acknowledge', auditController.acknowledgeAlert);
router.put('/alerts/:id/resolve', auditController.resolveAlert);
router.delete('/alerts/:id', auditController.deleteAlert);
router.post('/alerts/test', auditController.createTestAlert);

// Anomaly detection routes
router.get('/anomaly/stats', auditController.getAnomalyStats);
router.get('/anomaly/ip/:ip', auditController.checkIPStatus);

// Notification routes
router.get('/notifications', notificationController.getNotifications);
router.get('/notifications/stats', notificationController.getNotificationStats);
router.get('/notifications/:id', notificationController.getNotification);
router.post('/notifications', notificationController.createNotification);
router.delete('/notifications/:id', notificationController.deleteNotification);

// Announcement routes
router.get('/announcements', notificationController.getAnnouncements);
router.get('/announcements/:id', notificationController.getAnnouncement);
router.post('/announcements', notificationController.createAnnouncement);
router.put('/announcements/:id', notificationController.updateAnnouncement);
router.put('/announcements/:id/status', notificationController.updateAnnouncementStatus);
router.delete('/announcements/:id', notificationController.deleteAnnouncement);

// Mass email routes
router.post('/mass-email', notificationController.sendMassEmail);
router.get('/mass-email/history', notificationController.getMassEmailHistory);

// Alert rules routes
router.get('/alert-rules', notificationController.getAlertRules);
router.get('/alert-rules/stats', notificationController.getAlertStats);
router.get('/alert-rules/:id', notificationController.getAlertRule);
router.post('/alert-rules', notificationController.createAlertRule);
router.put('/alert-rules/:id', notificationController.updateAlertRule);
router.put('/alert-rules/:id/toggle', notificationController.toggleAlertRule);
router.delete('/alert-rules/:id', notificationController.deleteAlertRule);
router.post('/alert-rules/initialize', notificationController.initializeAlertRules);

// Recipients routes (for notification/email recipient selection)
router.get('/recipients', notificationController.getRecipients);

// Report routes
router.get('/reports/types', reportController.getReportTypes);
router.get('/reports/stats', reportController.getReportStats);
router.get('/reports/restaurants', reportController.generateRestaurantReport);
router.get('/reports/users', reportController.generateUserReport);
router.get('/reports/orders', reportController.generateOrderReport);
router.get('/reports/financial', reportController.generateFinancialReport);
router.get('/reports/subscriptions', reportController.generateSubscriptionReport);
router.get('/reports/invoices', reportController.generateInvoiceReport);
router.get('/reports/usage', reportController.generateUsageReport);
router.get('/reports/audit', reportController.generateAuditReport);

// Bulk operations routes
router.post('/bulk/restaurants/status', bulkController.bulkUpdateRestaurantStatus);
router.post('/bulk/restaurants/delete', bulkController.bulkDeleteRestaurants);
router.post('/bulk/restaurants/export', bulkController.bulkExportRestaurants);
router.post('/bulk/users/status', bulkController.bulkUpdateUserStatus);
router.post('/bulk/users/delete', bulkController.bulkDeleteUsers);
router.post('/bulk/users/export', bulkController.bulkExportUsers);
router.post('/bulk/subscriptions/extend', bulkController.bulkExtendSubscriptions);
router.post('/bulk/subscriptions/cancel', bulkController.bulkCancelSubscriptions);
router.post('/bulk/customers/export', bulkController.bulkExportCustomers);
router.post('/bulk/orders/export', bulkController.bulkExportOrders);

// Backup routes
router.get('/backups', backupController.getBackups);
router.get('/backups/stats', backupController.getBackupStats);
router.get('/backups/:id', backupController.getBackupById);
router.get('/backups/:id/download', backupController.downloadBackup);
router.post('/backups/full', backupController.createFullBackup);
router.post('/backups/partial', backupController.createPartialBackup);
router.post('/backups/cleanup', backupController.cleanupOldBackups);
router.delete('/backups/:id', backupController.deleteBackup);
router.get('/export/restaurant/:restaurantId', backupController.exportRestaurantData);

// Monitoring routes
router.get('/monitoring', monitoringController.getAllMetrics);
router.get('/monitoring/system', monitoringController.getSystemMetrics);
router.get('/monitoring/database', monitoringController.getDatabaseMetrics);
router.get('/monitoring/app', monitoringController.getAppMetrics);
router.get('/monitoring/services', monitoringController.getServicesHealth);
router.get('/monitoring/health', monitoringController.getHealthCheck);
router.get('/monitoring/history', monitoringController.getMetricsHistory);

// GDPR routes
router.get('/gdpr/stats', gdprController.getGDPRStats);
router.get('/gdpr/user/:userId/export', gdprController.exportUserData);
router.get('/gdpr/user/:userId/download', gdprController.downloadUserData);
router.delete('/gdpr/user/:userId', gdprController.deleteUserData);
router.get('/gdpr/customer/:customerId/export', gdprController.exportCustomerData);
router.get('/gdpr/customer/:customerId/download', gdprController.downloadCustomerData);
router.delete('/gdpr/customer/:customerId', gdprController.deleteCustomerData);

export default router;
