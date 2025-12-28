<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  AppstoreOutlined,
  BarsOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UploadOutlined,
  CloseOutlined,
  StarOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import api, { type Dish, type Category, type Restaurant } from '@/services/api';
import { formatPrice } from '@/utils/formatters';

const isLoading = ref(true);
const error = ref<string | null>(null);
const dishes = ref<Dish[]>([]);
const categories = ref<Category[]>([]);
const restaurant = ref<Restaurant | null>(null);
const selectedCategory = ref<string>('');
const searchQuery = ref('');
const showModal = ref(false);
const showDeleteModal = ref(false);
const showPreviewModal = ref(false);
const isSubmitting = ref(false);
const editingDish = ref<Dish | null>(null);
const dishToDelete = ref<Dish | null>(null);
const previewDish = ref<Dish | null>(null);

const viewMode = ref<'grid' | 'list'>('grid');
const sortBy = ref<'name' | 'price' | 'category' | 'date'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const filterAvailability = ref<'all' | 'available' | 'unavailable'>('all');
const filterDiet = ref<string[]>([]);
const selectedRowKeys = ref<string[]>([]);

const formData = ref({
  name: { fr: '', en: '' },
  description: { fr: '', en: '' },
  price: 0,
  categoryId: '',
  allergens: [] as string[],
  tags: [] as string[],
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isSpicy: false,
  spicyLevel: 1,
  isAvailable: true,
  isPopular: false,
  isNewDish: false,
  preparationTime: 15,
  image: '',
});

const imageFile = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const isUploading = ref(false);

const allergenOptions = [
  { id: 'gluten', label: 'Gluten', icon: '🌾' },
  { id: 'crustaces', label: 'Crustacés', icon: '🦐' },
  { id: 'oeufs', label: 'Oeufs', icon: '🥚' },
  { id: 'poisson', label: 'Poisson', icon: '🐟' },
  { id: 'arachides', label: 'Arachides', icon: '🥜' },
  { id: 'soja', label: 'Soja', icon: '🫘' },
  { id: 'lait', label: 'Lait', icon: '🥛' },
  { id: 'fruits-coque', label: 'Fruits à coque', icon: '🌰' },
  { id: 'celeri', label: 'Céleri', icon: '🥬' },
  { id: 'moutarde', label: 'Moutarde', icon: '🟡' },
  { id: 'sesame', label: 'Sésame', icon: '⚪' },
  { id: 'sulfites', label: 'Sulfites', icon: '🍷' },
  { id: 'lupin', label: 'Lupin', icon: '🌸' },
  { id: 'mollusques', label: 'Mollusques', icon: '🦪' },
];

const dietOptions = [
  { id: 'vegetarian', label: 'Végétarien', icon: '🥗', key: 'isVegetarian' },
  { id: 'vegan', label: 'Vegan', icon: '🌱', key: 'isVegan' },
  { id: 'glutenFree', label: 'Sans gluten', icon: '🌾', key: 'isGlutenFree' },
  { id: 'spicy', label: 'Épicé', icon: '🌶️', key: 'isSpicy' },
];

 
const _categoryOptions = [
  { value: '', label: 'Toutes les catégories' },
];

const availabilityOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'available', label: 'Disponibles' },
  { value: 'unavailable', label: 'Indisponibles' },
];

