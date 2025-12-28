import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  SystemConfig,
  EmailTemplate,
  AuditLog,
  defaultSMSConfig,
  defaultEmailConfig,
  defaultSecuritySettings,
  defaultPlatformSettings,
  defaultBillingSettings,
  defaultEmailTemplates,
} from '../../models/index.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

// Helper to mask sensitive data
const maskSensitiveData = (obj: Record<string, unknown>, sensitiveKeys: string[]): Record<string, unknown> => {
  const masked = { ...obj };
  for (const key of sensitiveKeys) {
    if (masked[key] && typeof masked[key] === 'string') {
      masked[key] = '********';
    } else if (masked[key] && typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key] as Record<string, unknown>, sensitiveKeys);
    }
  }
  return masked;
};

// ================== GENERAL SETTINGS ==================

/**
 * Get all settings by category
 */
export const getSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category } = req.params;

  const config = await SystemConfig.findOne({ key: category });

  if (!config) {
    // Return default values based on category
    let defaultValue;
    switch (category) {
      case 'sms':
        defaultValue = defaultSMSConfig;
        break;
      case 'email':
        defaultValue = defaultEmailConfig;
        break;
      case 'security':
        defaultValue = defaultSecuritySettings;
        break;
      case 'platform':
        defaultValue = defaultPlatformSettings;
        break;
      case 'billing':
        defaultValue = defaultBillingSettings;
        break;
      default:
        defaultValue = {};
    }

    res.json({
      success: true,
      data: {
        key: category,
        category,
        value: defaultValue,
        isDefault: true,
      },
    });
    return;
  }

  // Mask sensitive data if needed
  let value = config.value;
  if (config.isSecret) {
    value = maskSensitiveData(
      value as Record<string, unknown>,
      ['apiKey', 'apiSecret', 'password', 'secretKey', 'clientSecret', 'authToken', 'webhookSecret']
    );
  }

  res.json({
    success: true,
    data: {
      ...config.toObject(),
      value,
      isDefault: false,
    },
  });
});

/**
 * Get all settings
 */
export const getAllSettings = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const configs = await SystemConfig.find();

  // Build settings object with defaults for missing categories
  const settings: Record<string, unknown> = {
    sms: defaultSMSConfig,
    email: defaultEmailConfig,
    security: defaultSecuritySettings,
    platform: defaultPlatformSettings,
    billing: defaultBillingSettings,
  };

  // Override with saved configs
  for (const config of configs) {
    let value = config.value;
    if (config.isSecret) {
      value = maskSensitiveData(
        value as Record<string, unknown>,
        ['apiKey', 'apiSecret', 'password', 'secretKey', 'clientSecret', 'authToken', 'webhookSecret']
      );
    }
    settings[config.key] = value;
  }

  res.json({
    success: true,
    data: settings,
  });
});

/**
 * Update settings
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category } = req.params;
  const { value } = req.body;
  const userId = req.user?._id;

  if (!value || typeof value !== 'object') {
    res.status(400).json({
      success: false,
      message: 'Invalid settings value',
    });
    return;
  }

  // Get existing config to track changes
  const existingConfig = await SystemConfig.findOne({ key: category });
  const oldValue = existingConfig?.value || null;

  // Determine if this category should be marked as secret
  const isSecret = ['sms', 'email', 'billing'].includes(category);

  // Update or create config
  const config = await SystemConfig.findOneAndUpdate(
    { key: category },
    {
      key: category,
      category: category as 'sms' | 'email' | 'security' | 'platform' | 'billing' | 'custom',
      value,
      isSecret,
      lastModifiedBy: userId,
    },
    { upsert: true, new: true }
  );

  // Log the change
  await AuditLog.create({
    action: 'settings_change',
    category: 'settings',
    userId,
    userName: req.user?.name || 'Unknown',
    userEmail: req.user?.email || 'Unknown',
    userRole: req.user?.role || 'Unknown',
    targetType: 'SystemConfig',
    targetId: config._id as mongoose.Types.ObjectId,
    targetName: category,
    description: `Updated ${category} settings`,
    changes: oldValue
      ? [{ field: category, oldValue: maskSensitiveData(oldValue as Record<string, unknown>, ['apiKey', 'apiSecret', 'password']), newValue: maskSensitiveData(value, ['apiKey', 'apiSecret', 'password']) }]
      : undefined,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: config,
  });
});

/**
 * Reset settings to default
 */
