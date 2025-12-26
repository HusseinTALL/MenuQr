<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '@/stores/configStore';
import { useMenuStore } from '@/stores/menuStore';
import AppHeader from '@/components/common/AppHeader.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import BaseIcon from '@/components/common/BaseIcon.vue';
import BaseButton from '@/components/common/BaseButton.vue';

const configStore = useConfigStore();
const menuStore = useMenuStore();

const locale = computed(() => configStore.locale);
const restaurant = computed(() => menuStore.restaurant);

const whatsappUrl = computed(() => {
  if (!restaurant.value) {
    return '#';
  }
  const phone = restaurant.value.whatsappNumber.replace(/\D/g, '');
  const message =
    locale.value === 'fr'
      ? "Bonjour, j'ai besoin d'aide avec MenuQR."
      : 'Hello, I need help with MenuQR.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <AppHeader
      :show-back="true"
      :title="locale === 'fr' ? 'Centre d\'aide' : 'Help Center'"
      show-lang
    />

    <div class="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <!-- Header -->
      <BaseCard>
        <div class="text-center py-6">
          <div
            class="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center"
          >
            <span class="text-4xl">❓</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            {{ locale === 'fr' ? 'Comment pouvons-nous vous aider ?' : 'How can we help you?' }}
          </h1>
          <p class="text-gray-600">
            {{
              locale === 'fr'
                ? 'Trouvez des réponses à vos questions ci-dessous'
                : 'Find answers to your questions below'
            }}
          </p>
        </div>
      </BaseCard>

      <!-- Quick Actions -->
      <BaseCard>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Actions rapides' : 'Quick Actions' }}
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <router-link
            to="/menu"
            class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-2xl mb-2">📋</span>
            <span class="text-sm text-gray-700 text-center">{{
              locale === 'fr' ? 'Voir le menu' : 'View menu'
            }}</span>
          </router-link>
          <router-link
            to="/cart"
            class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-2xl mb-2">🛒</span>
            <span class="text-sm text-gray-700 text-center">{{
              locale === 'fr' ? 'Mon panier' : 'My cart'
            }}</span>
          </router-link>
          <router-link
            to="/contact"
            class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-2xl mb-2">📍</span>
            <span class="text-sm text-gray-700 text-center">{{
              locale === 'fr' ? 'Contact' : 'Contact'
            }}</span>
          </router-link>
          <router-link
            to="/install"
            class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-2xl mb-2">📲</span>
            <span class="text-sm text-gray-700 text-center">{{
              locale === 'fr' ? 'Installer' : 'Install'
            }}</span>
          </router-link>
        </div>
      </BaseCard>

      <!-- Guide: How to Order -->
      <BaseCard>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Comment commander' : 'How to Order' }}
        </h2>
        <div class="space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold"
            >
              1
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Parcourez le menu' : 'Browse the menu' }}
              </h3>
              <p class="text-sm text-gray-600">
                {{
                  locale === 'fr'
                    ? 'Explorez les différentes catégories et découvrez nos plats.'
                    : 'Explore different categories and discover our dishes.'
                }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold"
            >
              2
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Ajoutez au panier' : 'Add to cart' }}
              </h3>
              <p class="text-sm text-gray-600">
                {{
                  locale === 'fr'
                    ? 'Cliquez sur un plat, choisissez vos options et ajoutez-le au panier.'
                    : 'Click on a dish, choose your options and add it to the cart.'
                }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold"
            >
              3
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Vérifiez votre commande' : 'Review your order' }}
              </h3>
              <p class="text-sm text-gray-600">
                {{
                  locale === 'fr'
                    ? 'Accédez au panier pour vérifier les quantités et ajouter des notes.'
                    : 'Access the cart to verify quantities and add notes.'
                }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold"
            >
              4
            </div>
            <div>
              <h3 class="font-medium text-gray-900">
                {{ locale === 'fr' ? 'Envoyez via WhatsApp' : 'Send via WhatsApp' }}
              </h3>
              <p class="text-sm text-gray-600">
                {{
                  locale === 'fr'
                    ? "Cliquez sur 'Commander sur WhatsApp' pour envoyer directement au restaurant."
                    : "Click 'Order on WhatsApp' to send directly to the restaurant."
                }}
              </p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Tips -->
      <BaseCard>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Conseils utiles' : 'Useful Tips' }}
        </h2>
        <div class="space-y-3">
          <div class="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <span class="text-xl">💡</span>
            <p class="text-sm text-gray-700">
              {{
                locale === 'fr'
                  ? 'Installez MenuQR sur votre téléphone pour un accès plus rapide et une utilisation hors ligne.'
                  : 'Install MenuQR on your phone for faster access and offline use.'
              }}
            </p>
          </div>
          <div class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <span class="text-xl">📱</span>
            <p class="text-sm text-gray-700">
              {{
                locale === 'fr'
                  ? 'Si vous êtes au restaurant, scannez le QR code sur votre table pour pré-remplir le numéro de table.'
                  : "If you're at the restaurant, scan the QR code on your table to pre-fill the table number."
              }}
            </p>
          </div>
          <div class="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <span class="text-xl">✏️</span>
            <p class="text-sm text-gray-700">
              {{
                locale === 'fr'
                  ? "Utilisez le champ 'Notes' pour préciser vos préférences (sans oignon, bien cuit, etc.)."
                  : "Use the 'Notes' field to specify your preferences (no onion, well done, etc.)."
              }}
            </p>
          </div>
          <div class="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <span class="text-xl">🌐</span>
            <p class="text-sm text-gray-700">
              {{
                locale === 'fr'
                  ? "Changez la langue en cliquant sur l'icône FR/EN dans l'en-tête."
                  : 'Change the language by clicking the FR/EN icon in the header.'
              }}
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- Troubleshooting -->
      <BaseCard>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Problèmes courants' : 'Common Issues' }}
        </h2>
        <div class="space-y-4">
          <div class="border-b border-gray-200 pb-4">
            <h3 class="font-medium text-gray-900 mb-2">
              {{ locale === 'fr' ? "WhatsApp ne s'ouvre pas" : "WhatsApp doesn't open" }}
            </h3>
            <p class="text-sm text-gray-600">
              {{
                locale === 'fr'
                  ? "Assurez-vous que WhatsApp est installé sur votre appareil. Si le problème persiste, utilisez le bouton 'Copier la commande' et collez manuellement dans WhatsApp."
                  : "Make sure WhatsApp is installed on your device. If the problem persists, use the 'Copy order' button and manually paste into WhatsApp."
              }}
            </p>
          </div>
          <div class="border-b border-gray-200 pb-4">
            <h3 class="font-medium text-gray-900 mb-2">
              {{ locale === 'fr' ? 'Le menu ne charge pas' : "Menu doesn't load" }}
            </h3>
            <p class="text-sm text-gray-600">
              {{
                locale === 'fr'
                  ? 'Vérifiez votre connexion internet et rafraîchissez la page. Le menu fonctionne également hors ligne après le premier chargement.'
                  : 'Check your internet connection and refresh the page. The menu also works offline after the first load.'
              }}
            </p>
          </div>
          <div>
            <h3 class="font-medium text-gray-900 mb-2">
              {{ locale === 'fr' ? 'Mon panier a disparu' : 'My cart disappeared' }}
            </h3>
            <p class="text-sm text-gray-600">
              {{
                locale === 'fr'
                  ? 'Le panier est sauvegardé localement. Si vous avez effacé les données du navigateur ou utilisez la navigation privée, le panier peut être réinitialisé.'
                  : 'The cart is saved locally. If you cleared browser data or use private browsing, the cart may be reset.'
              }}
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- Contact Support -->
      <BaseCard>
        <div class="text-center py-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-2">
            {{ locale === 'fr' ? "Besoin d'aide supplémentaire ?" : 'Need more help?' }}
          </h2>
          <p class="text-gray-600 mb-4">
            {{
              locale === 'fr'
                ? 'Contactez-nous directement via WhatsApp'
                : 'Contact us directly via WhatsApp'
            }}
          </p>
          <a :href="whatsappUrl" target="_blank" rel="noopener noreferrer">
            <BaseButton variant="whatsapp" size="lg">
              <BaseIcon name="phone" size="sm" />
              {{ locale === 'fr' ? 'Contacter le support' : 'Contact Support' }}
            </BaseButton>
          </a>
        </div>
      </BaseCard>

      <!-- Related Links -->
      <BaseCard>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ locale === 'fr' ? 'Voir aussi' : 'See Also' }}
        </h2>
        <div class="space-y-2">
          <router-link
            to="/about"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="text-gray-700">{{ locale === 'fr' ? 'À propos' : 'About' }}</span>
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
