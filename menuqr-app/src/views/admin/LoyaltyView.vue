<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/services/api';
import type { LoyaltyStats, CustomerWithLoyalty, LoyaltyTier } from '@/types/loyalty';
import { TIER_CONFIG } from '@/types/loyalty';

const loading = ref(true);
const isRefreshing = ref(false);
const error = ref<string | null>(null);
const stats = ref<LoyaltyStats | null>(null);
const customers = ref<CustomerWithLoyalty[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });
const search = ref('');
const selectedTier = ref<string>('');
const sortBy = ref('totalPoints');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Modal states
const showAdjustModal = ref(false);
const showBonusModal = ref(false);
const selectedCustomer = ref<CustomerWithLoyalty | null>(null);
const adjustPoints = ref(0);
const adjustReason = ref('');
const bonusPoints = ref(100);
const bonusDescription = ref('');
const actionLoading = ref(false);
const actionError = ref<string | null>(null);

// Toast
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { message, type };
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.value = null; }, 4000);
};

const tierOptions = [
  { value: '', label: 'Tous les paliers' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'argent', label: 'Argent' },
  { value: 'or', label: 'Or' },
  { value: 'platine', label: 'Platine' },
];

// Tier visual config
const tierVisuals: Record<string, { gradient: string; icon: string; benefits: string[] }> = {
  bronze: {
    gradient: 'from-amber-600 to-amber-800',
    icon: '🥉',
    benefits: ['1 point / 100 FCFA', 'Offres exclusives'],
  },
  argent: {
    gradient: 'from-slate-400 to-slate-600',
    icon: '🥈',
    benefits: ['1.5x points', '-5% sur commandes', 'Accès prioritaire'],
  },
  or: {
    gradient: 'from-yellow-400 to-amber-500',
    icon: '🥇',
    benefits: ['2x points', '-10% sur commandes', 'Livraison gratuite'],
  },
  platine: {
    gradient: 'from-purple-400 via-pink-400 to-purple-600',
    icon: '💎',
    benefits: ['3x points', '-15% sur commandes', 'VIP events', 'Cadeaux exclusifs'],
  },
};

const totalActivePoints = computed(() => {
  if (!stats.value) return 0;
  return stats.value.totalPointsIssued + stats.value.totalBonusPoints -
         stats.value.totalPointsRedeemed - stats.value.totalPointsExpired;
});

const tierDistributionPercentages = computed(() => {
  if (!stats.value || stats.value.totalActiveMembers === 0) return {};
  const result: Record<string, number> = {};
  for (const tier of Object.keys(TIER_CONFIG)) {
    result[tier] = (stats.value.tierDistribution[tier as LoyaltyTier] / stats.value.totalActiveMembers) * 100;
  }
  return result;
});

