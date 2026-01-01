<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Input as AInput,
  InputPassword as AInputPassword,
  Button as AButton,
  Alert as AAlert,
  Modal as AModal,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  LockOutlined,
  KeyOutlined,
  HomeOutlined,
} from '@ant-design/icons-vue';
import { useHotelGuestStore } from '@/stores/hotelGuestStore';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const router = useRouter();
const hotelGuestStore = useHotelGuestStore();
const { showToast } = useToast();

// State
const authMode = ref<'pin' | 'code'>('pin');
const roomNumber = ref('');
const pin = ref('');
const accessCode = ref('');
const isLoading = ref(false);
const error = ref('');

// Set PIN modal
const showSetPinModal = ref(false);
const newPin = ref('');
const confirmPin = ref('');
const isSettingPin = ref(false);

// Help modal
const showHelpModal = ref(false);

// Computed
const hotel = computed(() => hotelGuestStore.hotel);
const room = computed(() => hotelGuestStore.room);
const pinLength = computed(() => hotel.value?.settings?.guestAuth?.pinLength || 4);

const canSubmitPIN = computed(() => {
  return roomNumber.value.trim().length > 0 && pin.value.length === pinLength.value;
});

const canSubmitAccessCode = computed(() => {
  return accessCode.value.trim().length >= 6;
});

const canSetPin = computed(() => {
  return (
    newPin.value.length === pinLength.value &&
    confirmPin.value.length === pinLength.value &&
    newPin.value === confirmPin.value
  );
});

// Translation helper
function t(key: string, params?: Record<string, unknown>): string {
  const translations: Record<string, string> = {
    'hotel.signIn': 'Connexion',
    'hotel.pinAuth': 'Code PIN',
    'hotel.codeAuth': 'Code d\'accès',
    'hotel.roomNumber': 'Numéro de chambre',
    'hotel.roomNumberPlaceholder': 'Ex: 101',
    'hotel.pin': 'Code PIN',
    'hotel.pinPlaceholder': 'Entrez votre code PIN',
    'hotel.pinHint': `Code à ${params?.length || 4} chiffres`,
    'hotel.accessCode': 'Code d\'accès',
    'hotel.accessCodePlaceholder': 'Entrez votre code d\'accès',
    'hotel.accessCodeHint': 'Code reçu lors de votre check-in',
    'hotel.setPinTitle': 'Créer votre code PIN',
    'hotel.setPinDescription': 'Créez un code PIN pour accéder rapidement à votre compte pendant votre séjour.',
    'hotel.newPin': 'Nouveau code PIN',
    'hotel.newPinPlaceholder': 'Entrez un code PIN',
    'hotel.confirmPin': 'Confirmer le code PIN',
    'hotel.confirmPinPlaceholder': 'Confirmez votre code PIN',
    'hotel.setPin': 'Définir le PIN',
    'hotel.needHelp': 'Besoin d\'aide ?',
    'hotel.contactReception': 'Contacter la réception',
    'hotel.authSuccess': 'Connexion réussie',
    'hotel.pinSetSuccess': 'Code PIN défini avec succès',
    'hotel.pinMismatch': 'Les codes PIN ne correspondent pas',
  };
  return translations[key] || key;
}

function goBack() {
  if (hotel.value) {
    router.push({
      name: 'hotel-landing',
      params: { hotelSlug: hotel.value.slug },
    });
  } else {
    router.back();
  }
}

