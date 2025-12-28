<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  BellOutlined,
  NotificationOutlined,
  MailOutlined,
  AlertOutlined,
  SendOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import { Modal, message } from 'ant-design-vue';
import type { TableColumnsType } from 'ant-design-vue';
import api from '@/services/api';

// Types
interface Notification {
  _id: string;
  recipientType: 'user' | 'restaurant' | 'all';
  recipientIds?: string[];
  title: string;
  message: string;
  type: string;
  channels: string[];
  status: string;
  priority: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: string;
  sentAt?: string;
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
}

interface Announcement {
  _id: string;
  title: { fr: string; en?: string };
  content: { fr: string; en?: string };
  type: string;
  target: string;
  status: string;
  priority: number;
  displayLocation: string[];
  styling?: { backgroundColor?: string; textColor?: string };
  actionButton?: { label: { fr: string }; url: string };
  startsAt: string;
  endsAt?: string;
  dismissible: boolean;
  viewCount: number;
  clickCount: number;
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
}

interface AlertRule {
  _id: string;
  name: string;
  description?: string;
  trigger: string;
  isEnabled: boolean;
  channels: string[];
  inAppTitle?: { fr: string; en?: string };
  inAppMessage?: { fr: string; en?: string };
  cooldownHours: number;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: string;
}

interface Recipient {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contactEmail?: string;
}

// State
const activeTab = ref('notifications');
const loading = ref(false);

// Notifications state
const notifications = ref<Notification[]>([]);
const notificationStats = ref({
  total: 0,
  pending: 0,
  sent: 0,
  failed: 0,
});
const notificationModalVisible = ref(false);
const notificationForm = reactive({
  recipientType: 'all' as 'user' | 'restaurant' | 'all',
  recipientIds: [] as string[],
  title: '',
  message: '',
  type: 'info',
  channels: ['in_app'] as string[],
  priority: 'normal',
  scheduledAt: null as string | null,
});

// Announcements state
const announcements = ref<Announcement[]>([]);
const announcementModalVisible = ref(false);
const announcementForm = reactive({
  title: { fr: '', en: '' },
  content: { fr: '', en: '' },
  type: 'info',
  target: 'all',
  priority: 0,
  displayLocation: ['dashboard'] as string[],
  styling: { backgroundColor: '', textColor: '' },
  actionButton: { label: { fr: '', en: '' }, url: '', openInNewTab: false },
  startsAt: '',
  endsAt: '',
  dismissible: true,
});
const editingAnnouncement = ref<Announcement | null>(null);

// Mass email state
const massEmailModalVisible = ref(false);
const massEmailHistory = ref<Notification[]>([]);
const massEmailForm = reactive({
  recipientType: 'all_restaurants',
  recipientIds: [] as string[],
  templateId: '',
  customSubject: '',
  customBody: '',
  scheduledAt: null as string | null,
});
const emailTemplates = ref<{ _id: string; name: string; type: string }[]>([]);

// Alert rules state
const alertRules = ref<AlertRule[]>([]);
const alertRuleModalVisible = ref(false);
const alertRuleForm = reactive({
  name: '',
  description: '',
  trigger: 'subscription_expiring_7_days',
  isEnabled: true,
  channels: ['email', 'in_app'] as string[],
  inAppTitle: { fr: '', en: '' },
  inAppMessage: { fr: '', en: '' },
  cooldownHours: 24,
});
const editingAlertRule = ref<AlertRule | null>(null);

// Recipients state
const recipients = ref<Recipient[]>([]);
const recipientSearch = ref('');

// Fetch functions
const fetchNotifications = async () => {
  try {
    const response = await api.get('/superadmin/notifications');
    const data = response.data as { notifications: typeof notifications.value };
    notifications.value = data.notifications;
  } catch {
    console.error('Error fetching notifications:', error);
  }
};

