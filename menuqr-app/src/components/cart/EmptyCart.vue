<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Button, Empty } from 'ant-design-vue';
import { ShoppingCartOutlined } from '@ant-design/icons-vue';

/**
 * EmptyCart - Displayed when cart has no items
 * Shows illustration and CTA to go back to menu
 */
const router = useRouter();
const { t } = useI18n();

const goToMenu = () => {
  router.push('/menu');
};
</script>

<template>
  <div class="empty-cart">
    <!-- Custom Empty State -->
    <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" :description="false" class="empty-cart__illustration">
      <template #image>
        <div class="empty-cart__icon-wrapper">
          <ShoppingCartOutlined class="empty-cart__icon" />
        </div>
      </template>
    </Empty>

    <!-- Title & Message -->
    <h3 class="empty-cart__title">{{ t('cart.empty') }}</h3>
    <p class="empty-cart__message">{{ t('cart.emptyMessage') }}</p>

    <!-- CTA Button -->
    <Button type="primary" size="large" class="empty-cart__cta" @click="goToMenu">
      {{ t('cart.addItems') }}
    </Button>
  </div>
</template>

<style scoped>
.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 64px 24px;
  text-align: center;
}

.empty-cart__illustration {
  margin-bottom: 24px;
}

.empty-cart__icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.06);
}

.empty-cart__icon-wrapper::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(20, 184, 166, 0.05) 100%);
  animation: pulse 2s ease-in-out infinite;
}

.empty-cart__icon {
  font-size: 72px;
  color: #d4d4d4;
}

.empty-cart__title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.empty-cart__message {
  margin: 0;
  max-width: 320px;
  font-size: 16px;
  line-height: 1.5;
  color: #6b7280;
}

.empty-cart__cta {
  margin-top: 40px;
  height: 52px;
  padding: 0 40px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 14px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(20, 184, 166, 0.35);
  transition: all 0.2s ease;
}

.empty-cart__cta:hover {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.45);
}

.empty-cart__cta:active {
  transform: scale(0.97);
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}
</style>
