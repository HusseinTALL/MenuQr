<script setup lang="ts">
import { ref, computed, onMounted, reactive, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  TableOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  ClearOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import api, { type HotelRoomAdmin } from '@/services/api';

// ============ STATE ============
const isLoading = ref(true);
const hotelId = ref<string | null>(null);
const rooms = ref<HotelRoomAdmin[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});
const filters = reactive({
  search: '',
  floor: null as number | null,
  status: null as string | null,
  roomType: null as string | null,
});

// Modal state
const modalVisible = ref(false);
const modalMode = ref<'create' | 'edit' | 'bulk'>('create');
const modalLoading = ref(false);
const editingRoom = ref<HotelRoomAdmin | null>(null);

// Form state
const roomForm = reactive({
  roomNumber: '',
  floor: 1,
  building: '',
  roomType: 'standard' as 'standard' | 'deluxe' | 'suite' | 'presidential' | 'apartment',
  capacity: 2,
  amenities: [] as string[],
  isRoomServiceEnabled: true,
  pricePerNight: 0,
});

// Bulk create form
const bulkForm = reactive({
  prefix: '',
  startNumber: 1,
  count: 10,
  floor: 1,
  building: '',
  roomType: 'standard' as 'standard' | 'deluxe' | 'suite' | 'presidential' | 'apartment',
  capacity: 2,
  isRoomServiceEnabled: true,
});

// QR Modal
const qrModalVisible = ref(false);
const qrRoom = ref<HotelRoomAdmin | null>(null);
const qrLoading = ref(false);
const qrCodeUrl = ref('');

// ============ CONSTANTS ============
const roomTypes = [
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'suite', label: 'Suite' },
  { value: 'presidential', label: 'Presidentielle' },
  { value: 'apartment', label: 'Appartement' },
];

const roomStatuses = [
  { value: 'available', label: 'Disponible', color: 'green' },
  { value: 'occupied', label: 'Occupee', color: 'blue' },
  { value: 'cleaning', label: 'Nettoyage', color: 'orange' },
  { value: 'maintenance', label: 'Maintenance', color: 'red' },
  { value: 'out_of_service', label: 'Hors service', color: 'default' },
];

const amenitiesList = [
  'WiFi', 'TV', 'Climatisation', 'Minibar', 'Coffre-fort', 'Balcon',
  'Vue mer', 'Baignoire', 'Douche', 'Room service', 'Bureau', 'Canape',
];

// ============ COMPUTED ============
const floors = computed(() => {
  const uniqueFloors = [...new Set(rooms.value.map(r => r.floor))];
  return uniqueFloors.sort((a, b) => a - b);
});

const filteredRooms = computed(() => {
  let result = [...rooms.value];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(r =>
      r.roomNumber.toLowerCase().includes(search) ||
      r.building?.toLowerCase().includes(search)
    );
  }

  if (filters.floor !== null) {
    result = result.filter(r => r.floor === filters.floor);
  }

  if (filters.status) {
    result = result.filter(r => r.status === filters.status);
  }

  if (filters.roomType) {
    result = result.filter(r => r.roomType === filters.roomType);
  }

  return result;
});

// ============ TABLE COLUMNS ============
const columns: ColumnsType<HotelRoomAdmin> = [
  {
    title: 'Chambre',
    dataIndex: 'roomNumber',
    key: 'roomNumber',
    width: 120,
    sorter: (a, b) => a.roomNumber.localeCompare(b.roomNumber),
  },
  {
    title: 'Etage',
    dataIndex: 'floor',
    key: 'floor',
    width: 80,
    sorter: (a, b) => a.floor - b.floor,
  },
  {
    title: 'Type',
    dataIndex: 'roomType',
    key: 'roomType',
    width: 120,
    customRender: ({ text }) => {
      const type = roomTypes.find(t => t.value === text);
      return type?.label || text;
    },
  },
  {
    title: 'Capacite',
    dataIndex: 'capacity',
    key: 'capacity',
    width: 90,
    customRender: ({ text }) => `${text} pers.`,
  },
  {
    title: 'Statut',
    dataIndex: 'status',
    key: 'status',
    width: 130,
  },
  {
    title: 'Client actuel',
    key: 'currentGuest',
    width: 180,
  },
  {
    title: 'Room Service',
    dataIndex: 'isRoomServiceEnabled',
    key: 'roomService',
    width: 110,
    align: 'center',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 160,
    fixed: 'right',
  },
];