const fetchNotificationStats = async () => {
  try {
    const response = await api.get('/superadmin/notifications/stats');
    notificationStats.value = response.data as typeof notificationStats.value;
  } catch {
    console.error('Error fetching notification stats:', error);
  }
};

const fetchAnnouncements = async () => {
  try {
    const response = await api.get('/superadmin/announcements');
    const data = response.data as { announcements: typeof announcements.value };
    announcements.value = data.announcements;
  } catch {
    console.error('Error fetching announcements:', error);
  }
};

const fetchMassEmailHistory = async () => {
  try {
    const response = await api.get('/superadmin/mass-email/history');
    const data = response.data as { emails: typeof massEmailHistory.value };
    massEmailHistory.value = data.emails;
  } catch {
    console.error('Error fetching mass email history:', error);
  }
};

const fetchEmailTemplates = async () => {
  try {
    const response = await api.get('/superadmin/email-templates');
    emailTemplates.value = response.data as typeof emailTemplates.value;
  } catch {
    console.error('Error fetching email templates:', error);
  }
};

const fetchAlertRules = async () => {
  try {
    const response = await api.get('/superadmin/alert-rules');
    alertRules.value = response.data as typeof alertRules.value;
  } catch {
    console.error('Error fetching alert rules:', error);
  }
};

const fetchRecipients = async (type: 'restaurants' | 'users') => {
  try {
    const url = `/superadmin/recipients?type=${type}&search=${encodeURIComponent(recipientSearch.value)}`;
    const response = await api.get(url);
    recipients.value = response.data as typeof recipients.value;
  } catch {
    console.error('Error fetching recipients:', error);
  }
};

// Notification actions
const openNotificationModal = () => {
  Object.assign(notificationForm, {
    recipientType: 'all',
    recipientIds: [],
    title: '',
    message: '',
    type: 'info',
    channels: ['in_app'],
    priority: 'normal',
    scheduledAt: null,
  });
  notificationModalVisible.value = true;
};

const sendNotification = async () => {
  if (!notificationForm.title || !notificationForm.message) {
    message.error('Veuillez remplir le titre et le message');
    return;
  }

  try {
    loading.value = true;
    await api.post('/superadmin/notifications', notificationForm);
    message.success('Notification envoyee avec succes');
    notificationModalVisible.value = false;
    await fetchNotifications();
    await fetchNotificationStats();
  } catch {
    message.error('Erreur lors de l\'envoi de la notification');
  } finally {
    loading.value = false;
  }
};

