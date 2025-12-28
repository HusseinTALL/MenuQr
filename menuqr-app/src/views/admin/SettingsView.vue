<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api, { type Restaurant } from '@/services/api';
import { useAdminAuthStore } from '@/stores/adminAuth';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import {
  SettingOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  CopyOutlined,
  SaveOutlined,
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  LinkOutlined,
  EnvironmentOutlined,
  TableOutlined,
  BellOutlined,
  QrcodeOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';

const authStore = useAdminAuthStore();

const menuUrl = computed(() => {
  if (!restaurant.value) {return '';}
  return `${window.location.origin}/r/${restaurant.value.slug}`;
});

const copyMenuUrl = async () => {
  try {
    await navigator.clipboard.writeText(menuUrl.value);
    message.success('URL copiée dans le presse-papiers');
  } catch {
    console.error('Failed to copy:', err);
    message.error('Erreur lors de la copie');
  }
};

const isLoading = ref(true);
const isSaving = ref(false);
const error = ref<string | null>(null);
const restaurant = ref<Restaurant | null>(null);
const activeTab = ref('general');

const daysOfWeek = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

const formData = ref({
  name: '',
  description: '',
  phone: '',
  email: '',
  website: '',
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
  },
  openingHours: daysOfWeek.map((day) => ({
    day: day.value,
    open: dayjs('11:00', 'HH:mm'),
    close: dayjs('22:00', 'HH:mm'),
    isClosed: false,
  })),
  settings: {
    currency: 'EUR',
    timezone: 'Europe/Paris',
    defaultLanguage: 'fr',
    availableLanguages: ['fr', 'en'],
    orderNotifications: true,
    autoAcceptOrders: false,
    tablePrefix: 'Table',
    tableCount: 20,
  },
});

// Profile form state
const profileForm = ref({
  name: authStore.user?.name || '',
  email: authStore.user?.email || '',
});
const isSavingProfile = ref(false);

// Password form state
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const isChangingPassword = ref(false);

// Password validation
const passwordErrors = computed(() => {
  const errors: string[] = [];
  const pwd = passwordForm.value.newPassword;

  if (pwd.length > 0) {
    if (pwd.length < 8) {errors.push('Minimum 8 caracteres');}
    if (!/[0-9]/.test(pwd)) {errors.push('Au moins 1 chiffre');}
    if (!/[A-Z]/.test(pwd)) {errors.push('Au moins 1 majuscule');}
  }

  return errors;
});

const passwordStrength = computed(() => {
  const pwd = passwordForm.value.newPassword;
  if (pwd.length === 0) {return 0;}
  let score = 0;
  if (pwd.length >= 8) {score++;}
  if (/[0-9]/.test(pwd)) {score++;}
  if (/[A-Z]/.test(pwd)) {score++;}
  if (/[^a-zA-Z0-9]/.test(pwd)) {score++;}
  return score;
});

const isPasswordValid = computed(() => {
  return passwordErrors.value.length === 0 &&
         passwordForm.value.newPassword.length >= 8 &&
         passwordForm.value.newPassword === passwordForm.value.confirmPassword &&
         passwordForm.value.currentPassword.length > 0;
});

// Get role label
const getRoleLabel = (role: string) => {
  const roles: Record<string, string> = {
    owner: 'Proprietaire',
    admin: 'Administrateur',
    manager: 'Manager',
    staff: 'Personnel',
  };
  return roles[role] || role;
};

// Save profile
const handleSaveProfile = async () => {
  if (!profileForm.value.name.trim()) {
    message.error('Le nom est requis');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (profileForm.value.email && !emailRegex.test(profileForm.value.email)) {
    message.error('Email invalide');
    return;
  }

  isSavingProfile.value = true;

  try {
    const success = await authStore.updateProfile({
      name: profileForm.value.name.trim(),
      email: profileForm.value.email.trim() || undefined,
    });

    if (success) {
      message.success('Profil mis a jour avec succes');
    } else {
      message.error(authStore.error || 'Erreur lors de la mise a jour');
    }
  } catch {
    message.error('Erreur lors de la mise a jour du profil');
  } finally {
    isSavingProfile.value = false;
  }
};

// Change password
const handleChangePassword = async () => {
  if (!isPasswordValid.value) {
    message.error('Veuillez corriger les erreurs du formulaire');
    return;
  }

  isChangingPassword.value = true;

  try {
    const success = await authStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    );

    if (success) {
      message.success('Mot de passe change avec succes');
      // Clear form
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      };
    } else {
      message.error(authStore.error || 'Erreur lors du changement de mot de passe');
    }
  } catch {
    message.error('Erreur lors du changement de mot de passe');
  } finally {
    isChangingPassword.value = false;
  }
};

