<script setup lang="ts">
import { ref, computed, onMounted, reactive, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  BookOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import api, { type HotelMenuAdmin, type HotelCategoryAdmin, type HotelDishAdmin } from '@/services/api';

// ============ STATE ============
const isLoading = ref(true);
const hotelId = ref<string | null>(null);
const menus = ref<HotelMenuAdmin[]>([]);
const categories = ref<HotelCategoryAdmin[]>([]);
const dishes = ref<HotelDishAdmin[]>([]);
const selectedMenuId = ref<string | null>(null);
const searchQuery = ref('');

// Modal state
const menuModalVisible = ref(false);
const menuModalLoading = ref(false);
const editingMenu = ref<HotelMenuAdmin | null>(null);

const categoryModalVisible = ref(false);
const categoryModalLoading = ref(false);
const editingCategory = ref<HotelCategoryAdmin | null>(null);

// Form state
const menuForm = reactive({
  name: { fr: '', en: '' },
  description: { fr: '', en: '' },
  type: 'room_service' as HotelMenuAdmin['type'],
  isActive: true,
  isDefault: false,
  availability: {
    isAlwaysAvailable: true,
    schedule: [] as Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
  },
});

const categoryForm = reactive({
  name: { fr: '', en: '' },
  description: { fr: '', en: '' },
  icon: '',
  isActive: true,
  order: 0,
});

// ============ CONSTANTS ============
const menuTypes = [
  { value: 'room_service', label: 'Room Service' },
  { value: 'breakfast', label: 'Petit-dejeuner' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'pool', label: 'Piscine' },
  { value: 'spa', label: 'Spa' },
  { value: 'minibar', label: 'Minibar' },
];

const categoryIcons = [
  '🍳', '🥐', '🥗', '🍝', '🍕', '🍔', '🍖', '🥩', '🍣', '🍜',
  '🥤', '🍷', '🍸', '🍺', '☕', '🍰', '🍨', '🍿', '🧀', '🥚',
];

// ============ COMPUTED ============
const selectedMenu = computed(() =>
  menus.value.find(m => m.id === selectedMenuId.value)
);

const filteredCategories = computed(() => {
  if (!selectedMenuId.value) {return [];}
  let result = categories.value.filter(c => c.menuId === selectedMenuId.value);

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(c =>
      c.name.fr.toLowerCase().includes(query) ||
      c.name.en?.toLowerCase().includes(query)
    );
  }

  return result.sort((a, b) => a.order - b.order);
});

const getCategoryDishes = (categoryId: string) => {
  return dishes.value
    .filter(d => d.categoryId === categoryId)
    .sort((a, b) => a.order - b.order);
};

// ============ DATA LOADING ============
async function loadData() {
  isLoading.value = true;
  try {
    const hotelRes = await api.getMyHotel();
    if (!hotelRes.success || !hotelRes.data) {
      message.error('Impossible de charger l\'hotel');
      return;
    }
    hotelId.value = hotelRes.data.id;

    const menusRes = await api.getHotelMenusAdmin(hotelId.value!);
    if (menusRes.success && menusRes.data) {
      menus.value = menusRes.data;
      if (menus.value.length > 0 && !selectedMenuId.value) {
        selectedMenuId.value = menus.value[0]?.id || null;
        if (selectedMenuId.value) {
          await loadMenuContent(selectedMenuId.value);
        }
      }
    }
  } catch (e) {
    console.error('Error loading data:', e);
    message.error('Erreur lors du chargement');
  } finally {
    isLoading.value = false;
  }
}

async function loadMenuContent(menuId: string) {
  if (!hotelId.value) {return;}

  try {
    const [catRes, dishRes] = await Promise.all([
      api.getHotelCategoriesAdmin(hotelId.value, menuId),
      api.getHotelDishesAdmin(hotelId.value, { menuId }),
    ]);

    if (catRes.success && catRes.data) {
      categories.value = catRes.data;
    }
    if (dishRes.success && dishRes.data) {
      dishes.value = dishRes.data;
    }
  } catch (e) {
    console.error('Error loading menu content:', e);
  }
}

async function selectMenu(menuId: string) {
  selectedMenuId.value = menuId;
  await loadMenuContent(menuId);
}

// ============ MENU CRUD ============
function openCreateMenuModal() {
  editingMenu.value = null;
  Object.assign(menuForm, {
    name: { fr: '', en: '' },
    description: { fr: '', en: '' },
    type: 'room_service',
    isActive: true,
    isDefault: false,
    availability: { isAlwaysAvailable: true, schedule: [] },
  });
  menuModalVisible.value = true;
}

