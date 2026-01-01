import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAdminAuthStore } from '@/stores/adminAuth';
import { useSuperAdminAuthStore } from '@/stores/superAdminAuth';

const routes: RouteRecordRaw[] = [
  // ============================================
  // Client Routes (with ClientLayout)
  // ============================================
  {
    path: '/',
    component: () => import('@/layouts/ClientLayout.vue'),
    children: [
      {
        path: '',
        name: 'Restaurants',
        component: () => import('@/views/RestaurantsView.vue'),
        meta: {
          title: 'Restaurants',
        },
      },
      {
        path: 'r/:slug',
        name: 'RestaurantMenu',
        component: () => import('@/views/MenuView.vue'),
        props: true,
        meta: {
          title: 'Menu',
        },
      },
      {
        path: 'r/:slug/table/:tableNumber',
        name: 'TableMenu',
        component: () => import('@/views/MenuView.vue'),
        props: (route) => ({
          slug: route.params.slug,
          tableNumber: parseInt(route.params.tableNumber as string, 10),
        }),
        meta: {
          title: 'Menu',
        },
      },
      {
        path: 'cart',
        name: 'Cart',
        component: () => import('@/views/CartView.vue'),
        meta: {
          title: 'Votre commande',
        },
      },
      {
        path: 'checkout',
        name: 'Checkout',
        component: () => import('@/views/CheckoutView.vue'),
        meta: {
          title: 'Finaliser la commande',
        },
      },
      // Customer routes
      {
        path: 'orders',
        name: 'CustomerOrders',
        component: () => import('@/views/customer/OrderHistoryView.vue'),
        meta: {
          title: 'Mes commandes',
        },
      },
      {
        path: 'reviews',
        name: 'CustomerReviews',
        component: () => import('@/views/customer/ReviewsView.vue'),
        meta: {
          title: 'Avis clients',
        },
      },
      {
        path: 'favorites',
        name: 'CustomerFavorites',
        component: () => import('@/views/customer/FavoritesView.vue'),
        meta: {
          title: 'Mes favoris',
        },
      },
      {
        path: 'loyalty',
        name: 'CustomerLoyalty',
        component: () => import('@/views/customer/LoyaltyView.vue'),
        meta: {
          title: 'Ma fidélité',
        },
      },
      {
        path: 'reserve',
        name: 'Reserve',
        component: () => import('@/views/customer/ReservationView.vue'),
        meta: {
          title: 'Réserver une table',
        },
      },
      {
        path: 'reservations',
        name: 'MyReservations',
        component: () => import('@/views/customer/MyReservationsView.vue'),
        meta: {
          title: 'Mes réservations',
        },
      },
      {
        path: 'track/:orderId',
        name: 'DeliveryTracking',
        component: () => import('@/views/customer/DeliveryTrackingView.vue'),
        props: true,
        meta: {
          title: 'Suivi de livraison',
        },
      },
      // Info pages
      {
        path: 'about',
        name: 'About',
        component: () => import('@/views/AboutView.vue'),
        meta: {
          title: 'À propos',
        },
      },
      {
        path: 'contact',
        name: 'Contact',
        component: () => import('@/views/ContactView.vue'),
        meta: {
          title: 'Contact',
        },
      },
      {
        path: 'install',
        name: 'Install',
        component: () => import('@/views/InstallView.vue'),
        meta: {
          title: "Installer l'application",
        },
      },
      {
        path: 'help',
        name: 'Help',
        component: () => import('@/views/HelpView.vue'),
        meta: {
          title: 'Aide',
        },
      },
      {
        path: 'terms',
        name: 'Terms',
        component: () => import('@/views/TermsView.vue'),
        meta: {
          title: "Conditions d'utilisation",
        },
      },
      {
        path: 'privacy',
        name: 'Privacy',
        component: () => import('@/views/PrivacyView.vue'),
        meta: {
          title: 'Politique de confidentialité',
        },
      },
    ],
  },

  // Legacy redirect
  {
    path: '/menu',
    redirect: '/',
  },

  // ============================================
  // Marketing Pages (standalone, no layout)
  // ============================================
  {
    path: '/landing',
    name: 'Landing',
    component: () => import('@/views/marketing/LandingPage.vue'),
    meta: {
      title: 'MenuQR - Digitalisez votre restaurant',
    },
  },
  {
    path: '/pitch',
    name: 'PitchDeck',
    component: () => import('@/views/marketing/PitchDeck.vue'),
    meta: {
      title: 'MenuQR - Présentation',
    },
  },
  {
    path: '/flyer',
    name: 'PrintableFlyer',
    component: () => import('@/views/marketing/PrintableFlyer.vue'),
    meta: {
      title: 'MenuQR - Flyer imprimable',
    },
  },

  // ============================================
  // Admin Routes
  // ============================================
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/admin/LoginView.vue'),
    meta: {
      title: 'Connexion Admin',
      guest: true,
    },
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: {
          title: 'Dashboard',
        },
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: () => import('@/views/admin/OrdersView.vue'),
        meta: {
          title: 'Commandes',
        },
      },
      {
        path: 'deliveries',
        name: 'AdminDeliveries',
        component: () => import('@/views/admin/DeliveryManagementView.vue'),
        meta: {
          title: 'Livraisons',
        },
      },
      {
        path: 'delivery-batching',
        name: 'AdminDeliveryBatching',
        component: () => import('@/views/admin/DeliveryBatchingView.vue'),
        meta: {
          title: 'Lots de livraison',
        },
      },
      {
        path: 'drivers',
        name: 'AdminDrivers',
        component: () => import('@/views/admin/DriverManagementView.vue'),
        meta: {
          title: 'Livreurs',
        },
      },
      {
        path: 'dishes',
        name: 'AdminDishes',
        component: () => import('@/views/admin/DishesView.vue'),
        meta: {
          title: 'Menu',
        },
      },
      {
        path: 'categories',
        name: 'AdminCategories',
        component: () => import('@/views/admin/CategoriesView.vue'),
        meta: {
          title: 'Catégories',
        },
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('@/views/admin/SettingsView.vue'),
        meta: {
          title: 'Paramètres',
        },
      },
      {
        path: 'campaigns',
        name: 'AdminCampaigns',
        component: () => import('@/views/admin/CampaignsView.vue'),
        meta: {
          title: 'Campagnes SMS',
        },
      },
      {
        path: 'pricing',
        name: 'AdminPricing',
        component: () => import('@/views/admin/PricingView.vue'),
        meta: {
          title: 'Abonnements',
        },
      },
      {
        path: 'loyalty',
        name: 'AdminLoyalty',
        component: () => import('@/views/admin/LoyaltyView.vue'),
        meta: {
          title: 'Programme Fidélité',
        },
      },
      {
        path: 'reservations',
        name: 'AdminReservations',
        component: () => import('@/views/admin/ReservationsView.vue'),
        meta: {
          title: 'Réservations',
        },
      },
      {
        path: 'tables',
        name: 'AdminTables',
        component: () => import('@/views/admin/TablesView.vue'),
        meta: {
          title: 'Tables',
        },
      },
      {
        path: 'reviews',
        name: 'AdminReviews',
        component: () => import('@/views/admin/ReviewsView.vue'),
        meta: {
          title: 'Avis Clients',
        },
      },
      {
        path: 'kds',
        name: 'AdminKDS',
        component: () => import('@/views/admin/KDSView.vue'),
        meta: {
          title: 'Cuisine (KDS)',
        },
      },
      {
        path: 'staff',
        name: 'AdminStaff',
        component: () => import('@/views/admin/StaffView.vue'),
        meta: {
          title: 'Personnel',
        },
      },
      {
        path: 'billing',
        name: 'billing',
        component: () => import('@/views/admin/BillingView.vue'),
        meta: {
          title: 'Abonnement & Facturation',
        },
      },
    ],
  },

  // ============================================
  // Super Admin Routes
  // ============================================
  {
    path: '/super-admin/login',
    name: 'SuperAdminLogin',
    component: () => import('@/views/superadmin/LoginView.vue'),
    meta: {
      title: 'Super Admin - Connexion',
      superAdminGuest: true,
    },
  },
  {
    path: '/super-admin',
    component: () => import('@/layouts/SuperAdminLayout.vue'),
    meta: {
      requiresSuperAdmin: true,
    },
    children: [
      {
        path: '',
        name: 'SuperAdminDashboard',
        component: () => import('@/views/superadmin/DashboardView.vue'),
        meta: {
          title: 'Super Admin - Dashboard',
        },
      },
      {
        path: 'restaurants',
        name: 'SuperAdminRestaurants',
        component: () => import('@/views/superadmin/RestaurantsView.vue'),
        meta: {
          title: 'Super Admin - Restaurants',
        },
      },
      {
        path: 'restaurants/:id',
        name: 'SuperAdminRestaurantDetails',
        component: () => import('@/views/superadmin/RestaurantDetailsView.vue'),
        props: true,
        meta: {
          title: 'Super Admin - Details Restaurant',
        },
      },
      {
        path: 'users',
        name: 'SuperAdminUsers',
        component: () => import('@/views/superadmin/UsersView.vue'),
        meta: {
          title: 'Super Admin - Utilisateurs',
        },
      },
      {
        path: 'subscription-plans',
        name: 'SuperAdminSubscriptionPlans',
        component: () => import('@/views/superadmin/SubscriptionPlansView.vue'),
        meta: {
          title: 'Super Admin - Plans',
        },
      },
      {
        path: 'subscriptions',
        name: 'SuperAdminSubscriptions',
        component: () => import('@/views/superadmin/SubscriptionsView.vue'),
        meta: {
          title: 'Super Admin - Abonnements',
        },
      },
      {
        path: 'invoices',
        name: 'SuperAdminInvoices',
        component: () => import('@/views/superadmin/InvoicesView.vue'),
        meta: {
          title: 'Super Admin - Factures',
        },
      },
      {
        path: 'analytics',
        name: 'SuperAdminAnalytics',
        component: () => import('@/views/superadmin/AnalyticsView.vue'),
        meta: {
          title: 'Super Admin - Analytics',
        },
      },
      {
        path: 'settings',
        name: 'SuperAdminSettings',
        component: () => import('@/views/superadmin/SettingsView.vue'),
        meta: {
          title: 'Super Admin - Parametres',
        },
      },
      {
        path: 'notifications',
        name: 'SuperAdminNotifications',
        component: () => import('@/views/superadmin/NotificationsView.vue'),
        meta: {
          title: 'Super Admin - Notifications',
        },
      },
      {
        path: 'reports',
        name: 'SuperAdminReports',
        component: () => import('@/views/superadmin/ReportsView.vue'),
        meta: {
          title: 'Super Admin - Rapports',
        },
      },
      {
        path: 'audit-logs',
        name: 'SuperAdminAuditLogs',
        component: () => import('@/views/superadmin/AuditLogsView.vue'),
        meta: {
          title: 'Super Admin - Journal d\'activité',
        },
      },
      {
        path: 'login-history',
        name: 'SuperAdminLoginHistory',
        component: () => import('@/views/superadmin/LoginHistoryView.vue'),
        meta: {
          title: 'Super Admin - Connexions',
        },
      },
      {
        path: 'alerts',
        name: 'SuperAdminAlerts',
        component: () => import('@/views/superadmin/SystemAlertsView.vue'),
        meta: {
          title: 'Super Admin - Alertes système',
        },
      },
      {
        path: 'tools',
        name: 'SuperAdminTools',
        component: () => import('@/views/superadmin/AdvancedToolsView.vue'),
        meta: {
          title: 'Super Admin - Outils Avances',
        },
      },
      {
        path: 'monitoring',
        name: 'SuperAdminMonitoring',
        component: () => import('@/views/superadmin/SystemMonitoringView.vue'),
        meta: {
          title: 'Super Admin - Monitoring Systeme',
        },
      },
    ],
  },

  // ============================================
  // Driver Routes
  // ============================================
  {
    path: '/driver/login',
    name: 'DriverLogin',
    component: () => import('@/views/driver/DriverLoginView.vue'),
    meta: {
      title: 'Connexion Livreur',
    },
  },
  {
    path: '/driver/register',
    name: 'DriverRegister',
    component: () => import('@/views/driver/DriverRegistrationView.vue'),
    meta: {
      title: 'Devenir Livreur',
    },
  },
  {
    path: '/driver',
    component: () => import('@/layouts/DriverLayout.vue'),
    meta: {
      requiresDriverAuth: true,
    },
    children: [
      {
        path: '',
        name: 'DriverDashboard',
        component: () => import('@/views/driver/DriverDashboardView.vue'),
        meta: {
          title: 'Tableau de bord',
        },
      },
      {
        path: 'deliveries',
        name: 'DriverDeliveries',
        component: () => import('@/views/driver/DriverDeliveriesView.vue'),
        meta: {
          title: 'Mes Livraisons',
        },
      },
      {
        path: 'earnings',
        name: 'DriverEarnings',
        component: () => import('@/views/driver/DriverEarningsView.vue'),
        meta: {
          title: 'Mes Gains',
        },
      },
      {
        path: 'profile',
        name: 'DriverProfile',
        component: () => import('@/views/driver/DriverProfileView.vue'),
        meta: {
          title: 'Mon Profil',
        },
      },
      {
        path: 'delivery/:id',
        name: 'DriverDeliveryDetail',
        component: () => import('@/views/driver/DriverDeliveryDetailView.vue'),
        props: true,
        meta: {
          title: 'Detail Livraison',
        },
      },
    ],
  },

  // ============================================
  // Hotel Guest Routes (Room Service)
  // ============================================
  // QR Code landing page (from room QR scan)
  {
    path: '/hotel/qr/:qrCode',
    name: 'hotel-qr',
    component: () => import('@/views/hotel/HotelQRLandingView.vue'),
    props: true,
    meta: {
      title: 'Room Service',
    },
  },
  // Hotel landing page (by slug)
  {
    path: '/hotel/:hotelSlug',
    name: 'hotel-landing',
    component: () => import('@/views/hotel/HotelQRLandingView.vue'),
    props: true,
    meta: {
      title: 'Room Service',
    },
  },
  // Hotel guest authentication
  {
    path: '/hotel/:hotelSlug/auth',
    name: 'hotel-auth',
    component: () => import('@/views/hotel/HotelGuestAuthView.vue'),
    props: true,
    meta: {
      title: 'Connexion',
    },
  },
  // Hotel menu
  {
    path: '/hotel/:hotelSlug/menu',
    name: 'hotel-menu',
    component: () => import('@/views/hotel/HotelMenuView.vue'),
    props: true,
    meta: {
      title: 'Menu',
    },
  },
  // Hotel cart
  {
    path: '/hotel/:hotelSlug/cart',
    name: 'hotel-cart',
    component: () => import('@/views/hotel/HotelCartView.vue'),
    props: true,
    meta: {
      title: 'Panier',
    },
  },
  // Hotel checkout
  {
    path: '/hotel/:hotelSlug/checkout',
    name: 'hotel-checkout',
    component: () => import('@/views/hotel/HotelCheckoutView.vue'),
    props: true,
    meta: {
      title: 'Finaliser la commande',
    },
  },
  // Hotel orders history
  {
    path: '/hotel/:hotelSlug/orders',
    name: 'hotel-orders',
    component: () => import('@/views/hotel/HotelOrdersView.vue'),
    props: true,
    meta: {
      title: 'Mes commandes',
    },
  },
  // Hotel order tracking
  {
    path: '/hotel/:hotelSlug/order/:orderId',
    name: 'hotel-order-tracking',
    component: () => import('@/views/hotel/HotelOrderTrackingView.vue'),
    props: true,
    meta: {
      title: 'Suivi de commande',
    },
  },

  // ============================================
  // Hotel Admin Routes
  // ============================================
  {
    path: '/hotel-admin',
    component: () => import('@/layouts/HotelAdminLayout.vue'),
    meta: {
      requiresAuth: true,
      requiresHotelRole: true,
    },
    children: [
      {
        path: '',
        name: 'HotelDashboard',
        component: () => import('@/views/hotel-admin/HotelDashboardView.vue'),
        meta: {
          title: 'Tableau de bord - Hotel',
        },
      },
      {
        path: 'rooms',
        name: 'HotelRooms',
        component: () => import('@/views/hotel-admin/HotelRoomsView.vue'),
        meta: {
          title: 'Chambres - Hotel',
        },
      },
      {
        path: 'guests',
        name: 'HotelGuests',
        component: () => import('@/views/hotel-admin/HotelGuestsView.vue'),
        meta: {
          title: 'Clients - Hotel',
        },
      },
      {
        path: 'orders',
        name: 'HotelOrdersAdmin',
        component: () => import('@/views/hotel-admin/HotelOrdersAdminView.vue'),
        meta: {
          title: 'Commandes - Hotel',
        },
      },
      {
        path: 'kds',
        name: 'HotelKDS',
        component: () => import('@/views/hotel-admin/HotelKDSView.vue'),
        meta: {
          title: 'Cuisine (KDS) - Hotel',
        },
      },
      {
        path: 'menus',
        name: 'HotelMenus',
        component: () => import('@/views/hotel-admin/HotelMenusView.vue'),
        meta: {
          title: 'Menus - Hotel',
        },
      },
      {
        path: 'dishes',
        name: 'HotelDishes',
        component: () => import('@/views/hotel-admin/HotelMenusView.vue'),
        meta: {
          title: 'Plats - Hotel',
        },
      },
      {
        path: 'qr-codes',
        name: 'HotelQRCodes',
        component: () => import('@/views/hotel-admin/HotelRoomsView.vue'),
        meta: {
          title: 'QR Codes - Hotel',
        },
      },
      {
        path: 'reports',
        name: 'HotelReports',
        component: () => import('@/views/hotel-admin/HotelDashboardView.vue'),
        meta: {
          title: 'Rapports - Hotel',
        },
      },
      {
        path: 'staff',
        name: 'HotelStaff',
        component: () => import('@/views/admin/StaffView.vue'),
        meta: {
          title: 'Personnel - Hotel',
        },
      },
      {
        path: 'settings',
        name: 'HotelSettings',
        component: () => import('@/views/hotel-admin/HotelSettingsView.vue'),
        meta: {
          title: 'Parametres - Hotel',
        },
      },
    ],
  },

  // ============================================
  // 404 Not Found
  // ============================================
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Page introuvable',
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  },
});

