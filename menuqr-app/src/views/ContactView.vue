<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMenuStore } from '@/stores/menuStore';
import { useConfigStore } from '@/stores/configStore';
import AppHeader from '@/components/common/AppHeader.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import BaseIcon from '@/components/common/BaseIcon.vue';
import { getLocalizedString } from '@/utils/formatters';

const { t } = useI18n();
const menuStore = useMenuStore();
const configStore = useConfigStore();

const restaurant = computed(() => menuStore.restaurant);
const locale = computed(() => configStore.locale);

// FAQ items
interface FAQItem {
  question: string;
  answer: string;
}

const faqItems = computed<FAQItem[]>(() => {
  if (locale.value === 'fr') {
    return [
      {
        question: 'Comment passer une commande ?',
        answer:
          "Parcourez le menu, ajoutez les plats souhaités au panier, puis cliquez sur 'Commander sur WhatsApp'. Votre commande sera envoyée directement au restaurant via WhatsApp.",
      },
      {
        question: 'Puis-je modifier ma commande après envoi ?',
        answer:
          'Une fois la commande envoyée sur WhatsApp, contactez directement le restaurant via le chat WhatsApp pour toute modification. Ils seront ravis de vous aider.',
      },
      {
        question: 'Comment fonctionne le numéro de table ?',
        answer:
          'Si vous êtes au restaurant, scannez le QR code sur votre table. Le numéro de table sera automatiquement inclus dans votre commande. Pour les commandes à emporter, laissez ce champ vide.',
      },
      {
        question: "L'application fonctionne-t-elle hors ligne ?",
        answer:
          "Oui ! MenuQR est une application progressive (PWA). Une fois chargée, vous pouvez consulter le menu même sans connexion internet. Cependant, l'envoi de commande nécessite une connexion.",
      },
      {
        question: 'Comment installer MenuQR sur mon téléphone ?',
        answer:
          "Visitez la page 'Installer l'app' depuis le menu. Sur iPhone, utilisez le bouton Partager puis 'Sur l'écran d'accueil'. Sur Android, utilisez le menu du navigateur et sélectionnez 'Installer l'application'.",
      },
      {
        question: 'Comment contacter le restaurant ?',
        answer:
          "Utilisez le bouton WhatsApp ci-dessus pour envoyer un message directement au restaurant. Ils répondent généralement rapidement pendant les heures d'ouverture.",
      },
    ];
  } else {
    return [
      {
        question: 'How do I place an order?',
        answer:
          "Browse the menu, add your desired dishes to the cart, then click 'Order on WhatsApp'. Your order will be sent directly to the restaurant via WhatsApp.",
      },
      {
        question: 'Can I modify my order after sending?',
        answer:
          "Once the order is sent via WhatsApp, contact the restaurant directly through the WhatsApp chat for any modifications. They'll be happy to help.",
      },
      {
        question: 'How does the table number work?',
        answer:
          "If you're at the restaurant, scan the QR code on your table. The table number will be automatically included in your order. For takeaway orders, leave this field empty.",
      },
      {
        question: 'Does the app work offline?',
        answer:
          'Yes! MenuQR is a progressive web app (PWA). Once loaded, you can browse the menu even without internet connection. However, sending an order requires a connection.',
      },
      {
        question: 'How do I install MenuQR on my phone?',
        answer:
          "Visit the 'Install app' page from the menu. On iPhone, use the Share button then 'Add to Home Screen'. On Android, use the browser menu and select 'Install app'.",
      },
      {
        question: 'How do I contact the restaurant?',
        answer:
          'Use the WhatsApp button above to send a message directly to the restaurant. They usually respond quickly during opening hours.',
      },
    ];
  }
});

// Track which FAQ items are expanded
const expandedFAQ = ref<number[]>([]);

const toggleFAQ = (index: number) => {
  const idx = expandedFAQ.value.indexOf(index);
  if (idx > -1) {
    expandedFAQ.value.splice(idx, 1);
  } else {
    expandedFAQ.value.push(index);
  }
};

