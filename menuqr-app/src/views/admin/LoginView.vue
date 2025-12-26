<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuthStore } from '@/stores/adminAuth';

const router = useRouter();
const authStore = useAdminAuthStore();

const isLoginMode = ref(true);
const email = ref('');
const password = ref('');
const name = ref('');
const showPassword = ref(false);
const formError = ref('');

const isFormValid = computed(() => {
  if (isLoginMode.value) {
    return email.value.includes('@') && password.value.length >= 8;
  }
  return email.value.includes('@') && password.value.length >= 8 && name.value.length >= 2;
});

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value;
  formError.value = '';
};

const handleSubmit = async () => {
  formError.value = '';

  let success = false;
  if (isLoginMode.value) {
    success = await authStore.login(email.value, password.value);
  } else {
    success = await authStore.register(email.value, password.value, name.value);
  }

  if (success) {
    router.push('/admin');
  } else {
    formError.value = authStore.error || 'Une erreur est survenue';
  }
};
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Left side - Form -->
    <div class="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">MenuQR</h1>
          <p class="mt-2 text-sm text-gray-600">
            {{ isLoginMode ? 'Connectez-vous à votre espace admin' : 'Créez votre compte restaurateur' }}
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Error message -->
          <div
            v-if="formError"
            class="rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            {{ formError }}
          </div>

          <!-- Name (register only) -->
          <div v-if="!isLoginMode">
            <label for="name" class="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              id="name"
              v-model="name"
              type="text"
              required
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Jean Dupont"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Adresse email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="vous@restaurant.fr"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <div class="relative mt-1">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                :minlength="8"
                autocomplete="current-password"
                class="block w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Min. 8 caractères"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
            <p v-if="!isLoginMode" class="mt-1 text-xs text-gray-500">
              Minimum 8 caractères avec au moins une lettre et un chiffre
            </p>
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            :disabled="!isFormValid || authStore.isLoading"
            class="flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            <svg
              v-if="authStore.isLoading"
              class="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ isLoginMode ? 'Se connecter' : 'Créer mon compte' }}
          </button>

          <!-- Toggle mode -->
          <div class="text-center text-sm">
            <span class="text-gray-600">
              {{ isLoginMode ? 'Pas encore de compte ?' : 'Déjà un compte ?' }}
            </span>
            <button
              type="button"
              class="ml-1 font-semibold text-orange-600 hover:text-orange-500"
              @click="toggleMode"
            >
              {{ isLoginMode ? 'Inscrivez-vous' : 'Connectez-vous' }}
            </button>
          </div>
        </form>

        <!-- Back to menu -->
        <div class="mt-8 text-center">
          <router-link
            to="/"
            class="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Retour au menu
          </router-link>
        </div>
      </div>
    </div>

    <!-- Right side - Image/Gradient -->
    <div class="hidden bg-gradient-to-br from-orange-500 to-red-600 lg:block lg:w-1/2">
      <div class="flex h-full flex-col items-center justify-center px-12 text-white">
        <div class="max-w-md text-center">
          <svg class="mx-auto h-20 w-20 mb-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
          </svg>
          <h2 class="text-3xl font-bold">Gérez votre menu en toute simplicité</h2>
          <p class="mt-4 text-lg text-orange-100">
            Créez et modifiez votre menu digital, gérez vos commandes en temps réel et analysez vos ventes.
          </p>
          <ul class="mt-8 space-y-3 text-left text-orange-100">
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Menu digital avec QR code
            </li>
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Gestion des commandes en temps réel
            </li>
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Statistiques et analyses
            </li>
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Multi-langues (FR/EN)
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
