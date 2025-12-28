<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  QrcodeOutlined,
  MenuOutlined,
  CloseOutlined,
  RocketOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  StarOutlined,
  StarFilled,
  SafetyCertificateOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FacebookOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  WhatsAppOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  GiftOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();

const mobileMenuOpen = ref(false);
const annualBilling = ref(true);
const submitting = ref(false);

const formData = reactive({
  restaurant: '',
  name: '',
  phone: '',
  email: '',
  city: undefined as string | undefined,
});

const problems = [
  {
    icon: FileTextOutlined,
    title: 'Menus papier coûteux',
    description: 'Impression régulière, usure, mise à jour impossible. Des milliers de XOF gaspillés chaque année.',
  },
  {
    icon: ClockCircleOutlined,
    title: 'Service trop lent',
    description: 'Serveurs débordés, clients qui attendent, tables qui tournent lentement.',
  },
  {
    icon: DollarOutlined,
    title: 'Revenus stagnants',
    description: 'Difficile de fidéliser les clients et d\'augmenter le panier moyen sans outils modernes.',
  },
  {
    icon: BarChartOutlined,
    title: 'Aucune visibilité',
    description: 'Impossible de savoir ce qui se vend, qui sont vos meilleurs clients, comment optimiser.',
  },
];

const features = [
  {
    icon: QrcodeOutlined,
    title: 'Menu QR Code',
    description: 'Vos clients scannent et commandent depuis leur téléphone.',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    items: ['Photos HD de chaque plat', 'Multilingue (FR/EN)', 'Mise à jour instantanée'],
    highlight: true,
  },
  {
    icon: ShoppingCartOutlined,
    title: 'Commandes en ligne',
    description: 'Recevez les commandes directement en cuisine.',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    items: ['Sur place, à emporter, livraison', 'Options & suppléments', 'Historique complet'],
  },
  {
    icon: CalendarOutlined,
    title: 'Réservations',
    description: 'Gérez vos réservations sans effort.',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    items: ['Calendrier visuel', 'Rappels automatiques', 'Réduction no-shows'],
  },
  {
    icon: GiftOutlined,
    title: 'Programme Fidélité',
    description: 'Récompensez vos clients réguliers.',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    items: ['Points & récompenses', 'Offres personnalisées', 'Cartes digitales'],
  },
  {
    icon: ThunderboltOutlined,
    title: 'Kitchen Display',
    description: 'Écran cuisine pour une préparation optimale.',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    items: ['Temps réel', 'Suivi par article', 'Zéro commande perdue'],
  },
  {
    icon: BarChartOutlined,
    title: 'Tableau de bord',
    description: 'Analysez vos performances en un coup d\'œil.',
    color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    items: ['Ventes par période', 'Plats populaires', 'Rapports exportables'],
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    monthlyPrice: 'Gratuit',
    annualPrice: 'Gratuit',
    description: 'Pour découvrir MenuQR',
    cta: 'Commencer gratuitement',
    features: [
      'Menu digital (20 plats max)',
      'QR code basique',
      'Support email',
    ],
  },
  {
    name: 'Growth',
    monthlyPrice: '25 000',
    annualPrice: '20 000',
    description: 'Pour les restaurants en croissance',
    cta: 'Essai gratuit 14 jours',
    features: [
      'Menu illimité',
      'Commandes en ligne',
      '1 table connectée',
      'Analytics basiques',
      'Support WhatsApp',
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: '50 000',
    annualPrice: '40 000',
    description: 'Notre formule la plus populaire',
    cta: 'Essai gratuit 14 jours',
    popular: true,
    features: [
      'Tout Growth +',
      'Tables illimitées',
      'Réservations',
      'Programme fidélité',
      'Avis clients',
      'Support prioritaire',
    ],
  },
  {
    name: 'Business',
    monthlyPrice: '100 000',
    annualPrice: '80 000',
    description: 'Pour les établissements exigeants',
    cta: 'Essai gratuit 14 jours',
    features: [
      'Tout Pro +',
      'Kitchen Display (KDS)',
      'API & intégrations',
      'Multi-utilisateurs',
      'Account manager dédié',
      'Formation sur site',
    ],
  },
];

const testimonials = [
  {
    name: 'Amadou K.',
    restaurant: 'Maquis Délice, Ouagadougou',
    text: 'Depuis MenuQR, mes clients commandent plus vite et mon équipe est moins stressée. Le chiffre d\'affaires a augmenté de 30% en 3 mois !',
  },
  {
    name: 'Fatou D.',
    restaurant: 'Le Palmier, Bobo-Dioulasso',
    text: 'Plus besoin d\'imprimer des menus chaque mois. Je modifie les prix et les plats en 2 clics. Un gain de temps énorme.',
  },
  {
    name: 'Ibrahim S.',
    restaurant: 'Chez Ibra, Ouaga 2000',
    text: 'Le programme fidélité a fidélisé mes clients réguliers. Ils reviennent plus souvent et dépensent plus. Je recommande !',
  },
];

const scrollTo = (id: string) => {
  mobileMenuOpen.value = false;
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const goToLogin = () => {
  router.push('/admin/login');
};

const selectPlan = (plan: typeof pricingPlans[0]) => {
  scrollTo('contact');
  message.info(`Formule ${plan.name} sélectionnée`);
};

const handleSubmit = async () => {
  submitting.value = true;
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  submitting.value = false;
  message.success('Merci ! Nous vous contacterons dans les 24h.');
  Object.assign(formData, { restaurant: '', name: '', phone: '', email: '', city: undefined });
};
</script>

<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="nav">
      <div class="nav-container">
        <div class="nav-brand">
          <div class="logo">
            <span class="logo-icon">
              <QrcodeOutlined />
            </span>
            <span class="logo-text">MenuQR</span>
          </div>
        </div>
        <div class="nav-links" :class="{ 'nav-open': mobileMenuOpen }">
          <a href="#features" @click="scrollTo('features')">Fonctionnalités</a>
          <a href="#pricing" @click="scrollTo('pricing')">Tarifs</a>
          <a href="#testimonials" @click="scrollTo('testimonials')">Témoignages</a>
          <a href="#contact" @click="scrollTo('contact')">Contact</a>
        </div>
        <div class="nav-actions">
          <a-button type="text" class="nav-login" @click="goToLogin">Connexion</a-button>
          <a-button type="primary" class="nav-cta" @click="scrollTo('contact')">
            Essai Gratuit
          </a-button>
          <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
            <MenuOutlined v-if="!mobileMenuOpen" />
            <CloseOutlined v-else />
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient"></div>
        <div class="hero-pattern"></div>
      </div>
      <div class="hero-container">
        <div class="hero-content">
          <div class="hero-badge">
            <RocketOutlined />
            <span>+500 restaurants nous font confiance</span>
          </div>
          <h1 class="hero-title">
            Digitalisez votre
            <span class="highlight">restaurant</span>
            en 10 minutes
          </h1>
          <p class="hero-subtitle">
            Menu QR code, commandes en ligne, réservations, programme fidélité.
            Tout ce dont vous avez besoin pour moderniser votre établissement.
          </p>
          <div class="hero-cta">
            <a-button type="primary" size="large" class="cta-primary" @click="scrollTo('contact')">
              Démarrer l'essai gratuit
              <ArrowRightOutlined />
            </a-button>
            <a-button size="large" class="cta-secondary" @click="scrollTo('demo')">
              <PlayCircleOutlined />
              Voir la démo
            </a-button>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-value">+25%</span>
              <span class="stat-label">de commandes</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-value">-40%</span>
              <span class="stat-label">temps d'attente</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-value">200K</span>
              <span class="stat-label">XOF économisés/an</span>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="phone-mockup">
            <div class="phone-screen">
              <div class="menu-preview">
                <div class="menu-header">
                  <div class="restaurant-logo"></div>
                  <span>Garbadrome</span>
                </div>
                <div class="menu-category">Plats Principaux</div>
                <div class="menu-items">
                  <div class="menu-item" v-for="i in 3" :key="i">
                    <div class="item-image"></div>
                    <div class="item-info">
                      <div class="item-name"></div>
                      <div class="item-price"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="qr-float">
              <QrcodeOutlined />
            </div>
          </div>
        </div>
      </div>
      <div class="hero-wave">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,40 C480,120 960,0 1440,80 L1440,120 L0,120 Z" fill="currentColor"/>
        </svg>
      </div>
    </section>

    <!-- Problems Section -->
    <section class="problems" id="problems">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Le problème</span>
          <h2>Vous reconnaissez-vous ?</h2>
        </div>
        <div class="problems-grid">
          <div class="problem-card" v-for="problem in problems" :key="problem.title">
            <div class="problem-icon">
              <component :is="problem.icon" />
            </div>
            <h3>{{ problem.title }}</h3>
            <p>{{ problem.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">La solution</span>
          <h2>Tout ce dont votre restaurant a besoin</h2>
          <p>Une plateforme complète pour gérer et développer votre activité</p>
        </div>
        <div class="features-grid">
          <div
            class="feature-card"
            v-for="feature in features"
            :key="feature.title"
            :class="{ 'feature-highlight': feature.highlight }"
          >
            <div class="feature-icon" :style="{ background: feature.color }">
              <component :is="feature.icon" />
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <ul class="feature-list">
              <li v-for="item in feature.items" :key="item">
                <CheckOutlined />
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo Section -->
    <section class="demo" id="demo">
      <div class="container">
        <div class="demo-content">
          <div class="demo-text">
            <span class="section-tag">Démo interactive</span>
            <h2>Voyez MenuQR en action</h2>
            <p>
              Scannez ce QR code avec votre téléphone pour découvrir
              l'expérience client MenuQR en temps réel.
            </p>
            <div class="demo-steps">
              <div class="demo-step">
                <span class="step-number">1</span>
                <span>Scannez le QR code</span>
              </div>
              <div class="demo-step">
                <span class="step-number">2</span>
                <span>Parcourez le menu</span>
              </div>
              <div class="demo-step">
                <span class="step-number">3</span>
                <span>Passez une commande test</span>
              </div>
            </div>
          </div>
          <div class="demo-qr">
            <div class="qr-card">
              <div class="qr-code">
                <QrcodeOutlined style="font-size: 120px" />
              </div>
              <p>Scanner pour essayer</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing" id="pricing">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Tarifs transparents</span>
          <h2>Choisissez votre formule</h2>
          <p>Sans engagement, annulez à tout moment</p>
        </div>
        <div class="pricing-toggle">
          <span :class="{ active: !annualBilling }">Mensuel</span>
          <a-switch v-model:checked="annualBilling" />
          <span :class="{ active: annualBilling }">
            Annuel
            <span class="savings-badge">-20%</span>
          </span>
        </div>
        <div class="pricing-grid">
          <div
            class="pricing-card"
            v-for="plan in pricingPlans"
            :key="plan.name"
            :class="{ 'pricing-popular': plan.popular }"
          >
            <div class="popular-badge" v-if="plan.popular">
              <StarOutlined /> Plus populaire
            </div>
            <h3>{{ plan.name }}</h3>
            <div class="pricing-amount">
              <span class="currency">XOF</span>
              <span class="price">{{ annualBilling ? plan.annualPrice : plan.monthlyPrice }}</span>
              <span class="period">/mois</span>
            </div>
            <p class="pricing-description">{{ plan.description }}</p>
            <ul class="pricing-features">
              <li v-for="feature in plan.features" :key="feature">
                <CheckCircleOutlined />
                {{ feature }}
              </li>
            </ul>
            <a-button
              :type="plan.popular ? 'primary' : 'default'"
              block
              size="large"
              @click="selectPlan(plan)"
            >
              {{ plan.cta }}
            </a-button>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials" id="testimonials">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Ils nous font confiance</span>
          <h2>Ce que disent nos clients</h2>
        </div>
        <div class="testimonials-grid">
          <div class="testimonial-card" v-for="testimonial in testimonials" :key="testimonial.name">
            <div class="testimonial-rating">
              <StarFilled v-for="n in 5" :key="n" />
            </div>
            <p class="testimonial-text">"{{ testimonial.text }}"</p>
            <div class="testimonial-author">
              <div class="author-avatar">
                {{ testimonial.name.charAt(0) }}
              </div>
              <div class="author-info">
                <strong>{{ testimonial.name }}</strong>
                <span>{{ testimonial.restaurant }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section" id="contact">
      <div class="container">
        <div class="cta-content">
          <h2>Prêt à digitaliser votre restaurant ?</h2>
          <p>Essayez MenuQR gratuitement pendant 14 jours. Sans carte bancaire.</p>
          <div class="cta-form">
            <a-form layout="vertical" @finish="handleSubmit">
              <div class="form-row">
                <a-form-item label="Nom du restaurant" name="restaurant">
                  <a-input
                    v-model:value="formData.restaurant"
                    placeholder="Ex: Maquis Délice"
                    size="large"
                  />
                </a-form-item>
                <a-form-item label="Votre nom" name="name">
                  <a-input
                    v-model:value="formData.name"
                    placeholder="Ex: Amadou Diallo"
                    size="large"
                  />
                </a-form-item>
              </div>
              <div class="form-row">
                <a-form-item label="Téléphone" name="phone">
                  <a-input
                    v-model:value="formData.phone"
                    placeholder="+226 70 00 00 00"
                    size="large"
                  />
                </a-form-item>
                <a-form-item label="Email" name="email">
                  <a-input
                    v-model:value="formData.email"
                    placeholder="email@exemple.com"
                    size="large"
                  />
                </a-form-item>
              </div>
              <a-form-item label="Ville" name="city">
                <a-select
                  v-model:value="formData.city"
                  placeholder="Sélectionnez votre ville"
                  size="large"
                >
                  <a-select-option value="ouagadougou">Ouagadougou</a-select-option>
                  <a-select-option value="bobo">Bobo-Dioulasso</a-select-option>
                  <a-select-option value="koudougou">Koudougou</a-select-option>
                  <a-select-option value="ouahigouya">Ouahigouya</a-select-option>
                  <a-select-option value="other">Autre</a-select-option>
                </a-select>
              </a-form-item>
              <a-button type="primary" html-type="submit" block size="large" :loading="submitting">
                Démarrer mon essai gratuit
                <ArrowRightOutlined />
              </a-button>
            </a-form>
            <p class="form-note">
              <SafetyCertificateOutlined />
              Vos données sont protégées. Nous ne les partageons jamais.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="logo">
              <QrcodeOutlined />
              <span>MenuQR</span>
            </div>
            <p>La solution digitale pour les restaurants modernes.</p>
            <div class="social-links">
              <a href="#" aria-label="Facebook"><FacebookOutlined /></a>
              <a href="#" aria-label="Instagram"><InstagramOutlined /></a>
              <a href="#" aria-label="LinkedIn"><LinkedinOutlined /></a>
              <a href="#" aria-label="WhatsApp"><WhatsAppOutlined /></a>
            </div>
          </div>
          <div class="footer-links">
            <h4>Produit</h4>
            <a href="#features">Fonctionnalités</a>
            <a href="#pricing">Tarifs</a>
            <a href="#demo">Démo</a>
            <a href="#">API</a>
          </div>
          <div class="footer-links">
            <h4>Entreprise</h4>
            <a href="#">À propos</a>
            <a href="#">Blog</a>
            <a href="#">Carrières</a>
            <a href="#">Presse</a>
          </div>
          <div class="footer-links">
            <h4>Support</h4>
            <a href="#">Centre d'aide</a>
            <a href="#">Contact</a>
            <a href="#">WhatsApp</a>
            <a href="#">Formation</a>
          </div>
          <div class="footer-contact">
            <h4>Contact</h4>
            <p><PhoneOutlined /> +226 70 00 00 00</p>
            <p><MailOutlined /> contact@menuqr.bf</p>
            <p><EnvironmentOutlined /> Ouagadougou, Burkina Faso</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 MenuQR. Tous droits réservés.</p>
          <div class="footer-legal">
            <a href="#">Conditions d'utilisation</a>
            <a href="#">Politique de confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ============================================
   VARIABLES & BASE STYLES
   ============================================ */
.landing-page {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --secondary: #f97316;
  --dark: #0f172a;
  --gray-900: #1e293b;
  --gray-800: #334155;
  --gray-600: #475569;
  --gray-400: #94a3b8;
  --gray-200: #e2e8f0;
  --gray-100: #f1f5f9;
  --white: #ffffff;
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --radius: 12px;
  --radius-lg: 20px;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--dark);
  line-height: 1.6;
  overflow-x: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-tag {
  display: inline-block;
  background: var(--gradient-primary);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 42px;
  font-weight: 800;
  color: var(--dark);
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.section-header p {
  font-size: 18px;
  color: var(--gray-600);
  max-width: 600px;
  margin: 0 auto;
}

/* ============================================
   NAVIGATION
   ============================================ */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--gray-200);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 800;
  color: var(--primary);
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--gradient-primary);
  color: white;
  border-radius: 10px;
  font-size: 20px;
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-links a {
  color: var(--gray-600);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: var(--primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-login {
  color: var(--gray-600) !important;
  font-weight: 500;
}

.nav-cta {
  background: var(--gradient-primary) !important;
  border: none !important;
  font-weight: 600;
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--gray-600);
}

/* ============================================
   HERO SECTION
   ============================================ */
.hero {
  position: relative;
  padding: 140px 0 100px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #fdf4ff 100%);
}

.hero-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  background-image: radial-gradient(circle at 1px 1px, var(--gray-400) 1px, transparent 0);
  background-size: 40px 40px;
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 8px 16px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-600);
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

.hero-badge .anticon {
  color: var(--secondary);
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 24px;
}

.hero-title .highlight {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 20px;
  color: var(--gray-600);
  margin-bottom: 32px;
  max-width: 500px;
}

.hero-cta {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.cta-primary {
  background: var(--gradient-primary) !important;
  border: none !important;
  height: 52px !important;
  padding: 0 32px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cta-secondary {
  height: 52px !important;
  padding: 0 24px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  display: flex;
  align-items: center;
  gap: 8px;
  border-color: var(--gray-200) !important;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 32px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--primary);
}

.stat-label {
  font-size: 14px;
  color: var(--gray-600);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--gray-200);
}

/* Phone Mockup */
.hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
}

.phone-mockup {
  position: relative;
  width: 280px;
  height: 560px;
  background: var(--dark);
  border-radius: 40px;
  padding: 12px;
  box-shadow: var(--shadow-xl);
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 30px;
  overflow: hidden;
}

.menu-preview {
  padding: 20px;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  font-weight: 600;
  font-size: 18px;
}

.restaurant-logo {
  width: 40px;
  height: 40px;
  background: var(--gradient-primary);
  border-radius: 10px;
}

.menu-category {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-600);
  margin-bottom: 12px;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--gray-100);
  border-radius: 12px;
}

.item-image {
  width: 60px;
  height: 60px;
  background: var(--gradient-secondary);
  border-radius: 8px;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.item-name {
  width: 80%;
  height: 14px;
  background: var(--gray-300);
  border-radius: 4px;
}

.item-price {
  width: 40%;
  height: 12px;
  background: var(--gray-200);
  border-radius: 4px;
}

.qr-float {
  position: absolute;
  top: -20px;
  right: -30px;
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: var(--primary);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.hero-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  color: white;
}

/* ============================================
   PROBLEMS SECTION
   ============================================ */
.problems {
  padding: 100px 0;
  background: white;
}

.problems-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.problem-card {
  padding: 32px;
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  transition: transform 0.3s, box-shadow 0.3s;
}

.problem-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.problem-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  margin-bottom: 20px;
}

.problem-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}

