<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useDriverAuthStore } from '@/stores/driverAuth';
import { message } from 'ant-design-vue';
import api from '@/services/api';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CarOutlined,
  IdcardOutlined,
  BankOutlined,
  EditOutlined,
  SaveOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  BellOutlined,
  StarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons-vue';

interface DriverProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  vehicleType: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  maxOrderCapacity: number;
  status: string;
  documents: {
    idCard?: { url: string; verified: boolean; verifiedAt?: string };
    driverLicense?: { url: string; verified: boolean; verifiedAt?: string };
    vehicleRegistration?: { url: string; verified: boolean };
    insurance?: { url: string; verified: boolean; expiresAt?: string };
  };
  bankAccount?: {
    accountHolder: string;
    iban: string;
    bic: string;
    bankName?: string;
    isVerified: boolean;
  };
  stats: {
    totalDeliveries: number;
    completedDeliveries: number;
    averageRating: number;
    totalRatings: number;
    onTimeRate: number;
    totalEarnings: number;
  };
  preferredZones: string[];
  maxDeliveryRadius: number;
  notificationPreferences: {
    newOrders: boolean;
    orderUpdates: boolean;
    promotions: boolean;
    earnings: boolean;
  };
  createdAt: string;
}

const _driverStore = useDriverAuthStore();

const loading = ref(true);
const saving = ref(false);
const profile = ref<DriverProfile | null>(null);
const activeTab = ref('profile');
const editMode = ref(false);

// Edit form
const editForm = ref({
  firstName: '',
  lastName: '',
  phone: '',
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
  },
  vehicleModel: '',
  vehicleColor: '',
  maxOrderCapacity: 3,
  preferredZones: [] as string[],
  maxDeliveryRadius: 10,
});

// Notification preferences form
const notificationForm = ref({
  newOrders: true,
  orderUpdates: true,
  promotions: true,
  earnings: true,
});

const vehicleIcons: Record<string, string> = {
  bicycle: '🚲',
  scooter: '🛵',
  motorcycle: '🏍️',
  car: '🚗',
};

const statusColors: Record<string, string> = {
  pending: 'orange',
  verified: 'green',
  suspended: 'red',
  deactivated: 'default',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  verified: 'Verifie',
  suspended: 'Suspendu',
  deactivated: 'Desactive',
};

const formattedJoinDate = computed(() => {
  if (!profile.value?.createdAt) {return '';}
  return new Date(profile.value.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
  });
});

const maskedIban = computed(() => {
  if (!profile.value?.bankAccount?.iban) {return '';}
  const iban = profile.value.bankAccount.iban;
  return iban.slice(0, 4) + ' **** **** ' + iban.slice(-4);
});

const fetchProfile = async () => {
  loading.value = true;
  try {
    const response = await api.getDriverProfile();
    if (response.success && response.data) {
      profile.value = response.data as DriverProfile;
      // Initialize edit form
      editForm.value = {
        firstName: profile.value.firstName,
        lastName: profile.value.lastName,
        phone: profile.value.phone,
        address: profile.value.address || { street: '', city: '', postalCode: '', country: 'France' },
        vehicleModel: profile.value.vehicleModel || '',
        vehicleColor: profile.value.vehicleColor || '',
        maxOrderCapacity: profile.value.maxOrderCapacity,
        preferredZones: profile.value.preferredZones || [],
        maxDeliveryRadius: profile.value.maxDeliveryRadius,
      };
      // Initialize notification form
      if (profile.value.notificationPreferences) {
        notificationForm.value = { ...profile.value.notificationPreferences };
      }
    }
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    message.error('Erreur lors du chargement du profil');
  } finally {
    loading.value = false;
  }
};

const saveProfile = async () => {
  saving.value = true;
  try {
    const response = await api.updateDriverProfile(editForm.value);
    if (response.success) {
      message.success('Profil mis a jour');
      editMode.value = false;
      await fetchProfile();
    } else {
      message.error(response.message || 'Erreur lors de la mise a jour');
    }
  } catch (error) {
    console.error('Failed to update profile:', error);
    message.error('Erreur lors de la mise a jour du profil');
  } finally {
    saving.value = false;
  }
};

