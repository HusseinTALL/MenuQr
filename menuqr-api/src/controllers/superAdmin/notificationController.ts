import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  Notification,
  Announcement,
  AlertRule,
  Restaurant,
  User,
  EmailTemplate,
  AuditLog,
  defaultAlertRules,
} from '../../models/index.js';

// Helper to wrap async handlers
type AsyncRequestHandler = (req: Request, res: Response, next?: (err?: unknown) => void) => Promise<unknown>;
const asyncHandler = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: (err?: unknown) => void) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to create audit logs with correct schema
async function createAuditLog(
  req: Request,
  action: 'create' | 'update' | 'delete' | 'settings_change',
  category: 'system' | 'settings',
  description: string,
  target?: { type: string; id: Types.ObjectId; name: string },
  metadata?: Record<string, unknown>
) {
  const user = (req as unknown as { user?: { userId: string; email?: string; role?: string } }).user;
  if (!user) {return;}

  await AuditLog.create({
    action,
    category,
    userId: new Types.ObjectId(user.userId),
    userName: user.email || 'Unknown',
    userEmail: user.email || 'unknown@system.local',
    userRole: user.role || 'superadmin',
    description,
    targetType: target?.type,
    targetId: target?.id,
    targetName: target?.name,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });
}

// ==================== NOTIFICATIONS ====================

// Get all notifications with filters
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    recipientType,
    startDate,
    endDate,
  } = req.query;

  const query: Record<string, unknown> = {};

  if (status) {query.status = status;}
  if (type) {query.type = type;}
  if (recipientType) {query.recipientType = recipientType;}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);}
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments(query),
  ]);

  res.json({
    notifications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// Get notification by ID
export const getNotification = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email');

  if (!notification) {
    res.status(404).json({ message: 'Notification non trouvée' });
    return;
  }

  res.json(notification);
});

// Create and send notification
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const {
    recipientType,
    recipientIds,
    title,
    message,
    type = 'info',
    channels = ['in_app'],
    priority = 'normal',
    metadata,
    scheduledAt,
  } = req.body;

  // Validate recipients
  if (recipientType === 'restaurant' && (!recipientIds || recipientIds.length === 0)) {
    res.status(400).json({ message: 'Veuillez sélectionner au moins un restaurant' });
    return;
  }

  const notification = new Notification({
    recipientType,
    recipientIds: recipientType !== 'all' ? recipientIds : undefined,
    title,
    message,
    type,
    channels,
    priority,
    metadata,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    status: scheduledAt ? 'pending' : 'sent',
    sentAt: scheduledAt ? undefined : new Date(),
    createdBy: userId,
  });

  await notification.save();

  // Log action
  await createAuditLog(
    req,
    'create',
    'system',
    `Created notification: ${title}`,
    { type: 'notification', id: notification._id, name: title },
    { recipientType, recipientCount: recipientType === 'all' ? 'all' : recipientIds?.length }
  );

  // TODO: Actually send the notification via email/SMS/push based on channels
  // This would integrate with email service, SMS service, etc.

  res.status(201).json({
    message: 'Notification créée avec succès',
    notification,
  });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);

  if (!notification) {
    res.status(404).json({ message: 'Notification non trouvée' });
    return;
  }

  res.json({ message: 'Notification supprimée avec succès' });
});

// Get notification stats
export const getNotificationStats = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalNotifications,
    pendingNotifications,
    sentNotifications,
    failedNotifications,
    byType,
    byChannel,
    recentNotifications,
  ] = await Promise.all([
    Notification.countDocuments(),
    Notification.countDocuments({ status: 'pending' }),
    Notification.countDocuments({ status: { $in: ['sent', 'delivered', 'read'] } }),
    Notification.countDocuments({ status: 'failed' }),
    Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Notification.aggregate([
      { $unwind: '$channels' },
      { $group: { _id: '$channels', count: { $sum: 1 } } },
    ]),
    Notification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'firstName lastName'),
  ]);

  res.json({
    total: totalNotifications,
    pending: pendingNotifications,
    sent: sentNotifications,
    failed: failedNotifications,
    byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    byChannel: byChannel.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    recentNotifications,
  });
});

// ==================== ANNOUNCEMENTS ====================

// Get all announcements
export const getAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    target,
  } = req.query;

  const query: Record<string, unknown> = {};

  if (status) {query.status = status;}
  if (type) {query.type = type;}
  if (target) {query.target = target;}

  const skip = (Number(page) - 1) * Number(limit);

  const [announcements, total] = await Promise.all([
    Announcement.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Announcement.countDocuments(query),
  ]);

  res.json({
    announcements,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// Get announcement by ID
export const getAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await Announcement.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email');

  if (!announcement) {
    res.status(404).json({ message: 'Annonce non trouvée' });
    return;
  }

  res.json(announcement);
});

