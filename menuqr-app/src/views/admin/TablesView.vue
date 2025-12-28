<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  DownloadOutlined,
  TableOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import type { Table, TableStats, CreateTableData, TableLocation } from '@/types/reservation';
import { TABLE_LOCATION_LABELS } from '@/types/reservation';
import { useQRCode } from '@/composables/useQRCode';
import QRCodeDisplay from '@/components/admin/QRCodeDisplay.vue';
import QRCodeModal from '@/components/admin/QRCodeModal.vue';

const { getMenuUrl, getTableUrl, downloadAllQRCodes } = useQRCode();

const isLoading = ref(true);
const error = ref<string | null>(null);
const tables = ref<Table[]>([]);
const stats = ref<TableStats | null>(null);
const showModal = ref(false);
const showDeleteModal = ref(false);
const isSubmitting = ref(false);
const editingTable = ref<Table | null>(null);
const tableToDelete = ref<Table | null>(null);

const restaurantSlug = ref('');
const restaurantName = ref('');
const showQRModal = ref(false);
const qrModalUrl = ref('');
const qrModalTitle = ref('');
const qrModalSubtitle = ref('');
const isDownloadingAll = ref(false);

const formData = ref<CreateTableData & { isActive?: boolean }>({
  name: '',
  capacity: 4,
  minCapacity: 1,
  location: 'indoor',
  description: '',
});

const locations: { value: TableLocation; label: string }[] = [
  { value: 'indoor', label: 'Intérieur' },
  { value: 'outdoor', label: 'Extérieur' },
  { value: 'terrace', label: 'Terrasse' },
  { value: 'private', label: 'Privé' },
];

const locationColors: Record<TableLocation, string> = {
  indoor: 'blue',
  outdoor: 'green',
  terrace: 'orange',
  private: 'purple',
};

const sortedTables = computed(() => [...tables.value].sort((a, b) => a.order - b.order));
const menuUrl = computed(() => restaurantSlug.value ? getMenuUrl(restaurantSlug.value) : '');

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const [tablesRes, statsRes, restaurantRes] = await Promise.all([
      api.getTables(),
      api.getTableStats(),
      api.getMyRestaurant(),
    ]);
    if (tablesRes.success) {tables.value = tablesRes.data || [];}
    if (statsRes.success && statsRes.data) {stats.value = statsRes.data;}
    if (restaurantRes.success && restaurantRes.data) {
      restaurantSlug.value = restaurantRes.data.slug;
      restaurantName.value = restaurantRes.data.name;
    }
  } catch { error.value = 'Erreur de chargement'; }
  finally { isLoading.value = false; }
};

const openTableQRModal = (table: Table) => {
  if (!restaurantSlug.value) {return;}
  qrModalUrl.value = getTableUrl(restaurantSlug.value, table.name);
  qrModalTitle.value = table.name;
  qrModalSubtitle.value = TABLE_LOCATION_LABELS[table.location];
  showQRModal.value = true;
};

const openMenuQRModal = () => {
  if (!restaurantSlug.value) {return;}
  qrModalUrl.value = menuUrl.value;
  qrModalTitle.value = 'Menu du restaurant';
  qrModalSubtitle.value = restaurantName.value;
  showQRModal.value = true;
};

const handleDownloadAll = async () => {
  if (!restaurantSlug.value || tables.value.length === 0) {return;}
  isDownloadingAll.value = true;
  try {
    await downloadAllQRCodes(tables.value, restaurantSlug.value, restaurantName.value);
    message.success('QR codes téléchargés');
  } catch { message.error('Erreur téléchargement'); }
  finally { isDownloadingAll.value = false; }
};

const openCreateModal = () => {
  editingTable.value = null;
  formData.value = { name: '', capacity: 4, minCapacity: 1, location: 'indoor', description: '' };
  showModal.value = true;
};

const openEditModal = (table: Table) => {
  editingTable.value = table;
  formData.value = {
    name: table.name,
    capacity: table.capacity,
    minCapacity: table.minCapacity,
    location: table.location,
    description: table.description || '',
    isActive: table.isActive,
  };
  showModal.value = true;
};

const closeModal = () => { showModal.value = false; editingTable.value = null; };

