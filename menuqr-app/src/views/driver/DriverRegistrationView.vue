<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  CarOutlined,
  IdcardOutlined,
  BankOutlined,
  CheckCircleOutlined,
  LeftOutlined,
  RightOutlined,
  UploadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();

// Multi-step form state
const currentStep = ref(0);
const loading = ref(false);
const registrationComplete = ref(false);

// Form data
const form = ref({
  // Step 1: Personal Info
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: null as Date | null,
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
  },

  // Step 2: Vehicle Info
  vehicleType: 'scooter' as 'bicycle' | 'scooter' | 'motorcycle' | 'car',
  vehiclePlate: '',
  vehicleModel: '',
  vehicleColor: '',
  maxOrderCapacity: 3,

  // Step 3: Documents
  documents: {
    idCard: null as File | null,
    driverLicense: null as File | null,
    vehicleRegistration: null as File | null,
    insurance: null as File | null,
  },

  // Step 4: Bank Info
  bankAccount: {
    accountHolder: '',
    iban: '',
    bic: '',
    bankName: '',
  },

  // Agreements
  termsAccepted: false,
  privacyAccepted: false,
});

const steps = [
  { title: 'Informations', icon: UserOutlined },
  { title: 'Vehicule', icon: CarOutlined },
  { title: 'Documents', icon: IdcardOutlined },
  { title: 'Banque', icon: BankOutlined },
];

const vehicleTypes = [
  { value: 'bicycle', label: 'Velo', icon: '🚲', capacity: 2 },
  { value: 'scooter', label: 'Scooter', icon: '🛵', capacity: 3 },
  { value: 'motorcycle', label: 'Moto', icon: '🏍️', capacity: 2 },
  { value: 'car', label: 'Voiture', icon: '🚗', capacity: 5 },
];

// Validation
const isStep1Valid = computed(() => {
  return (
    form.value.firstName.trim() !== '' &&
    form.value.lastName.trim() !== '' &&
    form.value.email.trim() !== '' &&
    form.value.phone.trim() !== '' &&
    form.value.password.length >= 8 &&
    form.value.password === form.value.confirmPassword &&
    form.value.address.street.trim() !== '' &&
    form.value.address.city.trim() !== '' &&
    form.value.address.postalCode.trim() !== ''
  );
});

const isStep2Valid = computed(() => {
  // vehicleType is always one of the valid types, so we only need to check vehicle plate for non-bicycle types
  return form.value.vehicleType === 'bicycle' || form.value.vehiclePlate.trim() !== '';
});

const isStep3Valid = computed(() => {
  return (
    form.value.documents.idCard !== null &&
    (form.value.vehicleType === 'bicycle' || form.value.documents.driverLicense !== null)
  );
});

const isStep4Valid = computed(() => {
  return (
    form.value.bankAccount.accountHolder.trim() !== '' &&
    form.value.bankAccount.iban.trim() !== '' &&
    form.value.bankAccount.bic.trim() !== '' &&
    form.value.termsAccepted &&
    form.value.privacyAccepted
  );
});

const isCurrentStepValid = computed(() => {
  switch (currentStep.value) {
    case 0: return isStep1Valid.value;
    case 1: return isStep2Valid.value;
    case 2: return isStep3Valid.value;
    case 3: return isStep4Valid.value;
    default: return false;
  }
});

// File handling
const handleFileUpload = (docType: keyof typeof form.value.documents, file: File) => {
  form.value.documents[docType] = file;
  return false; // Prevent auto upload
};

const removeFile = (docType: keyof typeof form.value.documents) => {
  form.value.documents[docType] = null;
};

