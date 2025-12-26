<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseIcon from '@/components/common/BaseIcon.vue';

const router = useRouter();
const { t } = useI18n();

const goHome = () => {
  router.push('/menu');
};

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <!-- 404 Illustration -->
      <div class="mb-8">
        <div class="text-9xl font-bold text-primary-500 mb-4">404</div>
        <div class="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
          <BaseIcon name="search" size="xl" class="w-20 h-20 text-gray-400" />
        </div>
      </div>

      <!-- Message -->
      <h1 class="text-3xl font-bold text-gray-900 mb-3">
        {{ t('notFound.title') }}
      </h1>
      <p class="text-gray-600 mb-8">
        {{ t('notFound.message') }}
      </p>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <BaseButton variant="outline" @click="goBack">
          <BaseIcon name="chevron-left" size="sm" />
          {{ t('notFound.goBack') }}
        </BaseButton>
        <BaseButton variant="primary" @click="goHome">
          <BaseIcon name="home" size="sm" />
          {{ t('notFound.goHome') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