const saveNotificationPreferences = async () => {
  saving.value = true;
  try {
    const response = await api.updateDriverNotifications(notificationForm.value);
    if (response.success) {
      message.success('Preferences mises a jour');
    } else {
      message.error(response.message || 'Erreur lors de la mise a jour');
    }
  } catch (error) {
    console.error('Failed to update notifications:', error);
    message.error('Erreur');
  } finally {
    saving.value = false;
  }
};

const handlePhotoUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('profilePhoto', file);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || '/api/v1'}/driver/profile/photo`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('driver_token')}`,
        },
        body: formData,
      }
    );
    const data = await response.json();
    if (data.success) {
      message.success('Photo mise a jour');
      await fetchProfile();
    } else {
      message.error(data.message || 'Erreur lors du telechargement');
    }
  } catch (error) {
    console.error('Failed to upload photo:', error);
    message.error('Erreur lors du telechargement de la photo');
  }

  return false;
};

const cancelEdit = () => {
  editMode.value = false;
  if (profile.value) {
    editForm.value = {
      firstName: profile.value.firstName,
      lastName: profile.value.lastName,
      phone: profile.value.phone,
      address: profile.value.address || { street: '', city: '', postalCode: '', country: 'France' },
      vehicleModel: profile.value.vehicleModel || '',
      vehicleColor: profile.value.vehicleColor || '',
      maxOrderCapacity: profile.value.maxOrderCapacity,
      preferredZones: profile.value.preferredZones || [],
      maxDeliveryRadius: profile.value.maxDeliveryRadius,
    };
  }
};

onMounted(() => {
  fetchProfile();
});
</script>

