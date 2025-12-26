<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api, { type Category, type Dish } from '@/services/api';

const isLoading = ref(true);
const error = ref<string | null>(null);
const categories = ref<Category[]>([]);
const dishes = ref<Dish[]>([]);
const showModal = ref(false);
const showDeleteModal = ref(false);
const showPreviewModal = ref(false);
const isSubmitting = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryToDelete = ref<Category | null>(null);
const previewCategory = ref<Category | null>(null);
const isDragging = ref(false);
const draggedIndex = ref<number | null>(null);

// View and filter options
const viewMode = ref<'cards' | 'list'>('cards');
const searchQuery = ref('');

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

const formData = ref({
  name: { fr: '', en: '' },
  description: { fr: '', en: '' },
  icon: '',
  isActive: true,
});

// Emoji icon options organized by category
const iconCategories = [
  {
    label: 'Plats principaux',
    icons: [
      { value: '🍛', label: 'Curry' },
      { value: '🍲', label: 'Ragoût' },
      { value: '🍜', label: 'Nouilles' },
      { value: '🍝', label: 'Spaghetti' },
      { value: '🍚', label: 'Riz' },
      { value: '🍱', label: 'Bento' },
      { value: '🥘', label: 'Tajine' },
      { value: '🫕', label: 'Fondue' },
      { value: '🥗', label: 'Salade' },
      { value: '🥙', label: 'Pita' },
      { value: '🌯', label: 'Burrito' },
      { value: '🌮', label: 'Taco' },
    ],
  },
  {
    label: 'Viandes & Grillades',
    icons: [
      { value: '🍖', label: 'Viande' },
      { value: '🍗', label: 'Poulet' },
      { value: '🥩', label: 'Steak' },
      { value: '🍔', label: 'Burger' },
      { value: '🌭', label: 'Hot-dog' },
      { value: '🥓', label: 'Bacon' },
      { value: '🍕', label: 'Pizza' },
      { value: '🥪', label: 'Sandwich' },
    ],
  },
  {
    label: 'Poissons & Fruits de mer',
    icons: [
      { value: '🐟', label: 'Poisson' },
      { value: '🍣', label: 'Sushi' },
      { value: '🦐', label: 'Crevette' },
      { value: '🦞', label: 'Homard' },
      { value: '🦀', label: 'Crabe' },
      { value: '🦑', label: 'Calamars' },
      { value: '🐙', label: 'Poulpe' },
      { value: '🦪', label: 'Huître' },
    ],
  },
  {
    label: 'Petit-déjeuner',
    icons: [
      { value: '🍳', label: 'Œufs' },
      { value: '🥞', label: 'Pancakes' },
      { value: '🧇', label: 'Gaufre' },
      { value: '🥐', label: 'Croissant' },
      { value: '🥯', label: 'Bagel' },
      { value: '🍞', label: 'Pain' },
      { value: '🥖', label: 'Baguette' },
      { value: '🧈', label: 'Beurre' },
    ],
  },
  {
    label: 'Accompagnements',
    icons: [
      { value: '🍟', label: 'Frites' },
      { value: '🥔', label: 'Pomme de terre' },
      { value: '🌽', label: 'Maïs' },
      { value: '🥕', label: 'Carotte' },
      { value: '🥦', label: 'Brocoli' },
      { value: '🧅', label: 'Oignon' },
      { value: '🍠', label: 'Patate douce' },
      { value: '🫘', label: 'Haricots' },
    ],
  },
  {
    label: 'Desserts & Sucreries',
    icons: [
      { value: '🍨', label: 'Glace' },
      { value: '🍧', label: 'Granité' },
      { value: '🍰', label: 'Gâteau' },
      { value: '🎂', label: 'Anniversaire' },
      { value: '🧁', label: 'Cupcake' },
      { value: '🍩', label: 'Donut' },
      { value: '🍪', label: 'Cookie' },
      { value: '🥧', label: 'Tarte' },
      { value: '🍫', label: 'Chocolat' },
      { value: '🍬', label: 'Bonbon' },
      { value: '🍭', label: 'Sucette' },
      { value: '🍮', label: 'Flan' },
    ],
  },
  {
    label: 'Fruits',
    icons: [
      { value: '🍎', label: 'Pomme' },
      { value: '🍊', label: 'Orange' },
      { value: '🍋', label: 'Citron' },
      { value: '🍌', label: 'Banane' },
      { value: '🍇', label: 'Raisin' },
      { value: '🍓', label: 'Fraise' },
      { value: '🍑', label: 'Pêche' },
      { value: '🥭', label: 'Mangue' },
      { value: '🍍', label: 'Ananas' },
      { value: '🥥', label: 'Noix de coco' },
      { value: '🍉', label: 'Pastèque' },
      { value: '🫐', label: 'Myrtille' },
    ],
  },
  {
    label: 'Boissons',
    icons: [
      { value: '🥤', label: 'Soda' },
      { value: '🧃', label: 'Jus' },
      { value: '☕', label: 'Café' },
      { value: '🍵', label: 'Thé' },
      { value: '🧋', label: 'Bubble tea' },
      { value: '🥛', label: 'Lait' },
      { value: '🍺', label: 'Bière' },
      { value: '🍷', label: 'Vin' },
      { value: '🍹', label: 'Cocktail' },
      { value: '🥂', label: 'Champagne' },
      { value: '🍸', label: 'Martini' },
      { value: '🧊', label: 'Glaçon' },
    ],
  },
  {
    label: 'Spécialités',
    icons: [
      { value: '🥡', label: 'Takeaway' },
      { value: '🥢', label: 'Baguettes' },
      { value: '🍽️', label: 'Assiette' },
      { value: '🥣', label: 'Bol' },
      { value: '🫔', label: 'Tamale' },
      { value: '🧆', label: 'Falafel' },
      { value: '🥮', label: 'Mooncake' },
      { value: '🍘', label: 'Senbei' },
      { value: '🍙', label: 'Onigiri' },
      { value: '🍥', label: 'Narutomaki' },
      { value: '🥟', label: 'Dumpling' },
      { value: '🫓', label: 'Flatbread' },
    ],
  },
  {
    label: 'Épices & Condiments',
    icons: [
      { value: '🌶️', label: 'Piment' },
      { value: '🧄', label: 'Ail' },
      { value: '🧂', label: 'Sel' },
      { value: '🫚', label: 'Gingembre' },
      { value: '🌿', label: 'Herbes' },
      { value: '🍯', label: 'Miel' },
    ],
  },
];

