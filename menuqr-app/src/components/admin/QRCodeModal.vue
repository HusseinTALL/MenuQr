<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQRCode } from '@/composables/useQRCode';

interface Props {
  open: boolean;
  url: string;
  title: string;
  subtitle?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const { generateQRCode, downloadQRCode, copyToClipboard } = useQRCode();

const qrDataUrl = ref<string>('');
const isLoading = ref(true);
const copied = ref(false);
const isDownloading = ref(false);

const shortUrl = computed(() => {
  try {
    const urlObj = new URL(props.url);
    return urlObj.host + urlObj.pathname;
  } catch {
    return props.url;
  }
});

const generateQR = async () => {
  if (!props.url) {return;}

  isLoading.value = true;
  try {
    qrDataUrl.value = await generateQRCode(props.url, { width: 250 });
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const handleDownload = async () => {
  isDownloading.value = true;
  try {
    const filename = props.title.replace(/[^a-zA-Z0-9-_]/g, '-');
    await downloadQRCode(props.url, filename);
  } catch (err) {
    console.error('Download failed:', err);
  } finally {
    isDownloading.value = false;
  }
};

const handleCopy = async () => {
  const success = await copyToClipboard(props.url);
  if (success) {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
};

const handleClose = () => {
  emit('close');
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    handleClose();
  }
};

// Generate QR when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.url) {
      generateQR();
    }
  },
  { immediate: true }
);

// Handle escape key
watch(
  () => props.open,
  (isOpen) => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    };
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
        @click="handleBackdropClick"
      >
        <div class="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
              <p v-if="subtitle" class="mt-0.5 text-sm text-gray-500">{{ subtitle }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="handleClose"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            <!-- QR Code -->
            <div class="flex justify-center">
              <div class="rounded-xl bg-gray-50 p-4">
                <div
                  v-if="isLoading"
                  class="flex h-[250px] w-[250px] items-center justify-center"
                >
                  <svg class="h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
                <img
                  v-else
                  :src="qrDataUrl"
                  :alt="title"
                  class="rounded"
                  width="250"
                  height="250"
                />
              </div>
            </div>

            <!-- URL Display -->
            <div class="mt-4 rounded-lg bg-gray-100 px-4 py-3">
              <p class="text-center text-sm text-gray-600 break-all">{{ shortUrl }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="handleCopy"
            >
              <svg v-if="!copied" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <svg v-else class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ copied ? 'Copié !' : 'Copier URL' }}
            </button>

            <button
              type="button"
              :disabled="isDownloading"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:bg-teal-300"
              @click="handleDownload"
            >
              <svg v-if="!isDownloading" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <svg v-else class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Télécharger
            </button>
          </div>
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

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}
</style>
