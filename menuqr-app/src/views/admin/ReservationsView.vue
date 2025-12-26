<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue';
import { message } from 'ant-design-vue';
import {
  CalendarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  MessageOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ReloadOutlined,
  LeftOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import api from '@/services/api';
import type { Reservation, ReservationStats, Table, ReservationStatus } from '@/types/reservation';
import { RESERVATION_STATUS_LABELS, LOCATION_LABELS } from '@/types/reservation';

dayjs.locale('fr');

// Type guard to check if tableId is a populated Table object
const isPopulatedTable = (tableId: string | Table | undefined): tableId is Table => {
  return typeof tableId === 'object' && tableId !== null && 'name' in tableId;
};

// Get table name safely
const getTableName = (tableId: string | Table | undefined): string | null => {
  if (isPopulatedTable(tableId)) {
    return tableId.name;
  }
  return null;
};

const isLoading = ref(true);
const error = ref<string | null>(null);
const reservations = ref<Reservation[]>([]);
const tables = ref<Table[]>([]);
const stats = ref<ReservationStats | null>(null);
const selectedDate = ref<Dayjs>(dayjs());
const statusFilter = ref<string>('all');
const showDetailModal = ref(false);
const selectedReservation = ref<Reservation | null>(null);
const showCancelModal = ref(false);
const cancelReason = ref('');
const actionLoading = ref(false);

const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });

// Status configuration for tags
const statusConfig: Record<string, { color: string; icon: () => ReturnType<typeof h> }> = {
  pending: { color: 'warning', icon: () => h(ClockCircleOutlined) },
  confirmed: { color: 'processing', icon: () => h(CheckCircleOutlined) },
  arrived: { color: 'purple', icon: () => h(UserOutlined) },
  seated: { color: 'success', icon: () => h(CheckCircleOutlined) },
  completed: { color: 'default', icon: () => h(CheckCircleOutlined) },
  cancelled: { color: 'error', icon: () => h(CloseCircleOutlined) },
  no_show: { color: 'error', icon: () => h(ExclamationCircleOutlined) },
};

// Avatar color generation based on name
const avatarColors = [
  '#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#52c41a', '#eb2f96', '#1890ff', '#fa541c',
];

const getAvatarColor = (name: string): string => {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Time slots for timeline
const timeSlots = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

// Group reservations by time slot for timeline
const reservationsByTimeSlot = computed(() => {
  const grouped: Record<string, Reservation[]> = {};
  for (const slot of timeSlots) {
    grouped[slot] = reservations.value?.filter(r => r.timeSlot === slot) || [];
  }
  return grouped;
});

// Active time slots (with reservations)
const activeTimeSlots = computed(() => {
  return timeSlots.filter(slot => reservationsByTimeSlot.value[slot]?.length > 0);
});

// Upcoming arrivals (next 3 pending/confirmed reservations)
const upcomingArrivals = computed(() => {
  if (!reservations.value) return [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  return reservations.value
    .filter(r => ['pending', 'confirmed'].includes(r.status) && r.timeSlot >= currentTime)
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    .slice(0, 3);
});

// Stats calculations
const todayReservations = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value.filter(r => !['cancelled', 'no_show'].includes(r.status)).length;
});

const todayGuests = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value
    .filter(r => !['cancelled', 'no_show'].includes(r.status))
    .reduce((sum, r) => sum + r.partySize, 0);
});

const pendingCount = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value.filter(r => r.status === 'pending').length;
});

const seatedCount = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value.filter(r => r.status === 'seated').length;
});

// Status tabs with counts
const statusTabs = computed(() => [
  { key: 'all', label: 'Toutes', count: reservations.value?.length || 0 },
  { key: 'pending', label: 'En attente', count: pendingCount.value },
  { key: 'confirmed', label: 'Confirmées', count: reservations.value?.filter(r => r.status === 'confirmed').length || 0 },
  { key: 'seated', label: 'En salle', count: seatedCount.value },
]);

