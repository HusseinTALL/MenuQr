# MenuQR

**Plateforme SaaS de Gestion pour Restaurants & Hotels**

> Documentation Technique Complète: PRD • HLD • LLD

**Version 3.0** • Janvier 2025

---

## Table des Matières

1. [Product Requirements Document (PRD)](#1-product-requirements-document-prd)
2. [High-Level Design (HLD)](#2-high-level-design-hld)
3. [Low-Level Design (LLD)](#3-low-level-design-lld)
4. [Annexes](#4-annexes)

---

## 1. Product Requirements Document (PRD)

### 1.1 Executive Summary

MenuQR est une plateforme SaaS complète de gestion pour restaurants et hôtels. Initialement conçue comme un simple système de menu digital avec commande WhatsApp, la plateforme a évolué en un écosystème complet offrant:

- **Gestion de restaurant** (menus, commandes, cuisine KDS, tables)
- **Système de livraison** avec application livreur dédiée
- **Module hôtelier** pour le room service
- **Programme de fidélité** et campagnes marketing
- **Système de réservation** en ligne
- **Panel SuperAdmin** multi-tenant
- **Sécurité enterprise** (RBAC, audit, GDPR)

### 1.2 Vision & Objectifs

#### Vision Produit

Devenir la plateforme de référence pour la digitalisation des restaurants et hôtels, en offrant une solution tout-en-un qui couvre l'ensemble du parcours client, de la découverte à la fidélisation.

#### Objectifs Stratégiques

| Objectif | Description | Métrique |
|----------|-------------|----------|
| **Multi-tenant** | Servir plusieurs restaurants depuis une seule instance | 500+ restaurants actifs |
| **Omnichannel** | Support sur place, livraison, et room service | 3 canaux intégrés |
| **Monétisation** | Modèle SaaS avec 5 niveaux d'abonnement | MRR croissant |
| **Enterprise-Ready** | Sécurité, audit, conformité GDPR | Certifications |

### 1.3 User Personas

#### Persona 1: Restaurant Owner (Admin)

```yaml
Profil:
  Rôle: Propriétaire/Gérant de restaurant
  Besoins:
    - Gérer menu et disponibilités en temps réel
    - Suivre les commandes (sur place + livraison)
    - Analyser les performances via dashboard
    - Gérer le personnel avec permissions
    - Lancer des campagnes marketing

Fonctionnalités utilisées:
  - Dashboard avec KPIs temps réel
  - KDS (Kitchen Display System) Kanban
  - Gestion des plats et catégories
  - Système de réservation
  - Programme de fidélité
  - Gestion du personnel (RBAC)
```

#### Persona 2: Customer (Client)

```yaml
Profil:
  Rôle: Client du restaurant
  Besoins:
    - Consulter le menu digital (QR code)
    - Commander sur place ou en livraison
    - Suivre sa livraison en temps réel
    - Réserver une table
    - Accumuler des points de fidélité
    - Laisser des avis

Fonctionnalités utilisées:
  - Menu digital responsive
  - Panier et checkout
  - Suivi de livraison (carte)
  - Historique de commandes
  - Espace fidélité
  - Système d'avis
```

#### Persona 3: Delivery Driver (Livreur)

```yaml
Profil:
  Rôle: Livreur partenaire
  Besoins:
    - Recevoir les livraisons assignées
    - Naviguer vers les destinations
    - Mettre à jour le statut en temps réel
    - Suivre ses gains quotidiens
    - Gérer son profil et véhicule

Fonctionnalités utilisées:
  - App livreur dédiée
  - Navigation GPS intégrée
  - Mise à jour statut one-tap
  - Dashboard gains
  - Gestion des shifts
```

#### Persona 4: Hotel Staff (Personnel Hôtelier)

```yaml
Profil:
  Rôle: Réceptionniste / Room Service
  Besoins:
    - Gérer les chambres et guests
    - Traiter les commandes room service
    - Consulter le menu hôtelier
    - Suivre les commandes en cuisine

Fonctionnalités utilisées:
  - Panel admin hôtel
  - Gestion des guests
  - KDS hôtelier
  - Menu room service
```

#### Persona 5: Super Admin

```yaml
Profil:
  Rôle: Administrateur plateforme
  Besoins:
    - Gérer tous les restaurants/hôtels
    - Surveiller le système
    - Gérer les abonnements et factures
    - Accéder aux logs d'audit
    - Configurer les plans tarifaires

Fonctionnalités utilisées:
  - Dashboard global
  - Gestion multi-tenant
  - Monitoring système
  - Audit logs
  - Gestion abonnements
  - Analytics avancés
```

---

### 1.4 Modules Fonctionnels

#### Module 1: Gestion Restaurant (Core)

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **Gestion Menu** | CRUD catégories et plats avec images | Implementé |
| **Options Plats** | Variantes, suppléments, allergènes | Implementé |
| **Gestion Tables** | Configuration tables et zones | Implementé |
| **Gestion Stock** | Suivi stock, alertes bas stock | Implementé |
| **Commandes** | Traitement complet du cycle commande | Implementé |
| **KDS** | Affichage cuisine style Kanban | Implementé |
| **Dashboard** | Analytics temps réel (ventes, revenus) | Implementé |

#### Module 2: Experience Client

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **Menu Digital** | Accès via QR code, responsive | Implementé |
| **Panier** | Gestion quantités, options, notes | Implementé |
| **Checkout** | Modes: sur place, emporter, livraison | Implementé |
| **Réservations** | Booking en ligne avec créneaux | Implementé |
| **Fidélité** | Points, récompenses, niveaux | Implementé |
| **Avis** | Notes et commentaires | Implementé |
| **Historique** | Commandes passées, favoris | Implementé |

#### Module 3: Livraison

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **Gestion Livraisons** | Dashboard admin des livraisons | Implementé |
| **Batching** | Regroupement intelligent livraisons | Implementé |
| **App Livreur** | Interface mobile livreurs | Implementé |
| **Tracking Temps Réel** | Position GPS via Socket.IO | Implementé |
| **ETA Google Maps** | Calcul trajet avec trafic | Implementé |
| **Gestion Livreurs** | Profils, véhicules, documents | Implementé |
| **Shifts** | Planification des créneaux | Implementé |
| **Paiements** | Stripe Connect pour payouts | Implementé |
| **Gains** | Suivi revenus livreurs | Implementé |

#### Module 4: Hôtellerie (Room Service)

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **Gestion Hôtels** | Configuration établissements | Implementé |
| **Gestion Chambres** | Rooms, types, tarifs | Implementé |
| **Guests** | Check-in/out, profils clients | Implementé |
| **Menu Room Service** | Menus dédiés par hôtel | Implementé |
| **Commandes Hôtel** | Workflow room service | Implementé |
| **Facturation Chambre** | Ajout à la note | Implementé |

#### Module 5: Marketing & Engagement

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **Campagnes Email** | Templates, scheduling, analytics | Implementé |
| **SMS Marketing** | Notifications via Twilio | Implementé |
| **Programme Fidélité** | Points, tiers, récompenses | Implementé |
| **Annonces** | Bannières et notifications | Implementé |

#### Module 6: SuperAdmin

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **Dashboard Global** | Vue d'ensemble plateforme | Implementé |
| **Gestion Restaurants** | CRUD restaurants clients | Implementé |
| **Gestion Utilisateurs** | Tous les utilisateurs système | Implementé |
| **Abonnements** | Plans et souscriptions | Implementé |
| **Facturation** | Invoices et paiements | Implementé |
| **Analytics** | Rapports avancés | Implementé |
| **Monitoring** | Health système | Implementé |
| **Alertes Système** | Notifications critiques | Implementé |
| **Outils Avancés** | Backups, migrations | Implementé |

#### Module 7: Sécurité & Conformité

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **RBAC** | Permissions granulaires | Implementé |
| **Audit Logs** | Traçabilité actions | Implementé |
| **Détection Anomalies** | Brute force, patterns suspects | Implementé |
| **GDPR** | Export/suppression données | Implementé |
| **Sessions** | Gestion sessions actives | Implementé |
| **Login History** | Historique connexions | Implementé |
| **Blacklist Tokens** | Révocation JWT | Implementé |
| **Backups** | Sauvegardes automatiques | Implementé |

#### Module 8: Abonnements & Billing

| Fonctionnalité | Description | Status |
|----------------|-------------|--------|
| **Plans Tarifaires** | 5 niveaux (Free → Enterprise) | Implementé |
| **Feature Gating** | Restrictions par plan | Implementé |
| **Downgrade Handling** | Gestion rétrogradation | Implementé |
| **Stripe Integration** | Paiements récurrents | Implementé |

---

### 1.5 Matrice des Plans d'Abonnement

| Fonctionnalité | Free | Starter | Professional | Business | Enterprise |
|----------------|:----:|:-------:|:------------:|:--------:|:----------:|
| **Plats max** | 20 | 50 | 200 | 500 | Illimité |
| **Commandes/mois** | 100 | 500 | 2000 | 10000 | Illimité |
| **Utilisateurs** | 1 | 3 | 10 | 25 | Illimité |
| **Menu Digital** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **KDS** | - | ✓ | ✓ | ✓ | ✓ |
| **Réservations** | - | ✓ | ✓ | ✓ | ✓ |
| **Livraison** | - | - | ✓ | ✓ | ✓ |
| **Fidélité** | - | - | ✓ | ✓ | ✓ |
| **Campagnes** | - | - | - | ✓ | ✓ |
| **Multi-sites** | - | - | - | ✓ | ✓ |
| **API Access** | - | - | - | - | ✓ |
| **Support Dédié** | - | - | - | - | ✓ |
| **Prix/mois** | 0€ | 29€ | 79€ | 199€ | Sur devis |

---

## 2. High-Level Design (HLD)

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Customer App   │  │   Admin Panel   │  │   Driver App    │              │
│  │   (Vue.js 3)    │  │   (Vue.js 3)    │  │   (Vue.js 3)    │              │
│  │                 │  │                 │  │                 │              │
│  │  • Menu View    │  │  • Dashboard    │  │  • Deliveries   │              │
│  │  • Cart/Order   │  │  • KDS Kanban   │  │  • Navigation   │              │
│  │  • Tracking     │  │  • Management   │  │  • Earnings     │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Hotel Guest    │  │  Hotel Admin    │  │   SuperAdmin    │              │
│  │   (Vue.js 3)    │  │   (Vue.js 3)    │  │   (Vue.js 3)    │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
└───────────┼────────────────────┼────────────────────┼────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    Express.js + TypeScript                          │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │ REST API     │  │ Socket.IO    │  │ Middleware   │              │     │
│  │  │ /api/v1/*    │  │ (Real-time)  │  │ (Auth/RBAC)  │              │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │     │
│  │                                                                     │     │
│  │  ┌──────────────────────────────────────────────────────────────┐  │     │
│  │  │                    Services Layer                             │  │     │
│  │  │  • orderService      • deliveryService    • hotelService     │  │     │
│  │  │  • loyaltyService    • campaignService    • auditService     │  │     │
│  │  │  • stripeService     • emailService       • smsService       │  │     │
│  │  └──────────────────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                         MongoDB (Mongoose)                          │     │
│  │   Restaurant │ Order │ Delivery │ Hotel │ User │ Subscription      │     │
│  │   Category   │ Dish  │ Driver   │ Room  │ Audit│ Campaign          │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Stripe    │  │   Twilio    │  │ Google Maps │  │   Sentry    │        │
│  │  (Payments) │  │    (SMS)    │  │  (Routing)  │  │  (Errors)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │   Redis     │  │  Nodemailer │  │ Cloudinary  │                          │
│  │   (Cache)   │  │   (Email)   │  │  (Images)   │                          │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Technologique

#### Backend Stack

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| **Runtime** | Node.js | 20.x LTS | Performance, écosystème npm |
| **Framework** | Express.js | 4.x | Flexibilité, middleware ecosystem |
| **Language** | TypeScript | 5.x | Type safety, DX |
| **Database** | MongoDB | 7.x | Flexibilité schéma, scalabilité |
| **ODM** | Mongoose | 8.x | Validation, middleware |
| **Auth** | JWT + bcrypt | - | Stateless, sécurisé |
| **Real-time** | Socket.IO | 4.x | WebSocket bidirectionnel |
| **Payments** | Stripe | - | Paiements + Connect |
| **SMS** | Twilio | - | Notifications OTP |
| **Email** | Nodemailer | - | Templates transactionnels |
| **Cache** | Redis | - | Sessions, cache |

#### Frontend Stack

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| **Framework** | Vue.js | 3.4+ | Composition API, réactivité |
| **Build Tool** | Vite | 5.x | HMR rapide, bundle optimisé |
| **Language** | TypeScript | 5.x | Type safety |
| **UI Library** | Ant Design Vue | 4.x | Composants enterprise |
| **State** | Pinia | 2.x | Store officiel Vue 3 |
| **Router** | Vue Router | 4.x | Navigation SPA |
| **Charts** | ECharts | 5.x | Visualisations données |
| **Maps** | Google Maps API | - | Tracking livraison |
| **PWA** | vite-plugin-pwa | - | Installation mobile |

### 2.3 Flux de Données Principaux

#### Flow 1: Commande Restaurant

```
Customer App                API Server                  Admin Panel
     │                           │                           │
     │  1. Browse Menu           │                           │
     │──────────────────────────▶│                           │
     │                           │                           │
     │  2. Add to Cart           │                           │
     │  (localStorage)           │                           │
     │                           │                           │
     │  3. Checkout              │                           │
     │──────────────────────────▶│                           │
     │                           │  4. Create Order          │
     │                           │──────────────────────────▶│
     │                           │  (Socket.IO)              │
     │                           │                           │
     │  5. Order Confirmation    │                           │
     │◀──────────────────────────│                           │
     │                           │                           │
     │                           │  6. Status Updates        │
     │◀──────────────────────────│◀──────────────────────────│
     │  (Socket.IO)              │  (Socket.IO)              │
```

#### Flow 2: Livraison

```
Order Created      Assignment        Driver App         Customer
     │                 │                  │                 │
     │  1. New delivery│                  │                 │
     │────────────────▶│                  │                 │
     │                 │  2. Assign       │                 │
     │                 │─────────────────▶│                 │
     │                 │                  │                 │
     │                 │  3. Accept       │                 │
     │                 │◀─────────────────│                 │
     │                 │                  │                 │
     │                 │                  │  4. Live GPS    │
     │                 │                  │────────────────▶│
     │                 │                  │  (Socket.IO)    │
     │                 │                  │                 │
     │                 │  5. Status       │                 │
     │                 │◀─────────────────│                 │
     │                 │                  │                 │
     │                 │                  │  6. Delivered   │
     │                 │                  │────────────────▶│
```

### 2.4 Modèle de Données (Vue d'Ensemble)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE ENTITIES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  Restaurant  │───▶│   Category   │───▶│    Dish      │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                                       │                            │
│         │                                       ▼                            │
│         │            ┌──────────────┐    ┌──────────────┐                   │
│         └───────────▶│    Table     │    │    Order     │                   │
│                      └──────────────┘    └──────────────┘                   │
│                                                 │                            │
│                                                 ▼                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Customer   │◀───│  Reservation │    │   Delivery   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                                       │                            │
│         ▼                                       ▼                            │
│  ┌──────────────┐                        ┌──────────────┐                   │
│  │   Loyalty    │                        │    Driver    │                   │
│  │ Transaction  │                        └──────────────┘                   │
│  └──────────────┘                               │                            │
│                                                 ▼                            │
│                      ┌──────────────┐    ┌──────────────┐                   │
│                      │ DriverShift  │    │ DriverPayout │                   │
│                      └──────────────┘    └──────────────┘                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           HOTEL ENTITIES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │    Hotel     │───▶│     Room     │───▶│  HotelGuest  │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                                       │                            │
│         ▼                                       ▼                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  HotelMenu   │───▶│ HotelCategory│───▶│  HotelDish   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                 │                            │
│                                                 ▼                            │
│                                          ┌──────────────┐                   │
│                                          │  HotelOrder  │                   │
│                                          └──────────────┘                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ADMIN & SECURITY ENTITIES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │     User     │───▶│   AuditLog   │    │   Session    │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Subscription │───▶│Subscript.Plan│    │   Invoice    │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  AlertRule   │    │ SystemAlert  │    │   Backup     │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ LoginHistory │    │TokenBlacklist│    │ SystemConfig │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                          MARKETING ENTITIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Campaign   │    │EmailTemplate │    │ Announcement │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐                                       │
│  │    Review    │    │ Notification │                                       │
│  └──────────────┘    └──────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Low-Level Design (LLD)

### 3.1 Structure du Projet

```
MenuQR/
├── menuqr-api/                    # Backend Express.js
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts             # Variables environnement
│   │   │   ├── permissions.ts     # Configuration RBAC
│   │   │   ├── featureFlags.ts    # Feature gating
│   │   │   └── redis.ts           # Config Redis
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── orderController.ts
│   │   │   ├── deliveryController.ts
│   │   │   ├── deliveryDriverController.ts
│   │   │   ├── hotelController.ts
│   │   │   ├── hotelOrderController.ts
│   │   │   ├── reservationController.ts
│   │   │   ├── loyaltyController.ts
│   │   │   ├── campaignController.ts
│   │   │   ├── staffController.ts
│   │   │   ├── subscriptionController.ts
│   │   │   └── superAdmin/
│   │   │       ├── auditController.ts
│   │   │       ├── gdprController.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT verification
│   │   │   ├── permission.ts      # RBAC middleware
│   │   │   └── rateLimiter.ts
│   │   │
│   │   ├── models/                # 40+ Mongoose schemas
│   │   │   ├── Restaurant.ts
│   │   │   ├── Category.ts
│   │   │   ├── Dish.ts
│   │   │   ├── Order.ts
│   │   │   ├── Delivery.ts
│   │   │   ├── DeliveryDriver.ts
│   │   │   ├── Hotel.ts
│   │   │   ├── Room.ts
│   │   │   ├── HotelGuest.ts
│   │   │   ├── HotelOrder.ts
│   │   │   ├── User.ts
│   │   │   ├── Subscription.ts
│   │   │   ├── SubscriptionPlan.ts
│   │   │   ├── AuditLog.ts
│   │   │   └── ...
│   │   │
│   │   ├── routes/                # API routes
│   │   │   ├── index.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── orderRoutes.ts
│   │   │   ├── deliveryRoutes.ts
│   │   │   ├── hotelRoutes.ts
│   │   │   ├── subscriptionRoutes.ts
│   │   │   ├── superAdminRoutes.ts
│   │   │   └── ...
│   │   │
│   │   ├── services/              # Business logic
│   │   │   ├── orderService.ts
│   │   │   ├── deliveryAssignmentService.ts
│   │   │   ├── deliveryTrackingService.ts
│   │   │   ├── driverEarningsService.ts
│   │   │   ├── hotelService.ts
│   │   │   ├── hotelOrderService.ts
│   │   │   ├── loyaltyService.ts
│   │   │   ├── campaignService.ts
│   │   │   ├── emailService.ts
│   │   │   ├── smsService.ts
│   │   │   ├── stripeConnectService.ts
│   │   │   ├── auditService.ts
│   │   │   ├── gdprService.ts
│   │   │   ├── anomalyDetectionService.ts
│   │   │   ├── downgradeService.ts
│   │   │   ├── subscriptionService.ts
│   │   │   ├── routingService.ts
│   │   │   ├── socketService.ts
│   │   │   └── scheduler.ts
│   │   │
│   │   ├── tests/
│   │   │   ├── auth/
│   │   │   ├── delivery/
│   │   │   ├── hotel/
│   │   │   └── ...
│   │   │
│   │   └── index.ts               # Entry point
│   │
│   ├── scripts/
│   │   ├── seedTestData.ts
│   │   ├── seedHotel.ts
│   │   └── migrations/
│   │
│   └── package.json
│
├── menuqr-app/                    # Frontend Vue.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── menu/
│   │   │   ├── cart/
│   │   │   ├── order/
│   │   │   ├── chat/
│   │   │   └── subscription/
│   │   │
│   │   ├── composables/
│   │   │   ├── useSocket.ts
│   │   │   ├── useChat.ts
│   │   │   ├── useGoogleMaps.ts
│   │   │   ├── useSubscription.ts
│   │   │   └── ...
│   │   │
│   │   ├── layouts/
│   │   │   ├── AdminLayout.vue
│   │   │   ├── DriverLayout.vue
│   │   │   ├── HotelAdminLayout.vue
│   │   │   └── CustomerLayout.vue
│   │   │
│   │   ├── router/
│   │   │   └── index.ts
│   │   │
│   │   ├── services/
│   │   │   └── api.ts             # API client
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   ├── cart.ts
│   │   │   ├── driverAuth.ts
│   │   │   ├── hotelGuestStore.ts
│   │   │   └── subscriptionStore.ts
│   │   │
│   │   ├── views/
│   │   │   ├── admin/             # Restaurant admin
│   │   │   │   ├── DashboardView.vue
│   │   │   │   ├── OrdersView.vue
│   │   │   │   ├── KDSView.vue
│   │   │   │   ├── DeliveryManagementView.vue
│   │   │   │   ├── ReservationsView.vue
│   │   │   │   ├── LoyaltyView.vue
│   │   │   │   ├── CampaignsView.vue
│   │   │   │   ├── StaffView.vue
│   │   │   │   ├── BillingView.vue
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── customer/          # Customer views
│   │   │   │   ├── MenuView.vue
│   │   │   │   ├── CartView.vue
│   │   │   │   ├── DeliveryTrackingView.vue
│   │   │   │   ├── ReservationView.vue
│   │   │   │   ├── LoyaltyView.vue
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── driver/            # Driver app
│   │   │   │   ├── DriverDashboardView.vue
│   │   │   │   ├── DriverDeliveriesView.vue
│   │   │   │   ├── DriverEarningsView.vue
│   │   │   │   ├── DriverProfileView.vue
│   │   │   │   └── DriverLoginView.vue
│   │   │   │
│   │   │   ├── hotel/             # Hotel guest views
│   │   │   │   ├── HotelMenuView.vue
│   │   │   │   ├── HotelCheckoutView.vue
│   │   │   │   └── HotelOrderTrackingView.vue
│   │   │   │
│   │   │   ├── hotel-admin/       # Hotel admin
│   │   │   │   ├── HotelDashboardView.vue
│   │   │   │   ├── RoomsView.vue
│   │   │   │   ├── GuestsView.vue
│   │   │   │   └── HotelOrdersView.vue
│   │   │   │
│   │   │   └── superadmin/        # SuperAdmin panel
│   │   │       ├── DashboardView.vue
│   │   │       ├── RestaurantsView.vue
│   │   │       ├── UsersView.vue
│   │   │       ├── SubscriptionsView.vue
│   │   │       ├── AuditLogsView.vue
│   │   │       ├── SystemMonitoringView.vue
│   │   │       └── ...
│   │   │
│   │   └── main.ts
│   │
│   ├── e2e/                       # Playwright tests
│   └── package.json
│
├── docs/                          # Documentation
│   ├── api/
│   ├── guides/
│   └── deployment/
│
└── docker-compose.yml
```

### 3.2 Modèles de Données Principaux

#### Restaurant

```typescript
interface Restaurant {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  phone: string;
  email: string;
  whatsappNumber?: string;
  openingHours: {
    [day: string]: { open: string; close: string; closed: boolean };
  };
  settings: {
    currency: string;
    timezone: string;
    orderModes: ('dine_in' | 'takeaway' | 'delivery')[];
    autoAcceptOrders: boolean;
    preparationTime: number;
    deliveryRadius: number;
    minimumOrder: number;
  };
  subscription: ObjectId; // ref: Subscription
  ownerId: ObjectId; // ref: User
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Order

```typescript
interface Order {
  _id: ObjectId;
  orderNumber: string; // Auto-generated
  restaurantId: ObjectId;
  customerId?: ObjectId;
  tableId?: ObjectId;
  items: {
    dishId: ObjectId;
    name: string;
    quantity: number;
    price: number;
    options?: { name: string; value: string; price: number }[];
    notes?: string;
  }[];
  orderMode: 'dine_in' | 'takeaway' | 'delivery';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  payment: {
    method: 'cash' | 'card' | 'mobile_money';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    instructions?: string;
    coordinates?: { lat: number; lng: number };
  };
  scheduledFor?: Date;
  estimatedReadyTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Delivery

```typescript
interface Delivery {
  _id: ObjectId;
  deliveryNumber: string;
  orderId: ObjectId;
  restaurantId: ObjectId;
  customerId: ObjectId;
  driverId?: ObjectId;
  status:
    | 'pending'           // Awaiting assignment
    | 'assigned'          // Driver assigned
    | 'accepted'          // Driver accepted
    | 'arriving_restaurant' // On way to pickup
    | 'at_restaurant'     // At restaurant
    | 'picked_up'         // Order collected
    | 'in_transit'        // En route to customer
    | 'arrived'           // At destination
    | 'delivered'         // Completed
    | 'cancelled';
  pickupAddress: Address;
  deliveryAddress: Address;
  estimatedDistance: number; // km
  estimatedDuration: number; // minutes
  actualDuration?: number;
  deliveryFee: number;
  driverEarnings?: number;
  tip?: number;
  isPriority: boolean;
  proofOfDelivery?: {
    photo?: string;
    signature?: string;
    notes?: string;
    timestamp: Date;
  };
  tracking: {
    currentLocation?: { lat: number; lng: number };
    lastUpdated?: Date;
    route?: string; // Encoded polyline
  };
  timeline: {
    status: string;
    timestamp: Date;
    location?: { lat: number; lng: number };
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### DeliveryDriver

```typescript
interface DeliveryDriver {
  _id: ObjectId;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  dateOfBirth?: Date;
  vehicleType: 'bicycle' | 'motorcycle' | 'car' | 'van';
  vehicleDetails?: {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    color: string;
  };
  documents: {
    type: 'id_card' | 'drivers_license' | 'vehicle_registration' | 'insurance';
    url: string;
    verified: boolean;
    expiryDate?: Date;
  }[];
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  isVerified: boolean;
  isOnline: boolean;
  currentLocation?: { lat: number; lng: number };
  workingZones?: string[];
  rating: number;
  totalDeliveries: number;
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  stripeConnectAccountId?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Hotel & Room

```typescript
interface Hotel {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  address: Address;
  phone: string;
  email: string;
  amenities: string[];
  settings: {
    currency: string;
    timezone: string;
    checkInTime: string;
    checkOutTime: string;
    roomServiceHours: { start: string; end: string };
  };
  subscription: ObjectId;
  ownerId: ObjectId;
  isActive: boolean;
  createdAt: Date;
}

interface Room {
  _id: ObjectId;
  hotelId: ObjectId;
  roomNumber: string;
  floor: number;
  type: 'standard' | 'deluxe' | 'suite' | 'presidential';
  capacity: number;
  amenities: string[];
  pricePerNight: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  currentGuest?: ObjectId;
  qrCode: string;
  isActive: boolean;
}

interface HotelGuest {
  _id: ObjectId;
  hotelId: ObjectId;
  roomId: ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  idDocument?: { type: string; number: string };
  checkInDate: Date;
  checkOutDate: Date;
  status: 'reserved' | 'checked_in' | 'checked_out';
  preferences?: string[];
  notes?: string;
}
```

#### Subscription & Plan

```typescript
interface SubscriptionPlan {
  _id: ObjectId;
  name: string;
  slug: 'free' | 'starter' | 'professional' | 'business' | 'enterprise';
  description: string;
  prices: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  limits: {
    dishes: number;
    orders: number;
    users: number;
    campaigns: number;
  };
  features: {
    kds: boolean;
    reservations: boolean;
    delivery: boolean;
    loyalty: boolean;
    campaigns: boolean;
    multiSite: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
  isActive: boolean;
}

interface Subscription {
  _id: ObjectId;
  restaurantId: ObjectId;
  planId: ObjectId;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  usage: {
    dishes: number;
    orders: number;
    users: number;
  };
  pendingChange?: {
    planId: ObjectId;
    effectiveDate: Date;
    reason: string;
  };
  gracePeriod?: {
    startDate: Date;
    endDate: Date;
    reason: string;
  };
}
```

### 3.3 API Endpoints

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register restaurant owner |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |

#### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/orders/:id` | Get order |
| POST | `/api/v1/orders` | Create order |
| PUT | `/api/v1/orders/:id/status` | Update status |
| GET | `/api/v1/orders/stats/daily` | Daily stats |
| GET | `/api/v1/orders/kitchen` | Kitchen orders |

#### Deliveries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/deliveries` | List deliveries |
| GET | `/api/v1/deliveries/:id` | Get delivery |
| POST | `/api/v1/deliveries/:id/assign` | Assign driver |
| PUT | `/api/v1/deliveries/:id/status` | Update status |
| GET | `/api/v1/deliveries/:id/eta` | Get ETA |
| GET | `/api/v1/deliveries/:id/route` | Get route |

#### Driver (Self-Service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/driver/register` | Register driver |
| POST | `/api/v1/driver/login` | Driver login |
| GET | `/api/v1/driver/profile` | Get profile |
| PUT | `/api/v1/driver/profile` | Update profile |
| GET | `/api/v1/driver/deliveries/active` | Active delivery |
| GET | `/api/v1/driver/deliveries` | Delivery history |
| PUT | `/api/v1/driver/status` | Toggle online |
| PUT | `/api/v1/driver/location` | Update location |
| GET | `/api/v1/driver/earnings` | Get earnings |

#### Hotels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/hotels/:id` | Get hotel |
| GET | `/api/v1/hotels/:id/rooms` | List rooms |
| GET | `/api/v1/hotels/:id/menu` | Get menu |
| POST | `/api/v1/hotels/:hotelId/orders` | Create room service order |
| GET | `/api/v1/hotels/:hotelId/orders` | List hotel orders |
| PUT | `/api/v1/hotels/:hotelId/orders/:id/status` | Update order status |
| POST | `/api/v1/hotels/:hotelId/guests` | Check-in guest |

#### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscriptions/plans` | List plans |
| GET | `/api/v1/subscriptions/current` | Current subscription |
| POST | `/api/v1/subscriptions/upgrade` | Upgrade plan |
| POST | `/api/v1/subscriptions/downgrade` | Downgrade plan |
| GET | `/api/v1/subscriptions/usage` | Usage stats |

#### SuperAdmin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/superadmin/restaurants` | All restaurants |
| GET | `/api/v1/superadmin/users` | All users |
| GET | `/api/v1/superadmin/subscriptions` | All subscriptions |
| GET | `/api/v1/superadmin/audit-logs` | Audit logs |
| GET | `/api/v1/superadmin/system/health` | System health |
| GET | `/api/v1/superadmin/analytics` | Platform analytics |

### 3.4 Sécurité

#### RBAC Permissions

```typescript
const PERMISSIONS = {
  // Dishes
  DISHES_VIEW: 'dishes:view',
  DISHES_CREATE: 'dishes:create',
  DISHES_UPDATE: 'dishes:update',
  DISHES_DELETE: 'dishes:delete',

  // Orders
  ORDERS_VIEW: 'orders:view',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_CANCEL: 'orders:cancel',

  // Deliveries
  DELIVERIES_VIEW: 'deliveries:view',
  DELIVERIES_ASSIGN: 'deliveries:assign',
  DELIVERIES_MANAGE: 'deliveries:manage',

  // Staff
  STAFF_VIEW: 'staff:view',
  STAFF_MANAGE: 'staff:manage',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  REPORTS_EXPORT: 'reports:export',
};

const ROLE_PERMISSIONS = {
  owner: Object.values(PERMISSIONS), // All permissions
  manager: [/* Subset */],
  staff: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_UPDATE],
  kitchen: [PERMISSIONS.ORDERS_VIEW],
  delivery_manager: [PERMISSIONS.DELIVERIES_VIEW, PERMISSIONS.DELIVERIES_ASSIGN],
};
```

#### Audit Logging

All sensitive actions are logged:
- Authentication events
- Data modifications (CRUD)
- Permission changes
- Settings updates
- Subscription changes

---

## 4. Annexes

### A. Variables d'Environnement

```bash
# Server
NODE_ENV=production
PORT=3001
API_URL=https://api.menuqr.fr

# Database
MONGODB_URI=mongodb://...

# Auth
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+...

# Google Maps
GOOGLE_MAPS_API_KEY=...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=SG...
EMAIL_FROM=noreply@menuqr.fr

# Sentry
SENTRY_DSN=https://...
```

### B. Commandes de Développement

```bash
# Backend
cd menuqr-api
npm run dev          # Development server
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # ESLint

# Frontend
cd menuqr-app
npm run dev          # Vite dev server
npm run build        # Production build
npm run type-check   # Vue-tsc
npm run test:run     # Vitest
npm run test:e2e     # Playwright

# Docker
docker-compose up -d              # Start all services
docker-compose logs -f api        # View API logs
```

### C. Roadmap

#### Completed (v3.0)

- [x] Core restaurant management (Menu, Orders, KDS)
- [x] Customer experience (Cart, Checkout, Reservations)
- [x] Delivery management with driver app
- [x] Hotel room service module
- [x] Marketing & campaigns
- [x] SuperAdmin panel
- [x] Security & compliance (RBAC, Audit, GDPR)
- [x] Subscription & billing

#### Future (v4.0+)

- [ ] Mobile apps (React Native)
- [ ] Multi-language menus
- [ ] AI-powered recommendations
- [ ] Advanced analytics & BI
- [ ] Franchise management
- [ ] Marketplace integration
- [ ] Voice ordering (Alexa/Google)

---

*— Fin du Document —*

**MenuQR v3.0** • Documentation Janvier 2025
