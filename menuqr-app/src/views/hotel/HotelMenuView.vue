<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Input as AInput,
  Button as AButton,
  Badge as ABadge,
  Spin as ASpin,
  Modal as AModal,
  Radio as ARadio,
  RadioGroup as ARadioGroup,
  Checkbox as ACheckbox,
  CheckboxGroup as ACheckboxGroup,
  Textarea as ATextarea,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  CoffeeOutlined,
  InboxOutlined,
} from '@ant-design/icons-vue';
import { useHotelGuestStore } from '@/stores/hotelGuestStore';
import { useConfigStore } from '@/stores/configStore';
import api, { type HotelMenuData, type HotelCategoryData, type HotelDishData } from '@/services/api';

const route = useRoute();
const router = useRouter();
const hotelGuestStore = useHotelGuestStore();
const configStore = useConfigStore();

// State
const isLoading = ref(true);
const menus = ref<HotelMenuData[]>([]);
const selectedMenuId = ref<string | null>(null);
const categories = ref<HotelCategoryData[]>([]);
const selectedCategoryId = ref<string | null>(null);
const dishes = ref<HotelDishData[]>([]);
const searchQuery = ref('');

// Dish modal state
const showDishModal = ref(false);
const selectedDish = ref<HotelDishData | null>(null);
const selectedVariant = ref<{ name: { fr: string; en?: string }; price: number } | null>(null);
const selectedOptionIndices = ref<number[]>([]);
const specialInstructions = ref('');
const quantity = ref(1);

// Computed to get selected options as objects
const selectedOptions = computed(() => {
  if (!selectedDish.value?.options) {return [];}
  return selectedOptionIndices.value
    .map(idx => selectedDish.value?.options?.[idx])
    .filter((opt): opt is NonNullable<typeof opt> => opt !== undefined);
});

// Cart state (local for now, will be moved to store)
const cartItems = ref<Array<{
  dish: HotelDishData;
  variant?: { name: { fr: string; en?: string }; price: number };
  options: Array<{ name: { fr: string; en?: string }; price: number }>;
  specialInstructions?: string;
  quantity: number;
}>>([]);

// Computed
const hotel = computed(() => hotelGuestStore.hotel);
const hotelName = computed(() => hotel.value?.name || '');
const roomNumber = computed(() => hotelGuestStore.roomNumber);

const cartItemCount = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
});

const cartTotal = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    const basePrice = item.variant?.price || item.dish.price;
    const optionsPrice = item.options.reduce((s, o) => s + o.price, 0);
    return sum + (basePrice + optionsPrice) * item.quantity;
  }, 0);
});

const filteredDishes = computed(() => {
  let result = dishes.value;

  // Filter by category
  if (selectedCategoryId.value) {
    result = result.filter(d => d.categoryId === selectedCategoryId.value);
  }

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(d =>
      d.name.fr.toLowerCase().includes(query) ||
      d.name.en?.toLowerCase().includes(query) ||
      d.description?.fr?.toLowerCase().includes(query)
    );
  }

  return result;
});

// Helpers
function localize(obj: { fr: string; en?: string } | undefined): string {
  if (!obj) {return '';}
  const locale = configStore.locale || 'fr';
  return locale === 'en' && obj.en ? obj.en : obj.fr;
}

function formatPrice(price: number): string {
  const currency = hotel.value?.settings?.currency || 'EUR';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(price);
}

function t(key: string): string {
  const translations: Record<string, string> = {
    'hotel.unavailable': 'Indisponible',
    'hotel.searchDishes': 'Rechercher un plat...',
    'hotel.popular': 'Populaire',
    'hotel.new': 'Nouveau',
    'hotel.noDishesFound': 'Aucun plat trouvé',
    'hotel.allergens': 'Allergènes',
    'hotel.selectVariant': 'Choisir une option',
    'hotel.addOptions': 'Suppléments',
    'hotel.specialInstructions': 'Instructions spéciales',
    'hotel.instructionsPlaceholder': 'Ex: sans oignon, bien cuit...',
    'hotel.quantity': 'Quantité',
    'hotel.addToCart': 'Ajouter au panier',
  };
  return translations[key] || key;
}

function getMenuIcon(type: string): string {
  const icons: Record<string, string> = {
    room_service: '🍽️',
    breakfast: '🥐',
    minibar: '🍫',
    poolside: '🏊',
    spa: '🧖',
    special: '⭐',
  };
  return icons[type] || '🍽️';
}