.problem-card p {
  font-size: 14px;
  color: var(--gray-600);
  line-height: 1.6;
}

/* ============================================
   FEATURES SECTION
   ============================================ */
.features {
  padding: 100px 0;
  background: linear-gradient(180deg, var(--gray-100) 0%, white 100%);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  padding: 32px;
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-highlight {
  border: 2px solid var(--primary);
  position: relative;
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
}

.feature-card > p {
  font-size: 14px;
  color: var(--gray-600);
  margin-bottom: 20px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--gray-600);
  margin-bottom: 8px;
}

.feature-list .anticon {
  color: #10b981;
}

/* ============================================
   DEMO SECTION
   ============================================ */
.demo {
  padding: 100px 0;
  background: var(--dark);
  color: white;
}

.demo-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.demo-text .section-tag {
  background: rgba(255, 255, 255, 0.1);
}

.demo-text h2 {
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 20px;
}

.demo-text p {
  font-size: 18px;
  color: var(--gray-400);
  margin-bottom: 40px;
}

.demo-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.demo-step {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 16px;
}

.step-number {
  width: 36px;
  height: 36px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.qr-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px;
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.qr-code {
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  border-radius: var(--radius);
  color: var(--dark);
}

.qr-card p {
  color: var(--gray-600);
  font-weight: 500;
}

/* ============================================
   PRICING SECTION
   ============================================ */
.pricing {
  padding: 100px 0;
  background: white;
}

.pricing-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 60px;
  font-size: 16px;
  color: var(--gray-600);
}

