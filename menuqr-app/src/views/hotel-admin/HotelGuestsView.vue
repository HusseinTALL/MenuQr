<script setup lang="ts">
import { ref, computed, onMounted, reactive, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  TeamOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  LogoutOutlined,
  LoginOutlined,
  ClearOutlined,
  ShoppingCartOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import api, { type HotelGuestAdmin, type HotelRoomAdmin } from '@/services/api';

// ============ STATE ============
const isLoading = ref(true);
const hotelId = ref<string | null>(null);
const guests = ref<HotelGuestAdmin[]>([]);
const rooms = ref<HotelRoomAdmin[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});
const filters = reactive({
  search: '',
  status: null as string | null,
  roomId: null as string | null,
});

// Modal state
const modalVisible = ref(false);
const modalMode = ref<'checkin' | 'edit'>('checkin');
const modalLoading = ref(false);
const editingGuest = ref<HotelGuestAdmin | null>(null);

// Form state
const guestForm = reactive({
  roomId: '',
  name: '',
  email: '',
  phone: '',
  idNumber: '',
  nationality: '',
  checkInDate: '',
  checkOutDate: '',
  preferredLanguage: 'fr',
  dietaryRestrictions: [] as string[],
  specialRequests: '',
  notes: '',
});

// ============ CONSTANTS ============
const guestStatuses = [
  { value: 'checked_in', label: 'En sejour', color: 'green' },
  { value: 'checked_out', label: 'Parti', color: 'default' },
  { value: 'reserved', label: 'Reserve', color: 'blue' },
  { value: 'no_show', label: 'No-show', color: 'red' },
];

const dietaryOptions = [
  'Vegetarien', 'Vegan', 'Sans gluten', 'Halal', 'Casher',
  'Sans lactose', 'Allergies aux noix', 'Allergies fruits de mer',
];

const languages = [
  { value: 'fr', label: 'Francais' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
  { value: 'it', label: 'Italien' },
  { value: 'ar', label: 'Arabe' },
  { value: 'zh', label: 'Chinois' },
];

// ============ COMPUTED ============
const availableRooms = computed(() => {
  return rooms.value.filter(r => r.status === 'available');
});

const filteredGuests = computed(() => {
  let result = [...guests.value];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(g =>
      g.name.toLowerCase().includes(search) ||
      g.email?.toLowerCase().includes(search) ||
      g.phone?.toLowerCase().includes(search) ||
      g.roomNumber.toLowerCase().includes(search)
    );
  }

  if (filters.status) {
    result = result.filter(g => g.status === filters.status);
  }

  if (filters.roomId) {
    result = result.filter(g => g.roomId === filters.roomId);
  }

  return result;
});

const activeGuestsCount = computed(() => guests.value.filter(g => g.status === 'checked_in').length);

// ============ TABLE COLUMNS ============
const columns: ColumnsType<HotelGuestAdmin> = [
  {
    title: 'Client',
    key: 'guest',
    width: 200,
  },
  {
    title: 'Chambre',
    dataIndex: 'roomNumber',
    key: 'roomNumber',
    width: 100,
    sorter: (a, b) => a.roomNumber.localeCompare(b.roomNumber),
  },
  {
    title: 'Contact',
    key: 'contact',
    width: 180,
  },
  {
    title: 'Sejour',
    key: 'stay',
    width: 180,
  },
  {
    title: 'Statut',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Commandes',
    key: 'orders',
    width: 120,
    align: 'center',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
];

// ============ HELPERS ============
function getStatusInfo(status: string) {
  return guestStatuses.find(s => s.value === status) || { label: status, color: 'default' };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(value);
}

function getDaysRemaining(checkOutDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkout = new Date(checkOutDate);
  checkout.setHours(0, 0, 0, 0);
  const diff = checkout.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

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

    // Load guests and rooms in parallel
    const [guestsRes, roomsRes] = await Promise.all([
      api.getHotelGuests(hotelId.value!, {
        page: pagination.current,
        limit: pagination.pageSize,
        status: filters.status || undefined,
      }),
      api.getHotelRooms(hotelId.value!, { limit: 500 }),
    ]);

    if (guestsRes.success && guestsRes.data) {
      guests.value = guestsRes.data.guests;
      pagination.total = guestsRes.data.total;
    }

    if (roomsRes.success && roomsRes.data) {
      rooms.value = roomsRes.data.rooms;
    }
  } catch (e) {
    console.error('Error loading data:', e);
    message.error('Erreur lors du chargement des donnees');
  } finally {
    isLoading.value = false;
  }
}

// ============ CRUD OPERATIONS ============
function openCheckInModal() {
  modalMode.value = 'checkin';
  editingGuest.value = null;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  Object.assign(guestForm, {
    roomId: '',
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    nationality: '',
    checkInDate: today,
    checkOutDate: tomorrow,
    preferredLanguage: 'fr',
    dietaryRestrictions: [],
    specialRequests: '',
    notes: '',
  });
  modalVisible.value = true;
}

