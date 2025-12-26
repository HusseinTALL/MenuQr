<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CreateReviewDTO, ReviewImage } from '@/types/review';
import StarRating from './StarRating.vue';
import api from '@/services/api';

interface Props {
  restaurantId: string;
  dishId?: string;
  dishName?: string;
  orderId?: string;
  initialRating?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

const rating = ref(props.initialRating || 0);
const title = ref('');
const comment = ref('');
const images = ref<ReviewImage[]>([]);
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');

const canSubmit = computed(() => {
  return rating.value >= 1 && rating.value <= 5 && !submitting.value;
});

const characterCount = computed(() => comment.value.length);
const maxCharacters = 1000;

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  if (images.value.length >= 3) {
    error.value = 'Maximum 3 photos autorisees';
    return;
  }

  const file = files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    error.value = 'Seules les images sont autorisees';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'La taille maximum est de 5MB';
    return;
  }

  uploading.value = true;
  error.value = '';

  try {
    const response = await api.uploadImage(file);
    if (response.data) {
      images.value.push({
        url: response.data.url,
        publicId: response.data.publicId,
      });
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du telechargement';
  } finally {
    uploading.value = false;
    target.value = '';
  }
};

const removeImage = async (index: number) => {
  const image = images.value[index];
  if (!image) return;
  try {
    await api.deleteImage(image.url);
  } catch {
    // Ignore delete errors
  }
  images.value.splice(index, 1);
};

const handleSubmit = async () => {
  if (!canSubmit.value) return;

  submitting.value = true;
  error.value = '';

  try {
    const data: CreateReviewDTO = {
      restaurantId: props.restaurantId,
      rating: rating.value,
    };

    if (props.dishId) data.dishId = props.dishId;
    if (props.orderId) data.orderId = props.orderId;
    if (title.value.trim()) data.title = title.value.trim();
    if (comment.value.trim()) data.comment = comment.value.trim();
    if (images.value.length > 0) data.images = images.value;

    await api.createReview(data);
    emit('success');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de la soumission';
  } finally {
    submitting.value = false;
  }
};

// Clear error when user makes changes
watch([rating, title, comment], () => {
  error.value = '';
});
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">
      {{ dishName ? `Donner votre avis sur "${dishName}"` : 'Donner votre avis' }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Rating -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Note <span class="text-red-500">*</span>
        </label>
        <StarRating v-model="rating" size="lg" />
        <p v-if="rating > 0" class="mt-1 text-sm text-gray-500">
          {{ rating === 5 ? 'Excellent !' : rating === 4 ? 'Très bien' : rating === 3 ? 'Correct' : rating === 2 ? 'Décevant' : 'Très mauvais' }}
        </p>
      </div>

      <!-- Title -->
      <div>
        <label for="review-title" class="block text-sm font-medium text-gray-700 mb-1">
          Titre (optionnel)
        </label>
        <input
          id="review-title"
          v-model="title"
          type="text"
          maxlength="100"
          placeholder="Résumez votre expérience"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <!-- Comment -->
      <div>
        <label for="review-comment" class="block text-sm font-medium text-gray-700 mb-1">
          Commentaire (optionnel)
        </label>
        <textarea
          id="review-comment"
          v-model="comment"
          rows="4"
          :maxlength="maxCharacters"
          placeholder="Partagez les détails de votre expérience..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
        />
        <p class="mt-1 text-xs text-gray-500 text-right">
          {{ characterCount }}/{{ maxCharacters }}
        </p>
      </div>

      <!-- Images -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Photos (optionnel, max 3)
        </label>
        <div class="flex flex-wrap gap-3">
          <!-- Existing images -->
          <div
            v-for="(image, index) in images"
            :key="index"
            class="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
          >
            <img :src="image.url" :alt="`Photo ${index + 1}`" class="w-full h-full object-cover" />
            <button
              type="button"
              class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              @click="removeImage(index)"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Upload button -->
          <label
            v-if="images.length < 3"
            class="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 transition-colors"
            :class="{ 'opacity-50 cursor-not-allowed': uploading }"
          >
            <svg
              v-if="!uploading"
              class="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <svg
              v-else
              class="w-6 h-6 text-teal-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            <span class="text-xs text-gray-400 mt-1">Ajouter</span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              :disabled="uploading"
              @change="handleFileSelect"
            />
          </label>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          class="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          @click="emit('cancel')"
        >
          Annuler
        </button>
        <button
          type="submit"
          :disabled="!canSubmit"
          class="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
          {{ submitting ? 'Envoi...' : 'Publier mon avis' }}
        </button>
      </div>
    </form>
  </div>
</template>
