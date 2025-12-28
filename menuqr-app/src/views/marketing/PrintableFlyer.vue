<script setup lang="ts">
import { PrinterOutlined, ArrowLeftOutlined } from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const printFlyer = () => {
  window.print();
};

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="flyer-container">
    <!-- Print Controls -->
    <div class="print-controls no-print">
      <h2>Flyer MenuQR - Format A5</h2>
      <p>Imprimez ce flyer pour vos prospections terrain</p>
      <div class="controls-actions">
        <a-button type="primary" size="large" @click="printFlyer">
          <PrinterOutlined />
          Imprimer
        </a-button>
        <a-button size="large" @click="goBack">
          <ArrowLeftOutlined />
          Retour
        </a-button>
      </div>
    </div>

    <!-- Flyer Front -->
    <div class="flyer-page flyer-front">
      <!-- Header -->
      <div class="flyer-header">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="4" height="4" rx="0.5"/>
              <rect x="17" y="17" width="4" height="4" rx="0.5"/>
            </svg>
          </div>
          <span class="logo-text">MenuQR</span>
        </div>
      </div>

      <!-- Main Visual -->
      <div class="flyer-hero">
        <div class="hero-badge">Essai gratuit 14 jours</div>
        <h1>Digitalisez votre<br><span>restaurant</span><br>en 10 minutes</h1>
        <p class="hero-sub">Menu QR, commandes en ligne, réservations, fidélité</p>
      </div>

      <!-- Stats -->
      <div class="flyer-stats">
        <div class="stat">
          <span class="stat-value">+25%</span>
          <span class="stat-label">Commandes</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">-40%</span>
          <span class="stat-label">Temps attente</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">200K</span>
          <span class="stat-label">Économies/an</span>
        </div>
      </div>

      <!-- QR Code to scan -->
      <div class="flyer-qr">
        <div class="qr-box">
          <svg viewBox="0 0 100 100" class="qr-placeholder">
            <rect x="5" y="5" width="25" height="25" rx="3"/>
            <rect x="70" y="5" width="25" height="25" rx="3"/>
            <rect x="5" y="70" width="25" height="25" rx="3"/>
            <rect x="40" y="40" width="20" height="20" rx="2"/>
            <rect x="10" y="10" width="15" height="15" rx="2" fill="white"/>
            <rect x="75" y="10" width="15" height="15" rx="2" fill="white"/>
            <rect x="10" y="75" width="15" height="15" rx="2" fill="white"/>
            <rect x="13" y="13" width="9" height="9" rx="1"/>
            <rect x="78" y="13" width="9" height="9" rx="1"/>
            <rect x="13" y="78" width="9" height="9" rx="1"/>
            <rect x="35" y="5" width="10" height="5"/>
            <rect x="55" y="5" width="5" height="10"/>
            <rect x="35" y="20" width="5" height="10"/>
            <rect x="70" y="35" width="10" height="5"/>
            <rect x="85" y="45" width="10" height="5"/>
            <rect x="5" y="40" width="5" height="10"/>
            <rect x="15" y="50" width="10" height="5"/>
          </svg>
        </div>
        <p>Scannez pour essayer</p>
      </div>
    </div>

    <!-- Flyer Back -->
    <div class="flyer-page flyer-back">
      <!-- Features Grid -->
      <div class="features-section">
        <h2>Tout ce dont vous avez besoin</h2>
        <div class="features-grid">
          <div class="feature">
            <div class="feature-icon icon-qr">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div class="feature-text">
              <strong>Menu QR Code</strong>
              <span>Photos HD, multilingue</span>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon icon-cart">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="21" r="2"/>
                <circle cx="20" cy="21" r="2"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="feature-text">
              <strong>Commandes</strong>
              <span>Sur place, emporter, livraison</span>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon icon-calendar">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <div class="feature-text">
              <strong>Réservations</strong>
              <span>Rappels automatiques</span>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon icon-gift">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="8" width="18" height="13" rx="2"/>
                <path d="M12 8v13M3 13h18"/>
                <path d="M12 8a4 4 0 00-4-4c-2.2 0-4 1.8-4 4"/>
              </svg>
            </div>
            <div class="feature-text">
              <strong>Fidélité</strong>
              <span>Points & récompenses</span>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon icon-screen">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div class="feature-text">
              <strong>Écran Cuisine</strong>
              <span>Commandes temps réel</span>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon icon-chart">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </div>
            <div class="feature-text">
              <strong>Statistiques</strong>
              <span>Tableau de bord complet</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing -->
      <div class="pricing-section">
        <h2>Tarifs simples</h2>
        <div class="pricing-grid">
          <div class="price-card">
            <div class="price-name">Starter</div>
            <div class="price-amount">Gratuit</div>
            <div class="price-desc">20 plats max</div>
          </div>
          <div class="price-card price-popular">
            <div class="popular-badge">Populaire</div>
            <div class="price-name">Pro</div>
            <div class="price-amount">50,000 <small>XOF/mois</small></div>
            <div class="price-desc">Tout inclus</div>
          </div>
          <div class="price-card">
            <div class="price-name">Business</div>
            <div class="price-amount">100,000 <small>XOF/mois</small></div>
            <div class="price-desc">Multi-sites</div>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="contact-section">
        <div class="contact-grid">
          <div class="contact-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <span>+226 70 00 00 00</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>contact@menuqr.bf</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            <span>www.menuqr.bf</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flyer-footer">
        <div class="footer-logo">
          <div class="logo-icon small">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <span>MenuQR</span>
        </div>
        <div class="footer-tagline">La solution digitale pour les restaurants modernes</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   VARIABLES
   ============================================ */