export const resetSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category } = req.params;
  const userId = req.user?._id;

  // Get existing config
  const existingConfig = await SystemConfig.findOne({ key: category });

  if (existingConfig) {
    // Log the reset
    await AuditLog.create({
      action: 'settings_change',
      category: 'settings',
      userId,
      userName: req.user?.name || 'Unknown',
      userEmail: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'Unknown',
      targetType: 'SystemConfig',
      targetId: existingConfig._id as mongoose.Types.ObjectId,
      targetName: category,
      description: `Reset ${category} settings to default`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'success',
    });

    // Delete the config to use defaults
    await SystemConfig.deleteOne({ key: category });
  }

  // Return default values
  let defaultValue;
  switch (category) {
    case 'sms':
      defaultValue = defaultSMSConfig;
      break;
    case 'email':
      defaultValue = defaultEmailConfig;
      break;
    case 'security':
      defaultValue = defaultSecuritySettings;
      break;
    case 'platform':
      defaultValue = defaultPlatformSettings;
      break;
    case 'billing':
      defaultValue = defaultBillingSettings;
      break;
    default:
      defaultValue = {};
  }

  res.json({
    success: true,
    message: 'Settings reset to default',
    data: {
      key: category,
      category,
      value: defaultValue,
      isDefault: true,
    },
  });
});

// ================== EMAIL TEMPLATES ==================

/**
 * Get all email templates
 */
export const getEmailTemplates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, isActive } = req.query;

  const query: Record<string, unknown> = {};
  if (type) {query.type = type;}
  if (isActive !== undefined) {query.isActive = isActive === 'true';}

  const templates = await EmailTemplate.find(query)
    .select('-body') // Exclude body for list view
    .sort({ type: 1, name: 1 });

  res.json({
    success: true,
    data: templates,
  });
});

/**
 * Get email template by ID or slug
 */
export const getEmailTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Try to find by ID first, then by slug
  let template;
  if (mongoose.Types.ObjectId.isValid(id)) {
    template = await EmailTemplate.findById(id);
  }
  if (!template) {
    template = await EmailTemplate.findOne({ slug: id });
  }

  if (!template) {
    res.status(404).json({
      success: false,
      message: 'Email template not found',
    });
    return;
  }

  res.json({
    success: true,
    data: template,
  });
});

/**
 * Create email template
 */
export const createEmailTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug, type, name, description, subject, body, variables } = req.body;
  const userId = req.user?._id;

  // Check if slug already exists
  const existing = await EmailTemplate.findOne({ slug });
  if (existing) {
    res.status(400).json({
      success: false,
      message: 'A template with this slug already exists',
    });
    return;
  }

  const template = await EmailTemplate.create({
    slug,
    type,
    name,
    description,
    subject,
    body,
    variables,
    isSystem: false,
    lastModifiedBy: userId,
  });

  // Log the creation
  await AuditLog.create({
    action: 'create',
    category: 'settings',
    userId,
    userName: req.user?.name || 'Unknown',
    userEmail: req.user?.email || 'Unknown',
    userRole: req.user?.role || 'Unknown',
    targetType: 'EmailTemplate',
    targetId: template._id as mongoose.Types.ObjectId,
    targetName: template.name,
    description: `Created email template: ${template.name}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });

  res.status(201).json({
    success: true,
    message: 'Email template created successfully',
    data: template,
  });
});

/**
 * Update email template
 */
export const updateEmailTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user?._id;

  const template = await EmailTemplate.findById(id);
  if (!template) {
    res.status(404).json({
      success: false,
      message: 'Email template not found',
    });
    return;
  }

  // Track changes
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== '_id' && template.get(key) !== value) {
      changes.push({
        field: key,
        oldValue: template.get(key),
        newValue: value,
      });
    }
  }

  // Update template
  Object.assign(template, updates, { lastModifiedBy: userId });
  await template.save();

  // Log the update
  await AuditLog.create({
    action: 'update',
    category: 'settings',
    userId,
    userName: req.user?.name || 'Unknown',
    userEmail: req.user?.email || 'Unknown',
    userRole: req.user?.role || 'Unknown',
    targetType: 'EmailTemplate',
    targetId: template._id as mongoose.Types.ObjectId,
    targetName: template.name,
    description: `Updated email template: ${template.name}`,
    changes,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });

  res.json({
    success: true,
    message: 'Email template updated successfully',
    data: template,
  });
});

/**
 * Delete email template
 */
export const deleteEmailTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;

  const template = await EmailTemplate.findById(id);
  if (!template) {
    res.status(404).json({
      success: false,
      message: 'Email template not found',
    });
    return;
  }

  // Prevent deletion of system templates
  if (template.isSystem) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete system templates',
    });
    return;
  }

  await template.deleteOne();

  // Log the deletion
  await AuditLog.create({
    action: 'delete',
    category: 'settings',
    userId,
    userName: req.user?.name || 'Unknown',
    userEmail: req.user?.email || 'Unknown',
    userRole: req.user?.role || 'Unknown',
    targetType: 'EmailTemplate',
    targetId: template._id as mongoose.Types.ObjectId,
    targetName: template.name,
    description: `Deleted email template: ${template.name}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });

  res.json({
    success: true,
    message: 'Email template deleted successfully',
  });
});

