<script setup lang="ts">
import { ref, onMounted } from 'vue';

const currentPlan = ref('restaurant');
const _selectedHotelPlan = ref('confort'); // Reserved for future hotel pricing tier
const isLoaded = ref(false);

const isCurrentPlan = (planId: string) => currentPlan.value === planId;

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true;
  }, 100);
});

const features = [
  { icon: 'qr', title: 'Menu digital avec QR code', desc: 'Accessible depuis n\'importe quel smartphone' },
  { icon: 'whatsapp', title: 'Commandes via WhatsApp', desc: 'Recevez les commandes directement' },
  { icon: 'photo', title: 'Photos des plats', desc: 'Menu visuel et attrayant' },
  { icon: 'edit', title: 'Modifications illimitées', desc: 'Prix, plats, catégories à tout moment' },
  { icon: 'stats', title: 'Statistiques de base', desc: 'Suivez vos commandes et ventes' },
  { icon: 'support', title: 'Support inclus', desc: 'Assistance par WhatsApp' },
];

const benefits = [
  { icon: 'money', title: 'Économique', desc: 'Moins cher que l\'impression de menus papier, et modifiable à tout moment.', color: 'emerald' },
  { icon: 'bolt', title: 'Rapide', desc: 'Installation en 24h. Vos clients scannent et commandent immédiatement.', color: 'blue' },
  { icon: 'phone', title: 'Simple', desc: 'Aucune application à installer. Fonctionne sur tous les smartphones.', color: 'amber' },
  { icon: 'heart', title: 'Local', desc: 'Conçu pour le Burkina Faso. Support en français, paiement local.', color: 'rose' },
];

const hotelPlans = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    rooms: '10-25 chambres',
    price: '20 000',
    features: ['Menu digital restaurant', 'Room service', 'QR par chambre'],
    popular: false,
  },
  {
    id: 'confort',
    name: 'Confort',
    rooms: '25-60 chambres',
    price: '35 000',
    features: ['Tout Essentiel inclus', 'Menu bar séparé', 'Statistiques & Branding'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    rooms: '60+ chambres',
    price: '60 000',
    features: ['Tout Confort inclus', 'Multi-personnel', 'White-label & Support 24/7'],
    popular: false,
  },
];
</script>