<template>
  <div class="profile-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
      <p>Chargement du profil...</p>
    </div>

    <template v-else-if="profile">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-photo-container">
          <div class="profile-photo">
            <img v-if="profile.profilePhoto" :src="profile.profilePhoto" alt="Photo de profil" />
            <UserOutlined v-else />
          </div>
          <a-upload
            :before-upload="handlePhotoUpload"
            :show-upload-list="false"
            accept=".jpg,.jpeg,.png"
            class="photo-upload-btn"
          >
            <a-button type="primary" shape="circle" size="small">
              <CameraOutlined />
            </a-button>
          </a-upload>
        </div>

        <div class="profile-info">
          <h1>{{ profile.firstName }} {{ profile.lastName }}</h1>
          <div class="profile-badges">
            <a-tag :color="statusColors[profile.status]">
              {{ statusLabels[profile.status] }}
            </a-tag>
            <span class="vehicle-badge">
              {{ vehicleIcons[profile.vehicleType] }} {{ profile.vehiclePlate || 'Velo' }}
            </span>
          </div>
          <p class="member-since">Membre depuis {{ formattedJoinDate }}</p>
        </div>

        <div class="profile-stats-mini">
          <div class="stat-mini">
            <StarOutlined />
            <span>{{ profile.stats.averageRating.toFixed(1) }}</span>
          </div>
          <div class="stat-mini">
            <CarOutlined />
            <span>{{ profile.stats.completedDeliveries }}</span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs-container">
        <div class="tabs">
          <button
            :class="{ active: activeTab === 'profile' }"
            @click="activeTab = 'profile'"
          >
            <UserOutlined /> Profil
          </button>
          <button
            :class="{ active: activeTab === 'documents' }"
            @click="activeTab = 'documents'"
          >
            <IdcardOutlined /> Documents
          </button>
          <button
            :class="{ active: activeTab === 'bank' }"
            @click="activeTab = 'bank'"
          >
            <BankOutlined /> Banque
          </button>
          <button
            :class="{ active: activeTab === 'settings' }"
            @click="activeTab = 'settings'"
          >
            <SettingOutlined /> Parametres
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Profile Tab -->
        <div v-show="activeTab === 'profile'" class="tab-panel">
          <div class="panel-header">
            <h2>Informations personnelles</h2>
            <a-button
              v-if="!editMode"
              type="primary"
              ghost
              @click="editMode = true"
            >
              <EditOutlined /> Modifier
            </a-button>
            <div v-else class="edit-actions">
              <a-button @click="cancelEdit">Annuler</a-button>
              <a-button type="primary" :loading="saving" @click="saveProfile">
                <SaveOutlined /> Enregistrer
              </a-button>
            </div>
          </div>

          <!-- View Mode -->
          <div v-if="!editMode" class="info-grid">
            <div class="info-item">
              <label><MailOutlined /> Email</label>
              <span>{{ profile.email }}</span>
            </div>
            <div class="info-item">
              <label><PhoneOutlined /> Telephone</label>
              <span>{{ profile.phone }}</span>
            </div>
            <div class="info-item full-width">
              <label><EnvironmentOutlined /> Adresse</label>
              <span v-if="profile.address">
                {{ profile.address.street }}, {{ profile.address.postalCode }} {{ profile.address.city }}
              </span>
              <span v-else class="not-provided">Non renseigne</span>
            </div>

            <div class="info-section-title">
              <CarOutlined /> Vehicule
            </div>
            <div class="info-item">
              <label>Type</label>
              <span>{{ vehicleIcons[profile.vehicleType] }} {{ profile.vehicleType }}</span>
            </div>
            <div class="info-item">
              <label>Plaque</label>
              <span>{{ profile.vehiclePlate || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <label>Modele</label>
              <span>{{ profile.vehicleModel || 'Non renseigne' }}</span>
            </div>
            <div class="info-item">
              <label>Couleur</label>
              <span>{{ profile.vehicleColor || 'Non renseigne' }}</span>
            </div>
            <div class="info-item">
              <label>Capacite max</label>
              <span>{{ profile.maxOrderCapacity }} commandes</span>
            </div>
            <div class="info-item">
              <label>Rayon de livraison</label>
              <span>{{ profile.maxDeliveryRadius }} km</span>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else class="edit-form">
            <div class="form-row">
              <div class="form-group">
                <label>Prenom</label>
                <a-input v-model:value="editForm.firstName" size="large" />
              </div>
              <div class="form-group">
                <label>Nom</label>
                <a-input v-model:value="editForm.lastName" size="large" />
              </div>
            </div>

            <div class="form-group">
              <label>Telephone</label>
              <a-input v-model:value="editForm.phone" size="large" />
            </div>

            <div class="form-group">
              <label>Adresse</label>
              <a-input v-model:value="editForm.address.street" placeholder="Rue" size="large" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Ville</label>
                <a-input v-model:value="editForm.address.city" size="large" />
              </div>
              <div class="form-group">
                <label>Code postal</label>
                <a-input v-model:value="editForm.address.postalCode" size="large" />
              </div>
            </div>

            <div class="form-section-title">Vehicule</div>

            <div class="form-row">
              <div class="form-group">
                <label>Modele</label>
                <a-input v-model:value="editForm.vehicleModel" size="large" />
              </div>
              <div class="form-group">
                <label>Couleur</label>
                <a-input v-model:value="editForm.vehicleColor" size="large" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Capacite max</label>
                <a-input-number
                  v-model:value="editForm.maxOrderCapacity"
                  :min="1"
                  :max="5"
                  size="large"
                  style="width: 100%"
                />
              </div>
              <div class="form-group">
                <label>Rayon de livraison (km)</label>
                <a-input-number
                  v-model:value="editForm.maxDeliveryRadius"
                  :min="1"
                  :max="50"
                  size="large"
                  style="width: 100%"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Documents Tab -->
        <div v-show="activeTab === 'documents'" class="tab-panel">
          <h2>Mes documents</h2>
          <p class="tab-description">
            Statut de verification de vos documents. Contactez le support pour mettre a jour un document.
          </p>

          <div class="documents-list">
            <div class="document-item">
              <div class="document-icon">
                <IdcardOutlined />
              </div>
              <div class="document-info">
                <span class="document-name">Piece d'identite</span>
                <span class="document-status">
                  <template v-if="profile.documents.idCard?.verified">
                    <CheckCircleOutlined class="verified" /> Verifie
                  </template>
                  <template v-else-if="profile.documents.idCard">
                    <ClockCircleOutlined class="pending" /> En attente
                  </template>
                  <template v-else>
                    <ExclamationCircleOutlined class="missing" /> Non fourni
                  </template>
                </span>
              </div>
            </div>

            <div class="document-item">
              <div class="document-icon">
                <CarOutlined />
              </div>
              <div class="document-info">
                <span class="document-name">Permis de conduire</span>
                <span class="document-status">
                  <template v-if="profile.documents.driverLicense?.verified">
                    <CheckCircleOutlined class="verified" /> Verifie
                  </template>
                  <template v-else-if="profile.documents.driverLicense">
                    <ClockCircleOutlined class="pending" /> En attente
                  </template>
                  <template v-else>
                    <ExclamationCircleOutlined class="missing" />
                    {{ profile.vehicleType === 'bicycle' ? 'Non requis' : 'Non fourni' }}
                  </template>
                </span>
              </div>
            </div>

            <div class="document-item">
              <div class="document-icon">
                <IdcardOutlined />
              </div>
              <div class="document-info">
                <span class="document-name">Carte grise</span>
                <span class="document-status">
                  <template v-if="profile.documents.vehicleRegistration?.verified">
                    <CheckCircleOutlined class="verified" /> Verifie
                  </template>
                  <template v-else-if="profile.documents.vehicleRegistration">
                    <ClockCircleOutlined class="pending" /> En attente
                  </template>
                  <template v-else>
                    <ExclamationCircleOutlined class="missing" />
                    {{ profile.vehicleType === 'bicycle' ? 'Non requis' : 'Non fourni' }}
                  </template>
                </span>
              </div>
            </div>

            <div class="document-item">
              <div class="document-icon">
                <IdcardOutlined />
              </div>
              <div class="document-info">
                <span class="document-name">Assurance</span>
                <span class="document-status">
                  <template v-if="profile.documents.insurance?.verified">
                    <CheckCircleOutlined class="verified" /> Verifie
                    <span v-if="profile.documents.insurance?.expiresAt" class="expiry">
                      (exp. {{ new Date(profile.documents.insurance.expiresAt).toLocaleDateString('fr-FR') }})
                    </span>
                  </template>
                  <template v-else-if="profile.documents.insurance">
                    <ClockCircleOutlined class="pending" /> En attente
                  </template>
                  <template v-else>
                    <ExclamationCircleOutlined class="missing" /> Non fourni
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bank Tab -->
        <div v-show="activeTab === 'bank'" class="tab-panel">
          <h2>Informations bancaires</h2>
          <p class="tab-description">
            Vos gains sont verses chaque semaine sur ce compte.
          </p>

          <div v-if="profile.bankAccount" class="bank-card">
            <div class="bank-header">
              <BankOutlined />
              <span>{{ profile.bankAccount.bankName || 'Compte bancaire' }}</span>
              <a-tag v-if="profile.bankAccount.isVerified" color="green">Verifie</a-tag>
              <a-tag v-else color="orange">En verification</a-tag>
            </div>
            <div class="bank-details">
              <div class="bank-field">
                <label>Titulaire</label>
                <span>{{ profile.bankAccount.accountHolder }}</span>
              </div>
              <div class="bank-field">
                <label>IBAN</label>
                <span>{{ maskedIban }}</span>
              </div>
              <div class="bank-field">
                <label>BIC</label>
                <span>{{ profile.bankAccount.bic }}</span>
              </div>
            </div>
          </div>

          <div v-else class="no-bank">
            <BankOutlined />
            <p>Aucun compte bancaire configure</p>
            <a-button type="primary">Ajouter un compte</a-button>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-show="activeTab === 'settings'" class="tab-panel">
          <h2>Parametres</h2>

          <div class="settings-section">
            <h3><BellOutlined /> Notifications</h3>
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-name">Nouvelles commandes</span>
                  <span class="setting-desc">Recevoir une notification pour chaque nouvelle commande</span>
                </div>
                <a-switch v-model:checked="notificationForm.newOrders" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-name">Mises a jour de commandes</span>
                  <span class="setting-desc">Notifications sur le statut des commandes</span>
                </div>
                <a-switch v-model:checked="notificationForm.orderUpdates" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-name">Promotions</span>
                  <span class="setting-desc">Offres speciales et bonus</span>
                </div>
                <a-switch v-model:checked="notificationForm.promotions" />
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-name">Gains</span>
                  <span class="setting-desc">Resume quotidien des gains</span>
                </div>
                <a-switch v-model:checked="notificationForm.earnings" />
              </div>
            </div>
            <a-button
              type="primary"
              :loading="saving"
              @click="saveNotificationPreferences"
              style="margin-top: 16px"
            >
              Enregistrer les preferences
            </a-button>
          </div>

          <div class="settings-section danger-zone">
            <h3>Zone de danger</h3>
            <a-button danger>Desactiver mon compte</a-button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 80px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: rgba(255, 255, 255, 0.65);
}

.loading-container p {
  margin-top: 16px;
}

/* Profile Header */
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  margin-bottom: 20px;
}

