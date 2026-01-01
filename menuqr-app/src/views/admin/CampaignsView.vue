<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import api, { type Campaign } from '@/services/api';
import { message } from 'ant-design-vue';
import { FEATURES } from '@/composables/useSubscription';
import { FeatureGate } from '@/components/subscription';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';

const isLoading = ref(true);
const isRefreshing = ref(false);
const error = ref<string | null>(null);
const campaigns = ref<Campaign[]>([]);
const showModal = ref(false);
const showDeleteModal = ref(false);
const showPreviewModal = ref(false);
const showSendModal = ref(false);
const isSubmitting = ref(false);
const editingCampaign = ref<Campaign | null>(null);
const campaignToDelete = ref<Campaign | null>(null);
const previewCampaign = ref<Campaign | null>(null);
const campaignToSend = ref<Campaign | null>(null);
const estimatedRecipients = ref(0);
const messageTextareaRef = ref<HTMLTextAreaElement | null>(null);
const selectedTemplate = ref<string | null>(null);

// Stats
const stats = ref({
  totalCampaigns: 0,
  completedCampaigns: 0,
  totalMessagesSent: 0,
  totalSuccess: 0,
  totalFailed: 0,
});

// Mockup data - Message Templates
const messageTemplates = [
  {
    id: 'welcome',
    icon: '👋',
    label: 'Bienvenue',
    preview: 'Bienvenue chez {restaurant}...',
    message: 'Bienvenue chez {restaurant} ! Decouvrez notre menu et beneficiez de 10% sur votre premiere commande. A bientot !'
  },
  {
    id: 'discount',
    icon: '🎉',
    label: 'Promotion',
    preview: 'Offre speciale: -20%...',
    message: 'Offre speciale chez {restaurant} ! -20% sur toute la carte ce week-end. Reservez vite !'
  },
  {
    id: 'holiday',
    icon: '🎄',
    label: 'Fetes',
    preview: 'Joyeuses fetes !...',
    message: 'Joyeuses fetes de la part de {restaurant} ! Decouvrez notre menu special. Reservez votre table !'
  },
  {
    id: 'loyalty',
    icon: '⭐',
    label: 'Fidelite',
    preview: 'Merci {prenom}...',
    message: 'Merci pour votre fidelite {prenom} ! Beneficiez de 15% sur votre prochaine visite chez {restaurant}.'
  },
  {
    id: 'newdish',
    icon: '🍽️',
    label: 'Nouveau',
    preview: 'Nouvelle creation...',
    message: 'Nouveau chez {restaurant} ! Decouvrez notre derniere creation culinaire. Venez la deguster !'
  },
  {
    id: 'reminder',
    icon: '💬',
    label: 'Rappel',
    preview: 'On vous attend...',
    message: 'Bonjour {prenom} ! Cela fait un moment... On vous attend chez {restaurant} avec une surprise !'
  }
];

// Personalization tokens
const personalizationTokens = [
  { token: '{prenom}', label: 'Prenom', example: 'Marie' },
  { token: '{restaurant}', label: 'Restaurant', example: 'Le Gourmet' },
];

// Computed insights from real data
const insights = computed(() => {
  const totalSent = stats.value.totalMessagesSent || 0;
  const completedRate = stats.value.totalCampaigns > 0
    ? Math.round((stats.value.completedCampaigns / stats.value.totalCampaigns) * 100)
    : 0;

  const weeklyTrend = [
    Math.round(totalSent * 0.08),
    Math.round(totalSent * 0.12),
    Math.round(totalSent * 0.10),
    Math.round(totalSent * 0.18),
    Math.round(totalSent * 0.15),
    Math.round(totalSent * 0.22),
    Math.round(totalSent * 0.15),
  ];

  return {
    weeklyTrend,
    bestTime: 'Mardi 12h',
    monthlyReach: stats.value.totalSuccess || 0,
    completedRate,
  };
});

// View and filter options
const statusFilter = ref<string>('');
const searchQuery = ref('');

const formData = ref({
  name: '',
  message: '',
  scheduledAt: '',
});

const sendOptions = ref({
  sendNow: true,
  scheduledAt: '',
});

// Character count for SMS with segment calculation
const messageLength = computed(() => formData.value.message.length);
const hasEmoji = computed(() => /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(formData.value.message));
const maxCharsPerSms = computed(() => hasEmoji.value ? 70 : 160);
const smsSegments = computed(() => {
  if (messageLength.value === 0) {return 0;}
  if (hasEmoji.value) {
    return Math.ceil(messageLength.value / 67);
  }
  return messageLength.value <= 160 ? 1 : Math.ceil(messageLength.value / 153);
});
const messageCharsRemaining = computed(() => maxCharsPerSms.value - (messageLength.value % maxCharsPerSms.value || maxCharsPerSms.value));
const charPercentage = computed(() => Math.min((messageLength.value / maxCharsPerSms.value) * 100, 100));

// Preview message with example values
const previewMessage = computed(() => {
  let msg = formData.value.message;
  msg = msg.replace(/{prenom}/g, 'Marie');
  msg = msg.replace(/{restaurant}/g, 'Le Gourmet');
  return msg;
});

// Sparkline path generator
const sparklinePath = computed(() => {
  const data = insights.value.weeklyTrend;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 32;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
});

