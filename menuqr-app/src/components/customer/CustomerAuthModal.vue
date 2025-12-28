<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCustomerAuthStore } from '@/stores/customerAuth';

const props = defineProps<{
  show: boolean;
  restaurantId: string;
  restaurantName?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const authStore = useCustomerAuthStore();

// Auth flow steps
type AuthStep = 'choice' | 'phone' | 'otp' | 'register' | 'login' | 'forgot' | 'reset';
const currentStep = ref<AuthStep>('choice');
const authMode = ref<'register' | 'login'>('register');

// Form data
const phone = ref('');
const otpCode = ref('');
const password = ref('');
const confirmPassword = ref('');
const name = ref('');
const email = ref('');
const showPassword = ref(false);

// OTP timer
const otpCountdown = ref(0);
let otpTimer: number | null = null;

// Form validation
const isPhoneValid = computed(() => {
  const cleanPhone = phone.value.replace(/\s/g, '');
  return cleanPhone.length >= 8 && /^[+]?[\d]+$/.test(cleanPhone);
});

const isOtpValid = computed(() => otpCode.value.length === 6 && /^\d+$/.test(otpCode.value));

const isPasswordValid = computed(() => password.value.length >= 6 && /\d/.test(password.value));

const isRegisterFormValid = computed(() => {
  return isPasswordValid.value && password.value === confirmPassword.value;
});

const isLoginFormValid = computed(() => password.value.length > 0);

// Error message
const errorMessage = computed(() => authStore.error);

// Start OTP countdown
function startOtpCountdown(seconds: number) {
  otpCountdown.value = seconds;
  if (otpTimer) {clearInterval(otpTimer);}
  otpTimer = setInterval(() => {
    if (otpCountdown.value > 0) {
      otpCountdown.value--;
    } else if (otpTimer) {
      clearInterval(otpTimer);
    }
  }, 1000) as unknown as number;
}

// Reset form
function resetForm() {
  phone.value = '';
  otpCode.value = '';
  password.value = '';
  confirmPassword.value = '';
  name.value = '';
  email.value = '';
  showPassword.value = false;
  currentStep.value = 'choice';
  authStore.error = null;
  if (otpTimer) {clearInterval(otpTimer);}
}

// Close modal
function closeModal() {
  resetForm();
  emit('close');
}

// Step 1: Check if phone exists and determine flow
async function handlePhoneSubmit() {
  if (!isPhoneValid.value) {return;}

  const result = await authStore.checkPhone(phone.value, props.restaurantId);

  if (result.exists) {
    // Phone exists - go to login
    authMode.value = 'login';
    currentStep.value = 'login';
  } else {
    // New phone - send OTP for registration
    authMode.value = 'register';
    await sendOtp('register');
  }
}

// Send OTP
async function sendOtp(type: 'register' | 'login' | 'reset_password') {
  const result = await authStore.sendOtp(phone.value, props.restaurantId, type);
  if (result.success) {
    currentStep.value = 'otp';
    startOtpCountdown(60);
  }
}

// Resend OTP
async function resendOtp() {
  if (otpCountdown.value > 0) {return;}
  await sendOtp(authMode.value === 'register' ? 'register' : 'reset_password');
}

// Verify OTP
async function handleOtpSubmit() {
  if (!isOtpValid.value) {return;}

  const result = await authStore.verifyOtp(phone.value, props.restaurantId, otpCode.value);
  if (result.success) {
    if (result.type === 'reset_password') {
      currentStep.value = 'reset';
    } else {
      currentStep.value = 'register';
    }
  }
}

// Register
async function handleRegister() {
  if (!isRegisterFormValid.value) {return;}

  const success = await authStore.register(
    phone.value,
    props.restaurantId,
    password.value,
    name.value || undefined,
    email.value || undefined
  );

  if (success) {
    emit('success');
    closeModal();
  }
}

// Login
async function handleLogin() {
  if (!isLoginFormValid.value) {return;}

  const success = await authStore.login(phone.value, props.restaurantId, password.value);

  if (success) {
    emit('success');
    closeModal();
  }
}

// Forgot password
function goToForgotPassword() {
  authMode.value = 'login';
  currentStep.value = 'forgot';
}

// Send forgot password OTP
async function handleForgotPassword() {
  if (!isPhoneValid.value) {return;}
  const success = await authStore.forgotPassword(phone.value, props.restaurantId);
  if (success) {
    currentStep.value = 'otp';
    startOtpCountdown(60);
  }
}

// Reset password
async function handleResetPassword() {
  if (!isPasswordValid.value || password.value !== confirmPassword.value) {return;}

  const success = await authStore.resetPassword(
    phone.value,
    props.restaurantId,
    otpCode.value,
    password.value
  );

  if (success) {
    currentStep.value = 'login';
    password.value = '';
    confirmPassword.value = '';
  }
}

// Go back
function goBack() {
  authStore.error = null;
  switch (currentStep.value) {
    case 'phone':
      currentStep.value = 'choice';
      break;
    case 'otp':
      currentStep.value = 'phone';
      break;
    case 'register':
      currentStep.value = 'otp';
      break;
    case 'login':
      currentStep.value = 'phone';
      break;
    case 'forgot':
      currentStep.value = 'login';
      break;
    case 'reset':
      currentStep.value = 'forgot';
      break;
    default:
      currentStep.value = 'choice';
  }
}

// Continue as guest
function continueAsGuest() {
  emit('close');
}

// Watch for modal open to init store
watch(() => props.show, (show) => {
  if (show) {
    authStore.initForRestaurant(props.restaurantId);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="closeModal">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
            <div class="flex items-center justify-between">
              <button
                v-if="currentStep !== 'choice'"
                @click="goBack"
                class="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 class="text-xl font-bold text-center flex-1">
                {{ currentStep === 'choice' ? 'Mon Compte' :
                   currentStep === 'phone' ? 'Connexion' :
                   currentStep === 'otp' ? 'Vérification' :
                   currentStep === 'register' ? 'Créer un compte' :
                   currentStep === 'login' ? 'Se connecter' :
                   currentStep === 'forgot' ? 'Mot de passe oublié' :
                   'Nouveau mot de passe' }}
              </h2>
              <button @click="closeModal" class="p-1 hover:bg-white/20 rounded-full transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p v-if="restaurantName" class="text-white/80 text-sm text-center mt-1">{{ restaurantName }}</p>
          </div>

          <!-- Content -->
          <div class="p-6">
            <!-- Error message -->
            <div v-if="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {{ errorMessage }}
            </div>

            <!-- Choice step -->
            <div v-if="currentStep === 'choice'" class="space-y-4">
              <p class="text-gray-600 text-center mb-6">
                Créez un compte ou connectez-vous pour profiter d'avantages exclusifs
              </p>

              <div class="space-y-3">
                <div class="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-sm text-gray-700">Commande plus rapide</span>
                </div>
                <div class="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span class="text-sm text-gray-700">Plats favoris sauvegardés</span>
                </div>
                <div class="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span class="text-sm text-gray-700">Historique des commandes</span>
                </div>
              </div>

              <button
                @click="currentStep = 'phone'"
                class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all"
              >
                Continuer avec mon téléphone
              </button>

              <button
                @click="continueAsGuest"
                class="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Continuer en tant qu'invité
              </button>
            </div>

            <!-- Phone step -->
            <div v-if="currentStep === 'phone'" class="space-y-4">
              <p class="text-gray-600 text-sm text-center mb-4">
                Entrez votre numéro de téléphone pour vous connecter ou créer un compte
              </p>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Numéro de téléphone</label>
                <input
                  v-model="phone"
                  type="tel"
                  placeholder="+226 70 00 00 00"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  @keyup.enter="handlePhoneSubmit"
                />
              </div>

              <button
                @click="handlePhoneSubmit"
                :disabled="!isPhoneValid || authStore.isLoading"
                class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="authStore.isLoading" class="flex items-center justify-center gap-2">
                  <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Vérification...
                </span>
                <span v-else>Continuer</span>
              </button>
            </div>

            <!-- OTP step -->
            <div v-if="currentStep === 'otp'" class="space-y-4">
              <p class="text-gray-600 text-sm text-center mb-4">
                Entrez le code à 6 chiffres envoyé au<br>
                <span class="font-semibold text-gray-900">{{ phone }}</span>
              </p>

              <div>
                <input
                  v-model="otpCode"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="000000"
                  class="w-full px-4 py-4 text-2xl text-center tracking-[0.5em] border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  @keyup.enter="handleOtpSubmit"
                />
              </div>

              <button
                @click="handleOtpSubmit"
                :disabled="!isOtpValid || authStore.isLoading"
                class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="authStore.isLoading">Vérification...</span>
                <span v-else>Vérifier le code</span>
              </button>

              <div class="text-center">
                <button
                  @click="resendOtp"
                  :disabled="otpCountdown > 0"
                  class="text-sm text-orange-600 hover:text-orange-700 disabled:text-gray-400"
                >
                  <span v-if="otpCountdown > 0">Renvoyer le code dans {{ otpCountdown }}s</span>
                  <span v-else>Renvoyer le code</span>
                </button>
              </div>
            </div>

            <!-- Register step -->
            <div v-if="currentStep === 'register'" class="space-y-4">
              <p class="text-gray-600 text-sm text-center mb-4">
                Finalisez la création de votre compte
              </p>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom (optionnel)</label>
                <input
                  v-model="name"
                  type="text"
                  placeholder="Votre nom"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email (optionnel)</label>
                <input
                  v-model="email"
                  type="email"
                  placeholder="email@exemple.com"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                <div class="relative">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Min. 6 caractères avec un chiffre"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
                <input
                  v-model="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  @keyup.enter="handleRegister"
                />
              </div>

              <button
                @click="handleRegister"
                :disabled="!isRegisterFormValid || authStore.isLoading"
                class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="authStore.isLoading">Création du compte...</span>
                <span v-else>Créer mon compte</span>
              </button>
            </div>

            <!-- Login step -->
            <div v-if="currentStep === 'login'" class="space-y-4">
              <p class="text-gray-600 text-sm text-center mb-4">
                Entrez votre mot de passe pour vous connecter
              </p>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input
                  :value="phone"
                  type="tel"
                  disabled
                  class="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-600"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                <div class="relative">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Votre mot de passe"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                    @keyup.enter="handleLogin"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                @click="handleLogin"
                :disabled="!isLoginFormValid || authStore.isLoading"
                class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="authStore.isLoading">Connexion...</span>
                <span v-else>Se connecter</span>
              </button>

              <div class="text-center">
                <button
                  @click="goToForgotPassword"
                  class="text-sm text-orange-600 hover:text-orange-700"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            <!-- Forgot password step -->
            <div v-if="currentStep === 'forgot'" class="space-y-4">
              <p class="text-gray-600 text-sm text-center mb-4">
                Entrez votre numéro de téléphone pour réinitialiser votre mot de passe
              </p>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Numéro de téléphone</label>
                <input
                  v-model="phone"
                  type="tel"
                  placeholder="+226 70 00 00 00"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  @keyup.enter="handleForgotPassword"
                />
              </div>

              <button
                @click="handleForgotPassword"
                :disabled="!isPhoneValid || authStore.isLoading"
                class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="authStore.isLoading">Envoi...</span>
                <span v-else>Envoyer le code</span>
              </button>
            </div>

            <!-- Reset password step -->
            <div v-if="currentStep === 'reset'" class="space-y-4">
              <p class="text-gray-600 text-sm text-center mb-4">
                Créez un nouveau mot de passe
              </p>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                <div class="relative">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Min. 6 caractères avec un chiffre"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
                <input
                  v-model="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  @keyup.enter="handleResetPassword"
                />
              </div>

              <button
                @click="handleResetPassword"
                :disabled="!isPasswordValid || password !== confirmPassword || authStore.isLoading"
                class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="authStore.isLoading">Modification...</span>
                <span v-else>Modifier le mot de passe</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