const sortOptions = [
  { value: 'name', label: 'Nom' },
  { value: 'price', label: 'Prix' },
  { value: 'category', label: 'Catégorie' },
];

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [dishesResponse, categoriesResponse, restaurantResponse] = await Promise.all([
      api.getMyDishes(selectedCategory.value ? { categoryId: selectedCategory.value } : undefined),
      api.getMyCategories(),
      api.getMyRestaurant(),
    ]);

    if (dishesResponse.success && dishesResponse.data) {
      dishes.value = dishesResponse.data;
    }
    if (categoriesResponse.success && categoriesResponse.data) {
      categories.value = categoriesResponse.data;
    }
    if (restaurantResponse.success && restaurantResponse.data) {
      restaurant.value = restaurantResponse.data;
    }
  } catch {
    error.value = 'Erreur lors du chargement des plats';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const filteredDishes = computed(() => {
  let filtered = dishes.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (dish) =>
        dish.name.fr.toLowerCase().includes(query) ||
        dish.name.en?.toLowerCase().includes(query) ||
        dish.description?.fr?.toLowerCase().includes(query)
    );
  }

  if (filterAvailability.value !== 'all') {
    filtered = filtered.filter((dish) =>
      filterAvailability.value === 'available' ? dish.isAvailable : !dish.isAvailable
    );
  }

  if (filterDiet.value.length > 0) {
    filtered = filtered.filter((dish) =>
      filterDiet.value.every((diet) => {
        switch (diet) {
          case 'vegetarian': return dish.isVegetarian;
          case 'vegan': return dish.isVegan;
          case 'glutenFree': return dish.isGlutenFree;
          case 'spicy': return dish.isSpicy;
          default: return true;
        }
      })
    );
  }

  filtered = [...filtered].sort((a, b) => {
    let comparison = 0;
    switch (sortBy.value) {
      case 'name': comparison = a.name.fr.localeCompare(b.name.fr); break;
      case 'price': comparison = a.price - b.price; break;
      case 'category': comparison = getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId)); break;
      case 'date': comparison = a.order - b.order; break;
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });

  return filtered;
});

const stats = computed(() => ({
  total: dishes.value.length,
  available: dishes.value.filter(d => d.isAvailable).length,
  unavailable: dishes.value.filter(d => !d.isAvailable).length,
  popular: dishes.value.filter(d => d.isPopular).length,
  newDishes: dishes.value.filter(d => d.isNewDish).length,
}));

const formatCurrency = (value: number) => {
  const currency = restaurant.value?.settings?.currency || 'XOF';
  return formatPrice(value, currency);
};

const getCategoryName = (categoryId: string | { _id: string; name: { fr: string } }) => {
  if (typeof categoryId === 'object') {return categoryId.name.fr;}
  const category = categories.value.find((c) => c._id === categoryId);
  return category?.name.fr || 'Sans catégorie';
};

const getCategoryColor = (categoryId: string | { _id: string; name: { fr: string } }) => {
  const catId = typeof categoryId === 'object' ? categoryId._id : categoryId;
  const index = categories.value.findIndex(c => c._id === catId);
  const colors = ['blue', 'purple', 'green', 'magenta', 'orange', 'cyan'];
  return colors[index % colors.length];
};

const openCreateModal = () => {
  editingDish.value = null;
  imageFile.value = null;
  imagePreview.value = null;
  formData.value = {
    name: { fr: '', en: '' },
    description: { fr: '', en: '' },
    price: 0,
    categoryId: categories.value[0]?._id || '',
    allergens: [],
    tags: [],
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    spicyLevel: 1,
    isAvailable: true,
    isPopular: false,
    isNewDish: false,
    preparationTime: 15,
    image: '',
  };
  showModal.value = true;
};

const openEditModal = (dish: Dish) => {
  editingDish.value = dish;
  imageFile.value = null;
  imagePreview.value = dish.image || null;
  const catId = typeof dish.categoryId === 'object' ? dish.categoryId._id : dish.categoryId;
  formData.value = {
    name: { fr: dish.name.fr, en: dish.name.en || '' },
    description: { fr: dish.description?.fr || '', en: dish.description?.en || '' },
    price: dish.price,
    categoryId: catId,
    allergens: dish.allergens || [],
    tags: dish.tags || [],
    isVegetarian: dish.isVegetarian,
    isVegan: dish.isVegan,
    isGlutenFree: dish.isGlutenFree,
    isSpicy: dish.isSpicy,
    spicyLevel: dish.spicyLevel || 1,
    isAvailable: dish.isAvailable,
    isPopular: dish.isPopular,
    isNewDish: dish.isNewDish,
    preparationTime: dish.preparationTime || 15,
    image: dish.image || '',
  };
  showModal.value = true;
};