function openEditModal(guest: HotelGuestAdmin) {
  modalMode.value = 'edit';
  editingGuest.value = guest;
  Object.assign(guestForm, {
    roomId: guest.roomId,
    name: guest.name,
    email: guest.email || '',
    phone: guest.phone || '',
    idNumber: guest.idNumber || '',
    nationality: guest.nationality || '',
    checkInDate: guest.checkInDate.split('T')[0],
    checkOutDate: guest.checkOutDate.split('T')[0],
    preferredLanguage: guest.preferredLanguage || 'fr',
    dietaryRestrictions: guest.dietaryRestrictions || [],
    specialRequests: guest.specialRequests || '',
    notes: guest.notes || '',
  });
  modalVisible.value = true;
}

async function handleSubmit() {
  if (!hotelId.value) {return;}

  if (!guestForm.roomId || !guestForm.name) {
    message.error('Veuillez remplir les champs obligatoires');
    return;
  }

  modalLoading.value = true;
  try {
    if (modalMode.value === 'checkin') {
      const res = await api.checkInGuest(hotelId.value, guestForm);
      if (res.success) {
        message.success('Check-in effectue');
        modalVisible.value = false;
        loadData();
      }
    } else if (editingGuest.value) {
      const res = await api.updateHotelGuest(hotelId.value, editingGuest.value.id, guestForm);
      if (res.success) {
        message.success('Client mis a jour');
        modalVisible.value = false;
        loadData();
      }
    }
  } catch (e) {
    console.error('Submit error:', e);
    message.error('Erreur lors de l\'operation');
  } finally {
    modalLoading.value = false;
  }
}

function confirmCheckOut(guest: HotelGuestAdmin) {
  Modal.confirm({
    title: 'Check-out',
    icon: h(ExclamationCircleOutlined),
    content: `Confirmer le depart de ${guest.name} (Chambre ${guest.roomNumber}) ?`,
    okText: 'Confirmer',
    cancelText: 'Annuler',
    onOk: () => checkOutGuest(guest),
  });
}

async function checkOutGuest(guest: HotelGuestAdmin) {
  if (!hotelId.value) {return;}

  try {
    const res = await api.checkOutGuest(hotelId.value, guest.id);
    if (res.success) {
      message.success('Check-out effectue');
      loadData();
    }
  } catch (e) {
    console.error('Checkout error:', e);
    message.error('Erreur lors du check-out');
  }
}

function clearFilters() {
  filters.search = '';
  filters.status = null;
  filters.roomId = null;
}

