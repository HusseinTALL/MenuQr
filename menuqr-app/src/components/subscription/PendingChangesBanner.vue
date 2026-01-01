<template>
  <div
    v-if="pendingChange"
    class="rounded-lg p-4 mb-6"
    :class="bannerClasses"
  >
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        <component :is="bannerIcon" class="w-6 h-6" :class="iconClasses" />
      </div>
      <div class="flex-1">
        <h4 class="font-semibold" :class="titleClasses">
          {{ bannerTitle }}
        </h4>
        <p class="text-sm mt-1" :class="textClasses">
          {{ bannerDescription }}
        </p>
        <p class="text-sm mt-2" :class="textClasses">
          <strong>Date effective :</strong> {{ formattedEffectiveDate }}
        </p>
        <div v-if="pendingChange.type === 'downgrade'" class="mt-3">
          <button
            class="text-sm font-medium underline hover:no-underline"
            :class="linkClasses"
            :disabled="cancelling"
            @click="cancelChange"
          >
            <span v-if="cancelling">Annulation...</span>
            <span v-else>Annuler ce changement</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import api from '@/services/api';

interface PendingChange {
  type: 'upgrade' | 'downgrade' | 'cancellation';
  effectiveDate: string;
  requestedAt: string;
  reason?: string;
  newPlan?: {
    name: string;
    slug: string;
    tier: string;
  };
}

const emit = defineEmits<{
  (e: 'cancelled'): void;
  (e: 'loaded', data: PendingChange | null): void;
}>();

const pendingChange = ref<PendingChange | null>(null);
const loading = ref(true);
const cancelling = ref(false);

const bannerClasses = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return 'bg-green-50 border border-green-200';
    case 'downgrade':
      return 'bg-orange-50 border border-orange-200';
    case 'cancellation':
      return 'bg-red-50 border border-red-200';
    default:
      return 'bg-gray-50 border border-gray-200';
  }
});

const iconClasses = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return 'text-green-500';
    case 'downgrade':
      return 'text-orange-500';
    case 'cancellation':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
});

const titleClasses = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return 'text-green-800';
    case 'downgrade':
      return 'text-orange-800';
    case 'cancellation':
      return 'text-red-800';
    default:
      return 'text-gray-800';
  }
});

const textClasses = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return 'text-green-700';
    case 'downgrade':
      return 'text-orange-700';
    case 'cancellation':
      return 'text-red-700';
    default:
      return 'text-gray-700';
  }
});

const linkClasses = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return 'text-green-600 hover:text-green-800';
    case 'downgrade':
      return 'text-orange-600 hover:text-orange-800';
    case 'cancellation':
      return 'text-red-600 hover:text-red-800';
    default:
      return 'text-gray-600 hover:text-gray-800';
  }
});

const bannerIcon = computed(() => {
  if (!pendingChange.value) return null;
  switch (pendingChange.value.type) {
    case 'upgrade':
      return h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' })
      ]);
    case 'downgrade':
      return h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' })
      ]);
    case 'cancellation':
      return h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12' })
      ]);
    default:
      return h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
      ]);
  }
});

const bannerTitle = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return `Mise a niveau vers ${pendingChange.value.newPlan?.name || 'un nouveau forfait'} programmee`;
    case 'downgrade':
      return `Changement vers ${pendingChange.value.newPlan?.name || 'un forfait inferieur'} programme`;
    case 'cancellation':
      return 'Annulation de l\'abonnement programmee';
    default:
      return 'Changement programme';
  }
});

const bannerDescription = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return 'Votre mise a niveau prendra effet a la date indiquee ci-dessous.';
    case 'downgrade':
      return 'Votre changement de forfait prendra effet a la fin de votre periode de facturation actuelle.';
    case 'cancellation':
      return 'Votre abonnement sera annule et vous perdrez l\'acces aux fonctionnalites premium.';
    default:
      return '';
  }
});

const formattedEffectiveDate = computed(() => {
  if (!pendingChange.value?.effectiveDate) return 'Non definie';
  return new Date(pendingChange.value.effectiveDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

async function loadPendingChanges() {
  loading.value = true;
  try {
    const response = await api.getPendingChanges();
    if (response.data?.hasPendingChanges && response.data.pendingChange) {
      pendingChange.value = response.data.pendingChange;
    } else {
      pendingChange.value = null;
    }
    emit('loaded', pendingChange.value);
  } catch (error) {
    console.error('Failed to load pending changes:', error);
    pendingChange.value = null;
  } finally {
    loading.value = false;
  }
}

async function cancelChange() {
  if (!pendingChange.value || pendingChange.value.type !== 'downgrade') return;

  cancelling.value = true;
  try {
    await api.cancelScheduledDowngrade();
    pendingChange.value = null;
    emit('cancelled');
  } catch (error) {
    console.error('Failed to cancel downgrade:', error);
  } finally {
    cancelling.value = false;
  }
}

onMounted(() => {
  loadPendingChanges();
});

defineExpose({ refresh: loadPendingChanges });
</script>
