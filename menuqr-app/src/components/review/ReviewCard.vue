<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Review } from '@/types/review';
import StarRating from './StarRating.vue';

interface Props {
  review: Review;
  showDish?: boolean;
  showActions?: boolean;
  isAdmin?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDish: true,
  showActions: true,
  isAdmin: false,
});

const emit = defineEmits<{
  (e: 'helpful', id: string): void;
  (e: 'report', id: string): void;
  (e: 'approve', id: string): void;
  (e: 'reject', id: string): void;
  (e: 'respond', id: string): void;
  (e: 'delete', id: string): void;
}>();

const showImages = ref(false);
const selectedImageIndex = ref(0);

const customerName = computed(() => {
  if (typeof props.review.customerId === 'object' && props.review.customerId?.name) {
    return props.review.customerId.name;
  }
  return 'Client';
});

const customerInitials = computed(() => {
  const name = customerName.value;
  if (!name) {return 'C';}
  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

const formattedDate = computed(() => {
  const date = new Date(props.review.createdAt);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const timeAgo = computed(() => {
  const date = new Date(props.review.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {return "Aujourd'hui";}
  if (diffDays === 1) {return 'Hier';}
  if (diffDays < 7) {return `Il y a ${diffDays} jours`;}
  if (diffDays < 30) {return `Il y a ${Math.floor(diffDays / 7)} semaine(s)`;}
  if (diffDays < 365) {return `Il y a ${Math.floor(diffDays / 30)} mois`;}
  return `Il y a ${Math.floor(diffDays / 365)} an(s)`;
});

const statusBadge = computed(() => {
  switch (props.review.status) {
    case 'pending':
      return { text: 'En attente', class: 'bg-yellow-100 text-yellow-800' };
    case 'approved':
      return { text: 'Approuvé', class: 'bg-green-100 text-green-800' };
    case 'rejected':
      return { text: 'Rejeté', class: 'bg-red-100 text-red-800' };
    case 'flagged':
      return { text: 'Signalé', class: 'bg-orange-100 text-orange-800' };
    default:
      return { text: props.review.status, class: 'bg-gray-100 text-gray-800' };
  }
});

const dishName = computed(() => {
  if (typeof props.review.dish === 'object' && props.review.dish?.name) {
    return props.review.dish.name.fr;
  }
  return null;
});

const openImageModal = (index: number) => {
  selectedImageIndex.value = index;
  showImages.value = true;
};
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <!-- Avatar -->
        <div
          class="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-sm"
        >
          {{ customerInitials }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900">{{ customerName }}</span>
            <span
              v-if="review.isVerifiedPurchase"
              class="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full"
            >
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
              Achat vérifié
            </span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <StarRating :model-value="review.rating" readonly size="sm" />
            <span class="text-gray-400">·</span>
            <span :title="formattedDate">{{ timeAgo }}</span>
          </div>
        </div>
      </div>

      <!-- Status badge (admin view) -->
      <span
        v-if="isAdmin && review.status !== 'approved'"
        :class="['text-xs px-2 py-1 rounded-full', statusBadge.class]"
      >
        {{ statusBadge.text }}
      </span>
    </div>

    <!-- Dish info -->
    <div v-if="showDish && dishName" class="mb-2">
      <span class="text-sm text-gray-600">
        Avis sur : <span class="font-medium text-gray-800">{{ dishName }}</span>
      </span>
    </div>

    <!-- Title -->
    <h4 v-if="review.title" class="font-medium text-gray-900 mb-1">
      {{ review.title }}
    </h4>

    <!-- Comment -->
    <p v-if="review.comment" class="text-gray-700 text-sm leading-relaxed mb-3">
      {{ review.comment }}
    </p>

    <!-- Images -->
    <div v-if="review.images && review.images.length > 0" class="flex gap-2 mb-3">
      <button
        v-for="(image, index) in review.images"
        :key="index"
        class="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-teal-300 transition-colors"
        @click="openImageModal(index)"
      >
        <img :src="image.url" :alt="`Photo ${index + 1}`" class="w-full h-full object-cover" />
      </button>
    </div>

    <!-- Restaurant Response -->
    <div
      v-if="review.response"
      class="bg-gray-50 rounded-lg p-3 mt-3 border-l-4 border-teal-500"
    >
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-medium text-gray-900">Réponse du restaurateur</span>
        <span class="text-xs text-gray-500">
          {{ new Date(review.response.respondedAt).toLocaleDateString('fr-FR') }}
        </span>
      </div>
      <p class="text-sm text-gray-700">{{ review.response.content }}</p>
    </div>

    <!-- Rejection reason (admin) -->
    <div
      v-if="isAdmin && review.status === 'rejected' && review.rejectionReason"
      class="bg-red-50 rounded-lg p-3 mt-3 border-l-4 border-red-500"
    >
      <span class="text-sm font-medium text-red-900">Raison du rejet:</span>
      <p class="text-sm text-red-700">{{ review.rejectionReason }}</p>
    </div>

    <!-- Actions -->
    <div v-if="showActions" class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
      <!-- Customer actions -->
      <div v-if="!isAdmin" class="flex items-center gap-4">
        <button
          class="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600 transition-colors"
          :class="{ 'text-teal-600': review.hasVotedHelpful }"
          @click="emit('helpful', review._id)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span>Utile ({{ review.helpfulCount }})</span>
        </button>
        <button
          class="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
          @click="emit('report', review._id)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
          <span>Signaler</span>
        </button>
      </div>

      <!-- Admin actions -->
      <div v-else class="flex items-center gap-2">
        <button
          v-if="review.status === 'pending' || review.status === 'flagged'"
          class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          @click="emit('approve', review._id)"
        >
          Approuver
        </button>
        <button
          v-if="review.status === 'pending' || review.status === 'flagged'"
          class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          @click="emit('reject', review._id)"
        >
          Rejeter
        </button>
        <button
          v-if="!review.response && review.status === 'approved'"
          class="px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
          @click="emit('respond', review._id)"
        >
          Répondre
        </button>
        <button
          class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          @click="emit('delete', review._id)"
        >
          Supprimer
        </button>
      </div>
    </div>

    <!-- Image modal -->
    <Teleport to="body">
      <div
        v-if="showImages"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        @click="showImages = false"
      >
        <button
          class="absolute top-4 right-4 text-white hover:text-gray-300"
          @click="showImages = false"
        >
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          :src="review.images[selectedImageIndex]?.url"
          alt="Photo agrandie"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          @click.stop
        />
        <button
          v-if="selectedImageIndex > 0"
          class="absolute left-4 text-white hover:text-gray-300"
          @click.stop="selectedImageIndex--"
        >
          <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          v-if="selectedImageIndex < review.images.length - 1"
          class="absolute right-4 text-white hover:text-gray-300"
          @click.stop="selectedImageIndex++"
        >
          <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>