.pricing-toggle span.active {
  color: var(--dark);
  font-weight: 600;
}

.savings-badge {
  background: #dcfce7;
  color: #16a34a;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.pricing-card {
  padding: 32px;
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  position: relative;
  transition: transform 0.3s, box-shadow 0.3s;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.pricing-popular {
  border: 2px solid var(--primary);
  transform: scale(1.05);
}

.pricing-popular:hover {
  transform: scale(1.05) translateY(-4px);
}

.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gradient-primary);
  color: white;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pricing-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}

.pricing-amount {
  margin-bottom: 12px;
}

.pricing-amount .currency {
  font-size: 14px;
  color: var(--gray-600);
}

.pricing-amount .price {
  font-size: 42px;
  font-weight: 800;
  color: var(--dark);
  margin: 0 4px;
}

.pricing-amount .period {
  font-size: 14px;
  color: var(--gray-600);
}

.pricing-description {
  font-size: 14px;
  color: var(--gray-600);
  margin-bottom: 24px;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--gray-600);
  margin-bottom: 12px;
}

.pricing-features .anticon {
  color: var(--primary);
}

/* ============================================
   TESTIMONIALS SECTION
   ============================================ */
.testimonials {
  padding: 100px 0;
  background: var(--gray-100);
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.testimonial-card {
  padding: 32px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.testimonial-rating {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  color: #fbbf24;
  font-size: 18px;
}

.testimonial-text {
  font-size: 16px;
  line-height: 1.7;
  color: var(--gray-800);
  margin-bottom: 24px;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-info strong {
  color: var(--dark);
}

.author-info span {
  font-size: 13px;
  color: var(--gray-600);
}

/* ============================================
   CTA SECTION
   ============================================ */
.cta-section {
  padding: 100px 0;
  background: var(--gradient-primary);
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.cta-content h2 {
  font-size: 42px;
  font-weight: 800;
  color: white;
  margin-bottom: 16px;
}

.cta-content > p {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 40px;
}

.cta-form {
  background: white;
  padding: 40px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  text-align: left;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.cta-form :deep(.ant-form-item-label > label) {
  font-weight: 600;
  color: var(--gray-800);
}

.cta-form :deep(.ant-input),
.cta-form :deep(.ant-select-selector) {
  border-radius: 8px !important;
}

.cta-form :deep(.ant-btn-primary) {
  background: var(--gradient-primary) !important;
  border: none !important;
  height: 48px !important;
  font-weight: 600 !important;
  margin-top: 8px;
}

.form-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--gray-600);
}

/* ============================================
   FOOTER
   ============================================ */
.footer {
  padding: 80px 0 40px;
  background: var(--dark);
  color: white;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
  gap: 40px;
  margin-bottom: 60px;
}

.footer-brand .logo {
  margin-bottom: 16px;
}

.footer-brand p {
  color: var(--gray-400);
  margin-bottom: 20px;
  font-size: 14px;
}

.social-links {
  display: flex;
  gap: 12px;
}

.social-links a {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background 0.3s;
}

.social-links a:hover {
  background: var(--primary);
}

.footer-links h4,
.footer-contact h4 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 20px;
}

.footer-links a {
  display: block;
  color: var(--gray-400);
  text-decoration: none;
  margin-bottom: 12px;
  font-size: 14px;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: white;
}

.footer-contact p {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gray-400);
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-bottom {
  padding-top: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-bottom p {
  color: var(--gray-400);
  font-size: 14px;
}

.footer-legal {
  display: flex;
  gap: 24px;
}

.footer-legal a {
  color: var(--gray-400);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.footer-legal a:hover {
  color: white;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-content {
    order: 1;
  }

  .hero-visual {
    order: 2;
    margin-top: 40px;
  }

  .hero-subtitle {
    margin: 0 auto 32px;
  }

  .hero-cta {
    justify-content: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .problems-grid,
  .pricing-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .features-grid,
  .testimonials-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .demo-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .demo-steps {
    align-items: center;
  }

  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 20px;
    gap: 16px;
    box-shadow: var(--shadow-lg);
  }

  .nav-links.nav-open {
    display: flex;
  }

  .mobile-toggle {
    display: block;
  }

  .nav-cta {
    display: none;
  }

  .hero {
    padding: 120px 0 80px;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-cta {
    flex-direction: column;
  }

  .hero-stats {
    flex-wrap: wrap;
    gap: 20px;
  }

  .stat-divider {
    display: none;
  }

  .section-header h2 {
    font-size: 32px;
  }

  .problems-grid,
  .features-grid,
  .pricing-grid,
  .testimonials-grid {
    grid-template-columns: 1fr;
  }

  .pricing-popular {
    transform: none;
  }

  .pricing-popular:hover {
    transform: translateY(-4px);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
