# 🍽️ MenuQR

**Menu Virtuel Simple pour Restaurant — Commande via WhatsApp**

> Documentation Technique Complète: PRD • HLD • LLD

**Version 2.0** • Décembre 2024  
Développé pour le marché Burkinabè 🇧🇫

-----

## Table des Matières

1. [Product Requirements Document (PRD)](#1-product-requirements-document-prd)
1. [High-Level Design (HLD)](#2-high-level-design-hld)
1. [Low-Level Design (LLD)](#3-low-level-design-lld)
1. [Annexes](#4-annexes)

-----

## 1. Product Requirements Document (PRD)

### 1.1 Vision & Objectifs

#### Vision Produit

Offrir aux restaurants burkinabè un outil digital **ultra-simple** permettant de présenter leur menu via QR code et de recevoir les commandes directement sur WhatsApp, **sans infrastructure complexe ni investissement technologique important**.

#### Objectifs SMART

|Objectif        |Spécifique                         |Mesurable               |Atteignable                      |Pertinent              |Temporel             |
|----------------|-----------------------------------|------------------------|---------------------------------|-----------------------|---------------------|
|**Adoption**    |50 restaurants utilisent MenuQR    |Nombre de comptes actifs|Stratégie de go-to-market définie|Marché BF sous-équipé  |6 mois post-lancement|
|**Performance** |Temps de chargement < 3s sur 3G    |Lighthouse score ≥ 90   |PWA + cache agressif             |Connexions lentes au BF|Dès le MVP           |
|**Conversion**  |60% des scans mènent à une commande|Analytics événements    |UX optimisée mobile              |Objectif business clé  |3 mois post-lancement|
|**Satisfaction**|NPS restaurateurs > 40             |Enquêtes mensuelles     |Support et formations            |Fidélisation clients   |6 mois post-lancement|

#### Principes Directeurs

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRINCIPES MENUQR                            │
├─────────────────────────────────────────────────────────────────┤
│  🔌 Offline-First     → L'app fonctionne sans connexion        │
│  📱 Mobile-First      → 95% des utilisateurs sont sur mobile   │
│  🪶 Lightweight       → Bundle < 100KB, images optimisées      │
│  🚀 Zero-Friction     → Aucune installation, aucun compte      │
│  💬 WhatsApp-Native   → Canal de communication préféré au BF   │
└─────────────────────────────────────────────────────────────────┘
```

-----

### 1.2 Problèmes à Résoudre

|Problème Actuel                                      |Impact                              |Solution MenuQR                               |Bénéfice                         |
|-----------------------------------------------------|------------------------------------|----------------------------------------------|---------------------------------|
|Menus papier coûteux (50,000+ FCFA/mois)             |Coût récurrent élevé                |Menu digital modifiable instantanément        |Économie 90% sur impression      |
|Mise à jour difficile (rupture stock, nouveaux plats)|Frustration client, ventes perdues  |Modification en temps réel depuis téléphone   |Réactivité immédiate             |
|Erreurs de commande (communication orale)            |Retours cuisine, mécontentement     |Client sélectionne lui-même, commande écrite  |Réduction erreurs de 50%         |
|Serveurs surchargés aux heures de pointe             |Service dégradé, attente longue     |Commande autonome via QR                      |Serveurs focalisés sur le service|
|Solutions POS complexes et coûteuses                 |Barrière technologique et financière|Zéro infrastructure, utilise WhatsApp existant|Adoption immédiate               |
|Pas de photos des plats                              |Client hésite, commande moins       |Galerie photos avec descriptions              |Augmentation panier moyen 15%    |

-----

### 1.3 User Personas

#### 👨🏾‍🍳 Persona 1: Mamadou — Propriétaire de Garbadrome

```yaml
Profil:
  Âge: 42 ans
  Localisation: Ouagadougou, quartier Patte d'Oie
  Restaurant: Garbadrome populaire, 15 tables, 3 serveurs
  Chiffre d'affaires: ~800,000 FCFA/jour (heures de pointe)
  
Comportement Digital:
  - Smartphone Android entrée de gamme (Tecno/Infinix)
  - Utilise WhatsApp quotidiennement (business et personnel)
  - Confortable avec Facebook mais pas avec les apps complexes
  - Connexion 3G souvent instable

Frustrations:
  - "J'imprime 50 menus par mois, c'est du gaspillage"
  - "Les clients demandent toujours à voir les plats"
  - "Mes serveurs perdent du temps à expliquer le menu"
  - "Les solutions digitales sont trop compliquées"

Objectifs:
  - Moderniser son image sans investissement lourd
  - Réduire les erreurs de commande
  - Attirer une clientèle plus jeune et connectée

Citation: "Je veux quelque chose de simple qui marche avec WhatsApp"
```

#### 👩🏾 Persona 2: Aïcha — Cliente Régulière

```yaml
Profil:
  Âge: 28 ans
  Profession: Comptable dans une entreprise privée
  Localisation: Ouagadougou, quartier Zone du Bois
  Habitudes: Déjeune au restaurant 3-4x par semaine

Comportement Digital:
  - Smartphone Android milieu de gamme (Samsung A series)
  - Très active sur WhatsApp et Instagram
  - Fait des achats en ligne occasionnellement
  - Forfait data limité (2GB/mois)

Frustrations:
  - "L'attente pour avoir le menu est trop longue"
  - "Je ne sais jamais à quoi ressemblent les plats"
  - "Parfois ma commande n'est pas exactement ce que j'ai demandé"
  - "Les menus papier sont souvent abîmés ou incomplets"

Objectifs:
  - Commander rapidement pendant la pause déjeuner
  - Voir les photos avant de choisir
  - Éviter les mauvaises surprises

Citation: "Je veux voir ce que je commande et aller vite"
```

-----

### 1.4 User Stories & Critères d’Acceptation

#### Epic 1: Consultation du Menu (Client)

|ID   |User Story                                                                         |Critères d’Acceptation                                                                                            |Priorité|
|-----|-----------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|--------|
|US-01|En tant que **client**, je veux scanner un QR code pour voir le menu instantanément|• Menu s’affiche en < 3s sur 3G<br>• Aucune installation requise<br>• Fonctionne sur Android 5+ et iOS 12+        |P0      |
|US-02|En tant que **client**, je veux voir les photos et descriptions des plats          |• Image HD optimisée pour chaque plat<br>• Description, prix, temps estimé affichés<br>• Badge “Populaire” visible|P0      |
|US-03|En tant que **client**, je veux filtrer par catégorie                              |• Navigation par catégories cliquables<br>• Scroll fluide entre sections<br>• Compteur de plats par catégorie     |P1      |
|US-04|En tant que **client**, je veux rechercher un plat spécifique                      |• Barre de recherche accessible<br>• Résultats en temps réel (debounce 300ms)<br>• Message si aucun résultat      |P2      |
|US-05|En tant que **client**, je veux voir le menu dans ma langue                        |• Switch FR/EN visible<br>• Préférence sauvegardée localement<br>• Fallback sur FR si traduction manquante        |P1      |

#### Epic 2: Commande (Client)

|ID   |User Story                                                       |Critères d’Acceptation                                                                                        |Priorité|
|-----|-----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|--------|
|US-06|En tant que **client**, je veux ajouter des plats à ma commande  |• Bouton “+” visible sur chaque plat<br>• Animation feedback ajout<br>• Compteur panier mis à jour            |P0      |
|US-07|En tant que **client**, je veux personnaliser mes plats (options)|• Modal options s’ouvre au clic<br>• Options obligatoires marquées<br>• Prix mis à jour en temps réel         |P1      |
|US-08|En tant que **client**, je veux modifier les quantités           |• Boutons +/- dans le panier<br>• Suppression si quantité = 0<br>• Total recalculé instantanément             |P0      |
|US-09|En tant que **client**, je veux envoyer ma commande via WhatsApp |• WhatsApp s’ouvre avec message pré-formaté<br>• Numéro de table inclus<br>• Liste des plats claire et lisible|P0      |
|US-10|En tant que **client**, je veux ajouter des notes à ma commande  |• Champ texte libre par plat<br>• Champ global pour la commande<br>• Notes incluses dans message WhatsApp     |P2      |

#### Epic 3: Gestion du Menu (Admin/Restaurateur)

|ID   |User Story                                                        |Critères d’Acceptation                                                                                                        |Priorité|
|-----|------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|--------|
|US-13|En tant que **restaurateur**, je veux ajouter/modifier des plats  |• Formulaire simple (nom, prix, photo, description)<br>• Upload photo depuis téléphone<br>• Changements visibles immédiatement|P0      |
|US-14|En tant que **restaurateur**, je veux marquer un plat indisponible|• Toggle ON/OFF rapide<br>• Plat grisé côté client<br>• Pas de suppression, juste masquage                                    |P0      |
|US-15|En tant que **restaurateur**, je veux organiser mes catégories    |• Drag & drop pour réordonner<br>• Création/suppression catégories<br>• Icône/emoji personnalisable                           |P1      |
|US-19|En tant que **restaurateur**, je veux générer mes QR codes        |• QR code unique par table (optionnel)<br>• QR code général restaurant<br>• Export PNG/PDF pour impression                    |P0      |

-----

### 1.5 Fonctionnalités MVP

#### ✅ Inclus dans MVP (Phase 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MVP SCOPE                                │
├─────────────────────────────────────────────────────────────────┤
│  CLIENT                                                         │
│  ├── QR code → Menu instantané (< 3s)                          │
│  ├── Catégories + Plats (photo, prix, description, temps)      │
│  ├── Panier avec quantités modifiables                         │
│  ├── Commande WhatsApp pré-formatée                            │
│  ├── Bouton "Appeler serveur"                                  │
│  └── Bilingue FR/EN                                            │
│                                                                 │
│  ADMIN                                                          │
│  ├── CRUD Plats (création, édition, suppression)               │
│  ├── CRUD Catégories                                           │
│  ├── Toggle disponibilité plats                                │
│  ├── Upload photos (compression automatique)                   │
│  └── Génération QR codes (restaurant + tables)                 │
│                                                                 │
│  TECHNIQUE                                                      │
│  ├── PWA installable                                           │
│  ├── Offline-first (Service Worker)                            │
│  ├── Bundle < 100KB gzipped                                    │
│  └── Responsive mobile-first                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### ❌ Exclus du MVP (Phases ultérieures)

|Fonctionnalité                              |Raison d’exclusion                    |Phase prévue|
|--------------------------------------------|--------------------------------------|------------|
|Paiement en ligne (Orange Money, Moov Money)|Complexité intégration, réglementation|Phase 2     |
|Compte client / Authentification            |Friction inutile pour MVP             |Phase 2     |
|Système de réservation                      |Feature séparée                       |Phase 3     |
|Intégration POS existants                   |Dépend du POS, non standardisé        |Phase 3     |
|Analytics avancés                           |Nice-to-have, pas critique            |Phase 2     |

-----

### 1.6 Roadmap Produit

```
═══════════════════════════════════════════════════════════════════════════
                              ROADMAP MENUQR
═══════════════════════════════════════════════════════════════════════════

Q1 2025                          Q2 2025                          Q3 2025
────────────────────────────────────────────────────────────────────────────
     │                              │                              │
     ▼                              ▼                              ▼
┌─────────────┐             ┌─────────────┐             ┌─────────────┐
│   PHASE 1   │             │   PHASE 2   │             │   PHASE 3   │
│     MVP     │             │   GROWTH    │             │   SCALE     │
└─────────────┘             └─────────────┘             └─────────────┘
                                    
• Menu digital QR             • Analytics dashboard          • Multi-tenant
• Commande WhatsApp           • Mobile Money (Orange/Moov)   • API publique
• Admin basique               • Comptes clients optionnels   • Intégration POS
• PWA offline                 • Notifications push           • Programme fidélité
• QR code generator           • Multi-menus (horaires)       • Marketplace plats

Objectif: 50 restaurants      Objectif: 200 restaurants      Objectif: 500+ restaurants
───────────────────────────────────────────────────────────────────────────────────
```

-----

### 1.7 Métriques de Succès (KPIs)

#### Métriques Produit

|Métrique               |Définition                  |Objectif MVP|Objectif 6 mois|Outil de mesure|
|-----------------------|----------------------------|------------|---------------|---------------|
|**MAU**                |Utilisateurs actifs mensuels|1,000       |10,000         |Analytics      |
|**Taux de conversion** |Scans → Commandes WhatsApp  |> 50%       |> 65%          |Events tracking|
|**Temps de chargement**|First Contentful Paint      |< 2s        |< 1.5s         |Lighthouse     |
|**Taux de rebond**     |Quitte sans interaction     |< 30%       |< 20%          |Analytics      |

#### Métriques Business

|Métrique              |Définition                     |Objectif MVP|Objectif 6 mois|
|----------------------|-------------------------------|------------|---------------|
|**Restaurants actifs**|Utilisent MenuQR ≥ 1x/semaine  |20          |100            |
|**NPS Restaurateurs** |Net Promoter Score             |> 30        |> 50           |
|**Rétention M1**      |Restaurants actifs après 1 mois|> 70%       |> 85%          |

-----

### 1.8 Contraintes & Hypothèses

#### Contraintes Techniques

|Contrainte                     |Impact                          |Mitigation                             |
|-------------------------------|--------------------------------|---------------------------------------|
|Connexion 3G instable au BF    |Chargement lent, timeouts       |Offline-first, Service Worker agressif |
|Data mobile coûteuse           |Utilisateurs limitent leur conso|Bundle < 100KB, images WebP lazy-loaded|
|Téléphones entrée de gamme     |RAM/CPU limités                 |Code optimisé, pas d’animations lourdes|
|Pas de Play Store pour certains|Impossible d’installer des apps |PWA installable depuis navigateur      |
|WhatsApp dominant (>90% au BF) |Dépendance à un canal externe   |Intégration wa.me (pas d’API requise)  |

#### Hypothèses à Valider

|Hypothèse                                |Méthode de validation         |Seuil de succès                 |
|-----------------------------------------|------------------------------|--------------------------------|
|Les clients scanneront le QR code        |Test pilote 5 restaurants     |> 50% des tables utilisent le QR|
|Les restaurateurs peuvent gérer l’admin  |Tests utilisateurs            |Tâche complète en < 5 min       |
|WhatsApp est suffisant pour les commandes|Interviews restaurateurs      |> 80% satisfaits du workflow    |
|Le menu digital augmente les ventes      |A/B test (tables avec/sans QR)|+10% panier moyen               |

-----

## 2. High-Level Design (HLD)

### 2.1 Architecture Overview

L’architecture suit les principes **“Offline-First”** et **“API-Optional”** pour s’adapter aux contraintes réseau du Burkina Faso.

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Client PWA    │  │  Admin PWA      │  │     Service Worker          │  │
│  │   (Vue.js 3)    │  │  (Vue.js 3)     │  │  ┌─────────────────────┐    │  │
│  │                 │  │                 │  │  │  Workbox Runtime    │    │  │
│  │  • Menu View    │  │  • Dashboard    │  │  │  • Cache-first      │    │  │
│  │  • Cart         │  │  • Menu Editor  │  │  │  • Background sync  │    │  │
│  │  • Checkout     │  │  • QR Generator │  │  │  • Offline fallback │    │  │
│  └────────┬────────┘  └────────┬────────┘  │  └─────────────────────┘    │  │
│           │                    │           └─────────────────────────────┘  │
└───────────┼────────────────────┼────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    LOCAL STORAGE                                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │  IndexedDB   │  │ LocalStorage │  │ Cache API    │             │    │
│  │  │  (Menu data) │  │ (Cart, prefs)│  │ (Assets)     │             │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼ (Optional - Online mode)               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    BACKEND API (Spring Boot 3)                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │ REST API     │  │ Auth Service │  │ Analytics    │             │    │
│  │  │ /api/v1/*    │  │ (JWT)        │  │ Service      │             │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│  │                           │                                         │    │
│  │                           ▼                                         │    │
│  │  ┌────────────────────────────────────────────────────────────┐   │    │
│  │  │                    PostgreSQL                               │   │    │
│  │  │   restaurants │ categories │ dishes │ orders │ analytics   │   │    │
│  │  └────────────────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  WhatsApp   │  │   Vercel    │  │ Cloudinary  │  │   Sentry    │        │
│  │  (wa.me)    │  │  (Hosting)  │  │  (Images)   │  │  (Errors)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Deployment Modes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEPLOYMENT MODES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODE 1: STATIC (MVP - Recommended for start)                              │
│  ─────────────────────────────────────────────                             │
│  • Menu data stored in JSON files                                          │
│  • Admin generates new JSON and redeploys                                  │
│  • Zero backend infrastructure                                             │
│  • Hosting: Vercel/Netlify (free tier)                                     │
│  • Best for: Single restaurant, simple needs                               │
│                                                                             │
│  MODE 2: HYBRID (Phase 2)                                                  │
│  ─────────────────────────────────────────────                             │
│  • Client works offline with cached data                                   │
│  • Syncs with backend when online                                          │
│  • Backend handles admin, analytics, multi-tenant                          │
│  • Best for: Multiple restaurants, need analytics                          │
│                                                                             │
│  MODE 3: FULL BACKEND (Phase 3)                                            │
│  ─────────────────────────────────────────────                             │
│  • Real-time updates via WebSocket                                         │
│  • Order management system                                                 │
│  • Payment integration                                                     │
│  • Best for: High-volume restaurants, franchises                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

-----

### 2.2 Stack Technologique

#### Frontend Stack

|Layer         |Technology     |Version|Justification                              |
|--------------|---------------|-------|-------------------------------------------|
|**Framework** |Vue.js         |3.4+   |Composition API, excellent DX, bundle léger|
|**Build Tool**|Vite           |5.x    |HMR instantané, build optimisé             |
|**Language**  |TypeScript     |5.x    |Type safety, meilleure maintenabilité      |
|**Styling**   |Tailwind CSS   |3.x    |Utility-first, pas de CSS superflu         |
|**State**     |Pinia          |2.x    |Officiel Vue 3, TypeScript natif           |
|**Router**    |Vue Router     |4.x    |Navigation SPA, lazy loading               |
|**PWA**       |vite-plugin-pwa|0.17+  |Service Worker Workbox                     |
|**i18n**      |vue-i18n       |9.x    |Internationalisation FR/EN                 |

#### Backend Stack (Optional)

|Layer        |Technology           |Version|Justification                           |
|-------------|---------------------|-------|----------------------------------------|
|**Framework**|Spring Boot          |3.2+   |Robuste, expertise existante            |
|**Language** |Java                 |21 LTS |Virtual threads, pattern matching       |
|**Database** |PostgreSQL           |16.x   |JSONB pour flexibilité, full-text search|
|**Auth**     |Spring Security + JWT|-      |Stateless, scalable                     |

#### Infrastructure

|Service             |Provider        |Tier            |Purpose                |
|--------------------|----------------|----------------|-----------------------|
|**Frontend Hosting**|Vercel          |Free            |CDN global, auto-deploy|
|**Backend Hosting** |Railway / Render|Starter         |Java hosting           |
|**Database**        |Supabase / Neon |Free            |PostgreSQL managed     |
|**Images**          |Cloudinary      |Free (25GB)     |Optimization, WebP     |
|**Monitoring**      |Sentry          |Free (5k events)|Error tracking         |

-----

### 2.3 Flux de Données

#### Flow 1: Client Scan → Order

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER JOURNEY: SCAN TO ORDER                           │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  SCAN   │────▶│  LOAD   │────▶│ BROWSE  │────▶│  CART   │────▶│ ORDER   │
    │ QR Code │     │  Menu   │     │  Menu   │     │ Review  │     │WhatsApp │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │               │               │               │               │
         ▼               ▼               ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ Camera  │     │ SW Check│     │ Pinia   │     │ Pinia   │     │ wa.me   │
    │  App    │     │ Cache   │     │ Store   │     │ Cart    │     │ Link    │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │               │               │               │               │
         │               │               │               │               │
    URL contains    If cached:      User taps      User can:        Message
    restaurant_id   serve local     categories,    - Edit qty       includes:
    + table_num     Else: fetch     views dishes   - Add notes      - Table #
                    from CDN        adds to cart   - Clear cart     - Items
                                                                    - Total
                                                                    
    ⏱️ < 1s          ⏱️ < 2s         ⏱️ User pace    ⏱️ User pace     ⏱️ Instant
```

-----

### 2.4 Considérations Burkina Faso 🇧🇫

#### Network & Device Constraints

|Constraint         |Reality                                     |Solution                              |
|-------------------|--------------------------------------------|--------------------------------------|
|**3G dominant**    |4G limited to cities, often falls back to 3G|Target < 3s load on 3G (1.6 Mbps)     |
|**Expensive data** |1GB ≈ 1000-2000 FCFA                        |Bundle < 100KB, aggressive caching    |
|**Low-end devices**|Tecno, Infinix, old Samsungs                |No heavy JS, simple animations        |
|**Power outages**  |Frequent, phones often at low battery       |Efficient code, no background drains  |
|**Shared phones**  |Multiple users per device                   |No persistent login, localStorage only|

#### Optimization Strategies

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    BURKINA FASO OPTIMIZATIONS                                │
└──────────────────────────────────────────────────────────────────────────────┘

BUNDLE OPTIMIZATION
───────────────────
├── Tree shaking (remove unused code)
├── Code splitting (lazy load routes)
├── Minification (Terser)
├── Compression (Brotli > gzip)
└── Target: < 100KB gzipped total

IMAGE OPTIMIZATION
──────────────────
├── WebP format (30% smaller than JPEG)
├── Responsive images (srcset)
├── Lazy loading (Intersection Observer)
├── Placeholder blur (LQIP)
├── Max dimensions: 800x600 for dishes
└── Cloudinary auto-optimization

CACHING STRATEGY
────────────────
├── Service Worker: Cache-first for menu
├── IndexedDB: Offline menu storage
├── HTTP Cache: Long TTL for static assets
├── Stale-while-revalidate for API calls
└── Background sync for analytics
```

#### Localization

|Aspect           |Implementation                          |
|-----------------|----------------------------------------|
|**Languages**    |French (default), English (optional)    |
|**Currency**     |FCFA (Franc CFA), no decimals           |
|**Phone format** |+226 XX XX XX XX                        |
|**Date format**  |DD/MM/YYYY                              |
|**Number format**|Space as thousand separator (1 000 FCFA)|

-----

## 3. Low-Level Design (LLD)

### 3.1 Structure du Projet

```
menuqr-app/
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── images/icons/          # PWA icons
│
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── styles/main.css
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppHeader.vue
│   │   │   ├── BaseButton.vue
│   │   │   ├── BaseModal.vue
│   │   │   ├── LoadingSpinner.vue
│   │   │   └── LanguageSelector.vue
│   │   │
│   │   ├── menu/
│   │   │   ├── CategoryTabs.vue
│   │   │   ├── DishCard.vue
│   │   │   ├── DishModal.vue
│   │   │   └── SearchBar.vue
│   │   │
│   │   ├── cart/
│   │   │   ├── CartDrawer.vue
│   │   │   ├── CartItem.vue
│   │   │   └── CartSummary.vue
│   │   │
│   │   └── order/
│   │       ├── WhatsAppButton.vue
│   │       └── CallServerButton.vue
│   │
│   ├── composables/
│   │   ├── useMenu.ts
│   │   ├── useCart.ts
│   │   ├── useWhatsApp.ts
│   │   ├── useI18n.ts
│   │   └── useOffline.ts
│   │
│   ├── stores/
│   │   ├── menuStore.ts
│   │   ├── cartStore.ts
│   │   └── configStore.ts
│   │
│   ├── types/
│   │   ├── menu.ts
│   │   ├── cart.ts
│   │   └── config.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   ├── views/
│   │   ├── MenuView.vue
│   │   ├── CartView.vue
│   │   └── AdminView.vue
│   │
│   ├── router/index.ts
│   ├── i18n/
│   │   ├── fr.json
│   │   └── en.json
│   │
│   ├── data/menu.json
│   ├── App.vue
│   └── main.ts
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

-----

### 3.2 Modèles de Données (TypeScript)

```typescript
// types/menu.ts

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  whatsappNumber: string;
  address: string;
  tables: number;
  openingHours: OpeningHours;
  currency: 'XOF';
  defaultLocale: 'fr' | 'en';
}

export interface Category {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  icon?: string;
  order: number;
  isActive: boolean;
  dishes: Dish[];
}

export interface Dish {
  id: string;
  categoryId: string;
  name: LocalizedString;
  description?: LocalizedString;
  price: number;
  image: string;
  estimatedTime?: number;
  isAvailable: boolean;
  isPopular: boolean;
  isNew: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  spicyLevel?: 1 | 2 | 3;
  options?: DishOption[];
}

export interface DishOption {
  id: string;
  name: LocalizedString;
  type: 'single' | 'multiple';
  required: boolean;
  choices: OptionChoice[];
}

export interface OptionChoice {
  id: string;
  name: LocalizedString;
  priceModifier: number;
  isAvailable: boolean;
}

export interface LocalizedString {
  fr: string;
  en?: string;
}

// types/cart.ts

export interface CartItem {
  id: string;
  dishId: string;
  dish: Dish;
  quantity: number;
  selectedOptions: SelectedOption[];
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SelectedOption {
  optionId: string;
  choiceIds: string[];
  choices: OptionChoice[];
  priceModifier: number;
}
```

-----

### 3.3 Pinia Stores

#### Cart Store

```typescript
// stores/cartStore.ts
import { defineStore } from 'pinia';
import type { CartItem, Dish, SelectedOption } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    tableNumber: null as number | null,
    notes: '',
  }),

  getters: {
    itemCount: (state) => 
      state.items.reduce((sum, item) => sum + item.quantity, 0),
    
    subtotal: (state) => 
      state.items.reduce((sum, item) => sum + item.totalPrice, 0),
    
    isEmpty: (state) => state.items.length === 0,
    
    hasDish: (state) => (dishId: string) =>
      state.items.some((item) => item.dishId === dishId),
  },

  actions: {
    addItem(dish: Dish, quantity = 1, options: SelectedOption[] = [], notes?: string) {
      const optionsPrice = options.reduce((sum, opt) => sum + opt.priceModifier, 0);
      const unitPrice = dish.price + optionsPrice;

      const existingIndex = this.items.findIndex(
        (item) => item.dishId === dish.id &&
          JSON.stringify(item.selectedOptions) === JSON.stringify(options)
      );

      if (existingIndex > -1) {
        this.items[existingIndex].quantity += quantity;
        this.items[existingIndex].totalPrice = 
          this.items[existingIndex].unitPrice * this.items[existingIndex].quantity;
      } else {
        this.items.push({
          id: uuidv4(),
          dishId: dish.id,
          dish,
          quantity,
          selectedOptions: options,
          notes,
          unitPrice,
          totalPrice: unitPrice * quantity,
        });
      }
    },

    removeItem(itemId: string) {
      const index = this.items.findIndex((item) => item.id === itemId);
      if (index > -1) this.items.splice(index, 1);
    },

    updateQuantity(itemId: string, quantity: number) {
      const item = this.items.find((item) => item.id === itemId);
      if (!item) return;
      
      if (quantity <= 0) {
        this.removeItem(itemId);
      } else {
        item.quantity = quantity;
        item.totalPrice = item.unitPrice * quantity;
      }
    },

    setTableNumber(num: number | null) {
      this.tableNumber = num;
    },

    clearCart() {
      this.items = [];
      this.notes = '';
    },
  },

  persist: {
    key: 'menuqr-cart',
    storage: localStorage,
  },
});
```

-----

### 3.4 Composables

#### useWhatsApp Composable

```typescript
// composables/useWhatsApp.ts
import { computed } from 'vue';
import { useCartStore } from '@/stores/cartStore';
import { useMenuStore } from '@/stores/menuStore';
import { formatPrice } from '@/utils/formatters';

export function useWhatsApp() {
  const cartStore = useCartStore();
  const menuStore = useMenuStore();

  const formatOrderMessage = computed(() => {
    const lines: string[] = [];
    const restaurantName = menuStore.restaurant?.name || 'Restaurant';

    lines.push(`🍽️ *Nouvelle commande*`);
    lines.push(`📍 ${restaurantName}`);
    
    if (cartStore.tableNumber) {
      lines.push(`🪑 Table ${cartStore.tableNumber}`);
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('');

    cartStore.items.forEach((item) => {
      const name = item.dish.name.fr;
      lines.push(`• ${item.quantity}x ${name} — ${formatPrice(item.totalPrice)}`);
      
      if (item.selectedOptions.length > 0) {
        item.selectedOptions.forEach((opt) => {
          const choiceNames = opt.choices.map((c) => c.name.fr);
          lines.push(`  ↳ ${choiceNames.join(', ')}`);
        });
      }
      
      if (item.notes) {
        lines.push(`  📝 ${item.notes}`);
      }
    });

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push(`*Total:* ${formatPrice(cartStore.subtotal)}`);
    
    if (cartStore.notes) {
      lines.push('');
      lines.push(`📝 *Notes:* ${cartStore.notes}`);
    }

    lines.push('');
    lines.push('Merci pour votre commande ! 🙏');

    return lines.join('\n');
  });

  const whatsappUrl = computed(() => {
    const phone = menuStore.restaurant?.whatsappNumber || '';
    const message = encodeURIComponent(formatOrderMessage.value);
    return `https://wa.me/${phone}?text=${message}`;
  });

  const sendOrder = () => {
    if (cartStore.isEmpty) return;
    window.open(whatsappUrl.value, '_blank');
  };

  const callServer = () => {
    const phone = menuStore.restaurant?.whatsappNumber || '';
    const message = encodeURIComponent(
      `🔔 *Appel serveur*\n\n` +
      `📍 ${menuStore.restaurant?.name}\n` +
      (cartStore.tableNumber ? `🪑 Table ${cartStore.tableNumber}\n\n` : '\n') +
      `Un serveur est demandé à cette table.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return { formatOrderMessage, whatsappUrl, sendOrder, callServer };
}
```

-----

### 3.5 Composants Vue

#### DishCard.vue

```vue
<template>
  <article
    class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 
           transition-all duration-200 active:scale-[0.98] cursor-pointer"
    :class="{ 'opacity-60 grayscale': !dish.isAvailable }"
    @click="$emit('select', dish)"
  >
    <!-- Image -->
    <div class="relative aspect-[4/3] overflow-hidden bg-gray-100">
      <img
        :src="dish.image"
        :alt="dish.name.fr"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      
      <!-- Badges -->
      <span
        v-if="dish.isPopular"
        class="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full"
      >
        🔥 Populaire
      </span>
      
      <span
        v-if="dish.estimatedTime"
        class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full"
      >
        ⏱️ {{ dish.estimatedTime }} min
      </span>

      <!-- Unavailable Overlay -->
      <div
        v-if="!dish.isAvailable"
        class="absolute inset-0 bg-white/50 flex items-center justify-center"
      >
        <span class="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
          Indisponible
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-3">
      <h3 class="font-semibold text-gray-900 line-clamp-1">
        {{ dish.name.fr }}
      </h3>
      
      <p v-if="dish.description" class="text-sm text-gray-500 mt-1 line-clamp-2">
        {{ dish.description.fr }}
      </p>

      <!-- Price & Add Button -->
      <div class="flex items-center justify-between mt-3">
        <span class="text-lg font-bold text-green-600">
          {{ formatPrice(dish.price) }}
        </span>
        
        <button
          v-if="dish.isAvailable"
          class="bg-green-500 text-white w-9 h-9 rounded-full flex items-center 
                 justify-center text-xl font-bold hover:bg-green-600 transition-colors"
          @click.stop="addToCart"
        >
          +
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Dish } from '@/types';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/utils/formatters';

const props = defineProps<{ dish: Dish }>();
const emit = defineEmits<{ select: [dish: Dish] }>();

const cartStore = useCartStore();

const addToCart = () => {
  if (props.dish.options?.length) {
    emit('select', props.dish);
  } else {
    cartStore.addItem(props.dish);
  }
};
</script>
```

#### WhatsAppButton.vue

```vue
<template>
  <button
    :disabled="isEmpty"
    class="w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center 
           justify-center gap-3 transition-all duration-200 shadow-lg"
    :class="{
      'bg-green-500 text-white hover:bg-green-600': !isEmpty,
      'bg-gray-200 text-gray-400 cursor-not-allowed': isEmpty,
    }"
    @click="sendOrder"
  >
    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967..." />
    </svg>
    <span>{{ buttonText }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCartStore } from '@/stores/cartStore';
import { useWhatsApp } from '@/composables/useWhatsApp';
import { formatPrice } from '@/utils/formatters';

const cartStore = useCartStore();
const { sendOrder } = useWhatsApp();

const isEmpty = computed(() => cartStore.isEmpty);

const buttonText = computed(() =>
  isEmpty.value
    ? 'Ajoutez des plats'
    : `Commander sur WhatsApp • ${formatPrice(cartStore.subtotal)}`
);
</script>
```

-----

### 3.6 Configuration PWA (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      
      manifest: {
        name: 'MenuQR - Menu Digital',
        short_name: 'MenuQR',
        description: 'Menu digital pour restaurant avec commande WhatsApp',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  build: {
    target: 'es2015',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['vue', 'vue-router', 'pinia'] },
      },
    },
  },
});
```

-----

### 3.7 Router Configuration

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/menu' },
  {
    path: '/menu',
    name: 'Menu',
    component: () => import('@/views/MenuView.vue'),
  },
  {
    path: '/r/:slug',
    name: 'RestaurantMenu',
    component: () => import('@/views/MenuView.vue'),
    props: true,
  },
  {
    path: '/r/:slug/table/:tableNumber',
    name: 'TableMenu',
    component: () => import('@/views/MenuView.vue'),
    props: (route) => ({
      slug: route.params.slug,
      tableNumber: parseInt(route.params.tableNumber as string, 10),
    }),
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('@/views/CartView.vue'),
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/menu',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
```

