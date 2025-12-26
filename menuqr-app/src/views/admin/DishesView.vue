<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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

// View and filter options
const viewMode = ref<'grid' | 'list'>('grid');
const sortBy = ref<'name' | 'price' | 'category' | 'date'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const filterAvailability = ref<'all' | 'available' | 'unavailable'>('all');
const filterDiet = ref<string[]>([]);
const selectedDishes = ref<Set<string>>(new Set());

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

// Image upload state
const imageFile = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const isUploading = ref(false);

// Success message
const successMessage = ref<string | null>(null);
let successTimeout: ReturnType<typeof setTimeout> | null = null;

const showSuccess = (message: string) => {
  successMessage.value = message;
  if (successTimeout) clearTimeout(successTimeout);
  successTimeout = setTimeout(() => {
    successMessage.value = null;
  }, 3000);
};

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      error.value = 'Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Le fichier est trop volumineux. Taille maximale: 5MB';
      return;
    }

    imageFile.value = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const removeImage = () => {
  imageFile.value = null;
  imagePreview.value = null;
  formData.value.image = '';
};

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
  } catch (err) {
    error.value = 'Erreur lors du chargement des plats';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const filteredDishes = computed(() => {
  let filtered = dishes.value;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (dish) =>
        dish.name.fr.toLowerCase().includes(query) ||
        dish.name.en?.toLowerCase().includes(query) ||
        dish.description?.fr?.toLowerCase().includes(query)
    );
  }

  // Availability filter
  if (filterAvailability.value !== 'all') {
    filtered = filtered.filter((dish) =>
      filterAvailability.value === 'available' ? dish.isAvailable : !dish.isAvailable
    );
  }

  // Diet filter
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

  // Sorting
  filtered = [...filtered].sort((a, b) => {
    let comparison = 0;
    switch (sortBy.value) {
      case 'name':
        comparison = a.name.fr.localeCompare(b.name.fr);
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'category':
        const catA = getCategoryName(a.categoryId);
        const catB = getCategoryName(b.categoryId);
        comparison = catA.localeCompare(catB);
        break;
      case 'date':
        comparison = a.order - b.order;
        break;
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });

  return filtered;
});

// Stats
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
  if (typeof categoryId === 'object') {
    return categoryId.name.fr;
  }
  const category = categories.value.find((c) => c._id === categoryId);
  return category?.name.fr || 'Sans catégorie';
};

const getCategoryColor = (categoryId: string | { _id: string; name: { fr: string } }) => {
  const catId = typeof categoryId === 'object' ? categoryId._id : categoryId;
  const index = categories.value.findIndex(c => c._id === catId);
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-pink-100 text-pink-700',
    'bg-yellow-100 text-yellow-700',
    'bg-indigo-100 text-indigo-700',
  ];
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
      } catch (uploadErr) {
        error.value = 'Erreur lors de l\'upload de l\'image';
        console.error(uploadErr);
        return;
      } finally {
        isUploading.value = false;
      }
    }

    const data = {
      ...formData.value,
      name: { fr: formData.value.name.fr, en: formData.value.name.en || undefined },
      description:
        formData.value.description.fr || formData.value.description.en
          ? { fr: formData.value.description.fr || undefined, en: formData.value.description.en || undefined }
          : undefined,
      image: imageUrl || undefined,
    };

    if (editingDish.value) {
      const response = await api.updateDish(editingDish.value._id, data);
      if (response.success) {
        await fetchData();
        closeModal();
        showSuccess('Plat mis à jour avec succès');
      }
    } else {
      const response = await api.createDish(data);
      if (response.success) {
        await fetchData();
        closeModal();
        showSuccess('Plat créé avec succès');
      }
    }
  } catch (err) {
    error.value = 'Erreur lors de la sauvegarde';
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
      showSuccess(dish.isAvailable ? 'Plat disponible' : 'Plat indisponible');
    }
  } catch (err) {
    console.error(err);
  }
};

