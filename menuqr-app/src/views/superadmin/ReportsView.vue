<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  ShopOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  AuditOutlined,
  ReloadOutlined,
  CalendarOutlined,
  EyeOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import api from '@/services/api';

// Types
interface ReportType {
  id: string;
  name: string;
  description: string;
  formats: string[];
  filters: string[];
}

interface ReportStats {
  totalRestaurants: number;
  totalUsers: number;
  monthlyOrders: number;
  monthlyRevenue: string;
  revenueGrowth: number;
  orderGrowth: number;
}

interface ReportPreview {
  title: string;
  generatedAt: string;
  totalCount?: number;
  data?: Record<string, unknown>[];
  summary?: Record<string, unknown>;
}

// State
const loading = ref(false);
const reportTypes = ref<ReportType[]>([]);
const stats = ref<ReportStats | null>(null);
const selectedReport = ref<string>('');
const previewData = ref<ReportPreview | null>(null);
const previewModalVisible = ref(false);

// Filters
const filters = reactive({
  startDate: '',
  endDate: '',
  status: '',
  role: '',
  restaurantId: '',
  planId: '',
  action: '',
  category: '',
});

// Report icons
const reportIcons: Record<string, typeof FileTextOutlined> = {
  restaurants: ShopOutlined,
  users: TeamOutlined,
  orders: ShoppingCartOutlined,
  financial: DollarOutlined,
  subscriptions: CreditCardOutlined,
  invoices: FileTextOutlined,
  usage: BarChartOutlined,
  audit: AuditOutlined,
};