const isFAQExpanded = (index: number) => expandedFAQ.value.includes(index);
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <AppHeader :show-back="true" :title="t('contact.title')" show-lang />

    <div class="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <!-- Restaurant Info Card -->
      <BaseCard v-if="restaurant">
        <div class="text-center py-6">
          <div
            class="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center"
          >
            <span class="text-4xl">🍽️</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ restaurant.name }}</h1>
          <p class="text-gray-600">{{ getLocalizedString(restaurant.description, locale) }}</p>
        </div>
      </BaseCard>

      <!-- Contact Information -->
      <BaseCard v-if="restaurant">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">{{ t('contact.info') }}</h2>

        <div class="space-y-4">
          <!-- WhatsApp -->
          <a
            :href="`https://wa.me/${restaurant.whatsappNumber.replace(/\D/g, '')}`"
            class="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div
              class="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="phone" size="md" class="text-white" />
            </div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900">WhatsApp</div>
              <div class="text-sm text-gray-600">{{ restaurant.whatsappNumber }}</div>
              <div class="text-sm text-green-600 mt-1">{{ t('contact.whatsapp_action') }}</div>
            </div>
            <BaseIcon name="arrow-right" size="sm" class="text-green-600 mt-3" />
          </a>

          <!-- Address -->
          <div class="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div
              class="flex-shrink-0 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="location" size="md" class="text-white" />
            </div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900">{{ t('contact.address') }}</div>
              <div class="text-sm text-gray-600">{{ restaurant.address }}</div>
              <div class="text-sm text-gray-600">{{ restaurant.city }}</div>
            </div>
          </div>

          <!-- Opening Hours -->
          <div class="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div
              class="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center"
            >
              <BaseIcon name="clock" size="md" class="text-white" />
            </div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900 mb-2">{{ t('contact.hours') }}</div>
              <div class="space-y-1 text-sm">
                <div
                  v-for="(hours, day) in restaurant.openingHours"
                  :key="day"
                  class="flex justify-between"
                >
                  <span class="text-gray-600 capitalize">{{ t(`days.${day}`) }}</span>
                  <span v-if="hours.isClosed" class="text-red-600">{{ t('contact.closed') }}</span>
                  <span v-else class="text-gray-900 font-medium"
                    >{{ hours.open }} - {{ hours.close }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- FAQ Section -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Questions fréquentes' : 'Frequently Asked Questions' }}
        </h2>

        <div class="space-y-3">
          <div
            v-for="(item, index) in faqItems"
            :key="index"
            class="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              @click="toggleFAQ(index)"
            >
              <span class="font-medium text-gray-900 pr-4">{{ item.question }}</span>
              <BaseIcon
                :name="isFAQExpanded(index) ? 'minus' : 'plus'"
                size="sm"
                class="flex-shrink-0 text-gray-500"
              />
            </button>
            <div
              v-show="isFAQExpanded(index)"
              class="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3"
            >
              {{ item.answer }}
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Help Section -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">{{ t('contact.help.title') }}</h2>
        <div class="space-y-3 text-sm text-gray-600">
          <p class="flex items-start gap-2">
            <span class="text-lg">📱</span>
            <span>{{ t('contact.help.order') }}</span>
          </p>
          <p class="flex items-start gap-2">
            <span class="text-lg">💬</span>
            <span>{{ t('contact.help.issue') }}</span>
          </p>
          <p class="flex items-start gap-2">
            <span class="text-lg">💡</span>
            <span>{{ t('contact.help.feedback') }}</span>
          </p>
        </div>
      </BaseCard>

      <!-- Quick Links -->
      <BaseCard>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Liens utiles' : 'Useful Links' }}
        </h2>
        <div class="space-y-2">
          <router-link
            to="/help"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-gray-700">{{
              locale === 'fr' ? "Centre d'aide" : 'Help Center'
            }}</span>
            <BaseIcon name="arrow-right" size="sm" class="text-gray-400" />
          </router-link>
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
    </div>
  </div>
</template>