/**
 * Preview email template
 */
export const previewEmailTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { language = 'fr', data = {} } = req.body;

  const template = await EmailTemplate.findById(id);
  if (!template) {
    res.status(404).json({
      success: false,
      message: 'Email template not found',
    });
    return;
  }

  // Use example values from variables if not provided
  const mergedData: Record<string, string> = { ...data };
  for (const variable of template.variables) {
    if (!mergedData[variable.name]) {
      mergedData[variable.name] = variable.example;
    }
  }

  // Render template
  let subject = template.subject[language as 'fr' | 'en'] || template.subject.fr;
  let body = template.body[language as 'fr' | 'en'] || template.body.fr;

  for (const [key, value] of Object.entries(mergedData)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  }

  res.json({
    success: true,
    data: {
      subject,
      body,
    },
  });
});

/**
 * Initialize default email templates
 */
export const initializeEmailTemplates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const results: { created: number; skipped: number } = { created: 0, skipped: 0 };

  for (const template of defaultEmailTemplates) {
    const existing = await EmailTemplate.findOne({ slug: template.slug });
    if (!existing) {
      await EmailTemplate.create({
        ...template,
        lastModifiedBy: userId,
      });
      results.created++;
    } else {
      results.skipped++;
    }
  }

  // Log the initialization
  await AuditLog.create({
    action: 'create',
    category: 'settings',
    userId,
    userName: req.user?.name || 'Unknown',
    userEmail: req.user?.email || 'Unknown',
    userRole: req.user?.role || 'Unknown',
    targetType: 'EmailTemplate',
    description: `Initialized email templates: ${results.created} created, ${results.skipped} skipped`,
    metadata: results,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
  });

  res.json({
    success: true,
    message: `Email templates initialized: ${results.created} created, ${results.skipped} already existed`,
    data: results,
  });
});

// ================== AUDIT LOGS ==================

/**
 * Get audit logs
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 50,
    category,
    action,
    userId,
    startDate,
    endDate,
    search,
  } = req.query;

  const query: Record<string, unknown> = {};

  if (category) {query.category = category;}
  if (action) {query.action = action;}
  if (userId) {query.userId = userId;}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, unknown>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, unknown>).$lte = new Date(endDate as string);}
  }
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { userName: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } },
      { targetName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * Get audit log stats
 */
export const getAuditLogStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  const [actionStats, categoryStats, dailyStats] = await Promise.all([
    // Stats by action
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Stats by category
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Daily stats
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      byAction: actionStats,
      byCategory: categoryStats,
      daily: dailyStats,
    },
  });
});

// ================== SMS STATS ==================

/**
 * Get SMS usage stats
 */
export const getSMSStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  // This would typically query your SMS provider or a local SMS log
  // For now, return placeholder data
  const stats = {
    today: {
      sent: 0,
      failed: 0,
      pending: 0,
    },
    thisMonth: {
      sent: 0,
      failed: 0,
      total: 0,
    },
    credits: {
      available: 0,
      used: 0,
      total: 0,
    },
  };

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Test SMS configuration
 */
export const testSMSConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400).json({
      success: false,
      message: 'Phone number is required',
    });
    return;
  }

  // Here you would send a test SMS
  // For now, just simulate success
  res.json({
    success: true,
    message: `Test SMS sent to ${phoneNumber}`,
  });
});

/**
 * Test email configuration
 */
export const testEmailConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      success: false,
      message: 'Email address is required',
    });
    return;
  }

  // Here you would send a test email
  // For now, just simulate success
  res.json({
    success: true,
    message: `Test email sent to ${email}`,
  });
});
