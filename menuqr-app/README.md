# MenuQR - Menu Digital PWA

Application de menu digital progressive (PWA) conçue pour les restaurants au Burkina Faso. Permet aux clients de consulter le menu, personnaliser leurs commandes et commander directement via WhatsApp.

## 🚀 Fonctionnalités

- ✅ **Menu Digital Interactif** - Navigation fluide des catégories et plats
- ✅ **Commande WhatsApp** - Envoi direct des commandes via WhatsApp
- ✅ **Mode Hors Ligne** - Fonctionne même sans connexion internet
- ✅ **PWA Installable** - Installation sur l'écran d'accueil
- ✅ **Multilingue** - Support Français/Anglais
- ✅ **Responsive** - Optimisé mobile-first
- ✅ **Performance** - Chargement rapide et expérience fluide
- ✅ **Personnalisation** - Options et modifications de plats

## 🛠️ Technologies

- **Framework**: Vue 3 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Pinia + Persisted State
- **Routing**: Vue Router
- **i18n**: Vue I18n
- **PWA**: vite-plugin-pwa + Workbox
- **Icons**: Custom SVG components

## 📋 Prérequis

- Node.js >= 18.x
- npm >= 9.x

## 🔧 Installation

```bash
# Cloner le repository
cd menuqr-app

# Installer les dépendances
npm install

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📦 Scripts Disponibles

```bash
# Développement
npm run dev              # Lancer le serveur de développement
npm run build            # Build de production
npm run preview          # Prévisualiser le build de production

# Qualité du code
npm run type-check       # Vérification TypeScript
```

## 🏗️ Structure du Projet

```
menuqr-app/
├── public/              # Fichiers statiques
│   └── images/         # Images et icônes
├── src/
│   ├── assets/         # Assets (styles, images)
│   │   └── styles/    # Styles CSS/Tailwind
│   ├── components/     # Composants Vue
│   │   ├── common/    # Composants réutilisables
│   │   ├── menu/      # Composants du menu
│   │   ├── cart/      # Composants du panier
│   │   └── order/     # Composants de commande
│   ├── composables/    # Composables Vue
│   ├── data/          # Données statiques (menu.json)
│   ├── i18n/          # Traductions (FR/EN)
│   ├── router/        # Configuration du routeur
│   ├── stores/        # Stores Pinia
│   ├── types/         # Types TypeScript
│   ├── utils/         # Fonctions utilitaires
│   ├── views/         # Vues/Pages
│   ├── App.vue        # Composant racine
│   └── main.ts        # Point d'entrée
├── .env               # Variables d'environnement
├── index.html         # Template HTML
├── vite.config.ts     # Configuration Vite
├── tailwind.config.js # Configuration Tailwind
└── package.json       # Dépendances
```

## ⚙️ Configuration

### Variables d'Environnement

Créez un fichier `.env` basé sur `.env.example`:

```env
VITE_APP_NAME=MenuQR
VITE_APP_URL=https://app.menuqr.bf
VITE_RESTAURANT_SLUG=garbadrome-patte-doie
VITE_WHATSAPP_NUMBER=22670123456
VITE_ENABLE_PWA=true
```

### Menu de Données

Le menu est configuré dans `src/data/menu.json`. Structure:

```json
{
  "restaurant": {
    "id": "...",
    "name": "...",
    "whatsappNumber": "+226...",
    // ...
  },
  "categories": [...],
  "dishes": [...]
}
```

## 📱 PWA - Progressive Web App

L'application est une PWA complète avec:

- **Service Worker** - Mise en cache pour mode hors ligne
- **Manifest** - Métadonnées pour installation
- **Cache Strategy** - Cache-first pour assets, Network-first pour API
- **Offline Fallback** - Page de secours hors ligne
- **Install Prompt** - Installation guidée iOS/Android

## 🌐 Internationalisation

Support complet FR/EN via Vue I18n:

- Fichiers de traduction: `src/i18n/fr.json`, `src/i18n/en.json`
- Détection automatique de la langue
- Persistance du choix utilisateur
- Traductions pour tout le contenu du menu

## 🎨 Personnalisation

### Couleurs & Thème

Modifiez `tailwind.config.js` pour personnaliser:

```js
theme: {
  extend: {
    colors: {
      primary: { /* vos couleurs */ },
      secondary: { /* vos couleurs */ }
    }
  }
}
```

### Logo & Images

- Logo restaurant: `public/images/logo.png`
- Images plats: `public/images/dishes/`
- Icônes: Composant `BaseIcon.vue`

## 🚀 Déploiement

### Build de Production

```bash
npm run build
```

Génère les fichiers dans `/dist`

### Hébergement Recommandé

- **Netlify** (recommandé) - Déploiement automatique depuis Git
- **Vercel** - Support PWA natif
- **Firebase Hosting** - CDN global
- **Cloudflare Pages** - Performance optimale

### Configuration Netlify

Créez `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🔒 Sécurité

- Validation des entrées utilisateur
- Sanitization des données
- CSP (Content Security Policy)
- HTTPS obligatoire en production
- Pas de données sensibles côté client

## 📊 Performance

- **Lighthouse Score**: 90+
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 200KB (gzippé)

Optimisations:
- Lazy loading des routes
- Code splitting automatique
- Images optimisées et lazy loaded
- Cache agressif des assets

## 🐛 Debugging

### Mode Debug

Activez le mode debug dans `.env`:

```env
VITE_DEBUG=true
```

### Logs

Les logs de développement sont visibles dans:
- Console navigateur
- Vue DevTools
- Service Worker console

## Documentation

- **Main README**: [../README.md](../README.md)
- **API Reference**: [../docs/API.md](../docs/API.md)
- **Environment Variables**: [../docs/ENV.md](../docs/ENV.md)
- **Deployment Guide**: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)

## Contribution

Ce projet est actuellement en développement privé.

## Licence

Propriétaire - Tous droits réservés (c) 2024-2025 MenuQR

## Support

Pour toute question ou support:
- Email: contact@menuqr.bf

---

Developed with care in Burkina Faso
