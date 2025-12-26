<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfigStore } from '@/stores/configStore';
import AppHeader from '@/components/common/AppHeader.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import BaseIcon from '@/components/common/BaseIcon.vue';

const { t } = useI18n();
const configStore = useConfigStore();
const locale = computed(() => configStore.locale);

const appVersion = '1.0.0';
const buildDate = 'Décembre 2024';
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <AppHeader :show-back="true" :title="t('about.title')" show-lang />

    <div class="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <!-- App Info Card -->
      <BaseCard>
        <div class="text-center py-6">
          <div
            class="w-24 h-24 mx-auto mb-4 bg-primary-100 rounded-2xl flex items-center justify-center"
          >
            <span class="text-5xl">🍽️</span>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">MenuQR</h1>
          <p class="text-gray-600 mb-1">{{ t('about.version') }}: {{ appVersion }}</p>
          <p class="text-sm text-gray-500">{{ t('about.tagline') }}</p>
          <div class="mt-4 flex justify-center gap-2">
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              PWA
            </span>
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              Offline Ready
            </span>
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
            >
              FR/EN
            </span>
          </div>
        </div>
      </BaseCard>

      <!-- Description Card -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-3">
          {{ t('about.description.title') }}
        </h2>
        <p class="text-gray-600 leading-relaxed mb-4">
          {{ t('about.description.text1') }}
        </p>
        <p class="text-gray-600 leading-relaxed">
          {{ t('about.description.text2') }}
        </p>
      </BaseCard>

      <!-- How it Works -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Comment ça marche' : 'How it Works' }}
        </h2>
        <div class="space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center"
            >
              <span class="text-2xl">📱</span>
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Scannez le QR Code' : 'Scan the QR Code' }}
              </h3>
              <p class="text-sm text-gray-600">
                {{
                  locale === 'fr'
                    ? "Scannez le code QR sur votre table ou à l'entrée du restaurant."
                    : 'Scan the QR code on your table or at the restaurant entrance.'
                }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center"
            >
              <span class="text-2xl">🍛</span>
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Parcourez le menu' : 'Browse the Menu' }}
              </h3>
              <p class="text-sm text-gray-600">
                {{
                  locale === 'fr'
                    ? 'Découvrez nos plats, leurs descriptions et personnalisez vos options.'
                    : 'Discover our dishes, their descriptions and customize your options.'
                }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"
            >
              <span class="text-2xl">💬</span>
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Commandez via WhatsApp' : 'Order via WhatsApp' }}
              </h3>
              <p class="text-sm text-gray-600">
                {{
                  locale === 'fr'
                    ? 'Envoyez votre commande directement au restaurant en un clic.'
                    : 'Send your order directly to the restaurant in one click.'
                }}
              </p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Features Card -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ t('about.features.title') }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <div>
              <span class="font-medium text-gray-900">{{ t('about.features.offline') }}</span>
              <p class="text-xs text-gray-500">
                {{
                  locale === 'fr'
                    ? 'Consultez le menu sans connexion'
                    : 'Browse menu without connection'
                }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <div>
              <span class="font-medium text-gray-900">{{ t('about.features.whatsapp') }}</span>
              <p class="text-xs text-gray-500">
                {{ locale === 'fr' ? 'Simple et rapide' : 'Simple and fast' }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <div>
              <span class="font-medium text-gray-900">{{ t('about.features.multilingual') }}</span>
              <p class="text-xs text-gray-500">
                {{ locale === 'fr' ? 'Interface adaptée' : 'Adapted interface' }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <div>
              <span class="font-medium text-gray-900">{{ t('about.features.fast') }}</span>
              <p class="text-xs text-gray-500">
                {{ locale === 'fr' ? 'Chargement instantané' : 'Instant loading' }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <div>
              <span class="font-medium text-gray-900">{{ t('about.features.mobile') }}</span>
              <p class="text-xs text-gray-500">
                {{ locale === 'fr' ? 'Parfait sur smartphone' : 'Perfect on smartphone' }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="check" size="sm" class="text-green-600" />
            </div>
            <div>
              <span class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Installable' : 'Installable' }}
              </span>
              <p class="text-xs text-gray-500">
                {{ locale === 'fr' ? 'Comme une vraie app' : 'Like a real app' }}
              </p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Technology Card -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ t('about.technology.title') }}
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-2xl mb-1">⚡</div>
            <div class="font-semibold text-gray-900">Vue 3</div>
            <div class="text-xs text-gray-500">Framework</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-2xl mb-1">📘</div>
            <div class="font-semibold text-gray-900">TypeScript</div>
            <div class="text-xs text-gray-500">Language</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-2xl mb-1">🎨</div>
            <div class="font-semibold text-gray-900">Tailwind</div>
            <div class="text-xs text-gray-500">Styling</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-2xl mb-1">🗃️</div>
            <div class="font-semibold text-gray-900">Pinia</div>
            <div class="text-xs text-gray-500">State</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-2xl mb-1">🚀</div>
            <div class="font-semibold text-gray-900">Vite</div>
            <div class="text-xs text-gray-500">Build</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-2xl mb-1">📱</div>
            <div class="font-semibold text-gray-900">PWA</div>
            <div class="text-xs text-gray-500">Progressive</div>
          </div>
        </div>
      </BaseCard>

      <!-- Quick Links -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Liens rapides' : 'Quick Links' }}
        </h2>
        <div class="space-y-2">
          <router-link
            to="/help"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">❓</span>
              <span class="text-gray-700">{{
                locale === 'fr' ? "Centre d'aide" : 'Help Center'
              }}</span>
            </div>
            <BaseIcon name="arrow-right" size="sm" class="text-gray-400" />
          </router-link>
          <router-link
            to="/install"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">📲</span>
              <span class="text-gray-700">{{
                locale === 'fr' ? "Installer l'app" : 'Install App'
              }}</span>
            </div>
            <BaseIcon name="arrow-right" size="sm" class="text-gray-400" />
          </router-link>
          <router-link
            to="/contact"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">📞</span>
              <span class="text-gray-700">{{ locale === 'fr' ? 'Contact' : 'Contact' }}</span>
            </div>
            <BaseIcon name="arrow-right" size="sm" class="text-gray-400" />
          </router-link>
        </div>
      </BaseCard>

      <!-- Legal Links -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Informations légales' : 'Legal Information' }}
        </h2>
        <div class="space-y-2">
          <router-link
            to="/terms"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-gray-700">{{
              locale === 'fr' ? "Conditions d'utilisation" : 'Terms of Service'
            }}</span>
            <BaseIcon name="arrow-right" size="sm" class="text-gray-400" />
          </router-link>
          <router-link
            to="/privacy"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-gray-700">{{
              locale === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'
            }}</span>
            <BaseIcon name="arrow-right" size="sm" class="text-gray-400" />
          </router-link>
        </div>
      </BaseCard>

      <!-- Contact Card -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ t('about.contact.title') }}
        </h2>
        <p class="text-gray-600 mb-4">
          {{ t('about.contact.text') }}
        </p>
        <div class="space-y-3">
          <a
            href="mailto:contact@menuqr.bf"
            class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-xl">📧</span>
            <span class="text-primary-600">contact@menuqr.bf</span>
          </a>
        </div>
      </BaseCard>

      <!-- App Info Footer -->
      <BaseCard>
        <div class="text-center py-2">
          <div class="text-sm text-gray-500 space-y-1">
            <p>
              <strong>Version:</strong> {{ appVersion }} | <strong>Build:</strong> {{ buildDate }}
            </p>
            <p>
              {{
                locale === 'fr'
                  ? 'Développé avec ❤️ au Burkina Faso'
                  : 'Developed with ❤️ in Burkina Faso'
              }}
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- Credits -->
      <div class="text-center text-sm text-gray-500 py-4">
        <p>© 2024 MenuQR. {{ t('about.credits') }}</p>
        <p class="mt-1">{{ t('about.made_in') }} 🇧🇫</p>
      </div>
    </div>
  </div>
</template>
