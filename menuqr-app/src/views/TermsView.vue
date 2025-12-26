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
      :title="locale === 'fr' ? 'Conditions d\'utilisation' : 'Terms of Service'"
      show-lang
    />

    <div class="container max-w-3xl mx-auto px-4 py-6 space-y-6">
      <!-- Header -->
      <BaseCard>
        <div class="text-center py-4">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            {{ locale === 'fr' ? "Conditions Générales d'Utilisation" : 'Terms of Service' }}
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
          <h2 class="text-lg font-semibold text-gray-900 mb-3">1. Acceptation des conditions</h2>
          <p class="text-gray-600 leading-relaxed">
            En utilisant l'application MenuQR, vous acceptez les présentes conditions générales
            d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre
            service.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">2. Description du service</h2>
          <p class="text-gray-600 leading-relaxed mb-3">
            MenuQR est une application de menu digital permettant aux clients de :
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>Consulter le menu du restaurant</li>
            <li>Ajouter des plats à un panier virtuel</li>
            <li>Passer des commandes via WhatsApp</li>
            <li>Accéder aux informations du restaurant</li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">3. Utilisation du service</h2>
          <p class="text-gray-600 leading-relaxed mb-3">
            En utilisant MenuQR, vous vous engagez à :
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>Fournir des informations exactes lors de vos commandes</li>
            <li>Ne pas utiliser le service à des fins frauduleuses</li>
            <li>Respecter les horaires d'ouverture du restaurant</li>
            <li>Honorer les commandes passées</li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">4. Commandes et paiements</h2>
          <p class="text-gray-600 leading-relaxed">
            Les commandes sont transmises au restaurant via WhatsApp. Le paiement s'effectue
            directement au restaurant selon les modalités proposées (espèces, mobile money, etc.).
            MenuQR ne traite aucun paiement et ne conserve aucune information bancaire.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">5. Prix et disponibilité</h2>
          <p class="text-gray-600 leading-relaxed">
            Les prix affichés sont indicatifs et peuvent être modifiés par le restaurant sans
            préavis. La disponibilité des plats est sujette à variation. Le restaurant se réserve le
            droit de refuser une commande en cas d'indisponibilité.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">6. Responsabilité</h2>
          <p class="text-gray-600 leading-relaxed">
            MenuQR agit uniquement comme intermédiaire technologique entre le client et le
            restaurant. Nous ne sommes pas responsables de la qualité des plats, des délais de
            préparation, ou de tout litige lié à la commande elle-même.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">7. Propriété intellectuelle</h2>
          <p class="text-gray-600 leading-relaxed">
            L'application MenuQR, son design, ses fonctionnalités et son contenu sont protégés par
            les droits de propriété intellectuelle. Toute reproduction ou utilisation non autorisée
            est interdite.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">8. Modifications</h2>
          <p class="text-gray-600 leading-relaxed">
            Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications
            entrent en vigueur dès leur publication. Nous vous encourageons à consulter
            régulièrement cette page.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
          <p class="text-gray-600 leading-relaxed">
            Pour toute question concernant ces conditions, contactez-nous à :
            <a href="mailto:contact@menuqr.bf" class="text-primary-600 hover:underline"
              >contact@menuqr.bf</a
            >
          </p>
        </BaseCard>
      </template>

      <!-- English Version -->
      <template v-else>
        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p class="text-gray-600 leading-relaxed">
            By using the MenuQR application, you agree to these terms of service. If you do not
            agree to these terms, please do not use our service.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">2. Service Description</h2>
          <p class="text-gray-600 leading-relaxed mb-3">
            MenuQR is a digital menu application that allows customers to:
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>Browse the restaurant menu</li>
            <li>Add dishes to a virtual cart</li>
            <li>Place orders via WhatsApp</li>
            <li>Access restaurant information</li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">3. Use of Service</h2>
          <p class="text-gray-600 leading-relaxed mb-3">By using MenuQR, you agree to:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li>Provide accurate information when placing orders</li>
            <li>Not use the service for fraudulent purposes</li>
            <li>Respect the restaurant's opening hours</li>
            <li>Honor placed orders</li>
          </ul>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">4. Orders and Payments</h2>
          <p class="text-gray-600 leading-relaxed">
            Orders are transmitted to the restaurant via WhatsApp. Payment is made directly at the
            restaurant according to the available methods (cash, mobile money, etc.). MenuQR does
            not process any payments and does not store any banking information.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">5. Prices and Availability</h2>
          <p class="text-gray-600 leading-relaxed">
            Displayed prices are indicative and may be modified by the restaurant without notice.
            Dish availability is subject to change. The restaurant reserves the right to refuse an
            order in case of unavailability.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">6. Liability</h2>
          <p class="text-gray-600 leading-relaxed">
            MenuQR acts solely as a technological intermediary between the customer and the
            restaurant. We are not responsible for the quality of dishes, preparation times, or any
            disputes related to the order itself.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
          <p class="text-gray-600 leading-relaxed">
            The MenuQR application, its design, features, and content are protected by intellectual
            property rights. Any unauthorized reproduction or use is prohibited.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">8. Modifications</h2>
          <p class="text-gray-600 leading-relaxed">
            We reserve the right to modify these terms at any time. Modifications take effect upon
            publication. We encourage you to regularly review this page.
          </p>
        </BaseCard>

        <BaseCard>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
          <p class="text-gray-600 leading-relaxed">
            For any questions regarding these terms, contact us at:
            <a href="mailto:contact@menuqr.bf" class="text-primary-600 hover:underline"
              >contact@menuqr.bf</a
            >
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