// Filtered reservations by status
const filteredReservations = computed(() => {
  if (!reservations.value) return [];
  if (statusFilter.value === 'all') return reservations.value;
  return reservations.value.filter(r => r.status === statusFilter.value);
});

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const dateFrom = selectedDate.value.startOf('day').toISOString();
    const dateTo = selectedDate.value.endOf('day').toISOString();

    const [reservationsRes, statsRes, tablesRes] = await Promise.all([
      api.getReservations({
        dateFrom,
        dateTo,
        page: pagination.value.page,
        limit: pagination.value.limit,
      }),
      api.getReservationStats({
        dateFrom: dayjs().subtract(30, 'day').toISOString(),
        dateTo: dayjs().toISOString(),
      }),
      api.getTables(),
    ]);

    if (reservationsRes.success && reservationsRes.data) {
      reservations.value = reservationsRes.data.reservations || [];
      pagination.value = reservationsRes.data.pagination || pagination.value;
    }
    if (statsRes.success && statsRes.data) {
      stats.value = statsRes.data;
    }
    if (tablesRes.success && tablesRes.data) {
      tables.value = tablesRes.data;
    }
  } catch (err) {
    error.value = 'Erreur lors du chargement des réservations';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('ddd D MMM');
};

const formatFullDate = (date: Dayjs) => {
  return date.format('dddd D MMMM YYYY');
};

const openDetail = (reservation: Reservation) => {
  selectedReservation.value = reservation;
  showDetailModal.value = true;
};

const closeDetail = () => {
  showDetailModal.value = false;
  selectedReservation.value = null;
};