// Format label for display
const formatLabel = (key: string): string => {
  const labels: Record<string, string> = {
    id: 'ID',
    name: 'Nom',
    email: 'Email',
    status: 'Statut',
    total: 'Total',
    totalRevenue: 'Revenus totaux',
    totalOrders: 'Total commandes',
    totalRestaurants: 'Total restaurants',
    totalUsers: 'Total utilisateurs',
    activeRestaurants: 'Restaurants actifs',
    monthlyOrders: 'Commandes du mois',
    monthlyRevenue: 'Revenus du mois',
    mrr: 'MRR',
    arr: 'ARR',
    avgOrderValue: 'Panier moyen',
    byStatus: 'Par statut',
    byRole: 'Par role',
    byPlan: 'Par plan',
    byAction: 'Par action',
    byCategory: 'Par categorie',
    createdAt: 'Date creation',
    paidInvoices: 'Factures payees',
    pendingInvoices: 'Factures en attente',
    overdueInvoices: 'Factures en retard',
  };
  return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

// Computed columns for preview table
const previewColumns = computed(() => {
  const firstRow = previewData.value?.data?.[0];
  if (!firstRow) {return [];}
  return Object.keys(firstRow).map(key => ({
    title: formatLabel(key),
    dataIndex: key,
    key,
    ellipsis: true,
  }));
});

// Fetch functions
const fetchReportTypes = async () => {
  try {
    const response = await api.get<ReportType[]>('/superadmin/reports/types');
    reportTypes.value = response.data || [];
  } catch {
    console.error("Operation failed");
  }
};

const fetchStats = async () => {
  try {
    const response = await api.get<ReportStats>('/superadmin/reports/stats');
    stats.value = response.data || null;
  } catch {
    console.error("Operation failed");
  }
};

// Download report as CSV
const downloadCSV = async (reportId: string) => {
  try {
    loading.value = true;
    const params = new URLSearchParams();
    params.append('format', 'csv');

    if (filters.startDate) {params.append('startDate', filters.startDate);}
    if (filters.endDate) {params.append('endDate', filters.endDate);}
    if (filters.status) {params.append('status', filters.status);}
    if (filters.role) {params.append('role', filters.role);}
    if (filters.restaurantId) {params.append('restaurantId', filters.restaurantId);}
    if (filters.action) {params.append('action', filters.action);}
    if (filters.category) {params.append('category', filters.category);}

    const response = await api.get<Blob>(`/superadmin/reports/${reportId}?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    message.success('Rapport telecharge avec succes');
  } catch {
    message.error('Erreur lors du telechargement');
    console.error("Operation failed");
  } finally {
    loading.value = false;
  }
};

// Preview report (PDF data)
const previewReport = async (reportId: string) => {
  try {
    loading.value = true;
    const params = new URLSearchParams();
    params.append('format', 'json');

    if (filters.startDate) {params.append('startDate', filters.startDate);}
    if (filters.endDate) {params.append('endDate', filters.endDate);}
    if (filters.status) {params.append('status', filters.status);}
    if (filters.role) {params.append('role', filters.role);}
    if (filters.restaurantId) {params.append('restaurantId', filters.restaurantId);}
    if (filters.action) {params.append('action', filters.action);}
    if (filters.category) {params.append('category', filters.category);}

    const response = await api.get<ReportPreview>(`/superadmin/reports/${reportId}?${params.toString()}`);
    previewData.value = response.data || null;
    selectedReport.value = reportId;
    previewModalVisible.value = true;
  } catch {
    message.error('Erreur lors de la generation du rapport');
    console.error("Operation failed");
  } finally {
    loading.value = false;
  }
};

// Generate and download PDF
const downloadPDF = async () => {
  if (!previewData.value) {return;}

  try {
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Veuillez autoriser les popups pour telecharger le PDF');
      return;
    }

    const htmlContent = generatePDFHtml(previewData.value);
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };

    message.success('Rapport PDF genere - utilisez Imprimer > Enregistrer en PDF');
  } catch {
    message.error('Erreur lors de la generation du PDF');
  }
};

// Generate HTML for PDF
const generatePDFHtml = (data: ReportPreview): string => {
  const summaryHtml = data.summary ? `
    <div class="summary">
      <h2>Resume</h2>
      <table>
        ${Object.entries(data.summary).map(([key, value]) => `
          <tr>
            <td><strong>${formatLabel(key)}</strong></td>
            <td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  ` : '';

  const firstRow = data.data?.[0];
  const dataHtml = data.data && data.data.length > 0 && firstRow ? `
    <div class="data">
      <h2>Donnees (${data.totalCount || data.data.length} enregistrements)</h2>
      <table>
        <thead>
          <tr>
            ${Object.keys(firstRow).map(key => `<th>${formatLabel(key)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.data.slice(0, 100).map(row => `
            <tr>
              ${Object.values(row).map(val => `<td>${String(val)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${data.data.length > 100 ? '<p><em>... et plus</em></p>' : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${data.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1890ff; border-bottom: 2px solid #1890ff; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #1890ff; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary table { max-width: 500px; }
        @media print {
          body { padding: 0; }
          table { font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <h1>${data.title}</h1>
      <p class="meta">Genere le: ${new Date(data.generatedAt).toLocaleString('fr-FR')}</p>
      ${summaryHtml}
      ${dataHtml}
    </body>
    </html>
  `;
};

// Reset filters
const resetFilters = () => {
  Object.assign(filters, {
    startDate: '',
    endDate: '',
    status: '',
    role: '',
    restaurantId: '',
    planId: '',
    action: '',
    category: '',
  });
};

// Quick date presets
const setDatePreset = (preset: string) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0] || '';

  switch (preset) {
    case 'today':
      filters.startDate = today;
      filters.endDate = today;
      break;
    case 'week': {
      const weekAgo = new Date(new Date().setDate(new Date().getDate() - 7));
      filters.startDate = weekAgo.toISOString().split('T')[0] || '';
      filters.endDate = today;
      break;
    }
    case 'month': {
      const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1));
      filters.startDate = monthAgo.toISOString().split('T')[0] || '';
      filters.endDate = today;
      break;
    }
    case 'year': {
      const yearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
      filters.startDate = yearAgo.toISOString().split('T')[0] || '';
      filters.endDate = today;
      break;
    }
  }
};

// Lifecycle
onMounted(async () => {
  loading.value = true;
  await Promise.all([fetchReportTypes(), fetchStats()]);
  loading.value = false;
});
</script>

<template>
  <div class="reports-view">
    <div class="page-header">
      <h1><FileTextOutlined /> Rapports & Exports</h1>
      <p>Generez des rapports et exportez vos donnees</p>
    </div>

    <!-- Stats Cards -->
    <a-row :gutter="16" class="stats-row" v-if="stats">
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Restaurants"
            :value="stats.totalRestaurants"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix><ShopOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Utilisateurs"
            :value="stats.totalUsers"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix><TeamOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Commandes (mois)"
            :value="stats.monthlyOrders"
            :value-style="{ color: '#faad14' }"
          >
            <template #prefix><ShoppingCartOutlined /></template>
            <template #suffix>
              <span :class="stats.orderGrowth >= 0 ? 'growth-positive' : 'growth-negative'">
                {{ stats.orderGrowth >= 0 ? '+' : '' }}{{ stats.orderGrowth }}%
              </span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Revenus (mois)"
            :value="stats.monthlyRevenue"
            prefix="€"
            :value-style="{ color: '#722ed1' }"
          >
            <template #suffix>
              <span :class="stats.revenueGrowth >= 0 ? 'growth-positive' : 'growth-negative'">
                {{ stats.revenueGrowth >= 0 ? '+' : '' }}{{ stats.revenueGrowth }}%
              </span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="filters-card" title="Filtres">
      <template #extra>
        <a-button type="link" @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          Reinitialiser
        </a-button>
      </template>

      <a-row :gutter="16">
        <a-col :xs="24" :sm="12" :md="6">
          <a-form-item label="Date debut">
            <a-input v-model:value="filters.startDate" type="date" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-form-item label="Date fin">
            <a-input v-model:value="filters.endDate" type="date" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-form-item label="Statut">
            <a-select v-model:value="filters.status" allowClear placeholder="Tous">
              <a-select-option value="active">Actif</a-select-option>
              <a-select-option value="inactive">Inactif</a-select-option>
              <a-select-option value="pending">En attente</a-select-option>
              <a-select-option value="paid">Paye</a-select-option>
              <a-select-option value="overdue">En retard</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-form-item label="Preselections">
            <a-space>
              <a-button size="small" @click="setDatePreset('today')">Aujourd'hui</a-button>
              <a-button size="small" @click="setDatePreset('week')">7 jours</a-button>
              <a-button size="small" @click="setDatePreset('month')">30 jours</a-button>
              <a-button size="small" @click="setDatePreset('year')">1 an</a-button>
            </a-space>
          </a-form-item>
        </a-col>
      </a-row>
    </a-card>

    <!-- Report Types -->
    <a-card class="reports-card" title="Types de rapports disponibles">
      <a-row :gutter="[16, 16]">
        <a-col v-for="report in reportTypes" :key="report.id" :xs="24" :sm="12" :md="8" :lg="6">
          <a-card
            class="report-type-card"
            hoverable
            :class="{ selected: selectedReport === report.id }"
          >
            <template #cover>
              <div class="report-icon">
                <component :is="reportIcons[report.id] || FileTextOutlined" />
              </div>
            </template>
            <a-card-meta :title="report.name" :description="report.description" />
            <div class="report-actions">
              <a-space>
                <a-tooltip title="Apercu">
                  <a-button
                    type="primary"
                    ghost
                    size="small"
                    :loading="loading && selectedReport === report.id"
                    @click="previewReport(report.id)"
                  >
                    <template #icon><EyeOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip title="Telecharger CSV">
                  <a-button
                    type="primary"
                    size="small"
                    :loading="loading"
                    @click="downloadCSV(report.id)"
                  >
                    <template #icon><FileExcelOutlined /></template>
                    CSV
                  </a-button>
                </a-tooltip>
              </a-space>
            </div>
            <div class="report-formats">
              <a-tag v-for="fmt in report.formats" :key="fmt" size="small">
                {{ fmt.toUpperCase() }}
              </a-tag>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <!-- Quick Actions -->
    <a-card class="quick-actions-card" title="Actions rapides">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12" :md="6">
          <a-button block type="default" @click="downloadCSV('financial')">
            <template #icon><DollarOutlined /></template>
            Export financier
          </a-button>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-button block type="default" @click="downloadCSV('restaurants')">
            <template #icon><ShopOutlined /></template>
            Liste restaurants
          </a-button>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-button block type="default" @click="downloadCSV('orders')">
            <template #icon><ShoppingCartOutlined /></template>
            Historique commandes
          </a-button>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-button block type="default" @click="downloadCSV('invoices')">
            <template #icon><FileTextOutlined /></template>
            Export factures
          </a-button>
        </a-col>
      </a-row>
    </a-card>

    <!-- Preview Modal -->
    <a-modal
      v-model:open="previewModalVisible"
      :title="previewData?.title || 'Apercu du rapport'"
      :width="900"
      :footer="null"
    >
      <div v-if="previewData" class="report-preview">
        <div class="preview-meta">
          <p><CalendarOutlined /> Genere le: {{ new Date(previewData.generatedAt).toLocaleString('fr-FR') }}</p>
          <p v-if="previewData.totalCount">Total: {{ previewData.totalCount }} enregistrements</p>
        </div>

        <!-- Summary -->
        <div v-if="previewData.summary" class="preview-summary">
          <h3>Resume</h3>
          <a-descriptions bordered size="small" :column="2">
            <a-descriptions-item
              v-for="(value, key) in previewData.summary"
              :key="key"
              :label="formatLabel(key as string)"
            >
              <template v-if="typeof value === 'object'">
                <div v-for="(v, k) in (value as Record<string, unknown>)" :key="k">
                  {{ k }}: {{ v }}
                </div>
              </template>
              <template v-else>
                {{ value }}
              </template>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- Data Table -->
        <div v-if="previewData.data && previewData.data.length > 0" class="preview-data">
          <h3>Donnees ({{ previewData.data.length }} sur {{ previewData.totalCount || previewData.data.length }})</h3>
          <a-table
            :dataSource="previewData.data.slice(0, 50)"
            :columns="previewColumns"
            :pagination="false"
            :scroll="{ x: 800 }"
            size="small"
            row-key="id"
          />
          <p v-if="previewData.data.length > 50" class="more-data">
            ... et {{ previewData.data.length - 50 }} autres enregistrements
          </p>
        </div>

        <div class="preview-actions">
          <a-space>
            <a-button @click="previewModalVisible = false">Fermer</a-button>
            <a-button type="primary" @click="downloadCSV(selectedReport)">
              <template #icon><FileExcelOutlined /></template>
              Telecharger CSV
            </a-button>
            <a-button type="primary" ghost @click="downloadPDF">
              <template #icon><FilePdfOutlined /></template>
              Generer PDF
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.reports-view {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-header p {
  color: #666;
  margin: 0;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.growth-positive {
  color: #52c41a;
  font-size: 12px;
  margin-left: 8px;
}

.growth-negative {
  color: #ff4d4f;
  font-size: 12px;
  margin-left: 8px;
}

.filters-card {
  margin-bottom: 24px;
}

.reports-card {
  margin-bottom: 24px;
}

.report-type-card {
  height: 100%;
}

.report-type-card.selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.report-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  font-size: 36px;
  color: #1890ff;
  background: #f0f5ff;
}

.report-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.report-formats {
  margin-top: 12px;
  text-align: center;
}

.quick-actions-card {
  margin-bottom: 24px;
}

.quick-actions-card .ant-btn {
  height: 48px;
}

.report-preview {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-meta {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.preview-meta p {
  margin: 0;
  color: #666;
}

.preview-summary {
  margin-bottom: 24px;
}

.preview-summary h3,
.preview-data h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}

.preview-data {
  margin-bottom: 24px;
}

.more-data {
  text-align: center;
  color: #999;
  font-style: italic;
  margin-top: 12px;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