<template>
  <div class="pricing-page">
    <!-- Ambient background -->
    <div class="ambient-bg">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="grid-overlay"></div>
    </div>

    <div class="content-wrapper" :class="{ 'is-loaded': isLoaded }">
      <!-- Header -->
      <header class="header">
        <div class="badge">
          <span class="badge-dot"></span>
          <span>Tarification simple et transparente</span>
        </div>

        <h1 class="title">
          <span class="title-line">Choisissez votre</span>
          <span class="title-accent">formule</span>
        </h1>

        <p class="subtitle">
          Un menu digital moderne pour votre établissement,<br class="hidden sm:block">
          sans engagement compliqué.
        </p>
      </header>

      <!-- Main Restaurant Plan -->
      <section class="main-plan-section">
        <div class="main-plan-card">
          <!-- Glow effect -->
          <div class="card-glow"></div>

          <!-- Card header -->
          <div class="card-header">
            <div class="header-content">
              <div class="plan-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div class="plan-info">
                <h2 class="plan-name">Formule Restaurant</h2>
                <p class="plan-tagline">Menu digital + QR WhatsApp</p>
              </div>
            </div>

            <div v-if="isCurrentPlan('restaurant')" class="current-badge">
              <span class="pulse-dot"></span>
              <span>Plan actuel</span>
            </div>
          </div>

          <!-- Card body -->
          <div class="card-body">
            <!-- Pricing row -->
            <div class="pricing-row">
              <div class="price-block">
                <div class="price">
                  <span class="amount">25 000</span>
                  <span class="currency">FCFA</span>
                </div>
                <p class="price-note">par an · soit ~2 000 FCFA/mois</p>
              </div>

              <div class="savings-badge">
                <div class="savings-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="savings-text">
                  <p class="savings-title">Moins cher que le papier</p>
                  <p class="savings-desc">Impression menus : 30 000 - 50 000 FCFA/an</p>
                </div>
              </div>
            </div>

            <!-- Features grid -->
            <div class="features-grid">
              <div
                  v-for="(feature, index) in features"
                  :key="feature.title"
                  class="feature-item"
                  :style="{ '--delay': `${index * 0.05}s` }"
              >
                <div class="feature-icon">
                  <!-- QR Icon -->
                  <svg v-if="feature.icon === 'qr'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                  </svg>
                  <!-- WhatsApp Icon -->
                  <svg v-if="feature.icon === 'whatsapp'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <!-- Photo Icon -->
                  <svg v-if="feature.icon === 'photo'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <!-- Edit Icon -->
                  <svg v-if="feature.icon === 'edit'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  <!-- Stats Icon -->
                  <svg v-if="feature.icon === 'stats'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  <!-- Support Icon -->
                  <svg v-if="feature.icon === 'support'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/>
                  </svg>
                </div>
                <div class="feature-text">
                  <p class="feature-title">{{ feature.title }}</p>
                  <p class="feature-desc">{{ feature.desc }}</p>
                </div>
              </div>
            </div>

            <!-- Setup bonus -->
            <div class="setup-bonus">
              <div class="bonus-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
                </svg>
              </div>
              <div class="bonus-content">
                <p class="bonus-title">Installation OFFERTE</p>
                <p class="bonus-desc">
                  Création du menu, génération QR, mise en ligne — on s'occupe de tout.
                  Vous n'avez qu'à envoyer les photos de vos plats.
                </p>
              </div>
            </div>

            <!-- CTA Button -->
            <button
                :disabled="isCurrentPlan('restaurant')"
                class="cta-button"
                :class="{ 'is-current': isCurrentPlan('restaurant') }"
            >
              <template v-if="isCurrentPlan('restaurant')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                <span>C'est votre plan actuel</span>
              </template>
              <template v-else>
                <span>Souscrire à cette formule</span>
                <span class="cta-note">Bientôt disponible</span>
              </template>
            </button>
          </div>
        </div>
      </section>

      <!-- Divider -->
      <div class="section-divider">
        <div class="divider-line"></div>
        <span class="divider-text">Prochainement</span>
        <div class="divider-line"></div>
      </div>

      <!-- Hotel Plans Section -->
      <section class="hotel-section">
        <div class="hotel-header">
          <div class="hotel-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <span>En développement</span>
          </div>
          <h2 class="hotel-title">Formules Hôtelières</h2>
          <p class="hotel-subtitle">
            Room service digital et commande en chambre pour les hôtels.
          </p>
        </div>

        <div class="hotel-grid">
          <div
              v-for="(plan, index) in hotelPlans"
              :key="plan.id"
              class="hotel-card"
              :class="{ 'is-popular': plan.popular }"
              :style="{ '--delay': `${index * 0.1}s` }"
          >
            <div v-if="plan.popular" class="popular-tag">Populaire</div>

            <div class="hotel-card-content">
              <div class="hotel-card-header">
                <h3 class="hotel-plan-name">{{ plan.name }}</h3>
                <span class="hotel-rooms">{{ plan.rooms }}</span>
              </div>

              <div class="hotel-price">
                <span class="hotel-amount">{{ plan.price }}</span>
                <span class="hotel-period">FCFA/mois</span>
              </div>

              <ul class="hotel-features">
                <li v-for="feature in plan.features" :key="feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span>{{ feature }}</span>
                </li>
              </ul>

              <button class="hotel-cta" disabled>
                Bientôt disponible
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Why MenuQR Section -->
      <section class="benefits-section">
        <div class="benefits-card">
          <h3 class="benefits-title">Pourquoi choisir MenuQR ?</h3>

          <div class="benefits-grid">
            <div
                v-for="(benefit, index) in benefits"
                :key="benefit.title"
                class="benefit-item"
                :class="`benefit-${benefit.color}`"
                :style="{ '--delay': `${index * 0.08}s` }"
            >
              <div class="benefit-icon">
                <!-- Money Icon -->
                <svg v-if="benefit.icon === 'money'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <!-- Bolt Icon -->
                <svg v-if="benefit.icon === 'bolt'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <!-- Phone Icon -->
                <svg v-if="benefit.icon === 'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <!-- Heart Icon -->
                <svg v-if="benefit.icon === 'heart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>
              <div class="benefit-text">
                <p class="benefit-name">{{ benefit.title }}</p>
                <p class="benefit-desc">{{ benefit.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact CTA -->
      <footer class="contact-section">
        <div class="contact-card">
          <div class="contact-info">
            <p class="contact-title">Des questions ?</p>
            <p class="contact-desc">Contactez-nous pour un devis personnalisé</p>
          </div>
          <a href="https://wa.me/22670000000" target="_blank" class="contact-button">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>Nous contacter</span>
          </a>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

/* CSS Variables */
:root {
  --color-primary: #0d9488;
  --color-primary-light: #14b8a6;
  --color-primary-dark: #0f766e;
  --color-accent: #06b6d4;
  --color-surface: #ffffff;
  --color-surface-elevated: rgba(255, 255, 255, 0.8);
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-border: rgba(15, 23, 42, 0.08);
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Base Styles */
.pricing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
  position: relative;
  overflow-x: hidden;
  font-family: var(--font-body);
  color: var(--color-text);
  margin: -1rem;
  padding: 2rem;
}

@media (min-width: 1024px) {
  .pricing-page {
    margin: -2rem;
    padding: 3rem;
  }
}

/* Ambient Background */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  top: -200px;
  right: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  bottom: -100px;
  left: -100px;
  animation-delay: -7s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
  opacity: 0.3;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
      linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Content Wrapper */
.content-wrapper {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s var(--ease-out-expo);
}

.content-wrapper.is-loaded {
  opacity: 1;
  transform: translateY(0);
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 4rem;
  padding-top: 2rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(20, 184, 166, 0.1);
  border: 1px solid rgba(20, 184, 166, 0.2);
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
}

.badge-dot {
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1rem;
}

.title-line {
  display: block;
  color: var(--color-text);
}

.title-accent {
  display: block;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.125rem;
  color: var(--color-text-muted);
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Main Plan Card */
.main-plan-section {
  margin-bottom: 4rem;
}

.main-plan-card {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
  background: var(--color-surface);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.04),
      0 4px 8px rgba(0, 0, 0, 0.04),
      0 16px 32px rgba(0, 0, 0, 0.04),
      0 32px 64px rgba(0, 0, 0, 0.06);
}

.card-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary-light), var(--color-accent), transparent);
  opacity: 0.8;
}