// ============ HELPERS ============
function getStatusInfo(status: string) {
  return roomStatuses.find(s => s.value === status) || { label: status, color: 'default' };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

// ============ DATA LOADING ============
async function loadRooms() {
  isLoading.value = true;
  try {
    // Get hotel first
    const hotelRes = await api.getMyHotel();
    if (!hotelRes.success || !hotelRes.data) {
      message.error('Impossible de charger l\'hotel');
      return;
    }
    hotelId.value = hotelRes.data.id;

    // Load rooms
    const res = await api.getHotelRooms(hotelId.value, {
      page: pagination.current,
      limit: pagination.pageSize,
    });

    if (res.success && res.data) {
      rooms.value = res.data.rooms;
      pagination.total = res.data.total;
    }
  } catch (e) {
    console.error('Error loading rooms:', e);
    message.error('Erreur lors du chargement des chambres');
  } finally {
    isLoading.value = false;
  }
}

// ============ CRUD OPERATIONS ============
function openCreateModal() {
  modalMode.value = 'create';
  editingRoom.value = null;
  Object.assign(roomForm, {
    roomNumber: '',
    floor: 1,
    building: '',
    roomType: 'standard',
    capacity: 2,
    amenities: [],
    isRoomServiceEnabled: true,
    pricePerNight: 0,
  });
  modalVisible.value = true;
}

function openBulkModal() {
  modalMode.value = 'bulk';
  Object.assign(bulkForm, {
    prefix: '',
    startNumber: 1,
    count: 10,
    floor: 1,
    building: '',
    roomType: 'standard',
    capacity: 2,
    isRoomServiceEnabled: true,
  });
  modalVisible.value = true;
}

function openEditModal(room: HotelRoomAdmin) {
  modalMode.value = 'edit';
  editingRoom.value = room;
  Object.assign(roomForm, {
    roomNumber: room.roomNumber,
    floor: room.floor,
    building: room.building || '',
    roomType: room.roomType,
    capacity: room.capacity,
    amenities: room.amenities || [],
    isRoomServiceEnabled: room.isRoomServiceEnabled,
    pricePerNight: room.pricePerNight || 0,
  });
  modalVisible.value = true;
}

async function handleSubmit() {
  if (!hotelId.value) {return;}

  modalLoading.value = true;
  try {
    if (modalMode.value === 'bulk') {
      const res = await api.bulkCreateRooms(hotelId.value!, bulkForm);
      if (res.success) {
        message.success(`${res.data?.created || 0} chambres creees`);
        modalVisible.value = false;
        loadRooms();
      }
    } else if (modalMode.value === 'create') {
      const res = await api.createHotelRoom(hotelId.value, roomForm);
      if (res.success) {
        message.success('Chambre creee');
        modalVisible.value = false;
        loadRooms();
      }
    } else if (modalMode.value === 'edit' && editingRoom.value) {
      const res = await api.updateHotelRoom(hotelId.value, editingRoom.value.id, roomForm);
      if (res.success) {
        message.success('Chambre mise a jour');
        modalVisible.value = false;
        loadRooms();
      }
    }
  } catch (e) {
    console.error('Submit error:', e);
    message.error('Erreur lors de l\'operation');
  } finally {
    modalLoading.value = false;
  }
}

async function updateStatus(room: HotelRoomAdmin, status: string) {
  if (!hotelId.value) {return;}

  try {
    const res = await api.updateRoomStatus(hotelId.value, room.id, status);
    if (res.success) {
      message.success('Statut mis a jour');
      room.status = status as HotelRoomAdmin['status'];
    }
  } catch (e) {
    console.error('Status update error:', e);
    message.error('Erreur lors de la mise a jour');
  }
}

function confirmDelete(room: HotelRoomAdmin) {
  Modal.confirm({
    title: 'Supprimer la chambre',
    icon: h(ExclamationCircleOutlined),
    content: `Etes-vous sur de vouloir supprimer la chambre ${room.roomNumber} ?`,
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    onOk: () => deleteRoom(room),
  });
}

async function deleteRoom(room: HotelRoomAdmin) {
  if (!hotelId.value) {return;}

  try {
    const res = await api.deleteHotelRoom(hotelId.value, room.id);
    if (res.success) {
      message.success('Chambre supprimee');
      loadRooms();
    }
  } catch (e) {
    console.error('Delete error:', e);
    message.error('Erreur lors de la suppression');
  }
}

// ============ QR CODE ============
async function openQRModal(room: HotelRoomAdmin) {
  qrRoom.value = room;
  qrModalVisible.value = true;
  qrLoading.value = true;

  try {
    if (!hotelId.value) {return;}
    const res = await api.generateRoomQR(hotelId.value, room.id);
    if (res.success && res.data) {
      qrCodeUrl.value = res.data.qrCodeUrl;
    }
  } catch (e) {
    console.error('QR generation error:', e);
    message.error('Erreur lors de la generation du QR code');
  } finally {
    qrLoading.value = false;
  }
}

function downloadQR() {
  if (!qrCodeUrl.value) {return;}

  const link = document.createElement('a');
  link.href = qrCodeUrl.value;
  link.download = `chambre-${qrRoom.value?.roomNumber}-qr.png`;
  link.click();
}

function clearFilters() {
  filters.search = '';
  filters.floor = null;
  filters.status = null;
  filters.roomType = null;
}

// ============ LIFECYCLE ============
onMounted(() => {
  loadRooms();
});
</script>

<template>
  <div class="hotel-rooms-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>
          <TableOutlined class="header-icon" />
          Gestion des chambres
        </h1>
        <p class="header-subtitle">Gerez les chambres de votre hotel</p>
      </div>
      <div class="header-actions">
        <a-button @click="openBulkModal">
          <template #icon><PlusOutlined /></template>
          Creation en masse
        </a-button>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Nouvelle chambre
        </a-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <a-input-search
        v-model:value="filters.search"
        placeholder="Rechercher une chambre..."
        style="width: 250px"
        allow-clear
      >
        <template #prefix><SearchOutlined /></template>
      </a-input-search>

      <a-select
        v-model:value="filters.floor"
        placeholder="Etage"
        style="width: 120px"
        allow-clear
      >
        <a-select-option v-for="f in floors" :key="f" :value="f">
          Etage {{ f }}
        </a-select-option>
      </a-select>

      <a-select
        v-model:value="filters.status"
        placeholder="Statut"
        style="width: 150px"
        allow-clear
      >
        <a-select-option v-for="s in roomStatuses" :key="s.value" :value="s.value">
          {{ s.label }}
        </a-select-option>
      </a-select>

      <a-select
        v-model:value="filters.roomType"
        placeholder="Type"
        style="width: 150px"
        allow-clear
      >
        <a-select-option v-for="t in roomTypes" :key="t.value" :value="t.value">
          {{ t.label }}
        </a-select-option>
      </a-select>

      <a-button @click="clearFilters">
        <template #icon><ClearOutlined /></template>
        Effacer
      </a-button>

      <a-button @click="loadRooms">
        <template #icon><ReloadOutlined /></template>
      </a-button>
    </div>

    <!-- Stats Summary -->
    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-value">{{ rooms.length }}</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="stat-item available">
        <span class="stat-value">{{ rooms.filter(r => r.status === 'available').length }}</span>
        <span class="stat-label">Disponibles</span>
      </div>
      <div class="stat-item occupied">
        <span class="stat-value">{{ rooms.filter(r => r.status === 'occupied').length }}</span>
        <span class="stat-label">Occupees</span>
      </div>
      <div class="stat-item cleaning">
        <span class="stat-value">{{ rooms.filter(r => r.status === 'cleaning').length }}</span>
        <span class="stat-label">Nettoyage</span>
      </div>
      <div class="stat-item maintenance">
        <span class="stat-value">{{ rooms.filter(r => r.status === 'maintenance').length }}</span>
        <span class="stat-label">Maintenance</span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <a-table
        :columns="columns"
        :data-source="filteredRooms"
        :loading="isLoading"
        :pagination="false"
        :scroll="{ x: 1100 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-dropdown>
              <a-tag :color="getStatusInfo(record.status).color" class="status-tag">
                {{ getStatusInfo(record.status).label }}
              </a-tag>
              <template #overlay>
                <a-menu>
                  <a-menu-item
                    v-for="s in roomStatuses"
                    :key="s.value"
                    :disabled="record.status === s.value"
                    @click="updateStatus(record, s.value)"
                  >
                    <a-tag :color="s.color" size="small">{{ s.label }}</a-tag>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>

          <template v-else-if="column.key === 'currentGuest'">
            <div v-if="record.currentGuest" class="guest-info">
              <TeamOutlined />
              <span class="guest-name">{{ record.currentGuest.guestName }}</span>
              <span class="guest-dates">
                {{ formatDate(record.currentGuest.checkInDate) }} -
                {{ formatDate(record.currentGuest.checkOutDate) }}
              </span>
            </div>
            <span v-else class="no-guest">-</span>
          </template>

          <template v-else-if="column.key === 'roomService'">
            <a-tag v-if="record.isRoomServiceEnabled" color="green">
              <CheckCircleOutlined /> Actif
            </a-tag>
            <a-tag v-else color="default">
              <CloseCircleOutlined /> Inactif
            </a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="QR Code">
                <a-button size="small" @click="openQRModal(record)">
                  <template #icon><QrcodeOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Modifier">
                <a-button size="small" @click="openEditModal(record)">
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Supprimer">
                <a-button size="small" danger @click="confirmDelete(record)">
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalMode === 'bulk' ? 'Creation en masse' : (modalMode === 'edit' ? 'Modifier la chambre' : 'Nouvelle chambre')"
      :confirm-loading="modalLoading"
      @ok="handleSubmit"
      width="600px"
    >
      <!-- Single Room Form -->
      <a-form v-if="modalMode !== 'bulk'" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Numero de chambre" required>
              <a-input v-model:value="roomForm.roomNumber" placeholder="Ex: 101" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Etage" required>
              <a-input-number v-model:value="roomForm.floor" :min="0" :max="100" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Batiment">
              <a-input v-model:value="roomForm.building" placeholder="Ex: Batiment A" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Type de chambre" required>
              <a-select v-model:value="roomForm.roomType">
                <a-select-option v-for="t in roomTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Capacite">
              <a-input-number v-model:value="roomForm.capacity" :min="1" :max="10" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Prix par nuit">
              <a-input-number
                v-model:value="roomForm.pricePerNight"
                :min="0"
                :formatter="(v: number | string) => `${v} EUR`"
                :parser="(v: string) => v.replace(' EUR', '')"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Equipements">
          <a-checkbox-group v-model:value="roomForm.amenities">
            <a-row>
              <a-col v-for="a in amenitiesList" :key="a" :span="8">
                <a-checkbox :value="a">{{ a }}</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="roomForm.isRoomServiceEnabled">
            Room service active
          </a-checkbox>
        </a-form-item>
      </a-form>

      <!-- Bulk Create Form -->
      <a-form v-else layout="vertical">
        <a-alert
          message="Creation en masse"
          description="Creez plusieurs chambres avec un prefixe et une numerotation automatique."
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Prefixe">
              <a-input v-model:value="bulkForm.prefix" placeholder="Ex: A" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Numero de depart" required>
              <a-input-number v-model:value="bulkForm.startNumber" :min="1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Nombre" required>
              <a-input-number v-model:value="bulkForm.count" :min="1" :max="100" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Etage" required>
              <a-input-number v-model:value="bulkForm.floor" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Batiment">
              <a-input v-model:value="bulkForm.building" placeholder="Optionnel" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Type" required>
              <a-select v-model:value="bulkForm.roomType">
                <a-select-option v-for="t in roomTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Capacite">
              <a-input-number v-model:value="bulkForm.capacity" :min="1" :max="10" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item>
              <a-checkbox v-model:checked="bulkForm.isRoomServiceEnabled">
                Room service active
              </a-checkbox>
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider />
        <p class="preview-text">
          Apercu: {{ bulkForm.prefix }}{{ bulkForm.startNumber }} a
          {{ bulkForm.prefix }}{{ bulkForm.startNumber + bulkForm.count - 1 }}
          ({{ bulkForm.count }} chambres)
        </p>
      </a-form>
    </a-modal>

    <!-- QR Code Modal -->
    <a-modal
      v-model:open="qrModalVisible"
      :title="`QR Code - Chambre ${qrRoom?.roomNumber}`"
      :footer="null"
      width="400px"
    >
      <div class="qr-modal-content">
        <a-spin v-if="qrLoading" size="large" />
        <template v-else-if="qrCodeUrl">
          <img :src="qrCodeUrl" alt="QR Code" class="qr-image" />
          <p class="qr-instruction">
            Scannez ce QR code pour acceder au menu room service
          </p>
          <a-button type="primary" block @click="downloadQR">
            <template #icon><DownloadOutlined /></template>
            Telecharger le QR Code
          </a-button>
        </template>
        <a-empty v-else description="QR code non disponible" />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.hotel-rooms-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
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

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stats-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-item {
  background: white;
  padding: 12px 20px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.stat-item.available .stat-value { color: #10b981; }
.stat-item.occupied .stat-value { color: #3b82f6; }
.stat-item.cleaning .stat-value { color: #f59e0b; }
.stat-item.maintenance .stat-value { color: #ef4444; }

.table-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.status-tag {
  cursor: pointer;
}

.guest-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.guest-info .anticon {
  color: #6366f1;
  margin-bottom: 2px;
}

.guest-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 13px;
}

.guest-dates {
  font-size: 11px;
  color: #94a3b8;
}

.no-guest {
  color: #94a3b8;
}

.preview-text {
  text-align: center;
  color: #64748b;
  font-size: 14px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
}

.qr-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.qr-image {
  width: 200px;
  height: 200px;
  margin-bottom: 16px;
}

.qr-instruction {
  text-align: center;
  color: #64748b;
  margin-bottom: 16px;
}
</style>