.flyer-container {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --secondary: #f97316;
  --dark: #0f172a;
  --gray-600: #475569;
  --gray-400: #94a3b8;
  --gray-200: #e2e8f0;
  --white: #ffffff;
  --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #f1f5f9;
  min-height: 100vh;
  padding: 40px;
}

/* ============================================
   PRINT CONTROLS
   ============================================ */
.print-controls {
  max-width: 600px;
  margin: 0 auto 40px;
  text-align: center;
}

.print-controls h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--dark);
}

.print-controls p {
  color: var(--gray-600);
  margin-bottom: 24px;
}

.controls-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.controls-actions :deep(.ant-btn-primary) {
  background: var(--gradient) !important;
  border: none !important;
}

/* ============================================
   FLYER PAGE - A5 SIZE (148mm x 210mm)
   ============================================ */
.flyer-page {
  width: 148mm;
  height: 210mm;
  margin: 0 auto 40px;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  page-break-after: always;
  position: relative;
}

/* ============================================
   FLYER FRONT
   ============================================ */
.flyer-front {
  padding: 10mm;
  display: flex;
  flex-direction: column;
}

.flyer-header {
  margin-bottom: 8mm;
}

.logo {
  display: flex;
  align-items: center;
  gap: 3mm;
}

.logo-icon {
  width: 10mm;
  height: 10mm;
  background: var(--gradient);
  border-radius: 2.5mm;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-icon svg {
  width: 6mm;
  height: 6mm;
}

.logo-icon.small {
  width: 6mm;
  height: 6mm;
}

.logo-icon.small svg {
  width: 4mm;
  height: 4mm;
}

.logo-text {
  font-size: 6mm;
  font-weight: 800;
  color: var(--primary);
}

.flyer-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.hero-badge {
  background: var(--secondary);
  color: white;
  padding: 2mm 4mm;
  border-radius: 3mm;
  font-size: 3mm;
  font-weight: 600;
  margin-bottom: 6mm;
}

.flyer-hero h1 {
  font-size: 9mm;
  font-weight: 800;
  line-height: 1.2;
  color: var(--dark);
  margin-bottom: 4mm;
}

.flyer-hero h1 span {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 3.5mm;
  color: var(--gray-600);
}

.flyer-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6mm;
  padding: 6mm 0;
  border-top: 0.3mm solid var(--gray-200);
  border-bottom: 0.3mm solid var(--gray-200);
  margin: 6mm 0;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 6mm;
  font-weight: 800;
  color: var(--primary);
}

.stat-label {
  font-size: 2.5mm;
  color: var(--gray-600);
}

.stat-divider {
  width: 0.3mm;
  height: 10mm;
  background: var(--gray-200);
}

.flyer-qr {
  text-align: center;
  padding-top: 4mm;
}

.qr-box {
  width: 30mm;
  height: 30mm;
  margin: 0 auto 3mm;
  border: 0.5mm solid var(--gray-200);
  border-radius: 2mm;
  padding: 2mm;
}

