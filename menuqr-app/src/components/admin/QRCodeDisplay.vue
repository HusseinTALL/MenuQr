<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useQRCode } from '@/composables/useQRCode';

interface Props {
  url: string;
  size?: number;
  title?: string;
  subtitle?: string;
  showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 150,
  showActions: true,
});

const emit = defineEmits<{
  download: [];
  copy: [];
}>();

const { generateQRCode, downloadQRCode, copyToClipboard } = useQRCode();

const qrDataUrl = ref<string>('');
const isLoading = ref(true);
const error = ref<string | null>(null);
const copied = ref(false);

const generateQR = async () => {
  if (!props.url) return;

  isLoading.value = true;
  error.value = null;

  try {
    qrDataUrl.value = await generateQRCode(props.url, { width: props.size });
  } catch (err) {
    error.value = 'Erreur de génération';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const handleDownload = async () => {
  try {
    const filename = props.title?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'qr-code';
    await downloadQRCode(props.url, filename);
    emit('download');
  } catch (err) {
    console.error('Download failed:', err);
  }
};

const handleCopy = async () => {
  const success = await copyToClipboard(props.url);
  if (success) {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
    emit('copy');
  }
};

onMounted(generateQR);

watch(() => props.url, generateQR);
</script>

<template>
  <div class="flex flex-col items-center">
    <!-- QR Code Image -->
    <div
      class="relative flex items-center justify-center rounded-xl bg-white p-3 shadow-sm"
      :style="{ width: `${size + 24}px`, height: `${size + 24}px` }"
    >
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center">
        <svg class="h-8 w-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center text-red-500">
        <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p class="mt-1 text-xs">{{ error }}</p>
      </div>

      <!-- QR Code -->
      <img
        v-else
        :src="qrDataUrl"
        :alt="title || 'QR Code'"
        class="rounded"
        :width="size"
        :height="size"
      />
    </div>

    <!-- Title & Subtitle -->
    <div v-if="title || subtitle" class="mt-3 text-center">
      <p v-if="title" class="font-medium text-gray-900">{{ title }}</p>
      <p v-if="subtitle" class="mt-0.5 text-xs text-gray-500">{{ subtitle }}</p>
    </div>

    <!-- Actions -->
    <div v-if="showActions" class="mt-3 flex gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        @click="handleCopy"
      >
        <svg v-if="!copied" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <svg v-else class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ copied ? 'Copié !' : 'Copier' }}
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-500"
        @click="handleDownload"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Télécharger
      </button>
    </div>
  </div>
</template>