function openEditMenuModal(menu: HotelMenuAdmin) {
  editingMenu.value = menu;
  Object.assign(menuForm, {
    name: { ...menu.name },
    description: { fr: menu.description?.fr || '', en: menu.description?.en || '' },
    type: menu.type,
    isActive: menu.isActive,
    isDefault: menu.isDefault,
    availability: { ...menu.availability },
  });
  menuModalVisible.value = true;
}

async function handleMenuSubmit() {
  if (!hotelId.value) {return;}
  if (!menuForm.name.fr) {
    message.error('Le nom est requis');
    return;
  }

  menuModalLoading.value = true;
  try {
    if (editingMenu.value) {
      const res = await api.updateHotelMenu(hotelId.value, editingMenu.value.id, menuForm);
      if (res.success) {
        message.success('Menu mis a jour');
        menuModalVisible.value = false;
        loadData();
      }
    } else {
      const res = await api.createHotelMenu(hotelId.value, menuForm);
      if (res.success) {
        message.success('Menu cree');
        menuModalVisible.value = false;
        loadData();
      }
    }
  } catch {
    message.error('Erreur');
  } finally {
    menuModalLoading.value = false;
  }
}

function confirmDeleteMenu(menu: HotelMenuAdmin) {
  Modal.confirm({
    title: 'Supprimer le menu',
    icon: h(ExclamationCircleOutlined),
    content: `Supprimer "${menu.name.fr}" et toutes ses categories ?`,
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    onOk: async () => {
      if (!hotelId.value) {return;}
      try {
        const res = await api.deleteHotelMenu(hotelId.value, menu.id);
        if (res.success) {
          message.success('Menu supprime');
          if (selectedMenuId.value === menu.id) {
            selectedMenuId.value = null;
          }
          loadData();
        }
      } catch {
        message.error('Erreur');
      }
    },
  });
}

// ============ CATEGORY CRUD ============
function openCreateCategoryModal() {
  if (!selectedMenuId.value) {
    message.warning('Selectionnez un menu');
    return;
  }
  editingCategory.value = null;
  Object.assign(categoryForm, {
    name: { fr: '', en: '' },
    description: { fr: '', en: '' },
    icon: '',
    isActive: true,
    order: filteredCategories.value.length,
  });
  categoryModalVisible.value = true;
}

function openEditCategoryModal(category: HotelCategoryAdmin) {
  editingCategory.value = category;
  Object.assign(categoryForm, {
    name: { ...category.name },
    description: { fr: category.description?.fr || '', en: category.description?.en || '' },
    icon: category.icon || '',
    isActive: category.isActive,
    order: category.order,
  });
  categoryModalVisible.value = true;
}

async function handleCategorySubmit() {
  if (!hotelId.value || !selectedMenuId.value) {return;}
  if (!categoryForm.name.fr) {
    message.error('Le nom est requis');
    return;
  }

  categoryModalLoading.value = true;
  try {
    if (editingCategory.value) {
      const res = await api.updateHotelCategory(
        hotelId.value,
        selectedMenuId.value,
        editingCategory.value.id,
        categoryForm
      );
      if (res.success) {
        message.success('Categorie mise a jour');
        categoryModalVisible.value = false;
        loadMenuContent(selectedMenuId.value);
      }
    } else {
      const res = await api.createHotelCategory(hotelId.value, selectedMenuId.value, categoryForm);
      if (res.success) {
        message.success('Categorie creee');
        categoryModalVisible.value = false;
        loadMenuContent(selectedMenuId.value);
      }
    }
  } catch {
    message.error('Erreur');
  } finally {
    categoryModalLoading.value = false;
  }
}

