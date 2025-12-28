<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  AppstoreOutlined,
  HolderOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
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
const viewMode = ref<'cards' | 'list'>('cards');
const searchQuery = ref('');

const formData = ref({
  name: { fr: '', en: '' },
  description: { fr: '', en: '' },
  icon: '',
  isActive: true,
});

// Icon categories
const iconCategories = [
  { label: 'Plats', icons: ['🍛', '🍲', '🍜', '🍝', '🍚', '🍱', '🥘', '🥗', '🥙', '🌯', '🌮'] },
  { label: 'Viandes', icons: ['🍖', '🍗', '🥩', '🍔', '🌭', '🥓', '🍕', '🥪'] },
  { label: 'Poissons', icons: ['🐟', '🍣', '🦐', '🦞', '🦀', '🦑', '🐙', '🦪'] },
  { label: 'Petit-déj', icons: ['🍳', '🥞', '🧇', '🥐', '🥯', '🍞', '🥖'] },
  { label: 'Desserts', icons: ['🍨', '🍧', '🍰', '🎂', '🧁', '🍩', '🍪', '🥧', '🍫'] },
  { label: 'Boissons', icons: ['🥤', '🧃', '☕', '🍵', '🧋', '🥛', '🍺', '🍷', '🍹'] },
  { label: 'Fruits', icons: ['🍎', '🍊', '🍋', '🍌', '🍇', '🍓', '🥭', '🍍', '🍉'] },
];

const getDishesCount = (categoryId: string) => {
  return dishes.value.filter(d => {
    const catId = typeof d.categoryId === 'object' ? d.categoryId._id : d.categoryId;
    return catId === categoryId;
  }).length;
};

const getCategoryDishes = (categoryId: string) => {
  return dishes.value.filter(d => {
    const catId = typeof d.categoryId === 'object' ? d.categoryId._id : d.categoryId;
    return catId === categoryId;
  });
};

const stats = computed(() => ({
  total: categories.value.length,
  active: categories.value.filter(c => c.isActive).length,
  inactive: categories.value.filter(c => !c.isActive).length,
  totalDishes: dishes.value.length,
}));

const filteredCategories = computed(() => {
  if (!searchQuery.value) {return categories.value;}
  const query = searchQuery.value.toLowerCase();
  return categories.value.filter(c =>
    c.name.fr.toLowerCase().includes(query) || c.name.en?.toLowerCase().includes(query)
  );
});

const categoryColors = ['blue', 'purple', 'green', 'magenta', 'orange', 'cyan', 'red', 'geekblue'];
const getCategoryColor = (index: number) => categoryColors[index % categoryColors.length];

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const [catRes, dishRes] = await Promise.all([api.getMyCategories(), api.getMyDishes()]);
    if (catRes.success) {categories.value = catRes.data?.sort((a, b) => a.order - b.order) || [];}
    if (dishRes.success) {dishes.value = dishRes.data || [];}
  } catch { error.value = 'Erreur de chargement'; }
  finally { isLoading.value = false; }
};

const openCreateModal = () => {
  editingCategory.value = null;
  formData.value = { name: { fr: '', en: '' }, description: { fr: '', en: '' }, icon: '', isActive: true };
  showModal.value = true;
};

const openEditModal = (cat: Category) => {
  editingCategory.value = cat;
  formData.value = {
    name: { fr: cat.name.fr, en: cat.name.en || '' },
    description: { fr: cat.description?.fr || '', en: cat.description?.en || '' },
    icon: cat.icon || '',
    isActive: cat.isActive,
  };
  showModal.value = true;
};

const duplicateCategory = (cat: Category) => {
  editingCategory.value = null;
  formData.value = {
    name: { fr: `${cat.name.fr} (copie)`, en: cat.name.en ? `${cat.name.en} (copy)` : '' },
    description: { fr: cat.description?.fr || '', en: cat.description?.en || '' },
    icon: cat.icon || '',
    isActive: true,
  };
  showModal.value = true;
};

const openPreviewModal = (cat: Category) => {
  previewCategory.value = cat;
  showPreviewModal.value = true;
};