const confirmDelete = (dish: Dish) => {
  dishToDelete.value = dish;
  showDeleteModal.value = true;
};

const deleteDish = async () => {
  if (!dishToDelete.value) return;

  try {
    const response = await api.deleteDish(dishToDelete.value._id);
    if (response.success) {
      await fetchData();
      closeDeleteModal();
      showSuccess('Plat supprimé avec succès');
    }
  } catch (err) {
    error.value = 'Erreur lors de la suppression';
    console.error(err);
  }
};

const toggleAllergen = (allergen: string) => {
  const index = formData.value.allergens.indexOf(allergen);
  if (index === -1) {
    formData.value.allergens.push(allergen);
  } else {
    formData.value.allergens.splice(index, 1);
  }
};

const toggleDietFilter = (diet: string) => {
  const index = filterDiet.value.indexOf(diet);
  if (index === -1) {
    filterDiet.value.push(diet);
  } else {
    filterDiet.value.splice(index, 1);
  }
};

const toggleSelectDish = (dishId: string) => {
  if (selectedDishes.value.has(dishId)) {
    selectedDishes.value.delete(dishId);
  } else {
    selectedDishes.value.add(dishId);
  }
  selectedDishes.value = new Set(selectedDishes.value);
};

const toggleSelectAll = () => {
  if (selectedDishes.value.size === filteredDishes.value.length) {
    selectedDishes.value.clear();
  } else {
    filteredDishes.value.forEach(dish => selectedDishes.value.add(dish._id));
  }
  selectedDishes.value = new Set(selectedDishes.value);
};