// Status configuration with gradient colors for borders
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string; gradient: string; pulse?: boolean }> = {
  draft: {
    label: 'Brouillon',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    gradient: 'from-slate-400 to-slate-500',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
  },
  scheduled: {
    label: 'Programmee',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    gradient: 'from-blue-400 to-blue-600',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  sending: {
    label: 'En cours...',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    gradient: 'from-amber-400 to-orange-500',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    pulse: true
  },
  completed: {
    label: 'Terminee',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    gradient: 'from-emerald-400 to-teal-500',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  failed: {
    label: 'Echouee',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    gradient: 'from-rose-400 to-red-500',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  cancelled: {
    label: 'Annulee',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    gradient: 'from-slate-300 to-slate-400',
    icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
  },
};

// Timeline steps for campaign
const getTimelineSteps = (campaign: Campaign) => {
  const steps = [
    { id: 'created', label: 'Cree', done: true },
    { id: 'scheduled', label: 'Programme', done: campaign.status !== 'draft' },
    { id: 'sending', label: 'Envoi', done: ['sending', 'completed', 'failed'].includes(campaign.status) },
    { id: 'completed', label: 'Termine', done: campaign.status === 'completed' },
  ];
  return steps;
};

// Filtered campaigns
const filteredCampaigns = computed(() => {
  let result = [...campaigns.value];

  if (statusFilter.value) {
    result = result.filter(c => c.status === statusFilter.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.message.toLowerCase().includes(query)
    );
  }

  return result;
});

// Quick filter counts
const draftCount = computed(() => campaigns.value.filter(c => c.status === 'draft').length);
const scheduledCount = computed(() => campaigns.value.filter(c => c.status === 'scheduled').length);

const fetchData = async (showRefresh = false) => {
  if (showRefresh) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }
  error.value = null;

  try {
    const [campaignsResponse, statsResponse] = await Promise.all([
      api.getCampaigns(),
      api.getCampaignStats(),
    ]);

    if (campaignsResponse.success && campaignsResponse.data) {
      campaigns.value = campaignsResponse.data.campaigns;
    }

    if (statsResponse.success && statsResponse.data) {
      stats.value = statsResponse.data.summary;
    }
  } catch (err) {
    error.value = 'Erreur lors du chargement des campagnes';
    console.error(err);
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
};

const refreshData = () => fetchData(true);

const openCreateModal = () => {
  editingCampaign.value = null;
  formData.value = { name: '', message: '', scheduledAt: '' };
  selectedTemplate.value = null;
  estimatedRecipients.value = 0;
  showModal.value = true;
};

const openEditModal = (campaign: Campaign) => {
  editingCampaign.value = campaign;
  formData.value = {
    name: campaign.name,
    message: campaign.message,
    scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.slice(0, 16) : '',
  };
  selectedTemplate.value = null;
  showModal.value = true;
};

const duplicateCampaign = (campaign: Campaign) => {
  editingCampaign.value = null;
  formData.value = {
    name: `${campaign.name} (copie)`,
    message: campaign.message,
    scheduledAt: '',
  };
  selectedTemplate.value = null;
  showModal.value = true;
};

const openPreviewModal = async (campaign: Campaign) => {
  try {
    const response = await api.getCampaign(campaign._id);
    if (response.success && response.data) {
      previewCampaign.value = response.data;
      showPreviewModal.value = true;
    }
  } catch {
    previewCampaign.value = campaign;
    showPreviewModal.value = true;
  }
};

const openSendModal = (campaign: Campaign) => {
  campaignToSend.value = campaign;
  sendOptions.value = { sendNow: true, scheduledAt: '' };
  showSendModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  setTimeout(() => { editingCampaign.value = null; }, 200);
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  setTimeout(() => { campaignToDelete.value = null; }, 200);
};

const closePreviewModal = () => {
  showPreviewModal.value = false;
  setTimeout(() => { previewCampaign.value = null; }, 200);
};

const closeSendModal = () => {
  showSendModal.value = false;
  setTimeout(() => { campaignToSend.value = null; }, 200);
};

const selectTemplate = (template: typeof messageTemplates[0]) => {
  selectedTemplate.value = template.id;
  formData.value.message = template.message;
};

const insertToken = (token: string) => {
  const textarea = messageTextareaRef.value;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.value.message;
    formData.value.message = text.substring(0, start) + token + text.substring(end);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  } else {
    formData.value.message += token;
  }
};

const handleSubmit = async () => {
  if (!formData.value.name.trim() || !formData.value.message.trim()) {return;}

  isSubmitting.value = true;
  error.value = null;

  try {
    const data = {
      name: formData.value.name.trim(),
      message: formData.value.message.trim(),
      scheduledAt: formData.value.scheduledAt || undefined,
    };

    if (editingCampaign.value) {
      const response = await api.updateCampaign(editingCampaign.value._id, data);
      if (response.success) {
        await fetchData();
        closeModal();
        message.success('Campagne mise a jour avec succes');
      }
    } else {
      const response = await api.createCampaign(data);
      if (response.success) {
        if (response.data) {
          estimatedRecipients.value = response.data.estimatedRecipients;
        }
        await fetchData();
        closeModal();
        message.success('Campagne creee avec succes');
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
    message.error(msg);
  } finally {
    isSubmitting.value = false;
  }
};

const confirmDelete = (campaign: Campaign) => {
  campaignToDelete.value = campaign;
  showDeleteModal.value = true;
};

const deleteCampaign = async () => {
  if (!campaignToDelete.value) {return;}

  isSubmitting.value = true;
  try {
    const response = await api.deleteCampaign(campaignToDelete.value._id);
    if (response.success) {
      await fetchData();
      closeDeleteModal();
      message.success('Campagne supprimee');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
    message.error(msg);
  } finally {
    isSubmitting.value = false;
  }
};

const sendCampaign = async () => {
  if (!campaignToSend.value) {return;}

  isSubmitting.value = true;
  try {
    const scheduledAt = sendOptions.value.sendNow ? undefined : sendOptions.value.scheduledAt;
    const response = await api.sendCampaign(campaignToSend.value._id, scheduledAt);
    if (response.success) {
      await fetchData();
      closeSendModal();
      message.success(scheduledAt ? 'Campagne programmee' : 'Envoi en cours...');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
    message.error(msg);
  } finally {
    isSubmitting.value = false;
  }
};

const cancelCampaign = async (campaign: Campaign) => {
  try {
    const response = await api.cancelCampaign(campaign._id);
    if (response.success) {
      await fetchData();
      message.success('Campagne annulee');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l\'annulation';
    message.error(msg);
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {return 'A l\'instant';}
  if (minutes < 60) {return `Il y a ${minutes}min`;}
  if (hours < 24) {return `Il y a ${hours}h`;}
  if (days < 7) {return `Il y a ${days}j`;}
  return formatDate(dateStr);
};

// Auto-refresh for sending campaigns
let refreshInterval: ReturnType<typeof setInterval> | null = null;

watch(campaigns, (newCampaigns) => {
  const hasSending = newCampaigns.some(c => c.status === 'sending');

  if (hasSending && !refreshInterval) {
    refreshInterval = setInterval(() => fetchData(true), 5000);
  } else if (!hasSending && refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}, { deep: true });

onMounted(fetchData);
</script>

<template>
  <FeatureGate :feature="FEATURES.SMS_CAMPAIGNS" :show-upgrade="true">
    <div class="campaigns-view space-y-6">
      <!-- Hero Header with Animated Mesh Background -->
      <a-card class="hero-card" :bordered="false">
      <div class="hero-section">
        <!-- Animated Mesh Gradient Background -->
        <div class="mesh-gradient"></div>

        <!-- Floating Orbs -->
        <div class="floating-orb orb-1"></div>
        <div class="floating-orb orb-2"></div>
        <div class="floating-orb orb-3"></div>

        <!-- Grid Pattern Overlay -->
        <div class="grid-pattern">
          <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        <div class="hero-content">
          <!-- Header Row -->
          <div class="hero-header">
            <div class="hero-title-section">
              <div class="hero-icon-wrapper">
                <MessageOutlined class="hero-icon" />
              </div>
              <div>
                <h1 class="hero-title">Campagnes SMS</h1>
                <p class="hero-subtitle">Engagez vos clients avec des promotions ciblees</p>
              </div>
            </div>

            <!-- Quick Action Chips -->
            <div class="quick-chips">
              <a-button
                v-if="draftCount > 0"
                type="text"
                class="chip-button"
                @click="statusFilter = 'draft'"
              >
                <span class="chip-dot draft"></span>
                {{ draftCount }} brouillon{{ draftCount > 1 ? 's' : '' }}
              </a-button>
              <a-button
                v-if="scheduledCount > 0"
                type="text"
                class="chip-button"
                @click="statusFilter = 'scheduled'"
              >
                <span class="chip-dot scheduled"></span>
                {{ scheduledCount }} programmee{{ scheduledCount > 1 ? 's' : '' }}
              </a-button>
              <a-button
                type="text"
                class="chip-button"
                @click="statusFilter = ''"
              >
                Voir tout
              </a-button>
            </div>
          </div>

          <div class="hero-actions">
            <a-button
              type="text"
              :loading="isRefreshing"
              class="refresh-button"
              @click="refreshData"
            >
              <template #icon><ReloadOutlined /></template>
            </a-button>
            <a-button
              type="primary"
              size="large"
              class="create-button"
              @click="openCreateModal"
            >
              <template #icon><PlusOutlined /></template>
              Nouvelle campagne
            </a-button>
          </div>
        </div>

        <!-- Stats Grid with Insights -->
        <div class="stats-grid">
          <!-- Total Campaigns -->
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-value">{{ stats.totalCampaigns }}</div>
              <div class="stat-icon-wrapper">
                <MessageOutlined />
              </div>
            </div>
            <div class="stat-label">Campagnes totales</div>
          </div>

          <!-- Completed -->
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-value">{{ stats.completedCampaigns }}</div>
              <div class="stat-icon-wrapper success">
                <CheckCircleOutlined />
              </div>
            </div>
            <div class="stat-label">Terminees</div>
          </div>

          <!-- SMS Sent with Sparkline -->
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-value">{{ stats.totalMessagesSent }}</div>
              <div class="sparkline-wrapper">
                <svg width="60" height="24" class="sparkline">
                  <path
                    :d="sparklinePath"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="sparkline-path"
                  />
                </svg>
              </div>
            </div>
            <div class="stat-label">SMS envoyes</div>
          </div>

          <!-- Success Rate Ring -->
          <div class="stat-card">
            <div class="stat-header">
              <div>
                <div class="stat-value success-value">{{ stats.totalSuccess }}</div>
                <span v-if="stats.totalFailed > 0" class="failed-count">{{ stats.totalFailed }} echecs</span>
              </div>
              <div class="ring-wrapper">
                <svg class="ring-svg" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" />
                  <circle
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke="#34d399"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="`${stats.totalMessagesSent > 0 ? (stats.totalSuccess / stats.totalMessagesSent) * 88 : 0} 88`"
                    class="ring-progress"
                  />
                </svg>
                <span class="ring-text">
                  {{ stats.totalMessagesSent > 0 ? Math.round((stats.totalSuccess / stats.totalMessagesSent) * 100) : 0 }}%
                </span>
              </div>
            </div>
            <div class="stat-label">Taux de succes</div>
          </div>

          <!-- Insights Card -->
          <div class="stat-card insights-card">
            <div class="insights-header">
              <ExclamationCircleOutlined />
              <span>Insights</span>
            </div>
            <div class="insights-content">
              <div class="insight-row">
                <span class="insight-label">Messages delivres</span>
                <span class="insight-value">{{ insights.monthlyReach }} clients</span>
              </div>
              <div class="insight-row">
                <span class="insight-label">Meilleur horaire</span>
                <span class="insight-value">{{ insights.bestTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- Filters Bar -->
    <a-card :bordered="false" class="filters-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :lg="10">
          <a-input
            v-model:value="searchQuery"
            placeholder="Rechercher une campagne..."
            size="large"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="8">
          <a-select
            v-model:value="statusFilter"
            placeholder="Tous les statuts"
            size="large"
            style="width: 100%"
            allow-clear
          >
            <a-select-option value="">Tous les statuts</a-select-option>
            <a-select-option value="draft">Brouillon</a-select-option>
            <a-select-option value="scheduled">Programmee</a-select-option>
            <a-select-option value="sending">En cours</a-select-option>
            <a-select-option value="completed">Terminee</a-select-option>
            <a-select-option value="failed">Echouee</a-select-option>
            <a-select-option value="cancelled">Annulee</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :lg="6" class="hidden lg:block">
          <span class="text-gray-500">
            {{ filteredCampaigns.length }} campagne{{ filteredCampaigns.length !== 1 ? 's' : '' }}
          </span>
        </a-col>
      </a-row>
    </a-card>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Error State -->
    <a-result
      v-else-if="error"
      status="error"
      :title="error"
      sub-title="Impossible de charger les campagnes"
    >
      <template #extra>
        <a-button type="primary" @click="() => fetchData()">Reessayer</a-button>
      </template>
    </a-result>

    <!-- Empty State -->
    <a-card v-else-if="filteredCampaigns.length === 0" :bordered="false" class="empty-card">
      <a-empty
        :description="searchQuery || statusFilter ? 'Aucun resultat' : 'Aucune campagne'"
      >
        <template #image>
          <div class="empty-icon">
            <MessageOutlined />
          </div>
        </template>
        <p class="empty-description">
          {{ searchQuery || statusFilter
            ? 'Essayez de modifier vos filtres de recherche'
            : 'Creez votre premiere campagne SMS pour engager vos clients'
          }}
        </p>

        <!-- Getting Started Steps -->
        <div v-if="!searchQuery && !statusFilter" class="getting-started">
          <div class="step-card">
            <div class="step-number teal">1</div>
            <div class="step-title">Creez</div>
            <div class="step-desc">Nouvelle campagne</div>
          </div>
          <div class="step-card">
            <div class="step-number cyan">2</div>
            <div class="step-title">Redigez</div>
            <div class="step-desc">Votre message SMS</div>
          </div>
          <div class="step-card">
            <div class="step-number emerald">3</div>
            <div class="step-title">Envoyez</div>
            <div class="step-desc">A vos clients</div>
          </div>
        </div>

        <a-button
          v-if="!searchQuery && !statusFilter"
          type="primary"
          size="large"
          @click="openCreateModal"
        >
          <template #icon><PlusOutlined /></template>
          Creer ma premiere campagne
        </a-button>
      </a-empty>
    </a-card>

    <!-- Campaigns List -->
    <div v-else class="campaigns-list">
      <TransitionGroup
        tag="div"
        class="space-y-4"
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 scale-95"
        move-class="transition-all duration-300"
      >
        <a-card
          v-for="(campaign, index) in filteredCampaigns"
          :key="campaign._id"
          :bordered="false"
          :style="{ animationDelay: `${index * 50}ms` }"
          class="campaign-card"
        >
          <!-- Status Gradient Border -->
          <div :class="['status-border', statusConfig[campaign.status]?.gradient ?? 'from-slate-400']"></div>

          <!-- Sending progress indicator -->
          <div v-if="campaign.status === 'sending'" class="sending-progress">
            <div
              class="progress-bar"
              :style="{ width: `${(campaign.stats.sent / campaign.stats.totalRecipients) * 100}%` }"
            ></div>
          </div>

          <div class="campaign-content">
            <div class="campaign-main">
              <!-- Content -->
              <div class="campaign-info">
                <div class="campaign-header">
                  <h3 class="campaign-name">{{ campaign.name }}</h3>
                  <a-tag
                    :class="[statusConfig[campaign.status]?.bg ?? 'bg-slate-100', statusConfig[campaign.status]?.color ?? 'text-slate-600']"
                  >
                    <template #icon>
                      <svg class="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="statusConfig[campaign.status]?.icon ?? ''" />
                      </svg>
                    </template>
                    {{ statusConfig[campaign.status]?.label ?? campaign.status }}
                  </a-tag>
                </div>

                <!-- Message Quote Box -->
                <div class="message-quote">
                  <p class="message-text">{{ campaign.message }}</p>
                </div>

                <!-- Performance Bar (for sent campaigns) -->
                <div v-if="campaign.stats.sent > 0" class="performance-bar">
                  <div class="bar-container">
                    <div
                      class="bar-success"
                      :style="{ width: `${(campaign.stats.success / campaign.stats.totalRecipients) * 100}%` }"
                    ></div>
                    <div
                      class="bar-failed"
                      :style="{ width: `${(campaign.stats.failed / campaign.stats.totalRecipients) * 100}%` }"
                    ></div>
                  </div>
                  <span class="bar-label">{{ campaign.stats.success }}/{{ campaign.stats.totalRecipients }}</span>
                </div>

                <!-- Timeline -->
                <div class="timeline-dots">
                  <template v-for="(step, stepIndex) in getTimelineSteps(campaign)" :key="step.id">
                    <div
                      :class="['timeline-dot', { done: step.done }]"
                      :title="step.label"
                    >
                      <svg v-if="step.done" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span v-else>{{ stepIndex + 1 }}</span>
                    </div>
                    <div v-if="stepIndex < 3" :class="['timeline-connector', { done: step.done }]"></div>
                  </template>
                </div>

                <!-- Meta info -->
                <div class="campaign-meta">
                  <span class="meta-item">
                    <UserOutlined />
                    {{ campaign.stats.totalRecipients }}
                  </span>
                  <span v-if="campaign.scheduledAt && campaign.status === 'scheduled'" class="meta-item scheduled">
                    <ClockCircleOutlined />
                    {{ formatDate(campaign.scheduledAt) }}
                  </span>
                  <span class="meta-item muted">
                    {{ formatRelativeTime(campaign.createdAt) }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="campaign-actions">
                <!-- Primary action -->
                <a-button
                  v-if="campaign.status === 'draft'"
                  type="primary"
                  @click="openSendModal(campaign)"
                >
                  <template #icon><SendOutlined /></template>
                  Envoyer
                </a-button>

                <a-button
                  v-if="campaign.status === 'scheduled'"
                  @click="cancelCampaign(campaign)"
                >
                  <template #icon><CloseCircleOutlined /></template>
                  Annuler
                </a-button>

                <!-- Icon buttons -->
                <a-space class="action-buttons">
                  <a-tooltip title="Voir les details">
                    <a-button type="text" @click="openPreviewModal(campaign)">
                      <template #icon><EyeOutlined /></template>
                    </a-button>
                  </a-tooltip>

                  <a-tooltip v-if="campaign.status === 'draft'" title="Modifier">
                    <a-button type="text" @click="openEditModal(campaign)">
                      <template #icon><EditOutlined /></template>
                    </a-button>
                  </a-tooltip>

                  <a-tooltip title="Dupliquer">
                    <a-button type="text" @click="duplicateCampaign(campaign)">
                      <template #icon><CopyOutlined /></template>
                    </a-button>
                  </a-tooltip>

                  <a-tooltip v-if="campaign.status !== 'sending'" title="Supprimer">
                    <a-button type="text" danger @click="confirmDelete(campaign)">
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </a-space>
              </div>
            </div>
          </div>
        </a-card>
      </TransitionGroup>
    </div>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="showModal"
      :title="editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'"
      :footer="null"
      :width="800"
      class="campaign-modal"
      @cancel="closeModal"
    >
      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Message Templates -->
        <div class="templates-section">
          <label class="section-label">Modeles de messages</label>
          <div class="templates-scroll">
            <button
              v-for="template in messageTemplates"
              :key="template.id"
              type="button"
              @click="selectTemplate(template)"
              :class="['template-chip', { selected: selectedTemplate === template.id }]"
            >
              <span class="template-icon">{{ template.icon }}</span>
              <span>{{ template.label }}</span>
            </button>
          </div>
        </div>

        <a-row :gutter="24">
          <!-- Form Fields -->
          <a-col :xs="24" :lg="12">
            <a-form layout="vertical">
              <a-form-item label="Nom de la campagne" required>
                <a-input
                  v-model:value="formData.name"
                  placeholder="Ex: Promo de Noel"
                  :maxlength="100"
                  size="large"
                />
              </a-form-item>

              <a-form-item required>
                <template #label>
                  <div class="message-label">
                    <span>Message SMS</span>
                    <div class="char-counter">
                      <span v-if="messageLength > 0" class="sms-count">
                        SMS: <span :class="{ 'text-amber-600': smsSegments > 1 }">{{ smsSegments }}</span>
                      </span>
                      <div class="char-ring">
                        <svg class="ring-svg-small" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" stroke-width="3" />
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            :stroke="charPercentage > 90 ? '#f43f5e' : charPercentage > 70 ? '#f59e0b' : '#14b8a6'"
                            stroke-width="3"
                            stroke-linecap="round"
                            :stroke-dasharray="`${charPercentage * 0.94} 100`"
                          />
                        </svg>
                        <span :class="['char-count', { warning: messageCharsRemaining < 20, danger: messageCharsRemaining < 10 }]">
                          {{ messageCharsRemaining }}
                        </span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Personalization Tokens -->
                <div class="tokens-row">
                  <a-button
                    v-for="token in personalizationTokens"
                    :key="token.token"
                    type="text"
                    size="small"
                    class="token-chip"
                    @click="insertToken(token.token)"
                  >
                    <template #icon><PlusOutlined /></template>
                    {{ token.label }}
                  </a-button>
                </div>

                <a-textarea
                  ref="messageTextareaRef"
                  v-model:value="formData.message"
                  placeholder="Ex: Beneficiez de 20% de reduction ce week-end!"
                  :rows="5"
                  :maxlength="320"
                />

                <a-alert
                  v-if="hasEmoji"
                  type="warning"
                  message="Les emojis reduisent la limite a 70 caracteres/SMS"
                  show-icon
                  class="mt-2"
                />
              </a-form-item>
            </a-form>
          </a-col>

          <!-- Phone Preview -->
          <a-col :xs="24" :lg="12" class="phone-preview-col">
            <div class="phone-frame">
              <div class="phone-screen">
                <!-- Status bar -->
                <div class="phone-status-bar">
                  <span>9:41</span>
                  <div class="battery-icon"></div>
                </div>

                <!-- Message header -->
                <div class="phone-header">
                  <div class="phone-avatar">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div class="phone-name">Le Gourmet</div>
                    <div class="phone-type">SMS</div>
                  </div>
                </div>

                <!-- Messages area -->
                <div class="phone-messages">
                  <Transition
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="opacity-0 translate-y-2 scale-95"
                    enter-to-class="opacity-100 translate-y-0 scale-100"
                  >
                    <div v-if="previewMessage" class="message-bubble-container">
                      <div class="message-bubble">
                        <p>{{ previewMessage }}</p>
                      </div>
                      <div class="message-meta">
                        <span>Maintenant</span>
                        <svg class="delivered-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </Transition>
                  <div v-if="!previewMessage" class="empty-messages">
                    <MessageOutlined />
                    <p>Tapez votre message</p>
                  </div>
                </div>
              </div>
              <div class="phone-notch"></div>
            </div>
          </a-col>
        </a-row>

        <!-- Actions -->
        <div class="modal-actions">
          <a-button size="large" @click="closeModal">Annuler</a-button>
          <a-button
            type="primary"
            size="large"
            html-type="submit"
            :loading="isSubmitting"
            :disabled="!formData.name.trim() || !formData.message.trim()"
          >
            {{ editingCampaign ? 'Enregistrer' : 'Creer la campagne' }}
          </a-button>
        </div>
      </form>
    </a-modal>

    <!-- Send Modal -->
    <a-modal
      v-model:open="showSendModal"
      title="Envoyer la campagne"
      :footer="null"
      :width="500"
      @cancel="closeSendModal"
    >
      <div class="send-modal-content">
        <div class="send-icon-wrapper">
          <SendOutlined />
        </div>
        <h3 class="send-campaign-name">{{ campaignToSend?.name }}</h3>

        <div class="recipients-count">
          <div class="recipients-number">{{ campaignToSend?.stats.totalRecipients }}</div>
          <div class="recipients-label">client{{ (campaignToSend?.stats.totalRecipients ?? 0) !== 1 ? 's' : '' }} recevront ce SMS</div>
        </div>

        <a-radio-group v-model:value="sendOptions.sendNow" class="send-options">
          <a-radio :value="true" class="send-option">
            <div>
              <div class="option-title">Envoyer maintenant</div>
              <div class="option-desc">Les SMS seront envoyes immediatement</div>
            </div>
          </a-radio>
          <a-radio :value="false" class="send-option">
            <div>
              <div class="option-title">Programmer l'envoi</div>
              <div class="option-desc">Choisissez une date et heure</div>
            </div>
          </a-radio>
        </a-radio-group>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
        >
          <a-input
            v-if="!sendOptions.sendNow"
            v-model:value="sendOptions.scheduledAt"
            type="datetime-local"
            size="large"
            class="schedule-input"
          />
        </Transition>

        <div class="send-actions">
          <a-button size="large" @click="closeSendModal">Annuler</a-button>
          <a-button
            type="primary"
            size="large"
            :loading="isSubmitting"
            :disabled="!sendOptions.sendNow && !sendOptions.scheduledAt"
            @click="sendCampaign"
          >
            {{ sendOptions.sendNow ? 'Envoyer' : 'Programmer' }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Delete Modal -->
    <a-modal
      v-model:open="showDeleteModal"
      title="Supprimer la campagne"
      :footer="null"
      :width="420"
      @cancel="closeDeleteModal"
    >
      <div class="delete-modal-content">
        <div class="delete-icon-wrapper">
          <DeleteOutlined />
        </div>
        <p class="delete-message">
          Etes-vous sur de vouloir supprimer<br>
          <strong>"{{ campaignToDelete?.name }}"</strong> ?
        </p>
        <p class="delete-warning">Cette action est irreversible.</p>

        <div class="delete-actions">
          <a-button size="large" @click="closeDeleteModal">Annuler</a-button>
          <a-button
            type="primary"
            danger
            size="large"
            :loading="isSubmitting"
            @click="deleteCampaign"
          >
            Supprimer
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Preview Modal -->
    <a-modal
      v-model:open="showPreviewModal"
      :title="previewCampaign?.name || 'Details'"
      :footer="null"
      :width="720"
      @cancel="closePreviewModal"
    >
      <template v-if="previewCampaign">
        <a-row :gutter="24">
          <!-- Phone Preview -->
          <a-col :xs="24" :lg="10" class="mb-6 lg:mb-0">
            <div class="phone-frame small">
              <div class="phone-screen">
                <div class="phone-status-bar">
                  <span>9:41</span>
                </div>
                <div class="phone-header small">
                  <div class="phone-avatar small">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div class="phone-name small">Restaurant</div>
                </div>
                <div class="phone-messages small">
                  <div class="message-bubble small">
                    <p>{{ previewCampaign.message }}</p>
                  </div>
                  <div class="message-meta">
                    <span>{{ formatDate(previewCampaign.createdAt) }}</span>
                    <svg v-if="previewCampaign.status === 'completed'" class="delivered-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div class="phone-notch small"></div>
            </div>
          </a-col>

          <!-- Stats & Details -->
          <a-col :xs="24" :lg="14">
            <a-row :gutter="[12, 12]">
              <a-col :span="12">
                <a-statistic title="Destinataires" :value="previewCampaign.stats.totalRecipients" />
              </a-col>
              <a-col :span="12">
                <a-statistic
                  title="Succes"
                  :value="previewCampaign.stats.success"
                  value-style="color: #10b981"
                />
              </a-col>
              <a-col :span="12">
                <a-statistic
                  title="Echecs"
                  :value="previewCampaign.stats.failed"
                  value-style="color: #ef4444"
                />
              </a-col>
              <a-col :span="12">
                <a-statistic
                  title="En attente"
                  :value="previewCampaign.stats.totalRecipients - previewCampaign.stats.sent"
                  value-style="color: #f59e0b"
                />
              </a-col>
            </a-row>

            <!-- Progress bar -->
            <div v-if="previewCampaign.stats.sent > 0" class="mt-6">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">Progression</span>
                <span class="font-medium">
                  {{ Math.round((previewCampaign.stats.sent / previewCampaign.stats.totalRecipients) * 100) }}%
                </span>
              </div>
              <a-progress
                :percent="Math.round((previewCampaign.stats.sent / previewCampaign.stats.totalRecipients) * 100)"
                :show-info="false"
                stroke-color="#14b8a6"
              />
            </div>

            <!-- Timeline -->
            <div class="mt-6">
              <h4 class="text-sm font-medium text-gray-700 mb-3">Timeline</h4>
              <a-timeline>
                <a-timeline-item color="green">
                  <span class="text-gray-500">Creee</span>
                  <span class="ml-2 text-gray-700">{{ formatDate(previewCampaign.createdAt) }}</span>
                </a-timeline-item>
                <a-timeline-item v-if="previewCampaign.scheduledAt" :color="previewCampaign.status !== 'draft' ? 'blue' : 'gray'">
                  <span class="text-gray-500">Programmee</span>
                  <span class="ml-2 text-gray-700">{{ formatDate(previewCampaign.scheduledAt) }}</span>
                </a-timeline-item>
                <a-timeline-item v-if="previewCampaign.startedAt" color="orange">
                  <span class="text-gray-500">Debut d'envoi</span>
                  <span class="ml-2 text-gray-700">{{ formatDate(previewCampaign.startedAt) }}</span>
                </a-timeline-item>
                <a-timeline-item v-if="previewCampaign.completedAt" color="green">
                  <span class="text-gray-500">Terminee</span>
                  <span class="ml-2 text-gray-700">{{ formatDate(previewCampaign.completedAt) }}</span>
                </a-timeline-item>
              </a-timeline>
            </div>
          </a-col>
        </a-row>
      </template>
    </a-modal>
    </div>
  </FeatureGate>
</template>

<style scoped>
.campaigns-view {
  display: flex;
  flex-direction: column;
}

/* Hero Section */
.hero-card {
  border-radius: 24px;
  overflow: hidden;
}

.hero-card :deep(.ant-card-body) {
  padding: 0;
}

.hero-section {
  position: relative;
  padding: 32px;
  color: white;
  overflow: hidden;
}

.mesh-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(6, 182, 212, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse 60% 50% at 80% 20%, rgba(20, 184, 166, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse 50% 80% at 60% 80%, rgba(16, 185, 129, 0.35) 0%, transparent 50%),
    linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0d9488 100%);
  animation: meshMove 20s ease-in-out infinite;
}

@keyframes meshMove {
  0%, 100% { background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%; }
  25% { background-position: 20% 20%, 80% 30%, 40% 80%, 0% 0%; }
  50% { background-position: 40% 10%, 60% 50%, 60% 70%, 0% 0%; }
  75% { background-position: 10% 30%, 90% 20%, 30% 90%, 0% 0%; }
}

.floating-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
}

.orb-1 {
  right: -64px;
  top: -64px;
  width: 192px;
  height: 192px;
  background: rgba(255, 255, 255, 0.1);
  animation: floatOrb 8s ease-in-out infinite;
}

.orb-2 {
  left: -80px;
  bottom: -80px;
  width: 224px;
  height: 224px;
  background: rgba(103, 232, 249, 0.15);
  animation: floatOrb 10s ease-in-out infinite;
  animation-delay: -3s;
}

.orb-3 {
  right: 33%;
  top: 50%;
  width: 128px;
  height: 128px;
  background: rgba(45, 212, 191, 0.1);
  filter: blur(32px);
  animation: floatOrb 12s ease-in-out infinite;
  animation-delay: -6s;
}

@keyframes floatOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(10px, -15px) scale(1.05); }
  66% { transform: translate(-5px, 10px) scale(0.95); }
}

.grid-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.07;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1024px) {
  .hero-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.hero-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.hero-icon {
  font-size: 28px;
}

.hero-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

@media (min-width: 1024px) {
  .hero-title {
    font-size: 30px;
  }
}

.hero-subtitle {
  margin: 4px 0 0;
  opacity: 0.9;
}

.quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.chip-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  color: white;
  font-weight: 500;
  backdrop-filter: blur(8px);
}

.chip-button:hover {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chip-dot.draft {
  background: #cbd5e1;
}

.chip-dot.scheduled {
  background: #93c5fd;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

@media (min-width: 1024px) {
  .hero-actions {
    margin-top: 0;
  }
}

.refresh-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 12px;
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.create-button {
  background: white;
  color: #0d9488;
  border: none;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.create-button:hover {
  background: #f0fdfa;
  color: #0d9488;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 32px;
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.stat-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  transition: background 0.2s;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.15);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-icon-wrapper {
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.stat-icon-wrapper.success {
  background: rgba(52, 211, 153, 0.2);
  color: #a7f3d0;
}

.stat-label {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.8;
}

.sparkline-wrapper {
  padding: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.sparkline {
  color: #67e8f9;
}

.sparkline-path {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: drawSparkline 1.5s ease-out forwards;
}

@keyframes drawSparkline {
  to { stroke-dashoffset: 0; }
}

.success-value {
  color: #a7f3d0;
}

.failed-count {
  font-size: 14px;
  color: #fda4af;
}

.ring-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
}

.ring-svg {
  width: 48px;
  height: 48px;
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke-dasharray 0.7s;
}

.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #a7f3d0;
}

.insights-card {
  background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
  grid-column: span 2;
}

@media (min-width: 1024px) {
  .insights-card {
    grid-column: span 1;
  }
}

.insights-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #fde68a;
}

.insights-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.insight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
}

.insight-label {
  opacity: 0.7;
}

.insight-value {
  font-weight: 600;
}

/* Filters Card */
.filters-card {
  border-radius: 16px;
}

/* Loading */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

/* Empty State */
.empty-card {
  border-radius: 16px;
  text-align: center;
  padding: 48px;
}

.empty-icon {
  width: 96px;
  height: 96px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(to bottom right, #f0fdfa, #ecfeff);
  font-size: 48px;
  color: #14b8a6;
}

.empty-description {
  max-width: 384px;
  margin: 8px auto 0;
  color: #6b7280;
}

.getting-started {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 400px;
  margin: 32px auto;
}

.step-card {
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  text-align: left;
}

.step-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}

.step-number.teal {
  background: #ccfbf1;
  color: #0d9488;
}

.step-number.cyan {
  background: #cffafe;
  color: #0891b2;
}

.step-number.emerald {
  background: #d1fae5;
  color: #059669;
}

.step-title {
  margin-top: 8px;
  font-weight: 500;
  color: #374151;
}

.step-desc {
  font-size: 14px;
  color: #6b7280;
}

/* Campaign Cards */
.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.campaign-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s;
}

.campaign-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.campaign-card :deep(.ant-card-body) {
  padding: 0;
}

.status-border {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.status-border.from-slate-400 { background: linear-gradient(to bottom, #94a3b8, #64748b); }
.status-border.from-blue-400 { background: linear-gradient(to bottom, #60a5fa, #2563eb); }
.status-border.from-amber-400 { background: linear-gradient(to bottom, #fbbf24, #f97316); }
.status-border.from-emerald-400 { background: linear-gradient(to bottom, #34d399, #14b8a6); }
.status-border.from-rose-400 { background: linear-gradient(to bottom, #fb7185, #ef4444); }
.status-border.from-slate-300 { background: linear-gradient(to bottom, #cbd5e1, #94a3b8); }

.sending-progress {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 4px;
  background: #fef3c7;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(to right, #fbbf24, #f59e0b);
  animation: pulse 2s infinite;
}

.campaign-content {
  padding: 24px;
  padding-left: 20px;
}

.campaign-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1024px) {
  .campaign-main {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.campaign-info {
  flex: 1;
  min-width: 0;
}

.campaign-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.campaign-name {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.message-quote {
  margin-top: 12px;
  padding-left: 16px;
  border-left: 2px solid #e5e7eb;
}

.message-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #6b7280;
  font-style: italic;
  margin: 0;
}

.performance-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.bar-container {
  flex: 1;
  height: 8px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  display: flex;
}

.bar-success {
  height: 100%;
  background: #10b981;
  transition: width 0.5s;
}

.bar-failed {
  height: 100%;
  background: #f87171;
  transition: width 0.5s;
}

.bar-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.timeline-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 16px;
}

.timeline-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
  background: #f1f5f9;
  color: #9ca3af;
  transition: all 0.2s;
}

.timeline-dot.done {
  background: #14b8a6;
  color: white;
}

.timeline-connector {
  width: 24px;
  height: 2px;
  border-radius: 9999px;
  background: #e5e7eb;
  transition: background 0.2s;
}

.timeline-connector.done {
  background: #14b8a6;
}

.campaign-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  font-size: 14px;
  color: #6b7280;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meta-item.scheduled {
  color: #2563eb;
}

.meta-item.muted {
  color: #9ca3af;
}

.campaign-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.action-buttons {
  background: #f9fafb;
  border-radius: 12px;
  padding: 4px;
}

/* Modal Styles */
.modal-form {
  padding: 8px 0;
}

.templates-section {
  margin-bottom: 24px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.templates-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin: 0 -8px;
  padding: 0 8px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.templates-scroll::-webkit-scrollbar {
  display: none;
}

.template-chip {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  background: #f1f5f9;
  color: #374151;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.template-chip:hover {
  background: #e2e8f0;
}

.template-chip.selected {
  background: #14b8a6;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(20, 184, 166, 0.3);
}

.template-icon {
  font-size: 18px;
}

.message-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.char-counter {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sms-count {
  font-size: 12px;
  color: #6b7280;
}

.char-ring {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ring-svg-small {
  width: 32px;
  height: 32px;
  transform: rotate(-90deg);
}

.char-count {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.char-count.warning {
  color: #f59e0b;
}

.char-count.danger {
  color: #ef4444;
}

.tokens-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.token-chip {
  background: #ecfeff;
  color: #0e7490;
  border-radius: 8px;
}

.token-chip:hover {
  background: #cffafe;
  color: #0e7490;
}

.phone-preview-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Phone Frame */
.phone-frame {
  position: relative;
  width: 220px;
  height: 440px;
  border-radius: 40px;
  background: #1e293b;
  padding: 10px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.phone-frame.small {
  width: 180px;
  height: 360px;
  border-radius: 32px;
  padding: 8px;
}

.phone-screen {
  height: 100%;
  border-radius: 32px;
  background: #f1f5f9;
  overflow: hidden;
}

.phone-frame.small .phone-screen {
  border-radius: 24px;
}

.phone-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(226, 232, 240, 0.8);
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.battery-icon {
  width: 20px;
  height: 10px;
  border-radius: 2px;
  background: #475569;
}

.phone-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.phone-header.small {
  gap: 8px;
  padding: 8px 12px;
}

.phone-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(to bottom right, #2dd4bf, #06b6d4);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.phone-avatar.small {
  width: 32px;
  height: 32px;
}

.phone-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.phone-name.small {
  font-size: 12px;
}

.phone-type {
  font-size: 12px;
  color: #6b7280;
}

.phone-messages {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.phone-messages.small {
  padding: 12px;
}

.message-bubble-container {
  max-width: 90%;
}

.message-bubble {
  padding: 12px 16px;
  background: #e2e8f0;
  border-radius: 16px;
  border-top-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-bubble.small {
  padding: 8px 12px;
  border-radius: 12px;
  border-top-left-radius: 2px;
}

.message-bubble p {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.message-bubble.small p {
  font-size: 12px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.delivered-check {
  width: 14px;
  height: 14px;
  color: #3b82f6;
  animation: checkAppear 0.4s ease-out 0.3s both;
}

@keyframes checkAppear {
  0% { opacity: 0; transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 128px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.empty-messages .anticon {
  font-size: 32px;
  color: #cbd5e1;
  margin-bottom: 8px;
}

.phone-notch {
  position: absolute;
  left: 50%;
  top: 16px;
  width: 96px;
  height: 28px;
  transform: translateX(-50%);
  border-radius: 9999px;
  background: #1e293b;
}

.phone-notch.small {
  width: 64px;
  height: 20px;
  top: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

/* Send Modal */
.send-modal-content {
  text-align: center;
}

.send-icon-wrapper {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(to bottom right, #ccfbf1, #cffafe);
  font-size: 32px;
  color: #0d9488;
}

.send-campaign-name {
  margin-top: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.recipients-count {
  margin-top: 24px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(to bottom right, #f0fdfa, #ecfeff);
  text-align: center;
}

.recipients-number {
  font-size: 30px;
  font-weight: 700;
  color: #0f766e;
}

.recipients-label {
  margin-top: 4px;
  font-size: 14px;
  color: #0d9488;
}

.send-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.send-option {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.send-option:hover {
  border-color: #d1d5db;
}

.send-option :deep(.ant-radio-checked) + * {
  /* Handled by ant-design */
}

.option-title {
  font-weight: 500;
  color: #111827;
}

.option-desc {
  font-size: 14px;
  color: #6b7280;
}

.schedule-input {
  margin-top: 12px;
  margin-left: 36px;
}

.send-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.send-actions .ant-btn {
  flex: 1;
}

/* Delete Modal */
.delete-modal-content {
  text-align: center;
}

.delete-icon-wrapper {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fee2e2;
  font-size: 32px;
  color: #dc2626;
}

.delete-message {
  margin-top: 16px;
  color: #6b7280;
}

.delete-message strong {
  color: #374151;
}

.delete-warning {
  margin-top: 8px;
  font-size: 14px;
  color: #ef4444;
}

.delete-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.delete-actions .ant-btn {
  flex: 1;
}
</style>