const handleSubmit = async () => {
  isSubmitting.value = true;
  try {
    if (editingTable.value) {
      await api.updateTable(editingTable.value._id, formData.value);
      message.success('Table mise à jour');
    } else {
      await api.createTable(formData.value);
      message.success('Table créée');
    }
    await fetchData();
    closeModal();
  } catch { message.error('Erreur de sauvegarde'); }
  finally { isSubmitting.value = false; }
};

const confirmDelete = (table: Table) => { tableToDelete.value = table; showDeleteModal.value = true; };

const deleteTable = async () => {
  if (!tableToDelete.value) {return;}
  try {
    await api.deleteTable(tableToDelete.value._id);
    message.success('Table supprimée');
    await fetchData();
    showDeleteModal.value = false;
    tableToDelete.value = null;
  } catch { message.error('Erreur de suppression'); }
};

const toggleActive = async (table: Table) => {
  try {
    await api.toggleTableStatus(table._id);
    table.isActive = !table.isActive;
    message.success(table.isActive ? 'Table activée' : 'Table désactivée');
  } catch { console.error('Toggle error'); }
};

onMounted(fetchData);
</script>

<template>
  <div class="tables-view space-y-6">
    <!-- Header Card -->
    <a-card class="header-card" :bordered="false">
      <div class="header-gradient">
        <div class="header-content">
          <div class="header-title-row">
            <div class="header-title">
              <div class="title-icon"><TableOutlined /></div>
              <div>
                <h1>Gestion des tables</h1>
                <p>Configurez les tables de votre restaurant</p>
              </div>
            </div>
            <a-space>
              <a-button v-if="tables.length > 0 && restaurantSlug" :loading="isDownloadingAll" @click="handleDownloadAll">
                <template #icon><DownloadOutlined /></template>
                Tous les QR
              </a-button>
              <a-button type="primary" size="large" @click="openCreateModal">
                <template #icon><PlusOutlined /></template>
                Nouvelle table
              </a-button>
            </a-space>
          </div>

          <a-row v-if="stats" :gutter="[12, 12]" class="stats-row">
            <a-col :xs="12" :sm="8" :md="4">
              <div class="stat-card"><a-statistic :value="stats.total" title="Total" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="stat-card success"><a-statistic :value="stats.active" title="Actives" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="stat-card"><a-statistic :value="stats.totalCapacity" title="Places" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="stat-card"><a-statistic :value="stats.byLocation?.indoor || 0" title="Intérieur" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="stat-card"><a-statistic :value="stats.byLocation?.terrace || 0" title="Terrasse" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="stat-card"><a-statistic :value="stats.byLocation?.outdoor || 0" title="Extérieur" :value-style="{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }" /></div>
            </a-col>
          </a-row>
        </div>
      </div>
    </a-card>

    <!-- QR Code du Menu -->
    <a-card v-if="restaurantSlug && !isLoading" :bordered="false">
      <div class="menu-qr-section">
        <QRCodeDisplay :url="menuUrl" :size="120" :show-actions="false" />
        <div class="menu-qr-info">
          <h3>QR Code du Menu</h3>
          <p>Ce QR code donne accès au menu général de votre restaurant</p>
          <a-input :value="menuUrl" readonly class="mt-2" />
          <a-button type="primary" class="mt-3" @click="openMenuQRModal">
            <template #icon><QrcodeOutlined /></template>
            Agrandir
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- Loading -->
    <a-card v-if="isLoading" :bordered="false" class="text-center py-16">
      <a-spin size="large" tip="Chargement des tables..." />
    </a-card>

    <!-- Error -->
    <a-result v-else-if="error" status="error" title="Erreur" :sub-title="error">
      <template #extra><a-button type="primary" @click="fetchData">Réessayer</a-button></template>
    </a-result>

    <!-- Tables Grid -->
    <div v-else-if="sortedTables.length > 0">
      <a-row :gutter="[16, 16]">
        <a-col v-for="table in sortedTables" :key="table._id" :xs="24" :sm="12" :md="8" :lg="6">
          <a-card hoverable class="table-card" :class="{ inactive: !table.isActive }">
            <template #cover>
              <div class="table-header" :class="`border-${locationColors[table.location]}`"></div>
            </template>

            <a-card-meta>
              <template #avatar>
                <div class="table-icon" :class="`bg-${locationColors[table.location]}-light`">🪑</div>
              </template>
              <template #title>
                <div class="table-title">
                  <span>{{ table.name }}</span>
                  <a-tag v-if="!table.isActive" color="default" size="small">Inactive</a-tag>
                </div>
              </template>
              <template #description>
                <a-tag :color="locationColors[table.location]" size="small">
                  {{ TABLE_LOCATION_LABELS[table.location] }}
                </a-tag>
                <p v-if="table.description" class="table-desc">{{ table.description }}</p>
                <div class="table-capacity">
                  <span class="capacity-icon">👥</span>
                  <span class="capacity-value">{{ table.minCapacity }}-{{ table.capacity }}</span>
                  <span class="capacity-label">pers.</span>
                </div>
              </template>
            </a-card-meta>

            <template #actions>
              <a-switch :checked="table.isActive" size="small" @change="toggleActive(table)" />
              <a-button v-if="restaurantSlug" type="text" @click="openTableQRModal(table)"><QrcodeOutlined /></a-button>
              <a-button type="text" @click="openEditModal(table)"><EditOutlined /></a-button>
              <a-popconfirm title="Supprimer cette table ?" @confirm="confirmDelete(table); deleteTable()">
                <a-button type="text" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </template>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- Empty -->
    <a-card v-else :bordered="false">
      <a-empty description="Aucune table">
        <template #image><span style="font-size: 64px">🪑</span></template>
        <a-button type="primary" @click="openCreateModal"><PlusOutlined /> Nouvelle table</a-button>
      </a-empty>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal v-model:open="showModal" :title="editingTable ? 'Modifier la table' : 'Nouvelle table'" :footer="null" :width="520">
      <a-form layout="vertical" @finish="handleSubmit">
        <a-form-item label="Nom" required>
          <a-input v-model:value="formData.name" placeholder="Table 1" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Capacité min">
              <a-input-number v-model:value="formData.minCapacity" :min="1" :max="20" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Capacité max" required>
              <a-input-number v-model:value="formData.capacity" :min="1" :max="20" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Emplacement">
          <a-radio-group v-model:value="formData.location" button-style="solid">
            <a-radio-button v-for="loc in locations" :key="loc.value" :value="loc.value">
              {{ loc.label }}
            </a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea v-model:value="formData.description" :rows="2" placeholder="Description optionnelle..." />
        </a-form-item>

        <div class="modal-actions">
          <a-button @click="closeModal">Annuler</a-button>
          <a-button type="primary" html-type="submit" :loading="isSubmitting">
            {{ editingTable ? 'Mettre à jour' : 'Créer' }}
          </a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Delete Modal -->
    <a-modal v-model:open="showDeleteModal" title="Supprimer cette table ?" ok-text="Supprimer" cancel-text="Annuler" ok-type="danger" @ok="deleteTable">
      <p v-if="tableToDelete">Supprimer <strong>{{ tableToDelete.name }}</strong> ?</p>
    </a-modal>

    <!-- QR Code Modal -->
    <QRCodeModal :open="showQRModal" :url="qrModalUrl" :title="qrModalTitle" :subtitle="qrModalSubtitle" @close="showQRModal = false" />
  </div>
