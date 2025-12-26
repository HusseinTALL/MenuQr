<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import { useMenuStore } from '@/stores/menuStore';
import type { Review, ReviewQueryParams, ReviewPagination, ReviewStats as ReviewStatsType } from '@/types/review';
import api from '@/services/api';
import AppHeader from '@/components/common/AppHeader.vue';
import ReviewCard from '@/components/review/ReviewCard.vue';
import ReviewForm from '@/components/review/ReviewForm.vue';
import StarRating from '@/components/review/StarRating.vue';

const router = useRouter();
const route = useRoute();
const customerAuthStore = useCustomerAuthStore();
const menuStore = useMenuStore();

// State
const activeTab = ref<'restaurant' | 'my-reviews'>('restaurant');
const reviews = ref<Review[]>([]);
const myReviews = ref<Review[]>([]);
const pagination = ref<ReviewPagination | null>(null);
const myPagination = ref<ReviewPagination | null>(null);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const error = ref<string | null>(null);
const stats = ref<ReviewStatsType | null>(null);

// Filters
const sortOption = ref<string>('recent');
const ratingFilter = ref<number | null>(null);

// Review form
const showReviewForm = ref(false);
const selectedDishId = ref<string | undefined>(undefined);
const selectedDishName = ref<string | undefined>(undefined);

// Get restaurantId from menuStore or customerAuthStore (fallback when accessing directly)
const restaurantId = computed(() =>
  menuStore.restaurant?.id ||
  customerAuthStore.currentRestaurantId ||
  customerAuthStore.customer?.restaurantId ||
  ''
);
const isAuthenticated = computed(() => customerAuthStore.isAuthenticated);

const sortOptions = [
  { value: 'recent', label: 'Plus récents', icon: '🕒' },
  { value: 'oldest', label: 'Plus anciens', icon: '📅' },
  { value: 'rating_high', label: 'Meilleures notes', icon: '⬆️' },
  { value: 'rating_low', label: 'Notes basses', icon: '⬇️' },
  { value: 'helpful', label: 'Plus utiles', icon: '👍' },
];

const hasMore = computed(() => {
  if (!pagination.value) return false;
  return pagination.value.page < pagination.value.pages;
});

const hasMoreMyReviews = computed(() => {
  if (!myPagination.value) return false;
  return myPagination.value.page < myPagination.value.pages;
});

// Featured reviews (top rated with comments)
const featuredReviews = computed(() => {
  return reviews.value
    .filter(r => r.rating >= 4 && r.comment && r.comment.length > 50)
    .slice(0, 3);
});

// Rating distribution percentages
const ratingPercentages = computed(() => {
  if (!stats.value || stats.value.totalReviews === 0) {
    return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  }
  const result: Record<number, number> = {};
  for (let i = 5; i >= 1; i--) {
    result[i] = ((stats.value.ratingDistribution[i] || 0) / stats.value.totalReviews) * 100;
  }
  return result;
});

