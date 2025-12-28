<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import DOMPurify from 'dompurify';
import {
  SettingOutlined,
  SecurityScanOutlined,
  MailOutlined,
  MessageOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SaveOutlined,
  ReloadOutlined,
  SendOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons-vue';
import { Modal, message } from 'ant-design-vue';
import type { TableColumnsType } from 'ant-design-vue';
import api from '@/services/api';

// Types
interface PlatformSettings {
  general: {
    platformName: string;
    platformUrl: string;
    supportEmail: string;
    supportPhone: string;
    defaultLanguage: string;
    availableLanguages: string[];
    defaultCurrency: string;
    defaultTimezone: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  features: {
    allowNewRegistrations: boolean;
    requireSubscription: boolean;
    trialPeriodDays: number;
    enableReviews: boolean;
    enableReservations: boolean;
    enableLoyaltyProgram: boolean;
    enableSMSNotifications: boolean;
    enableEmailNotifications: boolean;
    enablePushNotifications: boolean;
  };
  limits: {
    maxRestaurantsPerUser: number;
    maxDishesPerRestaurant: number;
    maxCategoriesPerRestaurant: number;
    maxTablesPerRestaurant: number;
    maxImagesPerDish: number;
    maxFileSizeMB: number;
  };
}

interface SMSSettings {
  provider: string;
  enabled: boolean;
  credentials: {
    clientId: string;
    clientSecret: string;
    senderId: string;
  };
  settings: {
    defaultSenderId: string;
    maxSMSPerDay: number;
    maxSMSPerMonth: number;
    rateLimitPerMinute: number;
  };
}

interface EmailSettings {
  provider: string;
  enabled: boolean;
  credentials: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  settings: {
    defaultFromEmail: string;
    defaultFromName: string;
    maxEmailsPerDay: number;
    maxEmailsPerMonth: number;
  };
}

interface SecuritySettings {
  authentication: {
    jwtAccessTokenExpiry: string;
    jwtRefreshTokenExpiry: string;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireEmailVerification: boolean;
    allowSocialLogin: boolean;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    loginWindowMs: number;
    loginMaxAttempts: number;
  };
  session: {
    maxConcurrentSessions: number;
    sessionTimeout: number;
  };
}

interface EmailTemplate {
  _id: string;
  slug: string;
  type: string;
  name: string;
  description: string;
  subject: { fr: string; en: string };
  body: { fr: string; en: string };
  variables: { name: string; description: string; example: string }[];
  isActive: boolean;
  isSystem: boolean;
}

interface AuditLog {
  _id: string;
  action: string;
  category: string;
  userName: string;
  userEmail: string;
  userRole: string;
  targetType?: string;
  targetName?: string;
  description: string;
  status: string;
  createdAt: string;
}

// State
const activeTab = ref('platform');
const loading = ref(false);
const saving = ref(false);

// Settings data
const platformSettings = reactive<PlatformSettings>({
  general: {
    platformName: 'MenuQR',
    platformUrl: 'https://menuqr.fr',
    supportEmail: 'support@menuqr.fr',
    supportPhone: '+33 1 23 45 67 89',
    defaultLanguage: 'fr',
    availableLanguages: ['fr', 'en'],
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Paris',
    maintenanceMode: false,
    maintenanceMessage: '',
  },
  features: {
    allowNewRegistrations: true,
    requireSubscription: false,
    trialPeriodDays: 14,
    enableReviews: true,
    enableReservations: true,
    enableLoyaltyProgram: true,
    enableSMSNotifications: true,
    enableEmailNotifications: true,
    enablePushNotifications: false,
  },
  limits: {
    maxRestaurantsPerUser: 10,
    maxDishesPerRestaurant: 500,
    maxCategoriesPerRestaurant: 50,
    maxTablesPerRestaurant: 100,
    maxImagesPerDish: 5,
    maxFileSizeMB: 10,
  },
});

const smsSettings = reactive<SMSSettings>({
  provider: 'orange',
  enabled: true,
  credentials: {
    clientId: '',
    clientSecret: '',
    senderId: 'MenuQR',
  },
  settings: {
    defaultSenderId: 'MenuQR',
    maxSMSPerDay: 10000,
    maxSMSPerMonth: 100000,
    rateLimitPerMinute: 60,
  },
});

const emailSettings = reactive<EmailSettings>({
  provider: 'smtp',
  enabled: true,
  credentials: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: '',
    password: '',
  },
  settings: {
    defaultFromEmail: 'noreply@menuqr.fr',
    defaultFromName: 'MenuQR',
    maxEmailsPerDay: 10000,
    maxEmailsPerMonth: 300000,
  },
});

const securitySettings = reactive<SecuritySettings>({
  authentication: {
    jwtAccessTokenExpiry: '7d',
    jwtRefreshTokenExpiry: '30d',
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    requireEmailVerification: false,
    allowSocialLogin: false,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
  },
  rateLimit: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100,
    loginWindowMs: 900000,
    loginMaxAttempts: 5,
  },
  session: {
    maxConcurrentSessions: 5,
    sessionTimeout: 60,
  },
});

