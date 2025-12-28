<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  QrcodeOutlined,
  LeftOutlined,
  RightOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ArrowRightOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  BarChartOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  GiftOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();

const deckRef = ref<HTMLElement | null>(null);
const currentSlide = ref(0);
const isFullscreen = ref(false);
const showHints = ref(true);
const slideDirection = ref('slide-right');

const slides = [
  { id: 'title', class: 'slide-dark' },
  { id: 'problem', class: 'slide-light' },
  { id: 'solution', class: 'slide-gradient' },
  { id: 'features', class: 'slide-light' },
  { id: 'demo', class: 'slide-dark' },
  { id: 'results', class: 'slide-light' },
  { id: 'pricing', class: 'slide-light' },
  { id: 'market', class: 'slide-gradient' },
  { id: 'roadmap', class: 'slide-light' },
  { id: 'cta', class: 'slide-dark' },
];

const problems = [
  {
    icon: FileTextOutlined,
    title: 'Menus papier coûteux',
    desc: '200,000 XOF/an en impression',
    color: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
  },
  {
    icon: ClockCircleOutlined,
    title: 'Service lent',
    desc: 'Clients qui attendent, tables bloquées',
    color: 'linear-gradient(135deg, #f9ca24, #f0932b)',
  },
  {
    icon: DollarOutlined,
    title: 'Revenus stagnants',
    desc: 'Difficile de fidéliser les clients',
    color: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
  },
  {
    icon: BarChartOutlined,
    title: 'Aucune visibilité',
    desc: 'Pas de données sur les ventes',
    color: 'linear-gradient(135deg, #00b894, #00cec9)',
  },
];

const solutionFeatures = [
  'Menu digital avec photos HD',
  'Commandes directes en cuisine',
  'Paiement mobile intégré',
  'Programme fidélité automatique',
  'Réservations en ligne',
  'Tableau de bord analytics',
];

const features = [
  {
    icon: QrcodeOutlined,
    title: 'Menu QR',
    desc: 'Scan & commande en 30 sec',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
  },
  {
    icon: ShoppingCartOutlined,
    title: 'Commandes',
    desc: 'Sur place, emporter, livraison',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
  },
  {
    icon: CalendarOutlined,
    title: 'Réservations',
    desc: 'Calendrier & rappels SMS',
    gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  },
  {
    icon: GiftOutlined,
    title: 'Fidélité',
    desc: 'Points & récompenses',
    gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)',
  },
  {
    icon: ThunderboltOutlined,
    title: 'Kitchen Display',
    desc: 'Écran cuisine temps réel',
    gradient: 'linear-gradient(135deg, #fa709a, #fee140)',
  },
  {
    icon: BarChartOutlined,
    title: 'Analytics',
    desc: 'Rapports & insights',
    gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)',
  },
];

const demoSteps = [
  { title: 'Scannez', desc: 'Le client scanne le QR code sur sa table' },
  { title: 'Parcourez', desc: 'Il découvre le menu avec photos et descriptions' },
  { title: 'Commandez', desc: 'Il ajoute au panier et valide' },
  { title: 'Préparez', desc: 'La cuisine reçoit la commande instantanément' },
];

const results = [
  { value: '+25%', label: 'Commandes', desc: 'Augmentation moyenne', color: '#10b981' },
  { value: '-40%', label: 'Temps attente', desc: 'Réduction service', color: '#6366f1' },
  { value: '+67%', label: 'Fidélisation', desc: 'Clients réguliers', color: '#f59e0b' },
  { value: '200K', label: 'Économies/an', desc: 'Impression menus', color: '#ec4899' },
];

const pricing = [
  {
    name: 'Starter',
    price: 'Gratuit',
    features: ['Menu 20 plats', 'QR code', 'Support email'],
  },
  {
    name: 'Pro',
    price: '50,000',
    popular: true,
    features: ['Menu illimité', 'Commandes', 'Réservations', 'Fidélité', 'Support prioritaire'],
  },
  {
    name: 'Business',
    price: '100,000',
    features: ['Tout Pro', 'Kitchen Display', 'API', 'Account manager'],
  },
];