const fetchRestaurant = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await api.getMyRestaurant();
    if (response.success && response.data) {
      restaurant.value = response.data;
      populateForm(response.data);
    }
  } catch {
    console.log('No restaurant found, allowing creation');
  } finally {
    isLoading.value = false;
  }
};

const populateForm = (data: Restaurant) => {
  formData.value.name = data.name;
  formData.value.description = data.description || '';
  formData.value.phone = data.phone || '';
  formData.value.email = data.email || '';
  formData.value.website = data.website || '';

  if (data.address) {
    formData.value.address = {
      street: data.address.street || '',
      city: data.address.city || '',
      postalCode: data.address.postalCode || '',
      country: data.address.country || 'France',
    };
  }

  if (data.openingHours?.length) {
    formData.value.openingHours = daysOfWeek.map((day) => {
      const existing = data.openingHours?.find((h) => h.day === day.value);
      return {
        day: day.value,
        open: existing ? dayjs(existing.open, 'HH:mm') : dayjs('11:00', 'HH:mm'),
        close: existing ? dayjs(existing.close, 'HH:mm') : dayjs('22:00', 'HH:mm'),
        isClosed: existing?.isClosed ?? false,
      };
    });
  }

  if (data.settings) {
    formData.value.settings = {
      currency: data.settings.currency || 'EUR',
      timezone: data.settings.timezone || 'Europe/Paris',
      defaultLanguage: data.settings.defaultLanguage || 'fr',
      availableLanguages: data.settings.availableLanguages || ['fr', 'en'],
      orderNotifications: data.settings.orderNotifications ?? true,
      autoAcceptOrders: data.settings.autoAcceptOrders ?? false,
      tablePrefix: data.settings.tablePrefix || 'Table',
      tableCount: data.settings.tableCount || 20,
    };
  }
};

const handleSubmit = async () => {
  isSaving.value = true;
  error.value = null;

  try {
    const data = {
      name: formData.value.name,
      description: formData.value.description || undefined,
      phone: formData.value.phone || undefined,
      email: formData.value.email || undefined,
      website: formData.value.website || undefined,
      address:
        formData.value.address.street || formData.value.address.city
          ? formData.value.address
          : undefined,
      openingHours: formData.value.openingHours.map((h) => ({
        day: h.day,
        open: h.open.format('HH:mm'),
        close: h.close.format('HH:mm'),
        isClosed: h.isClosed,
      })),
      settings: formData.value.settings,
    };

    let response;
    if (restaurant.value) {
      response = await api.updateRestaurant(restaurant.value._id, data);
    } else {
      response = await api.createRestaurant(data);
      if (response.success && response.data) {
        authStore.updateUserRestaurant(response.data._id);
      }
    }

    if (response.success && response.data) {
      restaurant.value = response.data;
      message.success('Paramètres enregistrés avec succès');
    }
  } catch {
    error.value = 'Erreur lors de la sauvegarde';
    message.error('Erreur lors de la sauvegarde');
    console.error(err);
  } finally {
    isSaving.value = false;
  }
};

const getDayLabel = (day: string) => {
  return daysOfWeek.find((d) => d.value === day)?.label || day;
};

const toggleEnglish = () => {
  const langs = formData.value.settings.availableLanguages;
  if (langs.includes('en')) {
    formData.value.settings.availableLanguages = langs.filter(l => l !== 'en');
  } else {
    formData.value.settings.availableLanguages = [...langs, 'en'];
  }
};

onMounted(fetchRestaurant);
</script>