// Email templates
const emailTemplates = ref<EmailTemplate[]>([]);
const emailTemplateModalVisible = ref(false);
const emailTemplatePreviewVisible = ref(false);
const selectedTemplate = ref<EmailTemplate | null>(null);
const previewContent = ref({ subject: '', body: '' });
const sanitizedPreviewBody = computed(() =>
  DOMPurify.sanitize(previewContent.value.body || '')
);

// Audit logs
const auditLogs = ref<AuditLog[]>([]);
const auditPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});
const auditFilters = reactive({
  category: '',
  action: '',
  search: '',
});

// Test fields
const testEmail = ref('');
const testPhone = ref('');

// Fetch settings
const fetchSettings = async (category: string) => {
  loading.value = true;
  try {
    const response = await api.get<{ success: boolean; data: { value: unknown } }>(`/superadmin/settings/${category}`);
    if (response.data?.data?.value) {
      const value = response.data.data.value;
      switch (category) {
        case 'platform':
          Object.assign(platformSettings, value);
          break;
        case 'sms':
          Object.assign(smsSettings, value);
          break;
        case 'email':
          Object.assign(emailSettings, value);
          break;
        case 'security':
          Object.assign(securitySettings, value);
          break;
      }
    }
  } catch {
    console.error("Operation failed");
  } finally {
    loading.value = false;
  }
};

// Save settings
const saveSettings = async (category: string) => {
  saving.value = true;
  try {
    let value;
    switch (category) {
      case 'platform':
        value = platformSettings;
        break;
      case 'sms':
        value = smsSettings;
        break;
      case 'email':
        value = emailSettings;
        break;
      case 'security':
        value = securitySettings;
        break;
      default:
        return;
    }

    await api.put(`/superadmin/settings/${category}`, { value });
    message.success('Parametres enregistres avec succes');
  } catch {
    message.error('Erreur lors de l\'enregistrement des parametres');
    console.error("Operation failed");
  } finally {
    saving.value = false;
  }
};

// Reset settings
const resetSettings = async (category: string) => {
  Modal.confirm({
    title: 'Reinitialiser les parametres ?',
    content: 'Cette action restaurera les valeurs par defaut. Les modifications seront perdues.',
    icon: () => null,
    okText: 'Reinitialiser',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.post(`/superadmin/settings/${category}/reset`);
        await fetchSettings(category);
        message.success('Parametres reinitialises');
      } catch {
        message.error('Erreur lors de la reinitialisation');
      }
    },
  });
};

// Email templates
const fetchEmailTemplates = async () => {
  loading.value = true;
  try {
    const response = await api.get<{ success: boolean; data: EmailTemplate[] }>('/superadmin/email-templates');
    if (response.data?.data) {
      emailTemplates.value = response.data.data;
    }
  } catch {
    console.error("Operation failed");
  } finally {
    loading.value = false;
  }
};

const initializeEmailTemplates = async () => {
  try {
    await api.post('/superadmin/email-templates/initialize');
    await fetchEmailTemplates();
    message.success('Templates initialises avec succes');
  } catch {
    message.error('Erreur lors de l\'initialisation des templates');
  }
};

const openTemplateEditor = (template: EmailTemplate) => {
  selectedTemplate.value = { ...template };
  emailTemplateModalVisible.value = true;
};

const formatVariablePlaceholder = (name: string) => `{{${name}}}`;

const saveEmailTemplate = async () => {
  if (!selectedTemplate.value) {return;}

  try {
    await api.put(`/superadmin/email-templates/${selectedTemplate.value._id}`, selectedTemplate.value);
    await fetchEmailTemplates();
    emailTemplateModalVisible.value = false;
    message.success('Template mis a jour avec succes');
  } catch {
    message.error('Erreur lors de la mise a jour du template');
  }
};

const previewTemplate = async (template: EmailTemplate) => {
  try {
    const response = await api.post<{ success: boolean; data: { subject: string; body: string } }>(
      `/superadmin/email-templates/${template._id}/preview`,
      { language: 'fr' }
    );
    if (response.data?.data) {
      previewContent.value = response.data.data;
      selectedTemplate.value = template;
      emailTemplatePreviewVisible.value = true;
    }
  } catch {
    message.error('Erreur lors de la preview');
  }
};