// Avatar color generation
const getAvatarColor = (name: string) => {
  const colors = [
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-blue-400 to-indigo-500',
    'from-teal-400 to-cyan-500',
    'from-emerald-400 to-green-500',
    'from-amber-400 to-orange-500',
  ];
  const index = (name?.charCodeAt(0) || 0) % colors.length;
  return colors[index];
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Fetch restaurant reviews
const fetchReviews = async (append = false) => {
  if (!restaurantId.value) {
    isLoading.value = false;
    error.value = 'Restaurant non trouvé. Veuillez retourner au menu.';
    return;
  }

  if (!append) {
    isLoading.value = true;
  } else {
    isLoadingMore.value = true;
  }
  error.value = null;

  try {
    const params: ReviewQueryParams = {
      page: append ? (pagination.value?.page || 0) + 1 : 1,
      limit: 10,
      sort: sortOption.value as ReviewQueryParams['sort'],
    };
    if (ratingFilter.value) {
      params.rating = ratingFilter.value;
    }

    const response = await api.getRestaurantReviews(restaurantId.value, params);
    if (response.success) {
      const reviewsData = response.data as Review[];
      const paginationData = (response as unknown as { pagination: ReviewPagination }).pagination;

      if (append) {
        reviews.value = [...reviews.value, ...reviewsData];
      } else {
        reviews.value = reviewsData;
      }
      pagination.value = paginationData;
    }
  } catch (err) {
    error.value = 'Impossible de charger les avis';
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

// Fetch my reviews
const fetchMyReviews = async (append = false) => {
  if (!isAuthenticated.value) return;

  if (!append) {
    isLoading.value = true;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params = {
      page: append ? (myPagination.value?.page || 0) + 1 : 1,
      limit: 10,
    };

    const response = await api.getMyReviews(params);
    if (response.success) {
      const reviewsData = response.data as Review[];
      const paginationData = (response as unknown as { pagination: ReviewPagination }).pagination;

      if (append) {
        myReviews.value = [...myReviews.value, ...reviewsData];
      } else {
        myReviews.value = reviewsData;
      }
      myPagination.value = paginationData;
    }
  } catch {
    // Silently fail
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

// Fetch stats
const fetchStats = async () => {
  if (!restaurantId.value) return;

  try {
    const response = await api.getRestaurantReviewStats(restaurantId.value);
    if (response.success && response.data) {
      stats.value = response.data as ReviewStatsType;
    }
  } catch {
    // Silently fail
  }
};

// Handle filter change
const handleFilterChange = () => {
  fetchReviews(false);
};

// Handle tab change
const handleTabChange = (tab: 'restaurant' | 'my-reviews') => {
  activeTab.value = tab;
  if (tab === 'my-reviews' && myReviews.value.length === 0) {
    fetchMyReviews();
  }
};

// Handle helpful vote
const handleHelpful = async (reviewId: string) => {
  try {
    await api.markReviewHelpful(reviewId);
    const review = reviews.value.find((r) => r._id === reviewId);
    if (review) {
      review.helpfulCount += review.hasVotedHelpful ? -1 : 1;
      review.hasVotedHelpful = !review.hasVotedHelpful;
    }
  } catch {
    // Silently fail
  }
};

// Handle report
const handleReport = async (reviewId: string) => {
  if (!isAuthenticated.value) {
    router.push('/menu');
    return;
  }

  try {
    await api.reportReview(reviewId);
    alert('Merci pour votre signalement. Nous allons examiner cet avis.');
  } catch {
    alert('Une erreur est survenue');
  }
};

// Handle delete own review
const handleDelete = async (reviewId: string) => {
  if (!confirm('Voulez-vous vraiment supprimer cet avis ?')) return;

  try {
    await api.deleteReview(reviewId);
    myReviews.value = myReviews.value.filter((r) => r._id !== reviewId);
    reviews.value = reviews.value.filter((r) => r._id !== reviewId);
    fetchStats();
  } catch {
    alert('Une erreur est survenue');
  }
};

// Open review form
const openReviewForm = (dishId?: string, dishName?: string) => {
  if (!isAuthenticated.value) {
    router.push('/menu');
    return;
  }
  selectedDishId.value = dishId;
  selectedDishName.value = dishName;
  showReviewForm.value = true;
};

// Handle review success
const handleReviewSuccess = () => {
  showReviewForm.value = false;
  selectedDishId.value = undefined;
  selectedDishName.value = undefined;
  fetchReviews(false);
  fetchStats();
  if (isAuthenticated.value) {
    fetchMyReviews(false);
  }
};

// Initialize
onMounted(async () => {
  const restId = menuStore.restaurant?.id || customerAuthStore.currentRestaurantId;
  if (restId) {
    customerAuthStore.initForRestaurant(restId);
  }

  if (route.query.dishId) {
    selectedDishId.value = route.query.dishId as string;
    if (route.query.dishName) {
      selectedDishName.value = route.query.dishName as string;
    }
    if (isAuthenticated.value) {
      showReviewForm.value = true;
    }
  }

  await Promise.all([fetchReviews(), fetchStats()]);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white pb-8">
    <AppHeader :show-back="true" title="Avis clients" />

    <div class="container mx-auto max-w-2xl px-4 py-6">
      <!-- Hero Stats Section -->
      <div v-if="stats && stats.totalReviews > 0" class="mb-8 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
        <!-- Top gradient section with main rating -->
        <div class="relative bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-6 text-white">
          <!-- Pattern -->
          <div class="absolute inset-0 opacity-10">
            <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="stars-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M10 1l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8L10 1z" fill="currentColor" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#stars-pattern)" />
            </svg>
          </div>

          <!-- Floating elements -->
          <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
          <div class="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-rose-300/20 blur-2xl"></div>

          <div class="relative flex items-center gap-6">
            <!-- Big rating number -->
            <div class="text-center">
              <div class="text-6xl font-bold tracking-tight">{{ stats.averageRating.toFixed(1) }}</div>
              <div class="mt-1 flex justify-center gap-0.5">
                <svg v-for="i in 5" :key="i" class="h-5 w-5" :class="i <= Math.round(stats.averageRating) ? 'text-white' : 'text-white/40'" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div class="mt-2 text-sm text-white/80">{{ stats.totalReviews }} avis</div>
            </div>

            <!-- Rating bars -->
            <div class="flex-1 space-y-2">
              <div v-for="rating in [5, 4, 3, 2, 1]" :key="rating" class="flex items-center gap-2">
                <span class="w-8 text-right text-sm font-medium">{{ rating }}</span>
                <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div class="flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    class="h-2 rounded-full bg-white transition-all duration-700 ease-out"
                    :style="{ width: `${ratingPercentages[rating]}%` }"
                  ></div>
                </div>
                <span class="w-10 text-right text-xs text-white/80">{{ stats.ratingDistribution[rating] || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Categories ratings -->
        <div v-if="stats.categoryRatings" class="grid grid-cols-3 gap-4 p-5">
          <div v-if="stats.categoryRatings.food" class="text-center">
            <div class="mb-1 text-2xl font-bold text-amber-600">{{ stats.categoryRatings.food.toFixed(1) }}</div>
            <div class="text-xs text-slate-500">Cuisine</div>
          </div>
          <div v-if="stats.categoryRatings.service" class="text-center">
            <div class="mb-1 text-2xl font-bold text-orange-600">{{ stats.categoryRatings.service.toFixed(1) }}</div>
            <div class="text-xs text-slate-500">Service</div>
          </div>
          <div v-if="stats.categoryRatings.ambiance" class="text-center">
            <div class="mb-1 text-2xl font-bold text-rose-600">{{ stats.categoryRatings.ambiance.toFixed(1) }}</div>
            <div class="text-xs text-slate-500">Ambiance</div>
          </div>
        </div>
      </div>

      <!-- Write Review CTA -->
      <div
        v-if="isAuthenticated && !showReviewForm"
        class="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 p-1 shadow-lg shadow-teal-500/25"
      >
        <div class="rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 p-5">
          <div class="flex items-center justify-between">
            <div class="text-white">
              <h3 class="text-lg font-bold">Partagez votre expérience</h3>
              <p class="mt-1 text-sm text-teal-100">Votre avis compte pour nous et aide les autres clients</p>
            </div>
            <button
              class="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-teal-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              @click="openReviewForm()"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Écrire
            </button>
          </div>
        </div>
      </div>

      <!-- Review Form Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="showReviewForm && restaurantId"
            class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
            @click.self="showReviewForm = false"
          >
            <div class="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-5 text-white">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-bold">Écrire un avis</h3>
                  <button
                    class="rounded-lg p-1 transition-colors hover:bg-white/20"
                    @click="showReviewForm = false"
                  >
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p v-if="selectedDishName" class="mt-1 text-sm text-teal-100">Pour : {{ selectedDishName }}</p>
              </div>
              <div class="p-5">
                <ReviewForm
                  :restaurant-id="restaurantId"
                  :dish-id="selectedDishId"
                  :dish-name="selectedDishName"
                  @success="handleReviewSuccess"
                  @cancel="showReviewForm = false"
                />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Tabs -->
      <div v-if="isAuthenticated" class="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-1.5">
        <button
          class="flex-1 rounded-xl py-3 text-sm font-semibold transition-all"
          :class="
            activeTab === 'restaurant'
              ? 'bg-white text-slate-800 shadow-md'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="handleTabChange('restaurant')"
        >
          Tous les avis
        </button>
        <button
          class="flex-1 rounded-xl py-3 text-sm font-semibold transition-all"
          :class="
            activeTab === 'my-reviews'
              ? 'bg-white text-slate-800 shadow-md'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="handleTabChange('my-reviews')"
        >
          Mes avis
        </button>
      </div>

      <!-- Filters as Chips -->
      <div v-if="activeTab === 'restaurant'" class="mb-6 space-y-4">
        <!-- Sort chips -->
        <div>
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Trier par</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              class="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all"
              :class="
                sortOption === option.value
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              "
              @click="sortOption = option.value; handleFilterChange()"
            >
              <span>{{ option.icon }}</span>
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Rating filter chips -->
        <div>
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Filtrer par note</p>
          <div class="flex flex-wrap gap-2">
            <button
              class="rounded-full px-4 py-2 text-sm font-medium transition-all"
              :class="
                ratingFilter === null
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              "
              @click="ratingFilter = null; handleFilterChange()"
            >
              Toutes
            </button>
            <button
              v-for="rating in [5, 4, 3, 2, 1]"
              :key="rating"
              class="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-all"
              :class="
                ratingFilter === rating
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              "
              @click="ratingFilter = rating; handleFilterChange()"
            >
              {{ rating }}
              <svg class="h-4 w-4" :class="ratingFilter === rating ? 'text-white' : 'text-amber-400'" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Results count -->
        <div v-if="pagination" class="flex items-center justify-between">
          <span class="text-sm text-slate-500">{{ pagination.total }} avis trouvés</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <div
          v-for="n in 3"
          :key="n"
          class="animate-pulse rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
          :style="{ animationDelay: `${n * 100}ms` }"
        >
          <div class="mb-4 flex items-center gap-3">
            <div class="h-12 w-12 rounded-full bg-slate-200"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 w-32 rounded bg-slate-200"></div>
              <div class="h-3 w-24 rounded bg-slate-200"></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-4 w-3/4 rounded bg-slate-200"></div>
            <div class="h-4 w-1/2 rounded bg-slate-200"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-red-100">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg class="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="mb-6 text-lg text-red-600">{{ error }}</p>
        <div class="flex justify-center gap-3">
          <button
            class="rounded-xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition-all hover:bg-slate-200"
            @click="router.back()"
          >
            Retour
          </button>
          <button
            v-if="restaurantId"
            class="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 font-medium text-white shadow-md transition-all hover:shadow-lg"
            @click="fetchReviews()"
          >
            Réessayer
          </button>
        </div>
      </div>

      <!-- Restaurant Reviews Tab -->
      <div v-else-if="activeTab === 'restaurant'">
        <!-- Featured Reviews Section -->
        <div v-if="featuredReviews.length > 0 && !ratingFilter" class="mb-8">
          <h3 class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </span>
            Avis en vedette
          </h3>
          <div class="space-y-4">
            <div
              v-for="(review, index) in featuredReviews"
              :key="review._id"
              class="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200/50"
              :style="{ animationDelay: `${index * 100}ms` }"
            >
              <div class="mb-3 flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white"
                  :class="getAvatarColor(review.customer?.name || '')"
                >
                  {{ getInitials(review.customer?.name || '') }}
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-800">{{ review.customer?.name || 'Client' }}</div>
                  <div class="flex items-center gap-2">
                    <div class="flex gap-0.5">
                      <svg v-for="i in 5" :key="i" class="h-4 w-4" :class="i <= review.rating ? 'text-amber-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <span class="text-xs text-slate-500">{{ new Date(review.createdAt).toLocaleDateString('fr-FR') }}</span>
                  </div>
                </div>
              </div>
              <p v-if="review.title" class="mb-1 font-medium text-slate-800">{{ review.title }}</p>
              <p class="text-sm text-slate-600">{{ review.comment }}</p>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="reviews.length === 0" class="rounded-2xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-100">
          <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
            <svg class="h-12 w-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-slate-800">Aucun avis</h2>
          <p class="mt-2 text-slate-500">Soyez le premier à donner votre avis !</p>
          <button
            v-if="isAuthenticated"
            class="mt-6 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:scale-105 hover:shadow-xl"
            @click="openReviewForm()"
          >
            Écrire un avis
          </button>
        </div>

        <!-- Reviews List -->
        <div v-else class="space-y-4">
          <h3 v-if="featuredReviews.length > 0 && !ratingFilter" class="text-lg font-bold text-slate-800">Tous les avis</h3>

          <ReviewCard
            v-for="(review, index) in reviews"
            :key="review._id"
            :review="review"
            :is-admin="false"
            :style="{ animationDelay: `${index * 50}ms` }"
            class="animate-fadeIn"
            @helpful="handleHelpful"
            @report="handleReport"
          />

          <!-- Load More -->
          <div v-if="hasMore" class="pt-4 text-center">
            <button
              :disabled="isLoadingMore"
              class="rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 px-8 py-3 font-medium text-slate-700 transition-all hover:from-slate-200 hover:to-slate-300 disabled:opacity-50"
              @click="fetchReviews(true)"
            >
              <span v-if="isLoadingMore" class="flex items-center justify-center gap-2">
                <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Chargement...
              </span>
              <span v-else>Voir plus d'avis</span>
            </button>
          </div>
        </div>
      </div>

      <!-- My Reviews Tab -->
      <div v-else-if="activeTab === 'my-reviews'">
        <!-- Empty State -->
        <div v-if="myReviews.length === 0 && !isLoading" class="rounded-2xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-100">
          <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100">
            <svg class="h-12 w-12 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-slate-800">Aucun avis</h2>
          <p class="mt-2 text-slate-500">Vous n'avez pas encore donné d'avis</p>
          <button
            class="mt-6 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:scale-105 hover:shadow-xl"
            @click="openReviewForm()"
          >
            Écrire mon premier avis
          </button>
        </div>

        <!-- My Reviews List -->
        <div v-else class="space-y-4">
          <div
            v-for="(review, index) in myReviews"
            :key="review._id"
            class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md"
            :style="{ animationDelay: `${index * 100}ms` }"
          >
            <!-- Review Header -->
            <div class="border-b border-slate-100 p-5">
              <div class="mb-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <StarRating :model-value="review.rating" :readonly="true" size="sm" />
                  <span
                    class="rounded-full px-3 py-1 text-xs font-semibold"
                    :class="{
                      'bg-amber-100 text-amber-700 ring-1 ring-amber-200': review.status === 'pending',
                      'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200': review.status === 'approved',
                      'bg-red-100 text-red-700 ring-1 ring-red-200': review.status === 'rejected',
                    }"
                  >
                    {{
                      review.status === 'pending'
                        ? 'En attente'
                        : review.status === 'approved'
                          ? 'Publié'
                          : 'Rejeté'
                    }}
                  </span>
                </div>
                <span class="text-sm text-slate-400">
                  {{ new Date(review.createdAt).toLocaleDateString('fr-FR') }}
                </span>
              </div>

              <!-- Dish info if applicable -->
              <div v-if="review.dish" class="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <img
                  v-if="review.dish.image"
                  :src="review.dish.image"
                  :alt="review.dish.name.fr"
                  class="h-12 w-12 rounded-lg object-cover"
                />
                <span class="font-medium text-slate-700">{{ review.dish.name.fr }}</span>
              </div>
            </div>

            <!-- Review Content -->
            <div class="p-5">
              <h4 v-if="review.title" class="mb-2 text-lg font-semibold text-slate-800">{{ review.title }}</h4>
              <p v-if="review.comment" class="text-slate-600">{{ review.comment }}</p>

              <!-- Images -->
              <div v-if="review.images && review.images.length > 0" class="mt-4 flex gap-2">
                <img
                  v-for="(image, idx) in review.images"
                  :key="idx"
                  :src="image.url"
                  :alt="`Photo ${idx + 1}`"
                  class="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200"
                />
              </div>

              <!-- Response -->
              <div
                v-if="review.response"
                class="mt-4 rounded-xl bg-teal-50 p-4 ring-1 ring-teal-200"
              >
                <div class="mb-2 flex items-center gap-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-xs text-white">R</div>
                  <p class="text-xs font-semibold text-teal-700">Réponse du restaurant</p>
                </div>
                <p class="text-sm text-slate-700">{{ review.response.content }}</p>
              </div>

              <!-- Rejection reason -->
              <div
                v-if="review.status === 'rejected' && review.rejectionReason"
                class="mt-4 rounded-xl bg-red-50 p-4 ring-1 ring-red-200"
              >
                <p class="mb-1 text-xs font-semibold text-red-700">Motif du rejet</p>
                <p class="text-sm text-slate-700">{{ review.rejectionReason }}</p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
                @click="handleDelete(review._id)"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>
            </div>
          </div>

          <!-- Load More My Reviews -->
          <div v-if="hasMoreMyReviews" class="pt-4 text-center">
            <button
              :disabled="isLoadingMore"
              class="rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-700 transition-all hover:bg-slate-200 disabled:opacity-50"
              @click="fetchMyReviews(true)"
            >
              Voir plus
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out forwards;
}
</style>
