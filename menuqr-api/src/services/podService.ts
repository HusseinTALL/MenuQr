import mongoose from 'mongoose';
import { Delivery } from '../models/Delivery.js';
import { Order } from '../models/Order.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { Customer } from '../models/Customer.js';
import * as socketService from './socketService.js';
import smsService from './smsService.js';

// Types
interface PODResult {
  success: boolean;
  message: string;
  deliveryId?: mongoose.Types.ObjectId;
  completedAt?: Date;
}

interface PODRequirements {
  photoRequired: boolean;
  signatureRequired: boolean;
  otpRequired: boolean;
  customerConfirmRequired: boolean;
}

interface OTPData {
  code: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

// In-memory OTP storage (would be Redis in production)
const otpStore = new Map<string, OTPData>();

// Constants
const OTP_LENGTH = 4;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;
const HIGH_VALUE_ORDER_THRESHOLD = 50; // Orders above €50 require OTP

/**
 * Generate a random OTP code
 */
function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Get POD requirements for a delivery
 */
export async function getPODRequirements(
  deliveryId: mongoose.Types.ObjectId
): Promise<PODRequirements> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    throw new Error('Delivery not found');
  }

  const order = await Order.findById(delivery.orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // Default requirements
  const requirements: PODRequirements = {
    photoRequired: false,
    signatureRequired: false,
    otpRequired: false,
    customerConfirmRequired: true, // Always allow customer confirmation
  };

  // Check contactless delivery
  if (order.deliveryInstructions?.toLowerCase().includes('contactless') ||
      order.deliveryInstructions?.toLowerCase().includes('sans contact')) {
    requirements.photoRequired = true;
  }

  // Check high-value order
  if (order.total >= HIGH_VALUE_ORDER_THRESHOLD) {
    requirements.otpRequired = true;
  }

  // Check for age-restricted items (alcohol, etc.)
  // This would require checking order items for age restrictions
  // requirements.signatureRequired = hasAgeRestrictedItems(order);

  // Restaurant-specific settings could override these
  // const restaurant = await Restaurant.findById(delivery.restaurantId);
  // if (restaurant?.podSettings) { ... }

  return requirements;
}

/**
 * Generate and send OTP to customer
 */
export async function generateDeliveryOTP(
  deliveryId: mongoose.Types.ObjectId
): Promise<{ success: boolean; message: string }> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  const order = await Order.findById(delivery.orderId);
  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  // Get customer phone
  let customerPhone: string | undefined;

  if (order.customerId) {
    const customer = await Customer.findById(order.customerId);
    customerPhone = customer?.phone;
  } else if (order.customerPhone) {
    customerPhone = order.customerPhone;
  }

  if (!customerPhone) {
    return { success: false, message: 'Customer phone not found' };
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP
  otpStore.set(deliveryId.toString(), {
    code: otp,
    expiresAt,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
  });

  // Send SMS
  try {
    await smsService.sendSMS(
      customerPhone,
      `Votre code de livraison MenuQR est: ${otp}. Donnez ce code au livreur. Valide ${OTP_EXPIRY_MINUTES} minutes.`
    );
  } catch (error) {
    console.error('Failed to send OTP SMS:', error);
    // Continue anyway - OTP can be shown in app
  }

  // Also notify via socket if customer is connected
  if (order.customerId) {
    socketService.emitUserNotification(order.customerId.toString(), {
      type: 'delivery:otp',
      title: 'Delivery Code',
      message: `Your delivery code is: ${otp}`,
      data: {
        deliveryId: delivery._id,
        expiresAt,
      },
    });
  }

  return { success: true, message: 'OTP sent to customer' };
}

/**
 * Verify OTP for delivery
 */
