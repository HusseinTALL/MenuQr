<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';

interface GracePeriod {
  reason: 'payment_failed' | 'downgrade' | 'trial_ended';
  startedAt: string;
  endsAt: string;
  daysRemaining: number;
  notificationsSent: number;
}

defineEmits<{
  (e: 'update-payment'): void;
  (e: 'loaded', data: GracePeriod | null): void;
}>();

const gracePeriod = ref<GracePeriod | null>(null);
const loading = ref(true);

const bannerTitle = computed(() => {
  if (!gracePeriod.value) {return '';}
  switch (gracePeriod.value.reason) {
    case 'payment_failed':
      return 'Paiement echoue - Action requise';
    case 'downgrade':
      return 'Periode de transition en cours';
    case 'trial_ended':
      return 'Periode d\'essai terminee';
    default:
      return 'Periode de grace active';
  }
});

const bannerDescription = computed(() => {
  if (!gracePeriod.value) {return '';}
  switch (gracePeriod.value.reason) {
    case 'payment_failed':
      return 'Votre dernier paiement a echoue. Veuillez mettre a jour vos informations de paiement pour eviter la suspension de votre compte.';
    case 'downgrade':
      return 'Votre forfait est en cours de transition. Certaines fonctionnalites peuvent etre limitees pendant cette periode.';
    case 'trial_ended':
      return 'Votre periode d\'essai est terminee. Passez a un forfait payant pour continuer a utiliser toutes les fonctionnalites.';
    default:
      return 'Votre compte est en periode de grace. Veuillez regulariser votre situation.';
  }
});

const progressWidth = computed(() => {
  if (!gracePeriod.value) {return '100%';}
  // Assuming 7 days grace period by default
  const totalDays = 7;
  const remaining = gracePeriod.value.daysRemaining;
  const elapsed = totalDays - remaining;
  const percentage = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
  return `${percentage}%`;
});

async function loadGracePeriodStatus() {
  loading.value = true;
  try {
    const response = await api.getGracePeriodStatus();
    if (response.data?.inGracePeriod && response.data.gracePeriod) {
      gracePeriod.value = response.data.gracePeriod;
    } else {
      gracePeriod.value = null;
    }
  } catch (error) {
    console.error('Failed to load grace period status:', error);
    gracePeriod.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadGracePeriodStatus();
});

defineExpose({ refresh: loadGracePeriodStatus });
</script>

<template>
  <div
    v-if="gracePeriod"
    class="rounded-lg p-4 mb-6 bg-red-50 border border-red-200"
  >
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="flex-1">
        <h4 class="font-semibold text-red-800">
          {{ bannerTitle }}
        </h4>
        <p class="text-sm mt-1 text-red-700">
          {{ bannerDescription }}
        </p>
        <div class="mt-3 flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-red-800">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">
              {{ gracePeriod.daysRemaining }} jour{{ gracePeriod.daysRemaining > 1 ? 's' : '' }} restant{{ gracePeriod.daysRemaining > 1 ? 's' : '' }}
            </span>
          </div>
          <button
            v-if="gracePeriod.reason === 'payment_failed'"
            class="text-sm font-medium text-red-700 underline hover:no-underline"
            @click="$emit('update-payment')"
          >
            Mettre a jour le paiement
          </button>
        </div>
        <div class="mt-3 w-full bg-red-200 rounded-full h-2">
          <div
            class="bg-red-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: progressWidth }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