<template>
  <div class="settings-view">
    <!-- Header Card -->
    <a-card class="header-card" :bordered="false">
      <div class="header-gradient">
        <div class="header-content">
          <div class="header-text">
            <h1>Paramètres du restaurant</h1>
            <p>Configurez les informations de votre établissement</p>
          </div>
          <div class="header-icon">
            <SettingOutlined />
          </div>
        </div>
      </div>
    </a-card>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Error State -->
    <a-result
      v-else-if="error && !restaurant"
      status="error"
      :title="error"
      sub-title="Impossible de charger les paramètres"
    >
      <template #extra>
        <a-button type="primary" @click="fetchRestaurant">Réessayer</a-button>
      </template>
    </a-result>

    <!-- Settings Form -->
    <a-card v-else :bordered="false" class="settings-card">
      <a-tabs v-model:activeKey="activeTab">
        <!-- General Tab -->
        <a-tab-pane key="general">
          <template #tab>
            <span class="tab-label">
              <ShopOutlined />
              Informations générales
            </span>
          </template>

          <a-form layout="vertical" class="settings-form">
            <!-- Restaurant Name -->
            <a-form-item label="Nom du restaurant" required>
              <a-input
                v-model:value="formData.name"
                placeholder="Le Bon Goût"
                size="large"
              >
                <template #prefix>
                  <ShopOutlined class="input-icon" />
                </template>
              </a-input>
            </a-form-item>

            <!-- Description -->
            <a-form-item label="Description">
              <a-textarea
                v-model:value="formData.description"
                placeholder="Une brève description de votre restaurant..."
                :rows="3"
                :maxlength="500"
                show-count
              />
            </a-form-item>

            <!-- Contact Info -->
            <a-row :gutter="16">
              <a-col :xs="24" :sm="12">
                <a-form-item label="Téléphone">
                  <a-input
                    v-model:value="formData.phone"
                    placeholder="+33 1 23 45 67 89"
                  >
                    <template #prefix>
                      <PhoneOutlined class="input-icon" />
                    </template>
                  </a-input>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12">
                <a-form-item label="Email">
                  <a-input
                    v-model:value="formData.email"
                    type="email"
                    placeholder="contact@restaurant.fr"
                  >
                    <template #prefix>
                      <MailOutlined class="input-icon" />
                    </template>
                  </a-input>
                </a-form-item>
              </a-col>
            </a-row>

            <!-- Website -->
            <a-form-item label="Site web">
              <a-input
                v-model:value="formData.website"
                placeholder="https://www.restaurant.fr"
              >
                <template #prefix>
                  <LinkOutlined class="input-icon" />
                </template>
              </a-input>
            </a-form-item>

            <!-- Address Section -->
            <a-divider>
              <EnvironmentOutlined /> Adresse
            </a-divider>

            <a-form-item label="Rue et numéro">
              <a-input
                v-model:value="formData.address.street"
                placeholder="123 Rue de la Gastronomie"
              />
            </a-form-item>

            <a-row :gutter="16">
              <a-col :xs="24" :sm="8">
                <a-form-item label="Code postal">
                  <a-input
                    v-model:value="formData.address.postalCode"
                    placeholder="75001"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="8">
                <a-form-item label="Ville">
                  <a-input
                    v-model:value="formData.address.city"
                    placeholder="Paris"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="8">
                <a-form-item label="Pays">
                  <a-input
                    v-model:value="formData.address.country"
                    placeholder="France"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-tab-pane>

        <!-- Opening Hours Tab -->
        <a-tab-pane key="hours">
          <template #tab>
            <span class="tab-label">
              <ClockCircleOutlined />
              Horaires d'ouverture
            </span>
          </template>

          <a-alert
            message="Définissez les horaires d'ouverture de votre restaurant"
            type="info"
            show-icon
            class="mb-6"
          />

          <div class="hours-list">
            <div
              v-for="hours in formData.openingHours"
              :key="hours.day"
              class="hours-row"
              :class="{ 'hours-row-closed': hours.isClosed }"
            >
              <div class="hours-day">
                {{ getDayLabel(hours.day) }}
              </div>

              <div class="hours-controls">
                <a-switch
                  :checked="!hours.isClosed"
                  checked-children="Ouvert"
                  un-checked-children="Fermé"
                  @change="hours.isClosed = !$event"
                />

                <template v-if="!hours.isClosed">
                  <div class="hours-time-range">
                    <a-time-picker
                      v-model:value="hours.open"
                      format="HH:mm"
                      :minute-step="15"
                      placeholder="Ouverture"
                    />
                    <span class="hours-separator">à</span>
                    <a-time-picker
                      v-model:value="hours.close"
                      format="HH:mm"
                      :minute-step="15"
                      placeholder="Fermeture"
                    />
                  </div>
                </template>
                <template v-else>
                  <span class="closed-label">Fermé ce jour</span>
                </template>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- Settings Tab -->
        <a-tab-pane key="settings">
          <template #tab>
            <span class="tab-label">
              <SettingOutlined />
              Configuration
            </span>
          </template>

          <a-form layout="vertical" class="settings-form">
            <!-- Language Settings -->
            <a-card size="small" class="settings-section" :bordered="false">
              <template #title>
                <GlobalOutlined /> Langue
              </template>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="12">
                  <a-form-item label="Langue par défaut">
                    <a-select v-model:value="formData.settings.defaultLanguage" size="large">
                      <a-select-option value="fr">🇫🇷 Français</a-select-option>
                      <a-select-option value="en">🇬🇧 English</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                  <a-form-item label="Langues disponibles">
                    <div class="language-checkboxes">
                      <a-checkbox checked disabled>🇫🇷 Français</a-checkbox>
                      <a-checkbox
                        :checked="formData.settings.availableLanguages.includes('en')"
                        @change="toggleEnglish"
                      >
                        🇬🇧 English
                      </a-checkbox>
                    </div>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-card>

            <!-- Table Settings -->
            <a-card size="small" class="settings-section" :bordered="false">
              <template #title>
                <TableOutlined /> Tables
              </template>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="12">
                  <a-form-item label="Préfixe des tables">
                    <a-input
                      v-model:value="formData.settings.tablePrefix"
                      placeholder="Table"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                  <a-form-item label="Nombre de tables">
                    <a-input-number
                      v-model:value="formData.settings.tableCount"
                      :min="1"
                      :max="100"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-card>

            <!-- Order Settings -->
            <a-card size="small" class="settings-section" :bordered="false">
              <template #title>
                <BellOutlined /> Commandes
              </template>

              <div class="order-settings">
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">Notifications de commande</span>
                    <span class="setting-description">
                      Recevoir des notifications sonores pour les nouvelles commandes
                    </span>
                  </div>
                  <a-switch v-model:checked="formData.settings.orderNotifications" />
                </div>

                <a-divider style="margin: 12px 0" />

                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">Acceptation automatique</span>
                    <span class="setting-description">
                      Les commandes sont automatiquement confirmées sans validation manuelle
                    </span>
                  </div>
                  <a-switch v-model:checked="formData.settings.autoAcceptOrders" />
                </div>
              </div>
            </a-card>

            <!-- QR Code Section -->
            <a-card v-if="restaurant" size="small" class="settings-section qr-section" :bordered="false">
              <template #title>
                <QrcodeOutlined /> QR Code du menu
              </template>

              <div class="qr-url-container">
                <span class="qr-label">URL de votre menu :</span>
                <div class="qr-url-row">
                  <a-input
                    :value="menuUrl"
                    readonly
                    class="qr-url-input"
                  />
                  <a-button type="primary" @click="copyMenuUrl">
                    <template #icon><CopyOutlined /></template>
                    Copier
                  </a-button>
                </div>
                <span class="qr-hint">
                  Générez un QR code à partir de cette URL pour vos tables.
                </span>
              </div>
            </a-card>
          </a-form>
        </a-tab-pane>

        <!-- Account Tab -->
        <a-tab-pane key="account">
          <template #tab>
            <span class="tab-label">
              <UserOutlined />
              Mon Compte
            </span>
          </template>

          <div class="account-tab-content">
            <!-- Personal Information Section -->
            <a-card size="small" class="settings-section profile-section" :bordered="false">
              <template #title>
                <UserOutlined /> Informations personnelles
              </template>

              <a-form layout="vertical" class="settings-form">
                <a-row :gutter="16">
                  <a-col :xs="24" :sm="12">
                    <a-form-item label="Nom" required>
                      <a-input
                        v-model:value="profileForm.name"
                        placeholder="Votre nom"
                        size="large"
                      >
                        <template #prefix>
                          <UserOutlined class="input-icon" />
                        </template>
                      </a-input>
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="12">
                    <a-form-item label="Email">
                      <a-input
                        v-model:value="profileForm.email"
                        type="email"
                        placeholder="votre@email.com"
                        size="large"
                      >
                        <template #prefix>
                          <MailOutlined class="input-icon" />
                        </template>
                      </a-input>
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-form-item label="Role">
                  <a-input
                    :value="getRoleLabel(authStore.user?.role || 'owner')"
                    disabled
                    size="large"
                  >
                    <template #prefix>
                      <CheckCircleOutlined class="input-icon" style="color: #10b981" />
                    </template>
                  </a-input>
                  <template #extra>
                    <span class="form-hint">Le role ne peut pas etre modifie</span>
                  </template>
                </a-form-item>

                <div class="profile-actions">
                  <a-button
                    type="primary"
                    size="large"
                    :loading="isSavingProfile"
                    @click="handleSaveProfile"
                  >
                    <template #icon><SaveOutlined /></template>
                    Enregistrer le profil
                  </a-button>
                </div>
              </a-form>
            </a-card>

            <!-- Security Section -->
            <a-card size="small" class="settings-section security-section" :bordered="false">
              <template #title>
                <LockOutlined /> Securite
              </template>

              <a-alert
                message="Changement de mot de passe"
                description="Pour des raisons de securite, vous devez entrer votre mot de passe actuel pour en definir un nouveau."
                type="info"
                show-icon
                class="mb-6"
              />

              <a-form layout="vertical" class="settings-form">
                <a-form-item label="Mot de passe actuel" required>
                  <a-input-password
                    v-model:value="passwordForm.currentPassword"
                    placeholder="Entrez votre mot de passe actuel"
                    size="large"
                  >
                    <template #prefix>
                      <LockOutlined class="input-icon" />
                    </template>
                  </a-input-password>
                </a-form-item>

                <a-row :gutter="16">
                  <a-col :xs="24" :sm="12">
                    <a-form-item
                      label="Nouveau mot de passe"
                      required
                      :validate-status="passwordForm.newPassword.length > 0 && passwordErrors.length > 0 ? 'error' : ''"
                    >
                      <a-input-password
                        v-model:value="passwordForm.newPassword"
                        placeholder="Nouveau mot de passe"
                        size="large"
                      >
                        <template #prefix>
                          <LockOutlined class="input-icon" />
                        </template>
                      </a-input-password>

                      <!-- Password strength indicator -->
                      <div v-if="passwordForm.newPassword.length > 0" class="password-strength">
                        <div class="strength-bars">
                          <div
                            v-for="i in 4"
                            :key="i"
                            class="strength-bar"
                            :class="{
                              'strength-weak': passwordStrength >= i && passwordStrength === 1,
                              'strength-fair': passwordStrength >= i && passwordStrength === 2,
                              'strength-good': passwordStrength >= i && passwordStrength === 3,
                              'strength-strong': passwordStrength >= i && passwordStrength === 4,
                            }"
                          ></div>
                        </div>
                        <span class="strength-label">
                          {{ passwordStrength === 1 ? 'Faible' :
                             passwordStrength === 2 ? 'Moyen' :
                             passwordStrength === 3 ? 'Bon' :
                             passwordStrength === 4 ? 'Fort' : '' }}
                        </span>
                      </div>

                      <!-- Password errors -->
                      <div v-if="passwordErrors.length > 0" class="password-errors">
                        <div v-for="err in passwordErrors" :key="err" class="password-error">
                          {{ err }}
                        </div>
                      </div>
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="12">
                    <a-form-item
                      label="Confirmer le mot de passe"
                      required
                      :validate-status="passwordForm.confirmPassword.length > 0 && passwordForm.confirmPassword !== passwordForm.newPassword ? 'error' : ''"
                      :help="passwordForm.confirmPassword.length > 0 && passwordForm.confirmPassword !== passwordForm.newPassword ? 'Les mots de passe ne correspondent pas' : ''"
                    >
                      <a-input-password
                        v-model:value="passwordForm.confirmPassword"
                        placeholder="Confirmer le mot de passe"
                        size="large"
                      >
                        <template #prefix>
                          <LockOutlined class="input-icon" />
                        </template>
                      </a-input-password>
                    </a-form-item>
                  </a-col>
                </a-row>

                <div class="password-actions">
                  <a-button
                    type="primary"
                    size="large"
                    :loading="isChangingPassword"
                    :disabled="!isPasswordValid"
                    @click="handleChangePassword"
                  >
                    <template #icon><LockOutlined /></template>
                    Changer le mot de passe
                  </a-button>
                </div>
              </a-form>
            </a-card>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- Submit Button -->
      <div class="form-actions">
        <a-button
          type="primary"
          size="large"
          :loading="isSaving"
          @click="handleSubmit"
        >
          <template #icon><SaveOutlined /></template>
          Enregistrer les modifications
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header Card */
.header-card {
  border-radius: 16px;
  overflow: hidden;
}

