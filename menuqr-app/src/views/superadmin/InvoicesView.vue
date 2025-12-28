<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import api from '@/services/api';
import {
  ReloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { Modal, message } from 'ant-design-vue';

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
}

interface Plan {
  _id: string;
  name: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  restaurantId: Restaurant;
  planId: Plan;
  billingCycle: 'monthly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  createdAt: string;
}

const loading = ref(true);
const invoices = ref<Invoice[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});
const statusFilter = ref('all');

// Drawer state
const drawerVisible = ref(false);
const selectedInvoice = ref<Invoice | null>(null);

const columns: TableColumnsType = [
  {
    title: 'Facture',
    key: 'invoiceNumber',
    fixed: 'left',
    width: 150,
  },
  {
    title: 'Restaurant',
    key: 'restaurant',
    width: 200,
  },
  {
    title: 'Plan',
    key: 'plan',
    width: 120,
  },
  {
    title: 'Montant',
    key: 'amount',
    width: 120,
    align: 'right',
  },
  {
    title: 'Statut',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: 'Echeance',
    key: 'dueDate',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 150,
    align: 'center',
  },
];

const statusColors: Record<string, string> = {
  draft: 'default',
  pending: 'orange',
  paid: 'green',
  failed: 'red',
  refunded: 'purple',
  cancelled: 'default',
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  paid: 'Payee',
  failed: 'Echouee',
  refunded: 'Remboursee',
  cancelled: 'Annulee',
};

