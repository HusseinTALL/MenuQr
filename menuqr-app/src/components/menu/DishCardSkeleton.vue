<script setup lang="ts">
// Skeleton loader for DishCard component
// Mimics the structure and dimensions of DishCard.vue with premium shimmer effect
</script>

<template>
  <article class="skeleton-card overflow-hidden rounded-2xl bg-white">
    <!-- Image Skeleton -->
    <div class="relative aspect-[4/3] overflow-hidden">
      <div class="skeleton-shimmer absolute inset-0 bg-neutral-100" />

      <!-- Badge placeholder -->
      <div class="absolute left-3 top-3">
        <div class="skeleton-shimmer h-[22px] w-16 rounded-full bg-neutral-200" />
      </div>

      <!-- Time badge placeholder -->
      <div class="absolute bottom-3 left-3">
        <div class="skeleton-shimmer h-6 w-14 rounded-full bg-neutral-200" />
      </div>
    </div>

    <!-- Content Skeleton -->
    <div class="p-4">
      <!-- Title -->
      <div class="skeleton-shimmer h-[18px] w-3/4 rounded-md bg-neutral-200" />

      <!-- Description lines -->
      <div class="mt-2.5 space-y-1.5">
        <div class="skeleton-shimmer h-3.5 w-full rounded bg-neutral-100" />
        <div class="skeleton-shimmer h-3.5 w-4/5 rounded bg-neutral-100" />
      </div>

      <!-- Dietary icons placeholder -->
      <div class="mt-3 flex items-center gap-1.5">
        <div class="skeleton-shimmer h-[22px] w-[22px] rounded-md bg-neutral-100" />
        <div class="skeleton-shimmer h-[22px] w-[22px] rounded-md bg-neutral-100" />
      </div>

      <!-- Price & Add Button -->
      <div class="mt-4 flex items-center justify-between pt-2">
        <div class="skeleton-shimmer h-5 w-20 rounded-md bg-neutral-200" />
        <div class="skeleton-shimmer h-[42px] w-[42px] rounded-xl bg-neutral-200" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.skeleton-card {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.04);
}

.skeleton-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
  pointer-events: none;
}

.skeleton-shimmer {
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 20%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.4) 80%,
    transparent 100%
  );
  animation: shimmer 1.8s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