.header-card :deep(.ant-card-body) {
  padding: 0;
}

.header-gradient {
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%);
  padding: 32px;
  position: relative;
  overflow: hidden;
}

.header-gradient::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 60%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  transform: rotate(-15deg);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.header-text h1 {
  color: white;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.header-text p {
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  font-size: 15px;
}

.header-icon {
  font-size: 64px;
  color: rgba(255, 255, 255, 0.3);
}

/* Loading */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* Settings Card */
.settings-card {
  border-radius: 16px;
}

.settings-card :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-form {
  max-width: 800px;
}

.input-icon {
  color: #9ca3af;
}

.mb-6 {
  margin-bottom: 24px;
}

/* Hours List */
.hours-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hours-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  transition: all 0.2s;
}

.hours-row:hover {
  background: #f3f4f6;
}

.hours-row-closed {
  opacity: 0.7;
  background: #fef2f2;
}

.hours-day {
  width: 100px;
  font-weight: 600;
  color: #374151;
}

.hours-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.hours-time-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hours-separator {
  color: #6b7280;
}

.closed-label {
  color: #9ca3af;
  font-style: italic;
}

/* Settings Sections */
.settings-section {
  margin-bottom: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.settings-section :deep(.ant-card-head) {
  border-bottom: none;
  min-height: auto;
  padding: 16px 16px 0;
}

.settings-section :deep(.ant-card-head-title) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #374151;
}