// Flatten for easier searching
const allIcons = iconCategories.flatMap(cat => cat.icons);

// Get dishes count per category
const getDishesCount = (categoryId: string) => {
  return dishes.value.filter(d => {
    const catId = typeof d.categoryId === 'object' ? d.categoryId._id : d.categoryId;
    return catId === categoryId;
  }).length;
};

// Get dishes for a category
const getCategoryDishes = (categoryId: string) => {
  return dishes.value.filter(d => {
    const catId = typeof d.categoryId === 'object' ? d.categoryId._id : d.categoryId;
    return catId === categoryId;
  });
};

// Stats
const stats = computed(() => ({
  total: categories.value.length,
  active: categories.value.filter(c => c.isActive).length,
  inactive: categories.value.filter(c => !c.isActive).length,
  totalDishes: dishes.value.length,
}));

// Filtered categories
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value;
  const query = searchQuery.value.toLowerCase();
  return categories.value.filter(
    c => c.name.fr.toLowerCase().includes(query) ||
         c.name.en?.toLowerCase().includes(query) ||
         c.description?.fr?.toLowerCase().includes(query)
  );
});

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [categoriesResponse, dishesResponse] = await Promise.all([
      api.getMyCategories(),
      api.getMyDishes(),
    ]);

    if (categoriesResponse.success && categoriesResponse.data) {
      categories.value = categoriesResponse.data.sort((a, b) => a.order - b.order);
    }

    if (dishesResponse.success && dishesResponse.data) {
      dishes.value = dishesResponse.data;
    }
  } catch (err) {
    error.value = 'Erreur lors du chargement des catégories';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const openCreateModal = () => {
  editingCategory.value = null;
  formData.value = {
    name: { fr: '', en: '' },
    description: { fr: '', en: '' },
    icon: '',
    isActive: true,
  };
  showModal.value = true;
};

const openEditModal = (category: Category) => {
  editingCategory.value = category;
  formData.value = {
    name: { fr: category.name.fr, en: category.name.en || '' },
    description: { fr: category.description?.fr || '', en: category.description?.en || '' },
    icon: category.icon || '',
    isActive: category.isActive,
  };
  showModal.value = true;
};

const duplicateCategory = (category: Category) => {
  editingCategory.value = null;
  formData.value = {
    name: { fr: `${category.name.fr} (copie)`, en: category.name.en ? `${category.name.en} (copy)` : '' },
    description: { fr: category.description?.fr || '', en: category.description?.en || '' },
    icon: category.icon || '',
    isActive: true,
  };
  showModal.value = true;
};

const openPreviewModal = (category: Category) => {
  previewCategory.value = category;
  showPreviewModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingCategory.value = null;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  categoryToDelete.value = null;
};

const closePreviewModal = () => {
  showPreviewModal.value = false;
  previewCategory.value = null;
};

const handleSubmit = async () => {
  isSubmitting.value = true;
  error.value = null;

  try {
    const data = {
      ...formData.value,
      name: { fr: formData.value.name.fr, en: formData.value.name.en || undefined },
      description:
        formData.value.description.fr || formData.value.description.en
          ? { fr: formData.value.description.fr || undefined, en: formData.value.description.en || undefined }
          : undefined,
      icon: formData.value.icon || undefined,
    };

    if (editingCategory.value) {
      const response = await api.updateCategory(editingCategory.value._id, data);
      if (response.success) {
        await fetchData();
        closeModal();
        showSuccess('Catégorie mise à jour avec succès');
      }
    } else {
      const response = await api.createCategory(data);
      if (response.success) {
        await fetchData();
        closeModal();
        showSuccess('Catégorie créée avec succès');
      }
    }
  } catch (err) {
    error.value = 'Erreur lors de la sauvegarde';
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
};

const confirmDelete = (category: Category) => {
  categoryToDelete.value = category;
  showDeleteModal.value = true;
};

const deleteCategory = async () => {
  if (!categoryToDelete.value) return;

  try {
    const response = await api.deleteCategory(categoryToDelete.value._id);
    if (response.success) {
      await fetchData();
      closeDeleteModal();
      showSuccess('Catégorie supprimée avec succès');
    }
  } catch (err) {
    error.value = 'Erreur lors de la suppression';
    console.error(err);
  }
};

const toggleActive = async (category: Category) => {
  try {
    const response = await api.updateCategory(category._id, { isActive: !category.isActive });
    if (response.success) {
      category.isActive = !category.isActive;
      showSuccess(category.isActive ? 'Catégorie activée' : 'Catégorie désactivée');
    }
  } catch (err) {
    console.error(err);
  }
};

// Drag and drop handlers
const handleDragStart = (index: number) => {
  isDragging.value = true;
  draggedIndex.value = index;
};

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === index) return;

  const newCategories = [...categories.value];
  const draggedItem = newCategories[draggedIndex.value];
  if (!draggedItem) return;
  newCategories.splice(draggedIndex.value, 1);
  newCategories.splice(index, 0, draggedItem);
  categories.value = newCategories;
  draggedIndex.value = index;
};

