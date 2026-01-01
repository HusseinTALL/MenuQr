<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  SettingOutlined,
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  BellOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';

// ============ STATE ============
const isLoading = ref(true);
const isSaving = ref(false);
const activeTab = ref('general');
const hotelId = ref<string | null>(null);

const hotelData = reactive({
  name: '',
  slug: '',
  description: { fr: '', en: '' },
  logo: '',
  coverImage: '',
  starRating: 4,
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
  },
  phone: '',
  email: '',
  website: '',
});

const settingsData = reactive({
  currency: 'EUR',
  timezone: 'Europe/Paris',
  defaultLanguage: 'fr',
  availableLanguages: ['fr', 'en'],
  roomService: {
    enabled: true,
    availableHours: { start: '06:00', end: '23:00' },
    minimumOrder: 0,
    deliveryFee: 0,
    serviceChargePercent: 0,
  },
  notifications: {
    orderEmail: true,
    orderSms: false,
    orderPush: true,
    lowStockAlert: true,
  },
  payment: {
    roomCharge: true,
    cardOnDelivery: true,
    onlinePayment: false,
    cashOnDelivery: true,
  },
});

const tabs = [
  { key: 'general', label: 'General', icon: BankOutlined },
  { key: 'contact', label: 'Contact', icon: PhoneOutlined },
  { key: 'roomservice', label: 'Room Service', icon: ClockCircleOutlined },
  { key: 'payment', label: 'Paiement', icon: DollarOutlined },
  { key: 'notifications', label: 'Notifications', icon: BellOutlined },
];

const currencies = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
];

const timezones = [
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'America/New_York', label: 'New York (EST)' },
];

const languages = [
  { value: 'fr', label: 'Francais' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espanol' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ar', label: 'Arabic' },
];

// ============ DATA LOADING ============
async function loadHotel() {
  isLoading.value = true;
  try {
    const res = await api.getMyHotel();
    if (res.success && res.data) {
      hotelId.value = res.data.id;

      // Populate hotel data
      Object.assign(hotelData, {
        name: res.data.name || '',
        slug: res.data.slug || '',
        description: res.data.description || { fr: '', en: '' },
        logo: res.data.logo || '',
        coverImage: res.data.coverImage || '',
        starRating: res.data.starRating || 4,
        address: res.data.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'France',
        },
        phone: res.data.phone || '',
        email: res.data.email || '',
        website: res.data.website || '',
      });

      // Populate settings
      const settings = res.data.settings || {};
      Object.assign(settingsData, {
        currency: settings.currency || 'EUR',
        timezone: settings.timezone || 'Europe/Paris',
        defaultLanguage: settings.defaultLanguage || 'fr',
        availableLanguages: settings.availableLanguages || ['fr', 'en'],
        roomService: settings.roomService || {
          enabled: true,
          availableHours: { start: '06:00', end: '23:00' },
          minimumOrder: 0,
          deliveryFee: 0,
          serviceChargePercent: 0,
        },
        notifications: settings.notifications || {
          orderEmail: true,
          orderSms: false,
          orderPush: true,
          lowStockAlert: true,
        },
        payment: settings.payment || {
          roomCharge: true,
          cardOnDelivery: true,
          onlinePayment: false,
          cashOnDelivery: true,
        },
      });
    }
  } catch (e) {
    console.error('Error loading hotel:', e);
    message.error('Erreur lors du chargement');
  } finally {
    isLoading.value = false;
  }
}

async function saveSettings() {
  if (!hotelId.value) {return;}

  isSaving.value = true;
  try {
    const payload = {
      ...hotelData,
      settings: settingsData,
    };

    const res = await api.updateHotel(hotelId.value, payload);
    if (res.success) {
      message.success('Parametres sauvegardes');
    } else {
      message.error('Erreur lors de la sauvegarde');
    }
  } catch (e) {
    console.error('Save error:', e);
    message.error('Erreur lors de la sauvegarde');
  } finally {
    isSaving.value = false;
  }
}

// ============ LIFECYCLE ============
onMounted(() => {
  loadHotel();
});
</script>

