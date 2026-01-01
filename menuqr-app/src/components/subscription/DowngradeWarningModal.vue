<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import api from '@/services/api';

interface FeatureItem {
  key: string;
  name: string;
}

interface DowngradeAnalysis {
  dishes?: {
    current: number;
    limit: number;
    toArchive: number;
  };
  campaigns?: {
    current: number;
    limit: number;
    toCancel: number;
  };
  featuresLosing?: FeatureItem[];
  featuresKeeping?: FeatureItem[];
  warnings?: string[];
  blockers?: string[];
  newPlan?: {
    id: string;
    name: string;
    slug: string;
    tier: string;
  };
}

const props = defineProps<{
  isOpen: boolean;
  planSlug: string;
  reason?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirmed', data: { scheduled: boolean; effectiveDate: Date }): void;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const scheduling = ref(false);
const analysis = ref<DowngradeAnalysis | null>(null);
const targetPlan = ref<{ id: string; name: string; slug: string; tier: string } | null>(null);
const effectiveDate = ref<Date | null>(null);

const hasDataImpact = computed(() => {
  if (!analysis.value) {return false;}
  return (
    (analysis.value.dishes?.toArchive ?? 0) > 0 ||
    (analysis.value.campaigns?.toCancel ?? 0) > 0
  );
});

const formattedEffectiveDate = computed(() => {
  if (!effectiveDate.value) {return 'la fin de votre periode actuelle';}
  return new Date(effectiveDate.value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

async function loadAnalysis() {
  if (!props.planSlug) {return;}

  loading.value = true;
  error.value = null;

  try {
    const response = await api.analyzeDowngrade(props.planSlug);
    if (response.data) {
      analysis.value = response.data;
      targetPlan.value = response.data.newPlan ?? null;
    } else {
      error.value = 'Erreur lors de l\'analyse';
    }
  } catch (err: unknown) {
    console.error('Failed to analyze downgrade:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
}

async function confirmDowngrade() {
  scheduling.value = true;
  error.value = null;

  try {
    const response = await api.scheduleDowngrade(props.planSlug, props.reason);
    if (response.data) {
      effectiveDate.value = new Date(response.data.effectiveDate);
      emit('confirmed', {
        scheduled: response.data.scheduled,
        effectiveDate: new Date(response.data.effectiveDate),
      });
    } else {
      error.value = 'Erreur lors de la planification';
    }
  } catch (err: unknown) {
    console.error('Failed to schedule downgrade:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    error.value = errorMessage;
  } finally {
    scheduling.value = false;
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.planSlug) {
      loadAnalysis();
    } else {
      analysis.value = null;
      error.value = null;
    }
  },
  { immediate: true }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" />

        <!-- Modal -->
        <div
          class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden"
        >
          <!-- Loading state -->
          <div v-if="loading" class="p-8 text-center">
            <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p class="text-gray-600">Analyse de l'impact du changement...</p>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="p-8 text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Erreur</h3>
            <p class="text-gray-600 mb-4">{{ error }}</p>
            <button
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              @click="$emit('close')"
            >
              Fermer
            </button>
          </div>

          <!-- Blockers state -->
          <div v-else-if="analysis?.blockers?.length" class="p-6">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 text-center mb-4">
              Changement impossible pour le moment
            </h3>
            <div class="space-y-3 mb-6">
              <div
                v-for="(blocker, index) in analysis.blockers"
                :key="index"
                class="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
              >
                <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm text-red-800">{{ blocker }}</span>
              </div>
            </div>
            <button
              class="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium"
              @click="$emit('close')"
            >
              Compris
            </button>
          </div>

          <!-- Impact analysis -->
          <template v-else-if="analysis">
            <!-- Header -->
            <div class="p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-xl font-bold">Changement de forfait</h3>
                <button
                  class="p-1 hover:bg-white/20 rounded"
                  @click="$emit('close')"
                >
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p class="text-white/90">
                Vous passez au forfait <strong>{{ targetPlan?.name }}</strong>
              </p>
            </div>

            <!-- Content -->
            <div class="p-6 max-h-[400px] overflow-y-auto">
              <!-- Warnings -->
              <div v-if="analysis.warnings?.length" class="mb-6">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Points d'attention
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="(warning, index) in analysis.warnings"
                    :key="index"
                    class="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-sm text-amber-800">{{ warning }}</span>
                  </div>
                </div>
              </div>

              <!-- Data impact -->
              <div v-if="hasDataImpact" class="mb-6">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Donnees affectees
                </h4>
                <div class="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div v-if="(analysis.dishes?.toArchive ?? 0) > 0" class="flex items-center justify-between py-2 border-b border-red-200">
                    <span class="text-sm text-gray-700">Plats a archiver</span>
                    <span class="font-semibold text-red-600">{{ analysis.dishes?.toArchive ?? 0 }} plats</span>
                  </div>
                  <div v-if="(analysis.campaigns?.toCancel ?? 0) > 0" class="flex items-center justify-between py-2">
                    <span class="text-sm text-gray-700">Campagnes a annuler</span>
                    <span class="font-semibold text-red-600">{{ analysis.campaigns?.toCancel ?? 0 }} campagnes</span>
                  </div>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Les plats archives et campagnes annulees ne seront plus visibles mais restent dans votre historique.
                </p>
              </div>

              <!-- Features losing -->
              <div v-if="analysis.featuresLosing?.length" class="mb-6">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Fonctionnalites retirees
                </h4>
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="feature in analysis.featuresLosing"
                    :key="feature.key"
                    class="flex items-center gap-2 p-2 bg-gray-100 rounded text-sm text-gray-600"
                  >
                    <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                    {{ feature.name || feature }}
                  </div>
                </div>
              </div>

              <!-- Features keeping -->
              <div v-if="analysis.featuresKeeping?.length">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Fonctionnalites conservees
                </h4>
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="feature in analysis.featuresKeeping"
                    :key="feature.key"
                    class="flex items-center gap-2 p-2 bg-green-50 rounded text-sm text-green-700"
                  >
                    <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {{ feature.name || feature }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-6 border-t bg-gray-50">
              <div class="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Le changement prendra effet le <strong>{{ formattedEffectiveDate }}</strong></span>
              </div>

              <div class="flex gap-3">
                <button
                  class="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                  @click="$emit('close')"
                >
                  Annuler
                </button>
                <button
                  class="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="scheduling"
                  @click="confirmDowngrade"
                >
                  <span v-if="scheduling" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Traitement...
                  </span>
                  <span v-else>Confirmer le changement</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95) translateY(10px);
}
</style>