// Actions
function goBack() {
  if (hotel.value) {
    router.push({
      name: 'hotel-landing',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

function goToCart() {
  if (hotel.value) {
    // Store cart items in sessionStorage temporarily
    sessionStorage.setItem('hotelCart', JSON.stringify(cartItems.value));
    router.push({
      name: 'hotel-cart',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

async function selectMenu(menuId: string) {
  selectedMenuId.value = menuId;
  await loadMenuContent(menuId);
}

function selectCategory(categoryId: string) {
  selectedCategoryId.value = selectedCategoryId.value === categoryId ? null : categoryId;
}

function openDishModal(dish: HotelDishData) {
  selectedDish.value = dish;
  selectedVariant.value = dish.variants?.[0] || null;
  selectedOptionIndices.value = [];
  specialInstructions.value = '';
  quantity.value = 1;
  showDishModal.value = true;
}

function incrementQuantity() {
  quantity.value++;
}

function decrementQuantity() {
  if (quantity.value > 1) {quantity.value--;}
}

function calculateItemTotal(): number {
  if (!selectedDish.value) {return 0;}
  const basePrice = selectedVariant.value?.price || selectedDish.value.price;
  const optionsPrice = selectedOptions.value.reduce((sum, opt) => sum + opt.price, 0);
  return (basePrice + optionsPrice) * quantity.value;
}

function quickAddToCart(dish: HotelDishData) {
  // Quick add without options
  if (dish.variants?.length || dish.options?.length) {
    openDishModal(dish);
    return;
  }

  cartItems.value.push({
    dish,
    options: [],
    quantity: 1,
  });
}

function addToCart() {
  if (!selectedDish.value) {return;}

  cartItems.value.push({
    dish: selectedDish.value,
    variant: selectedVariant.value || undefined,
    options: [...selectedOptions.value],
    specialInstructions: specialInstructions.value || undefined,
    quantity: quantity.value,
  });

  showDishModal.value = false;
}

async function loadMenuContent(menuId: string) {
  if (!hotel.value) {return;}

  isLoading.value = true;
  try {
    // Load categories
    const catResponse = await api.hotelGetCategories(hotel.value.id, menuId);
    if (catResponse.success && catResponse.data) {
      categories.value = catResponse.data;
    }

    // Load all dishes for this menu
    dishes.value = [];
    for (const category of categories.value) {
      const dishResponse = await api.hotelGetDishes(hotel.value.id, menuId, category.id);
      if (dishResponse.success && dishResponse.data) {
        dishes.value.push(...dishResponse.data);
      }
    }
  } catch (err) {
    console.error('Failed to load menu content:', err);
  } finally {
    isLoading.value = false;
  }
}

async function loadMenus() {
  if (!hotel.value) {return;}

  try {
    const response = await api.hotelGetMenus(hotel.value.id);
    if (response.success && response.data) {
      menus.value = response.data.filter(m => m.isActive);

      // Select first available menu
      const availableMenu = menus.value.find(m => m.isCurrentlyAvailable);
      if (availableMenu) {
        selectedMenuId.value = availableMenu.id;
        await loadMenuContent(availableMenu.id);
      }
    }
  } catch (err) {
    console.error('Failed to load menus:', err);
  }
}

// Watch for menu changes
watch(selectedMenuId, async (newMenuId) => {
  if (newMenuId) {
    await loadMenuContent(newMenuId);
  }
});

onMounted(async () => {
  const hotelSlug = route.params.hotelSlug as string;

  // Load hotel data if not already loaded
  if (!hotel.value && hotelSlug) {
    await hotelGuestStore.getHotelBySlug(hotelSlug);
  }

  // Load cart from sessionStorage
  const savedCart = sessionStorage.getItem('hotelCart');
  if (savedCart) {
    try {
      cartItems.value = JSON.parse(savedCart);
    } catch {
      // Ignore parse errors
    }
  }

  await loadMenus();
});
</script>

<template>
  <div class="hotel-menu">
    <!-- Header -->
    <div class="menu-header">
      <div class="header-top">
        <a-button type="text" @click="goBack">
          <template #icon><ArrowLeftOutlined /></template>
        </a-button>
        <div class="header-info">
          <h1>{{ hotelName }}</h1>
          <span v-if="roomNumber" class="room-badge">
            <HomeOutlined /> {{ roomNumber }}
          </span>
        </div>
        <a-badge :count="cartItemCount" :offset="[-4, 4]">
          <a-button type="text" @click="goToCart">
            <template #icon><ShoppingCartOutlined /></template>
          </a-button>
        </a-badge>
      </div>

      <!-- Menu Type Selector -->
      <div v-if="menus.length > 1" class="menu-type-selector">
        <button
          v-for="menu in menus"
          :key="menu.id"
          :class="['menu-type-btn', { active: selectedMenuId === menu.id }]"
          :disabled="!menu.isCurrentlyAvailable"
          @click="selectMenu(menu.id)"
        >
          <span class="menu-type-icon">{{ getMenuIcon(menu.type) }}</span>
          <span class="menu-type-name">{{ localize(menu.name) }}</span>
          <span v-if="!menu.isCurrentlyAvailable" class="unavailable-badge">
            {{ t('hotel.unavailable') }}
          </span>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="search-container">
        <a-input
          v-model:value="searchQuery"
          :placeholder="t('hotel.searchDishes')"
          allow-clear
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Menu Content -->
    <div v-else class="menu-content">
      <!-- Category Tabs -->
      <div v-if="categories.length > 0" class="category-tabs">
        <button
          v-for="category in categories"
          :key="category.id"
          :class="['category-tab', { active: selectedCategoryId === category.id }]"
          @click="selectCategory(category.id)"
        >
          {{ localize(category.name) }}
        </button>
      </div>

      <!-- Dishes Grid -->
      <div class="dishes-grid">
        <div
          v-for="dish in filteredDishes"
          :key="dish.id"
          class="dish-card"
          @click="openDishModal(dish)"
        >
          <div class="dish-image-container">
            <img
              v-if="dish.images?.[0]"
              :src="dish.images[0]"
              :alt="localize(dish.name)"
              class="dish-image"
            />
            <div v-else class="dish-image-placeholder">
              <CoffeeOutlined />
            </div>
            <div v-if="dish.isPopular" class="dish-badge popular">
              {{ t('hotel.popular') }}
            </div>
            <div v-else-if="dish.isNewDish" class="dish-badge new">
              {{ t('hotel.new') }}
            </div>
          </div>
          <div class="dish-info">
            <h3 class="dish-name">{{ localize(dish.name) }}</h3>
            <p v-if="dish.description" class="dish-description">
              {{ localize(dish.description) }}
            </p>
            <div class="dish-footer">
              <span class="dish-price">{{ formatPrice(dish.price) }}</span>
              <div class="dish-badges">
                <span v-if="dish.isVegetarian" class="diet-badge vegetarian" title="Végétarien">V</span>
                <span v-if="dish.isVegan" class="diet-badge vegan" title="Vegan">VG</span>
                <span v-if="dish.isGlutenFree" class="diet-badge gf" title="Sans gluten">GF</span>
                <span v-if="dish.isSpicy" class="diet-badge spicy" title="Épicé">🌶️</span>
              </div>
            </div>
          </div>
          <a-button
            type="primary"
            size="small"
            shape="circle"
            class="add-btn"
            @click.stop="quickAddToCart(dish)"
          >
            <template #icon><PlusOutlined /></template>
          </a-button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredDishes.length === 0 && !isLoading" class="empty-state">
        <InboxOutlined />
        <p>{{ t('hotel.noDishesFound') }}</p>
      </div>
    </div>

    <!-- Dish Detail Modal -->
    <a-modal
      v-model:open="showDishModal"
      :title="selectedDish ? localize(selectedDish.name) : ''"
      :footer="null"
      width="100%"
      :style="{ maxWidth: '500px', top: '20px' }"
      class="dish-modal"
    >
      <div v-if="selectedDish" class="dish-detail">
        <img
          v-if="selectedDish.images?.[0]"
          :src="selectedDish.images[0]"
          :alt="localize(selectedDish.name)"
          class="dish-detail-image"
        />

        <p v-if="selectedDish.description" class="dish-detail-description">
          {{ localize(selectedDish.description) }}
        </p>

        <!-- Allergens -->
        <div v-if="selectedDish.allergens?.length" class="allergens-section">
          <h4>{{ t('hotel.allergens') }}</h4>
          <div class="allergen-tags">
            <span v-for="allergen in selectedDish.allergens" :key="allergen" class="allergen-tag">
              {{ allergen }}
            </span>
          </div>
        </div>

        <!-- Variants -->
        <div v-if="selectedDish.variants?.length" class="variants-section">
          <h4>{{ t('hotel.selectVariant') }}</h4>
          <a-radio-group v-model:value="selectedVariant" class="variants-list">
            <a-radio
              v-for="variant in selectedDish.variants"
              :key="variant.name.fr"
              :value="variant"
              class="variant-item"
            >
              <span class="variant-name">{{ localize(variant.name) }}</span>
              <span class="variant-price">{{ formatPrice(variant.price) }}</span>
            </a-radio>
          </a-radio-group>
        </div>

        <!-- Options -->
        <div v-if="selectedDish.options?.length" class="options-section">
          <h4>{{ t('hotel.addOptions') }}</h4>
          <a-checkbox-group v-model:value="selectedOptionIndices" class="options-list">
            <a-checkbox
              v-for="(option, index) in selectedDish.options"
              :key="option.name.fr"
              :value="index"
              class="option-item"
            >
              <span class="option-name">{{ localize(option.name) }}</span>
              <span class="option-price">+{{ formatPrice(option.price) }}</span>
            </a-checkbox>
          </a-checkbox-group>
        </div>

        <!-- Special Instructions -->
        <div class="instructions-section">
          <h4>{{ t('hotel.specialInstructions') }}</h4>
          <a-textarea
            v-model:value="specialInstructions"
            :placeholder="t('hotel.instructionsPlaceholder')"
            :rows="2"
            :maxlength="200"
          />
        </div>

        <!-- Quantity -->
        <div class="quantity-section">
          <h4>{{ t('hotel.quantity') }}</h4>
          <div class="quantity-controls">
            <a-button @click="decrementQuantity" :disabled="quantity <= 1">
              <template #icon><MinusOutlined /></template>
            </a-button>
            <span class="quantity-value">{{ quantity }}</span>
            <a-button @click="incrementQuantity">
              <template #icon><PlusOutlined /></template>
            </a-button>
          </div>
        </div>

        <!-- Add to Cart Button -->
        <a-button
          type="primary"
          size="large"
          block
          class="add-to-cart-btn"
          @click="addToCart"
        >
          {{ t('hotel.addToCart') }} - {{ formatPrice(calculateItemTotal()) }}
        </a-button>
      </div>
    </a-modal>

    <!-- Cart FAB -->
    <div v-if="cartItemCount > 0" class="cart-fab" @click="goToCart">
      <ShoppingCartOutlined />
      <span class="cart-fab-count">{{ cartItemCount }}</span>
      <span class="cart-fab-total">{{ formatPrice(cartTotal) }}</span>
    </div>
  </div>
</template>

<style scoped>
.hotel-menu {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100px;
}

.menu-header {
  background: white;
  padding-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.room-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #e6f7ff;
  border-radius: 12px;
  font-size: 12px;
  color: #1890ff;
}

.menu-type-selector {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  overflow-x: auto;
}

.menu-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  min-width: 80px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-type-btn:hover:not(:disabled) {
  border-color: #14b8a6;
}

.menu-type-btn.active {
  border-color: #14b8a6;
  background: #e6fffb;
}

.menu-type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-type-icon {
  font-size: 24px;
}

.menu-type-name {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a1a;
}

.unavailable-badge {
  font-size: 10px;
  color: #ff4d4f;
}

.search-container {
  padding: 0 16px;
}

.search-container :deep(.ant-input-affix-wrapper) {
  border-radius: 24px;
  background: #f5f7fa;
  border: none;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 48px;
}

.menu-content {
  padding: 16px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 16px;
  margin-bottom: 8px;
}

.category-tab {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.category-tab:hover {
  background: #f0f0f0;
}

.category-tab.active {
  background: #14b8a6;
  color: white;
}

.dishes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.dish-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.dish-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.dish-image-container {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.dish-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #bbb;
  font-size: 32px;
}

.dish-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.dish-badge.popular {
  background: #ff6b35;
  color: white;
}

.dish-badge.new {
  background: #52c41a;
  color: white;
}

.dish-info {
  padding: 12px;
}

.dish-name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.3;
}

.dish-description {
  margin: 0 0 8px;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dish-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dish-price {
  font-size: 16px;
  font-weight: 700;
  color: #14b8a6;
}

.dish-badges {
  display: flex;
  gap: 4px;
}

.diet-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.diet-badge.vegetarian {
  background: #e6f7ed;
  color: #52c41a;
}

.diet-badge.vegan {
  background: #f0fdf4;
  color: #22c55e;
}

.diet-badge.gf {
  background: #fef3c7;
  color: #d97706;
}

.add-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: #14b8a6;
  border: none;
}

.add-btn:hover {
  background: #0d9488;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #888;
}

.empty-state .anticon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Dish Modal Styles */
.dish-detail-image {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 16px;
}

.dish-detail-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

.allergens-section,
.variants-section,
.options-section,
.instructions-section,
.quantity-section {
  margin-bottom: 20px;
}

.allergens-section h4,
.variants-section h4,
.options-section h4,
.instructions-section h4,
.quantity-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.allergen-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.allergen-tag {
  padding: 4px 12px;
  background: #fff2e8;
  border-radius: 16px;
  font-size: 12px;
  color: #fa8c16;
}

.variants-list,
.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variant-item,
.option-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.variant-price,
.option-price {
  font-weight: 600;
  color: #14b8a6;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quantity-value {
  font-size: 20px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.add-to-cart-btn {
  height: 48px;
  font-size: 16px;
  border-radius: 24px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
  margin-top: 8px;
}

/* Cart FAB */
.cart-fab {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border-radius: 30px;
  color: white;
  box-shadow: 0 4px 20px rgba(20, 184, 166, 0.4);
  cursor: pointer;
  z-index: 1000;
}

.cart-fab .anticon {
  font-size: 20px;
}

.cart-fab-count {
  background: white;
  color: #14b8a6;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 12px;
}

.cart-fab-total {
  font-weight: 600;
  font-size: 16px;
}
</style>
