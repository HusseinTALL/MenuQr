<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '@/stores/configStore';
import AppHeader from '@/components/common/AppHeader.vue';
import BaseCard from '@/components/common/BaseCard.vue';

const configStore = useConfigStore();
const locale = computed(() => configStore.locale);
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <AppHeader
      :show-back="true"
      :title="locale === 'fr' ? 'Confidentialité' : 'Privacy Policy'"
      show-lang
    />

    <div class="container max-w-3xl mx-auto px-4 py-6 space-y-6">
      <!-- Header -->
      <BaseCard>
        <div class="text-center py-4">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            {{ locale === 'fr' ? 'Politique de Confidentialité' : 'Privacy Policy' }}
          </h1>
          <p class="text-sm text-gray-500">
            {{
              locale === 'fr'
                ? 'Dernière mise à jour : Décembre 2024'
                : 'Last updated: December 2024'
            }}
          </p>
        </div>
      </BaseCard>

      <!-- French Version -->
      <template v-if="locale === 'fr'">
        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
          <p class="text-gray-600 leading-relaxed">
            Chez MenuQR, nous accordons une grande importance à la protection de votre vie privée.
            Cette politique explique comment nous collectons, utilisons et protégeons vos
            informations personnelles.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">2. Données collectées</h2>
          <p class="text-gray-600 leading-relaxed mb-3">
            MenuQR collecte un minimum de données pour fonctionner :
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>
              <strong>Données de navigation :</strong> pages visitées, plats consultés (stockées
              localement sur votre appareil)
            </li>
            <li>
              <strong>Panier :</strong> articles ajoutés, quantités, options sélectionnées (stockés
              localement)
            </li>
            <li>
              <strong>Préférences :</strong> langue choisie, numéro de table (stockés localement)
            </li>
            <li>
              <strong>Notes de commande :</strong> instructions spéciales que vous saisissez
              (transmises au restaurant)
            </li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">3. Données NON collectées</h2>
          <p class="text-gray-600 leading-relaxed mb-3">
            MenuQR ne collecte PAS les données suivantes :
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>Nom, prénom ou identité personnelle</li>
            <li>Numéro de téléphone (sauf celui du restaurant)</li>
            <li>Adresse email ou postale</li>
            <li>Informations de paiement ou bancaires</li>
            <li>Géolocalisation précise</li>
            <li>Cookies de suivi tiers</li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">4. Stockage des données</h2>
          <p class="text-gray-600 leading-relaxed">
            Toutes les données sont stockées localement sur votre appareil via le stockage local du
            navigateur (localStorage). Aucune donnée n'est envoyée à nos serveurs. Lorsque vous
            passez une commande, seul le contenu de la commande est transmis au restaurant via
            WhatsApp.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">5. WhatsApp</h2>
          <p class="text-gray-600 leading-relaxed">
            Lorsque vous passez une commande, vous êtes redirigé vers WhatsApp avec un message
            pré-rempli. Ce message est envoyé directement au restaurant. MenuQR n'a pas accès à vos
            conversations WhatsApp ni à votre numéro de téléphone.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">6. Fonctionnement hors ligne</h2>
          <p class="text-gray-600 leading-relaxed">
            MenuQR est une Progressive Web App (PWA) qui fonctionne hors ligne. Le menu et les
            images sont mis en cache sur votre appareil pour un accès rapide, même sans connexion
            internet.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">7. Suppression des données</h2>
          <p class="text-gray-600 leading-relaxed">
            Vous pouvez supprimer toutes les données stockées localement en effaçant les données du
            site dans les paramètres de votre navigateur, ou en désinstallant l'application si vous
            l'avez installée.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">8. Sécurité</h2>
          <p class="text-gray-600 leading-relaxed">
            Nous utilisons HTTPS pour sécuriser toutes les communications. Comme nous ne stockons
            pas de données personnelles sur nos serveurs, le risque de fuite de données est
            minimisé.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">9. Vos droits</h2>
          <p class="text-gray-600 leading-relaxed">
            Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès, de
            rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous
            à :
            <a href="mailto:contact@menuqr.bf" class="text-primary-600 hover:underline"
              >contact@menuqr.bf</a
            >
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">10. Modifications</h2>
          <p class="text-gray-600 leading-relaxed">
            Cette politique peut être mise à jour. Nous vous informerons de tout changement
            significatif via l'application.
          </p>
        </BaseCard>
      </template>

      <!-- English Version -->
      <template v-else>
        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
          <p class="text-gray-600 leading-relaxed">
            At MenuQR, we place great importance on protecting your privacy. This policy explains
            how we collect, use, and protect your personal information.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">2. Data Collected</h2>
          <p class="text-gray-600 leading-relaxed mb-3">
            MenuQR collects minimal data to function:
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>
              <strong>Navigation data:</strong> pages visited, dishes viewed (stored locally on your
              device)
            </li>
            <li>
              <strong>Cart:</strong> items added, quantities, selected options (stored locally)
            </li>
            <li><strong>Preferences:</strong> chosen language, table number (stored locally)</li>
            <li>
              <strong>Order notes:</strong> special instructions you enter (transmitted to the
              restaurant)
            </li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">3. Data NOT Collected</h2>
          <p class="text-gray-600 leading-relaxed mb-3">
            MenuQR does NOT collect the following data:
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>Name or personal identity</li>
            <li>Phone number (except the restaurant's)</li>
            <li>Email or postal address</li>
            <li>Payment or banking information</li>
            <li>Precise geolocation</li>
            <li>Third-party tracking cookies</li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">4. Data Storage</h2>
          <p class="text-gray-600 leading-relaxed">
            All data is stored locally on your device via browser local storage. No data is sent to
            our servers. When you place an order, only the order content is transmitted to the
            restaurant via WhatsApp.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">5. WhatsApp</h2>
          <p class="text-gray-600 leading-relaxed">
            When you place an order, you are redirected to WhatsApp with a pre-filled message. This
            message is sent directly to the restaurant. MenuQR does not have access to your WhatsApp
            conversations or phone number.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">6. Offline Functionality</h2>
          <p class="text-gray-600 leading-relaxed">
            MenuQR is a Progressive Web App (PWA) that works offline. The menu and images are cached
            on your device for quick access, even without internet connection.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">7. Data Deletion</h2>
          <p class="text-gray-600 leading-relaxed">
            You can delete all locally stored data by clearing site data in your browser settings,
            or by uninstalling the app if you have installed it.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">8. Security</h2>
          <p class="text-gray-600 leading-relaxed">
            We use HTTPS to secure all communications. Since we do not store personal data on our
            servers, the risk of data leakage is minimized.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">9. Your Rights</h2>
          <p class="text-gray-600 leading-relaxed">
            In accordance with applicable regulations, you have the right to access, rectify, and
            delete your data. To exercise these rights, contact us at:
            <a href="mailto:contact@menuqr.bf" class="text-primary-600 hover:underline"
              >contact@menuqr.bf</a
            >
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">10. Modifications</h2>
          <p class="text-gray-600 leading-relaxed">
            This policy may be updated. We will inform you of any significant changes through the
            application.
          </p>
        </BaseCard>
      </template>

      <!-- Footer -->
      <div class="text-center text-sm text-gray-500 py-4">
        <p>© 2024 MenuQR. {{ locale === 'fr' ? 'Tous droits réservés' : 'All rights reserved' }}</p>
      </div>
    </div>
  </div>
</template>