.profile-photo-container {
  position: relative;
}

.profile-photo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;
}

.profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
}

.profile-info {
  flex: 1;
}

.profile-info h1 {
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.profile-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.vehicle-badge {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.member-since {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin: 0;
}

.profile-stats-mini {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-mini {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 600;
}

/* Tabs */
.tabs-container {
  margin-bottom: 20px;
  overflow-x: auto;
}

.tabs {
  display: flex;
  gap: 8px;
  min-width: max-content;
}

.tabs button {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tabs button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.tabs button.active {
  background: #1890ff;
  border-color: #1890ff;
  color: #fff;
}

/* Tab Content */
.tab-content {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-panel {
  padding: 20px;
}

.tab-panel h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.tab-description {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  margin: 0 0 20px 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  margin: 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-item label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-item span {
  color: #fff;
  font-size: 14px;
}

.info-item .not-provided {
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
}

.info-section-title {
  grid-column: span 2;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Edit Form */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.form-section-title {
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  font-weight: 600;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Documents */
.documents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.document-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.75);
}

.document-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.document-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.document-status {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.document-status .verified {
  color: #52c41a;
}

.document-status .pending {
  color: #faad14;
}

.document-status .missing {
  color: #ff4d4f;
}

.document-status .expiry {
  color: rgba(255, 255, 255, 0.45);
}

/* Bank */
.bank-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
}

.bank-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-weight: 500;
}

.bank-header span {
  flex: 1;
}

.bank-details {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bank-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bank-field label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  text-transform: uppercase;
}

.bank-field span {
  color: #fff;
  font-size: 14px;
  font-family: monospace;
}

.no-bank {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
}

.no-bank .anticon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.no-bank p {
  margin-bottom: 16px;
}

/* Settings */
.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-name {
  color: #fff;
  font-size: 14px;
}

.setting-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.danger-zone {
  padding-top: 24px;
  border-top: 1px solid rgba(255, 77, 79, 0.3);
}

.danger-zone h3 {
  color: #ff4d4f;
}

/* Input styling */
:deep(.ant-input),
:deep(.ant-input-number) {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: #fff !important;
}

:deep(.ant-input:focus),
:deep(.ant-input-number:focus) {
  border-color: #1890ff !important;
}

:deep(.ant-input-number-input) {
  color: #fff !important;
}
</style>