.card-header {
  background: #f0fdfa;
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%);
  border-bottom: 1px solid #99f6e4;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.plan-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
}

.plan-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.plan-name {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.plan-tagline {
  font-size: 0.875rem;
  color: #334155;
  margin: 0;
}

.current-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(8px);
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #0d9488;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

/* Card Body */
.card-body {
  padding: 2rem;
}

.pricing-row {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

@media (min-width: 640px) {
  .pricing-row {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

.price {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.amount {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.currency {
  font-size: 1.25rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.price-note {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.savings-badge {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 16px;
}

.savings-icon {
  width: 36px;
  height: 36px;
  background: rgba(16, 185, 129, 0.15);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.savings-icon svg {
  width: 18px;
  height: 18px;
  color: #059669;
}

.savings-title {
  font-weight: 600;
  color: #047857;
  font-size: 0.875rem;
  margin: 0;
}

.savings-desc {
  font-size: 0.75rem;
  color: #059669;
  margin: 0.125rem 0 0;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 0.875rem;
  border-radius: 14px;
  transition: all 0.3s var(--ease-out-expo);
  animation: fadeSlideUp 0.5s var(--ease-out-expo) backwards;
  animation-delay: var(--delay);
}

.feature-item:hover {
  background: rgba(20, 184, 166, 0.04);
  transform: translateX(4px);
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-icon svg {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
}

.feature-title {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9375rem;
  margin: 0;
}

.feature-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0.125rem 0 0;
}

/* Setup Bonus */
.setup-bonus {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.04) 100%);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 16px;
  margin-bottom: 2rem;
}

.bonus-icon {
  width: 44px;
  height: 44px;
  background: rgba(245, 158, 11, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bonus-icon svg {
  width: 22px;
  height: 22px;
  color: #d97706;
}

.bonus-title {
  font-weight: 700;
  color: #b45309;
  font-size: 1rem;
  margin: 0;
}

.bonus-desc {
  font-size: 0.875rem;
  color: #92400e;
  margin: 0.375rem 0 0;
  line-height: 1.5;
}

/* CTA Button */
.cta-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.125rem 2rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  border: none;
  border-radius: 14px;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.4s var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

.cta-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.cta-button:not(.is-current):hover {
  transform: translateY(-2px);
  box-shadow:
      0 8px 16px rgba(13, 148, 136, 0.25),
      0 16px 32px rgba(13, 148, 136, 0.15);
}

.cta-button:not(.is-current):hover::before {
  opacity: 1;
}

.cta-button.is-current {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.cta-button svg {
  width: 20px;
  height: 20px;
}

.cta-note {
  font-size: 0.875rem;
  font-weight: 400;
  opacity: 0.7;
  margin-left: 0.25rem;
}

/* Section Divider */
.section-divider {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  max-width: 600px;
  margin: 0 auto 4rem;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
}

.divider-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Hotel Section */
.hotel-section {
  margin-bottom: 4rem;
}

.hotel-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.hotel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #7c3aed;
  margin-bottom: 1rem;
}

.hotel-badge svg {
  width: 16px;
  height: 16px;
}

.hotel-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.5rem;
}

.hotel-subtitle {
  font-size: 1rem;
  color: var(--color-text-muted);
  margin: 0;
}

/* Hotel Grid */
.hotel-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  opacity: 0.7;
}

@media (min-width: 768px) {
  .hotel-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.hotel-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.4s var(--ease-out-expo);
  animation: fadeSlideUp 0.6s var(--ease-out-expo) backwards;
  animation-delay: var(--delay);
}

.hotel-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%);
  backdrop-filter: blur(2px);
}

.hotel-card.is-popular {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow:
      0 4px 12px rgba(139, 92, 246, 0.08),
      0 12px 24px rgba(139, 92, 246, 0.06);
}

.popular-tag {
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.375rem 1rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  border-radius: 0 0 12px 12px;
  z-index: 10;
}

.hotel-card-content {
  position: relative;
  padding: 1.75rem;
}

.hotel-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.hotel-plan-name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.hotel-rooms {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  padding: 0.25rem 0.75rem;
  background: #f1f5f9;
  border-radius: 100px;
}

.is-popular .hotel-rooms {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
}

.hotel-price {
  margin-bottom: 1.25rem;
}

.hotel-amount {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-text);
}

.hotel-period {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-left: 0.25rem;
}

.hotel-features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
}

.hotel-features li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.625rem;
}

.hotel-features svg {
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.is-popular .hotel-features svg {
  color: #a78bfa;
}

.hotel-cta {
  width: 100%;
  padding: 0.875rem;
  background: #f1f5f9;
  border: none;
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: #94a3b8;
  cursor: not-allowed;
}

.is-popular .hotel-cta {
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
}

/* Benefits Section */
.benefits-section {
  margin-bottom: 4rem;
}

.benefits-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.02),
      0 4px 8px rgba(0, 0, 0, 0.02),
      0 8px 16px rgba(0, 0, 0, 0.02);
}

.benefits-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--color-border);
}