// Create announcement
export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const {
    title,
    content,
    type = 'info',
    target = 'all',
    targetIds,
    priority = 0,
    displayLocation = ['dashboard'],
    styling,
    actionButton,
    startsAt,
    endsAt,
    dismissible = true,
  } = req.body;

  const announcement = new Announcement({
    title,
    content,
    type,
    target,
    targetIds: target === 'specific' ? targetIds : undefined,
    status: new Date(startsAt) <= new Date() ? 'active' : 'scheduled',
    priority,
    displayLocation,
    styling,
    actionButton,
    startsAt: new Date(startsAt),
    endsAt: endsAt ? new Date(endsAt) : undefined,
    dismissible,
    createdBy: userId,
  });

  await announcement.save();

  // Log action
  await createAuditLog(
    req,
    'create',
    'system',
    `Created announcement: ${title.fr || title}`,
    { type: 'announcement', id: announcement._id, name: title.fr || String(title) },
    { type, target }
  );

  res.status(201).json({
    message: 'Annonce créée avec succès',
    announcement,
  });
});

// Update announcement
export const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    res.status(404).json({ message: 'Annonce non trouvée' });
    return;
  }

  const updates = req.body;
  updates.updatedBy = userId;

  // Update status based on dates if provided
  if (updates.startsAt) {
    const startsAt = new Date(updates.startsAt);
    if (startsAt <= new Date() && announcement.status === 'scheduled') {
      updates.status = 'active';
    }
  }

  Object.assign(announcement, updates);
  await announcement.save();

  // Log action
  await createAuditLog(
    req,
    'update',
    'system',
    `Updated announcement: ${announcement.title?.fr || announcement._id}`,
    { type: 'announcement', id: announcement._id, name: String(announcement.title?.fr || announcement._id) },
    { updates: Object.keys(updates) }
  );

  res.json({
    message: 'Annonce mise à jour avec succès',
    announcement,
  });
});

// Delete announcement
export const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);

  if (!announcement) {
    res.status(404).json({ message: 'Annonce non trouvée' });
    return;
  }

  res.json({ message: 'Annonce supprimée avec succès' });
});

// Update announcement status
export const updateAnnouncementStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { status } = req.body;

  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    res.status(404).json({ message: 'Annonce non trouvée' });
    return;
  }

  announcement.status = status;
  announcement.updatedBy = new Types.ObjectId(userId);
  await announcement.save();

  res.json({
    message: 'Statut de l\'annonce mis à jour',
    announcement,
  });
});

// ==================== MASS EMAIL ====================

// Send mass email
export const sendMassEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const {
    recipientType,
    recipientIds,
    templateId,
    customSubject,
    customBody,
    scheduledAt,
  } = req.body;

  // Get recipients
  let recipients: { email: string; name: string; id: string }[] = [];

  if (recipientType === 'all_restaurants' || recipientType === 'specific_restaurants') {
    const query = recipientType === 'specific_restaurants' && recipientIds
      ? { _id: { $in: recipientIds } }
      : {};

    const restaurants = await Restaurant.find(query).populate('ownerId', 'email name');
    recipients = restaurants.map(r => ({
      email: (r.ownerId as { email?: string })?.email || r.email || '',
      name: r.name,
      id: r._id.toString(),
    }));
  } else if (recipientType === 'all_users' || recipientType === 'specific_users') {
    const query = recipientType === 'specific_users' && recipientIds
      ? { _id: { $in: recipientIds } }
      : { role: { $ne: 'superadmin' } };

    const users = await User.find(query);
    recipients = users.map(u => ({
      email: u.email,
      name: u.name,
      id: u._id.toString(),
    }));
  }

  if (recipients.length === 0) {
    res.status(400).json({ message: 'Aucun destinataire trouvé' });
    return;
  }

  // Get email template if provided
  let emailContent = { subject: customSubject, body: customBody };
  if (templateId) {
    const template = await EmailTemplate.findById(templateId);
    if (template) {
      emailContent = {
        subject: template.subject.fr,
        body: template.body.fr,
      };
    }
  }

  // Create notification record for tracking
  const notification = new Notification({
    recipientType: recipientType.includes('restaurant') ? 'restaurant' : 'user',
    recipientIds: recipients.map(r => new Types.ObjectId(r.id)),
    title: emailContent.subject,
    message: emailContent.body,
    type: 'info',
    channels: ['email'],
    priority: 'normal',
    status: scheduledAt ? 'pending' : 'sent',
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    sentAt: scheduledAt ? undefined : new Date(),
    createdBy: userId,
  });

  await notification.save();

  // Log action
  await createAuditLog(
    req,
    'create',
    'system',
    `Sent mass email to ${recipients.length} recipients`,
    { type: 'mass_email', id: notification._id, name: emailContent.subject },
    { recipientType, recipientCount: recipients.length }
  );

  // TODO: Actually send emails via email service
  // This would integrate with the email provider (SendGrid, SES, etc.)

  res.status(201).json({
    message: `Email programmé pour ${recipients.length} destinataires`,
    notification,
    recipientCount: recipients.length,
  });
});

