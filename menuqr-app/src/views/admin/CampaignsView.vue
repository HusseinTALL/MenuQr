<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import api, { type Campaign } from '@/services/api';

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

  // Generate sparkline from campaign data distribution (placeholder)
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
    bestTime: 'Mardi 12h', // Could be calculated from campaign send times
    monthlyReach: stats.value.totalSuccess || 0,
    completedRate,
  };
});

// View and filter options
const statusFilter = ref<string>('');
const searchQuery = ref('');

// Success/Error toasts
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { message, type };
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.value = null;
  }, 4000);
};

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
  if (messageLength.value === 0) return 0;
  if (hasEmoji.value) {
    return Math.ceil(messageLength.value / 67); // 67 for concatenated unicode
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
    // Reset cursor position after token
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  } else {
    formData.value.message += token;
  }
};

const handleSubmit = async () => {
  if (!formData.value.name.trim() || !formData.value.message.trim()) return;

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
        showToast('Campagne mise a jour avec succes');
      }
    } else {
      const response = await api.createCampaign(data);
      if (response.success) {
        if (response.data) {
          estimatedRecipients.value = response.data.estimatedRecipients;
        }
        await fetchData();
        closeModal();
        showToast('Campagne creee avec succes');
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
    showToast(message, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const confirmDelete = (campaign: Campaign) => {
  campaignToDelete.value = campaign;
  showDeleteModal.value = true;
};

const deleteCampaign = async () => {
  if (!campaignToDelete.value) return;

  isSubmitting.value = true;
  try {
    const response = await api.deleteCampaign(campaignToDelete.value._id);
    if (response.success) {
      await fetchData();
      closeDeleteModal();
      showToast('Campagne supprimee');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
    showToast(message, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const sendCampaign = async () => {
  if (!campaignToSend.value) return;

  isSubmitting.value = true;
  try {
    const scheduledAt = sendOptions.value.sendNow ? undefined : sendOptions.value.scheduledAt;
    const response = await api.sendCampaign(campaignToSend.value._id, scheduledAt);
    if (response.success) {
      await fetchData();
      closeSendModal();
      showToast(scheduledAt ? 'Campagne programmee' : 'Envoi en cours...');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
    showToast(message, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const cancelCampaign = async (campaign: Campaign) => {
  try {
    const response = await api.cancelCampaign(campaign._id);
    if (response.success) {
      await fetchData();
      showToast('Campagne annulee');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'annulation';
    showToast(message, 'error');
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

  if (minutes < 1) return 'A l\'instant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
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
  <div class="campaigns-view min-h-screen space-y-6">
    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition ease-out duration-300 transform"
      enter-from-class="opacity-0 -translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-200 transform"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-4 scale-95"
    >
      <div
        v-if="toast"
        class="fixed left-1/2 top-6 z-[100] -translate-x-1/2"
      >
        <div
          :class="[
            'flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-xl',
            toast.type === 'success'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-rose-500/90 text-white'
          ]"
        >
          <div :class="['rounded-full p-1', toast.type === 'success' ? 'bg-white/20' : 'bg-white/20']">
            <svg v-if="toast.type === 'success'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span class="font-medium">{{ toast.message }}</span>
        </div>
      </div>
    </Transition>

    <!-- Hero Header with Animated Mesh Background -->
    <div class="hero-section relative overflow-hidden rounded-3xl p-8 text-white shadow-xl">
      <!-- Animated Mesh Gradient Background -->
      <div class="absolute inset-0 mesh-gradient"></div>

      <!-- Floating Orbs -->
      <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl floating-orb"></div>
      <div class="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl floating-orb-delayed"></div>
      <div class="absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-teal-200/10 blur-2xl floating-orb-slow"></div>

      <!-- Grid Pattern Overlay -->
      <div class="absolute inset-0 opacity-[0.07]">
        <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div class="relative">
        <!-- Header Row -->
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="flex items-center gap-4">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 class="text-2xl font-bold tracking-tight lg:text-3xl">Campagnes SMS</h1>
                <p class="mt-1 text-teal-100/90">Engagez vos clients avec des promotions ciblees</p>
              </div>
            </div>

            <!-- Quick Action Chips -->
            <div class="mt-5 flex flex-wrap gap-2">
              <button
                v-if="draftCount > 0"
                @click="statusFilter = 'draft'"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/25 active:scale-95"
              >
                <span class="h-2 w-2 rounded-full bg-slate-300"></span>
                {{ draftCount }} brouillon{{ draftCount > 1 ? 's' : '' }}
              </button>
              <button
                v-if="scheduledCount > 0"
                @click="statusFilter = 'scheduled'"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/25 active:scale-95"
              >
                <span class="h-2 w-2 rounded-full bg-blue-300"></span>
                {{ scheduledCount }} programmee{{ scheduledCount > 1 ? 's' : '' }}
              </button>
              <button
                @click="statusFilter = ''"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
              >
                Voir tout
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="refreshData"
              :disabled="isRefreshing"
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm transition-all hover:bg-white/25 disabled:opacity-50 active:scale-95"
              title="Actualiser"
            >
              <svg
                :class="['h-5 w-5 transition-transform', isRefreshing && 'animate-spin']"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              @click="openCreateModal"
              class="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-600 shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nouvelle campagne</span>
            </button>
          </div>
        </div>

        <!-- Stats Grid with Insights -->
        <div class="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <!-- Total Campaigns -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div class="text-3xl font-bold tabular-nums">{{ stats.totalCampaigns }}</div>
              <div class="rounded-xl bg-white/10 p-2">
                <svg class="h-5 w-5 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div class="mt-1 text-sm text-teal-100/80">Campagnes totales</div>
          </div>

          <!-- Completed -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div class="text-3xl font-bold tabular-nums">{{ stats.completedCampaigns }}</div>
              <div class="rounded-xl bg-emerald-400/20 p-2">
                <svg class="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="mt-1 text-sm text-teal-100/80">Terminees</div>
          </div>

          <!-- SMS Sent with Sparkline -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div class="text-3xl font-bold tabular-nums">{{ stats.totalMessagesSent }}</div>
              <div class="rounded-xl bg-white/10 p-1.5">
                <svg width="60" height="24" class="text-cyan-300">
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
            <div class="mt-1 text-sm text-teal-100/80">SMS envoyes</div>
          </div>

          <!-- Success Rate Ring -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-3xl font-bold tabular-nums text-emerald-300">
                  {{ stats.totalSuccess }}
                </div>
                <span v-if="stats.totalFailed > 0" class="text-sm text-rose-300">{{ stats.totalFailed }} echecs</span>
              </div>
              <div class="relative h-12 w-12">
                <svg class="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" />
                  <circle
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke="#34d399"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="`${stats.totalMessagesSent > 0 ? (stats.totalSuccess / stats.totalMessagesSent) * 88 : 0} 88`"
                    class="transition-all duration-700"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xs font-bold text-emerald-300">
                    {{ stats.totalMessagesSent > 0 ? Math.round((stats.totalSuccess / stats.totalMessagesSent) * 100) : 0 }}%
                  </span>
                </div>
              </div>
            </div>
            <div class="mt-1 text-sm text-teal-100/80">Taux de succes</div>
          </div>

          <!-- Insights Card -->
          <div class="group rounded-2xl bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-sm transition-all hover:from-white/20 hover:to-white/10 col-span-2 lg:col-span-1">
            <div class="flex items-center gap-2 mb-3">
              <svg class="h-4 w-4 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span class="text-xs font-medium uppercase tracking-wider text-teal-200">Insights</span>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-teal-100/70">Messages délivrés</span>
                <span class="font-semibold">{{ insights.monthlyReach }} clients</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-teal-100/70">Meilleur horaire</span>
                <span class="font-semibold">{{ insights.bestTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher une campagne..."
          class="w-full rounded-xl border-0 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
        />
      </div>

      <div class="flex items-center gap-3">
        <select
          v-model="statusFilter"
          class="rounded-xl border-0 bg-slate-50 py-3 pl-4 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="scheduled">Programmee</option>
          <option value="sending">En cours</option>
          <option value="completed">Terminee</option>
          <option value="failed">Echouee</option>
          <option value="cancelled">Annulee</option>
        </select>

        <div class="hidden text-sm text-slate-500 sm:block">
          {{ filteredCampaigns.length }} campagne{{ filteredCampaigns.length !== 1 ? 's' : '' }}
        </div>
      </div>
    </div>

    <!-- Loading State with Shimmer -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="n in 3" :key="n" class="skeleton-card rounded-2xl bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="space-y-3 flex-1">
            <div class="skeleton-shimmer h-6 w-48 rounded-lg"></div>
            <div class="skeleton-shimmer h-4 w-full max-w-md rounded"></div>
            <div class="flex gap-4 pt-2">
              <div class="skeleton-shimmer h-4 w-24 rounded"></div>
              <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              <div class="skeleton-shimmer h-4 w-28 rounded"></div>
            </div>
          </div>
          <div class="skeleton-shimmer h-10 w-24 rounded-xl"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-2xl bg-rose-50 p-8 text-center ring-1 ring-rose-100">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
        <svg class="h-8 w-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-rose-900">Une erreur est survenue</h3>
      <p class="mt-2 text-rose-600">{{ error }}</p>
      <button
        @click="fetchData"
        class="mt-4 rounded-xl bg-rose-500 px-6 py-2.5 font-medium text-white transition hover:bg-rose-600 active:scale-[0.98]"
      >
        Reessayer
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredCampaigns.length === 0" class="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
      <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-50 to-cyan-50">
        <svg class="h-12 w-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-slate-900">
        {{ searchQuery || statusFilter ? 'Aucun resultat' : 'Aucune campagne' }}
      </h3>
      <p class="mx-auto mt-2 max-w-sm text-slate-500">
        {{ searchQuery || statusFilter
          ? 'Essayez de modifier vos filtres de recherche'
          : 'Creez votre premiere campagne SMS pour engager vos clients'
        }}
      </p>

      <!-- Getting Started Steps -->
      <div v-if="!searchQuery && !statusFilter" class="mt-8 grid gap-4 sm:grid-cols-3 max-w-lg mx-auto">
        <div class="rounded-xl bg-slate-50 p-4 text-left">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600 font-bold text-sm">1</div>
          <div class="mt-2 font-medium text-slate-700">Creez</div>
          <div class="text-sm text-slate-500">Nouvelle campagne</div>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 text-left">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 font-bold text-sm">2</div>
          <div class="mt-2 font-medium text-slate-700">Redigez</div>
          <div class="text-sm text-slate-500">Votre message SMS</div>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 text-left">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 font-bold text-sm">3</div>
          <div class="mt-2 font-medium text-slate-700">Envoyez</div>
          <div class="text-sm text-slate-500">A vos clients</div>
        </div>
      </div>

      <button
        v-if="!searchQuery && !statusFilter"
        @click="openCreateModal"
        class="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Creer ma premiere campagne
      </button>
    </div>

    <!-- Campaigns List -->
    <div v-else class="space-y-4">
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
        <div
          v-for="(campaign, index) in filteredCampaigns"
          :key="campaign._id"
          :style="{ animationDelay: `${index * 50}ms` }"
          class="campaign-card group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200"
        >
          <!-- Status Gradient Border -->
          <div
            :class="['absolute inset-y-0 left-0 w-1 bg-gradient-to-b', statusConfig[campaign.status].gradient]"
          ></div>

          <!-- Sending progress indicator -->
          <div
            v-if="campaign.status === 'sending'"
            class="absolute inset-x-0 top-0 h-1 overflow-hidden bg-amber-100"
          >
            <div
              class="h-full animate-pulse bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"
              :style="{ width: `${(campaign.stats.sent / campaign.stats.totalRecipients) * 100}%` }"
            ></div>
          </div>

          <div class="p-6 pl-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <!-- Content -->
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-lg font-bold text-slate-900">{{ campaign.name }}</h3>
                  <span
                    :class="[
                      statusConfig[campaign.status].bg,
                      statusConfig[campaign.status].color,
                      statusConfig[campaign.status].pulse && 'animate-pulse'
                    ]"
                    class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="statusConfig[campaign.status].icon" />
                    </svg>
                    {{ statusConfig[campaign.status].label }}
                  </span>
                </div>

                <!-- Message Quote Box -->
                <div class="mt-3 relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-200 before:rounded-full">
                  <p class="line-clamp-2 text-slate-600 italic">{{ campaign.message }}</p>
                </div>

                <!-- Performance Bar (for sent campaigns) -->
                <div v-if="campaign.stats.sent > 0" class="mt-4 flex items-center gap-3">
                  <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      class="h-full bg-emerald-500 transition-all duration-500"
                      :style="{ width: `${(campaign.stats.success / campaign.stats.totalRecipients) * 100}%` }"
                    ></div>
                    <div
                      class="h-full bg-rose-400 transition-all duration-500"
                      :style="{ width: `${(campaign.stats.failed / campaign.stats.totalRecipients) * 100}%` }"
                    ></div>
                  </div>
                  <span class="text-xs font-medium text-slate-500 tabular-nums">
                    {{ campaign.stats.success }}/{{ campaign.stats.totalRecipients }}
                  </span>
                </div>

                <!-- Timeline -->
                <div class="mt-4 flex items-center gap-1">
                  <template v-for="(step, stepIndex) in getTimelineSteps(campaign)" :key="step.id">
                    <div
                      :class="[
                        'flex items-center justify-center h-5 w-5 rounded-full text-xs font-medium transition-all',
                        step.done
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      ]"
                      :title="step.label"
                    >
                      <svg v-if="step.done" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span v-else>{{ stepIndex + 1 }}</span>
                    </div>
                    <div
                      v-if="stepIndex < 3"
                      :class="[
                        'h-0.5 w-6 rounded-full transition-all',
                        step.done ? 'bg-teal-500' : 'bg-slate-200'
                      ]"
                    ></div>
                  </template>
                </div>

                <!-- Meta info -->
                <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span class="inline-flex items-center gap-1.5">
                    <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {{ campaign.stats.totalRecipients }}
                  </span>

                  <span v-if="campaign.scheduledAt && campaign.status === 'scheduled'" class="inline-flex items-center gap-1.5 text-blue-600">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatDate(campaign.scheduledAt) }}
                  </span>

                  <span class="inline-flex items-center gap-1.5 text-slate-400">
                    {{ formatRelativeTime(campaign.createdAt) }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-shrink-0 items-center gap-2">
                <!-- Primary action -->
                <button
                  v-if="campaign.status === 'draft'"
                  @click="openSendModal(campaign)"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Envoyer
                </button>

                <button
                  v-if="campaign.status === 'scheduled'"
                  @click="cancelCampaign(campaign)"
                  class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200 active:scale-[0.98]"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </button>

                <!-- Icon buttons -->
                <div class="flex items-center gap-1 rounded-xl bg-slate-50 p-1">
                  <button
                    @click="openPreviewModal(campaign)"
                    class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-teal-600 hover:shadow-sm active:scale-95"
                    title="Voir les details"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  <button
                    v-if="campaign.status === 'draft'"
                    @click="openEditModal(campaign)"
                    class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-blue-600 hover:shadow-sm active:scale-95"
                    title="Modifier"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    @click="duplicateCampaign(campaign)"
                    class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-purple-600 hover:shadow-sm active:scale-95"
                    title="Dupliquer"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  <button
                    v-if="campaign.status !== 'sending'"
                    @click="confirmDelete(campaign)"
                    class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                    title="Supprimer"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Create/Edit Modal with Templates -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeModal"></div>

            <Transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="opacity-0 scale-95 translate-y-4"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div v-if="showModal" class="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-slate-100 px-8 py-6">
                  <div>
                    <h2 class="text-2xl font-bold text-slate-900">
                      {{ editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne' }}
                    </h2>
                    <p class="mt-1 text-slate-500">
                      {{ editingCampaign ? 'Modifiez les details de votre campagne' : 'Creez une campagne SMS pour vos clients' }}
                    </p>
                  </div>
                  <button
                    @click="closeModal"
                    class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form @submit.prevent="handleSubmit" class="p-8">
                  <!-- Message Templates -->
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-slate-700 mb-3">Modeles de messages</label>
                    <div class="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                      <button
                        v-for="template in messageTemplates"
                        :key="template.id"
                        type="button"
                        @click="selectTemplate(template)"
                        :class="[
                          'flex-shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95',
                          selectedTemplate === template.id
                            ? 'bg-teal-500 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        ]"
                      >
                        <span class="text-lg">{{ template.icon }}</span>
                        <span>{{ template.label }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="grid gap-6 lg:grid-cols-2">
                    <!-- Form Fields -->
                    <div class="space-y-6">
                      <div>
                        <label class="block text-sm font-medium text-slate-700">Nom de la campagne</label>
                        <input
                          v-model="formData.name"
                          type="text"
                          required
                          maxlength="100"
                          placeholder="Ex: Promo de Noel"
                          class="mt-2 w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>

                      <div>
                        <div class="flex items-center justify-between mb-2">
                          <label class="block text-sm font-medium text-slate-700">Message SMS</label>
                          <div class="flex items-center gap-3">
                            <!-- SMS Segment indicator -->
                            <div v-if="messageLength > 0" class="flex items-center gap-1.5 text-xs">
                              <span class="text-slate-400">SMS:</span>
                              <span :class="smsSegments > 1 ? 'text-amber-600 font-semibold' : 'text-slate-600'">
                                {{ smsSegments }}
                              </span>
                            </div>
                            <!-- Character ring -->
                            <div class="flex items-center gap-2">
                              <svg class="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" stroke-width="3" />
                                <circle
                                  cx="18" cy="18" r="15"
                                  fill="none"
                                  :stroke="charPercentage > 90 ? '#f43f5e' : charPercentage > 70 ? '#f59e0b' : '#14b8a6'"
                                  stroke-width="3"
                                  stroke-linecap="round"
                                  :stroke-dasharray="`${charPercentage * 0.94} 100`"
                                  class="transition-all duration-300"
                                />
                              </svg>
                              <span
                                :class="[
                                  'text-sm font-medium tabular-nums',
                                  messageCharsRemaining < 20 ? 'text-rose-500' : messageCharsRemaining < 50 ? 'text-amber-500' : 'text-slate-500'
                                ]"
                              >
                                {{ messageCharsRemaining }}
                              </span>
                            </div>
                          </div>
                        </div>

                        <!-- Personalization Tokens -->
                        <div class="flex flex-wrap gap-2 mb-2">
                          <button
                            v-for="token in personalizationTokens"
                            :key="token.token"
                            type="button"
                            @click="insertToken(token.token)"
                            class="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100 transition-colors"
                          >
                            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            {{ token.label }}
                          </button>
                        </div>

                        <textarea
                          ref="messageTextareaRef"
                          v-model="formData.message"
                          required
                          maxlength="320"
                          rows="5"
                          placeholder="Ex: Beneficiez de 20% de reduction ce week-end!"
                          class="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        ></textarea>

                        <!-- Emoji Warning -->
                        <div v-if="hasEmoji" class="mt-2 flex items-center gap-2 text-xs text-amber-600">
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Les emojis reduisent la limite a 70 caracteres/SMS
                        </div>
                      </div>
                    </div>

                    <!-- Phone Preview -->
                    <div class="flex items-center justify-center">
                      <div class="relative">
                        <!-- Phone frame -->
                        <div class="phone-frame relative h-[440px] w-[220px] rounded-[40px] bg-slate-900 p-2.5 shadow-2xl">
                          <!-- Screen -->
                          <div class="h-full overflow-hidden rounded-[32px] bg-slate-100">
                            <!-- Status bar -->
                            <div class="flex items-center justify-between bg-slate-200/80 px-5 py-2.5">
                              <span class="text-xs font-semibold text-slate-700">9:41</span>
                              <div class="flex items-center gap-1.5">
                                <svg class="h-3 w-3 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/>
                                </svg>
                                <div class="h-2.5 w-5 rounded-sm bg-slate-600"></div>
                              </div>
                            </div>

                            <!-- Message header -->
                            <div class="border-b border-slate-200 bg-white px-4 py-3">
                              <div class="flex items-center gap-3">
                                <div class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-md">
                                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                </div>
                                <div>
                                  <div class="text-sm font-semibold text-slate-900">Le Gourmet</div>
                                  <div class="text-xs text-slate-500">SMS</div>
                                </div>
                              </div>
                            </div>

                            <!-- Messages area -->
                            <div class="flex-1 overflow-y-auto p-4">
                              <Transition
                                enter-active-class="transition-all duration-300 ease-out"
                                enter-from-class="opacity-0 translate-y-2 scale-95"
                                enter-to-class="opacity-100 translate-y-0 scale-100"
                              >
                                <div v-if="previewMessage" class="max-w-[90%]">
                                  <div class="message-bubble rounded-2xl rounded-tl-md bg-slate-200 px-4 py-3 shadow-sm">
                                    <p class="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">{{ previewMessage }}</p>
                                  </div>
                                  <div class="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                                    <span>Maintenant</span>
                                    <svg class="h-3.5 w-3.5 text-blue-500 delivered-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              </Transition>
                              <div v-if="!previewMessage" class="flex h-32 items-center justify-center text-center text-sm text-slate-400">
                                <div>
                                  <svg class="h-8 w-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  <p>Tapez votre message</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- Notch -->
                          <div class="absolute left-1/2 top-4 h-7 w-24 -translate-x-1/2 rounded-full bg-slate-900"></div>
                          <!-- Side button -->
                          <div class="absolute -right-0.5 top-24 h-8 w-1 rounded-l-sm bg-slate-700"></div>
                          <div class="absolute -left-0.5 top-20 h-6 w-1 rounded-r-sm bg-slate-700"></div>
                          <div class="absolute -left-0.5 top-32 h-10 w-1 rounded-r-sm bg-slate-700"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                    <button
                      type="button"
                      @click="closeModal"
                      class="rounded-xl px-6 py-3 font-medium text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      :disabled="isSubmitting || !formData.name.trim() || !formData.message.trim()"
                      class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                    >
                      <svg v-if="isSubmitting" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {{ isSubmitting ? 'Enregistrement...' : (editingCampaign ? 'Enregistrer' : 'Creer la campagne') }}
                    </button>
                  </div>
                </form>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Send Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showSendModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeSendModal"></div>

            <div class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
              <div class="text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-cyan-100">
                  <svg class="h-8 w-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h2 class="mt-4 text-xl font-bold text-slate-900">Envoyer la campagne</h2>
                <p class="mt-2 text-slate-500">{{ campaignToSend?.name }}</p>
              </div>

              <div class="mt-6 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 p-4 text-center">
                <div class="text-3xl font-bold text-teal-700">{{ campaignToSend?.stats.totalRecipients }}</div>
                <div class="mt-1 text-sm text-teal-600">client{{ (campaignToSend?.stats.totalRecipients ?? 0) !== 1 ? 's' : '' }} recevront ce SMS</div>
              </div>

              <div class="mt-6 space-y-3">
                <label
                  class="flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all"
                  :class="sendOptions.sendNow ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'"
                >
                  <input
                    v-model="sendOptions.sendNow"
                    type="radio"
                    :value="true"
                    class="h-5 w-5 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <div class="font-medium text-slate-900">Envoyer maintenant</div>
                    <div class="text-sm text-slate-500">Les SMS seront envoyes immediatement</div>
                  </div>
                </label>

                <label
                  class="flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all"
                  :class="!sendOptions.sendNow ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'"
                >
                  <input
                    v-model="sendOptions.sendNow"
                    type="radio"
                    :value="false"
                    class="h-5 w-5 text-teal-600 focus:ring-teal-500"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-slate-900">Programmer l'envoi</div>
                    <div class="text-sm text-slate-500">Choisissez une date et heure</div>
                  </div>
                </label>

                <Transition
                  enter-active-class="transition-all duration-200 ease-out"
                  enter-from-class="opacity-0 -translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition-all duration-150 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <div v-if="!sendOptions.sendNow" class="pl-9">
                    <input
                      v-model="sendOptions.scheduledAt"
                      type="datetime-local"
                      required
                      class="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </Transition>
              </div>

              <div class="mt-8 flex gap-3">
                <button
                  @click="closeSendModal"
                  class="flex-1 rounded-xl px-6 py-3 font-medium text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  @click="sendCampaign"
                  :disabled="isSubmitting || (!sendOptions.sendNow && !sendOptions.scheduledAt)"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 active:scale-[0.98]"
                >
                  <svg v-if="isSubmitting" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ isSubmitting ? 'Envoi...' : (sendOptions.sendNow ? 'Envoyer' : 'Programmer') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeDeleteModal"></div>

            <div class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
              <div class="text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                  <svg class="h-8 w-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h2 class="mt-4 text-xl font-bold text-slate-900">Supprimer la campagne</h2>
                <p class="mt-2 text-slate-500">
                  Etes-vous sur de vouloir supprimer<br>
                  <span class="font-medium text-slate-700">"{{ campaignToDelete?.name }}"</span> ?
                </p>
                <p class="mt-2 text-sm text-rose-500">Cette action est irreversible.</p>
              </div>

              <div class="mt-8 flex gap-3">
                <button
                  @click="closeDeleteModal"
                  class="flex-1 rounded-xl px-6 py-3 font-medium text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  @click="deleteCampaign"
                  :disabled="isSubmitting"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-rose-600 disabled:opacity-50 active:scale-[0.98]"
                >
                  <svg v-if="isSubmitting" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ isSubmitting ? 'Suppression...' : 'Supprimer' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Preview Modal with Phone Mockup -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showPreviewModal && previewCampaign" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closePreviewModal"></div>

            <div class="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
              <!-- Header -->
              <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xl">
                <div class="flex items-center gap-3">
                  <h2 class="text-xl font-bold text-slate-900">{{ previewCampaign.name }}</h2>
                  <span
                    :class="[statusConfig[previewCampaign.status].bg, statusConfig[previewCampaign.status].color]"
                    class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {{ statusConfig[previewCampaign.status].label }}
                  </span>
                </div>
                <button
                  @click="closePreviewModal"
                  class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="overflow-y-auto p-6 max-h-[calc(90vh-140px)]">
                <div class="grid gap-6 lg:grid-cols-2">
                  <!-- Phone Preview -->
                  <div class="flex justify-center">
                    <div class="phone-frame relative h-[360px] w-[180px] rounded-[32px] bg-slate-900 p-2 shadow-xl">
                      <div class="h-full overflow-hidden rounded-[24px] bg-slate-100">
                        <div class="flex items-center justify-between bg-slate-200/80 px-4 py-2">
                          <span class="text-[10px] font-semibold text-slate-700">9:41</span>
                          <div class="h-2 w-4 rounded-sm bg-slate-600"></div>
                        </div>
                        <div class="border-b border-slate-200 bg-white px-3 py-2">
                          <div class="flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white">
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div class="text-xs font-semibold text-slate-900">Restaurant</div>
                          </div>
                        </div>
                        <div class="p-3">
                          <div class="max-w-[95%]">
                            <div class="rounded-xl rounded-tl-sm bg-slate-200 px-3 py-2">
                              <p class="text-xs text-slate-800 leading-relaxed">{{ previewCampaign.message }}</p>
                            </div>
                            <div class="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                              <span>{{ formatDate(previewCampaign.createdAt) }}</span>
                              <svg v-if="previewCampaign.status === 'completed'" class="h-3 w-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="absolute left-1/2 top-3 h-5 w-16 -translate-x-1/2 rounded-full bg-slate-900"></div>
                    </div>
                  </div>

                  <!-- Stats & Details -->
                  <div class="space-y-4">
                    <!-- Stats Grid -->
                    <div class="grid grid-cols-2 gap-3">
                      <div class="rounded-xl bg-slate-50 p-3">
                        <div class="text-xs font-medium uppercase tracking-wider text-slate-400">Destinataires</div>
                        <div class="mt-1 text-xl font-bold text-slate-900">{{ previewCampaign.stats.totalRecipients }}</div>
                      </div>
                      <div class="rounded-xl bg-emerald-50 p-3">
                        <div class="text-xs font-medium uppercase tracking-wider text-emerald-600">Succes</div>
                        <div class="mt-1 text-xl font-bold text-emerald-600">{{ previewCampaign.stats.success }}</div>
                      </div>
                      <div class="rounded-xl bg-rose-50 p-3">
                        <div class="text-xs font-medium uppercase tracking-wider text-rose-600">Echecs</div>
                        <div class="mt-1 text-xl font-bold text-rose-600">{{ previewCampaign.stats.failed }}</div>
                      </div>
                      <div class="rounded-xl bg-amber-50 p-3">
                        <div class="text-xs font-medium uppercase tracking-wider text-amber-600">En attente</div>
                        <div class="mt-1 text-xl font-bold text-amber-600">
                          {{ previewCampaign.stats.totalRecipients - previewCampaign.stats.sent }}
                        </div>
                      </div>
                    </div>

                    <!-- Progress bar -->
                    <div v-if="previewCampaign.stats.sent > 0" class="space-y-2">
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-slate-600">Progression</span>
                        <span class="font-medium text-slate-900">
                          {{ Math.round((previewCampaign.stats.sent / previewCampaign.stats.totalRecipients) * 100) }}%
                        </span>
                      </div>
                      <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          class="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                          :style="{ width: `${(previewCampaign.stats.sent / previewCampaign.stats.totalRecipients) * 100}%` }"
                        ></div>
                      </div>
                    </div>

                    <!-- Delivery Timeline -->
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium text-slate-700">Timeline</h4>
                      <div class="relative pl-6 space-y-3">
                        <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200"></div>

                        <div class="relative flex items-center gap-3">
                          <div class="absolute left-[-16px] h-4 w-4 rounded-full bg-teal-500 ring-4 ring-white"></div>
                          <div class="text-sm">
                            <span class="text-slate-500">Creee</span>
                            <span class="ml-2 text-slate-700">{{ formatDate(previewCampaign.createdAt) }}</span>
                          </div>
                        </div>

                        <div v-if="previewCampaign.scheduledAt" class="relative flex items-center gap-3">
                          <div :class="['absolute left-[-16px] h-4 w-4 rounded-full ring-4 ring-white', previewCampaign.status !== 'draft' ? 'bg-blue-500' : 'bg-slate-300']"></div>
                          <div class="text-sm">
                            <span class="text-slate-500">Programmee</span>
                            <span class="ml-2 text-slate-700">{{ formatDate(previewCampaign.scheduledAt) }}</span>
                          </div>
                        </div>

                        <div v-if="previewCampaign.startedAt" class="relative flex items-center gap-3">
                          <div class="absolute left-[-16px] h-4 w-4 rounded-full bg-amber-500 ring-4 ring-white"></div>
                          <div class="text-sm">
                            <span class="text-slate-500">Debut d'envoi</span>
                            <span class="ml-2 text-slate-700">{{ formatDate(previewCampaign.startedAt) }}</span>
                          </div>
                        </div>

                        <div v-if="previewCampaign.completedAt" class="relative flex items-center gap-3">
                          <div class="absolute left-[-16px] h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                          <div class="text-sm">
                            <span class="text-slate-500">Terminee</span>
                            <span class="ml-2 text-slate-700">{{ formatDate(previewCampaign.completedAt) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Recipients list -->
                <div v-if="previewCampaign.recipients && previewCampaign.recipients.length > 0" class="mt-6">
                  <div class="mb-3 flex items-center justify-between">
                    <h3 class="font-medium text-slate-900">Destinataires</h3>
                    <span class="text-sm text-slate-500">{{ previewCampaign.recipients.length }} contact{{ previewCampaign.recipients.length !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                    <div
                      v-for="(recipient, index) in previewCampaign.recipients"
                      :key="index"
                      class="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <span class="font-mono text-sm text-slate-600">{{ recipient.phone }}</span>
                      <span
                        :class="{
                          'bg-emerald-100 text-emerald-700': recipient.status === 'sent',
                          'bg-rose-100 text-rose-700': recipient.status === 'failed',
                          'bg-slate-100 text-slate-500': recipient.status === 'pending'
                        }"
                        class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      >
                        {{ recipient.status === 'sent' ? 'Envoye' : recipient.status === 'failed' ? 'Echec' : 'En attente' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="sticky bottom-0 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xl">
                <button
                  @click="closePreviewModal"
                  class="w-full rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Animated Mesh Gradient Background */
.hero-section {
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0d9488 100%);
  position: relative;
}

.mesh-gradient {
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(6, 182, 212, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse 60% 50% at 80% 20%, rgba(20, 184, 166, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse 50% 80% at 60% 80%, rgba(16, 185, 129, 0.35) 0%, transparent 50%),
    linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0d9488 100%);
  animation: meshMove 20s ease-in-out infinite;
}

@keyframes meshMove {
  0%, 100% {
    background-position: 0% 0%, 100% 0%, 50% 100%, 0% 0%;
  }
  25% {
    background-position: 20% 20%, 80% 30%, 40% 80%, 0% 0%;
  }
  50% {
    background-position: 40% 10%, 60% 50%, 60% 70%, 0% 0%;
  }
  75% {
    background-position: 10% 30%, 90% 20%, 30% 90%, 0% 0%;
  }
}

/* Floating Orbs Animation */
.floating-orb {
  animation: floatOrb 8s ease-in-out infinite;
}

.floating-orb-delayed {
  animation: floatOrb 10s ease-in-out infinite;
  animation-delay: -3s;
}

.floating-orb-slow {
  animation: floatOrb 12s ease-in-out infinite;
  animation-delay: -6s;
}

@keyframes floatOrb {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(10px, -15px) scale(1.05);
  }
  66% {
    transform: translate(-5px, 10px) scale(0.95);
  }
}

/* Sparkline Animation */
.sparkline-path {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: drawSparkline 1.5s ease-out forwards;
}

@keyframes drawSparkline {
  to {
    stroke-dashoffset: 0;
  }
}

/* Skeleton Shimmer */
.skeleton-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Phone Frame Glow */
.phone-frame {
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

/* Message Bubble Animation */
.message-bubble {
  animation: bubbleAppear 0.3s ease-out;
}

@keyframes bubbleAppear {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Delivered Check Animation */
.delivered-check {
  animation: checkAppear 0.4s ease-out 0.3s both;
}

@keyframes checkAppear {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Campaign Card Hover Effect */
.campaign-card {
  transition: all 0.2s ease;
}

.campaign-card:hover {
  transform: translateY(-2px);
}

/* Scrollbar Hide for Templates */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