// ============ LIFECYCLE ============
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="hotel-guests-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>
          <TeamOutlined class="header-icon" />
          Gestion des clients
        </h1>
        <p class="header-subtitle">
          {{ activeGuestsCount }} clients actuellement en sejour
        </p>
      </div>
      <div class="header-actions">
        <a-button type="primary" @click="openCheckInModal">
          <template #icon><LoginOutlined /></template>
          Nouveau Check-in
        </a-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <a-input-search
        v-model:value="filters.search"
        placeholder="Rechercher un client..."
        style="width: 280px"
        allow-clear
      >
        <template #prefix><SearchOutlined /></template>
      </a-input-search>

      <a-select
        v-model:value="filters.status"
        placeholder="Statut"
        style="width: 150px"
        allow-clear
      >
        <a-select-option v-for="s in guestStatuses" :key="s.value" :value="s.value">
          {{ s.label }}
        </a-select-option>
      </a-select>

      <a-select
        v-model:value="filters.roomId"
        placeholder="Chambre"
        style="width: 150px"
        allow-clear
        show-search
        :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
      >
        <a-select-option
          v-for="r in rooms"
          :key="r.id"
          :value="r.id"
          :label="r.roomNumber"
        >
          {{ r.roomNumber }}
        </a-select-option>
      </a-select>

      <a-button @click="clearFilters">
        <template #icon><ClearOutlined /></template>
        Effacer
      </a-button>

      <a-button @click="loadData">
        <template #icon><ReloadOutlined /></template>
      </a-button>
    </div>

    <!-- Stats Summary -->
    <div class="stats-summary">
      <div class="stat-item active">
        <LoginOutlined />
        <span class="stat-value">{{ guests.filter(g => g.status === 'checked_in').length }}</span>
        <span class="stat-label">En sejour</span>
      </div>
      <div class="stat-item">
        <CalendarOutlined />
        <span class="stat-value">{{ guests.filter(g => g.status === 'reserved').length }}</span>
        <span class="stat-label">Reserves</span>
      </div>
      <div class="stat-item checkout">
        <LogoutOutlined />
        <span class="stat-value">{{ guests.filter(g => g.status === 'checked_out').length }}</span>
        <span class="stat-label">Partis</span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <a-table
        :columns="columns"
        :data-source="filteredGuests"
        :loading="isLoading"
        :pagination="false"
        :scroll="{ x: 1100 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'guest'">
            <div class="guest-cell">
              <a-avatar :size="40" class="guest-avatar">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <div class="guest-info">
                <span class="guest-name">{{ record.name }}</span>
                <span v-if="record.nationality" class="guest-nationality">
                  {{ record.nationality }}
                </span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'contact'">
            <div class="contact-cell">
              <div v-if="record.phone" class="contact-item">
                <PhoneOutlined />
                <span>{{ record.phone }}</span>
              </div>
              <div v-if="record.email" class="contact-item">
                <MailOutlined />
                <span>{{ record.email }}</span>
              </div>
              <span v-if="!record.phone && !record.email" class="no-contact">-</span>
            </div>
          </template>

          <template v-else-if="column.key === 'stay'">
            <div class="stay-cell">
              <div class="stay-dates">
                <span class="date-from">{{ formatDate(record.checkInDate) }}</span>
                <span class="date-separator">→</span>
                <span class="date-to">{{ formatDate(record.checkOutDate) }}</span>
              </div>
              <div v-if="record.status === 'checked_in'" class="days-remaining">
                <a-tag v-if="getDaysRemaining(record.checkOutDate) <= 1" color="orange">
                  Depart demain
                </a-tag>
                <span v-else class="days-text">
                  {{ getDaysRemaining(record.checkOutDate) }} jours restants
                </span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusInfo(record.status).color">
              {{ getStatusInfo(record.status).label }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'orders'">
            <div class="orders-cell">
              <div class="orders-count">
                <ShoppingCartOutlined />
                <span>{{ record.totalOrders }}</span>
              </div>
              <div class="orders-total">
                {{ formatPrice(record.totalSpent) }}
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Modifier">
                <a-button size="small" @click="openEditModal(record)">
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip v-if="record.status === 'checked_in'" title="Check-out">
                <a-button size="small" type="primary" @click="confirmCheckOut(record)">
                  <template #icon><LogoutOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Check-in/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalMode === 'checkin' ? 'Nouveau Check-in' : 'Modifier le client'"
      :confirm-loading="modalLoading"
      @ok="handleSubmit"
      width="700px"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Chambre" required>
              <a-select
                v-model:value="guestForm.roomId"
                placeholder="Selectionnez une chambre"
                show-search
                :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
                :disabled="modalMode === 'edit'"
              >
                <a-select-option
                  v-for="r in (modalMode === 'checkin' ? availableRooms : rooms)"
                  :key="r.id"
                  :value="r.id"
                  :label="r.roomNumber"
                >
                  {{ r.roomNumber }} ({{ r.roomType }})
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nom complet" required>
              <a-input v-model:value="guestForm.name" placeholder="Nom du client">
                <template #prefix><UserOutlined /></template>
              </a-input>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Email">
              <a-input v-model:value="guestForm.email" placeholder="Email">
                <template #prefix><MailOutlined /></template>
              </a-input>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Telephone">
              <a-input v-model:value="guestForm.phone" placeholder="Telephone">
                <template #prefix><PhoneOutlined /></template>
              </a-input>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Numero d'identite">
              <a-input v-model:value="guestForm.idNumber" placeholder="Passeport / CNI" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nationalite">
              <a-input v-model:value="guestForm.nationality" placeholder="Nationalite" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Date d'arrivee" required>
              <a-input
                v-model:value="guestForm.checkInDate"
                type="date"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Date de depart" required>
              <a-input
                v-model:value="guestForm.checkOutDate"
                type="date"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Langue preferee">
              <a-select v-model:value="guestForm.preferredLanguage">
                <a-select-option v-for="l in languages" :key="l.value" :value="l.value">
                  {{ l.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Restrictions alimentaires">
              <a-select
                v-model:value="guestForm.dietaryRestrictions"
                mode="multiple"
                placeholder="Selectionnez"
              >
                <a-select-option v-for="d in dietaryOptions" :key="d" :value="d">
                  {{ d }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Demandes speciales">
          <a-textarea
            v-model:value="guestForm.specialRequests"
            placeholder="Demandes particulieres du client..."
            :rows="2"
          />
        </a-form-item>

        <a-form-item label="Notes internes">
          <a-textarea
            v-model:value="guestForm.notes"
            placeholder="Notes pour le personnel..."
            :rows="2"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.hotel-guests-view {
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
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-item .anticon {
  font-size: 24px;
  color: #94a3b8;
}

.stat-item.active .anticon { color: #10b981; }
.stat-item.checkout .anticon { color: #64748b; }

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.table-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.guest-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.guest-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  flex-shrink: 0;
}

.guest-info {
  display: flex;
  flex-direction: column;
}

.guest-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.guest-nationality {
  font-size: 12px;
  color: #94a3b8;
}

.contact-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}

.contact-item .anticon {
  color: #94a3b8;
  font-size: 12px;
}

.no-contact {
  color: #94a3b8;
}

.stay-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stay-dates {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.date-from,
.date-to {
  color: #1e293b;
}

.date-separator {
  color: #94a3b8;
  font-size: 11px;
}

.days-remaining {
  font-size: 12px;
}

.days-text {
  color: #64748b;
}

.orders-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.orders-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #475569;
}

.orders-total {
  font-weight: 600;
  color: #10b981;
  font-size: 13px;
}
</style>
