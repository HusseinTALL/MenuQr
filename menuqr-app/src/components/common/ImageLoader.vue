<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SkeletonLoader from './SkeletonLoader.vue';

/**
 * ImageLoader component
 * Progressive image loading with placeholder and error handling
 */
const props = defineProps<{
  src: string;
  alt: string;
  width?: string;
  height?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  rounded?: boolean;
  placeholder?: string;
}>();

const isLoading = ref(true);
const hasError = ref(false);
const imageSrc = ref(props.placeholder || '');

onMounted(() => {
  const img = new Image();
  img.onload = () => {
    imageSrc.value = props.src;
    isLoading.value = false;
  };
  img.onerror = () => {
    hasError.value = true;
    isLoading.value = false;
  };
  img.src = props.src;
});
</script>

<template>
  <div
    class="relative overflow-hidden bg-gray-100"
    :style="{ width: width || '100%', height: height || 'auto' }"
    :class="{ 'rounded-lg': rounded }"
  >
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="absolute inset-0">
      <SkeletonLoader variant="image" :width="width" :height="height" :rounded="rounded" />
    </div>

    <!-- Error state -->
    <div
      v-else-if="hasError"
      class="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400"
    >
      <svg
        class="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>

    <!-- Loaded image -->
    <img
      v-else
      :src="imageSrc"
      :alt="alt"
      class="w-full h-full transition-opacity duration-300"
      :class="{
        'object-cover': objectFit === 'cover' || !objectFit,
        'object-contain': objectFit === 'contain',
        'object-fill': objectFit === 'fill',
        'object-none': objectFit === 'none',
      }"
      loading="lazy"
    />
  </div>
</template>