const toggleTemplateStatus = async (template: EmailTemplate) => {
  try {
    await api.put(`/superadmin/email-templates/${template._id}`, {
      isActive: !template.isActive,
    });
    await fetchEmailTemplates();
    message.success('Statut mis a jour');
  } catch {
    message.error('Erreur lors de la mise a jour');
  }
};

// Audit logs
const fetchAuditLogs = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: auditPagination.current.toString(),
      limit: auditPagination.pageSize.toString(),
    });
    if (auditFilters.category) {params.append('category', auditFilters.category);}
    if (auditFilters.action) {params.append('action', auditFilters.action);}
    if (auditFilters.search) {params.append('search', auditFilters.search);}

    const response = await api.get<{
      success: boolean;
      data: {
        logs: AuditLog[];
        pagination: { total: number };
      };
    }>(`/superadmin/audit-logs?${params}`);

    if (response.data?.data) {
      auditLogs.value = response.data.data.logs;
      auditPagination.total = response.data.data.pagination.total;
    }
  } catch {
    console.error("Operation failed");
  } finally {
    loading.value = false;
  }
};

// Test functions
const testEmailConnection = async () => {
  if (!testEmail.value) {
    message.warning('Veuillez entrer une adresse email');
    return;
  }
  try {
    await api.post('/superadmin/email/test', { email: testEmail.value });
    message.success('Email de test envoye');
  } catch {
    message.error('Erreur lors de l\'envoi du test');
  }
};

const testSMSConnection = async () => {
  if (!testPhone.value) {
    message.warning('Veuillez entrer un numero de telephone');
    return;
  }
  try {
    await api.post('/superadmin/sms/test', { phoneNumber: testPhone.value });
    message.success('SMS de test envoye');
  } catch {
    message.error('Erreur lors de l\'envoi du test');
  }
};

