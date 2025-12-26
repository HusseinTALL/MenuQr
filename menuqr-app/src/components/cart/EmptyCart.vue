<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseIcon from '@/components/common/BaseIcon.vue';

const router = useRouter();
const { t } = useI18n();
const goToMenu = () => {
  router.push('/menu');
};
</script>
<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] py-16 px-6 text-center">
    <!-- Illustration Icon -->
    <div class="relative mb-10">
      <div
        class="w-40 h-40 rounded-full bg-gray-100/80 flex items-center justify-center shadow-inner"
      >
        <BaseIcon class="w-24 h-24 text-gray-300" name="cart" size="xl" />
      </div>
      <!-- Subtle accent ring -->
      <div
        class="absolute inset-0 rounded-full ring-8 ring-primary-100/50 -z-10 animate-pulse"
      ></div>
    </div>
    <!-- Title & Message -->
    <h3 class="text-2xl font-bold text-gray-900 mb-3">{{ t('cart.empty') }}</h3>
    <p class="text-base text-gray-600 max-w-sm mx-auto leading-relaxed">
      {{ t('cart.emptyMessage') }}
    </p>
    <!-- CTA Button -->
    <BaseButton
      class="mt-10 px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
      size="lg"
      variant="primary"
      @click="goToMenu"
    >
      {{ t('cart.addItems') }}
    </BaseButton>
  </div>
</template>