.qr-placeholder {
  width: 100%;
  height: 100%;
  fill: var(--dark);
}

.flyer-qr p {
  font-size: 2.5mm;
  color: var(--gray-600);
}

/* ============================================
   FLYER BACK
   ============================================ */
.flyer-back {
  padding: 8mm 10mm;
  display: flex;
  flex-direction: column;
}

.features-section {
  margin-bottom: 6mm;
}

.features-section h2,
.pricing-section h2 {
  font-size: 5mm;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 5mm;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4mm;
}

.feature {
  display: flex;
  align-items: center;
  gap: 3mm;
  padding: 3mm;
  background: #f8fafc;
  border-radius: 2mm;
}

.feature-icon {
  width: 8mm;
  height: 8mm;
  border-radius: 2mm;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.feature-icon svg {
  width: 4.5mm;
  height: 4.5mm;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-qr { background: linear-gradient(135deg, #667eea, #764ba2); }
.icon-qr svg { fill: currentColor; stroke: none; }
.icon-cart { background: linear-gradient(135deg, #f093fb, #f5576c); }
.icon-calendar { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.icon-calendar svg { fill: none; stroke: currentColor; }
.icon-gift { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.icon-gift svg { fill: none; stroke: currentColor; }
.icon-screen { background: linear-gradient(135deg, #fa709a, #fee140); }
.icon-screen svg { fill: none; stroke: currentColor; }
.icon-chart { background: linear-gradient(135deg, #a8edea, #fed6e3); }
.icon-chart svg { fill: none; stroke: currentColor; stroke-width: 3; }

.feature-text strong {
  display: block;
  font-size: 3mm;
  color: var(--dark);
}

.feature-text span {
  font-size: 2.5mm;
  color: var(--gray-600);
}

/* Pricing */
.pricing-section {
  margin-bottom: 6mm;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3mm;
}

.price-card {
  padding: 4mm;
  background: #f8fafc;
  border-radius: 2mm;
  text-align: center;
  position: relative;
}

.price-card.price-popular {
  background: var(--gradient);
  color: white;
}

.popular-badge {
  position: absolute;
  top: -2mm;
  left: 50%;
  transform: translateX(-50%);
  background: var(--secondary);
  color: white;
  padding: 1mm 2mm;
  border-radius: 1.5mm;
  font-size: 2mm;
  font-weight: 600;
}

.price-name {
  font-size: 3mm;
  font-weight: 600;
  margin-bottom: 2mm;
}

.price-amount {
  font-size: 4.5mm;
  font-weight: 800;
}

.price-amount small {
  font-size: 2mm;
  font-weight: 400;
}

.price-desc {
  font-size: 2.5mm;
  opacity: 0.8;
  margin-top: 1mm;
}

/* Contact */
.contact-section {
  margin-bottom: 4mm;
}

.contact-grid {
  display: flex;
  justify-content: center;
  gap: 6mm;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 2mm;
  font-size: 2.5mm;
  color: var(--gray-600);
}

.contact-item svg {
  width: 4mm;
  height: 4mm;
  fill: none;
  stroke: var(--primary);
  stroke-width: 2;
}

/* Footer */
.flyer-footer {
  text-align: center;
  padding-top: 4mm;
  border-top: 0.3mm solid var(--gray-200);
  margin-top: auto;
}

.footer-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2mm;
  margin-bottom: 2mm;
}

.footer-logo span {
  font-size: 4mm;
  font-weight: 700;
  color: var(--primary);
}

.footer-tagline {
  font-size: 2.5mm;
  color: var(--gray-600);
}

/* ============================================
   PRINT STYLES
   ============================================ */
@media print {
  .no-print {
    display: none !important;
  }

  .flyer-container {
    background: white;
    padding: 0;
  }

  .flyer-page {
    box-shadow: none;
    margin: 0;
  }

  @page {
    size: A5;
    margin: 0;
  }
}

/* ============================================
   RESPONSIVE (for screen preview)
   ============================================ */
@media (max-width: 640px) {
  .flyer-container {
    padding: 20px;
  }

  .flyer-page {
    width: 100%;
    height: auto;
    aspect-ratio: 148 / 210;
  }
}
</style>