// Format date
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Audit log columns
const auditColumns: TableColumnsType = [
  {
    title: 'Date',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
  },
  {
    title: 'Utilisateur',
    dataIndex: 'userName',
    key: 'userName',
    width: 150,
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 120,
  },
  {
    title: 'Categorie',
    dataIndex: 'category',
    key: 'category',
    width: 120,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Statut',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
];

// Action labels
const actionLabels: Record<string, string> = {
  create: 'Creation',
  update: 'Modification',
  delete: 'Suppression',
  login: 'Connexion',
  logout: 'Deconnexion',
  settings_change: 'Config.',
};

const categoryLabels: Record<string, string> = {
  authentication: 'Auth',
  user: 'Utilisateur',
  restaurant: 'Restaurant',
  settings: 'Parametres',
  system: 'Systeme',
};

// Tab change handler
const handleTabChange = (key: string) => {
  activeTab.value = key;
  switch (key) {
    case 'platform':
      fetchSettings('platform');
      break;
    case 'sms':
      fetchSettings('sms');
      break;
    case 'email':
      fetchSettings('email');
      break;
    case 'security':
      fetchSettings('security');
      break;
    case 'templates':
      fetchEmailTemplates();
      break;
    case 'audit':
      fetchAuditLogs();
      break;
  }
};

// Pagination handler
const handleAuditTableChange = (pagination: { current: number; pageSize: number }) => {
  auditPagination.current = pagination.current;
  auditPagination.pageSize = pagination.pageSize;
  fetchAuditLogs();
};

onMounted(() => {
  fetchSettings('platform');
});
</script>

<template>
  <div class="settings-view">
    <div class="page-header">
      <h1 class="page-title">Parametres</h1>
      <p class="page-subtitle">Configuration de la plateforme Super Admin</p>
    </div>

    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange" class="settings-tabs">
      <!-- Platform Settings -->
      <a-tab-pane key="platform">
        <template #tab>
          <span><SettingOutlined /> Plateforme</span>
        </template>

        <a-spin :spinning="loading">
          <a-row :gutter="[24, 24]">
            <a-col :xs="24" :lg="12">
              <a-card title="Informations generales" class="settings-card">
                <a-form layout="vertical">
                  <a-form-item label="Nom de la plateforme">
                    <a-input v-model:value="platformSettings.general.platformName" />
                  </a-form-item>
                  <a-form-item label="URL de la plateforme">
                    <a-input v-model:value="platformSettings.general.platformUrl" />
                  </a-form-item>
                  <a-form-item label="Email de support">
                    <a-input v-model:value="platformSettings.general.supportEmail" />
                  </a-form-item>
                  <a-form-item label="Telephone de support">
                    <a-input v-model:value="platformSettings.general.supportPhone" />
                  </a-form-item>
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="Langue par defaut">
                        <a-select v-model:value="platformSettings.general.defaultLanguage">
                          <a-select-option value="fr">Francais</a-select-option>
                          <a-select-option value="en">English</a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="Devise">
                        <a-select v-model:value="platformSettings.general.defaultCurrency">
                          <a-select-option value="EUR">EUR</a-select-option>
                          <a-select-option value="USD">USD</a-select-option>
                          <a-select-option value="XOF">XOF</a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                  </a-row>
                </a-form>
              </a-card>
            </a-col>

            <a-col :xs="24" :lg="12">
              <a-card title="Mode maintenance" class="settings-card">
                <a-form layout="vertical">
                  <a-form-item>
                    <div class="switch-item">
                      <div>
                        <h4>Activer le mode maintenance</h4>
                        <p class="hint">Desactive l'acces au site pour les utilisateurs</p>
                      </div>
                      <a-switch v-model:checked="platformSettings.general.maintenanceMode" />
                    </div>
                  </a-form-item>
                  <a-form-item label="Message de maintenance">
                    <a-textarea
                      v-model:value="platformSettings.general.maintenanceMessage"
                      :rows="3"
                      placeholder="Le site est en maintenance..."
                    />
                  </a-form-item>
                </a-form>
              </a-card>

              <a-card title="Fonctionnalites" class="settings-card mt-4">
                <div class="feature-list">
                  <div class="switch-item">
                    <span>Nouvelles inscriptions</span>
                    <a-switch v-model:checked="platformSettings.features.allowNewRegistrations" />
                  </div>
                  <div class="switch-item">
                    <span>Abonnement requis</span>
                    <a-switch v-model:checked="platformSettings.features.requireSubscription" />
                  </div>
                  <div class="switch-item">
                    <span>Avis clients</span>
                    <a-switch v-model:checked="platformSettings.features.enableReviews" />
                  </div>
                  <div class="switch-item">
                    <span>Reservations</span>
                    <a-switch v-model:checked="platformSettings.features.enableReservations" />
                  </div>
                  <div class="switch-item">
                    <span>Programme fidelite</span>
                    <a-switch v-model:checked="platformSettings.features.enableLoyaltyProgram" />
                  </div>
                  <div class="switch-item">
                    <span>Notifications SMS</span>
                    <a-switch v-model:checked="platformSettings.features.enableSMSNotifications" />
                  </div>
                  <div class="switch-item">
                    <span>Notifications Email</span>
                    <a-switch v-model:checked="platformSettings.features.enableEmailNotifications" />
                  </div>
                </div>
              </a-card>
            </a-col>

            <a-col :span="24">
              <a-card title="Limites" class="settings-card">
                <a-row :gutter="[16, 16]">
                  <a-col :xs="12" :sm="8" :lg="4">
                    <a-form-item label="Restaurants/utilisateur">
                      <a-input-number
                        v-model:value="platformSettings.limits.maxRestaurantsPerUser"
                        :min="1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="12" :sm="8" :lg="4">
                    <a-form-item label="Plats/restaurant">
                      <a-input-number
                        v-model:value="platformSettings.limits.maxDishesPerRestaurant"
                        :min="1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="12" :sm="8" :lg="4">
                    <a-form-item label="Categories/restaurant">
                      <a-input-number
                        v-model:value="platformSettings.limits.maxCategoriesPerRestaurant"
                        :min="1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="12" :sm="8" :lg="4">
                    <a-form-item label="Tables/restaurant">
                      <a-input-number
                        v-model:value="platformSettings.limits.maxTablesPerRestaurant"
                        :min="1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="12" :sm="8" :lg="4">
                    <a-form-item label="Images/plat">
                      <a-input-number
                        v-model:value="platformSettings.limits.maxImagesPerDish"
                        :min="1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="12" :sm="8" :lg="4">
                    <a-form-item label="Taille fichier (MB)">
                      <a-input-number
                        v-model:value="platformSettings.limits.maxFileSizeMB"
                        :min="1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
              </a-card>
            </a-col>

            <a-col :span="24">
              <div class="actions-bar">
                <a-button @click="resetSettings('platform')">
                  <template #icon><ReloadOutlined /></template>
                  Reinitialiser
                </a-button>
                <a-button type="primary" :loading="saving" @click="saveSettings('platform')">
                  <template #icon><SaveOutlined /></template>
                  Enregistrer
                </a-button>
              </div>
            </a-col>
          </a-row>
        </a-spin>
      </a-tab-pane>

      <!-- SMS Settings -->
      <a-tab-pane key="sms">
        <template #tab>
          <span><MessageOutlined /> SMS</span>
        </template>

        <a-spin :spinning="loading">
          <a-row :gutter="[24, 24]">
            <a-col :xs="24" :lg="12">
              <a-card title="Configuration SMS" class="settings-card">
                <a-form layout="vertical">
                  <a-form-item>
                    <div class="switch-item">
                      <div>
                        <h4>Activer les SMS</h4>
                        <p class="hint">Permet l'envoi de SMS aux clients</p>
                      </div>
                      <a-switch v-model:checked="smsSettings.enabled" />
                    </div>
                  </a-form-item>

                  <a-form-item label="Fournisseur SMS">
                    <a-select v-model:value="smsSettings.provider" style="width: 100%">
                      <a-select-option value="orange">Orange Business</a-select-option>
                      <a-select-option value="twilio">Twilio</a-select-option>
                      <a-select-option value="vonage">Vonage</a-select-option>
                      <a-select-option value="mock">Test (Mock)</a-select-option>
                    </a-select>
                  </a-form-item>

                  <a-form-item label="Client ID">
                    <a-input v-model:value="smsSettings.credentials.clientId" />
                  </a-form-item>

                  <a-form-item label="Client Secret">
                    <a-input-password v-model:value="smsSettings.credentials.clientSecret" />
                  </a-form-item>

                  <a-form-item label="Sender ID">
                    <a-input v-model:value="smsSettings.credentials.senderId" />
                  </a-form-item>
                </a-form>
              </a-card>
            </a-col>

            <a-col :xs="24" :lg="12">
              <a-card title="Limites SMS" class="settings-card">
                <a-form layout="vertical">
                  <a-form-item label="SMS max par jour">
                    <a-input-number
                      v-model:value="smsSettings.settings.maxSMSPerDay"
                      :min="0"
                      style="width: 100%"
                    />
                  </a-form-item>

                  <a-form-item label="SMS max par mois">
                    <a-input-number
                      v-model:value="smsSettings.settings.maxSMSPerMonth"
                      :min="0"
                      style="width: 100%"
                    />
                  </a-form-item>

                  <a-form-item label="Rate limit (SMS/minute)">
                    <a-input-number
                      v-model:value="smsSettings.settings.rateLimitPerMinute"
                      :min="1"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-form>
              </a-card>

              <a-card title="Test SMS" class="settings-card mt-4">
                <a-form layout="vertical">
                  <a-form-item label="Numero de telephone">
                    <a-input v-model:value="testPhone" placeholder="+33 6 12 34 56 78" />
                  </a-form-item>
                  <a-button type="primary" @click="testSMSConnection">
                    <template #icon><SendOutlined /></template>
                    Envoyer un SMS test
                  </a-button>
                </a-form>
              </a-card>
            </a-col>

            <a-col :span="24">
              <div class="actions-bar">
                <a-button @click="resetSettings('sms')">
                  <template #icon><ReloadOutlined /></template>
                  Reinitialiser
                </a-button>
                <a-button type="primary" :loading="saving" @click="saveSettings('sms')">
                  <template #icon><SaveOutlined /></template>
                  Enregistrer
                </a-button>
              </div>
            </a-col>
          </a-row>
        </a-spin>
      </a-tab-pane>

      <!-- Email Settings -->
      <a-tab-pane key="email">
        <template #tab>
          <span><MailOutlined /> Email</span>
        </template>

        <a-spin :spinning="loading">
          <a-row :gutter="[24, 24]">
            <a-col :xs="24" :lg="12">
              <a-card title="Configuration SMTP" class="settings-card">
                <a-form layout="vertical">
                  <a-form-item>
                    <div class="switch-item">
                      <div>
                        <h4>Activer les emails</h4>
                        <p class="hint">Permet l'envoi d'emails transactionnels</p>
                      </div>
                      <a-switch v-model:checked="emailSettings.enabled" />
                    </div>
                  </a-form-item>

                  <a-form-item label="Fournisseur">
                    <a-select v-model:value="emailSettings.provider" style="width: 100%">
                      <a-select-option value="smtp">SMTP</a-select-option>
                      <a-select-option value="sendgrid">SendGrid</a-select-option>
                      <a-select-option value="mailgun">Mailgun</a-select-option>
                      <a-select-option value="ses">Amazon SES</a-select-option>
                    </a-select>
                  </a-form-item>

                  <a-form-item label="Serveur SMTP">
                    <a-input v-model:value="emailSettings.credentials.host" placeholder="smtp.example.com" />
                  </a-form-item>

                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="Port">
                        <a-input-number v-model:value="emailSettings.credentials.port" style="width: 100%" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="SSL/TLS">
                        <a-switch v-model:checked="emailSettings.credentials.secure" />
                      </a-form-item>
                    </a-col>
                  </a-row>

                  <a-form-item label="Nom d'utilisateur">
                    <a-input v-model:value="emailSettings.credentials.username" />
                  </a-form-item>

                  <a-form-item label="Mot de passe">
                    <a-input-password v-model:value="emailSettings.credentials.password" />
                  </a-form-item>
                </a-form>
              </a-card>
            </a-col>

            <a-col :xs="24" :lg="12">
              <a-card title="Parametres d'envoi" class="settings-card">
                <a-form layout="vertical">
                  <a-form-item label="Email expediteur">
                    <a-input v-model:value="emailSettings.settings.defaultFromEmail" />
                  </a-form-item>

                  <a-form-item label="Nom expediteur">
                    <a-input v-model:value="emailSettings.settings.defaultFromName" />
                  </a-form-item>

                  <a-form-item label="Emails max par jour">
                    <a-input-number
                      v-model:value="emailSettings.settings.maxEmailsPerDay"
                      :min="0"
                      style="width: 100%"
                    />
                  </a-form-item>

                  <a-form-item label="Emails max par mois">
                    <a-input-number
                      v-model:value="emailSettings.settings.maxEmailsPerMonth"
                      :min="0"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-form>
              </a-card>

              <a-card title="Test Email" class="settings-card mt-4">
                <a-form layout="vertical">
                  <a-form-item label="Adresse email">
                    <a-input v-model:value="testEmail" placeholder="test@example.com" />
                  </a-form-item>
                  <a-button type="primary" @click="testEmailConnection">
                    <template #icon><SendOutlined /></template>
                    Envoyer un email test
                  </a-button>
                </a-form>
              </a-card>
            </a-col>

            <a-col :span="24">
              <div class="actions-bar">
                <a-button @click="resetSettings('email')">
                  <template #icon><ReloadOutlined /></template>
                  Reinitialiser
                </a-button>
                <a-button type="primary" :loading="saving" @click="saveSettings('email')">
                  <template #icon><SaveOutlined /></template>
                  Enregistrer
                </a-button>
              </div>
            </a-col>
          </a-row>
        </a-spin>
      </a-tab-pane>

      <!-- Security Settings -->
      <a-tab-pane key="security">
        <template #tab>
          <span><SecurityScanOutlined /> Securite</span>
        </template>

        <a-spin :spinning="loading">
          <a-row :gutter="[24, 24]">
            <a-col :xs="24" :lg="12">
              <a-card title="Authentification" class="settings-card">
                <a-form layout="vertical">
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="Expiration access token">
                        <a-input v-model:value="securitySettings.authentication.jwtAccessTokenExpiry" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="Expiration refresh token">
                        <a-input v-model:value="securitySettings.authentication.jwtRefreshTokenExpiry" />
                      </a-form-item>
                    </a-col>
                  </a-row>

                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="Tentatives de connexion max">
                        <a-input-number
                          v-model:value="securitySettings.authentication.maxLoginAttempts"
                          :min="1"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="Duree verrouillage (min)">
                        <a-input-number
                          v-model:value="securitySettings.authentication.lockoutDuration"
                          :min="1"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-col>
                  </a-row>

                  <div class="switch-item mb-3">
                    <span>Verification email obligatoire</span>
                    <a-switch v-model:checked="securitySettings.authentication.requireEmailVerification" />
                  </div>

                  <div class="switch-item">
                    <span>Connexion sociale (Google, etc.)</span>
                    <a-switch v-model:checked="securitySettings.authentication.allowSocialLogin" />
                  </div>
                </a-form>
              </a-card>

              <a-card title="Politique de mot de passe" class="settings-card mt-4">
                <a-form layout="vertical">
                  <a-form-item label="Longueur minimale">
                    <a-input-number
                      v-model:value="securitySettings.authentication.passwordMinLength"
                      :min="6"
                      :max="32"
                      style="width: 100%"
                    />
                  </a-form-item>

                  <div class="switch-item mb-3">
                    <span>Majuscule requise</span>
                    <a-switch v-model:checked="securitySettings.authentication.passwordRequireUppercase" />
                  </div>

                  <div class="switch-item mb-3">
                    <span>Chiffre requis</span>
                    <a-switch v-model:checked="securitySettings.authentication.passwordRequireNumbers" />
                  </div>

                  <div class="switch-item">
                    <span>Symbole requis</span>
                    <a-switch v-model:checked="securitySettings.authentication.passwordRequireSymbols" />
                  </div>
                </a-form>
              </a-card>
            </a-col>

            <a-col :xs="24" :lg="12">
              <a-card title="Rate Limiting" class="settings-card">
                <a-form layout="vertical">
                  <div class="switch-item mb-3">
                    <div>
                      <h4>Activer le rate limiting</h4>
                      <p class="hint">Limite le nombre de requetes par IP</p>
                    </div>
                    <a-switch v-model:checked="securitySettings.rateLimit.enabled" />
                  </div>

                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="Fenetre (ms)">
                        <a-input-number
                          v-model:value="securitySettings.rateLimit.windowMs"
                          :min="1000"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="Requetes max">
                        <a-input-number
                          v-model:value="securitySettings.rateLimit.maxRequests"
                          :min="1"
                          style="width: 100%"
                        />
                      </a-form-item>
                    </a-col>
                  </a-row>
                </a-form>
              </a-card>

              <a-card title="Sessions" class="settings-card mt-4">
                <a-form layout="vertical">
                  <a-form-item label="Sessions simultanees max">
                    <a-input-number
                      v-model:value="securitySettings.session.maxConcurrentSessions"
                      :min="1"
                      style="width: 100%"
                    />
                  </a-form-item>

                  <a-form-item label="Timeout session (minutes)">
                    <a-input-number
                      v-model:value="securitySettings.session.sessionTimeout"
                      :min="5"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-form>
              </a-card>
            </a-col>

            <a-col :span="24">
              <div class="actions-bar">
                <a-button @click="resetSettings('security')">
                  <template #icon><ReloadOutlined /></template>
                  Reinitialiser
                </a-button>
                <a-button type="primary" :loading="saving" @click="saveSettings('security')">
                  <template #icon><SaveOutlined /></template>
                  Enregistrer
                </a-button>
              </div>
            </a-col>
          </a-row>
        </a-spin>
      </a-tab-pane>

      <!-- Email Templates -->
      <a-tab-pane key="templates">
        <template #tab>
          <span><FileTextOutlined /> Templates Email</span>
        </template>

        <a-spin :spinning="loading">
          <div class="templates-header">
            <a-button type="primary" @click="initializeEmailTemplates">
              <template #icon><PlusOutlined /></template>
              Initialiser les templates par defaut
            </a-button>
          </div>

          <a-row :gutter="[16, 16]">
            <a-col v-for="template in emailTemplates" :key="template._id" :xs="24" :sm="12" :lg="8">
              <a-card class="template-card" :class="{ inactive: !template.isActive }">
                <div class="template-header">
                  <div class="template-info">
                    <h4>{{ template.name }}</h4>
                    <a-tag :color="template.isSystem ? 'blue' : 'green'" size="small">
                      {{ template.isSystem ? 'Systeme' : 'Custom' }}
                    </a-tag>
                  </div>
                  <a-switch
                    :checked="template.isActive"
                    size="small"
                    @change="toggleTemplateStatus(template)"
                  />
                </div>
                <p class="template-description">{{ template.description }}</p>
                <div class="template-type">
                  <a-tag>{{ template.type }}</a-tag>
                </div>
                <div class="template-actions">
                  <a-button size="small" @click="previewTemplate(template)">
                    <template #icon><EyeOutlined /></template>
                    Preview
                  </a-button>
                  <a-button size="small" type="primary" @click="openTemplateEditor(template)">
                    <template #icon><EditOutlined /></template>
                    Modifier
                  </a-button>
                </div>
              </a-card>
            </a-col>
          </a-row>

          <a-empty v-if="emailTemplates.length === 0" description="Aucun template email" />
        </a-spin>
      </a-tab-pane>

      <!-- Audit Logs -->
      <a-tab-pane key="audit">
        <template #tab>
          <span><HistoryOutlined /> Logs d'audit</span>
        </template>

        <a-spin :spinning="loading">
          <div class="audit-filters">
            <a-row :gutter="16">
              <a-col :xs="24" :sm="8" :md="6">
                <a-select
                  v-model:value="auditFilters.category"
                  placeholder="Categorie"
                  allowClear
                  style="width: 100%"
                  @change="fetchAuditLogs"
                >
                  <a-select-option value="authentication">Authentification</a-select-option>
                  <a-select-option value="user">Utilisateur</a-select-option>
                  <a-select-option value="restaurant">Restaurant</a-select-option>
                  <a-select-option value="settings">Parametres</a-select-option>
                  <a-select-option value="system">Systeme</a-select-option>
                </a-select>
              </a-col>
              <a-col :xs="24" :sm="8" :md="6">
                <a-select
                  v-model:value="auditFilters.action"
                  placeholder="Action"
                  allowClear
                  style="width: 100%"
                  @change="fetchAuditLogs"
                >
                  <a-select-option value="create">Creation</a-select-option>
                  <a-select-option value="update">Modification</a-select-option>
                  <a-select-option value="delete">Suppression</a-select-option>
                  <a-select-option value="login">Connexion</a-select-option>
                  <a-select-option value="settings_change">Parametres</a-select-option>
                </a-select>
              </a-col>
              <a-col :xs="24" :sm="8" :md="6">
                <a-input-search
                  v-model:value="auditFilters.search"
                  placeholder="Rechercher..."
                  @search="fetchAuditLogs"
                />
              </a-col>
            </a-row>
          </div>

          <a-table
            :dataSource="auditLogs"
            :columns="auditColumns"
            :pagination="{
              current: auditPagination.current,
              pageSize: auditPagination.pageSize,
              total: auditPagination.total,
              showSizeChanger: true,
              showTotal: (total: number) => `${total} entrees`,
            }"
            :scroll="{ x: 800 }"
            rowKey="_id"
            @change="handleAuditTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-tag>{{ actionLabels[record.action] || record.action }}</a-tag>
              </template>
              <template v-else-if="column.key === 'category'">
                <a-tag color="blue">{{ categoryLabels[record.category] || record.category }}</a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === 'success' ? 'green' : 'red'">
                  <template #icon>
                    <CheckCircleOutlined v-if="record.status === 'success'" />
                    <CloseCircleOutlined v-else />
                  </template>
                  {{ record.status === 'success' ? 'OK' : 'Echec' }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </a-spin>
      </a-tab-pane>
    </a-tabs>

    <!-- Email Template Edit Modal -->
    <a-modal
      v-model:open="emailTemplateModalVisible"
      title="Modifier le template"
      width="900px"
      :footer="null"
    >
      <a-form v-if="selectedTemplate" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Nom">
              <a-input v-model:value="selectedTemplate.name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Slug">
              <a-input v-model:value="selectedTemplate.slug" disabled />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Description">
          <a-input v-model:value="selectedTemplate.description" />
        </a-form-item>

        <a-tabs>
          <a-tab-pane key="fr" tab="Francais">
            <a-form-item label="Sujet">
              <a-input v-model:value="selectedTemplate.subject.fr" />
            </a-form-item>
            <a-form-item label="Contenu HTML">
              <a-textarea v-model:value="selectedTemplate.body.fr" :rows="15" />
            </a-form-item>
          </a-tab-pane>
          <a-tab-pane key="en" tab="English">
            <a-form-item label="Subject">
              <a-input v-model:value="selectedTemplate.subject.en" />
            </a-form-item>
            <a-form-item label="HTML Content">
              <a-textarea v-model:value="selectedTemplate.body.en" :rows="15" />
            </a-form-item>
          </a-tab-pane>
        </a-tabs>

        <a-divider>Variables disponibles</a-divider>
        <div class="variables-list">
          <a-tag v-for="variable in selectedTemplate.variables" :key="variable.name" class="variable-tag">
            <code>{{ formatVariablePlaceholder(variable.name) }}</code>
            <span class="variable-desc">{{ variable.description }}</span>
          </a-tag>
        </div>

        <div class="modal-actions">
          <a-button @click="emailTemplateModalVisible = false">Annuler</a-button>
          <a-button type="primary" @click="saveEmailTemplate">Enregistrer</a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Email Template Preview Modal -->
    <a-modal
      v-model:open="emailTemplatePreviewVisible"
      :title="`Preview: ${selectedTemplate?.name}`"
      width="800px"
      :footer="null"
    >
      <div class="preview-subject">
        <strong>Sujet:</strong> {{ previewContent.subject }}
      </div>
      <a-divider />
      <div class="preview-body" v-html="sanitizedPreviewBody"></div>
    </a-modal>
  </div>
</template>

<style scoped>
.settings-view {
  padding: 0;
}

.page-header {
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

.settings-tabs {
  background: white;
  border-radius: 12px;
  padding: 16px;
}

.settings-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.settings-card {
  border-radius: 12px;
}

.mt-4 {
  margin-top: 16px;
}

.mb-3 {
  margin-bottom: 12px;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.switch-item h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.switch-item .hint {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 16px;
}

.templates-header {
  margin-bottom: 24px;
}

.template-card {
  border-radius: 12px;
  transition: all 0.2s;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-card.inactive {
  opacity: 0.6;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.template-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.template-description {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-type {
  margin-bottom: 12px;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.audit-filters {
  margin-bottom: 24px;
}

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variable-tag {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  height: auto;
}

.variable-tag code {
  font-weight: 600;
  color: #6366f1;
}

.variable-desc {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.preview-subject {
  font-size: 14px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
}

.preview-body {
  max-height: 500px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .actions-bar {
    flex-direction: column;
  }

  .actions-bar .ant-btn {
    width: 100%;
  }
}
</style>