async function fetchStats() {
  try {
    const response = await api.getLoyaltyStats();
    if (response.success && response.data) {
      stats.value = response.data;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

async function fetchCustomers() {
  try {
    loading.value = true;
    const response = await api.getLoyaltyCustomers({
      page: pagination.value.page,
      limit: pagination.value.limit,
      tier: selectedTier.value || undefined,
      search: search.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    if (response.success && response.data) {
      customers.value = response.data.customers;
      pagination.value = response.data.pagination;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
}

async function refreshData() {
  isRefreshing.value = true;
  await Promise.all([fetchStats(), fetchCustomers()]);
  isRefreshing.value = false;
}

function handleSearch() {
  pagination.value.page = 1;
  fetchCustomers();
}

function handleTierChange() {
  pagination.value.page = 1;
  fetchCustomers();
}

function handleSort(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = field;
    sortOrder.value = 'desc';
  }
  fetchCustomers();
}

function openAdjustModal(customer: CustomerWithLoyalty) {
  selectedCustomer.value = customer;
  adjustPoints.value = 0;
  adjustReason.value = '';
  actionError.value = null;
  showAdjustModal.value = true;
}

function openBonusModal(customer: CustomerWithLoyalty) {
  selectedCustomer.value = customer;
  bonusPoints.value = 100;
  bonusDescription.value = '';
  actionError.value = null;
  showBonusModal.value = true;
}

async function handleAdjust() {
  if (!selectedCustomer.value || adjustPoints.value === 0 || !adjustReason.value.trim()) {
    actionError.value = 'Veuillez remplir tous les champs';
    return;
  }

  try {
    actionLoading.value = true;
    actionError.value = null;
    await api.adjustCustomerPoints(selectedCustomer.value._id, adjustPoints.value, adjustReason.value);
    showAdjustModal.value = false;
    showToast('Points ajustes avec succes');
    fetchCustomers();
    fetchStats();
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Erreur';
  } finally {
    actionLoading.value = false;
  }
}

async function handleBonus() {
  if (!selectedCustomer.value || bonusPoints.value <= 0 || !bonusDescription.value.trim()) {
    actionError.value = 'Veuillez remplir tous les champs';
    return;
  }

  try {
    actionLoading.value = true;
    actionError.value = null;
    await api.addCustomerBonusPoints(selectedCustomer.value._id, bonusPoints.value, bonusDescription.value);
    showBonusModal.value = false;
    showToast('Points bonus ajoutes');
    fetchCustomers();
    fetchStats();
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Erreur';
  } finally {
    actionLoading.value = false;
  }
}

function getTierColor(tier: LoyaltyTier) {
  return TIER_CONFIG[tier]?.color || '#CD7F32';
}

function getTierName(tier: LoyaltyTier) {
  return TIER_CONFIG[tier]?.name || 'Bronze';
}

function formatNumber(num: number) {
  return num.toLocaleString('fr-FR');
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name?: string) {
  if (!name) return 'bg-slate-400';
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500',
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500', 'bg-emerald-500', 'bg-green-500', 'bg-lime-500',
    'bg-yellow-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

onMounted(() => {
  fetchStats();
  fetchCustomers();
});
</script>

<template>
  <div class="min-h-screen space-y-6">
    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition ease-out duration-300 transform"
      enter-from-class="opacity-0 -translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-200 transform"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-4 scale-95"
    >
      <div v-if="toast" class="fixed left-1/2 top-6 z-[100] -translate-x-1/2">
        <div
          :class="[
            'flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-xl',
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
          ]"
        >
          <div class="rounded-full p-1 bg-white/20">
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

    <!-- Hero Header -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 text-white shadow-xl">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="loyalty-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loyalty-grid)" />
        </svg>
      </div>

      <!-- Floating elements -->
      <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
      <div class="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl"></div>
      <div class="absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-rose-300/20 blur-2xl"></div>

      <div class="relative">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-2xl">
                🏆
              </div>
              <div>
                <h1 class="text-2xl font-bold tracking-tight lg:text-3xl">Programme Fidelite</h1>
                <p class="mt-1 text-amber-100">Recompensez vos clients les plus fideles</p>
              </div>
            </div>
          </div>

          <button
            @click="refreshData"
            :disabled="isRefreshing"
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50"
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
        </div>

        <!-- Stats Grid -->
        <div v-if="stats" class="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div class="text-3xl font-bold tabular-nums">{{ formatNumber(stats.totalActiveMembers) }}</div>
              <div class="rounded-xl bg-white/10 p-2">
                <svg class="h-5 w-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div class="mt-1 text-sm text-amber-100">Membres actifs</div>
          </div>

          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div class="text-3xl font-bold tabular-nums">{{ formatNumber(totalActivePoints) }}</div>
              <div class="rounded-xl bg-yellow-400/20 p-2">
                <svg class="h-5 w-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
            <div class="mt-1 text-sm text-amber-100">Points en circulation</div>
          </div>

          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div class="text-3xl font-bold tabular-nums text-emerald-300">{{ formatNumber(stats.totalPointsIssued) }}</div>
              <div class="rounded-xl bg-emerald-400/20 p-2">
                <svg class="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div class="mt-1 text-sm text-amber-100">Points distribues</div>
          </div>

          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/15">
            <div class="flex items-center justify-between">
              <div class="text-3xl font-bold tabular-nums text-rose-300">{{ formatNumber(stats.totalPointsRedeemed) }}</div>
              <div class="rounded-xl bg-rose-400/20 p-2">
                <svg class="h-5 w-5 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>
            <div class="mt-1 text-sm text-amber-100">Points echanges</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tier Cards Section -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">Paliers et Avantages</h2>
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="(config, tier) in TIER_CONFIG"
          :key="tier"
          class="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-slate-200"
        >
          <!-- Gradient accent -->
          <div
            :class="['absolute inset-x-0 top-0 h-1', `bg-gradient-to-r ${tierVisuals[tier]?.gradient}`]"
          ></div>

          <!-- Icon and Count -->
          <div class="flex items-center justify-between">
            <div class="text-3xl">{{ tierVisuals[tier]?.icon }}</div>
            <div
              v-if="stats"
              class="text-2xl font-bold tabular-nums"
              :style="{ color: config.color }"
            >
              {{ stats.tierDistribution[tier as LoyaltyTier] || 0 }}
            </div>
          </div>

          <!-- Name -->
          <h3
            class="mt-3 text-lg font-semibold"
            :style="{ color: config.color }"
          >
            {{ config.name }}
          </h3>

          <!-- Requirements -->
          <p class="mt-1 text-xs text-slate-500">
            {{ formatNumber(config.minPoints) }}+ points
          </p>

          <!-- Benefits -->
          <ul class="mt-3 space-y-1">
            <li
              v-for="(benefit, idx) in tierVisuals[tier]?.benefits"
              :key="idx"
              class="flex items-center gap-2 text-xs text-slate-600"
            >
              <svg class="h-3 w-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              {{ benefit }}
            </li>
          </ul>

          <!-- Progress bar -->
          <div
            v-if="stats && stats.totalActiveMembers > 0"
            class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :style="{
                width: `${tierDistributionPercentages[tier] || 0}%`,
                backgroundColor: config.color,
              }"
            ></div>
          </div>
          <p
            v-if="stats && stats.totalActiveMembers > 0"
            class="mt-1 text-right text-xs text-slate-400"
          >
            {{ tierDistributionPercentages[tier]?.toFixed(1) || 0 }}%
          </p>
        </div>
      </div>
    </div>

    <!-- Tier Distribution Bar -->
    <div v-if="stats" class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-slate-900">Repartition des membres</h3>
        <span class="text-sm text-slate-500">{{ formatNumber(stats.totalActiveMembers) }} membres</span>
      </div>

      <div class="flex h-8 overflow-hidden rounded-xl">
        <div
          v-for="(config, tier) in TIER_CONFIG"
          :key="tier"
          class="relative flex items-center justify-center transition-all duration-700 hover:opacity-90"
          :style="{
            width: `${tierDistributionPercentages[tier] || 25}%`,
            backgroundColor: config.color,
            minWidth: stats.tierDistribution[tier as LoyaltyTier] > 0 ? '3rem' : '0',
          }"
          :title="`${config.name}: ${stats.tierDistribution[tier as LoyaltyTier]} membres`"
        >
          <span
            v-if="stats.tierDistribution[tier as LoyaltyTier] > 0"
            class="text-sm font-semibold text-white drop-shadow"
          >
            {{ stats.tierDistribution[tier as LoyaltyTier] }}
          </span>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 flex flex-wrap items-center gap-4">
        <div
          v-for="(config, tier) in TIER_CONFIG"
          :key="tier"
          class="flex items-center gap-2"
        >
          <div
            class="h-3 w-3 rounded-full"
            :style="{ backgroundColor: config.color }"
          ></div>
          <span class="text-sm text-slate-600">{{ config.name }}</span>
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
          v-model="search"
          type="text"
          placeholder="Rechercher un client..."
          class="w-full rounded-xl border-0 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500"
          @keyup.enter="handleSearch"
        />
      </div>

      <div class="flex items-center gap-3">
        <select
          v-model="selectedTier"
          class="rounded-xl border-0 bg-slate-50 py-3 pl-4 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500"
          @change="handleTierChange"
        >
          <option v-for="opt in tierOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <button
          @click="handleSearch"
          class="rounded-xl bg-amber-500 px-4 py-3 font-medium text-white transition-all hover:bg-amber-600"
        >
          Rechercher
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-16 w-16 rounded-full border-4 border-amber-100"></div>
        <div class="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
      <p class="mt-4 text-slate-500">Chargement des clients...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-2xl bg-rose-50 p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
        <svg class="h-8 w-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-rose-600">{{ error }}</p>
      <button
        @click="fetchCustomers"
        class="mt-4 rounded-xl bg-rose-500 px-6 py-2 text-white transition hover:bg-rose-600"
      >
        Reessayer
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="customers.length === 0" class="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
      <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-50">
        <span class="text-5xl">👥</span>
      </div>
      <h3 class="text-xl font-semibold text-slate-900">Aucun client trouve</h3>
      <p class="mx-auto mt-2 max-w-sm text-slate-500">
        {{ search || selectedTier ? 'Essayez de modifier vos filtres' : 'Les clients apparaitront ici une fois inscrits au programme' }}
      </p>
    </div>

    <!-- Customers Table -->
    <div v-else class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/50">
              <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Client
              </th>
              <th
                class="cursor-pointer px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
                @click="handleSort('totalPoints')"
              >
                <span class="flex items-center gap-1">
                  Points
                  <svg v-if="sortBy === 'totalPoints'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortOrder === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'" />
                  </svg>
                </span>
              </th>
              <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Palier
              </th>
              <th
                class="cursor-pointer px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
                @click="handleSort('lastOrderAt')"
              >
                <span class="flex items-center gap-1">
                  Derniere commande
                  <svg v-if="sortBy === 'lastOrderAt'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortOrder === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'" />
                  </svg>
                </span>
              </th>
              <th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total depense
              </th>
              <th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="customer in customers"
              :key="customer._id"
              class="group transition-colors hover:bg-slate-50/50"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white',
                      getAvatarColor(customer.name)
                    ]"
                  >
                    {{ getInitials(customer.name) }}
                  </div>
                  <div>
                    <div class="font-medium text-slate-900">{{ customer.name || 'Client' }}</div>
                    <div class="text-sm text-slate-500">{{ customer.phone }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <svg class="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span class="font-semibold text-slate-900 tabular-nums">
                    {{ formatNumber(customer.loyalty?.totalPoints || 0) }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                  :style="{ backgroundColor: getTierColor(customer.loyalty?.currentTier || 'bronze') }"
                >
                  <span>{{ tierVisuals[customer.loyalty?.currentTier || 'bronze']?.icon }}</span>
                  {{ getTierName(customer.loyalty?.currentTier || 'bronze') }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-slate-600">
                {{ formatDate(customer.lastOrderAt) }}
              </td>
              <td class="px-6 py-4 text-sm font-medium text-slate-900 tabular-nums">
                {{ formatNumber(customer.totalSpent) }} FCFA
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="openAdjustModal(customer)"
                    class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="Ajuster les points"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </button>
                  <button
                    @click="openBonusModal(customer)"
                    class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                    title="Ajouter des points bonus"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <p class="text-sm text-slate-500">
          Page {{ pagination.page }} sur {{ pagination.pages }} ({{ pagination.total }} clients)
        </p>
        <div class="flex items-center gap-2">
          <button
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchCustomers()"
            class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            :disabled="pagination.page >= pagination.pages"
            @click="pagination.page++; fetchCustomers()"
            class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Adjust Points Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showAdjustModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAdjustModal = false"></div>

            <div class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
              <div class="text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                  <svg class="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h2 class="mt-4 text-xl font-bold text-slate-900">Ajuster les points</h2>
                <p class="mt-2 text-slate-500">{{ selectedCustomer?.name || selectedCustomer?.phone }}</p>
              </div>

              <div class="mt-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700">Points (+/-)</label>
                  <input
                    v-model.number="adjustPoints"
                    type="number"
                    placeholder="Ex: 500 ou -200"
                    class="mt-2 w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700">Raison</label>
                  <input
                    v-model="adjustReason"
                    type="text"
                    placeholder="Ex: Correction erreur commande"
                    class="mt-2 w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <p v-if="actionError" class="text-sm text-rose-600">{{ actionError }}</p>
              </div>

              <div class="mt-8 flex gap-3">
                <button
                  @click="showAdjustModal = false"
                  class="flex-1 rounded-xl px-6 py-3 font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  @click="handleAdjust"
                  :disabled="actionLoading || adjustPoints === 0 || !adjustReason.trim()"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                >
                  <svg v-if="actionLoading" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ actionLoading ? 'En cours...' : 'Confirmer' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Bonus Points Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showBonusModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showBonusModal = false"></div>

            <div class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
              <div class="text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                  <svg class="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h2 class="mt-4 text-xl font-bold text-slate-900">Ajouter des points bonus</h2>
                <p class="mt-2 text-slate-500">{{ selectedCustomer?.name || selectedCustomer?.phone }}</p>
              </div>

              <div class="mt-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700">Points bonus</label>
                  <input
                    v-model.number="bonusPoints"
                    type="number"
                    min="1"
                    placeholder="Ex: 500"
                    class="mt-2 w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700">Description</label>
                  <input
                    v-model="bonusDescription"
                    type="text"
                    placeholder="Ex: Bonus fidelite anniversaire"
                    class="mt-2 w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <p v-if="actionError" class="text-sm text-rose-600">{{ actionError }}</p>
              </div>

              <div class="mt-8 flex gap-3">
                <button
                  @click="showBonusModal = false"
                  class="flex-1 rounded-xl px-6 py-3 font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  @click="handleBonus"
                  :disabled="actionLoading || bonusPoints <= 0 || !bonusDescription.trim()"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                >
                  <svg v-if="actionLoading" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ actionLoading ? 'En cours...' : 'Ajouter' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
