<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSuperAdminAuthStore } from '@/stores/superAdminAuth';

const router = useRouter();
const authStore = useSuperAdminAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const formError = ref('');

const isFormValid = computed(() => {
  return email.value.includes('@') && password.value.length >= 8;
});

const handleSubmit = async () => {
  formError.value = '';

  const success = await authStore.login(email.value, password.value);

  if (success) {
    router.push('/super-admin');
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
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-gray-900">MenuQR</h1>
          </div>
          <p class="mt-2 text-sm text-gray-600">
            Espace Super Administrateur
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Error message -->
          <div
            v-if="formError"
            class="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700"
          >
            {{ formError }}
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
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="superadmin@menuqr.fr"
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
                class="block w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Min. 8 caracteres"
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
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            :disabled="!isFormValid || authStore.isLoading"
            class="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            Se connecter
          </button>
        </form>

        <!-- Security notice -->
        <div class="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-purple-800">Acces restreint</p>
              <p class="text-xs text-purple-600 mt-1">
                Cette interface est reservee aux super administrateurs de la plateforme MenuQR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Purple Gradient -->
    <div class="hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 lg:block lg:w-1/2">
      <div class="flex h-full flex-col items-center justify-center px-12 text-white">
        <div class="max-w-md text-center">
          <svg class="mx-auto h-20 w-20 mb-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <h2 class="text-3xl font-bold">Super Administration</h2>
          <p class="mt-4 text-lg text-purple-100">
            Gerez l'ensemble de la plateforme MenuQR depuis votre tableau de bord centralise.
          </p>
          <ul class="mt-8 space-y-3 text-left text-purple-100">
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Gestion de tous les restaurants
            </li>
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Suivi des abonnements et facturation
            </li>
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Analytics et reporting global
            </li>
            <li class="flex items-center gap-3">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Gestion des utilisateurs
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