const closeModal = () => { showModal.value = false; editingCategory.value = null; };
const closeDeleteModal = () => { showDeleteModal.value = false; categoryToDelete.value = null; };
const closePreviewModal = () => { showPreviewModal.value = false; previewCategory.value = null; };

const handleSubmit = async () => {
  isSubmitting.value = true;
  try {
    const data = {
      ...formData.value,
      name: { fr: formData.value.name.fr, en: formData.value.name.en || undefined },
      description: formData.value.description.fr || formData.value.description.en
        ? { fr: formData.value.description.fr || undefined, en: formData.value.description.en || undefined }
        : undefined,
      icon: formData.value.icon || undefined,
    };
    if (editingCategory.value) {
      await api.updateCategory(editingCategory.value._id, data);
      message.success('Catégorie mise à jour');
    } else {
      await api.createCategory(data);
      message.success('Catégorie créée');
    }
    await fetchData();
    closeModal();
  } catch { message.error('Erreur de sauvegarde'); }
  finally { isSubmitting.value = false; }
};

const confirmDelete = (cat: Category) => { categoryToDelete.value = cat; showDeleteModal.value = true; };

const deleteCategory = async () => {
  if (!categoryToDelete.value) {return;}
  try {
    await api.deleteCategory(categoryToDelete.value._id);
    message.success('Catégorie supprimée');
    await fetchData();
    closeDeleteModal();
  } catch { message.error('Erreur de suppression'); }
};

const toggleActive = async (cat: Category) => {
  try {
    await api.updateCategory(cat._id, { isActive: !cat.isActive });
    cat.isActive = !cat.isActive;
    message.success(cat.isActive ? 'Catégorie activée' : 'Catégorie désactivée');
  } catch { console.error('Toggle error'); }
};

// Drag and drop
const handleDragStart = (e: DragEvent, index: number) => {
  e.dataTransfer?.setData('text/plain', index.toString());
};

const handleDrop = async (e: DragEvent, targetIndex: number) => {
  e.preventDefault();
  const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '0');
  if (fromIndex === targetIndex) {return;}
  const items = categories.value.splice(fromIndex, 1);
  const item = items[0];
  if (!item) {return;}
  categories.value.splice(targetIndex, 0, item);
  try {
    await api.reorderCategories(categories.value.map((c, i) => ({ id: c._id, order: i })));
    message.success('Ordre mis à jour');
  } catch { await fetchData(); }
};

// Table columns
const columns: ColumnsType = [
  { title: '', width: 40, key: 'drag' },
  { title: '#', width: 50, key: 'order' },
  { title: 'Icône', width: 70, dataIndex: 'icon', key: 'icon' },
  { title: 'Catégorie', dataIndex: 'name', key: 'name' },
  { title: 'Plats', width: 100, key: 'dishes' },
  { title: 'Statut', width: 120, key: 'status' },
  { title: 'Actions', width: 160, key: 'actions', fixed: 'right' },
];

onMounted(fetchData);
</script>

