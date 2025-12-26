import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAdminAuthStore } from '@/stores/adminAuth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Restaurants',
    component: () => import('@/views/RestaurantsView.vue'),
    meta: {
      title: 'Restaurants',
    },
  },
  {
    path: '/menu',
    redirect: '/',
  },

  // Admin routes
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
    ],
  },
  {
    path: '/r/:slug',
    name: 'RestaurantMenu',
    component: () => import('@/views/MenuView.vue'),
    props: true,
    meta: {
      title: 'Menu',
    },
  },
  {
    path: '/r/:slug/table/:tableNumber',
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
    path: '/cart',
    name: 'Cart',
    component: () => import('@/views/CartView.vue'),
    meta: {
      title: 'Votre commande',
    },
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: {
      title: 'Finaliser la commande',
    },
  },
  // Customer routes
  {
    path: '/orders',
    name: 'CustomerOrders',
    component: () => import('@/views/customer/OrderHistoryView.vue'),
    meta: {
      title: 'Mes commandes',
    },
  },
  {
    path: '/reviews',
    name: 'CustomerReviews',
    component: () => import('@/views/customer/ReviewsView.vue'),
    meta: {
      title: 'Avis clients',
    },
  },
  {
    path: '/favorites',
    name: 'CustomerFavorites',
    component: () => import('@/views/customer/FavoritesView.vue'),
    meta: {
      title: 'Mes favoris',
    },
  },
  {
    path: '/loyalty',
    name: 'CustomerLoyalty',
    component: () => import('@/views/customer/LoyaltyView.vue'),
    meta: {
      title: 'Ma fidélité',
    },
  },
  {
    path: '/reserve',
    name: 'Reserve',
    component: () => import('@/views/customer/ReservationView.vue'),
    meta: {
      title: 'Réserver une table',
    },
  },
  {
    path: '/reservations',
    name: 'MyReservations',
    component: () => import('@/views/customer/MyReservationsView.vue'),
    meta: {
      title: 'Mes réservations',
    },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/AboutView.vue'),
    meta: {
      title: 'À propos',
    },
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('@/views/ContactView.vue'),
    meta: {
      title: 'Contact',
    },
  },
  {
    path: '/install',
    name: 'Install',
    component: () => import('@/views/InstallView.vue'),
    meta: {
      title: "Installer l'application",
    },
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('@/views/HelpView.vue'),
    meta: {
      title: 'Aide',
    },
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/views/TermsView.vue'),
    meta: {
      title: "Conditions d'utilisation",
    },
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/views/PrivacyView.vue'),
    meta: {
      title: 'Politique de confidentialité',
    },
  },
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
router.beforeEach((to, _from, next) => {
  const authStore = useAdminAuthStore();

  // Set page title
  const title = to.meta.title as string | undefined;
  if (title) {
    document.title = `${title} | MenuQR`;
  } else {
    document.title = 'MenuQR';
  }

  // Check if route requires authentication
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      next({
        path: '/admin/login',
        query: { redirect: to.fullPath },
      });
      return;
    }
  }

  // Redirect authenticated users away from guest-only pages (login)
  if (to.matched.some((record) => record.meta.guest)) {
    if (authStore.isAuthenticated) {
      next({ path: '/admin' });
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