const roadmap = [
  { date: 'Q1 2025', title: 'Lancement', goal: '50 restaurants à Ouagadougou' },
  { date: 'Q2 2025', title: 'Croissance', goal: '150 restaurants, partenariats' },
  { date: 'Q3 2025', title: 'Expansion', goal: 'Bobo-Dioulasso, 300 restaurants' },
  { date: 'Q4 2025', title: 'Scale', goal: '500 restaurants, nouvelles villes' },
];

const nextSlide = () => {
  if (currentSlide.value < slides.length - 1) {
    slideDirection.value = 'slide-right';
    currentSlide.value++;
  }
};

const prevSlide = () => {
  if (currentSlide.value > 0) {
    slideDirection.value = 'slide-left';
    currentSlide.value--;
  }
};

const goToSlide = (index: number) => {
  slideDirection.value = index > currentSlide.value ? 'slide-right' : 'slide-left';
  currentSlide.value = index;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    deckRef.value?.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowRight':
    case ' ':
      nextSlide();
      break;
    case 'ArrowLeft':
      prevSlide();
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 'Escape':
      if (isFullscreen.value) {
        document.exitFullscreen();
        isFullscreen.value = false;
      }
      break;
  }
};

const goToLanding = () => {
  router.push('/landing');
};

onMounted(() => {
  deckRef.value?.focus();
  setTimeout(() => {
    showHints.value = false;
  }, 5000);
});

onUnmounted(() => {
  if (isFullscreen.value) {
    document.exitFullscreen();
  }
});
</script>