.settings-section :deep(.ant-card-body) {
  padding: 16px;
}

.language-checkboxes {
  display: flex;
  gap: 24px;
  padding: 8px 0;
}

/* Order Settings */
.order-settings {
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-weight: 500;
  color: #374151;
}

.setting-description {
  font-size: 13px;
  color: #6b7280;
}

/* QR Section */
.qr-section {
  background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
}

.qr-url-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qr-label {
  font-size: 13px;
  color: #6b7280;
}

.qr-url-row {
  display: flex;
  gap: 8px;
}

.qr-url-input {
  flex: 1;
  font-family: monospace;
}

.qr-hint {
  font-size: 12px;
  color: #9ca3af;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  margin-top: 24px;
}

/* Account Tab */
.account-tab-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.security-section {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 30%, #fef9c3 100%);
}

.form-hint {
  font-size: 12px;
  color: #6b7280;
}

.profile-actions,
.password-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

/* Password Strength Indicator */
.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.strength-bars {
  display: flex;
  gap: 4px;
}

.strength-bar {
  width: 32px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.strength-bar.strength-weak {
  background: #ef4444;
}

.strength-bar.strength-fair {
  background: #f59e0b;
}

.strength-bar.strength-good {
  background: #10b981;
}

.strength-bar.strength-strong {
  background: #059669;
}

.strength-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

/* Password Errors */
.password-errors {
  margin-top: 8px;
}

.password-error {
  font-size: 12px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 4px;
}

.password-error::before {
  content: '•';
}

/* Responsive */
@media (max-width: 640px) {
  .header-gradient {
    padding: 24px;
  }

  .header-text h1 {
    font-size: 22px;
  }

  .header-icon {
    display: none;
  }

  .hours-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .hours-day {
    width: auto;
  }

  .hours-controls {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .hours-time-range {
    flex-wrap: wrap;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .qr-url-row {
    flex-direction: column;
  }

  .profile-actions,
  .password-actions {
    justify-content: stretch;
  }

  .profile-actions .ant-btn,
  .password-actions .ant-btn {
    width: 100%;
  }

  .strength-bars {
    flex: 1;
  }

  .strength-bar {
    flex: 1;
    max-width: 40px;
  }
}
</style>
