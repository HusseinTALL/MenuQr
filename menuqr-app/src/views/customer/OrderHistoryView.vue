<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import { useMenuStore } from '@/stores/menuStore';
import { useCurrency } from '@/composables/useCurrency';
import api from '@/services/api';
import AppHeader from '@/components/common/AppHeader.vue';

interface OrderItem {
  dishId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

const router = useRouter();
const customerAuthStore = useCustomerAuthStore();
const menuStore = useMenuStore();
const { formatPrice } = useCurrency();

const orders = ref<Order[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

const statusLabels: Record<string, { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmée', class: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'En préparation', class: 'bg-orange-100 text-orange-800' },
  ready: { label: 'Prête', class: 'bg-green-100 text-green-800' },
  completed: { label: 'Terminée', class: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Annulée', class: 'bg-red-100 text-red-800' },
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

onMounted(async () => {
  // Initialize customer auth for this restaurant
  if (menuStore.restaurant?.id) {
    customerAuthStore.initForRestaurant(menuStore.restaurant.id);
  }

  if (!customerAuthStore.isAuthenticated) {
    router.push('/menu');
    return;
  }

  try {
    const response = await api.customerGetOrders();
    if (response.success && response.data) {
      // Handle paginated response - first cast to unknown
      const data = response.data as unknown;
      if (Array.isArray(data)) {
        orders.value = data as Order[];
      } else if (data && typeof data === 'object' && 'orders' in data) {
        orders.value = (data as { orders: Order[] }).orders;
      }
    }
  } catch (err) {
    error.value = 'Impossible de charger vos commandes';
  } finally {
    isLoading.value = false;
  }
});

const handleReorder = async (orderId: string) => {
  try {
    await api.customerReorder(orderId);
    router.push('/cart');
  } catch {
    // Handle error
  }
};

const goToReview = (dishId: string, dishName: string) => {
  router.push({
    path: '/reviews',
    query: { dishId, dishName },
  });
};

const goToOrderReview = () => {
  router.push('/reviews');
};

// Check if order is completed and can be reviewed
const canReview = (status: string) => {
  return status === 'completed' || status === 'ready';
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-8">
    <AppHeader :show-back="true" title="Mes commandes" />

    <div class="container max-w-2xl mx-auto px-4 py-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="n in 3" :key="n" class="bg-white rounded-2xl p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div class="h-3 bg-gray-200 rounded w-1/2 mb-2" />
          <div class="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-16">
        <p class="text-red-600">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="orders.length === 0" class="text-center py-16">
        <div class="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Aucune commande</h2>
        <p class="text-gray-500 mb-6">Vous n'avez pas encore passé de commande</p>
        <button
          class="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          @click="router.push('/menu')"
        >
          Voir le menu
        </button>
      </div>

      <!-- Orders List -->
      <div v-else class="space-y-4">
        <div
          v-for="order in orders"
          :key="order._id"
          class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 overflow-hidden"
        >
          <!-- Order Header -->
          <div class="p-5 border-b border-gray-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-lg font-bold text-gray-900">#{{ order.orderNumber }}</span>
              <span
                class="px-3 py-1 text-xs font-semibold rounded-full"
                :class="statusLabels[order.status]?.class || 'bg-gray-100 text-gray-800'"
              >
                {{ statusLabels[order.status]?.label || order.status }}
              </span>
            </div>
            <p class="text-sm text-gray-500">{{ formatDate(order.createdAt) }}</p>
          </div>

          <!-- Order Items -->
          <div class="p-5 space-y-3">
            <div
              v-for="item in order.items"
              :key="item.dishId"
              class="flex items-center justify-between text-sm"
            >
              <div class="flex items-center gap-2 flex-1">
                <span class="text-gray-500">{{ item.quantity }}×</span>
                <span class="text-gray-900">{{ item.name }}</span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="canReview(order.status)"
                  class="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                  @click="goToReview(item.dishId, item.name)"
                >
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Noter
                </button>
                <span class="text-gray-700 font-medium">{{ formatPrice(item.totalPrice) }}</span>
              </div>
            </div>
          </div>

          <!-- Order Footer -->
          <div class="p-5 bg-gray-50 flex items-center justify-between">
            <div>
              <span class="text-sm text-gray-500">Total:</span>
              <span class="ml-2 text-lg font-bold text-gray-900">{{ formatPrice(order.totalAmount) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="canReview(order.status)"
                class="px-4 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1.5"
                @click="goToOrderReview()"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Donner un avis
              </button>
              <button
                class="px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                @click="handleReorder(order._id)"
              >
                Recommander
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