</template>

<style scoped>
.tables-view { max-width: 1400px; margin: 0 auto; }

/* Header */
.header-card :deep(.ant-card-body) { padding: 0; }
.header-gradient {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0891b2 100%);
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

/* Menu QR Section */
.menu-qr-section { display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
.menu-qr-info { flex: 1; min-width: 250px; }
.menu-qr-info h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
.menu-qr-info p { color: #64748b; margin: 0; }

/* Table Cards */
.table-card { overflow: hidden; }
.table-card.inactive { opacity: 0.6; }
.table-header { height: 4px; }
.table-header.border-blue { background: #3b82f6; }
.table-header.border-green { background: #22c55e; }
.table-header.border-orange { background: #f97316; }
.table-header.border-purple { background: #8b5cf6; }

.table-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.bg-blue-light { background: #dbeafe; }
.bg-green-light { background: #dcfce7; }
.bg-orange-light { background: #ffedd5; }
.bg-purple-light { background: #f3e8ff; }

.table-title { display: flex; align-items: center; gap: 8px; }
.table-desc { margin: 8px 0; color: #64748b; font-size: 13px; }
.table-capacity { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.capacity-icon { font-size: 16px; }
.capacity-value { font-weight: 600; color: #14b8a6; }
.capacity-label { color: #64748b; }

/* Modal */
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

@media (max-width: 768px) {
  .header-title h1 { font-size: 22px; }
  .menu-qr-section { flex-direction: column; align-items: center; text-align: center; }
}
</style>
