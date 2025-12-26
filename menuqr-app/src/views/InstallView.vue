<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLocale } from '@/composables/useI18n';
import AppHeader from '@/components/common/AppHeader.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseIcon from '@/components/common/BaseIcon.vue';
import BaseAlert from '@/components/common/BaseAlert.vue';

const { t } = useLocale();

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isInstallable = ref(false);
const isInstalled = ref(false);
const isIOS = ref(false);
const isAndroid = ref(false);

onMounted(() => {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled.value = true;
  }

  // Detect platform
  const userAgent = window.navigator.userAgent.toLowerCase();
  isIOS.value = /iphone|ipad|ipod/.test(userAgent);
  isAndroid.value = /android/.test(userAgent);

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    isInstallable.value = true;
  });

  // Listen for successful install
  window.addEventListener('appinstalled', () => {
    isInstalled.value = true;
    deferredPrompt.value = null;
    isInstallable.value = false;
  });
});

const installApp = async () => {
  if (!deferredPrompt.value) {
    return;
  }

  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;

  if (outcome === 'accepted') {
    deferredPrompt.value = null;
    isInstallable.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <AppHeader :show-back="true" :title="t('install.title')" show-lang />

    <div class="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <!-- Already Installed Alert -->
      <BaseAlert v-if="isInstalled" variant="success">
        <strong>{{ t('install.already_installed.title') }}</strong>
        <p class="mt-1">{{ t('install.already_installed.text') }}</p>
      </BaseAlert>

      <!-- Install Button (Android/Desktop) -->
      <BaseCard v-if="isInstallable && !isInstalled">
        <div class="text-center py-6">
          <div
            class="w-24 h-24 mx-auto mb-4 bg-primary-100 rounded-2xl flex items-center justify-center"
          >
            <BaseIcon name="download" size="xl" class="w-16 h-16 text-primary-600" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            {{ t('install.ready.title') }}
          </h2>
          <p class="text-gray-600 mb-6">{{ t('install.ready.text') }}</p>
          <BaseButton variant="primary" size="lg" @click="installApp">
            <BaseIcon name="download" size="sm" />
            {{ t('install.ready.action') }}
          </BaseButton>
        </div>
      </BaseCard>

      <!-- iOS Instructions -->
      <BaseCard v-if="isIOS && !isInstalled">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ t('install.ios.title') }}
        </h2>
        <ol class="space-y-4">
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold"
            >
              1
            </div>
            <div class="flex-1 pt-1">
              <p class="text-gray-700">{{ t('install.ios.step1') }}</p>
              <div class="mt-2 flex items-center gap-2 text-primary-600">
                <BaseIcon name="share" size="md" />
                <span class="text-sm font-medium">{{ t('install.ios.share_button') }}</span>
              </div>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold"
            >
              2
            </div>
            <div class="flex-1 pt-1">
              <p class="text-gray-700">{{ t('install.ios.step2') }}</p>
              <div class="mt-2 flex items-center gap-2 text-primary-600">
                <BaseIcon name="plus" size="md" />
                <span class="text-sm font-medium">{{ t('install.ios.add_button') }}</span>
              </div>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold"
            >
              3
            </div>
            <div class="flex-1 pt-1">
              <p class="text-gray-700">{{ t('install.ios.step3') }}</p>
            </div>
          </li>
        </ol>
      </BaseCard>

      <!-- Android Instructions (Manual) -->
      <BaseCard v-if="isAndroid && !isInstallable && !isInstalled">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ t('install.android.title') }}
        </h2>
        <ol class="space-y-4">
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold"
            >
              1
            </div>
            <div class="flex-1 pt-1">
              <p class="text-gray-700">{{ t('install.android.step1') }}</p>
              <div class="mt-2 flex items-center gap-2 text-primary-600">
                <BaseIcon name="menu" size="md" />
                <span class="text-sm font-medium">⋮</span>
              </div>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold"
            >
              2
            </div>
            <div class="flex-1 pt-1">
              <p class="text-gray-700">{{ t('install.android.step2') }}</p>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold"
            >
              3
            </div>
            <div class="flex-1 pt-1">
              <p class="text-gray-700">{{ t('install.android.step3') }}</p>
            </div>
          </li>
        </ol>
      </BaseCard>

      <!-- Benefits Card -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ t('install.benefits.title') }}
        </h2>
        <ul class="space-y-3">
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <span class="text-gray-700">{{ t('install.benefits.offline') }}</span>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <span class="text-gray-700">{{ t('install.benefits.fast') }}</span>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <span class="text-gray-700">{{ t('install.benefits.homescreen') }}</span>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <span class="text-gray-700">{{ t('install.benefits.space') }}</span>
          </li>
        </ul>
      </BaseCard>
    </div>
  </div>
</template>
