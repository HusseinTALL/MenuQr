<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { QrcodeStream } from 'vue-qrcode-reader';

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox?: DOMRectReadOnly;
  cornerPoints?: { x: number; y: number }[];
}

const emit = defineEmits<{
  result: [value: string];
  error: [error: Error];
  close: [];
}>();

const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

// Handle detect result (vue-qrcode-reader v5.x API)
const onDetect = (detectedCodes: DetectedBarcode[]) => {
  if (detectedCodes && detectedCodes.length > 0) {
    const firstCode = detectedCodes[0];
    if (firstCode && firstCode.rawValue) {
      emit('result', firstCode.rawValue);
    }
  }
};

// Handle camera error
const onCameraError = (error: Error) => {
  isLoading.value = false;

  if (error.name === 'NotAllowedError') {
    errorMessage.value = "L'accès à la caméra a été refusé. Veuillez autoriser l'accès dans les paramètres.";
  } else if (error.name === 'NotFoundError') {
    errorMessage.value = 'Aucune caméra détectée sur cet appareil.';
  } else if (error.name === 'NotReadableError') {
    errorMessage.value = 'La caméra est déjà utilisée par une autre application.';
  } else if (error.name === 'OverconstrainedError') {
    errorMessage.value = 'La caméra ne supporte pas les paramètres requis.';
  } else if (error.name === 'StreamApiNotSupportedError') {
    errorMessage.value = 'Ce navigateur ne supporte pas le scan QR.';
  } else {
    errorMessage.value = `Erreur caméra: ${error.message}`;
  }

  emit('error', error);
};

// Handle camera ready
const onCameraOn = () => {
  isLoading.value = false;
  errorMessage.value = null;
};

// Close scanner
const close = () => {
  emit('close');
};

// Cleanup
onUnmounted(() => {
  // Camera stream is automatically stopped by vue-qrcode-reader
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-black">
    <!-- Header -->
    <div class="flex items-center justify-between bg-black/80 px-4 py-3 backdrop-blur-sm">
      <h2 class="text-lg font-medium text-white">Scanner QR</h2>
      <button
        type="button"
        class="rounded-full p-2 text-white transition-colors hover:bg-white/20"
        @click="close"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Scanner Area -->
    <div class="relative flex-1 flex items-center justify-center overflow-hidden">
      <!-- Loading State -->
      <div
        v-if="isLoading && !errorMessage"
        class="absolute inset-0 flex items-center justify-center bg-black"
      >
        <div class="flex flex-col items-center gap-3">
          <svg class="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
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
          <p class="text-white">Initialisation de la caméra...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-if="errorMessage"
        class="absolute inset-0 flex items-center justify-center bg-black px-6"
      >
        <div class="text-center">
          <svg
            class="mx-auto mb-4 h-16 w-16 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p class="text-white mb-4">{{ errorMessage }}</p>
          <button
            type="button"
            class="rounded-xl bg-white/20 px-6 py-2 font-medium text-white hover:bg-white/30"
            @click="close"
          >
            Fermer
          </button>
        </div>
      </div>

      <!-- QR Code Stream -->
      <QrcodeStream
        v-if="!errorMessage"
        class="absolute inset-0"
        @detect="onDetect"
        @camera-on="onCameraOn"
        @error="onCameraError"
      />

      <!-- Scanner Frame Overlay -->
      <div
        v-if="!isLoading && !errorMessage"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div class="relative h-64 w-64">
          <!-- Corner markers -->
          <div class="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
          <div class="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
          <div class="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div class="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white rounded-br-lg" />

          <!-- Scanning line -->
          <div class="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-primary-500 animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="bg-black/80 px-4 py-6 text-center backdrop-blur-sm">
      <p class="text-white/80">
        Pointez votre caméra vers le QR code du restaurant
      </p>
    </div>
  </div>
</template>

<style scoped>
/* QR Code Stream takes full height */
:deep(.qrcode-stream-wrapper) {
  height: 100% !important;
}

:deep(.qrcode-stream-wrapper video) {
  object-fit: cover !important;
}
</style>
