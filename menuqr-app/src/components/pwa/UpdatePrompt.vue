<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '@/stores/configStore';
import BaseButton from '@/components/common/BaseButton.vue';

const props = defineProps<{
  needRefresh: boolean;
  offlineReady: boolean;
}>();

const emit = defineEmits<{
  acceptUpdate: [];
  dismissUpdate: [];
  dismissOfflineReady: [];
}>();

const configStore = useConfigStore();
const locale = computed(() => configStore.locale);

const showPrompt = computed(() => props.needRefresh || props.offlineReady);

const title = computed(() => {
  if (props.needRefresh) {
    return locale.value === 'fr' ? 'Mise à jour disponible' : 'Update available';
  }
  return locale.value === 'fr' ? 'Prêt pour le mode hors ligne' : 'Ready for offline';
});

const message = computed(() => {
  if (props.needRefresh) {
    return locale.value === 'fr'
      ? 'Une nouvelle version de MenuQR est disponible. Cliquez sur "Mettre à jour" pour profiter des dernières améliorations.'
      : 'A new version of MenuQR is available. Click "Update" to get the latest improvements.';
  }
  return locale.value === 'fr'
    ? "L'application est maintenant disponible hors ligne. Vous pouvez consulter le menu même sans connexion internet."
    : 'The app is now available offline. You can browse the menu even without an internet connection.';
});

const handleAction = () => {
  if (props.needRefresh) {
    emit('acceptUpdate');
  } else {
    emit('dismissOfflineReady');
  }
};

const handleDismiss = () => {
  if (props.needRefresh) {
    emit('dismissUpdate');
  } else {
    emit('dismissOfflineReady');
  }
};
</script>

<template>
  <Transition name="slide-up">
    <div v-if="showPrompt" class="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
      <div
        class="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
        :class="needRefresh ? 'border-l-4 border-l-primary-500' : 'border-l-4 border-l-blue-500'"
      >
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-start gap-3">
            <!-- Icon -->
            <div
              class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              :class="needRefresh ? 'bg-primary-100' : 'bg-blue-100'"
            >
              <!-- Update icon -->
              <svg
                v-if="needRefresh"
                class="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <!-- Offline ready icon -->
              <svg
                v-else
                class="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-gray-900">
                {{ title }}
              </h3>
              <p class="mt-1 text-xs text-gray-500 leading-relaxed">
                {{ message }}
              </p>
            </div>

            <!-- Close button -->
            <button
              class="flex-shrink-0 text-gray-400 hover:text-gray-500 transition-colors"
              @click="handleDismiss"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex gap-2">
            <BaseButton
              v-if="needRefresh"
              variant="outline"
              size="sm"
              class="flex-1"
              @click="handleDismiss"
            >
              {{ locale === 'fr' ? 'Plus tard' : 'Later' }}
            </BaseButton>
            <BaseButton
              :variant="needRefresh ? 'primary' : 'outline'"
              size="sm"
              :class="needRefresh ? 'flex-1' : 'w-full'"
              @click="handleAction"
            >
              {{
                needRefresh
                  ? locale === 'fr'
                    ? 'Mettre à jour'
                    : 'Update'
                  : locale === 'fr'
                    ? 'Compris'
                    : 'Got it'
              }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
