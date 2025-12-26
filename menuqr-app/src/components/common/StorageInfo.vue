<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useStorageManager } from '@/composables/useStorageManager';
import { useLocale } from '@/composables/useI18n';

const { t } = useLocale();
const storage = useStorageManager();

const showDetails = ref(false);
const isClearing = ref(false);

const handleClearCache = async () => {
  // eslint-disable-next-line no-alert
  if (!confirm(t('storage.confirmClear'))) {
    return;
  }

  isClearing.value = true;
  try {
    await storage.clearAllCaches();
    await storage.refreshStats();
  } finally {
    isClearing.value = false;
  }
};

const handleCleanup = async () => {
  isClearing.value = true;
  try {
    await storage.cleanupOldCaches();
  } finally {
    isClearing.value = false;
  }
};

onMounted(() => {
  storage.refreshStats();
});
</script>

<template>
  <div class="storage-info">
    <!-- Header -->
    <div class="storage-header">
      <div class="storage-icon">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      </div>
      <div class="storage-title">
        <h3>{{ t('storage.title') }}</h3>
        <p class="storage-subtitle">{{ t('storage.subtitle') }}</p>
      </div>
      <button class="toggle-btn" @click="showDetails = !showDetails" :aria-expanded="showDetails">
        <svg
          class="w-5 h-5 transition-transform duration-200"
          :class="{ 'rotate-180': showDetails }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>

    <!-- Storage Bar -->
    <div class="storage-bar-container">
      <div class="storage-bar">
        <div
          class="storage-bar-fill"
          :class="{
            'storage-bar-fill--warning': storage.isQuotaWarning.value,
            'storage-bar-fill--critical': storage.isQuotaCritical.value,
          }"
          :style="{ width: `${storage.storageStats.value?.percentage || 0}%` }"
        />
      </div>
      <div class="storage-labels">
        <span>{{ storage.formattedUsage.value }} {{ t('storage.used') }}</span>
        <span>{{ storage.formattedAvailable.value }} {{ t('storage.available') }}</span>
      </div>
    </div>

    <!-- Warning Message -->
    <div v-if="storage.isQuotaWarning.value" class="storage-warning">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>
        {{ storage.isQuotaCritical.value ? t('storage.critical') : t('storage.warning') }}
      </span>
    </div>

    <!-- Details Panel -->
    <Transition name="slide">
      <div v-if="showDetails" class="storage-details">
        <!-- Cache List -->
        <div v-if="storage.cacheInfos.value.length > 0" class="cache-list">
          <h4>{{ t('storage.caches') }}</h4>
          <ul>
            <li v-for="cache in storage.cacheInfos.value" :key="cache.name">
              <span class="cache-name">{{ cache.name.replace('menuqr-', '') }}</span>
              <span class="cache-stats">
                {{ cache.entries }} {{ t('storage.entries') }} ·
                {{ storage.formatBytes(cache.size) }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Last Cleanup -->
        <div v-if="storage.lastCleanup.value" class="last-cleanup">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {{ t('storage.lastCleanup') }}:
            {{ storage.lastCleanup.value.toLocaleString() }}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="storage-actions">
          <button
            class="btn btn--secondary"
            :disabled="isClearing || storage.isLoading.value"
            @click="handleCleanup"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {{ t('storage.cleanup') }}
          </button>
          <button
            class="btn btn--danger"
            :disabled="isClearing || storage.isLoading.value"
            @click="handleClearCache"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {{ t('storage.clearAll') }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Loading Overlay -->
    <div v-if="storage.isLoading.value || isClearing" class="storage-loading">
      <div class="spinner" />
    </div>
  </div>
</template>

<style scoped>
.storage-info {
  position: relative;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}

.storage-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.storage-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: #f3f4f6;
  border-radius: 0.5rem;
  color: #6b7280;
}

.storage-title {
  flex: 1;
}

.storage-title h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.storage-subtitle {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
}

.toggle-btn {
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: #6b7280;
  transition: all 150ms ease;
}

.toggle-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.storage-bar-container {
  margin-top: 1rem;
}

.storage-bar {
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.storage-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  border-radius: 9999px;
  transition: width 300ms ease;
}

.storage-bar-fill--warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.storage-bar-fill--critical {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.storage-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.storage-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: #fef3c7;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: #92400e;
}

.storage-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.cache-list h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.cache-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cache-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
}

.cache-name {
  color: #111827;
  font-family: monospace;
  font-size: 0.75rem;
}

.cache-stats {
  color: #6b7280;
}

.last-cleanup {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.storage-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  flex: 1;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 150ms ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn--secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn--danger {
  background: #fef2f2;
  color: #dc2626;
}

.btn--danger:hover:not(:disabled) {
  background: #fee2e2;
}

.storage-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0.75rem;
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid #e5e7eb;
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 200ms ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