// Get mass email history
export const getMassEmailHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [emails, total] = await Promise.all([
    Notification.find({ channels: 'email' })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments({ channels: 'email' }),
  ]);

  res.json({
    emails,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// ==================== ALERT RULES ====================

// Get all alert rules
export const getAlertRules = asyncHandler(async (_req: Request, res: Response) => {
  const alertRules = await AlertRule.find()
    .populate('emailTemplate', 'name type')
    .populate('createdBy', 'firstName lastName')
    .sort({ trigger: 1 });

  res.json(alertRules);
});

// Get alert rule by ID
export const getAlertRule = asyncHandler(async (req: Request, res: Response) => {
  const alertRule = await AlertRule.findById(req.params.id)
    .populate('emailTemplate')
    .populate('createdBy', 'firstName lastName email');

  if (!alertRule) {
    res.status(404).json({ message: 'Règle d\'alerte non trouvée' });
    return;
  }

  res.json(alertRule);
});

// Create alert rule
export const createAlertRule = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;

  const alertRule = new AlertRule({
    ...req.body,
    createdBy: userId,
  });

  await alertRule.save();

  // Log action
  await createAuditLog(
    req,
    'create',
    'settings',
    `Created alert rule: ${alertRule.name}`,
    { type: 'alert_rule', id: alertRule._id, name: alertRule.name },
    { trigger: alertRule.trigger }
  );

  res.status(201).json({
    message: 'Règle d\'alerte créée avec succès',
    alertRule,
  });
});

// Update alert rule
export const updateAlertRule = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const alertRule = await AlertRule.findById(req.params.id);

  if (!alertRule) {
    res.status(404).json({ message: 'Règle d\'alerte non trouvée' });
    return;
  }

  const updates = req.body;
  updates.updatedBy = userId;

  Object.assign(alertRule, updates);
  await alertRule.save();

  // Log action
  await createAuditLog(
    req,
    'update',
    'settings',
    `Updated alert rule: ${alertRule.name}`,
    { type: 'alert_rule', id: alertRule._id, name: alertRule.name },
    { updates: Object.keys(updates) }
  );

  res.json({
    message: 'Règle d\'alerte mise à jour',
    alertRule,
  });
});

// Delete alert rule
export const deleteAlertRule = asyncHandler(async (req: Request, res: Response) => {
  const alertRule = await AlertRule.findByIdAndDelete(req.params.id);

  if (!alertRule) {
    res.status(404).json({ message: 'Règle d\'alerte non trouvée' });
    return;
  }

  res.json({ message: 'Règle d\'alerte supprimée avec succès' });
});

// Toggle alert rule status
export const toggleAlertRule = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const alertRule = await AlertRule.findById(req.params.id);

  if (!alertRule) {
    res.status(404).json({ message: 'Règle d\'alerte non trouvée' });
    return;
  }

  alertRule.isEnabled = !alertRule.isEnabled;
  alertRule.updatedBy = new Types.ObjectId(userId);
  await alertRule.save();

  res.json({
    message: alertRule.isEnabled ? 'Règle activée' : 'Règle désactivée',
    alertRule,
  });
});

// Initialize default alert rules
export const initializeAlertRules = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const existingRules = await AlertRule.find();

  if (existingRules.length > 0) {
    res.status(400).json({
      message: 'Des règles d\'alerte existent déjà. Supprimez-les d\'abord si vous voulez réinitialiser.',
    });
    return;
  }

  const rules = defaultAlertRules.map(rule => ({
    ...rule,
    createdBy: new Types.ObjectId(userId),
  }));

  await AlertRule.insertMany(rules);

  // Log action
  await createAuditLog(
    req,
    'create',
    'settings',
    `Initialized ${rules.length} default alert rules`,
    undefined,
    { action: 'initialized_defaults', count: rules.length }
  );

  res.status(201).json({
    message: `${rules.length} règles d'alerte par défaut créées`,
    count: rules.length,
  });
});

// Get alert stats
export const getAlertStats = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalRules,
    enabledRules,
    byTrigger,
    recentTriggers,
  ] = await Promise.all([
    AlertRule.countDocuments(),
    AlertRule.countDocuments({ isEnabled: true }),
    AlertRule.aggregate([
      { $group: { _id: '$trigger', count: { $sum: 1 }, totalTriggers: { $sum: '$triggerCount' } } },
    ]),
    AlertRule.find({ lastTriggeredAt: { $exists: true } })
      .sort({ lastTriggeredAt: -1 })
      .limit(10)
      .select('name trigger lastTriggeredAt triggerCount'),
  ]);

  res.json({
    totalRules,
    enabledRules,
    disabledRules: totalRules - enabledRules,
    byTrigger,
    recentTriggers,
  });
});

// ==================== RECIPIENTS ====================

// Get available recipients for notifications
export const getRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { type, search } = req.query;

  if (type === 'restaurants') {
    const query: Record<string, unknown> = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const restaurants = await Restaurant.find(query)
      .select('name contactEmail isActive')
      .limit(50)
      .sort({ name: 1 });

    res.json(restaurants);
    return;
  }

  if (type === 'users') {
    const query: Record<string, unknown> = { role: { $ne: 'superadmin' } };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('firstName lastName email role isActive')
      .limit(50)
      .sort({ firstName: 1 });

    res.json(users);
    return;
  }

  res.status(400).json({ message: 'Type de destinataire invalide' });
});