-----

### 3.8 Internationalisation (i18n/fr.json)

```json
{
  "app": {
    "title": "MenuQR",
    "loading": "Chargement...",
    "offline": "Vous êtes hors ligne"
  },
  "menu": {
    "title": "Menu",
    "popular": "Populaires",
    "unavailable": "Indisponible",
    "search": "Rechercher un plat..."
  },
  "cart": {
    "title": "Votre commande",
    "empty": "Votre panier est vide",
    "addItems": "Ajoutez des plats",
    "total": "Total",
    "orderWhatsApp": "Commander sur WhatsApp",
    "clear": "Vider le panier"
  },
  "order": {
    "table": "Table",
    "notes": "Notes",
    "thankYou": "Merci pour votre commande ! 🙏"
  },
  "service": {
    "callServer": "Appeler le serveur",
    "requestBill": "Demander l'addition"
  }
}
```

-----

## 4. Annexes

### A. Checklist de Déploiement

```markdown
## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] ESLint clean
- [ ] Environment variables documented

### Performance
- [ ] Lighthouse Performance ≥ 90
- [ ] Bundle size < 100KB gzipped
- [ ] Images optimized (WebP)
- [ ] Service Worker verified

### PWA
- [ ] Manifest.json valid
- [ ] All icons present
- [ ] Offline mode working
- [ ] Install prompt works

### Testing
- [ ] Tested on Android Chrome
- [ ] Tested on iOS Safari
- [ ] Tested on 3G connection
- [ ] Tested offline mode

### Deployment
- [ ] Vercel configured
- [ ] Custom domain set up
- [ ] SSL certificate valid
- [ ] Error monitoring (Sentry) active
```