// Navigation guard for auth and title
router.beforeEach(async (to, _from, next) => {
  const authStore = useAdminAuthStore();
  const superAdminStore = useSuperAdminAuthStore();
  // Lazy import driver store only when needed for driver routes
  const isDriverRoute = to.matched.some((record) => record.meta.requiresDriverAuth);

  // Set page title
  const title = to.meta.title as string | undefined;
  if (title) {
    document.title = `${title} | MenuQR`;
  } else {
    document.title = 'MenuQR';
  }

  // Check if route requires admin authentication
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    // If has local token but not validated, validate with backend
    if (authStore.isAuthenticated && !authStore.isSessionValidated) {
      const isValid = await authStore.validateSession();
      if (!isValid) {
        next({
          path: '/admin/login',
          query: { redirect: to.fullPath },
        });
        return;
      }
    } else if (!authStore.isAuthenticated) {
      next({
        path: '/admin/login',
        query: { redirect: to.fullPath },
      });
      return;
    }

    // Check if password is expired (redirect to settings to change it)
    if (authStore.isPasswordExpired && to.name !== 'AdminSettings') {
      next({ path: '/admin/settings', query: { passwordExpired: 'true' } });
      return;
    }

    // Check if route requires hotel role
    if (to.matched.some((record) => record.meta.requiresHotelRole)) {
      const hotelRoles = ['hotel_owner', 'hotel_manager', 'reception', 'room_service', 'hotel_kitchen'];
      const userRole = authStore.user?.role;
      if (!userRole || !hotelRoles.includes(userRole)) {
        // Redirect to admin dashboard if not a hotel user
        next({ path: '/admin' });
        return;
      }
    }
  }

  // Check if route requires super admin authentication
  if (to.matched.some((record) => record.meta.requiresSuperAdmin)) {
    // If has local token but not validated, validate with backend
    if (superAdminStore.isAuthenticated && !superAdminStore.isSessionValidated) {
      const isValid = await superAdminStore.validateSession();
      if (!isValid) {
        next({
          path: '/super-admin/login',
          query: { redirect: to.fullPath },
        });
        return;
      }
    } else if (!superAdminStore.isAuthenticated) {
      next({
        path: '/super-admin/login',
        query: { redirect: to.fullPath },
      });
      return;
    }
  }

  // Check if route requires driver authentication
  if (isDriverRoute) {
    const { useDriverAuthStore } = await import('@/stores/driverAuth');
    const driverStore = useDriverAuthStore();

    if (!driverStore.isAuthenticated) {
      // Try to fetch profile if token exists
      const hasToken = localStorage.getItem('driver_token');
      if (hasToken) {
        await driverStore.fetchProfile();
      }

      if (!driverStore.isAuthenticated) {
        next({
          path: '/driver/login',
          query: { redirect: to.fullPath },
        });
        return;
      }
    }
  }

  // Redirect authenticated admin users away from guest-only pages (login)
  if (to.matched.some((record) => record.meta.guest)) {
    if (authStore.isAuthenticated) {
      next({ path: '/admin' });
      return;
    }
  }

  // Redirect authenticated super admin users away from super admin login
  if (to.matched.some((record) => record.meta.superAdminGuest)) {
    if (superAdminStore.isAuthenticated) {
      next({ path: '/super-admin' });
      return;
    }
  }

  next();
});

// Prefetch likely navigation targets after initial load
router.isReady().then(() => {
  // Use requestIdleCallback to prefetch when browser is idle
  const prefetchRoutes = () => {
    // Prefetch cart page (likely next navigation from menu)
    const cartChunk = () => import('@/views/CartView.vue');
    const checkoutChunk = () => import('@/views/CheckoutView.vue');

    // Execute during idle time
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          cartChunk();
        },
        { timeout: 2000 }
      );

      window.requestIdleCallback(
        () => {
          checkoutChunk();
        },
        { timeout: 3000 }
      );
    } else {
      // Fallback for Safari
      setTimeout(cartChunk, 2000);
      setTimeout(checkoutChunk, 3000);
    }
  };

  // Wait a bit after initial load
  setTimeout(prefetchRoutes, 1000);
});

export default router;