<template>
  <div class="pitch-deck" @keydown="handleKeydown" tabindex="0" ref="deckRef">
    <!-- Progress Bar -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${((currentSlide + 1) / slides.length) * 100}%` }"></div>
    </div>

    <!-- Navigation -->
    <div class="deck-nav">
      <div class="slide-counter">{{ currentSlide + 1 }} / {{ slides.length }}</div>
      <div class="nav-controls">
        <button @click="prevSlide" :disabled="currentSlide === 0">
          <LeftOutlined />
        </button>
        <button @click="toggleFullscreen">
          <FullscreenOutlined v-if="!isFullscreen" />
          <FullscreenExitOutlined v-else />
        </button>
        <button @click="nextSlide" :disabled="currentSlide === slides.length - 1">
          <RightOutlined />
        </button>
      </div>
    </div>

    <!-- Slides Container -->
    <div class="slides-container">
      <transition :name="slideDirection" mode="out-in">
        <div :key="currentSlide" class="slide" :class="slides[currentSlide]?.class">

          <!-- Slide 1: Title -->
          <template v-if="currentSlide === 0">
            <div class="slide-title-page">
              <div class="title-logo">
                <QrcodeOutlined />
                <span>MenuQR</span>
              </div>
              <h1>Digitalisez votre restaurant en 10 minutes</h1>
              <p class="tagline">La solution tout-en-un pour les restaurants modernes</p>
              <div class="title-meta">
                <span>Deck de présentation</span>
                <span class="dot"></span>
                <span>2025</span>
              </div>
            </div>
          </template>

          <!-- Slide 2: Problem -->
          <template v-else-if="currentSlide === 1">
            <div class="slide-content">
              <span class="slide-number">01</span>
              <h2>Le problème</h2>
              <div class="problem-grid">
                <div class="problem-item" v-for="(problem, i) in problems" :key="i">
                  <div class="problem-icon" :style="{ background: problem.color }">
                    <component :is="problem.icon" />
                  </div>
                  <div class="problem-text">
                    <h3>{{ problem.title }}</h3>
                    <p>{{ problem.desc }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 3: Solution -->
          <template v-else-if="currentSlide === 2">
            <div class="slide-content">
              <span class="slide-number">02</span>
              <h2>La solution : MenuQR</h2>
              <div class="solution-showcase">
                <div class="solution-phone">
                  <div class="phone-frame">
                    <div class="phone-notch"></div>
                    <div class="phone-screen">
                      <QrcodeOutlined class="scan-icon" />
                      <span>Scanner & Commander</span>
                    </div>
                  </div>
                </div>
                <div class="solution-features">
                  <div class="feature-item" v-for="(feat, i) in solutionFeatures" :key="i">
                    <CheckCircleFilled class="check" />
                    <span>{{ feat }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 4: Features -->
          <template v-else-if="currentSlide === 3">
            <div class="slide-content">
              <span class="slide-number">03</span>
              <h2>Fonctionnalités clés</h2>
              <div class="features-grid">
                <div class="feature-card" v-for="(feature, i) in features" :key="i">
                  <div class="feature-icon" :style="{ background: feature.gradient }">
                    <component :is="feature.icon" />
                  </div>
                  <h3>{{ feature.title }}</h3>
                  <p>{{ feature.desc }}</p>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 5: Demo -->
          <template v-else-if="currentSlide === 4">
            <div class="slide-content slide-demo">
              <span class="slide-number">04</span>
              <h2>Voyez-le en action</h2>
              <div class="demo-container">
                <div class="demo-qr">
                  <div class="qr-box">
                    <QrcodeOutlined style="font-size: 140px" />
                  </div>
                  <p>Scannez pour tester</p>
                </div>
                <div class="demo-steps">
                  <div class="step" v-for="(step, i) in demoSteps" :key="i">
                    <div class="step-num">{{ i + 1 }}</div>
                    <div class="step-content">
                      <h4>{{ step.title }}</h4>
                      <p>{{ step.desc }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 6: Results -->
          <template v-else-if="currentSlide === 5">
            <div class="slide-content slide-results">
              <span class="slide-number">05</span>
              <h2>Résultats concrets</h2>
              <div class="results-grid">
                <div class="result-card" v-for="(result, i) in results" :key="i">
                  <div class="result-value" :style="{ color: result.color }">{{ result.value }}</div>
                  <div class="result-label">{{ result.label }}</div>
                  <div class="result-desc">{{ result.desc }}</div>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 7: Pricing -->
          <template v-else-if="currentSlide === 6">
            <div class="slide-content slide-pricing">
              <span class="slide-number">06</span>
              <h2>Tarification simple</h2>
              <div class="pricing-cards">
                <div class="pricing-card" v-for="(plan, i) in pricing" :key="i" :class="{ popular: plan.popular }">
                  <div class="popular-tag" v-if="plan.popular">Populaire</div>
                  <h3>{{ plan.name }}</h3>
                  <div class="price">
                    <span class="currency">XOF</span>
                    <span class="amount">{{ plan.price }}</span>
                    <span class="period">/mois</span>
                  </div>
                  <ul>
                    <li v-for="(feature, j) in plan.features" :key="j">
                      <CheckOutlined />
                      {{ feature }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 8: Market -->
          <template v-else-if="currentSlide === 7">
            <div class="slide-content slide-market">
              <span class="slide-number">07</span>
              <h2>Opportunité de marché</h2>
              <div class="market-stats">
                <div class="stat-big">
                  <div class="stat-value">2,000+</div>
                  <div class="stat-label">Restaurants à Ouagadougou</div>
                </div>
                <div class="stat-big">
                  <div class="stat-value">85%</div>
                  <div class="stat-label">N'ont pas de menu digital</div>
                </div>
                <div class="stat-big">
                  <div class="stat-value">500</div>
                  <div class="stat-label">Objectif 18 mois</div>
                </div>
              </div>
              <div class="market-tam">
                <div class="tam-circle">
                  <div class="tam-value">25M XOF</div>
                  <div class="tam-label">MRR potentiel</div>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 9: Roadmap -->
          <template v-else-if="currentSlide === 8">
            <div class="slide-content slide-roadmap">
              <span class="slide-number">08</span>
              <h2>Feuille de route</h2>
              <div class="roadmap-timeline">
                <div class="roadmap-item" v-for="(phase, i) in roadmap" :key="i">
                  <div class="roadmap-dot" :class="{ active: i === 0 }"></div>
                  <div class="roadmap-content">
                    <span class="roadmap-date">{{ phase.date }}</span>
                    <h4>{{ phase.title }}</h4>
                    <p>{{ phase.goal }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Slide 10: CTA -->
          <template v-else-if="currentSlide === 9">
            <div class="slide-cta">
              <div class="cta-content">
                <h2>Prêt à commencer ?</h2>
                <p>Essayez MenuQR gratuitement pendant 14 jours</p>
                <div class="cta-actions">
                  <a-button type="primary" size="large" @click="goToLanding">
                    Démarrer l'essai gratuit
                    <ArrowRightOutlined />
                  </a-button>
                </div>
                <div class="contact-info">
                  <div class="contact-item">
                    <PhoneOutlined />
                    <span>+226 70 00 00 00</span>
                  </div>
                  <div class="contact-item">
                    <MailOutlined />
                    <span>contact@menuqr.bf</span>
                  </div>
                  <div class="contact-item">
                    <GlobalOutlined />
                    <span>www.menuqr.bf</span>
                  </div>
                </div>
              </div>
              <div class="cta-logo">
                <QrcodeOutlined />
                <span>MenuQR</span>
              </div>
            </div>
          </template>

        </div>
      </transition>
    </div>

    <!-- Slide Dots -->
    <div class="slide-dots">
      <button
        v-for="(_, i) in slides"
        :key="i"
        :class="{ active: i === currentSlide }"
        @click="goToSlide(i)"
      ></button>
    </div>

    <!-- Keyboard Hints -->
    <div class="keyboard-hints" v-if="showHints">
      <span><kbd>&larr;</kbd> <kbd>&rarr;</kbd> Navigation</span>
      <span><kbd>F</kbd> Plein écran</span>
      <span><kbd>Esc</kbd> Quitter</span>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE STYLES
   ============================================ */
.pitch-deck {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --dark: #0f172a;
  --gray-900: #1e293b;
  --gray-600: #475569;
  --gray-400: #94a3b8;
  --gray-200: #e2e8f0;
  --gray-100: #f1f5f9;
  --white: #ffffff;
  --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  position: fixed;
  inset: 0;
  background: var(--dark);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
  outline: none;
}

/* ============================================
   NAVIGATION
   ============================================ */
.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  z-index: 100;
}

.progress-fill {
  height: 100%;
  background: var(--gradient);
  transition: width 0.3s ease;
}

.deck-nav {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  padding: 0 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
}

.slide-counter {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.nav-controls {
  display: flex;
  gap: 8px;
}

.nav-controls button {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-controls button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.nav-controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ============================================
   SLIDES CONTAINER
   ============================================ */
.slides-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 60px;
}

.slide-dark {
  background: var(--dark);
  color: white;
}

.slide-light {
  background: var(--white);
  color: var(--dark);
}

.slide-gradient {
  background: var(--gradient);
  color: white;
}

/* ============================================
   SLIDE TRANSITIONS
   ============================================ */
.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.4s ease;
}

.slide-right-enter-from {
  transform: translateX(100px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(-100px);
  opacity: 0;
}

.slide-left-enter-from {
  transform: translateX(-100px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(100px);
  opacity: 0;
}

/* ============================================
   SLIDE 1: TITLE
   ============================================ */
.slide-title-page {
  text-align: center;
  max-width: 800px;
}

.title-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 40px;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-logo .anticon {
  font-size: 56px;
  -webkit-text-fill-color: initial;
  color: #667eea;
}

.slide-title-page h1 {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  letter-spacing: -0.03em;
}

.tagline {
  font-size: 24px;
  color: var(--gray-400);
  margin-bottom: 60px;
}

.title-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--gray-600);
  font-size: 14px;
}

.title-meta .dot {
  width: 4px;
  height: 4px;
  background: var(--gray-600);
  border-radius: 50%;
}

/* ============================================
   SLIDE CONTENT COMMON
   ============================================ */
.slide-content {
  width: 100%;
  max-width: 1100px;
}

.slide-number {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 16px;
  letter-spacing: 0.1em;
}

.slide-content h2 {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 48px;
  letter-spacing: -0.02em;
}

/* ============================================
   SLIDE 2: PROBLEMS
   ============================================ */
.problem-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.problem-item {
  display: flex;
  gap: 20px;
  padding: 28px;
  background: var(--gray-100);
  border-radius: 16px;
}

.problem-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}

.problem-text h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
}

.problem-text p {
  font-size: 14px;
  color: var(--gray-600);
}

/* ============================================
   SLIDE 3: SOLUTION
   ============================================ */
.solution-showcase {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.phone-frame {
  width: 240px;
  height: 480px;
  background: #1a1a2e;
  border-radius: 36px;
  padding: 12px;
  margin: 0 auto;
  position: relative;
}

.phone-notch {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 24px;
  background: #0f0f1a;
  border-radius: 12px;
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  border-radius: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: white;
}

.scan-icon {
  font-size: 80px;
  opacity: 0.9;
}

.phone-screen span {
  font-weight: 600;
  font-size: 16px;
}

.solution-features {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 20px;
  font-weight: 500;
}

.feature-item .check {
  font-size: 24px;
  color: #10b981;
}

/* ============================================
   SLIDE 4: FEATURES
   ============================================ */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  padding: 28px;
  background: var(--gray-100);
  border-radius: 16px;
  text-align: center;
}

.feature-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  margin: 0 auto 20px;
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 14px;
  color: var(--gray-600);
}

/* ============================================
   SLIDE 5: DEMO
   ============================================ */
.slide-demo .slide-number {
  color: white;
}

.demo-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.demo-qr {
  text-align: center;
}

.qr-box {
  width: 220px;
  height: 220px;
  background: white;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: var(--dark);
}

.demo-qr p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.demo-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.step-num {
  width: 40px;
  height: 40px;
  background: var(--gradient);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.step-content h4 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.step-content p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* ============================================
   SLIDE 6: RESULTS
   ============================================ */
.results-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.result-card {
  padding: 32px;
  background: var(--gray-100);
  border-radius: 16px;
  text-align: center;
}

.result-value {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 8px;
}

.result-label {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.result-desc {
  font-size: 13px;
  color: var(--gray-600);
}

/* ============================================
   SLIDE 7: PRICING
   ============================================ */
.pricing-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.pricing-card {
  padding: 32px;
  background: var(--gray-100);
  border-radius: 16px;
  position: relative;
  border: 2px solid transparent;
}

.pricing-card.popular {
  border-color: var(--primary);
  transform: scale(1.05);
}

.popular-tag {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gradient);
  color: white;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.pricing-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}

.price {
  margin-bottom: 24px;
}

.price .currency {
  font-size: 14px;
  color: var(--gray-600);
}

.price .amount {
  font-size: 36px;
  font-weight: 800;
  margin: 0 4px;
}

.price .period {
  font-size: 14px;
  color: var(--gray-600);
}

.pricing-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pricing-card li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--gray-600);
}

.pricing-card li .anticon {
  color: var(--primary);
}

/* ============================================
   SLIDE 8: MARKET
   ============================================ */
.slide-market .slide-number {
  color: rgba(255, 255, 255, 0.8);
}

.market-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-bottom: 60px;
}

.stat-big {
  text-align: center;
}

.stat-big .stat-value {
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 12px;
}

.stat-big .stat-label {
  font-size: 16px;
  opacity: 0.8;
}

.market-tam {
  display: flex;
  justify-content: center;
}

.tam-circle {
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.tam-value {
  font-size: 28px;
  font-weight: 800;
}

.tam-label {
  font-size: 14px;
  opacity: 0.8;
}

/* ============================================
   SLIDE 9: ROADMAP
   ============================================ */
.roadmap-timeline {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.roadmap-timeline::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gray-200);
}

.roadmap-item {
  flex: 1;
  position: relative;
  padding-top: 40px;
}

.roadmap-dot {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  background: var(--gray-200);
  border-radius: 50%;
  border: 4px solid white;
}

.roadmap-dot.active {
  background: var(--primary);
}

.roadmap-content {
  text-align: center;
  padding: 0 20px;
}

.roadmap-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 8px;
  display: block;
}

.roadmap-content h4 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.roadmap-content p {
  font-size: 14px;
  color: var(--gray-600);
}

/* ============================================
   SLIDE 10: CTA
   ============================================ */
.slide-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 40px;
}

.cta-content h2 {
  font-size: 56px;
  font-weight: 800;
  margin-bottom: 16px;
}

.cta-content p {
  font-size: 20px;
  color: var(--gray-400);
  margin-bottom: 40px;
}

.cta-actions :deep(.ant-btn) {
  height: 56px !important;
  padding: 0 40px !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  background: var(--gradient) !important;
  border: none !important;
}

.contact-info {
  display: flex;
  gap: 40px;
  margin-top: 60px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gray-400);
  font-size: 14px;
}

.cta-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 800;
  color: var(--gray-600);
  margin-top: 40px;
}

/* ============================================
   SLIDE DOTS
   ============================================ */
.slide-dots {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.slide-dots button {
  width: 10px;
  height: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.slide-dots button.active {
  width: 30px;
  border-radius: 5px;
  background: var(--primary);
}

.slide-light .slide-dots button {
  background: rgba(0, 0, 0, 0.2);
}

.slide-light .slide-dots button.active {
  background: var(--primary);
}

/* ============================================
   KEYBOARD HINTS
   ============================================ */
.keyboard-hints {
  position: absolute;
  bottom: 30px;
  right: 40px;
  display: flex;
  gap: 24px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  animation: fadeOut 5s forwards;
}

.keyboard-hints kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: inherit;
}

@keyframes fadeOut {
  0%, 80% { opacity: 1; }
  100% { opacity: 0; }
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 1024px) {
  .slide {
    padding: 60px 40px;
  }

  .slide-title-page h1 {
    font-size: 48px;
  }

  .slide-content h2 {
    font-size: 36px;
  }

  .problem-grid,
  .solution-showcase,
  .demo-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .features-grid,
  .pricing-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .results-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .market-stats {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .stat-big .stat-value {
    font-size: 48px;
  }

  .roadmap-timeline {
    flex-direction: column;
    gap: 24px;
  }

  .roadmap-timeline::before {
    display: none;
  }

  .roadmap-item {
    padding-top: 0;
    padding-left: 40px;
  }

  .roadmap-dot {
    left: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  .roadmap-content {
    text-align: left;
    padding: 0;
  }

  .contact-info {
    flex-direction: column;
    gap: 16px;
  }

  .keyboard-hints {
    display: none;
  }
}

@media (max-width: 640px) {
  .slide {
    padding: 80px 24px 60px;
  }

  .slide-title-page h1 {
    font-size: 32px;
  }

  .tagline {
    font-size: 16px;
  }

  .slide-content h2 {
    font-size: 28px;
    margin-bottom: 32px;
  }

  .features-grid,
  .pricing-cards,
  .results-grid {
    grid-template-columns: 1fr;
  }

  .pricing-card.popular {
    transform: none;
  }

  .cta-content h2 {
    font-size: 36px;
  }
}
</style>