-----

### B. Variables d’Environnement

```bash
# .env.example

# App
VITE_APP_NAME=MenuQR
VITE_APP_URL=https://app.menuqr.bf

# Restaurant (for static mode)
VITE_RESTAURANT_SLUG=garbadrome-ouaga
VITE_WHATSAPP_NUMBER=22670123456

# Analytics
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Images
VITE_CLOUDINARY_CLOUD_NAME=menuqr
```

-----

### C. Commandes NPM

```bash
# Create project
npm create vite@latest menuqr-app -- --template vue-ts

# Install dependencies
npm install vue-router@4 pinia pinia-plugin-persistedstate
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa

# Initialize Tailwind
npx tailwindcss init -p

# Development
npm run dev

# Build
npm run build

# Preview
npm run preview

# Deploy to Vercel
npx vercel --prod
```

-----

### D. Performance Budget

```yaml
# Performance targets

bundles:
  total_gzipped: 100KB max

timing:
  first_contentful_paint: 2s max
  time_to_interactive: 3s max (3G)
  
lighthouse:
  performance: 90 min
  accessibility: 90 min
  best_practices: 90 min
  pwa: 90 min

caching:
  static_assets: 1 year
  api_responses: 1 hour
  images: 30 days
```

-----

*— Fin du Document —*

**MenuQR v2.0** • Documentation 19 Décembre 2025  
Développé pour le marché Burkinabè 🇧🇫