const handleDragEnd = async () => {
  isDragging.value = false;
  draggedIndex.value = null;

  try {
    const reorderData = categories.value.map((cat, index) => ({
      id: cat._id,
      order: index,
    }));
    await api.reorderCategories(reorderData);
    showSuccess('Ordre mis à jour');
  } catch (err) {
    console.error(err);
    await fetchData();
  }
};

// Color palette for categories
const categoryColors = [
  { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  { bg: 'bg-teal-500', light: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
];

const getCategoryColor = (index: number) => categoryColors[index % categoryColors.length];

onMounted(fetchData);
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
    <div class="rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 p-6 text-white shadow-lg">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-2xl font-bold">Gestion des catégories</h2>
          <p class="mt-1 text-purple-100">Organisez votre menu en catégories</p>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-600 shadow-md transition-all hover:bg-purple-50"
          @click="openCreateModal"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nouvelle catégorie
        </button>
      </div>

      <!-- Stats -->
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.total }}</p>
          <p class="text-sm text-purple-100">Total</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.active }}</p>
          <p class="text-sm text-purple-100">Actives</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.inactive }}</p>
          <p class="text-sm text-purple-100">Inactives</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.totalDishes }}</p>
          <p class="text-sm text-purple-100">Plats total</p>
        </div>
      </div>
    </div>

    <!-- Filters and View Options -->
    <div class="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 sm:max-w-md">
        <svg class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher une catégorie..."
          class="w-full rounded-xl border-0 bg-gray-100 py-3 pl-12 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div class="flex items-center gap-4">
        <p class="hidden text-sm text-gray-500 lg:block">
          <svg class="mr-1 inline-block h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Glissez-déposez pour réorganiser
        </p>

        <div class="flex items-center gap-2 rounded-xl bg-gray-100 p-1">
          <button
            class="rounded-lg p-2 transition-colors"
            :class="viewMode === 'cards' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'"
            @click="viewMode = 'cards'"
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
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-16 w-16 rounded-full border-4 border-purple-200"></div>
        <div class="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      </div>
      <p class="mt-4 text-gray-500">Chargement des catégories...</p>
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

    <!-- Cards view -->
    <div v-else-if="filteredCategories.length > 0 && viewMode === 'cards'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <TransitionGroup name="category-list">
        <div
          v-for="(category, index) in filteredCategories"
          :key="category._id"
          class="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
          :class="{ 'ring-2 ring-purple-500 ring-offset-2': isDragging && draggedIndex === index }"
          draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover="handleDragOver($event, index)"
          @dragend="handleDragEnd"
        >
          <!-- Color bar -->
          <div class="h-2" :class="getCategoryColor(index).bg"></div>

          <!-- Drag handle indicator -->
          <div class="absolute left-3 top-5 cursor-grab opacity-0 transition-opacity group-hover:opacity-100">
            <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
            </svg>
          </div>

          <div class="p-5">
            <!-- Header -->
            <div class="flex items-start gap-4">
              <!-- Icon -->
              <div
                class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-3xl"
                :class="getCategoryColor(index).light"
              >
                {{ category.icon || '📁' }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-900">{{ category.name.fr }}</h3>
                  <span
                    v-if="!category.isActive"
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
                  >
                    Inactive
                  </span>
                </div>
                <p v-if="category.name.en" class="text-sm text-gray-500">{{ category.name.en }}</p>
              </div>

              <!-- Order badge -->
              <span
                class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
                :class="[getCategoryColor(index).light, getCategoryColor(index).text]"
              >
                {{ index + 1 }}
              </span>
            </div>

            <!-- Description -->
            <p v-if="category.description?.fr" class="mt-3 text-sm text-gray-500 line-clamp-2">
              {{ category.description.fr }}
            </p>

            <!-- Stats -->
            <div class="mt-4 flex items-center gap-4">
              <button
                class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-gray-100"
                :class="getCategoryColor(index).text"
                @click="openPreviewModal(category)"
              >
                <span class="text-base">🍽️</span>
                <span class="font-medium">{{ getDishesCount(category._id) }}</span>
                <span class="text-gray-500">plat{{ getDishesCount(category._id) > 1 ? 's' : '' }}</span>
              </button>
            </div>

            <!-- Actions -->
            <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <button
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                :class="category.isActive
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="toggleActive(category)"
              >
                {{ category.isActive ? '✓ Active' : '○ Inactive' }}
              </button>

              <div class="flex gap-1">
                <button
                  class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  @click="openPreviewModal(category)"
                  title="Aperçu"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  @click="openEditModal(category)"
                  title="Modifier"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  @click="duplicateCategory(category)"
                  title="Dupliquer"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                  @click="confirmDelete(category)"
                  title="Supprimer"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- List view -->
    <div v-else-if="filteredCategories.length > 0 && viewMode === 'list'" class="rounded-2xl bg-white shadow-sm">
      <div class="hidden items-center gap-4 border-b border-gray-200 px-6 py-4 text-sm font-medium text-gray-500 lg:flex">
        <span class="w-8"></span>
        <span class="w-10">#</span>
        <span class="w-14">Icône</span>
        <span class="flex-1">Catégorie</span>
        <span class="w-24 text-center">Plats</span>
        <span class="w-24 text-center">Statut</span>
        <span class="w-40 text-right">Actions</span>
      </div>

      <TransitionGroup name="category-list" tag="ul" class="divide-y divide-gray-200">
        <li
          v-for="(category, index) in filteredCategories"
          :key="category._id"
          class="flex flex-col gap-4 px-6 py-4 transition-colors hover:bg-gray-50 lg:flex-row lg:items-center"
          :class="{ 'bg-purple-50': isDragging && draggedIndex === index }"
          draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover="handleDragOver($event, index)"
          @dragend="handleDragEnd"
        >
          <!-- Drag handle -->
          <div class="hidden cursor-grab text-gray-400 lg:block">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
            </svg>
          </div>

          <!-- Order number -->
          <span
            class="flex h-8 w-10 items-center justify-center rounded-full text-sm font-medium"
            :class="[getCategoryColor(index).light, getCategoryColor(index).text]"
          >
            {{ index + 1 }}
          </span>

          <!-- Icon -->
          <div
            class="flex h-12 w-14 items-center justify-center rounded-xl text-2xl"
            :class="getCategoryColor(index).light"
          >
            {{ category.icon || '📁' }}
          </div>

          <!-- Category info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900">{{ category.name.fr }}</h3>
              <span v-if="category.name.en" class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                EN: {{ category.name.en }}
              </span>
            </div>
            <p v-if="category.description?.fr" class="mt-0.5 text-sm text-gray-500 line-clamp-1">
              {{ category.description.fr }}
            </p>
          </div>

          <!-- Dishes count -->
          <button
            class="w-24 rounded-lg py-1 text-center transition-colors hover:bg-gray-100"
            @click="openPreviewModal(category)"
          >
            <span class="text-lg font-semibold" :class="getCategoryColor(index).text">{{ getDishesCount(category._id) }}</span>
            <span class="ml-1 text-sm text-gray-500">plats</span>
          </button>

          <!-- Status -->
          <div class="w-24 text-center">
            <button
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
              :class="category.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="toggleActive(category)"
            >
              {{ category.isActive ? '✓ Active' : '○ Inactive' }}
            </button>
          </div>

          <!-- Actions -->
          <div class="flex w-40 justify-end gap-1">
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              @click="openPreviewModal(category)"
              title="Aperçu"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              @click="openEditModal(category)"
              title="Modifier"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              @click="duplicateCategory(category)"
              title="Dupliquer"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              class="rounded-lg p-2 text-gray-400 hover:bg-red-100 hover:text-red-600"
              @click="confirmDelete(category)"
              title="Supprimer"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </li>
      </TransitionGroup>
    </div>

    <!-- Empty state -->
    <div v-else class="rounded-2xl bg-white p-16 text-center shadow-sm">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
        <span class="text-4xl">📁</span>
      </div>
      <h3 class="text-xl font-semibold text-gray-900">
        {{ searchQuery ? 'Aucune catégorie trouvée' : 'Aucune catégorie' }}
      </h3>
      <p class="mt-2 text-gray-500">
        {{ searchQuery ? 'Essayez de modifier votre recherche' : 'Créez des catégories pour organiser vos plats.' }}
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <button
          v-if="searchQuery"
          class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="searchQuery = ''"
        >
          Effacer la recherche
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-500"
          @click="openCreateModal"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nouvelle catégorie
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
          <div class="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h3 class="text-xl font-bold text-gray-900">
                  {{ editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}
                </h3>
                <p class="text-sm text-gray-500">Organisez votre menu</p>
              </div>
              <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeModal">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form class="max-h-[calc(90vh-140px)] space-y-6 overflow-y-auto p-6" @submit.prevent="handleSubmit">
              <!-- Name -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Nom (FR) *</label>
                  <input
                    v-model="formData.name.fr"
                    type="text"
                    required
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Entrées"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Nom (EN)</label>
                  <input
                    v-model="formData.name.en"
                    type="text"
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Starters"
                  />
                </div>
              </div>

              <!-- Description -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Description (FR)</label>
                  <textarea
                    v-model="formData.description.fr"
                    rows="2"
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Description..."
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Description (EN)</label>
                  <textarea
                    v-model="formData.description.en"
                    rows="2"
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Description..."
                  />
                </div>
              </div>

              <!-- Icon -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Icône</label>

                <!-- Selected icon preview -->
                <div v-if="formData.icon" class="mb-3 flex items-center gap-3 rounded-xl bg-purple-50 p-3">
                  <span class="text-3xl">{{ formData.icon }}</span>
                  <div class="flex-1">
                    <span class="font-medium text-gray-900">
                      {{ allIcons.find(i => i.value === formData.icon)?.label || 'Sélectionné' }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-500"
                    @click="formData.icon = ''"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Icon categories -->
                <div class="max-h-64 overflow-y-auto rounded-xl border border-gray-200 p-3">
                  <div v-for="iconCat in iconCategories" :key="iconCat.label" class="mb-4 last:mb-0">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {{ iconCat.label }}
                    </h4>
                    <div class="flex flex-wrap gap-1">
                      <button
                        v-for="icon in iconCat.icons"
                        :key="icon.value"
                        type="button"
                        :title="icon.label"
                        class="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all"
                        :class="formData.icon === icon.value
                          ? 'bg-purple-100 ring-2 ring-purple-500'
                          : 'hover:bg-gray-100'"
                        @click="formData.icon = formData.icon === icon.value ? '' : icon.value"
                      >
                        {{ icon.value }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Active status -->
              <div>
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all"
                  :class="formData.isActive ? 'bg-green-50 ring-2 ring-green-500' : 'bg-gray-100'"
                >
                  <input
                    v-model="formData.isActive"
                    type="checkbox"
                    class="sr-only"
                  />
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                    :class="formData.isActive ? 'bg-green-100' : 'bg-gray-200'"
                  >
                    {{ formData.isActive ? '✓' : '○' }}
                  </div>
                  <div>
                    <span class="font-medium text-gray-900">Catégorie active</span>
                    <p class="text-sm text-gray-500">Visible dans le menu public</p>
                  </div>
                </label>
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
                class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:bg-purple-300"
                @click="handleSubmit"
              >
                <svg v-if="isSubmitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ editingCategory ? 'Mettre à jour' : 'Créer' }}
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
          v-if="showDeleteModal && categoryToDelete"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closeDeleteModal"
        >
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div class="mb-6 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <span class="text-3xl">🗑️</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Supprimer cette catégorie ?</h3>
              <p class="mt-2 text-gray-500">
                Êtes-vous sûr de vouloir supprimer <strong>{{ categoryToDelete.name.fr }}</strong> ?
              </p>
              <p v-if="getDishesCount(categoryToDelete._id) > 0" class="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                ⚠️ Cette catégorie contient <strong>{{ getDishesCount(categoryToDelete._id) }} plat(s)</strong> qui seront affectés.
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
                @click="deleteCategory"
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
          v-if="showPreviewModal && previewCategory"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closePreviewModal"
        >
          <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <!-- Header -->
            <div class="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white">
              <div class="flex items-center gap-4">
                <div class="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 text-4xl backdrop-blur-sm">
                  {{ previewCategory.icon || '📁' }}
                </div>
                <div>
                  <h3 class="text-2xl font-bold">{{ previewCategory.name.fr }}</h3>
                  <p v-if="previewCategory.name.en" class="text-purple-100">{{ previewCategory.name.en }}</p>
                </div>
              </div>
              <p v-if="previewCategory.description?.fr" class="mt-4 text-purple-100">
                {{ previewCategory.description.fr }}
              </p>
            </div>

            <div class="p-6">
              <!-- Stats -->
              <div class="mb-6 flex items-center gap-4">
                <div class="rounded-xl bg-purple-50 px-4 py-3">
                  <p class="text-2xl font-bold text-purple-700">{{ getDishesCount(previewCategory._id) }}</p>
                  <p class="text-sm text-purple-600">plat{{ getDishesCount(previewCategory._id) > 1 ? 's' : '' }}</p>
                </div>
                <span
                  class="rounded-full px-3 py-1.5 text-sm font-medium"
                  :class="previewCategory.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
                >
                  {{ previewCategory.isActive ? '✓ Active' : '○ Inactive' }}
                </span>
              </div>

              <!-- Dishes list -->
              <div v-if="getCategoryDishes(previewCategory._id).length > 0">
                <h4 class="mb-3 font-semibold text-gray-900">Plats dans cette catégorie</h4>
                <div class="max-h-64 space-y-2 overflow-y-auto">
                  <div
                    v-for="dish in getCategoryDishes(previewCategory._id)"
                    :key="dish._id"
                    class="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
                  >
                    <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                      <img v-if="dish.image" :src="dish.image" :alt="dish.name.fr" class="h-full w-full object-cover" />
                      <div v-else class="flex h-full items-center justify-center text-xl">🍽️</div>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-gray-900">{{ dish.name.fr }}</p>
                      <div class="flex items-center gap-2">
                        <span
                          class="text-xs"
                          :class="dish.isAvailable ? 'text-green-600' : 'text-gray-400'"
                        >
                          {{ dish.isAvailable ? '✓ Dispo' : '○ Indispo' }}
                        </span>
                      </div>
                    </div>
                    <p class="font-semibold text-purple-600">{{ dish.price }} XOF</p>
                  </div>
                </div>
              </div>

              <div v-else class="rounded-xl bg-gray-50 p-6 text-center">
                <span class="text-3xl">📭</span>
                <p class="mt-2 text-gray-500">Aucun plat dans cette catégorie</p>
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
                  class="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500"
                  @click="closePreviewModal(); openEditModal(previewCategory)"
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

/* Category list transitions */
.category-list-enter-active,
.category-list-leave-active {
  transition: all 0.3s ease;
}

.category-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.category-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.category-list-move {
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
