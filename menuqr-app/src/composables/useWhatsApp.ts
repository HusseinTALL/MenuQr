import { computed, ref } from 'vue';
import { useCartStore } from '@/stores/cartStore';
import { useMenuStore } from '@/stores/menuStore';
import { useConfigStore } from '@/stores/configStore';
import { formatPrice as formatPriceUtil, formatPhoneForWhatsApp, getLocalizedString } from '@/utils/formatters';
import api from '@/services/api';
import type { GeolocationPosition } from './useGeolocation';

/**
 * Order sending result
 */
export interface SendOrderResult {
  success: boolean;
  orderNumber: string | null;
  error: string | null;
  method: 'whatsapp_app' | 'whatsapp_web' | 'copied' | 'failed';
}

/**
 * WhatsApp availability check result
 */
export interface WhatsAppAvailability {
  isAvailable: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  preferredMethod: 'app' | 'web';
}

/**
 * Composable for WhatsApp integration
 * Handles order formatting and sending via WhatsApp
 */
export function useWhatsApp() {
  const cartStore = useCartStore();
  const menuStore = useMenuStore();
  const configStore = useConfigStore();

  // Helper to format prices with restaurant currency
  const formatPrice = (amount: number): string => {
    const currency = menuStore.restaurant?.currency || 'XOF';
    return formatPriceUtil(amount, currency);
  };

  // Track last order number
  const lastOrderNumber = ref<string | null>(null);
  const isSending = ref(false);

  // Customer location for delivery
  const customerLocation = ref<GeolocationPosition | null>(null);

  /**
   * Generate unique order number
   */
  const generateOrderNumber = (): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.getTime().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CMD-${dateStr}-${timeStr}${random}`;
  };

  /**
   * Calculate estimated preparation time
   */
  const estimatedTime = computed(() => {
    let maxTime = 0;
    for (const item of cartStore.items) {
      const itemTime = (item.dish.estimatedTime || 10) * item.quantity;
      if (itemTime > maxTime) {
        maxTime = itemTime;
      }
    }
    return Math.ceil(maxTime + 5);
  });

  /**
   * Check WhatsApp availability and device type
   */
  const checkWhatsAppAvailability = (): WhatsAppAvailability => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);

    return {
      isAvailable: true, // WhatsApp web is always available as fallback
      isMobile,
      isIOS,
      isAndroid,
      preferredMethod: isMobile ? 'app' : 'web',
    };
  };

  /**
   * Format order message for WhatsApp
   */
  const formatOrderMessage = computed(() => {
    const locale = configStore.locale;
    const lines: string[] = [];
    const restaurantName = menuStore.restaurant?.name || 'Restaurant';
    const now = new Date();
    const dateStr = now.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Determine if this is a scheduled order
    const isScheduled = cartStore.orderType === 'scheduled';
    const fulfillmentType = cartStore.fulfillmentType;

    // Header with order type
    if (isScheduled) {
      if (locale === 'fr') {
        lines.push('📅 *COMMANDE PLANIFIÉE*');
      } else {
        lines.push('📅 *SCHEDULED ORDER*');
      }
    } else {
      if (locale === 'fr') {
        lines.push('🍽️ *NOUVELLE COMMANDE*');
      } else {
        lines.push('🍽️ *NEW ORDER*');
      }
    }
    lines.push(`📍 ${restaurantName}`);
    lines.push(`📅 ${dateStr}`);

    // Order type info
    if (isScheduled) {
      // Fulfillment type
      const fulfillmentLabels = {
        pickup: { fr: '🛒 Retrait sur place', en: '🛒 Pickup' },
        delivery: { fr: '🚗 Livraison', en: '🚗 Delivery' },
        dine_in: { fr: '🪑 Sur place', en: '🪑 Dine-in' },
      };
      lines.push(fulfillmentLabels[fulfillmentType]?.[locale] || fulfillmentLabels[fulfillmentType]?.fr || '');

      // Scheduled date and time
      if (cartStore.scheduledDate && cartStore.scheduledTime) {
        const scheduledDateObj = new Date(`${cartStore.scheduledDate}T${cartStore.scheduledTime}`);
        const scheduledStr = scheduledDateObj.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        lines.push('');
        if (locale === 'fr') {
          lines.push(`⏰ *Prévu pour:*`);
          lines.push(`${scheduledStr} à ${cartStore.scheduledTime}`);
        } else {
          lines.push(`⏰ *Scheduled for:*`);
          lines.push(`${scheduledStr} at ${cartStore.scheduledTime}`);
        }
      }

      // Delivery address
      if (fulfillmentType === 'delivery' && cartStore.deliveryAddress) {
        const addr = cartStore.deliveryAddress;
        lines.push('');
        if (locale === 'fr') {
          lines.push(`🏠 *Adresse de livraison:*`);
        } else {
          lines.push(`🏠 *Delivery address:*`);
        }
        lines.push(addr.street);
        if (addr.apartment) {
          lines.push(addr.apartment);
        }
        lines.push(`${addr.postalCode ? addr.postalCode + ' ' : ''}${addr.city}`);
        if (addr.instructions) {
          lines.push(`📝 _${addr.instructions}_`);
        }
        // Add coordinates link if available
        if (addr.coordinates) {
          const mapsLink = `https://maps.google.com/maps?q=${addr.coordinates.latitude},${addr.coordinates.longitude}`;
          lines.push(mapsLink);
        }
      }
    } else {
      // Immediate order - show table or takeaway
      if (cartStore.tableNumber) {
        lines.push(`🪑 Table ${cartStore.tableNumber}`);
      } else {
        lines.push(locale === 'fr' ? '🛍️ À emporter' : '🛍️ Takeaway');
      }

      // Add customer location if available (for immediate orders)
      if (customerLocation.value) {
        const mapsLink = `https://maps.google.com/maps?q=${customerLocation.value.latitude},${customerLocation.value.longitude}`;
        lines.push('');
        if (locale === 'fr') {
          lines.push(`📍 *Ma position:*`);
        } else {
          lines.push(`📍 *My location:*`);
        }
        lines.push(mapsLink);
      }
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');

    // Items
    cartStore.items.forEach((item, index) => {
      const dishName = getLocalizedString(item.dish.name, locale);
      lines.push('');
      lines.push(`*${index + 1}. ${item.quantity}x ${dishName}*`);

      // Options
      if (item.selectedOptions.length > 0) {
        item.selectedOptions.forEach((opt) => {
          const choiceNames = opt.choices.map((c) => getLocalizedString(c.name, locale)).join(', ');
          if (opt.priceModifier > 0) {
            lines.push(
              `   ↳ ${opt.optionName}: ${choiceNames} (+${formatPrice(opt.priceModifier)})`
            );
          } else {
            lines.push(`   ↳ ${opt.optionName}: ${choiceNames}`);
          }
        });
      }

      // Item notes
      if (item.notes) {
        lines.push(`   📝 _${item.notes}_`);
      }

      lines.push(`   💰 ${formatPrice(item.totalPrice)}`);
    });

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    // Total and estimated time
    lines.push(`*TOTAL: ${formatPrice(cartStore.subtotal)}*`);

    // Only show estimated time for immediate orders
    if (!isScheduled) {
      lines.push(
        `⏱️ ${locale === 'fr' ? 'Temps estimé' : 'Estimated time'}: ~${estimatedTime.value} min`
      );
    }

    // Global order notes
    if (cartStore.notes) {
      lines.push('');
      lines.push(`📝 *${locale === 'fr' ? 'Notes' : 'Notes'}:*`);
      lines.push(`_${cartStore.notes}_`);
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    // Footer
    if (locale === 'fr') {
      lines.push('Merci pour votre commande ! 🙏');
      lines.push('_Envoyé via MenuQR_');
    } else {
      lines.push('Thank you for your order! 🙏');
      lines.push('_Sent via MenuQR_');
    }

    return lines.join('\n');
  });

  /**
   * Get WhatsApp URL - uses wa.me universal link
   */
  const getWhatsAppUrl = (message: string): string => {
    const phone = formatPhoneForWhatsApp(menuStore.restaurant?.whatsappNumber || '');
    const encodedMessage = encodeURIComponent(message);

    // Use wa.me universal link - works on all platforms
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  };

  /**
   * WhatsApp URL with pre-filled message (computed for reactivity)
   */
  const whatsappUrl = computed(() => {
    return getWhatsAppUrl(formatOrderMessage.value);
  });

  /**
   * Copy order to clipboard
   */
  const copyOrderToClipboard = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(formatOrderMessage.value);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = formatOrderMessage.value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch {
        document.body.removeChild(textarea);
        return false;
      }
    }
  };

  /**
   * Set customer location for the order
   */
  const setCustomerLocation = (location: GeolocationPosition | null) => {
    customerLocation.value = location;
  };

  /**
   * Clear customer location
   */
  const clearCustomerLocation = () => {
    customerLocation.value = null;
  };

  /**
   * Send order via WhatsApp and save to database
   * @param location - Optional customer location to include in the message
   */
  const sendOrder = async (location?: GeolocationPosition | null): Promise<SendOrderResult> => {
    if (cartStore.isEmpty) {
      return {
        success: false,
        orderNumber: null,
        error: 'cart_empty',
        method: 'failed',
      };
    }

    // Set location if provided
    if (location !== undefined) {
      customerLocation.value = location;
    }

    isSending.value = true;

    try {
      // Build order data for database
      const orderItems = cartStore.items.map((item) => ({
        dishId: item.dish.id,
        quantity: item.quantity,
        options: item.selectedOptions.flatMap((opt) =>
          opt.choices.map((choice) => ({
            name: typeof choice.name === 'string' ? choice.name : choice.name.fr || choice.name.en || '',
            price: choice.priceModifier || 0,
          }))
        ),
        specialInstructions: item.notes || undefined,
      }));

      const restaurantId = menuStore.restaurant?.id || '';

      // Save order to database
      let orderNum = generateOrderNumber();
      try {
        // Build order data including scheduling info
        // Map fulfillment types to API expected values
        const fulfillmentTypeMap: Record<string, 'dine-in' | 'takeaway' | 'delivery'> = {
          'dine-in': 'dine-in',
          'dine_in': 'dine-in',
          'takeaway': 'takeaway',
          'delivery': 'delivery',
        };
        const orderData: Parameters<typeof api.createOrder>[0] = {
          restaurantId,
          tableNumber: cartStore.tableNumber ? String(cartStore.tableNumber) : undefined,
          items: orderItems,
          specialInstructions: cartStore.notes || undefined,
          // Scheduling fields
          orderType: cartStore.orderType,
          fulfillmentType: fulfillmentTypeMap[cartStore.fulfillmentType] || 'dine-in',
        };

        // Add scheduled date/time if scheduled
        if (cartStore.orderType === 'scheduled') {
          if (cartStore.scheduledDate) {
            orderData.scheduledDate = cartStore.scheduledDate;
          }
          if (cartStore.scheduledTime) {
            orderData.scheduledTime = cartStore.scheduledTime;
          }
        }

        // Add delivery address if delivery
        if (cartStore.fulfillmentType === 'delivery' && cartStore.deliveryAddress) {
          const addr = cartStore.deliveryAddress;
          orderData.deliveryAddress = {
            street: addr.street,
            city: addr.city,
            postalCode: addr.postalCode,
            details: addr.apartment || addr.instructions,
            coordinates: addr.coordinates ? { lat: addr.coordinates.latitude, lng: addr.coordinates.longitude } : undefined,
          };
        }

        const response = await api.createOrder(orderData);

        if (response.success && response.data) {
          orderNum = response.data.orderNumber;
        }
      } catch (dbError) {
        // Log error but continue with WhatsApp sending
        console.warn('Failed to save order to database:', dbError);
      }

      lastOrderNumber.value = orderNum;

      const url = getWhatsAppUrl(formatOrderMessage.value);
      const availability = checkWhatsAppAvailability();

      // On mobile, use direct navigation (more reliable than window.open)
      if (availability.isMobile) {
        window.location.href = url;
        isSending.value = false;
        return {
          success: true,
          orderNumber: orderNum,
          error: null,
          method: 'whatsapp_app',
        };
      }

      // On desktop, open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
      isSending.value = false;

      return {
        success: true,
        orderNumber: orderNum,
        error: null,
        method: 'whatsapp_web',
      };
    } catch (_error) {
      isSending.value = false;
      console.error('Failed to send WhatsApp order:', error);
      return {
        success: false,
        orderNumber: null,
        error: 'unknown_error',
        method: 'failed',
      };
    }
  };

  /**
   * Send order - simple version (backwards compatible)
   */
  const sendOrderSimple = (): boolean => {
    if (cartStore.isEmpty) {
      return false;
    }

    const url = getWhatsAppUrl(formatOrderMessage.value);
    window.open(url, '_blank', 'noopener,noreferrer');

    return true;
  };

  /**
   * Format service message (call server, request bill)
   */
  const formatServiceMessage = (
    type: 'call_server' | 'request_bill',
    locale: 'fr' | 'en'
  ): string => {
    const restaurantName = menuStore.restaurant?.name || 'Restaurant';
    const tableInfo = cartStore.tableNumber ? `🪑 Table ${cartStore.tableNumber}\n\n` : '\n';

    const messages = {
      call_server: {
        fr: `🔔 *Appel serveur*\n\n📍 ${restaurantName}\n${tableInfo}Un serveur est demandé à cette table.`,
        en: `🔔 *Call server*\n\n📍 ${restaurantName}\n${tableInfo}A server is requested at this table.`,
      },
      request_bill: {
        fr: `💳 *Demande d'addition*\n\n📍 ${restaurantName}\n${tableInfo}Merci de préparer l'addition.`,
        en: `💳 *Bill request*\n\n📍 ${restaurantName}\n${tableInfo}Please prepare the bill.`,
      },
    };

    return messages[type][locale];
  };

  /**
   * Call server via WhatsApp
   */
  const callServer = () => {
    const locale = configStore.locale;
    const message = formatServiceMessage('call_server', locale);
    const url = getWhatsAppUrl(message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /**
   * Request bill via WhatsApp
   */
  const requestBill = () => {
    const locale = configStore.locale;
    const message = formatServiceMessage('request_bill', locale);
    const url = getWhatsAppUrl(message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /**
   * Open WhatsApp chat (no pre-filled message)
   */
  const openChat = () => {
    const phone = formatPhoneForWhatsApp(menuStore.restaurant?.whatsappNumber || '');
    const url = `https://wa.me/${phone}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /**
   * Get restaurant WhatsApp number formatted for display
   */
  const displayPhoneNumber = computed(() => {
    const phone = menuStore.restaurant?.whatsappNumber || '';
    // Format: +226 XX XX XX XX
    if (phone.startsWith('+226') && phone.length === 12) {
      return `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 8)} ${phone.slice(8, 10)} ${phone.slice(10)}`;
    }
    return phone;
  });

  return {
    // State
    isSending,
    lastOrderNumber,
    estimatedTime,
    customerLocation,

    // Message formatting
    formatOrderMessage,
    whatsappUrl,
    displayPhoneNumber,

    // Actions
    sendOrder,
    sendOrderSimple,
    copyOrderToClipboard,
    callServer,
    requestBill,
    openChat,
    setCustomerLocation,
    clearCustomerLocation,

    // Utilities
    checkWhatsAppAvailability,
    generateOrderNumber,
  };
}