<template>
  <div class="hotel-settings-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>
          <SettingOutlined class="header-icon" />
          Parametres
        </h1>
        <p class="header-subtitle">Configurez votre hotel</p>
      </div>
      <div class="header-actions">
        <a-button type="primary" :loading="isSaving" @click="saveSettings">
          <template #icon><SaveOutlined /></template>
          Sauvegarder
        </a-button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Settings Content -->
    <div v-else class="settings-content">
      <!-- Tabs -->
      <div class="settings-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-item', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" />
          <span>{{ tab.label }}</span>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- General Settings -->
        <div v-if="activeTab === 'general'" class="settings-section">
          <h3>Informations generales</h3>

          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="Nom de l'hotel" required>
                  <a-input v-model:value="hotelData.name" size="large" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Slug (URL)">
                  <a-input v-model:value="hotelData.slug" size="large" disabled />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="Description (FR)">
                  <a-textarea v-model:value="hotelData.description.fr" :rows="3" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Description (EN)">
                  <a-textarea v-model:value="hotelData.description.en" :rows="3" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="Classification (etoiles)">
                  <a-rate v-model:value="hotelData.starRating" :count="5" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-divider />

            <h4>Localisation</h4>
            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item label="Adresse">
                  <a-input v-model:value="hotelData.address.street" size="large" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="8">
                <a-form-item label="Ville">
                  <a-input v-model:value="hotelData.address.city" size="large" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="Code postal">
                  <a-input v-model:value="hotelData.address.postalCode" size="large" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="Pays">
                  <a-input v-model:value="hotelData.address.country" size="large" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-divider />

            <h4>Preferences</h4>
            <a-row :gutter="24">
              <a-col :span="8">
                <a-form-item label="Devise">
                  <a-select v-model:value="settingsData.currency" size="large">
                    <a-select-option v-for="c in currencies" :key="c.value" :value="c.value">
                      {{ c.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="Fuseau horaire">
                  <a-select v-model:value="settingsData.timezone" size="large">
                    <a-select-option v-for="t in timezones" :key="t.value" :value="t.value">
                      {{ t.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="Langue par defaut">
                  <a-select v-model:value="settingsData.defaultLanguage" size="large">
                    <a-select-option v-for="l in languages" :key="l.value" :value="l.value">
                      {{ l.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="Langues disponibles">
              <a-checkbox-group v-model:value="settingsData.availableLanguages">
                <a-checkbox v-for="l in languages" :key="l.value" :value="l.value">
                  {{ l.label }}
                </a-checkbox>
              </a-checkbox-group>
            </a-form-item>
          </a-form>
        </div>

        <!-- Contact Settings -->
        <div v-if="activeTab === 'contact'" class="settings-section">
          <h3>Coordonnees</h3>

          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="Telephone">
                  <a-input v-model:value="hotelData.phone" size="large">
                    <template #prefix><PhoneOutlined /></template>
                  </a-input>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Email">
                  <a-input v-model:value="hotelData.email" size="large">
                    <template #prefix><MailOutlined /></template>
                  </a-input>
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="Site web">
                  <a-input v-model:value="hotelData.website" size="large">
                    <template #prefix><GlobalOutlined /></template>
                  </a-input>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>

        <!-- Room Service Settings -->
        <div v-if="activeTab === 'roomservice'" class="settings-section">
          <h3>Configuration Room Service</h3>

          <a-form layout="vertical">
            <a-form-item>
              <a-switch v-model:checked="settingsData.roomService.enabled" />
              <span class="switch-label">Room service active</span>
            </a-form-item>

            <template v-if="settingsData.roomService.enabled">
              <a-divider />

              <h4>Horaires de disponibilite</h4>
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="Ouverture">
                    <a-input
                      v-model:value="settingsData.roomService.availableHours.start"
                      type="time"
                      size="large"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Fermeture">
                    <a-input
                      v-model:value="settingsData.roomService.availableHours.end"
                      type="time"
                      size="large"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-divider />

              <h4>Tarification</h4>
              <a-row :gutter="24">
                <a-col :span="8">
                  <a-form-item label="Commande minimum (EUR)">
                    <a-input-number
                      v-model:value="settingsData.roomService.minimumOrder"
                      :min="0"
                      size="large"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="Frais de livraison (EUR)">
                    <a-input-number
                      v-model:value="settingsData.roomService.deliveryFee"
                      :min="0"
                      size="large"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="Service (%)">
                    <a-input-number
                      v-model:value="settingsData.roomService.serviceChargePercent"
                      :min="0"
                      :max="30"
                      size="large"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </template>
          </a-form>
        </div>

        <!-- Payment Settings -->
        <div v-if="activeTab === 'payment'" class="settings-section">
          <h3>Methodes de paiement</h3>

          <a-form layout="vertical">
            <div class="payment-option">
              <a-switch v-model:checked="settingsData.payment.roomCharge" />
              <div class="option-info">
                <span class="option-label">Facturation chambre</span>
                <span class="option-desc">Ajouter a la note de la chambre</span>
              </div>
            </div>

            <div class="payment-option">
              <a-switch v-model:checked="settingsData.payment.cardOnDelivery" />
              <div class="option-info">
                <span class="option-label">Carte a la livraison</span>
                <span class="option-desc">Paiement par carte lors de la livraison</span>
              </div>
            </div>

            <div class="payment-option">
              <a-switch v-model:checked="settingsData.payment.cashOnDelivery" />
              <div class="option-info">
                <span class="option-label">Especes a la livraison</span>
                <span class="option-desc">Paiement en especes lors de la livraison</span>
              </div>
            </div>

            <div class="payment-option">
              <a-switch v-model:checked="settingsData.payment.onlinePayment" />
              <div class="option-info">
                <span class="option-label">Paiement en ligne</span>
                <span class="option-desc">Paiement par carte lors de la commande</span>
              </div>
            </div>
          </a-form>
        </div>

        <!-- Notifications Settings -->
        <div v-if="activeTab === 'notifications'" class="settings-section">
          <h3>Notifications</h3>

          <a-form layout="vertical">
            <div class="notification-option">
              <a-switch v-model:checked="settingsData.notifications.orderEmail" />
              <div class="option-info">
                <span class="option-label">Notifications par email</span>
                <span class="option-desc">Recevoir les nouvelles commandes par email</span>
              </div>
            </div>

            <div class="notification-option">
              <a-switch v-model:checked="settingsData.notifications.orderSms" />
              <div class="option-info">
                <span class="option-label">Notifications SMS</span>
                <span class="option-desc">Recevoir les nouvelles commandes par SMS</span>
              </div>
            </div>

            <div class="notification-option">
              <a-switch v-model:checked="settingsData.notifications.orderPush" />
              <div class="option-info">
                <span class="option-label">Notifications push</span>
                <span class="option-desc">Notifications sur le tableau de bord</span>
              </div>
            </div>

            <div class="notification-option">
              <a-switch v-model:checked="settingsData.notifications.lowStockAlert" />
              <div class="option-info">
                <span class="option-label">Alertes stock bas</span>
                <span class="option-desc">Notification quand un plat est en rupture</span>
              </div>
            </div>
          </a-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotel-settings-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #6366f1;
}

.header-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.settings-content {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  min-height: calc(100vh - 200px);
}

/* Tabs */
.settings-tabs {
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  height: fit-content;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  color: #64748b;
  font-weight: 500;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.tab-item:hover {
  background: #f8fafc;
  color: #1e293b;
}

.tab-item.active {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.tab-item .anticon {
  font-size: 18px;
}

/* Tab Content */
.tab-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.settings-section h3 {
  margin: 0 0 24px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.settings-section h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.switch-label {
  margin-left: 12px;
  font-size: 14px;
  color: #1e293b;
}

/* Payment & Notification Options */
.payment-option,
.notification-option {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 12px;
}

.option-info {
  display: flex;
  flex-direction: column;
}

.option-label {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 2px;
}

.option-desc {
  font-size: 13px;
  color: #64748b;
}

@media (max-width: 768px) {
  .settings-content {
    grid-template-columns: 1fr;
  }

  .settings-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tab-item {
    margin-bottom: 0;
  }
}
</style>