const duplicateDish = (dish: Dish) => {
  editingDish.value = null;
  imageFile.value = null;
  imagePreview.value = dish.image || null;
  const catId = typeof dish.categoryId === 'object' ? dish.categoryId._id : dish.categoryId;
  formData.value = {
    name: { fr: `${dish.name.fr} (copie)`, en: dish.name.en ? `${dish.name.en} (copy)` : '' },
    description: { fr: dish.description?.fr || '', en: dish.description?.en || '' },
    price: dish.price,
    categoryId: catId,
    allergens: dish.allergens || [],
    tags: dish.tags || [],
    isVegetarian: dish.isVegetarian,
    isVegan: dish.isVegan,
    isGlutenFree: dish.isGlutenFree,
    isSpicy: dish.isSpicy,
    spicyLevel: dish.spicyLevel || 1,
    isAvailable: dish.isAvailable,
    isPopular: false,
    isNewDish: true,
    preparationTime: dish.preparationTime || 15,
    image: dish.image || '',
  };
  showModal.value = true;
};

const openPreviewModal = (dish: Dish) => {
  previewDish.value = dish;
  showPreviewModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingDish.value = null;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  dishToDelete.value = null;
};

const closePreviewModal = () => {
  showPreviewModal.value = false;
  previewDish.value = null;
};

const handleImageChange = (info: any) => {
  const file = info.file.originFileObj || info.file;
  if (file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('Fichier trop volumineux. Taille maximale: 5MB');
      return;
    }
    imageFile.value = file;
    const reader = new FileReader();
    reader.onload = (e) => { imagePreview.value = e.target?.result as string; };
    reader.readAsDataURL(file);
  }
};

const removeImage = () => {
  imageFile.value = null;
  imagePreview.value = null;
  formData.value.image = '';
};

const handleSubmit = async () => {
  isSubmitting.value = true;
  error.value = null;

  try {
    let imageUrl = formData.value.image;

    if (imageFile.value) {
      isUploading.value = true;
      try {
        const uploadResponse = await api.uploadImage(imageFile.value);
        if (uploadResponse.success && uploadResponse.data) {
          imageUrl = uploadResponse.data.url;
        }
      } catch {
        message.error('Erreur lors de l\'upload de l\'image');
        return;
      } finally {
        isUploading.value = false;
      }
    }

    const data = {
      ...formData.value,
      name: { fr: formData.value.name.fr, en: formData.value.name.en || undefined },
      description: formData.value.description.fr || formData.value.description.en
        ? { fr: formData.value.description.fr || undefined, en: formData.value.description.en || undefined }
        : undefined,
      image: imageUrl || undefined,
    };

    if (editingDish.value) {
      const response = await api.updateDish(editingDish.value._id, data);
      if (response.success) {
        await fetchData();
        closeModal();
        message.success('Plat mis à jour avec succès');
      }
    } else {
      const response = await api.createDish(data);
      if (response.success) {
        await fetchData();
        closeModal();
        message.success('Plat créé avec succès');
      }
    }
  } catch {
    message.error('Erreur lors de la sauvegarde');
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
};

const toggleAvailability = async (dish: Dish) => {
  try {
    const response = await api.toggleDishAvailability(dish._id);
    if (response.success && response.data) {
      dish.isAvailable = response.data.isAvailable;
      message.success(dish.isAvailable ? 'Plat disponible' : 'Plat indisponible');
    }
  } catch {
    console.error(err);
  }
};

const confirmDelete = (dish: Dish) => {
  dishToDelete.value = dish;
  showDeleteModal.value = true;
};

const deleteDish = async () => {
  if (!dishToDelete.value) {return;}

  try {
    const response = await api.deleteDish(dishToDelete.value._id);
    if (response.success) {
      await fetchData();
      closeDeleteModal();
      message.success('Plat supprimé avec succès');
    }
  } catch {
    message.error('Erreur lors de la suppression');
    console.error(err);
  }
};

const toggleAllergen = (allergen: string) => {
  const index = formData.value.allergens.indexOf(allergen);
  if (index === -1) {formData.value.allergens.push(allergen);}
  else {formData.value.allergens.splice(index, 1);}
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = '';
  filterAvailability.value = 'all';
  filterDiet.value = [];
};

const hasActiveFilters = computed(() =>
  searchQuery.value || selectedCategory.value || filterAvailability.value !== 'all' || filterDiet.value.length > 0
);

const bulkToggleAvailability = async (available: boolean) => {
  try {
    const promises = selectedRowKeys.value.map(async (id) => {
      const dish = dishes.value.find(d => d._id === id);
      if (dish && dish.isAvailable !== available) {
        await api.toggleDishAvailability(id);
      }
    });
    await Promise.all(promises);
    await fetchData();
    selectedRowKeys.value = [];
    message.success(`${promises.length} plat(s) mis à jour`);
  } catch {
    console.error(err);
  }
};

// Table columns for list view
const columns: ColumnsType = [
  { title: 'Image', dataIndex: 'image', key: 'image', width: 80 },
  { title: 'Plat', dataIndex: 'name', key: 'name' },
  { title: 'Catégorie', dataIndex: 'categoryId', key: 'category', width: 140 },
  { title: 'Prix', dataIndex: 'price', key: 'price', width: 120, sorter: (a: Dish, b: Dish) => a.price - b.price },
  { title: 'Statut', dataIndex: 'isAvailable', key: 'status', width: 120 },
  { title: 'Actions', key: 'actions', width: 160, fixed: 'right' },
];

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => { selectedRowKeys.value = keys; },
}));