<template>
  <div class="categories-view space-y-6">
    <!-- Header Card -->
    <a-card class="header-card" :bordered="false">
      <div class="header-gradient">
        <div class="header-content">
          <div class="header-title-row">
            <div class="header-title">
              <div class="title-icon"><AppstoreOutlined /></div>
              <div>
                <h1>Gestion des catégories</h1>
                <p>Organisez votre menu en catégories</p>
              </div>
            </div>
            <a-button type="primary" size="large" @click="openCreateModal">
              <template #icon><PlusOutlined /></template>
              Nouvelle catégorie
            </a-button>
          </div>

          <a-row :gutter="[12, 12]" class="stats-row">
            <a-col :xs="12" :sm="12" :md="6">
              <div class="stat-card"><a-statistic :value="stats.total" title="Total" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="12" :md="6">
              <div class="stat-card success"><a-statistic :value="stats.active" title="Actives" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="12" :md="6">
              <div class="stat-card warning"><a-statistic :value="stats.inactive" title="Inactives" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="12" :md="6">
              <div class="stat-card"><a-statistic :value="stats.totalDishes" title="Plats total" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
          </a-row>
        </div>
      </div>
    </a-card>

    <!-- Filters -->
    <a-card :bordered="false">
      <div class="filters-row">
        <a-input-search v-model:value="searchQuery" placeholder="Rechercher..." :style="{ width: '300px' }" allow-clear />
        <div class="filters-right">
          <span class="drag-hint"><HolderOutlined /> Glissez pour réorganiser</span>
          <a-segmented v-model:value="viewMode" :options="[{ value: 'cards', label: 'Cartes' }, { value: 'list', label: 'Liste' }]" />
        </div>
      </div>
    </a-card>

    <!-- Loading -->
    <a-card v-if="isLoading" :bordered="false" class="text-center py-16">
      <a-spin size="large" tip="Chargement..." />
    </a-card>

    <!-- Error -->
    <a-result v-else-if="error" status="error" title="Erreur" :sub-title="error">
      <template #extra><a-button type="primary" @click="fetchData">Réessayer</a-button></template>
    </a-result>

    <!-- Cards View -->
    <div v-else-if="filteredCategories.length > 0 && viewMode === 'cards'">
      <a-row :gutter="[16, 16]">
        <a-col v-for="(cat, index) in filteredCategories" :key="cat._id" :xs="24" :sm="12" :lg="8" :xl="6">
          <a-card
            hoverable
            class="category-card"
            :class="{ inactive: !cat.isActive }"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent
            @drop="handleDrop($event, index)"
          >
            <template #cover>
              <div class="category-header" :style="{ borderTopColor: `var(--ant-color-${getCategoryColor(index)})` }">
                <a-badge :count="index + 1" :number-style="{ backgroundColor: `var(--ant-color-${getCategoryColor(index)})` }" />
                <div class="drag-handle"><HolderOutlined /></div>
              </div>
            </template>

            <a-card-meta>
              <template #avatar>
                <div class="category-icon">{{ cat.icon || '📁' }}</div>
              </template>
              <template #title>
                <div class="category-title">
                  <span>{{ cat.name.fr }}</span>
                  <a-tag v-if="!cat.isActive" color="default" size="small">Inactive</a-tag>
                </div>
              </template>
              <template #description>
                <p v-if="cat.name.en" class="en-name">{{ cat.name.en }}</p>
                <p v-if="cat.description?.fr" class="cat-desc">{{ cat.description.fr }}</p>
                <a-tag :color="getCategoryColor(index)" @click="openPreviewModal(cat)">
                  🍽️ {{ getDishesCount(cat._id) }} plat{{ getDishesCount(cat._id) > 1 ? 's' : '' }}
                </a-tag>
              </template>
            </a-card-meta>

            <template #actions>
              <a-switch :checked="cat.isActive" size="small" @change="toggleActive(cat)" />
              <a-button type="text" @click="openPreviewModal(cat)"><EyeOutlined /></a-button>
              <a-button type="text" @click="openEditModal(cat)"><EditOutlined /></a-button>
              <a-button type="text" @click="duplicateCategory(cat)"><CopyOutlined /></a-button>
              <a-popconfirm title="Supprimer ?" @confirm="confirmDelete(cat); deleteCategory()">
                <a-button type="text" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </template>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- List View -->
    <a-card v-else-if="filteredCategories.length > 0 && viewMode === 'list'" :bordered="false">
      <a-table :data-source="filteredCategories" :columns="columns" :row-key="(r: Category) => r._id" :pagination="false">
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'drag'">
            <HolderOutlined class="drag-icon" />
          </template>
          <template v-else-if="column.key === 'order'">
            <a-badge :count="index + 1" :number-style="{ backgroundColor: `var(--ant-color-${getCategoryColor(index)})` }" />
          </template>
          <template v-else-if="column.key === 'icon'">
            <span class="icon-cell">{{ record.icon || '📁' }}</span>
          </template>
          <template v-else-if="column.key === 'name'">
            <div>
              <span class="cat-name">{{ record.name.fr }}</span>
              <span v-if="record.name.en" class="cat-name-en"> ({{ record.name.en }})</span>
            </div>
          </template>
          <template v-else-if="column.key === 'dishes'">
            <a-tag :color="getCategoryColor(index)">{{ getDishesCount(record._id) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-switch :checked="record.isActive" size="small" @change="toggleActive(record)" />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openPreviewModal(record)"><EyeOutlined /></a-button>
              <a-button size="small" @click="openEditModal(record)"><EditOutlined /></a-button>
              <a-button size="small" @click="duplicateCategory(record)"><CopyOutlined /></a-button>
              <a-popconfirm title="Supprimer ?" @confirm="confirmDelete(record); deleteCategory()">
                <a-button size="small" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Empty -->
    <a-card v-else :bordered="false">
      <a-empty :description="searchQuery ? 'Aucune catégorie trouvée' : 'Aucune catégorie'">
        <template #image><span style="font-size: 64px">📁</span></template>
        <a-button type="primary" @click="openCreateModal"><PlusOutlined /> Nouvelle catégorie</a-button>
      </a-empty>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal v-model:open="showModal" :title="editingCategory ? 'Modifier' : 'Nouvelle catégorie'" :width="620" :footer="null" :destroy-on-close="true">
      <a-form layout="vertical" @finish="handleSubmit">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Nom (FR)" required><a-input v-model:value="formData.name.fr" placeholder="Entrées" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nom (EN)"><a-input v-model:value="formData.name.en" placeholder="Starters" /></a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Description (FR)"><a-textarea v-model:value="formData.description.fr" :rows="2" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Description (EN)"><a-textarea v-model:value="formData.description.en" :rows="2" /></a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Icône">
          <div v-if="formData.icon" class="selected-icon">
            <span class="icon-preview">{{ formData.icon }}</span>
            <a-button type="text" danger size="small" @click="formData.icon = ''"><CloseOutlined /></a-button>
          </div>
          <div class="icons-container">
            <div v-for="group in iconCategories" :key="group.label" class="icon-group">
              <span class="icon-group-label">{{ group.label }}</span>
              <div class="icon-row">
                <a-button
                  v-for="icon in group.icons"
                  :key="icon"
                  :type="formData.icon === icon ? 'primary' : 'default'"
                  size="small"
                  class="icon-btn"
                  @click="formData.icon = formData.icon === icon ? '' : icon"
                >{{ icon }}</a-button>
              </div>
            </div>
          </div>
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="formData.isActive">Catégorie active (visible dans le menu)</a-checkbox>
        </a-form-item>

        <div class="modal-actions">
          <a-button @click="closeModal">Annuler</a-button>
          <a-button type="primary" html-type="submit" :loading="isSubmitting">
            {{ editingCategory ? 'Mettre à jour' : 'Créer' }}
          </a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Preview Modal -->
    <a-modal v-model:open="showPreviewModal" :footer="null" :width="520">
      <template v-if="previewCategory">
        <div class="preview-header">
          <span class="preview-icon">{{ previewCategory.icon || '📁' }}</span>
          <div>
            <h2>{{ previewCategory.name.fr }}</h2>
            <p v-if="previewCategory.name.en">{{ previewCategory.name.en }}</p>
          </div>
          <a-tag :color="previewCategory.isActive ? 'success' : 'default'">
            {{ previewCategory.isActive ? 'Active' : 'Inactive' }}
          </a-tag>
        </div>

        <p v-if="previewCategory.description?.fr" class="preview-desc">{{ previewCategory.description.fr }}</p>

        <a-statistic title="Plats dans cette catégorie" :value="getDishesCount(previewCategory._id)" class="mb-4" />

        <div v-if="getCategoryDishes(previewCategory._id).length > 0" class="dishes-list">
          <div v-for="dish in getCategoryDishes(previewCategory._id)" :key="dish._id" class="dish-item">
            <a-avatar :src="dish.image" shape="square">🍽️</a-avatar>
            <div class="dish-info">
              <span>{{ dish.name.fr }}</span>
              <a-tag :color="dish.isAvailable ? 'success' : 'default'" size="small">
                {{ dish.isAvailable ? 'Dispo' : 'Indispo' }}
              </a-tag>
            </div>
            <span class="dish-price">{{ dish.price }} XOF</span>
          </div>
        </div>
        <a-empty v-else description="Aucun plat" />

        <div class="preview-actions">
          <a-button @click="closePreviewModal">Fermer</a-button>
          <a-button type="primary" @click="closePreviewModal(); openEditModal(previewCategory)">Modifier</a-button>
        </div>
      </template>
    </a-modal>

    <!-- Delete Modal -->
    <a-modal v-model:open="showDeleteModal" title="Supprimer ?" ok-text="Supprimer" cancel-text="Annuler" ok-type="danger" @ok="deleteCategory">
      <a-alert v-if="categoryToDelete && getDishesCount(categoryToDelete._id) > 0" type="warning" show-icon class="mb-4">
        <template #message>Cette catégorie contient {{ getDishesCount(categoryToDelete._id) }} plat(s)</template>
      </a-alert>
      <p v-if="categoryToDelete">Supprimer <strong>{{ categoryToDelete.name.fr }}</strong> ?</p>
    </a-modal>
  </div>
</template>

<style scoped>
.categories-view { max-width: 1400px; margin: 0 auto; }

/* Header */
.header-card :deep(.ant-card-body) { padding: 0; }
.header-gradient {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%);
  padding: 24px; border-radius: 8px;
}
.header-content { color: white; }
.header-title-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.header-title { display: flex; align-items: center; gap: 16px; }
.title-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.header-title h1 { margin: 0; font-size: 28px; font-weight: bold; color: white; }
.header-title p { margin: 0; opacity: 0.8; font-size: 14px; }
.stats-row { margin-top: 24px; }
.stat-card { background: rgba(255,255,255,0.15); padding: 16px; border-radius: 12px; }
.stat-card :deep(.ant-statistic-title) { color: rgba(255,255,255,0.8); font-size: 13px; }
.stat-card.success { background: rgba(34,197,94,0.3); }
.stat-card.warning { background: rgba(245,158,11,0.3); }

/* Filters */
.filters-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.filters-right { display: flex; align-items: center; gap: 16px; }
.drag-hint { color: #64748b; font-size: 13px; }

/* Cards */
.category-card { overflow: hidden; }
.category-card.inactive { opacity: 0.6; }
.category-header { border-top: 4px solid; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.drag-handle { cursor: grab; color: #94a3b8; }
.category-icon { font-size: 40px; }
.category-title { display: flex; align-items: center; gap: 8px; }
.en-name { color: #64748b; font-size: 13px; margin-bottom: 4px; }
.cat-desc { color: #64748b; font-size: 13px; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Table */
.drag-icon { cursor: grab; color: #94a3b8; }
.icon-cell { font-size: 24px; }
.cat-name { font-weight: 500; }
.cat-name-en { color: #64748b; font-size: 13px; }

/* Icon picker */
.selected-icon { display: flex; align-items: center; gap: 12px; background: #f0f5ff; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
.icon-preview { font-size: 32px; }
.icons-container { max-height: 200px; overflow-y: auto; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px; }
.icon-group { margin-bottom: 12px; }
.icon-group-label { font-size: 12px; color: #64748b; font-weight: 500; }
.icon-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.icon-btn { font-size: 18px; width: 36px; height: 36px; padding: 0; }

/* Modal */
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

/* Preview */
.preview-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.preview-icon { font-size: 48px; }
.preview-header h2 { margin: 0; }
.preview-header p { margin: 0; color: #64748b; }
.preview-desc { color: #64748b; margin-bottom: 16px; }
.dishes-list { max-height: 250px; overflow-y: auto; }
.dish-item { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 8px; background: #f8fafc; margin-bottom: 8px; }
.dish-info { flex: 1; display: flex; align-items: center; gap: 8px; }
.dish-price { font-weight: 600; color: #8b5cf6; }
.preview-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }

@media (max-width: 768px) {
  .filters-row { flex-direction: column; align-items: stretch; }
  .header-title h1 { font-size: 22px; }
}
</style>