const fetchInvoices = async () => {
  loading.value = true;
  try {
    const response = await api.get<{
      invoices: Invoice[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>('/superadmin/invoices', {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    });

    if (response.success && response.data) {
      invoices.value = response.data.invoices;
      pagination.value.total = response.data.pagination.total;
    }
  } catch (_error) {
    console.error('Failed to fetch invoices:');
    message.error('Erreur lors du chargement des factures');
  } finally {
    loading.value = false;
  }
};

const handleTableChange = (pag: { current: number; pageSize: number }) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchInvoices();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchInvoices();
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

const formatCurrency = (amount: number, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const isOverdue = (invoice: Invoice) => {
  if (invoice.status !== 'pending') {return false;}
  return new Date(invoice.dueDate) < new Date();
};

// Drawer functions
const openDrawer = (invoice: Invoice) => {
  selectedInvoice.value = invoice;
  drawerVisible.value = true;
};

const closeDrawer = () => {
  drawerVisible.value = false;
  selectedInvoice.value = null;
};

// Update invoice status
const markAsPaid = (invoice: Invoice) => {
  Modal.confirm({
    title: 'Marquer comme payee ?',
    icon: h(ExclamationCircleOutlined),
    content: h('div', {}, [
      h('p', {}, `Facture: ${invoice.invoiceNumber}`),
      h('p', { style: 'font-weight: 600;' }, `Montant: ${formatCurrency(invoice.total)}`),
    ]),
    okText: 'Marquer payee',
    cancelText: 'Annuler',
    async onOk() {
      try {
        const response = await api.put(`/superadmin/invoices/${invoice._id}/status`, {
          status: 'paid',
          paymentMethod: 'manual',
        });

        if (response.success) {
          message.success('Facture marquee comme payee');
          fetchInvoices();
          if (selectedInvoice.value?._id === invoice._id) {
            closeDrawer();
          }
        } else {
          message.error(response.message || 'Une erreur est survenue');
        }
      } catch (_error) {
        console.error('Failed to update invoice:');
        message.error('Erreur lors de la mise a jour');
      }
    },
  });
};

const markAsFailed = (invoice: Invoice) => {
  Modal.confirm({
    title: 'Marquer comme echouee ?',
    icon: h(ExclamationCircleOutlined),
    content: h('div', {}, [
      h('p', {}, `Facture: ${invoice.invoiceNumber}`),
      h('p', { style: 'color: #f97316;' }, 'Cette action marquera le paiement comme echoue.'),
    ]),
    okText: 'Marquer echouee',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        const response = await api.put(`/superadmin/invoices/${invoice._id}/status`, {
          status: 'failed',
        });

        if (response.success) {
          message.success('Facture marquee comme echouee');
          fetchInvoices();
          if (selectedInvoice.value?._id === invoice._id) {
            closeDrawer();
          }
        } else {
          message.error(response.message || 'Une erreur est survenue');
        }
      } catch (_error) {
        console.error('Failed to update invoice:');
        message.error('Erreur lors de la mise a jour');
      }
    },
  });
};

onMounted(() => {
  fetchInvoices();
});
</script>

<template>
  <div class="invoices-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Factures</h1>
        <p class="page-subtitle">Historique des factures de la plateforme</p>
      </div>
      <a-button @click="fetchInvoices">
        <template #icon><ReloadOutlined /></template>
        Actualiser
      </a-button>
    </div>

    <!-- Filters -->
    <a-card class="filters-card mb-4">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="6">
          <a-select v-model:value="statusFilter" style="width: 100%" @change="handleSearch">
            <a-select-option value="all">Tous les statuts</a-select-option>
            <a-select-option value="pending">En attente</a-select-option>
            <a-select-option value="paid">Payee</a-select-option>
            <a-select-option value="failed">Echouee</a-select-option>
            <a-select-option value="refunded">Remboursee</a-select-option>
            <a-select-option value="cancelled">Annulee</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="invoices"
        :loading="loading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} factures`,
        }"
        :scroll="{ x: 900 }"
        row-key="_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'invoiceNumber'">
            <div class="invoice-cell" @click="openDrawer(record)" style="cursor: pointer;">
              <FileTextOutlined class="invoice-icon" />
              <span class="invoice-number">{{ record.invoiceNumber }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'restaurant'">
            <span>{{ record.restaurantId?.name || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'plan'">
            <a-tag color="purple">{{ record.planId?.name || '-' }}</a-tag>
          </template>

          <template v-else-if="column.key === 'amount'">
            <span class="amount">{{ formatCurrency(record.total, record.currency) }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status]">
              {{ statusLabels[record.status] }}
            </a-tag>
            <a-tag v-if="isOverdue(record)" color="red" class="ml-1">
              En retard
            </a-tag>
          </template>

          <template v-else-if="column.key === 'dueDate'">
            <span :class="{ 'text-red': isOverdue(record) }">
              {{ formatDate(record.dueDate) }}
            </span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Voir details">
                <a-button type="text" size="small" @click="openDrawer(record)">
                  <template #icon><EyeOutlined /></template>
                </a-button>
              </a-tooltip>
              <template v-if="record.status === 'pending'">
                <a-tooltip title="Marquer payee">
                  <a-button type="text" size="small" class="text-green" @click="markAsPaid(record)">
                    <template #icon><CheckOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip title="Marquer echouee">
                  <a-button type="text" size="small" danger @click="markAsFailed(record)">
                    <template #icon><CloseOutlined /></template>
                  </a-button>
                </a-tooltip>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-empty v-if="invoices.length === 0 && !loading" description="Aucune facture" />
    </a-card>

    <!-- Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Details de la facture"
      placement="right"
      :width="520"
      @close="closeDrawer"
    >
      <template v-if="selectedInvoice">
        <div class="drawer-content">
          <div class="invoice-header">
            <div class="invoice-title">
              <FileTextOutlined class="title-icon" />
              <h2>{{ selectedInvoice.invoiceNumber }}</h2>
            </div>
            <a-tag :color="statusColors[selectedInvoice.status]" size="large">
              {{ statusLabels[selectedInvoice.status] }}
            </a-tag>
          </div>

          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="Restaurant">
              {{ selectedInvoice.restaurantId?.name || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Plan">
              <a-tag color="purple">{{ selectedInvoice.planId?.name || '-' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Cycle">
              {{ selectedInvoice.billingCycle === 'monthly' ? 'Mensuel' : 'Annuel' }}
            </a-descriptions-item>
            <a-descriptions-item label="Periode">
              {{ formatDate(selectedInvoice.periodStart) }} - {{ formatDate(selectedInvoice.periodEnd) }}
            </a-descriptions-item>
            <a-descriptions-item label="Date d'echeance">
              <span :class="{ 'text-red': isOverdue(selectedInvoice) }">
                {{ formatDate(selectedInvoice.dueDate) }}
              </span>
              <a-tag v-if="isOverdue(selectedInvoice)" color="red" class="ml-2">
                En retard
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedInvoice.paidAt" label="Date de paiement">
              {{ formatDate(selectedInvoice.paidAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedInvoice.paymentMethod" label="Methode">
              {{ selectedInvoice.paymentMethod }}
            </a-descriptions-item>
          </a-descriptions>

          <a-divider>Details</a-divider>

          <div class="invoice-items">
            <div v-for="item in selectedInvoice.items" :key="item.description" class="invoice-item">
              <div class="item-info">
                <span class="item-description">{{ item.description }}</span>
                <span class="item-quantity">x{{ item.quantity }}</span>
              </div>
              <span class="item-amount">{{ formatCurrency(item.amount, selectedInvoice.currency) }}</span>
            </div>
          </div>

          <div class="invoice-totals">
            <div class="total-row">
              <span>Sous-total</span>
              <span>{{ formatCurrency(selectedInvoice.subtotal, selectedInvoice.currency) }}</span>
            </div>
            <div class="total-row">
              <span>TVA ({{ selectedInvoice.taxRate }}%)</span>
              <span>{{ formatCurrency(selectedInvoice.taxAmount, selectedInvoice.currency) }}</span>
            </div>
            <a-divider style="margin: 12px 0" />
            <div class="total-row total-final">
              <span>Total</span>
              <span>{{ formatCurrency(selectedInvoice.total, selectedInvoice.currency) }}</span>
            </div>
          </div>

          <a-divider />

          <div class="drawer-actions" v-if="selectedInvoice.status === 'pending'">
            <a-button type="primary" block @click="markAsPaid(selectedInvoice)">
              <template #icon><CheckOutlined /></template>
              Marquer comme payee
            </a-button>
            <a-button danger block @click="markAsFailed(selectedInvoice)">
              <template #icon><CloseOutlined /></template>
              Marquer comme echouee
            </a-button>
          </div>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.invoices-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.filters-card {
  border-radius: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.invoice-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-cell:hover .invoice-number {
  color: #1890ff;
}

.invoice-icon {
  color: #8b5cf6;
  font-size: 16px;
}

.invoice-number {
  font-weight: 600;
  color: #1e293b;
  transition: color 0.2s;
}

.amount {
  font-weight: 600;
  color: #1e293b;
}

.text-red {
  color: #ef4444;
}

.text-green {
  color: #10b981;
}

.ml-1 {
  margin-left: 4px;
}

.ml-2 {
  margin-left: 8px;
}

/* Drawer styles */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.invoice-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 24px;
  color: #8b5cf6;
}

.invoice-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.invoice-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invoice-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-description {
  font-weight: 500;
  color: #1e293b;
}

.item-quantity {
  font-size: 12px;
  color: #64748b;
}

.item-amount {
  font-weight: 600;
  color: #1e293b;
}

.invoice-totals {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: #64748b;
}

.total-final {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