export async function verifyDeliveryOTP(
  deliveryId: mongoose.Types.ObjectId,
  code: string
): Promise<{ success: boolean; message: string }> {
  const otpData = otpStore.get(deliveryId.toString());

  if (!otpData) {
    return { success: false, message: 'OTP not found or expired' };
  }

  // Check expiry
  if (new Date() > otpData.expiresAt) {
    otpStore.delete(deliveryId.toString());
    return { success: false, message: 'OTP expired' };
  }

  // Check attempts
  if (otpData.attempts >= otpData.maxAttempts) {
    otpStore.delete(deliveryId.toString());
    return { success: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  // Verify code
  if (otpData.code !== code) {
    otpData.attempts++;
    return {
      success: false,
      message: `Invalid OTP. ${otpData.maxAttempts - otpData.attempts} attempts remaining.`,
    };
  }

  // OTP verified - clean up
  otpStore.delete(deliveryId.toString());

  // Update delivery
  await Delivery.findByIdAndUpdate(deliveryId, {
    'pod.otpVerified': true,
    'pod.otpVerifiedAt': new Date(),
  });

  return { success: true, message: 'OTP verified successfully' };
}

/**
 * Submit photo proof of delivery
 */
export async function submitPhotoProof(
  deliveryId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  photoUrl: string,
  gpsCoordinates?: { lat: number; lng: number }
): Promise<PODResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  if (delivery.driverId?.toString() !== driverId.toString()) {
    return { success: false, message: 'Not authorized for this delivery' };
  }

  // Update delivery with photo proof
  delivery.pod = {
    ...delivery.pod,
    type: 'photo',
    photoUrl,
    gpsCoordinates,
    completedAt: new Date(),
  };

  await delivery.save();

  return {
    success: true,
    message: 'Photo proof submitted',
    deliveryId: delivery._id,
  };
}

/**
 * Submit signature proof of delivery
 */
export async function submitSignatureProof(
  deliveryId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  signatureData: string, // Base64 encoded signature image
  signerName: string
): Promise<PODResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  if (delivery.driverId?.toString() !== driverId.toString()) {
    return { success: false, message: 'Not authorized for this delivery' };
  }

  // In production, upload signature to S3 and store URL
  const signatureUrl = signatureData; // Placeholder

  delivery.pod = {
    ...delivery.pod,
    type: 'signature',
    signatureUrl,
    recipientName: signerName,
    completedAt: new Date(),
  };

  await delivery.save();

  return {
    success: true,
    message: 'Signature proof submitted',
    deliveryId: delivery._id,
  };
}

/**
 * Customer confirms delivery received
 */
export async function customerConfirmDelivery(
  deliveryId: mongoose.Types.ObjectId,
  customerId: mongoose.Types.ObjectId
): Promise<PODResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  const order = await Order.findById(delivery.orderId);
  if (!order || order.customerId?.toString() !== customerId.toString()) {
    return { success: false, message: 'Not authorized for this delivery' };
  }

  delivery.pod = {
    ...delivery.pod,
    type: 'customer_confirm',
    customerConfirmedAt: new Date(),
    completedAt: new Date(),
  };

  await delivery.save();

  return {
    success: true,
    message: 'Delivery confirmed by customer',
    deliveryId: delivery._id,
    completedAt: delivery.pod.completedAt,
  };
}

/**
 * Complete delivery with all POD checks
 */