const confirmReservation = async (id: string) => {
  actionLoading.value = true;
  try {
    await api.confirmReservation(id);
    message.success('Réservation confirmée');
    await fetchData();
    closeDetail();
  } catch (err) {
    message.error('Erreur lors de la confirmation');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
};

const markArrived = async (id: string) => {
  actionLoading.value = true;
  try {
    await api.markReservationArrived(id);
    message.success('Client marqué comme arrivé');
    await fetchData();
    closeDetail();
  } catch (err) {
    message.error('Erreur lors de la mise à jour');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
};

const markSeated = async (id: string) => {
  actionLoading.value = true;
  try {
    await api.markReservationSeated(id);
    message.success('Client placé à table');
    await fetchData();
    closeDetail();
  } catch (err) {
    message.error('Erreur lors de la mise à jour');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
};

const markCompleted = async (id: string) => {
  actionLoading.value = true;
  try {
    await api.markReservationCompleted(id);
    message.success('Réservation terminée');
    await fetchData();
    closeDetail();
  } catch (err) {
    message.error('Erreur lors de la mise à jour');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
};

const markNoShow = async (id: string) => {
  actionLoading.value = true;
  try {
    await api.markReservationNoShow(id);
    message.success('Marqué comme absent');
    await fetchData();
    closeDetail();
  } catch (err) {
    message.error('Erreur lors de la mise à jour');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
};

const openCancelModal = () => {
  cancelReason.value = '';
  showCancelModal.value = true;
};

const cancelReservation = async () => {
  if (!selectedReservation.value) return;
  actionLoading.value = true;
  try {
    await api.cancelReservationAdmin(selectedReservation.value._id, cancelReason.value);
    message.success('Réservation annulée');
    showCancelModal.value = false;
    await fetchData();
    closeDetail();
  } catch (err) {
    message.error('Erreur lors de l\'annulation');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
};

const navigateDate = (days: number) => {
  selectedDate.value = selectedDate.value.add(days, 'day');
};

const goToToday = () => {
  selectedDate.value = dayjs();
};

const isToday = computed(() => {
  return selectedDate.value.isSame(dayjs(), 'day');
});

const handleDateChange = (date: Dayjs | null) => {
  if (date) {
    selectedDate.value = date;
  }
};

watch(selectedDate, () => {
  pagination.value.page = 1;
  fetchData();
});

onMounted(fetchData);
</script>

<template>
  <div class="reservations-view space-y-6">
    <!-- Header Card with Stats -->
    <a-card class="header-card" :bordered="false">
      <div class="header-gradient">
        <div class="header-content">
          <div class="header-title-row">
            <div class="header-title">
              <div class="title-icon">
                <CalendarOutlined />
              </div>
              <div>
                <h1>Réservations</h1>
                <p>Gérez les réservations de votre restaurant</p>
              </div>
            </div>
            <a-button type="primary" ghost @click="fetchData" :loading="isLoading">
              <template #icon><ReloadOutlined /></template>
              Actualiser
            </a-button>
          </div>

          <!-- Stats Row -->
          <a-row :gutter="[16, 16]" class="stats-row">
            <a-col :xs="12" :sm="6">
              <div class="stat-card">
                <a-statistic
                  :value="todayReservations"
                  title="Réservations"
                  :value-style="{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }"
                >
                  <template #prefix><TeamOutlined /></template>
                </a-statistic>
                <div v-if="stats" class="stat-sub">{{ stats.total }} sur 30j</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="6">
              <div class="stat-card">
                <a-statistic
                  :value="todayGuests"
                  title="Couverts"
                  :value-style="{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }"
                >
                  <template #prefix><UserOutlined /></template>
                </a-statistic>
                <div v-if="stats" class="stat-sub">Moy. {{ stats.avgPartySize?.toFixed(1) || '-' }} pers.</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="6">
              <div class="stat-card warning">
                <a-statistic
                  :value="pendingCount"
                  title="En attente"
                  :value-style="{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }"
                >
                  <template #prefix><ClockCircleOutlined /></template>
                </a-statistic>
                <div v-if="pendingCount > 0" class="stat-sub warning-text">À confirmer</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="6">
              <div class="stat-card success">
                <a-statistic
                  :value="seatedCount"
                  title="En salle"
                  :value-style="{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }"
                >
                  <template #prefix><CheckCircleOutlined /></template>
                </a-statistic>
                <div v-if="stats" class="stat-sub">{{ stats.noShowRate || 0 }}% no-show</div>
              </div>
            </a-col>
          </a-row>
        </div>
      </div>
    </a-card>

    <!-- Date Navigation & Filters -->
    <a-card :bordered="false">
      <div class="filters-row">
        <div class="date-nav">
          <a-button @click="navigateDate(-1)">
            <template #icon><LeftOutlined /></template>
          </a-button>
          <a-date-picker
            :value="selectedDate"
            @change="handleDateChange"
            :allow-clear="false"
            format="DD/MM/YYYY"
          />
          <a-button @click="navigateDate(1)">
            <template #icon><RightOutlined /></template>
          </a-button>
          <a-button v-if="!isToday" type="primary" @click="goToToday">
            Aujourd'hui
          </a-button>
          <span class="date-label">{{ formatFullDate(selectedDate) }}</span>
        </div>
      </div>
    </a-card>

    <!-- Loading State -->
    <a-card v-if="isLoading" :bordered="false" class="text-center py-16">
      <a-spin size="large" tip="Chargement des réservations..." />
    </a-card>

    <!-- Error State -->
    <a-result
      v-else-if="error"
      status="error"
      title="Erreur de chargement"
      :sub-title="error"
    >
      <template #extra>
        <a-button type="primary" @click="fetchData">Réessayer</a-button>
      </template>
    </a-result>

    <!-- Content -->
    <template v-else>
      <!-- Upcoming Arrivals (only if today) -->
      <a-card
        v-if="isToday && upcomingArrivals.length > 0"
        :bordered="false"
        class="upcoming-card"
      >
        <template #title>
          <ClockCircleOutlined class="mr-2 text-orange-500" />
          Prochaines arrivées
        </template>
        <a-row :gutter="[16, 16]">
          <a-col v-for="arrival in upcomingArrivals" :key="arrival._id" :xs="24" :sm="8">
            <a-card hoverable size="small" @click="openDetail(arrival)" class="arrival-card">
              <div class="arrival-content">
                <a-avatar
                  :size="48"
                  :style="{ backgroundColor: getAvatarColor(arrival.customerName) }"
                >
                  {{ getInitials(arrival.customerName) }}
                </a-avatar>
                <div class="arrival-info">
                  <div class="arrival-time">
                    <span class="time">{{ arrival.timeSlot }}</span>
                    <a-tag color="orange">{{ arrival.partySize }} pers.</a-tag>
                  </div>
                  <div class="arrival-name">{{ arrival.customerName }}</div>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-card>

      <!-- Timeline View -->
      <a-card v-if="activeTimeSlots.length > 0" :bordered="false">
        <template #title>
          <CalendarOutlined class="mr-2 text-teal-500" />
          Timeline des créneaux
        </template>
        <a-timeline mode="left">
          <a-timeline-item
            v-for="slot in activeTimeSlots"
            :key="slot"
            color="blue"
          >
            <template #dot>
              <div class="timeline-dot">{{ slot }}</div>
            </template>
            <div class="timeline-reservations">
              <a-tag
                v-for="res in reservationsByTimeSlot[slot]"
                :key="res._id"
                :color="statusConfig[res.status]?.color"
                class="reservation-tag"
                @click="openDetail(res)"
              >
                <span class="font-medium">{{ res.customerName }}</span>
                <a-badge :count="res.partySize" :number-style="{ backgroundColor: '#52c41a' }" />
              </a-tag>
            </div>
          </a-timeline-item>
        </a-timeline>
      </a-card>

      <!-- Reservations List with Tabs -->
      <a-card :bordered="false">
        <a-tabs v-model:activeKey="statusFilter">
          <a-tab-pane v-for="tab in statusTabs" :key="tab.key">
            <template #tab>
              <a-badge :count="tab.count" :offset="[10, 0]" :number-style="{ backgroundColor: tab.key === 'pending' ? '#faad14' : '#14b8a6' }">
                {{ tab.label }}
              </a-badge>
            </template>
          </a-tab-pane>
        </a-tabs>

        <!-- Reservations Grid -->
        <div v-if="filteredReservations.length > 0" class="reservations-grid">
          <a-row :gutter="[16, 16]">
            <a-col
              v-for="res in filteredReservations"
              :key="res._id"
              :xs="24"
              :lg="12"
            >
              <a-card
                hoverable
                size="small"
                class="reservation-card"
                :class="`status-${res.status}`"
                @click="openDetail(res)"
              >
                <div class="reservation-content">
                  <a-avatar
                    :size="56"
                    :style="{ backgroundColor: getAvatarColor(res.customerName) }"
                    class="reservation-avatar"
                  >
                    {{ getInitials(res.customerName) }}
                  </a-avatar>

                  <div class="reservation-info">
                    <div class="reservation-header">
                      <span class="customer-name">{{ res.customerName }}</span>
                      <a-tag :color="statusConfig[res.status]?.color">
                        <component :is="statusConfig[res.status]?.icon" />
                        {{ RESERVATION_STATUS_LABELS[res.status] }}
                      </a-tag>
                    </div>

                    <div class="reservation-details">
                      <span class="detail-item time">
                        <ClockCircleOutlined />
                        {{ res.timeSlot }}
                      </span>
                      <span class="detail-item">
                        <TeamOutlined />
                        {{ res.partySize }} pers.
                      </span>
                      <span class="detail-item">
                        <EnvironmentOutlined />
                        {{ LOCATION_LABELS[res.locationPreference] }}
                      </span>
                      <span v-if="isPopulatedTable(res.tableId)" class="detail-item">
                        Table: {{ getTableName(res.tableId) }}
                      </span>
                    </div>
                  </div>

                  <div class="reservation-meta">
                    <span class="reservation-number">{{ res.reservationNumber }}</span>
                    <a-tag v-if="res.preOrder" color="green" size="small">
                      <ShoppingCartOutlined /> Pré-commande
                    </a-tag>
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>

        <!-- Empty State -->
        <a-empty
          v-else
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          :description="`Aucune réservation pour le ${formatFullDate(selectedDate)}`"
        />
      </a-card>
    </template>

    <!-- Detail Modal -->
    <a-modal
      v-model:open="showDetailModal"
      :footer="null"
      width="600px"
      class="reservation-detail-modal"
      :destroy-on-close="true"
    >
      <template v-if="selectedReservation">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="modal-header-content">
            <a-avatar
              :size="64"
              :style="{ backgroundColor: getAvatarColor(selectedReservation.customerName) }"
            >
              {{ getInitials(selectedReservation.customerName) }}
            </a-avatar>
            <div class="modal-header-info">
              <span class="reservation-number">{{ selectedReservation.reservationNumber }}</span>
              <h3>{{ selectedReservation.customerName }}</h3>
            </div>
            <a-tag :color="statusConfig[selectedReservation.status]?.color" size="large">
              <component :is="statusConfig[selectedReservation.status]?.icon" />
              {{ RESERVATION_STATUS_LABELS[selectedReservation.status] }}
            </a-tag>
          </div>

          <div class="modal-header-badges">
            <a-tag>
              <CalendarOutlined />
              {{ formatDate(selectedReservation.reservationDate) }} à {{ selectedReservation.timeSlot }}
            </a-tag>
            <a-tag>
              <TeamOutlined />
              {{ selectedReservation.partySize }} personnes
            </a-tag>
            <a-tag>
              <EnvironmentOutlined />
              {{ LOCATION_LABELS[selectedReservation.locationPreference] }}
            </a-tag>
          </div>
        </div>

        <a-divider />

        <!-- Contact -->
        <a-descriptions title="Contact" :column="1" size="small" bordered>
          <a-descriptions-item>
            <template #label><PhoneOutlined /> Téléphone</template>
            {{ selectedReservation.customerPhone }}
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedReservation.customerEmail">
            <template #label><MailOutlined /> Email</template>
            {{ selectedReservation.customerEmail }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- Special Requests -->
        <a-alert
          v-if="selectedReservation.specialRequests"
          type="warning"
          show-icon
          class="mt-4"
        >
          <template #icon><MessageOutlined /></template>
          <template #message>Demandes spéciales</template>
          <template #description>{{ selectedReservation.specialRequests }}</template>
        </a-alert>

        <!-- Pre-order -->
        <div v-if="selectedReservation.preOrder" class="preorder-section mt-4">
          <h4><ShoppingCartOutlined /> Pré-commande</h4>
          <a-table
            :data-source="selectedReservation.preOrder.items"
            :pagination="false"
            size="small"
            :columns="[
              { title: 'Plat', dataIndex: 'name', key: 'name' },
              { title: 'Qté', dataIndex: 'quantity', key: 'quantity', width: 60 },
              { title: 'Prix', dataIndex: 'totalPrice', key: 'price', width: 100, customRender: ({ value }) => `${value?.toLocaleString() || 0} XOF` },
            ]"
            :row-key="item => item.dishId"
          />
          <div class="preorder-total">
            Total: {{ selectedReservation.preOrder.subtotal.toLocaleString() }} XOF
          </div>
        </div>

        <a-divider />

        <!-- Actions -->
        <div class="modal-actions">
          <template v-if="selectedReservation.status === 'pending'">
            <a-button
              type="primary"
              size="large"
              block
              :loading="actionLoading"
              @click="confirmReservation(selectedReservation._id)"
            >
              <CheckCircleOutlined /> Confirmer la réservation
            </a-button>
            <a-button danger size="large" block @click="openCancelModal">
              Annuler
            </a-button>
          </template>

          <template v-else-if="selectedReservation.status === 'confirmed'">
            <a-button
              type="primary"
              size="large"
              block
              :loading="actionLoading"
              @click="markArrived(selectedReservation._id)"
            >
              <UserOutlined /> Marquer comme arrivé
            </a-button>
            <a-button danger size="large" block @click="markNoShow(selectedReservation._id)" :loading="actionLoading">
              Marquer absent
            </a-button>
          </template>

          <template v-else-if="selectedReservation.status === 'arrived'">
            <a-button
              type="primary"
              size="large"
              block
              :loading="actionLoading"
              @click="markSeated(selectedReservation._id)"
              style="background: #52c41a; border-color: #52c41a"
            >
              <CheckCircleOutlined /> Placer à table
            </a-button>
          </template>

          <template v-else-if="selectedReservation.status === 'seated'">
            <a-button
              size="large"
              block
              :loading="actionLoading"
              @click="markCompleted(selectedReservation._id)"
            >
              <CheckCircleOutlined /> Terminer la réservation
            </a-button>
          </template>
        </div>
      </template>
    </a-modal>

    <!-- Cancel Modal -->
    <a-modal
      v-model:open="showCancelModal"
      title="Annuler la réservation"
      @ok="cancelReservation"
      :confirm-loading="actionLoading"
      ok-text="Confirmer l'annulation"
      cancel-text="Retour"
      ok-type="danger"
    >
      <a-alert
        type="warning"
        message="Cette action est irréversible"
        description="Le client recevra une notification d'annulation."
        show-icon
        class="mb-4"
      />
      <a-form layout="vertical">
        <a-form-item label="Raison de l'annulation (optionnel)">
          <a-textarea
            v-model:value="cancelReason"
            :rows="3"
            placeholder="Raison de l'annulation..."
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts">
import { Empty } from 'ant-design-vue';
export default {
  computed: {
    Empty() { return Empty; }
  }
};
</script>

<style scoped>
.reservations-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header Card Styles */
.header-card :deep(.ant-card-body) {
  padding: 0;
}

.header-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  padding: 24px;
  border-radius: 8px;
}

.header-content {
  color: white;
}

.header-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.header-title h1 {
  margin: 0;
  font-size: 28px;
  font-weight: bold;
  color: white;
}

.header-title p {
  margin: 0;
  opacity: 0.8;
  font-size: 14px;
}

.stats-row {
  margin-top: 24px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  padding: 16px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.stat-card :deep(.ant-statistic-title) {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.stat-sub {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.stat-card.warning {
  background: rgba(250, 173, 20, 0.3);
}

.warning-text {
  color: #ffd666;
}

.stat-card.success {
  background: rgba(82, 196, 26, 0.3);
}

/* Filters Row */
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.date-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.date-label {
  font-weight: 500;
  color: #666;
  text-transform: capitalize;
}

/* Upcoming Arrivals */
.upcoming-card {
  background: linear-gradient(135deg, #fff7e6 0%, #fff1f0 100%);
}

.arrival-card {
  border-left: 3px solid #fa8c16;
}

.arrival-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.arrival-info {
  flex: 1;
}

.arrival-time {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrival-time .time {
  font-size: 20px;
  font-weight: bold;
  color: #fa8c16;
}

.arrival-name {
  font-weight: 500;
  color: #333;
}

/* Timeline */
.timeline-dot {
  background: #1890ff;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 13px;
}

.timeline-reservations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reservation-tag {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
}

.reservation-tag:hover {
  opacity: 0.8;
}

/* Reservations Grid */
.reservations-grid {
  margin-top: 16px;
}

.reservation-card {
  border-left: 4px solid transparent;
  transition: all 0.3s;
}

.reservation-card.status-pending {
  border-left-color: #faad14;
}

.reservation-card.status-confirmed {
  border-left-color: #1890ff;
}

.reservation-card.status-arrived {
  border-left-color: #722ed1;
}

.reservation-card.status-seated {
  border-left-color: #52c41a;
}

.reservation-card.status-completed {
  border-left-color: #8c8c8c;
}

.reservation-card.status-cancelled,
.reservation-card.status-no_show {
  border-left-color: #ff4d4f;
}

.reservation-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.reservation-avatar {
  flex-shrink: 0;
}

.reservation-info {
  flex: 1;
  min-width: 0;
}

.reservation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.customer-name {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.reservation-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  color: #666;
  font-size: 13px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-item.time {
  color: #1890ff;
  font-weight: 500;
}

.reservation-meta {
  text-align: right;
  flex-shrink: 0;
}

.reservation-number {
  font-family: monospace;
  color: #999;
  font-size: 12px;
}

/* Modal Styles */
.reservation-detail-modal :deep(.ant-modal-body) {
  padding: 0;
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  color: white;
  border-radius: 8px 8px 0 0;
  margin: -24px -24px 24px;
}

.modal-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-header-info {
  flex: 1;
}

.modal-header-info .reservation-number {
  opacity: 0.8;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.modal-header-info h3 {
  margin: 4px 0 0;
  font-size: 24px;
  color: white;
}

.modal-header-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.modal-header-badges .ant-tag {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

/* Pre-order Section */
.preorder-section {
  background: #f6ffed;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #b7eb8f;
}

.preorder-section h4 {
  margin: 0 0 12px;
  color: #52c41a;
}

.preorder-total {
  text-align: right;
  font-weight: bold;
  font-size: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #b7eb8f;
  color: #52c41a;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .header-title h1 {
    font-size: 22px;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .date-nav {
    justify-content: center;
  }

  .reservation-content {
    flex-wrap: wrap;
  }

  .reservation-meta {
    width: 100%;
    text-align: left;
    margin-top: 8px;
  }
}
</style>