const deleteNotification = async (id: string) => {
  Modal.confirm({
    title: 'Supprimer la notification?',
    content: 'Cette action est irreversible.',
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.delete(`/superadmin/notifications/${id}`);
        message.success('Notification supprimee');
        await fetchNotifications();
      } catch {
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

// Announcement actions
const openAnnouncementModal = (announcement?: Announcement) => {
  if (announcement) {
    editingAnnouncement.value = announcement;
    Object.assign(announcementForm, {
      title: { ...announcement.title },
      content: { ...announcement.content },
      type: announcement.type,
      target: announcement.target,
      priority: announcement.priority,
      displayLocation: [...announcement.displayLocation],
      styling: announcement.styling || { backgroundColor: '', textColor: '' },
      actionButton: announcement.actionButton || { label: { fr: '', en: '' }, url: '', openInNewTab: false },
      startsAt: announcement.startsAt?.split('T')[0] || '',
      endsAt: announcement.endsAt?.split('T')[0] || '',
      dismissible: announcement.dismissible,
    });
  } else {
    editingAnnouncement.value = null;
    Object.assign(announcementForm, {
      title: { fr: '', en: '' },
      content: { fr: '', en: '' },
      type: 'info',
      target: 'all',
      priority: 0,
      displayLocation: ['dashboard'],
      styling: { backgroundColor: '', textColor: '' },
      actionButton: { label: { fr: '', en: '' }, url: '', openInNewTab: false },
      startsAt: new Date().toISOString().split('T')[0],
      endsAt: '',
      dismissible: true,
    });
  }
  announcementModalVisible.value = true;
};

const saveAnnouncement = async () => {
  if (!announcementForm.title.fr || !announcementForm.content.fr) {
    message.error('Veuillez remplir le titre et le contenu en francais');
    return;
  }

  try {
    loading.value = true;
    if (editingAnnouncement.value) {
      await api.put(`/superadmin/announcements/${editingAnnouncement.value._id}`, announcementForm);
      message.success('Annonce mise a jour');
    } else {
      await api.post('/superadmin/announcements', announcementForm);
      message.success('Annonce creee avec succes');
    }
    announcementModalVisible.value = false;
    await fetchAnnouncements();
  } catch {
    message.error('Erreur lors de la sauvegarde');
  } finally {
    loading.value = false;
  }
};

const updateAnnouncementStatus = async (id: string, status: string) => {
  try {
    await api.put(`/superadmin/announcements/${id}/status`, { status });
    message.success('Statut mis a jour');
    await fetchAnnouncements();
  } catch {
    message.error('Erreur lors de la mise a jour');
  }
};

const deleteAnnouncement = async (id: string) => {
  Modal.confirm({
    title: 'Supprimer l\'annonce?',
    content: 'Cette action est irreversible.',
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.delete(`/superadmin/announcements/${id}`);
        message.success('Annonce supprimee');
        await fetchAnnouncements();
      } catch {
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

// Mass email actions
const openMassEmailModal = () => {
  Object.assign(massEmailForm, {
    recipientType: 'all_restaurants',
    recipientIds: [],
    templateId: '',
    customSubject: '',
    customBody: '',
    scheduledAt: null,
  });
  massEmailModalVisible.value = true;
  fetchEmailTemplates();
};

const sendMassEmail = async () => {
  if (!massEmailForm.customSubject || !massEmailForm.customBody) {
    if (!massEmailForm.templateId) {
      message.error('Veuillez remplir le sujet et le contenu ou selectionner un template');
      return;
    }
  }

  try {
    loading.value = true;
    const response = await api.post('/superadmin/mass-email', massEmailForm);
    const data = response.data as { message?: string };
    message.success(data.message || 'Emails envoyés');
    massEmailModalVisible.value = false;
    await fetchMassEmailHistory();
  } catch {
    message.error('Erreur lors de l\'envoi des emails');
  } finally {
    loading.value = false;
  }
};

// Alert rule actions
const openAlertRuleModal = (rule?: AlertRule) => {
  if (rule) {
    editingAlertRule.value = rule;
    Object.assign(alertRuleForm, {
      name: rule.name,
      description: rule.description || '',
      trigger: rule.trigger,
      isEnabled: rule.isEnabled,
      channels: [...rule.channels],
      inAppTitle: rule.inAppTitle || { fr: '', en: '' },
      inAppMessage: rule.inAppMessage || { fr: '', en: '' },
      cooldownHours: rule.cooldownHours,
    });
  } else {
    editingAlertRule.value = null;
    Object.assign(alertRuleForm, {
      name: '',
      description: '',
      trigger: 'subscription_expiring_7_days',
      isEnabled: true,
      channels: ['email', 'in_app'],
      inAppTitle: { fr: '', en: '' },
      inAppMessage: { fr: '', en: '' },
      cooldownHours: 24,
    });
  }
  alertRuleModalVisible.value = true;
};

const saveAlertRule = async () => {
  if (!alertRuleForm.name) {
    message.error('Veuillez remplir le nom de la regle');
    return;
  }

  try {
    loading.value = true;
    if (editingAlertRule.value) {
      await api.put(`/superadmin/alert-rules/${editingAlertRule.value._id}`, alertRuleForm);
      message.success('Regle mise a jour');
    } else {
      await api.post('/superadmin/alert-rules', alertRuleForm);
      message.success('Regle creee avec succes');
    }
    alertRuleModalVisible.value = false;
    await fetchAlertRules();
  } catch {
    message.error('Erreur lors de la sauvegarde');
  } finally {
    loading.value = false;
  }
};

const toggleAlertRule = async (id: string) => {
  try {
    await api.put(`/superadmin/alert-rules/${id}/toggle`);
    message.success('Statut de la regle modifie');
    await fetchAlertRules();
  } catch {
    message.error('Erreur lors de la modification');
  }
};

const deleteAlertRule = async (id: string) => {
  Modal.confirm({
    title: 'Supprimer la regle?',
    content: 'Cette action est irreversible.',
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.delete(`/superadmin/alert-rules/${id}`);
        message.success('Regle supprimee');
        await fetchAlertRules();
      } catch {
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

const initializeAlertRules = async () => {
  Modal.confirm({
    title: 'Initialiser les regles par defaut?',
    content: 'Cela creera les regles d\'alerte predefinies.',
    okText: 'Initialiser',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.post('/superadmin/alert-rules/initialize');
        message.success('Regles initialisees avec succes');
        await fetchAlertRules();
      } catch (error: any) {
        message.error(error.response?.data?.message || 'Erreur lors de l\'initialisation');
      }
    },
  });
};

// Table columns
const notificationColumns: TableColumnsType = [
  {
    title: 'Titre',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    width: 120,
  },
  {
    title: 'Destinataires',
    dataIndex: 'recipientType',
    key: 'recipientType',
    width: 120,
  },
  {
    title: 'Canaux',
    dataIndex: 'channels',
    key: 'channels',
    width: 150,
  },
  {
    title: 'Statut',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Date',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    fixed: 'right',
  },
];

const announcementColumns: TableColumnsType = [
  {
    title: 'Titre',
    dataIndex: ['title', 'fr'],
    key: 'title',
    ellipsis: true,
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    width: 100,
  },
  {
    title: 'Cible',
    dataIndex: 'target',
    key: 'target',
    width: 100,
  },
  {
    title: 'Statut',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Debut',
    dataIndex: 'startsAt',
    key: 'startsAt',
    width: 120,
  },
  {
    title: 'Vues',
    dataIndex: 'viewCount',
    key: 'viewCount',
    width: 80,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
];

const alertRuleColumns: TableColumnsType = [
  {
    title: 'Nom',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
  },
  {
    title: 'Declencheur',
    dataIndex: 'trigger',
    key: 'trigger',
    width: 200,
  },
  {
    title: 'Canaux',
    dataIndex: 'channels',
    key: 'channels',
    width: 150,
  },
  {
    title: 'Actif',
    dataIndex: 'isEnabled',
    key: 'isEnabled',
    width: 80,
  },
  {
    title: 'Declenchements',
    dataIndex: 'triggerCount',
    key: 'triggerCount',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
];

// Helpers
const formatDate = (date: string) => {
  if (!date) {return '-';}
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'orange',
    sent: 'blue',
    delivered: 'green',
    read: 'green',
    failed: 'red',
    draft: 'default',
    scheduled: 'blue',
    active: 'green',
    expired: 'red',
    cancelled: 'default',
  };
  return colors[status] || 'default';
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    info: 'blue',
    warning: 'orange',
    error: 'red',
    success: 'green',
    maintenance: 'purple',
    feature: 'cyan',
    promotion: 'gold',
  };
  return colors[type] || 'default';
};

const triggerLabels: Record<string, string> = {
  subscription_expiring_7_days: 'Abonnement expire dans 7 jours',
  subscription_expiring_3_days: 'Abonnement expire dans 3 jours',
  subscription_expiring_1_day: 'Abonnement expire demain',
  subscription_expired: 'Abonnement expire',
  payment_failed: 'Paiement echoue',
  payment_retry_failed: 'Nouvelle tentative echouee',
  account_inactive_30_days: 'Compte inactif 30 jours',
  account_inactive_60_days: 'Compte inactif 60 jours',
  low_sms_credits: 'Credits SMS bas',
  usage_limit_80_percent: 'Limite a 80%',
  usage_limit_exceeded: 'Limite depassee',
  new_review_negative: 'Avis negatif',
  custom: 'Personnalise',
};

// Lifecycle
onMounted(async () => {
  loading.value = true;
  await Promise.all([
    fetchNotifications(),
    fetchNotificationStats(),
    fetchAnnouncements(),
    fetchAlertRules(),
    fetchMassEmailHistory(),
  ]);
  loading.value = false;
});
</script>

<template>
  <div class="notifications-view">
    <div class="page-header">
      <h1><BellOutlined /> Notifications & Communications</h1>
      <p>Gerez les notifications, annonces et alertes automatiques</p>
    </div>

    <!-- Stats Cards -->
    <a-row :gutter="16" class="stats-row">
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Total Notifications"
            :value="notificationStats.total"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix><BellOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="En attente"
            :value="notificationStats.pending"
            :value-style="{ color: '#faad14' }"
          >
            <template #prefix><ClockCircleOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Envoyees"
            :value="notificationStats.sent"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix><CheckCircleOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Echouees"
            :value="notificationStats.failed"
            :value-style="{ color: '#ff4d4f' }"
          >
            <template #prefix><CloseCircleOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Tabs -->
    <a-card class="content-card">
      <a-tabs v-model:activeKey="activeTab">
        <!-- Notifications Tab -->
        <a-tab-pane key="notifications">
          <template #tab>
            <span><BellOutlined /> Notifications</span>
          </template>

          <div class="tab-header">
            <a-button type="primary" @click="openNotificationModal">
              <template #icon><PlusOutlined /></template>
              Nouvelle notification
            </a-button>
            <a-button @click="fetchNotifications">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </div>

          <a-table
            :columns="notificationColumns"
            :data-source="notifications"
            :loading="loading"
            :scroll="{ x: 900 }"
            row-key="_id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                <a-tag :color="getTypeColor(record.type)">{{ record.type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'recipientType'">
                <a-tag>{{ record.recipientType === 'all' ? 'Tous' : record.recipientType }}</a-tag>
              </template>
              <template v-else-if="column.key === 'channels'">
                <a-tag v-for="channel in record.channels" :key="channel" size="small">
                  {{ channel }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button
                  type="text"
                  danger
                  size="small"
                  @click="deleteNotification(record._id)"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- Announcements Tab -->
        <a-tab-pane key="announcements">
          <template #tab>
            <span><NotificationOutlined /> Annonces</span>
          </template>

          <div class="tab-header">
            <a-button type="primary" @click="openAnnouncementModal()">
              <template #icon><PlusOutlined /></template>
              Nouvelle annonce
            </a-button>
            <a-button @click="fetchAnnouncements">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </div>

          <a-table
            :columns="announcementColumns"
            :data-source="announcements"
            :loading="loading"
            :scroll="{ x: 900 }"
            row-key="_id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                <a-tag :color="getTypeColor(record.type)">{{ record.type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'target'">
                <a-tag>{{ record.target }}</a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'startsAt'">
                {{ formatDate(record.startsAt) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button type="text" size="small" @click="openAnnouncementModal(record)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                  <a-dropdown>
                    <a-button type="text" size="small">
                      <template #icon><EyeOutlined /></template>
                    </a-button>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item @click="updateAnnouncementStatus(record._id, 'active')">
                          Activer
                        </a-menu-item>
                        <a-menu-item @click="updateAnnouncementStatus(record._id, 'cancelled')">
                          Annuler
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <a-button
                    type="text"
                    danger
                    size="small"
                    @click="deleteAnnouncement(record._id)"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- Mass Email Tab -->
        <a-tab-pane key="mass-email">
          <template #tab>
            <span><MailOutlined /> Emails en masse</span>
          </template>

          <div class="tab-header">
            <a-button type="primary" @click="openMassEmailModal">
              <template #icon><SendOutlined /></template>
              Envoyer un email
            </a-button>
            <a-button @click="fetchMassEmailHistory">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </div>

          <a-table
            :columns="notificationColumns"
            :data-source="massEmailHistory"
            :loading="loading"
            :scroll="{ x: 900 }"
            row-key="_id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                <a-tag :color="getTypeColor(record.type)">{{ record.type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'recipientType'">
                <a-tag>{{ record.recipientType === 'all' ? 'Tous' : record.recipientType }}</a-tag>
              </template>
              <template v-else-if="column.key === 'channels'">
                <a-tag v-for="channel in record.channels" :key="channel" size="small">
                  {{ channel }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button
                  type="text"
                  danger
                  size="small"
                  @click="deleteNotification(record._id)"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- Alert Rules Tab -->
        <a-tab-pane key="alert-rules">
          <template #tab>
            <span><AlertOutlined /> Alertes automatiques</span>
          </template>

          <div class="tab-header">
            <a-space>
              <a-button type="primary" @click="openAlertRuleModal()">
                <template #icon><PlusOutlined /></template>
                Nouvelle regle
              </a-button>
              <a-button @click="initializeAlertRules">
                Initialiser par defaut
              </a-button>
            </a-space>
            <a-button @click="fetchAlertRules">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </div>

          <a-table
            :columns="alertRuleColumns"
            :data-source="alertRules"
            :loading="loading"
            :scroll="{ x: 900 }"
            row-key="_id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'trigger'">
                <span>{{ triggerLabels[record.trigger] || record.trigger }}</span>
              </template>
              <template v-else-if="column.key === 'channels'">
                <a-tag v-for="channel in record.channels" :key="channel" size="small">
                  {{ channel }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'isEnabled'">
                <a-switch
                  :checked="record.isEnabled"
                  size="small"
                  @change="toggleAlertRule(record._id)"
                />
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button type="text" size="small" @click="openAlertRuleModal(record)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                  <a-button
                    type="text"
                    danger
                    size="small"
                    @click="deleteAlertRule(record._id)"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- Notification Modal -->
    <a-modal
      v-model:open="notificationModalVisible"
      title="Nouvelle notification"
      :width="600"
      :footer="null"
    >
      <a-form layout="vertical">
        <a-form-item label="Destinataires">
          <a-radio-group v-model:value="notificationForm.recipientType">
            <a-radio value="all">Tous</a-radio>
            <a-radio value="restaurant">Restaurants specifiques</a-radio>
            <a-radio value="user">Utilisateurs specifiques</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          v-if="notificationForm.recipientType !== 'all'"
          label="Selectionner les destinataires"
        >
          <a-input-group compact>
            <a-input
              v-model:value="recipientSearch"
              placeholder="Rechercher..."
              style="width: 70%"
              @change="fetchRecipients(notificationForm.recipientType === 'restaurant' ? 'restaurants' : 'users')"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </a-input-group>
          <a-select
            v-model:value="notificationForm.recipientIds"
            mode="multiple"
            placeholder="Selectionner"
            style="width: 100%; margin-top: 8px"
          >
            <a-select-option v-for="r in recipients" :key="r._id" :value="r._id">
              {{ r.name || `${r.firstName} ${r.lastName}` }} ({{ r.email || r.contactEmail }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Titre" required>
          <a-input v-model:value="notificationForm.title" placeholder="Titre de la notification" />
        </a-form-item>

        <a-form-item label="Message" required>
          <a-textarea
            v-model:value="notificationForm.message"
            :rows="4"
            placeholder="Contenu du message"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Type">
              <a-select v-model:value="notificationForm.type">
                <a-select-option value="info">Information</a-select-option>
                <a-select-option value="warning">Avertissement</a-select-option>
                <a-select-option value="success">Succes</a-select-option>
                <a-select-option value="error">Erreur</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Priorite">
              <a-select v-model:value="notificationForm.priority">
                <a-select-option value="low">Basse</a-select-option>
                <a-select-option value="normal">Normale</a-select-option>
                <a-select-option value="high">Haute</a-select-option>
                <a-select-option value="urgent">Urgente</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Canaux">
          <a-checkbox-group v-model:value="notificationForm.channels">
            <a-checkbox value="in_app">In-App</a-checkbox>
            <a-checkbox value="email">Email</a-checkbox>
            <a-checkbox value="sms">SMS</a-checkbox>
            <a-checkbox value="push">Push</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <div class="modal-actions">
          <a-button @click="notificationModalVisible = false">Annuler</a-button>
          <a-button type="primary" :loading="loading" @click="sendNotification">
            <template #icon><SendOutlined /></template>
            Envoyer
          </a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Announcement Modal -->
    <a-modal
      v-model:open="announcementModalVisible"
      :title="editingAnnouncement ? 'Modifier l\'annonce' : 'Nouvelle annonce'"
      :width="700"
      :footer="null"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Titre (FR)" required>
              <a-input v-model:value="announcementForm.title.fr" placeholder="Titre en francais" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Titre (EN)">
              <a-input v-model:value="announcementForm.title.en" placeholder="Titre en anglais" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Contenu (FR)" required>
          <a-textarea
            v-model:value="announcementForm.content.fr"
            :rows="4"
            placeholder="Contenu en francais"
          />
        </a-form-item>

        <a-form-item label="Contenu (EN)">
          <a-textarea
            v-model:value="announcementForm.content.en"
            :rows="4"
            placeholder="Contenu en anglais"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Type">
              <a-select v-model:value="announcementForm.type">
                <a-select-option value="info">Information</a-select-option>
                <a-select-option value="warning">Avertissement</a-select-option>
                <a-select-option value="maintenance">Maintenance</a-select-option>
                <a-select-option value="feature">Nouvelle fonctionnalite</a-select-option>
                <a-select-option value="promotion">Promotion</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Cible">
              <a-select v-model:value="announcementForm.target">
                <a-select-option value="all">Tous</a-select-option>
                <a-select-option value="restaurants">Restaurants</a-select-option>
                <a-select-option value="customers">Clients</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Priorite">
              <a-input-number v-model:value="announcementForm.priority" :min="0" :max="100" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Date de debut" required>
              <a-input v-model:value="announcementForm.startsAt" type="date" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Date de fin">
              <a-input v-model:value="announcementForm.endsAt" type="date" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Emplacement d'affichage">
          <a-checkbox-group v-model:value="announcementForm.displayLocation">
            <a-checkbox value="dashboard">Dashboard</a-checkbox>
            <a-checkbox value="banner">Banniere</a-checkbox>
            <a-checkbox value="modal">Modal</a-checkbox>
            <a-checkbox value="sidebar">Sidebar</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="announcementForm.dismissible">
            Peut etre fermee par l'utilisateur
          </a-checkbox>
        </a-form-item>

        <div class="modal-actions">
          <a-button @click="announcementModalVisible = false">Annuler</a-button>
          <a-button type="primary" :loading="loading" @click="saveAnnouncement">
            {{ editingAnnouncement ? 'Mettre a jour' : 'Creer' }}
          </a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Mass Email Modal -->
    <a-modal
      v-model:open="massEmailModalVisible"
      title="Envoyer un email en masse"
      :width="700"
      :footer="null"
    >
      <a-form layout="vertical">
        <a-form-item label="Destinataires">
          <a-select v-model:value="massEmailForm.recipientType">
            <a-select-option value="all_restaurants">Tous les restaurants</a-select-option>
            <a-select-option value="specific_restaurants">Restaurants specifiques</a-select-option>
            <a-select-option value="all_users">Tous les utilisateurs</a-select-option>
            <a-select-option value="specific_users">Utilisateurs specifiques</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Template email (optionnel)">
          <a-select v-model:value="massEmailForm.templateId" allowClear placeholder="Selectionner un template">
            <a-select-option v-for="template in emailTemplates" :key="template._id" :value="template._id">
              {{ template.name }} ({{ template.type }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-divider>Ou personnaliser</a-divider>

        <a-form-item label="Sujet">
          <a-input v-model:value="massEmailForm.customSubject" placeholder="Sujet de l'email" />
        </a-form-item>

        <a-form-item label="Contenu">
          <a-textarea
            v-model:value="massEmailForm.customBody"
            :rows="6"
            placeholder="Contenu de l'email (HTML supporte)"
          />
        </a-form-item>

        <div class="modal-actions">
          <a-button @click="massEmailModalVisible = false">Annuler</a-button>
          <a-button type="primary" :loading="loading" @click="sendMassEmail">
            <template #icon><SendOutlined /></template>
            Envoyer
          </a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Alert Rule Modal -->
    <a-modal
      v-model:open="alertRuleModalVisible"
      :title="editingAlertRule ? 'Modifier la regle' : 'Nouvelle regle d\'alerte'"
      :width="700"
      :footer="null"
    >
      <a-form layout="vertical">
        <a-form-item label="Nom de la regle" required>
          <a-input v-model:value="alertRuleForm.name" placeholder="Ex: Alerte abonnement expire" />
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea
            v-model:value="alertRuleForm.description"
            :rows="2"
            placeholder="Description de la regle"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="Declencheur">
              <a-select v-model:value="alertRuleForm.trigger">
                <a-select-option value="subscription_expiring_7_days">Abonnement expire dans 7 jours</a-select-option>
                <a-select-option value="subscription_expiring_3_days">Abonnement expire dans 3 jours</a-select-option>
                <a-select-option value="subscription_expiring_1_day">Abonnement expire demain</a-select-option>
                <a-select-option value="subscription_expired">Abonnement expire</a-select-option>
                <a-select-option value="payment_failed">Paiement echoue</a-select-option>
                <a-select-option value="payment_retry_failed">Nouvelle tentative echouee</a-select-option>
                <a-select-option value="account_inactive_30_days">Compte inactif 30 jours</a-select-option>
                <a-select-option value="account_inactive_60_days">Compte inactif 60 jours</a-select-option>
                <a-select-option value="low_sms_credits">Credits SMS bas</a-select-option>
                <a-select-option value="usage_limit_80_percent">Limite a 80%</a-select-option>
                <a-select-option value="usage_limit_exceeded">Limite depassee</a-select-option>
                <a-select-option value="new_review_negative">Avis negatif</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Cooldown (heures)">
              <a-input-number v-model:value="alertRuleForm.cooldownHours" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Canaux de notification">
          <a-checkbox-group v-model:value="alertRuleForm.channels">
            <a-checkbox value="in_app">In-App</a-checkbox>
            <a-checkbox value="email">Email</a-checkbox>
            <a-checkbox value="sms">SMS</a-checkbox>
            <a-checkbox value="push">Push</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <a-divider>Message In-App</a-divider>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Titre (FR)">
              <a-input v-model:value="alertRuleForm.inAppTitle.fr" placeholder="Titre en francais" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Titre (EN)">
              <a-input v-model:value="alertRuleForm.inAppTitle.en" placeholder="Titre en anglais" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Message (FR)">
              <a-textarea v-model:value="alertRuleForm.inAppMessage.fr" :rows="3" placeholder="Message en francais" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Message (EN)">
              <a-textarea v-model:value="alertRuleForm.inAppMessage.en" :rows="3" placeholder="Message en anglais" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item>
          <a-checkbox v-model:checked="alertRuleForm.isEnabled">
            Regle active
          </a-checkbox>
        </a-form-item>

        <div class="modal-actions">
          <a-button @click="alertRuleModalVisible = false">Annuler</a-button>
          <a-button type="primary" :loading="loading" @click="saveAlertRule">
            {{ editingAlertRule ? 'Mettre a jour' : 'Creer' }}
          </a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.notifications-view {
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

.content-card {
  background: #fff;
  border-radius: 8px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
