import { computed } from 'vue';
import { useMenuStore } from '@/stores/menuStore';
import { formatPrice as formatPriceUtil } from '@/utils/formatters';

/**
 * Composable for currency formatting using restaurant settings
 */
export function useCurrency() {
  const menuStore = useMenuStore();

  // Get currency from restaurant settings
  const currency = computed(() => menuStore.restaurant?.currency || 'XOF');

  /**
   * Format a price using the restaurant's currency
   */
  const formatPrice = (amount: number): string => {
    return formatPriceUtil(amount, currency.value);
  };

  return {
    currency,
    formatPrice,
  };
}