async function submitPIN() {
  if (!canSubmitPIN.value || !hotel.value) {return;}

  isLoading.value = true;
  error.value = '';

  try {
    const success = await hotelGuestStore.authenticateWithPIN(
      hotel.value.id,
      roomNumber.value,
      pin.value
    );

    if (success) {
      showToast(t('hotel.authSuccess'), 'success');
      // Redirect to menu
      router.push({
        name: 'hotel-menu',
        params: { hotelSlug: hotel.value.slug },
      });
    } else {
      error.value = hotelGuestStore.error || 'Authentication failed';
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
}

async function submitAccessCode() {
  if (!canSubmitAccessCode.value || !hotel.value) {return;}

  isLoading.value = true;
  error.value = '';

  try {
    const success = await hotelGuestStore.authenticateWithAccessCode(
      hotel.value.id,
      accessCode.value
    );

    if (success) {
      // Check if guest needs to set PIN
      showSetPinModal.value = true;
    } else {
      error.value = hotelGuestStore.error || 'Authentication failed';
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
}

async function submitSetPin() {
  if (!canSetPin.value) {
    error.value = t('hotel.pinMismatch');
    return;
  }

  isSettingPin.value = true;

  try {
    const success = await hotelGuestStore.setGuestPIN(newPin.value);

    if (success) {
      showToast(t('hotel.pinSetSuccess'), 'success');
      showSetPinModal.value = false;
      // Redirect to menu
      if (hotel.value) {
        router.push({
          name: 'hotel-menu',
          params: { hotelSlug: hotel.value.slug },
        });
      }
    } else {
      error.value = hotelGuestStore.error || 'Failed to set PIN';
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isSettingPin.value = false;
  }
}

onMounted(async () => {
  const hotelSlug = route.params.hotelSlug as string;

  // Load hotel data if not already loaded
  if (!hotel.value && hotelSlug) {
    await hotelGuestStore.getHotelBySlug(hotelSlug);
  }

  // Pre-fill room number if available
  if (room.value) {
    roomNumber.value = room.value.roomNumber;
  }
});
</script>

<template>
  <div class="hotel-auth">
    <!-- Header -->
    <div class="auth-header">
      <a-button type="text" @click="goBack">
        <template #icon><ArrowLeftOutlined /></template>
      </a-button>
      <h1>{{ t('hotel.signIn') }}</h1>
      <div style="width: 32px" />
    </div>

    <!-- Hotel Info -->
    <div v-if="hotel" class="hotel-mini-info">
      <img
        v-if="hotel.logo"
        :src="hotel.logo"
        :alt="hotel.name"
        class="hotel-mini-logo"
      />
      <span class="hotel-mini-name">{{ hotel.name }}</span>
    </div>

    <!-- Auth Mode Tabs -->
    <div class="auth-tabs">
      <button
        :class="['auth-tab', { active: authMode === 'pin' }]"
        @click="authMode = 'pin'"
      >
        <LockOutlined />
        {{ t('hotel.pinAuth') }}
      </button>
      <button
        :class="['auth-tab', { active: authMode === 'code' }]"
        @click="authMode = 'code'"
      >
        <KeyOutlined />
        {{ t('hotel.codeAuth') }}
      </button>
    </div>

    <!-- PIN Authentication -->
    <div v-if="authMode === 'pin'" class="auth-form">
      <div class="form-group">
        <label>{{ t('hotel.roomNumber') }}</label>
        <a-input
          v-model:value="roomNumber"
          size="large"
          :placeholder="t('hotel.roomNumberPlaceholder')"
          :disabled="!!room"
        >
          <template #prefix><HomeOutlined /></template>
        </a-input>
      </div>

      <div class="form-group">
        <label>{{ t('hotel.pin') }}</label>
        <div class="pin-input-container">
          <a-input-password
            v-model:value="pin"
            size="large"
            :maxlength="pinLength"
            :placeholder="t('hotel.pinPlaceholder')"
            @pressEnter="submitPIN"
          >
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </div>
        <p class="pin-hint">{{ t('hotel.pinHint', { length: pinLength }) }}</p>
      </div>

      <a-button
        type="primary"
        size="large"
        block
        :loading="isLoading"
        :disabled="!canSubmitPIN"
        @click="submitPIN"
      >
        {{ t('hotel.signIn') }}
      </a-button>
    </div>

    <!-- Access Code Authentication -->
    <div v-else class="auth-form">
      <div class="form-group">
        <label>{{ t('hotel.accessCode') }}</label>
        <a-input
          v-model:value="accessCode"
          size="large"
          :placeholder="t('hotel.accessCodePlaceholder')"
          @pressEnter="submitAccessCode"
        >
          <template #prefix><KeyOutlined /></template>
        </a-input>
        <p class="code-hint">{{ t('hotel.accessCodeHint') }}</p>
      </div>

      <a-button
        type="primary"
        size="large"
        block
        :loading="isLoading"
        :disabled="!canSubmitAccessCode"
        @click="submitAccessCode"
      >
        {{ t('hotel.signIn') }}
      </a-button>
    </div>

    <!-- Error Message -->
    <a-alert
      v-if="error"
      type="error"
      :message="error"
      show-icon
      closable
      class="error-alert"
      @close="error = ''"
    />

    <!-- Set PIN Modal -->
    <a-modal
      v-model:open="showSetPinModal"
      :title="t('hotel.setPinTitle')"
      :closable="false"
      :maskClosable="false"
    >
      <p class="set-pin-description">{{ t('hotel.setPinDescription') }}</p>

      <div class="form-group">
        <label>{{ t('hotel.newPin') }}</label>
        <a-input-password
          v-model:value="newPin"
          size="large"
          :maxlength="pinLength"
          :placeholder="t('hotel.newPinPlaceholder')"
        />
      </div>

      <div class="form-group">
        <label>{{ t('hotel.confirmPin') }}</label>
        <a-input-password
          v-model:value="confirmPin"
          size="large"
          :maxlength="pinLength"
          :placeholder="t('hotel.confirmPinPlaceholder')"
        />
      </div>

      <template #footer>
        <a-button
          type="primary"
          :loading="isSettingPin"
          :disabled="!canSetPin"
          @click="submitSetPin"
        >
          {{ t('hotel.setPin') }}
        </a-button>
      </template>
    </a-modal>

    <!-- Help Section -->
    <div class="help-section">
      <p>{{ t('hotel.needHelp') }}</p>
      <a-button type="link" @click="showHelpModal = true">
        {{ t('hotel.contactReception') }}
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.hotel-auth {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 32px;
}

.auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.auth-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.hotel-mini-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: white;
  margin-bottom: 16px;
}

.hotel-mini-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 8px;
}

.hotel-mini-name {
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
}

.auth-tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px;
  margin-bottom: 24px;
}

.auth-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-tab:hover {
  border-color: #14b8a6;
  color: #14b8a6;
}

.auth-tab.active {
  border-color: #14b8a6;
  background: #e6fffb;
  color: #14b8a6;
}

.auth-form {
  padding: 0 16px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #1a1a1a;
}

.form-group :deep(.ant-input-affix-wrapper) {
  border-radius: 12px;
}

.pin-input-container :deep(.ant-input) {
  letter-spacing: 8px;
  font-size: 20px;
  text-align: center;
}

.pin-hint,
.code-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: #888;
}

.auth-form .ant-btn-primary {
  height: 48px;
  font-size: 16px;
  border-radius: 24px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
  margin-top: 8px;
}

.error-alert {
  margin: 16px;
}

.set-pin-description {
  color: #666;
  margin-bottom: 20px;
}

.help-section {
  text-align: center;
  padding: 24px 16px;
  margin-top: 32px;
}

.help-section p {
  margin: 0 0 8px;
  color: #666;
}

.help-section .ant-btn-link {
  color: #14b8a6;
  font-weight: 500;
}
</style>