// Navigation
const nextStep = () => {
  if (currentStep.value < steps.length - 1 && isCurrentStepValid.value) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// Form submission
const handleSubmit = async () => {
  if (!isCurrentStepValid.value) {return;}

  loading.value = true;

  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Add basic info
    formData.append('firstName', form.value.firstName);
    formData.append('lastName', form.value.lastName);
    formData.append('email', form.value.email);
    formData.append('phone', form.value.phone);
    formData.append('password', form.value.password);
    if (form.value.dateOfBirth) {
      formData.append('dateOfBirth', form.value.dateOfBirth.toISOString());
    }
    formData.append('address', JSON.stringify(form.value.address));

    // Add vehicle info
    formData.append('vehicleType', form.value.vehicleType);
    formData.append('vehiclePlate', form.value.vehiclePlate);
    formData.append('vehicleModel', form.value.vehicleModel);
    formData.append('vehicleColor', form.value.vehicleColor);
    formData.append('maxOrderCapacity', form.value.maxOrderCapacity.toString());

    // Add bank info
    formData.append('bankAccount', JSON.stringify(form.value.bankAccount));

    // Add documents
    if (form.value.documents.idCard) {
      formData.append('idCard', form.value.documents.idCard);
    }
    if (form.value.documents.driverLicense) {
      formData.append('driverLicense', form.value.documents.driverLicense);
    }
    if (form.value.documents.vehicleRegistration) {
      formData.append('vehicleRegistration', form.value.documents.vehicleRegistration);
    }
    if (form.value.documents.insurance) {
      formData.append('insurance', form.value.documents.insurance);
    }

    // Send registration request
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || '/api/v1'}/drivers/register`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (data.success) {
      registrationComplete.value = true;
      message.success('Inscription reussie ! Votre dossier est en cours de verification.');
    } else {
      message.error(data.message || 'Erreur lors de l\'inscription');
    }
  } catch (error) {
    console.error('Registration error:', error);
    message.error('Une erreur est survenue lors de l\'inscription');
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push('/driver/login');
};
</script>

<template>
  <div class="registration-page">
    <div class="registration-container">
      <!-- Success Screen -->
      <div v-if="registrationComplete" class="success-screen">
        <div class="success-icon">
          <CheckCircleOutlined />
        </div>
        <h1>Inscription reussie !</h1>
        <p>
          Votre demande d'inscription a ete envoyee avec succes.
          Notre equipe va verifier vos documents sous 24-48h.
        </p>
        <p class="success-note">
          Vous recevrez un email de confirmation une fois votre compte active.
        </p>
        <a-button type="primary" size="large" @click="goToLogin">
          Retour a la connexion
        </a-button>
      </div>

      <!-- Registration Form -->
      <template v-else>
        <!-- Header -->
        <div class="registration-header">
          <a-button type="text" class="back-btn" @click="goToLogin">
            <LeftOutlined /> Retour
          </a-button>
          <div class="header-content">
            <div class="logo">
              <CarOutlined />
            </div>
            <h1>Devenir Livreur</h1>
            <p>Rejoignez notre equipe de livreurs partenaires</p>
          </div>
        </div>

        <!-- Progress Steps -->
        <div class="steps-container">
          <div class="steps-wrapper">
            <div
              v-for="(step, index) in steps"
              :key="index"
              class="step-item"
              :class="{
                active: currentStep === index,
                completed: currentStep > index,
              }"
            >
              <div class="step-number">
                <CheckCircleOutlined v-if="currentStep > index" />
                <span v-else>{{ index + 1 }}</span>
              </div>
              <span class="step-title">{{ step.title }}</span>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <div class="form-content">
          <!-- Step 1: Personal Info -->
          <div v-show="currentStep === 0" class="step-panel">
            <h2><UserOutlined /> Informations personnelles</h2>

            <div class="form-row">
              <div class="form-group">
                <label>Prenom *</label>
                <a-input
                  v-model:value="form.firstName"
                  placeholder="Votre prenom"
                  size="large"
                />
              </div>
              <div class="form-group">
                <label>Nom *</label>
                <a-input
                  v-model:value="form.lastName"
                  placeholder="Votre nom"
                  size="large"
                />
              </div>
            </div>

            <div class="form-group">
              <label><MailOutlined /> Email *</label>
              <a-input
                v-model:value="form.email"
                type="email"
                placeholder="votre@email.com"
                size="large"
              />
            </div>

            <div class="form-group">
              <label><PhoneOutlined /> Telephone *</label>
              <a-input
                v-model:value="form.phone"
                placeholder="+33 6 XX XX XX XX"
                size="large"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label><LockOutlined /> Mot de passe *</label>
                <a-input-password
                  v-model:value="form.password"
                  placeholder="Min. 8 caracteres"
                  size="large"
                />
              </div>
              <div class="form-group">
                <label>Confirmer *</label>
                <a-input-password
                  v-model:value="form.confirmPassword"
                  placeholder="Confirmer le mot de passe"
                  size="large"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Adresse *</label>
              <a-input
                v-model:value="form.address.street"
                placeholder="Numero et rue"
                size="large"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Ville *</label>
                <a-input
                  v-model:value="form.address.city"
                  placeholder="Ville"
                  size="large"
                />
              </div>
              <div class="form-group">
                <label>Code postal *</label>
                <a-input
                  v-model:value="form.address.postalCode"
                  placeholder="75000"
                  size="large"
                />
              </div>
            </div>
          </div>

          <!-- Step 2: Vehicle Info -->
          <div v-show="currentStep === 1" class="step-panel">
            <h2><CarOutlined /> Votre vehicule</h2>

            <div class="vehicle-grid">
              <div
                v-for="vehicle in vehicleTypes"
                :key="vehicle.value"
                class="vehicle-card"
                :class="{ selected: form.vehicleType === vehicle.value }"
                @click="form.vehicleType = vehicle.value as typeof form.vehicleType"
              >
                <span class="vehicle-icon">{{ vehicle.icon }}</span>
                <span class="vehicle-label">{{ vehicle.label }}</span>
                <span class="vehicle-capacity">{{ vehicle.capacity }} commandes max</span>
              </div>
            </div>

            <div v-if="form.vehicleType !== 'bicycle'" class="form-group">
              <label>Plaque d'immatriculation *</label>
              <a-input
                v-model:value="form.vehiclePlate"
                placeholder="AA-123-BB"
                size="large"
                style="text-transform: uppercase"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Modele du vehicule</label>
                <a-input
                  v-model:value="form.vehicleModel"
                  placeholder="Ex: Honda PCX"
                  size="large"
                />
              </div>
              <div class="form-group">
                <label>Couleur</label>
                <a-input
                  v-model:value="form.vehicleColor"
                  placeholder="Ex: Noir"
                  size="large"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Capacite de commandes</label>
              <a-slider
                v-model:value="form.maxOrderCapacity"
                :min="1"
                :max="5"
                :marks="{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }"
              />
            </div>
          </div>

          <!-- Step 3: Documents -->
          <div v-show="currentStep === 2" class="step-panel">
            <h2><IdcardOutlined /> Documents requis</h2>
            <p class="step-description">
              Telechargez vos documents pour la verification. Formats acceptes: JPG, PNG, PDF (max 5MB)
            </p>

            <div class="documents-grid">
              <div class="document-card">
                <div class="document-header">
                  <IdcardOutlined />
                  <span>Piece d'identite *</span>
                </div>
                <div class="document-content">
                  <a-upload
                    :before-upload="(file: File) => handleFileUpload('idCard', file)"
                    :show-upload-list="false"
                    accept=".jpg,.jpeg,.png,.pdf"
                  >
                    <div v-if="!form.documents.idCard" class="upload-area">
                      <UploadOutlined />
                      <span>Cliquez pour telecharger</span>
                    </div>
                    <div v-else class="file-uploaded">
                      <CheckCircleOutlined />
                      <span>{{ form.documents.idCard.name }}</span>
                      <a-button type="text" size="small" @click.stop="removeFile('idCard')">
                        Supprimer
                      </a-button>
                    </div>
                  </a-upload>
                </div>
              </div>

              <div v-if="form.vehicleType !== 'bicycle'" class="document-card">
                <div class="document-header">
                  <SafetyCertificateOutlined />
                  <span>Permis de conduire *</span>
                </div>
                <div class="document-content">
                  <a-upload
                    :before-upload="(file: File) => handleFileUpload('driverLicense', file)"
                    :show-upload-list="false"
                    accept=".jpg,.jpeg,.png,.pdf"
                  >
                    <div v-if="!form.documents.driverLicense" class="upload-area">
                      <UploadOutlined />
                      <span>Cliquez pour telecharger</span>
                    </div>
                    <div v-else class="file-uploaded">
                      <CheckCircleOutlined />
                      <span>{{ form.documents.driverLicense.name }}</span>
                      <a-button type="text" size="small" @click.stop="removeFile('driverLicense')">
                        Supprimer
                      </a-button>
                    </div>
                  </a-upload>
                </div>
              </div>

              <div v-if="form.vehicleType !== 'bicycle'" class="document-card">
                <div class="document-header">
                  <CarOutlined />
                  <span>Carte grise</span>
                </div>
                <div class="document-content">
                  <a-upload
                    :before-upload="(file: File) => handleFileUpload('vehicleRegistration', file)"
                    :show-upload-list="false"
                    accept=".jpg,.jpeg,.png,.pdf"
                  >
                    <div v-if="!form.documents.vehicleRegistration" class="upload-area">
                      <UploadOutlined />
                      <span>Cliquez pour telecharger</span>
                    </div>
                    <div v-else class="file-uploaded">
                      <CheckCircleOutlined />
                      <span>{{ form.documents.vehicleRegistration.name }}</span>
                      <a-button type="text" size="small" @click.stop="removeFile('vehicleRegistration')">
                        Supprimer
                      </a-button>
                    </div>
                  </a-upload>
                </div>
              </div>

              <div class="document-card">
                <div class="document-header">
                  <SafetyCertificateOutlined />
                  <span>Assurance</span>
                </div>
                <div class="document-content">
                  <a-upload
                    :before-upload="(file: File) => handleFileUpload('insurance', file)"
                    :show-upload-list="false"
                    accept=".jpg,.jpeg,.png,.pdf"
                  >
                    <div v-if="!form.documents.insurance" class="upload-area">
                      <UploadOutlined />
                      <span>Cliquez pour telecharger</span>
                    </div>
                    <div v-else class="file-uploaded">
                      <CheckCircleOutlined />
                      <span>{{ form.documents.insurance.name }}</span>
                      <a-button type="text" size="small" @click.stop="removeFile('insurance')">
                        Supprimer
                      </a-button>
                    </div>
                  </a-upload>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Bank Info -->
          <div v-show="currentStep === 3" class="step-panel">
            <h2><BankOutlined /> Informations bancaires</h2>
            <p class="step-description">
              Ces informations seront utilisees pour vous verser vos gains hebdomadaires.
            </p>

            <div class="form-group">
              <label>Titulaire du compte *</label>
              <a-input
                v-model:value="form.bankAccount.accountHolder"
                placeholder="Nom complet du titulaire"
                size="large"
              />
            </div>

            <div class="form-group">
              <label>IBAN *</label>
              <a-input
                v-model:value="form.bankAccount.iban"
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                size="large"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>BIC/SWIFT *</label>
                <a-input
                  v-model:value="form.bankAccount.bic"
                  placeholder="BNPAFRPP"
                  size="large"
                />
              </div>
              <div class="form-group">
                <label>Nom de la banque</label>
                <a-input
                  v-model:value="form.bankAccount.bankName"
                  placeholder="Ex: BNP Paribas"
                  size="large"
                />
              </div>
            </div>

            <div class="agreements-section">
              <a-checkbox v-model:checked="form.termsAccepted">
                J'accepte les <a href="/terms" target="_blank">conditions generales</a> et le
                <a href="#" target="_blank">contrat de partenariat</a>
              </a-checkbox>
              <a-checkbox v-model:checked="form.privacyAccepted">
                J'accepte la <a href="/privacy" target="_blank">politique de confidentialite</a>
                et le traitement de mes donnees personnelles
              </a-checkbox>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="form-navigation">
          <a-button
            v-if="currentStep > 0"
            size="large"
            @click="prevStep"
          >
            <LeftOutlined /> Precedent
          </a-button>
          <div v-else></div>

          <a-button
            v-if="currentStep < steps.length - 1"
            type="primary"
            size="large"
            :disabled="!isCurrentStepValid"
            @click="nextStep"
          >
            Suivant <RightOutlined />
          </a-button>

          <a-button
            v-else
            type="primary"
            size="large"
            :disabled="!isCurrentStepValid"
            :loading="loading"
            @click="handleSubmit"
          >
            <template v-if="loading">Inscription...</template>
            <template v-else>Finaliser l'inscription</template>
          </a-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.registration-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px;
}

.registration-container {
  max-width: 600px;
  margin: 0 auto;
}

/* Success Screen */
.success-screen {
  text-align: center;
  padding: 60px 20px;
}

.success-icon {
  font-size: 80px;
  color: #52c41a;
  margin-bottom: 24px;
}

.success-screen h1 {
  color: #fff;
  font-size: 28px;
  margin: 0 0 16px 0;
}

.success-screen p {
  color: rgba(255, 255, 255, 0.75);
  font-size: 16px;
  margin: 0 0 12px 0;
}

.success-note {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin-bottom: 32px !important;
}

/* Header */
.registration-header {
  margin-bottom: 24px;
}

.back-btn {
  color: rgba(255, 255, 255, 0.65);
  padding: 0;
  margin-bottom: 16px;
}

.header-content {
  text-align: center;
}

.logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
}

.registration-header h1 {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.registration-header p {
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}

/* Steps */
.steps-container {
  margin-bottom: 24px;
  overflow-x: auto;
}

.steps-wrapper {
  display: flex;
  justify-content: space-between;
  min-width: 400px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
}

.step-item::after {
  content: '';
  position: absolute;
  top: 16px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.15);
}

.step-item:last-child::after {
  display: none;
}

.step-item.completed::after {
  background: #52c41a;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.step-item.active .step-number {
  background: #1890ff;
  border-color: #1890ff;
  color: #fff;
}

.step-item.completed .step-number {
  background: #52c41a;
  border-color: #52c41a;
  color: #fff;
}

.step-title {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.step-item.active .step-title,
.step-item.completed .step-title {
  color: #fff;
}

/* Form Content */
.form-content {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
}

.step-panel h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-description {
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  margin: -12px 0 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* Vehicle Grid */
.vehicle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.vehicle-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vehicle-card:hover {
  border-color: rgba(24, 144, 255, 0.5);
}

.vehicle-card.selected {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.15);
}

.vehicle-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.vehicle-label {
  display: block;
  color: #fff;
  font-weight: 600;
  margin-bottom: 4px;
}

.vehicle-capacity {
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

/* Documents Grid */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 480px) {
  .documents-grid {
    grid-template-columns: 1fr;
  }
}

.document-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.document-header {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.document-content {
  padding: 12px;
}

.upload-area {
  padding: 20px;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-area:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.upload-area span {
  display: block;
  font-size: 12px;
  margin-top: 8px;
}

.file-uploaded {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(82, 196, 26, 0.1);
  border-radius: 8px;
  color: #52c41a;
  font-size: 12px;
}

.file-uploaded span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Agreements */
.agreements-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agreements-section :deep(.ant-checkbox-wrapper) {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.agreements-section a {
  color: #1890ff;
}

/* Navigation */
.form-navigation {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

/* Input styling */
:deep(.ant-input),
:deep(.ant-input-password) {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: #fff !important;
}

:deep(.ant-input::placeholder) {
  color: rgba(255, 255, 255, 0.35) !important;
}

:deep(.ant-input:focus),
:deep(.ant-input-focused) {
  border-color: #1890ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
}

:deep(.ant-input-password-icon) {
  color: rgba(255, 255, 255, 0.45) !important;
}

:deep(.ant-slider-track) {
  background: #1890ff !important;
}

:deep(.ant-slider-handle) {
  border-color: #1890ff !important;
}

:deep(.ant-slider-mark-text) {
  color: rgba(255, 255, 255, 0.45) !important;
}
</style>