onMounted(fetchData);
watch(selectedCategory, fetchData);
</script>

<template>
  <div class="dishes-view space-y-6">
    <!-- Header Card with Stats -->
    <a-card class="header-card" :bordered="false">
      <div class="header-gradient">
        <div class="header-content">
          <div class="header-title-row">
            <div class="header-title">
              <div class="title-icon"><FireOutlined /></div>
              <div>
                <h1>Gestion du menu</h1>
                <p>Gérez vos plats et leurs disponibilités</p>
              </div>
            </div>
            <a-button type="primary" size="large" @click="openCreateModal">
              <template #icon><PlusOutlined /></template>
              Ajouter un plat
            </a-button>
          </div>

          <a-row :gutter="[12, 12]" class="stats-row">
            <a-col :xs="12" :sm="8" :md="5">
              <div class="stat-card"><a-statistic :value="stats.total" title="Total" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="5">
              <div class="stat-card success"><a-statistic :value="stats.available" title="Disponibles" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="5">
              <div class="stat-card warning"><a-statistic :value="stats.unavailable" title="Indisponibles" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="5">
              <div class="stat-card"><a-statistic :value="stats.popular" title="Populaires" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }"><template #prefix><StarOutlined /></template></a-statistic></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="stat-card"><a-statistic :value="stats.newDishes" title="Nouveaux" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
          </a-row>
        </div>
      </div>
    </a-card>

    <!-- Filters Card -->
    <a-card :bordered="false">
      <div class="filters-section">
        <div class="filters-row">
          <a-input-search v-model:value="searchQuery" placeholder="Rechercher un plat..." :style="{ width: '300px' }" allow-clear />
          <a-select v-model:value="selectedCategory" :style="{ width: '200px' }" placeholder="Catégorie">
            <a-select-option value="">Toutes les catégories</a-select-option>
            <a-select-option v-for="cat in categories" :key="cat._id" :value="cat._id">{{ cat.name.fr }}</a-select-option>
          </a-select>
          <a-select v-model:value="filterAvailability" :style="{ width: '160px' }">
            <a-select-option v-for="opt in availabilityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
          </a-select>
          <a-select v-model:value="sortBy" :style="{ width: '140px' }">
            <a-select-option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">Trier: {{ opt.label }}</a-select-option>
          </a-select>
          <a-button @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'">
            <template #icon><component :is="sortOrder === 'asc' ? SortAscendingOutlined : SortDescendingOutlined" /></template>
          </a-button>
        </div>

        <div class="filters-row-secondary">
          <div class="diet-filters">
            <a-checkbox-group v-model:value="filterDiet">
              <a-checkbox v-for="diet in dietOptions" :key="diet.id" :value="diet.id">{{ diet.icon }} {{ diet.label }}</a-checkbox>
            </a-checkbox-group>
            <a-button v-if="hasActiveFilters" type="link" size="small" @click="clearFilters">
              <CloseOutlined /> Effacer les filtres
            </a-button>
          </div>

          <a-segmented v-model:value="viewMode" :options="[{ value: 'grid', icon: AppstoreOutlined }, { value: 'list', icon: BarsOutlined }]">
            <template #label="{ icon }"><component :is="icon" /></template>
          </a-segmented>
        </div>

        <!-- Bulk actions -->
        <a-alert v-if="selectedRowKeys.length > 0" type="info" class="mt-4" show-icon>
          <template #message>
            <div class="bulk-actions">
              <span>{{ selectedRowKeys.length }} plat(s) sélectionné(s)</span>
              <a-space>
                <a-button type="primary" size="small" @click="bulkToggleAvailability(true)">Rendre disponibles</a-button>
                <a-button size="small" @click="bulkToggleAvailability(false)">Rendre indisponibles</a-button>
                <a-button type="link" size="small" @click="selectedRowKeys = []">Annuler</a-button>
              </a-space>
            </div>
          </template>
        </a-alert>
      </div>
    </a-card>

    <!-- Loading -->
    <a-card v-if="isLoading" :bordered="false" class="text-center py-16">
      <a-spin size="large" tip="Chargement des plats..." />
    </a-card>

    <!-- Error -->
    <a-result v-else-if="error" status="error" title="Erreur de chargement" :sub-title="error">
      <template #extra><a-button type="primary" @click="fetchData">Réessayer</a-button></template>
    </a-result>

    <!-- Grid View -->
    <div v-else-if="filteredDishes.length > 0 && viewMode === 'grid'" class="dishes-grid">
      <a-row :gutter="[16, 16]">
        <a-col v-for="dish in filteredDishes" :key="dish._id" :xs="24" :sm="12" :lg="8" :xl="6">
          <a-card hoverable class="dish-card" :class="{ unavailable: !dish.isAvailable }">
            <!-- Image -->
            <template #cover>
              <div class="dish-image">
                <a-image v-if="dish.image" :src="dish.image" :alt="dish.name.fr" :preview="false" @click="openPreviewModal(dish)" />
                <div v-else class="dish-placeholder">🍽️</div>
                <div class="dish-badges">
                  <a-tag v-if="!dish.isAvailable" color="red">Indisponible</a-tag>
                  <a-tag v-if="dish.isPopular" color="gold"><StarOutlined /> Populaire</a-tag>
                  <a-tag v-if="dish.isNewDish" color="green">Nouveau</a-tag>
                </div>
                <div class="dish-overlay">
                  <a-space>
                    <a-button shape="circle" @click="openPreviewModal(dish)"><template #icon><EyeOutlined /></template></a-button>
                    <a-button shape="circle" @click="openEditModal(dish)"><template #icon><EditOutlined /></template></a-button>
                    <a-button shape="circle" @click="duplicateDish(dish)"><template #icon><CopyOutlined /></template></a-button>
                  </a-space>
                </div>
              </div>
            </template>

            <a-card-meta>
              <template #title>
                <div class="dish-title-row">
                  <span class="dish-name">{{ dish.name.fr }}</span>
                  <span class="dish-price">{{ formatCurrency(dish.price) }}</span>
                </div>
              </template>
              <template #description>
                <a-tag :color="getCategoryColor(dish.categoryId)" size="small">{{ getCategoryName(dish.categoryId) }}</a-tag>
                <p v-if="dish.description?.fr" class="dish-desc">{{ dish.description.fr }}</p>
                <div class="diet-badges">
                  <span v-if="dish.isVegetarian" title="Végétarien">🥗</span>
                  <span v-if="dish.isVegan" title="Vegan">🌱</span>
                  <span v-if="dish.isGlutenFree" title="Sans gluten">🌾</span>
                  <span v-if="dish.isSpicy" title="Épicé">🌶️</span>
                  <span v-if="dish.preparationTime" class="prep-time"><ClockCircleOutlined /> {{ dish.preparationTime }}min</span>
                </div>
              </template>
            </a-card-meta>

            <template #actions>
              <a-switch :checked="dish.isAvailable" checked-children="Dispo" un-checked-children="Indispo" @change="toggleAvailability(dish)" />
              <a-popconfirm title="Supprimer ce plat ?" ok-text="Supprimer" cancel-text="Annuler" @confirm="confirmDelete(dish); deleteDish()">
                <a-button type="text" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </template>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- List View -->
    <a-card v-else-if="filteredDishes.length > 0 && viewMode === 'list'" :bordered="false">
      <a-table :data-source="filteredDishes" :columns="columns" :row-key="(record: Dish) => record._id" :row-selection="rowSelection" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }: { column: { key: string }, record: Dish }">
          <template v-if="column.key === 'image'">
            <a-avatar shape="square" :size="48" :src="record.image">
              <template #icon v-if="!record.image">🍽️</template>
            </a-avatar>
          </template>
          <template v-else-if="column.key === 'name'">
            <div class="table-dish-info">
              <span class="table-dish-name">{{ record.name.fr }}</span>
              <div class="table-dish-badges">
                <span v-if="record.isPopular" class="badge-star"><StarOutlined /></span>
                <span v-if="record.isNewDish" class="badge-new">✨</span>
                <span v-if="record.isVegetarian">🥗</span>
                <span v-if="record.isVegan">🌱</span>
                <span v-if="record.isSpicy">🌶️</span>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'category'">
            <a-tag :color="getCategoryColor(record.categoryId)">{{ getCategoryName(record.categoryId) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'price'">
            <span class="price-cell">{{ formatCurrency(record.price) }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-switch :checked="record.isAvailable" size="small" @change="toggleAvailability(record)" />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openPreviewModal(record)"><EyeOutlined /></a-button>
              <a-button size="small" @click="openEditModal(record)"><EditOutlined /></a-button>
              <a-button size="small" @click="duplicateDish(record)"><CopyOutlined /></a-button>
              <a-popconfirm title="Supprimer ?" @confirm="confirmDelete(record); deleteDish()">
                <a-button size="small" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Empty State -->
    <a-card v-else :bordered="false">
      <a-empty :description="hasActiveFilters ? 'Aucun plat trouvé' : 'Aucun plat dans le menu'">
        <template #image><span style="font-size: 64px">🍽️</span></template>
        <a-space>
          <a-button v-if="hasActiveFilters" @click="clearFilters">Effacer les filtres</a-button>
          <a-button type="primary" @click="openCreateModal"><PlusOutlined /> Ajouter un plat</a-button>
        </a-space>
      </a-empty>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal v-model:open="showModal" :title="editingDish ? 'Modifier le plat' : 'Nouveau plat'" :width="720" :footer="null" :destroy-on-close="true">
      <a-form layout="vertical" @finish="handleSubmit">
        <!-- Image Upload -->
        <a-form-item label="Image du plat">
          <div class="image-upload-section">
            <div class="image-preview">
              <a-image v-if="imagePreview" :src="imagePreview" :width="128" :height="128" />
              <div v-else class="image-placeholder">🍽️</div>
              <a-button v-if="imagePreview" type="text" danger shape="circle" size="small" class="remove-image" @click="removeImage"><CloseOutlined /></a-button>
            </div>
            <a-upload :show-upload-list="false" :before-upload="() => false" accept="image/jpeg,image/png,image/webp" @change="handleImageChange">
              <a-button><UploadOutlined /> Uploader une image</a-button>
            </a-upload>
            <a-spin v-if="isUploading" tip="Upload en cours..." />
          </div>
        </a-form-item>

        <!-- Name -->
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Nom (FR)" required>
              <a-input v-model:value="formData.name.fr" placeholder="Burger Classic" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nom (EN)">
              <a-input v-model:value="formData.name.en" placeholder="Classic Burger" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Description -->
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Description (FR)">
              <a-textarea v-model:value="formData.description.fr" :rows="3" placeholder="Description en français..." />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Description (EN)">
              <a-textarea v-model:value="formData.description.en" :rows="3" placeholder="Description in English..." />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Price, Category, Prep time -->
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Prix" required>
              <a-input-number v-model:value="formData.price" :min="0" :step="100" style="width: 100%" :addon-after="restaurant?.settings?.currency || 'XOF'" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Catégorie" required>
              <a-select v-model:value="formData.categoryId" style="width: 100%">
                <a-select-option v-for="cat in categories" :key="cat._id" :value="cat._id">{{ cat.name.fr }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Préparation">
              <a-input-number v-model:value="formData.preparationTime" :min="1" style="width: 100%" addon-after="min" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Diet Options -->
        <a-form-item label="Options diététiques">
          <a-space wrap>
            <a-checkbox v-model:checked="formData.isVegetarian">🥗 Végétarien</a-checkbox>
            <a-checkbox v-model:checked="formData.isVegan">🌱 Vegan</a-checkbox>
            <a-checkbox v-model:checked="formData.isGlutenFree">🌾 Sans gluten</a-checkbox>
            <a-checkbox v-model:checked="formData.isSpicy">🌶️ Épicé</a-checkbox>
          </a-space>
          <div v-if="formData.isSpicy" class="spicy-level mt-2">
            <span>Niveau de piment: </span>
            <a-rate v-model:value="formData.spicyLevel" :count="3" character="🌶️" />
          </div>
        </a-form-item>

        <!-- Allergens -->
        <a-form-item label="Allergènes">
          <div class="allergens-grid">
            <a-checkable-tag v-for="allergen in allergenOptions" :key="allergen.id" :checked="formData.allergens.includes(allergen.label)" @change="toggleAllergen(allergen.label)">
              {{ allergen.icon }} {{ allergen.label }}
            </a-checkable-tag>
          </div>
        </a-form-item>

        <!-- Status -->
        <a-form-item label="Statut & Visibilité">
          <a-space wrap>
            <a-checkbox v-model:checked="formData.isAvailable">✓ Disponible</a-checkbox>
            <a-checkbox v-model:checked="formData.isPopular">⭐ Populaire</a-checkbox>
            <a-checkbox v-model:checked="formData.isNewDish">✨ Nouveau</a-checkbox>
          </a-space>
        </a-form-item>

        <!-- Actions -->
        <div class="modal-actions">
          <a-button @click="closeModal">Annuler</a-button>
          <a-button type="primary" html-type="submit" :loading="isSubmitting">
            {{ editingDish ? 'Mettre à jour' : 'Créer le plat' }}
          </a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Preview Modal -->
    <a-modal v-model:open="showPreviewModal" :footer="null" :width="520" :destroy-on-close="true">
      <template v-if="previewDish">
        <div class="preview-image">
          <a-image v-if="previewDish.image" :src="previewDish.image" width="100%" />
          <div v-else class="preview-placeholder">🍽️</div>
          <div class="preview-badges">
            <a-tag v-if="previewDish.isPopular" color="gold"><StarOutlined /> Populaire</a-tag>
            <a-tag v-if="previewDish.isNewDish" color="green">Nouveau</a-tag>
            <a-tag v-if="!previewDish.isAvailable" color="red">Indisponible</a-tag>
          </div>
        </div>

        <div class="preview-content">
          <a-tag :color="getCategoryColor(previewDish.categoryId)">{{ getCategoryName(previewDish.categoryId) }}</a-tag>

          <div class="preview-title-row">
            <h2>{{ previewDish.name.fr }}</h2>
            <span class="preview-price">{{ formatCurrency(previewDish.price) }}</span>
          </div>

          <p v-if="previewDish.description?.fr" class="preview-description">{{ previewDish.description.fr }}</p>

          <div class="preview-diet-badges">
            <a-tag v-if="previewDish.isVegetarian" color="green">🥗 Végétarien</a-tag>
            <a-tag v-if="previewDish.isVegan" color="green">🌱 Vegan</a-tag>
            <a-tag v-if="previewDish.isGlutenFree" color="orange">🌾 Sans gluten</a-tag>
            <a-tag v-if="previewDish.isSpicy" color="red">🌶️ Épicé</a-tag>
            <a-tag v-if="previewDish.preparationTime"><ClockCircleOutlined /> {{ previewDish.preparationTime }} min</a-tag>
          </div>

          <div v-if="previewDish.allergens?.length" class="preview-allergens">
            <p class="allergens-label">Allergènes:</p>
            <a-tag v-for="a in previewDish.allergens" :key="a" size="small">{{ a }}</a-tag>
          </div>

          <div class="preview-actions">
            <a-button @click="closePreviewModal">Fermer</a-button>
            <a-button type="primary" @click="closePreviewModal(); openEditModal(previewDish)">Modifier</a-button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- Delete Modal -->
    <a-modal v-model:open="showDeleteModal" title="Supprimer ce plat ?" :confirm-loading="isSubmitting" ok-text="Supprimer" cancel-text="Annuler" ok-type="danger" @ok="deleteDish">
      <a-alert type="warning" message="Cette action est irréversible" show-icon class="mb-4" />
      <p v-if="dishToDelete">Êtes-vous sûr de vouloir supprimer <strong>{{ dishToDelete.name.fr }}</strong> ?</p>
    </a-modal>
  </div>
</template>

<style scoped>
.dishes-view { max-width: 1400px; margin: 0 auto; }

/* Header Card */
.header-card :deep(.ant-card-body) { padding: 0; }
.header-gradient {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%);
  padding: 24px;
  border-radius: 8px;
}
.header-content { color: white; }
.header-title-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.header-title { display: flex; align-items: center; gap: 16px; }
.title-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.header-title h1 { margin: 0; font-size: 28px; font-weight: bold; color: white; }
.header-title p { margin: 0; opacity: 0.8; font-size: 14px; }

.stats-row { margin-top: 24px; }
.stat-card { background: rgba(255,255,255,0.15); padding: 16px; border-radius: 12px; backdrop-filter: blur(10px); }
.stat-card :deep(.ant-statistic-title) { color: rgba(255,255,255,0.8); font-size: 13px; }
.stat-card.success { background: rgba(34,197,94,0.3); }
.stat-card.warning { background: rgba(245,158,11,0.3); }

/* Filters */
.filters-section { display: flex; flex-direction: column; gap: 16px; }
.filters-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.filters-row-secondary { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.diet-filters { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.bulk-actions { display: flex; justify-content: space-between; align-items: center; }

/* Dishes Grid */
.dishes-grid { margin-top: 0; }
.dish-card { overflow: hidden; }
.dish-card.unavailable { opacity: 0.6; }
.dish-image { position: relative; height: 180px; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); overflow: hidden; }
.dish-image :deep(.ant-image) { width: 100%; height: 100%; }
.dish-image :deep(.ant-image-img) { width: 100%; height: 100%; object-fit: cover; }
.dish-placeholder { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; opacity: 0.5; }
.dish-badges { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 4px; }
.dish-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s;
}
.dish-card:hover .dish-overlay { opacity: 1; }
.dish-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.dish-name { font-weight: 600; color: #1e293b; }
.dish-price { font-weight: bold; color: #f97316; white-space: nowrap; }
.dish-desc { margin: 8px 0; font-size: 13px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.diet-badges { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.prep-time { font-size: 12px; color: #64748b; }

/* Table styles */
.table-dish-info { display: flex; flex-direction: column; gap: 4px; }
.table-dish-name { font-weight: 500; }
.table-dish-badges { display: flex; gap: 4px; font-size: 12px; }
.badge-star { color: #f59e0b; }
.badge-new { color: #22c55e; }
.price-cell { font-weight: 600; color: #f97316; }

/* Image upload */
.image-upload-section { display: flex; align-items: flex-start; gap: 16px; }
.image-preview { position: relative; width: 128px; height: 128px; border-radius: 12px; overflow: hidden; background: #f1f5f9; }
.image-preview :deep(.ant-image) { width: 100%; height: 100%; }
.image-preview :deep(.ant-image-img) { width: 100%; height: 100%; object-fit: cover; }
.image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; }
.remove-image { position: absolute; top: 4px; right: 4px; }

/* Allergens */
.allergens-grid { display: flex; flex-wrap: wrap; gap: 8px; }

/* Modal actions */
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

/* Preview modal */
.preview-image { position: relative; margin: -24px -24px 0; height: 240px; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); }
.preview-image :deep(.ant-image) { width: 100%; height: 100%; }
.preview-image :deep(.ant-image-img) { width: 100%; height: 100%; object-fit: cover; }
.preview-placeholder { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 64px; opacity: 0.5; }
.preview-badges { position: absolute; bottom: 12px; left: 12px; display: flex; gap: 8px; }
.preview-content { padding-top: 16px; }
.preview-title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 12px; }
.preview-title-row h2 { margin: 0; font-size: 24px; }
.preview-price { font-size: 24px; font-weight: bold; color: #f97316; }
.preview-description { margin: 12px 0; color: #64748b; }
.preview-diet-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.preview-allergens { margin-top: 16px; }
.allergens-label { font-size: 13px; color: #64748b; margin-bottom: 8px; }
.preview-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }

/* Responsive */
@media (max-width: 768px) {
  .header-title h1 { font-size: 22px; }
  .filters-row { flex-direction: column; align-items: stretch; }
  .filters-row :deep(.ant-input-search), .filters-row :deep(.ant-select) { width: 100% !important; }
}
</style>