function confirmDeleteCategory(category: HotelCategoryAdmin) {
  Modal.confirm({
    title: 'Supprimer la categorie',
    icon: h(ExclamationCircleOutlined),
    content: `Supprimer "${category.name.fr}" et tous ses plats ?`,
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    onOk: async () => {
      if (!hotelId.value || !selectedMenuId.value) {return;}
      try {
        const res = await api.deleteHotelCategory(hotelId.value, selectedMenuId.value, category.id);
        if (res.success) {
          message.success('Categorie supprimee');
          loadMenuContent(selectedMenuId.value!);
        }
      } catch {
        message.error('Erreur');
      }
    },
  });
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

// ============ LIFECYCLE ============
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="hotel-menus-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>
          <BookOutlined class="header-icon" />
          Gestion des menus
        </h1>
        <p class="header-subtitle">Gerez vos menus, categories et plats</p>
      </div>
      <div class="header-actions">
        <a-button @click="loadData">
          <template #icon><ReloadOutlined /></template>
        </a-button>
        <a-button type="primary" @click="openCreateMenuModal">
          <template #icon><PlusOutlined /></template>
          Nouveau menu
        </a-button>
      </div>
    </div>

    <div class="content-layout">
      <!-- Menus Sidebar -->
      <div class="menus-sidebar">
        <div class="sidebar-header">
          <h3>Menus</h3>
        </div>
        <div class="menus-list">
          <div v-if="isLoading" class="loading-menus">
            <a-spin />
          </div>
          <div v-else-if="menus.length === 0" class="empty-menus">
            <p>Aucun menu</p>
            <a-button type="primary" size="small" @click="openCreateMenuModal">
              Creer un menu
            </a-button>
          </div>
          <div
            v-for="menu in menus"
            :key="menu.id"
            :class="['menu-item', { active: selectedMenuId === menu.id }]"
            @click="selectMenu(menu.id)"
          >
            <div class="menu-info">
              <span class="menu-name">{{ menu.name.fr }}</span>
              <span class="menu-type">{{ menuTypes.find(t => t.value === menu.type)?.label }}</span>
            </div>
            <div class="menu-meta">
              <span class="menu-stats">{{ menu.categoriesCount }} cat. • {{ menu.dishesCount }} plats</span>
              <a-tag v-if="!menu.isActive" color="default" size="small">Inactif</a-tag>
              <a-tag v-if="menu.isDefault" color="blue" size="small">Defaut</a-tag>
            </div>
            <div class="menu-actions" @click.stop>
              <a-button size="small" type="text" @click="openEditMenuModal(menu)">
                <template #icon><EditOutlined /></template>
              </a-button>
              <a-button size="small" type="text" danger @click="confirmDeleteMenu(menu)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Categories & Dishes -->
      <div class="main-content">
        <div v-if="!selectedMenuId" class="empty-selection">
          <BookOutlined />
          <p>Selectionnez un menu pour voir son contenu</p>
        </div>

        <template v-else>
          <!-- Content Header -->
          <div class="content-header">
            <div class="content-title">
              <h2>{{ selectedMenu?.name.fr }}</h2>
              <a-tag v-if="selectedMenu?.isDefault" color="blue">Menu par defaut</a-tag>
            </div>
            <div class="content-actions">
              <a-input-search
                v-model:value="searchQuery"
                placeholder="Rechercher..."
                style="width: 200px"
                allow-clear
              />
              <a-button type="primary" @click="openCreateCategoryModal">
                <template #icon><PlusOutlined /></template>
                Categorie
              </a-button>
            </div>
          </div>

          <!-- Categories List -->
          <div class="categories-list">
            <div v-if="filteredCategories.length === 0" class="empty-categories">
              <AppstoreOutlined />
              <p>Aucune categorie</p>
              <a-button type="primary" @click="openCreateCategoryModal">
                Creer une categorie
              </a-button>
            </div>

            <div v-for="category in filteredCategories" :key="category.id" class="category-card">
              <div class="category-header">
                <div class="category-info">
                  <span v-if="category.icon" class="category-icon">{{ category.icon }}</span>
                  <span class="category-name">{{ category.name.fr }}</span>
                  <a-tag v-if="!category.isActive" color="default" size="small">Inactif</a-tag>
                </div>
                <div class="category-actions">
                  <a-button size="small" @click="openEditCategoryModal(category)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                  <a-button size="small" danger @click="confirmDeleteCategory(category)">
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </div>
              </div>

              <div class="dishes-grid">
                <div v-if="getCategoryDishes(category.id).length === 0" class="empty-dishes">
                  <p>Aucun plat dans cette categorie</p>
                </div>
                <div
                  v-for="dish in getCategoryDishes(category.id)"
                  :key="dish.id"
                  class="dish-card"
                >
                  <div class="dish-image">
                    <img v-if="dish.images?.[0]" :src="dish.images[0]" :alt="dish.name.fr" />
                    <div v-else class="dish-placeholder">
                      <AppstoreOutlined />
                    </div>
                  </div>
                  <div class="dish-info">
                    <span class="dish-name">{{ dish.name.fr }}</span>
                    <span class="dish-price">{{ formatPrice(dish.price) }}</span>
                  </div>
                  <div class="dish-badges">
                    <a-tag v-if="!dish.isAvailable" color="red" size="small">Indisponible</a-tag>
                    <a-tag v-if="dish.isPopular" color="orange" size="small">Populaire</a-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Menu Modal -->
    <a-modal
      v-model:open="menuModalVisible"
      :title="editingMenu ? 'Modifier le menu' : 'Nouveau menu'"
      :confirm-loading="menuModalLoading"
      @ok="handleMenuSubmit"
      width="600px"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Nom (FR)" required>
              <a-input v-model:value="menuForm.name.fr" placeholder="Ex: Room Service" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nom (EN)">
              <a-input v-model:value="menuForm.name.en" placeholder="Ex: Room Service" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Type de menu" required>
          <a-select v-model:value="menuForm.type">
            <a-select-option v-for="t in menuTypes" :key="t.value" :value="t.value">
              {{ t.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Description (FR)">
              <a-textarea v-model:value="menuForm.description.fr" :rows="2" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Description (EN)">
              <a-textarea v-model:value="menuForm.description.en" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item>
              <a-checkbox v-model:checked="menuForm.isActive">
                Menu actif
              </a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item>
              <a-checkbox v-model:checked="menuForm.isDefault">
                Menu par defaut
              </a-checkbox>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item>
          <a-checkbox v-model:checked="menuForm.availability.isAlwaysAvailable">
            Disponible 24h/24
          </a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Category Modal -->
    <a-modal
      v-model:open="categoryModalVisible"
      :title="editingCategory ? 'Modifier la categorie' : 'Nouvelle categorie'"
      :confirm-loading="categoryModalLoading"
      @ok="handleCategorySubmit"
      width="600px"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Nom (FR)" required>
              <a-input v-model:value="categoryForm.name.fr" placeholder="Ex: Entrees" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nom (EN)">
              <a-input v-model:value="categoryForm.name.en" placeholder="Ex: Starters" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Icone">
          <div class="icon-selector">
            <span
              v-for="icon in categoryIcons"
              :key="icon"
              :class="['icon-option', { selected: categoryForm.icon === icon }]"
              @click="categoryForm.icon = icon"
            >
              {{ icon }}
            </span>
          </div>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Description (FR)">
              <a-textarea v-model:value="categoryForm.description.fr" :rows="2" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Description (EN)">
              <a-textarea v-model:value="categoryForm.description.en" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item>
          <a-checkbox v-model:checked="categoryForm.isActive">
            Categorie active
          </a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.hotel-menus-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #6366f1;
}

.header-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.content-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  min-height: calc(100vh - 200px);
}

/* Sidebar */
.menus-sidebar {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.menus-list {
  padding: 12px;
}

.loading-menus,
.empty-menus {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
}

.menu-item {
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.menu-item:hover {
  background: #f8fafc;
}

.menu-item.active {
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid #6366f1;
}

.menu-info {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.menu-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.menu-type {
  font-size: 12px;
  color: #64748b;
}

.menu-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.menu-stats {
  font-size: 12px;
  color: #94a3b8;
}

.menu-actions {
  display: flex;
  gap: 4px;
}

/* Main Content */
.main-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.empty-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #94a3b8;
}

.empty-selection .anticon {
  font-size: 48px;
  margin-bottom: 12px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.content-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.content-actions {
  display: flex;
  gap: 12px;
}

/* Categories */
.categories-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-categories {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
}

.empty-categories .anticon {
  font-size: 48px;
  margin-bottom: 12px;
}

.category-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon {
  font-size: 20px;
}

.category-name {
  font-weight: 600;
  color: #1e293b;
}

.category-actions {
  display: flex;
  gap: 8px;
}

/* Dishes Grid */
.dishes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 16px;
}

.empty-dishes {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: #94a3b8;
  font-size: 14px;
}

.dish-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.dish-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dish-image {
  height: 100px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dish-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-placeholder {
  color: #d1d5db;
  font-size: 32px;
}

.dish-info {
  padding: 12px;
}

.dish-name {
  display: block;
  font-weight: 500;
  color: #1e293b;
  font-size: 14px;
  margin-bottom: 4px;
}

.dish-price {
  font-weight: 600;
  color: #6366f1;
  font-size: 14px;
}

.dish-badges {
  padding: 0 12px 12px;
  display: flex;
  gap: 4px;
}

/* Icon Selector */
.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-option:hover {
  border-color: #6366f1;
}

.icon-option.selected {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}
</style>