export async function completeDeliveryWithPOD(
  deliveryId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  podData: {
    photoUrl?: string;
    signatureUrl?: string;
    otpCode?: string;
    deliveryNotes?: string;
    gpsCoordinates?: { lat: number; lng: number };
  }
): Promise<PODResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  if (delivery.driverId?.toString() !== driverId.toString()) {
    return { success: false, message: 'Not authorized for this delivery' };
  }

  if (delivery.status !== 'arrived' && delivery.status !== 'in_transit') {
    return { success: false, message: 'Delivery is not ready for completion' };
  }

  // Get requirements
  const requirements = await getPODRequirements(deliveryId);

  // Verify OTP if required
  if (requirements.otpRequired && podData.otpCode) {
    const otpResult = await verifyDeliveryOTP(deliveryId, podData.otpCode);
    if (!otpResult.success) {
      return otpResult;
    }
  } else if (requirements.otpRequired && !delivery.pod?.otpVerified) {
    return { success: false, message: 'OTP verification required' };
  }

  // Check photo if required
  if (requirements.photoRequired && !podData.photoUrl && !delivery.pod?.photoUrl) {
    return { success: false, message: 'Photo proof required' };
  }

  // Check signature if required
  if (requirements.signatureRequired && !podData.signatureUrl && !delivery.pod?.signatureUrl) {
    return { success: false, message: 'Signature required' };
  }

  // Update POD
  const now = new Date();
  delivery.pod = {
    type: podData.photoUrl ? 'photo' : (podData.signatureUrl ? 'signature' : 'gps'),
    photoUrl: podData.photoUrl || delivery.pod?.photoUrl,
    signatureUrl: podData.signatureUrl || delivery.pod?.signatureUrl,
    otpVerified: delivery.pod?.otpVerified || false,
    deliveryNotes: podData.deliveryNotes,
    gpsCoordinates: podData.gpsCoordinates,
    completedAt: now,
  };

  // Update delivery status
  delivery.status = 'delivered';
  delivery.actualDeliveryTime = now;

  await delivery.save();

  // Update order
  await Order.findByIdAndUpdate(delivery.orderId, {
    status: 'delivered',
    deliveryStatus: 'delivered',
    deliveredAt: now,
  });

  // Update driver
  const driver = await DeliveryDriver.findById(driverId);
  if (driver) {
    driver.currentDeliveryId = undefined;
    driver.isAvailable = true;
    driver.shiftStatus = 'online';

    // Update stats
    if (driver.stats) {
      driver.stats.totalDeliveries = (driver.stats.totalDeliveries || 0) + 1;
      driver.stats.completedDeliveries = (driver.stats.completedDeliveries || 0) + 1;
    }

    // Add to balance
    if (delivery.earnings?.total) {
      driver.currentBalance = (driver.currentBalance || 0) + delivery.earnings.total;
      driver.lifetimeEarnings = (driver.lifetimeEarnings || 0) + delivery.earnings.total;
    }

    await driver.save();
  }

  // Notify customer
  const order = await Order.findById(delivery.orderId);
  if (order?.customerId) {
    socketService.emitUserNotification(order.customerId.toString(), {
      type: 'delivery:completed',
      title: 'Order Delivered',
      message: 'Your order has been delivered!',
      data: {
        deliveryId: delivery._id,
        orderId: order._id,
        completedAt: now,
        pod: {
          hasPhoto: !!delivery.pod.photoUrl,
          hasSignature: !!delivery.pod.signatureUrl,
        },
      },
    });
  }

  return {
    success: true,
    message: 'Delivery completed successfully',
    deliveryId: delivery._id,
    completedAt: now,
  };
}

/**
 * Get POD details for a delivery
 */
export async function getPODDetails(
  deliveryId: mongoose.Types.ObjectId
): Promise<{
  requirements: PODRequirements;
  submitted: {
    hasPhoto: boolean;
    hasSignature: boolean;
    hasOTP: boolean;
    hasCustomerConfirm: boolean;
  };
  completedAt?: Date;
  photoUrl?: string;
  signatureUrl?: string;
  deliveryNotes?: string;
} | null> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) return null;

  const requirements = await getPODRequirements(deliveryId);

  return {
    requirements,
    submitted: {
      hasPhoto: !!delivery.pod?.photoUrl,
      hasSignature: !!delivery.pod?.signatureUrl,
      hasOTP: !!delivery.pod?.otpVerified,
      hasCustomerConfirm: !!delivery.pod?.customerConfirmedAt,
    },
    completedAt: delivery.pod?.completedAt,
    photoUrl: delivery.pod?.photoUrl,
    signatureUrl: delivery.pod?.signatureUrl,
    deliveryNotes: delivery.pod?.deliveryNotes,
  };
}

/**
 * Report delivery issue
 */
export async function reportDeliveryIssue(
  deliveryId: mongoose.Types.ObjectId,
  _reporterId: mongoose.Types.ObjectId,
  reporterType: 'driver' | 'customer' | 'restaurant' | 'system',
  issueType: 'wrong_address' | 'customer_unavailable' | 'order_damaged' | 'other',
  description: string,
  photoUrls?: string[]
): Promise<{ success: boolean; message: string }> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  // Add issue to delivery
  delivery.issues.push({
    type: issueType,
    description,
    reportedBy: reporterType,
    reportedAt: new Date(),
    photos: photoUrls,
  });

  await delivery.save();

  // Notify restaurant admin/support
  if (delivery.restaurantId) {
    socketService.emitNotification(delivery.restaurantId.toString(), {
      type: 'delivery:issue',
      title: 'Delivery Issue',
      message: `Issue reported: ${issueType}`,
      data: {
        deliveryId: delivery._id,
        orderId: delivery.orderId,
        issueType,
        description,
        reporterType,
        urgent: issueType === 'order_damaged',
      },
    });
  }

  return { success: true, message: 'Issue reported successfully' };
}

export default {
  getPODRequirements,
  generateDeliveryOTP,
  verifyDeliveryOTP,
  submitPhotoProof,
  submitSignatureProof,
  customerConfirmDelivery,
  completeDeliveryWithPOD,
  getPODDetails,
  reportDeliveryIssue,
};