.benefits-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  padding: 0.5rem;
}

@media (min-width: 640px) {
  .benefits-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 16px;
  transition: all 0.3s var(--ease-out-expo);
  animation: fadeSlideUp 0.5s var(--ease-out-expo) backwards;
  animation-delay: var(--delay);
}

.benefit-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.benefit-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.benefit-icon svg {
  width: 22px;
  height: 22px;
}

.benefit-emerald .benefit-icon {
  background: rgba(16, 185, 129, 0.12);
}
.benefit-emerald .benefit-icon svg {
  color: #059669;
}

.benefit-blue .benefit-icon {
  background: rgba(59, 130, 246, 0.12);
}
.benefit-blue .benefit-icon svg {
  color: #2563eb;
}

.benefit-amber .benefit-icon {
  background: rgba(245, 158, 11, 0.12);
}
.benefit-amber .benefit-icon svg {
  color: #d97706;
}

.benefit-rose .benefit-icon {
  background: rgba(244, 63, 94, 0.12);
}
.benefit-rose .benefit-icon svg {
  color: #e11d48;
}

.benefit-name {
  font-weight: 700;
  color: var(--color-text);
  font-size: 1rem;
  margin: 0 0 0.25rem;
}

.benefit-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

/* Contact Section */
.contact-section {
  text-align: center;
  padding-bottom: 2rem;
}

.contact-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.02),
      0 4px 8px rgba(0, 0, 0, 0.02);
}

@media (min-width: 640px) {
  .contact-card {
    flex-direction: row;
    gap: 2rem;
  }
}

.contact-title {
  font-weight: 700;
  color: var(--color-text);
  font-size: 1.0625rem;
  margin: 0;
}

.contact-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
}

.contact-button {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border: none;
  border-radius: 14px;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.4s var(--ease-out-expo);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);
}

.contact-button:hover {
  transform: translateY(-2px);
  box-shadow:
      0 8px 20px rgba(34, 197, 94, 0.3),
      0 16px 32px rgba(34, 197, 94, 0.15);
}

.contact-button svg {
  width: 20px;
  height: 20px;
}

/* Hidden utility */
.hidden {
  display: none;
}

@media (min-width: 640px) {
  .sm\:block {
    display: block;
  }
}
</style>