const bulkToggleAvailability = async (available: boolean) => {
  try {
    const promises = Array.from(selectedDishes.value).map(async (id) => {
      const dish = dishes.value.find(d => d._id === id);
      if (dish && dish.isAvailable !== available) {
        await api.toggleDishAvailability(id);
      }
    });
    await Promise.all(promises);
    await fetchData();
    selectedDishes.value.clear();
    showSuccess(`${promises.length} plat(s) mis à jour`);
  } catch (err) {
    console.error(err);
  }
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

onMounted(fetchData);

watch(selectedCategory, () => {
  fetchData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Success Toast -->
    <Transition name="toast">
      <div
        v-if="successMessage"
        class="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-white shadow-lg"
      >
        <span class="text-lg">✅</span>
        <span class="font-medium">{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Header with stats -->
    <div class="rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-6 text-white shadow-lg">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-2xl font-bold">Gestion du menu</h2>
          <p class="mt-1 text-orange-100">Gérez vos plats et leurs disponibilités</p>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-orange-600 shadow-md transition-all hover:bg-orange-50"
          @click="openCreateModal"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Ajouter un plat
        </button>
      </div>

      <!-- Stats -->
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.total }}</p>
          <p class="text-sm text-orange-100">Total</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.available }}</p>
          <p class="text-sm text-orange-100">Disponibles</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.unavailable }}</p>
          <p class="text-sm text-orange-100">Indisponibles</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.popular }}</p>
          <p class="text-sm text-orange-100">Populaires</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.newDishes }}</p>
          <p class="text-sm text-orange-100">Nouveaux</p>
        </div>
      </div>
    </div>

    <!-- Filters and View Options -->
    <div class="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <!-- Search and main filters -->
      <div class="flex flex-col gap-4 lg:flex-row">
        <div class="relative flex-1">
          <svg class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un plat..."
            class="w-full rounded-xl border-0 bg-gray-100 py-3 pl-12 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <select
          v-model="selectedCategory"
          class="rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Toutes les catégories</option>
          <option v-for="cat in categories" :key="cat._id" :value="cat._id">
            {{ cat.name.fr }}
          </option>
        </select>

        <select
          v-model="filterAvailability"
          class="rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">Indisponibles</option>
        </select>

        <div class="flex gap-2">
          <select
            v-model="sortBy"
            class="rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
          >
            <option value="name">Trier par nom</option>
            <option value="price">Trier par prix</option>
            <option value="category">Trier par catégorie</option>
          </select>
          <button
            class="rounded-xl bg-gray-100 p-3 transition-colors hover:bg-gray-200"
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
            :title="sortOrder === 'asc' ? 'Croissant' : 'Décroissant'"
          >
            <svg class="h-5 w-5 text-gray-600 transition-transform" :class="{ 'rotate-180': sortOrder === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Diet filters and view toggle -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="diet in dietOptions"
            :key="diet.id"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
            :class="filterDiet.includes(diet.id) ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            @click="toggleDietFilter(diet.id)"
          >
            <span>{{ diet.icon }}</span>
            {{ diet.label }}
          </button>

          <button
            v-if="hasActiveFilters"
            class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            @click="clearFilters"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Effacer les filtres
          </button>
        </div>

        <div class="flex items-center gap-2 rounded-xl bg-gray-100 p-1">
          <button
            class="rounded-lg p-2 transition-colors"
            :class="viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'"
            @click="viewMode = 'grid'"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            class="rounded-lg p-2 transition-colors"
            :class="viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'"
            @click="viewMode = 'list'"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Bulk actions -->
      <div v-if="selectedDishes.size > 0" class="flex items-center gap-4 rounded-xl bg-orange-50 p-3">
        <span class="text-sm font-medium text-orange-700">{{ selectedDishes.size }} plat(s) sélectionné(s)</span>
        <div class="flex gap-2">
          <button
            class="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500"
            @click="bulkToggleAvailability(true)"
          >
            Rendre disponibles
          </button>
          <button
            class="rounded-lg bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-500"
            @click="bulkToggleAvailability(false)"
          >
            Rendre indisponibles
          </button>
          <button
            class="text-sm text-gray-500 hover:text-gray-700"
            @click="selectedDishes.clear(); selectedDishes = new Set(selectedDishes)"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-16 w-16 rounded-full border-4 border-orange-200"></div>
        <div class="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </div>
      <p class="mt-4 text-gray-500">Chargement des plats...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-6 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p class="text-red-700">{{ error }}</p>
      <button class="mt-4 font-medium text-red-600 underline" @click="fetchData">Réessayer</button>
    </div>

    <!-- Grid view -->
    <div v-else-if="filteredDishes.length > 0 && viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <TransitionGroup name="dish-list">
        <div
          v-for="dish in filteredDishes"
          :key="dish._id"
          class="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
          :class="{ 'ring-2 ring-orange-500': selectedDishes.has(dish._id) }"
        >
          <!-- Selection checkbox -->
          <button
            class="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all"
            :class="selectedDishes.has(dish._id) ? 'bg-orange-600 text-white' : 'bg-white/90 text-gray-400 opacity-0 group-hover:opacity-100'"
            @click.stop="toggleSelectDish(dish._id)"
          >
            <svg v-if="selectedDishes.has(dish._id)" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>

          <!-- Image -->
          <div class="relative h-44 overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200">
            <img
              v-if="dish.image"
              :src="dish.image"
              :alt="dish.name.fr"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div v-else class="flex h-full items-center justify-center">
              <span class="text-5xl opacity-50">🍽️</span>
            </div>

            <!-- Status badges -->
            <div class="absolute right-2 top-2 flex flex-col gap-1">
              <span v-if="!dish.isAvailable" class="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                Indisponible
              </span>
              <span v-if="dish.isPopular" class="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                ⭐ Populaire
              </span>
              <span v-if="dish.isNewDish" class="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                ✨ Nouveau
              </span>
            </div>

            <!-- Quick actions overlay -->
            <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                class="rounded-full bg-white p-2.5 text-gray-700 shadow-lg transition-transform hover:scale-110 hover:bg-orange-50"
                @click="openPreviewModal(dish)"
                title="Aperçu"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                class="rounded-full bg-white p-2.5 text-gray-700 shadow-lg transition-transform hover:scale-110 hover:bg-orange-50"
                @click="openEditModal(dish)"
                title="Modifier"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="rounded-full bg-white p-2.5 text-gray-700 shadow-lg transition-transform hover:scale-110 hover:bg-orange-50"
                @click="duplicateDish(dish)"
                title="Dupliquer"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="p-4">
            <!-- Category badge -->
            <span class="mb-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="getCategoryColor(dish.categoryId)">
              {{ getCategoryName(dish.categoryId) }}
            </span>

            <div class="mb-2 flex items-start justify-between gap-2">
              <h3 class="font-semibold text-gray-900 line-clamp-1">{{ dish.name.fr }}</h3>
              <span class="flex-shrink-0 text-lg font-bold text-orange-600">{{ formatCurrency(dish.price) }}</span>
            </div>

            <p v-if="dish.description?.fr" class="mb-3 text-sm text-gray-500 line-clamp-2">
              {{ dish.description.fr }}
            </p>

            <!-- Diet badges -->
            <div class="mb-3 flex flex-wrap gap-1">
              <span v-if="dish.isVegetarian" class="rounded-lg bg-green-100 px-2 py-0.5 text-xs text-green-700">🥗 Végé</span>
              <span v-if="dish.isVegan" class="rounded-lg bg-green-100 px-2 py-0.5 text-xs text-green-700">🌱 Vegan</span>
              <span v-if="dish.isGlutenFree" class="rounded-lg bg-amber-100 px-2 py-0.5 text-xs text-amber-700">🌾 Sans gluten</span>
              <span v-if="dish.isSpicy" class="rounded-lg bg-red-100 px-2 py-0.5 text-xs text-red-700">
                🌶️ {{ '🌶️'.repeat(dish.spicyLevel || 1) }}
              </span>
              <span v-if="dish.preparationTime" class="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                ⏱️ {{ dish.preparationTime }}min
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between border-t border-gray-100 pt-3">
              <button
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                :class="dish.isAvailable
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="toggleAvailability(dish)"
              >
                {{ dish.isAvailable ? '✓ Disponible' : '○ Indisponible' }}
              </button>

              <button
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                @click="confirmDelete(dish)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- List view -->
    <div v-else-if="filteredDishes.length > 0 && viewMode === 'list'" class="space-y-2">
      <!-- Header -->
      <div class="hidden items-center gap-4 rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 lg:flex">
        <button class="w-8" @click="toggleSelectAll">
          <div
            class="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors"
            :class="selectedDishes.size === filteredDishes.length && filteredDishes.length > 0 ? 'border-orange-600 bg-orange-600' : 'border-gray-300'"
          >
            <svg v-if="selectedDishes.size === filteredDishes.length && filteredDishes.length > 0" class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
        <span class="w-16">Image</span>
        <span class="flex-1">Plat</span>
        <span class="w-32">Catégorie</span>
        <span class="w-24 text-right">Prix</span>
        <span class="w-28 text-center">Statut</span>
        <span class="w-32 text-right">Actions</span>
      </div>

      <TransitionGroup name="dish-list">
        <div
          v-for="dish in filteredDishes"
          :key="dish._id"
          class="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md lg:flex-row lg:items-center"
          :class="{ 'ring-2 ring-orange-500': selectedDishes.has(dish._id) }"
        >
          <button class="hidden w-8 lg:block" @click="toggleSelectDish(dish._id)">
            <div
              class="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors"
              :class="selectedDishes.has(dish._id) ? 'border-orange-600 bg-orange-600' : 'border-gray-300'"
            >
              <svg v-if="selectedDishes.has(dish._id)" class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </button>

          <div class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-orange-100">
            <img
              v-if="dish.image"
              :src="dish.image"
              :alt="dish.name.fr"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full items-center justify-center text-2xl">🍽️</div>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900">{{ dish.name.fr }}</h3>
              <span v-if="dish.isPopular" class="text-yellow-500">⭐</span>
              <span v-if="dish.isNewDish" class="text-green-500">✨</span>
            </div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span v-if="dish.isVegetarian" class="text-xs text-green-600">🥗</span>
              <span v-if="dish.isVegan" class="text-xs text-green-600">🌱</span>
              <span v-if="dish.isGlutenFree" class="text-xs text-amber-600">🌾</span>
              <span v-if="dish.isSpicy" class="text-xs text-red-600">🌶️</span>
            </div>
          </div>

          <span class="w-32 rounded-full px-2 py-1 text-center text-xs font-medium" :class="getCategoryColor(dish.categoryId)">
            {{ getCategoryName(dish.categoryId) }}
          </span>

          <span class="w-24 text-right text-lg font-bold text-orange-600">{{ formatCurrency(dish.price) }}</span>

          <div class="w-28 text-center">
            <button
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
              :class="dish.isAvailable
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="toggleAvailability(dish)"
            >
              {{ dish.isAvailable ? '✓ Dispo' : '○ Indispo' }}
            </button>
          </div>

          <div class="flex w-32 justify-end gap-1">
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              @click="openPreviewModal(dish)"
              title="Aperçu"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              @click="openEditModal(dish)"
              title="Modifier"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              @click="duplicateDish(dish)"
              title="Dupliquer"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-red-100 hover:text-red-600"
              @click="confirmDelete(dish)"
              title="Supprimer"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Empty state -->
    <div v-else class="rounded-2xl bg-white p-16 text-center shadow-sm">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
        <span class="text-4xl">🍽️</span>
      </div>
      <h3 class="text-xl font-semibold text-gray-900">
        {{ hasActiveFilters ? 'Aucun plat trouvé' : 'Aucun plat' }}
      </h3>
      <p class="mt-2 text-gray-500">
        {{ hasActiveFilters ? 'Essayez de modifier vos filtres' : 'Commencez par ajouter des plats à votre menu.' }}
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <button
          v-if="hasActiveFilters"
          class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="clearFilters"
        >
          Effacer les filtres
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500"
          @click="openCreateModal"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Ajouter un plat
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h3 class="text-xl font-bold text-gray-900">
                  {{ editingDish ? 'Modifier le plat' : 'Nouveau plat' }}
                </h3>
                <p class="text-sm text-gray-500">Remplissez les informations du plat</p>
              </div>
              <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeModal">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form class="max-h-[calc(90vh-140px)] space-y-6 overflow-y-auto p-6" @submit.prevent="handleSubmit">
              <!-- Image Upload -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Image du plat</label>
                <div class="flex items-start gap-4">
                  <div class="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                    <img
                      v-if="imagePreview"
                      :src="imagePreview"
                      alt="Preview"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full items-center justify-center text-4xl">🍽️</div>
                    <button
                      v-if="imagePreview"
                      type="button"
                      class="absolute -right-2 -top-2 rounded-full bg-red-500 p-1.5 text-white shadow-md hover:bg-red-600"
                      @click="removeImage"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div class="flex-1">
                    <label class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 transition-colors hover:border-orange-400 hover:bg-orange-50">
                      <svg class="mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span class="text-sm font-medium text-gray-600">Cliquez pour uploader</span>
                      <span class="mt-1 text-xs text-gray-500">JPG, PNG ou WebP (max 5MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        class="hidden"
                        @change="handleImageChange"
                      />
                    </label>
                    <p v-if="isUploading" class="mt-2 flex items-center gap-2 text-sm text-orange-600">
                      <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Upload en cours...
                    </p>
                  </div>
                </div>
              </div>

              <!-- Name -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Nom (FR) *</label>
                  <input
                    v-model="formData.name.fr"
                    type="text"
                    required
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    placeholder="Burger Classic"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Nom (EN)</label>
                  <input
                    v-model="formData.name.en"
                    type="text"
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    placeholder="Classic Burger"
                  />
                </div>
              </div>

              <!-- Description -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Description (FR)</label>
                  <textarea
                    v-model="formData.description.fr"
                    rows="3"
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    placeholder="Description en français..."
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Description (EN)</label>
                  <textarea
                    v-model="formData.description.en"
                    rows="3"
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    placeholder="Description in English..."
                  />
                </div>
              </div>

              <!-- Price, Category, Prep time -->
              <div class="grid gap-4 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Prix *</label>
                  <div class="relative">
                    <input
                      v-model.number="formData.price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 pr-16 focus:bg-white focus:ring-2 focus:ring-orange-500"
                      placeholder="0.00"
                    />
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {{ restaurant?.settings?.currency || 'XOF' }}
                    </span>
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Catégorie *</label>
                  <select
                    v-model="formData.categoryId"
                    required
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="" disabled>Sélectionner</option>
                    <option v-for="cat in categories" :key="cat._id" :value="cat._id">
                      {{ cat.name.fr }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Préparation</label>
                  <div class="relative">
                    <input
                      v-model.number="formData.preparationTime"
                      type="number"
                      min="1"
                      class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 pr-12 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    />
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">min</span>
                  </div>
                </div>
              </div>

              <!-- Diet options -->
              <div>
                <label class="mb-3 block text-sm font-medium text-gray-700">Options diététiques</label>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="diet in dietOptions"
                    :key="diet.id"
                    class="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 transition-all"
                    :class="formData[diet.key as keyof typeof formData] ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                  >
                    <input
                      :checked="formData[diet.key as keyof typeof formData] as boolean"
                      type="checkbox"
                      class="sr-only"
                      @change="formData[diet.key as keyof typeof formData] = !formData[diet.key as keyof typeof formData] as never"
                    />
                    <span>{{ diet.icon }}</span>
                    <span class="text-sm font-medium">{{ diet.label }}</span>
                  </label>
                </div>

                <!-- Spicy level -->
                <div v-if="formData.isSpicy" class="mt-3 flex items-center gap-3">
                  <span class="text-sm text-gray-600">Niveau de piment:</span>
                  <div class="flex gap-1">
                    <button
                      v-for="level in [1, 2, 3]"
                      :key="level"
                      type="button"
                      class="text-2xl transition-transform hover:scale-110"
                      :class="formData.spicyLevel >= level ? 'opacity-100' : 'opacity-30'"
                      @click="formData.spicyLevel = level"
                    >
                      🌶️
                    </button>
                  </div>
                </div>
              </div>

              <!-- Allergens -->
              <div>
                <label class="mb-3 block text-sm font-medium text-gray-700">Allergènes</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="allergen in allergenOptions"
                    :key="allergen.id"
                    type="button"
                    class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
                    :class="formData.allergens.includes(allergen.label)
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                    @click="toggleAllergen(allergen.label)"
                  >
                    <span>{{ allergen.icon }}</span>
                    {{ allergen.label }}
                  </button>
                </div>
              </div>

              <!-- Status options -->
              <div>
                <label class="mb-3 block text-sm font-medium text-gray-700">Statut & Visibilité</label>
                <div class="flex flex-wrap gap-3">
                  <label class="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 transition-all hover:bg-gray-200" :class="{ 'bg-green-100 ring-2 ring-green-500': formData.isAvailable }">
                    <input v-model="formData.isAvailable" type="checkbox" class="sr-only" />
                    <span class="text-lg">✓</span>
                    <span class="text-sm font-medium">Disponible</span>
                  </label>
                  <label class="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 transition-all hover:bg-gray-200" :class="{ 'bg-yellow-100 ring-2 ring-yellow-500': formData.isPopular }">
                    <input v-model="formData.isPopular" type="checkbox" class="sr-only" />
                    <span class="text-lg">⭐</span>
                    <span class="text-sm font-medium">Populaire</span>
                  </label>
                  <label class="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 transition-all hover:bg-gray-200" :class="{ 'bg-green-100 ring-2 ring-green-500': formData.isNewDish }">
                    <input v-model="formData.isNewDish" type="checkbox" class="sr-only" />
                    <span class="text-lg">✨</span>
                    <span class="text-sm font-medium">Nouveau</span>
                  </label>
                </div>
              </div>
            </form>

            <!-- Actions footer -->
            <div class="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <button
                type="button"
                class="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="closeModal"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:bg-orange-300"
                @click="handleSubmit"
              >
                <svg v-if="isSubmitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ editingDish ? 'Mettre à jour' : 'Créer le plat' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteModal && dishToDelete"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closeDeleteModal"
        >
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div class="mb-6 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <span class="text-3xl">🗑️</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Supprimer ce plat ?</h3>
              <p class="mt-2 text-gray-500">
                Êtes-vous sûr de vouloir supprimer <strong>{{ dishToDelete.name.fr }}</strong> ?
                Cette action est irréversible.
              </p>
            </div>

            <div class="flex gap-3">
              <button
                class="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="closeDeleteModal"
              >
                Annuler
              </button>
              <button
                class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
                @click="deleteDish"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Preview Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showPreviewModal && previewDish"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closePreviewModal"
        >
          <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <!-- Image -->
            <div class="relative h-64 bg-gradient-to-br from-orange-100 to-orange-200">
              <img
                v-if="previewDish.image"
                :src="previewDish.image"
                :alt="previewDish.name.fr"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full items-center justify-center">
                <span class="text-6xl opacity-50">🍽️</span>
              </div>
              <button
                class="absolute right-4 top-4 rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
                @click="closePreviewModal"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <!-- Badges -->
              <div class="absolute bottom-4 left-4 flex flex-wrap gap-2">
                <span v-if="previewDish.isPopular" class="rounded-full bg-yellow-500 px-3 py-1 text-sm font-medium text-white">⭐ Populaire</span>
                <span v-if="previewDish.isNewDish" class="rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white">✨ Nouveau</span>
                <span v-if="!previewDish.isAvailable" class="rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white">Indisponible</span>
              </div>
            </div>

            <div class="p-6">
              <!-- Category -->
              <span class="inline-flex rounded-full px-3 py-1 text-sm font-medium" :class="getCategoryColor(previewDish.categoryId)">
                {{ getCategoryName(previewDish.categoryId) }}
              </span>

              <!-- Name & Price -->
              <div class="mt-3 flex items-start justify-between">
                <h3 class="text-2xl font-bold text-gray-900">{{ previewDish.name.fr }}</h3>
                <span class="text-2xl font-bold text-orange-600">{{ formatCurrency(previewDish.price) }}</span>
              </div>

              <!-- Description -->
              <p v-if="previewDish.description?.fr" class="mt-3 text-gray-600">{{ previewDish.description.fr }}</p>

              <!-- Diet badges -->
              <div class="mt-4 flex flex-wrap gap-2">
                <span v-if="previewDish.isVegetarian" class="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">🥗 Végétarien</span>
                <span v-if="previewDish.isVegan" class="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">🌱 Vegan</span>
                <span v-if="previewDish.isGlutenFree" class="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">🌾 Sans gluten</span>
                <span v-if="previewDish.isSpicy" class="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700">
                  🌶️ Épicé {{ '🌶️'.repeat((previewDish.spicyLevel || 1) - 1) }}
                </span>
                <span v-if="previewDish.preparationTime" class="rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700">
                  ⏱️ {{ previewDish.preparationTime }} min
                </span>
              </div>

              <!-- Allergens -->
              <div v-if="previewDish.allergens && previewDish.allergens.length > 0" class="mt-4">
                <p class="mb-2 text-sm font-medium text-gray-500">Allergènes:</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="allergen in previewDish.allergens"
                    :key="allergen"
                    class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {{ allergen }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-6 flex gap-3">
                <button
                  class="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  @click="closePreviewModal"
                >
                  Fermer
                </button>
                <button
                  class="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-500"
                  @click="closePreviewModal(); openEditModal(previewDish)"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Toast animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}

/* Dish list transitions */
.dish-list-enter-active,
.dish-list-leave-active {
  transition: all 0.3s ease;
}

.dish-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dish-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.dish-list-move {
  transition: transform 0.3s ease;
}

/* Line clamp */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
