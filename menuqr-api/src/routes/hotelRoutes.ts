import { Router } from 'express';
import {
  authenticate,
  authorize,
  authenticateGuest,
  optionalGuestAuth,
  authenticateUserOrGuest,
} from '../middleware/auth.js';
import { requireFeature } from '../middleware/feature.js';
import { FEATURES } from '../config/features.js';
import * as hotelController from '../controllers/hotelController.js';
import * as roomController from '../controllers/hotelRoomController.js';
import * as guestController from '../controllers/hotelGuestController.js';
import * as menuController from '../controllers/hotelMenuController.js';
import * as orderController from '../controllers/hotelOrderController.js';

const router = Router();

// Feature middleware for hotel admin routes
const hotelFeature = requireFeature(FEATURES.HOTEL_MODULE);

// ============================================
// Public Routes
// ============================================

// Get hotel by slug (public)
router.get('/slug/:slug', hotelController.getHotelBySlug);

// Get room by QR code (public - for guest app)
router.get('/rooms/qr/:qrCode', roomController.getRoomByQRCode);

// ============================================
// Guest Authentication Routes
// ============================================

// Guest login with access code
router.post('/:hotelId/guest/auth/access-code', guestController.authenticateWithAccessCode);

// Guest login with PIN
router.post('/:hotelId/guest/auth/pin', guestController.authenticateWithPIN);

// Refresh guest token
router.post('/guest/auth/refresh', guestController.refreshToken);

// ============================================
// Guest Profile Routes (Authenticated Guest)
// ============================================

// Set PIN (first-time setup)
router.post('/guest/auth/set-pin', authenticateGuest, guestController.setGuestPIN);

// Get my profile
router.get('/guest/me', authenticateGuest, guestController.getMyProfile);

// Update preferences
router.patch('/guest/me/preferences', authenticateGuest, guestController.updateMyPreferences);

// Get my order history
router.get('/guest/me/orders', authenticateGuest, guestController.getMyOrderHistory);

// Get my active orders
router.get('/guest/orders', authenticateGuest, orderController.getGuestOrders);

// ============================================
// Guest Menu Routes (Public/Guest)
// ============================================

// Get menus for hotel (public)
router.get('/:hotelId/menus', menuController.getMenusByHotel);

// Get menu for guest (full menu display)
router.get('/:hotelId/menus/:menuId/guest', menuController.getMenuForGuest);

// Get categories by menu
router.get('/:hotelId/menus/:menuId/categories', menuController.getCategoriesByMenu);

// Get dishes by category
router.get('/:hotelId/menus/:menuId/categories/:categoryId/dishes', menuController.getDishesByCategory);

// Get dish by ID
router.get('/:hotelId/dishes/:dishId', menuController.getDishById);

// Search dishes
router.get('/:hotelId/dishes/search', menuController.searchDishes);

// Get popular dishes
router.get('/:hotelId/dishes/popular', menuController.getPopularDishes);

// Get featured dishes
router.get('/:hotelId/dishes/featured', menuController.getFeaturedDishes);

// ============================================
// Guest Order Routes
// ============================================

// Create order (guest or staff)
router.post('/:hotelId/orders', optionalGuestAuth, orderController.createOrder);

// IMPORTANT: Specific routes must come BEFORE parameterized :orderId routes
// Get kitchen orders (staff)
router.get(
  '/:hotelId/orders/kitchen',
  authenticate,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  orderController.getKitchenOrders
);

// Get ready orders (for room service)
router.get(
  '/:hotelId/orders/ready',
  authenticate,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'room_service', 'concierge'),
  orderController.getReadyOrders
);

// Get my active orders (staff)
router.get(
  '/:hotelId/orders/my-active',
  authenticate,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'room_service', 'concierge'),
  orderController.getMyActiveOrders
);

// Get order stats
router.get(
  '/:hotelId/orders/stats',
  authenticate,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  orderController.getOrderStats
);

// Create order as staff
router.post(
  '/:hotelId/orders/staff',
  authenticate,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception', 'room_service', 'concierge'),
  orderController.createOrderAsStaff
);

// Get order by ID (guest or staff) - MUST come after specific routes
router.get('/:hotelId/orders/:orderId', authenticateUserOrGuest, orderController.getOrderById);

// Cancel order (guest or staff)
router.post('/:hotelId/orders/:orderId/cancel', authenticateUserOrGuest, orderController.cancelOrder);

// Rate order (guest only)
router.post('/:hotelId/orders/:orderId/rate', authenticateGuest, orderController.addOrderRating);

// ============================================
// Hotel Admin Routes (Authenticated Staff)
// ============================================

// Create hotel
router.post('/', authenticate, hotelFeature, authorize('superadmin', 'hotel_owner'), hotelController.createHotel);

// Get my hotel
router.get('/me', authenticate, hotelFeature, hotelController.getMyHotel);

// Get hotel by ID
router.get('/:id', authenticate, hotelFeature, hotelController.getHotelById);

// Update hotel
router.put(
  '/:id',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  hotelController.updateHotel
);

// Update hotel settings
router.patch(
  '/:id/settings',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  hotelController.updateHotelSettings
);

// Delete hotel
router.delete(
  '/:id',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner'),
  hotelController.deleteHotel
);

// Get hotel stats
router.get(
  '/:id/stats',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  hotelController.getHotelStats
);

// Get revenue analytics
router.get(
  '/:id/analytics/revenue',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  hotelController.getRevenueAnalytics
);

// Get active menus (summary)
router.get('/:id/menus/active', authenticate, hotelFeature, hotelController.getActiveMenus);

// ============================================
// Hotel Staff Management
// ============================================

// Get hotel staff
router.get(
  '/:id/staff',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  hotelController.getHotelStaff
);

// Assign staff to hotel
router.post(
  '/:id/staff',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  hotelController.assignStaffToHotel
);

// Remove staff from hotel
router.delete(
  '/:id/staff/:userId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner'),
  hotelController.removeStaffFromHotel
);

// ============================================
// Room Management Routes
// ============================================

// Get room status summary
router.get(
  '/:hotelId/rooms/status-summary',
  authenticate,
  hotelFeature,
  roomController.getRoomStatusSummary
);

// Get rooms requiring attention
router.get(
  '/:hotelId/rooms/attention',
  authenticate,
  hotelFeature,
  roomController.getRoomsRequiringAttention
);

// Create room
router.post(
  '/:hotelId/rooms',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  roomController.createRoom
);

// Bulk create rooms
router.post(
  '/:hotelId/rooms/bulk',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  roomController.bulkCreateRooms
);

// Get rooms by hotel
router.get('/:hotelId/rooms', authenticate, hotelFeature, roomController.getRoomsByHotel);

// Get room by ID
router.get('/:hotelId/rooms/:roomId', authenticate, hotelFeature, roomController.getRoomById);

// Update room
router.put(
  '/:hotelId/rooms/:roomId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception'),
  roomController.updateRoom
);

// Delete room
router.delete(
  '/:hotelId/rooms/:roomId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  roomController.deleteRoom
);

// Update room status
router.patch(
  '/:hotelId/rooms/:roomId/status',
  authenticate,
  hotelFeature,
  roomController.updateRoomStatus
);

// Mark room as cleaned
router.post(
  '/:hotelId/rooms/:roomId/cleaned',
  authenticate,
  hotelFeature,
  roomController.markRoomCleaned
);

// Check in guest to room
router.post(
  '/:hotelId/rooms/:roomId/check-in',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception'),
  roomController.checkInGuest
);

// Check out guest from room
router.post(
  '/:hotelId/rooms/:roomId/check-out',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception'),
  roomController.checkOutGuest
);

// Regenerate QR code
router.post(
  '/:hotelId/rooms/:roomId/regenerate-qr',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  roomController.regenerateQRCode
);

// Get orders by room
router.get(
  '/:hotelId/rooms/:roomId/orders',
  authenticate,
  hotelFeature,
  orderController.getOrdersByRoom
);

// Get current guest for room
router.get(
  '/:hotelId/rooms/:roomId/guest',
  authenticate,
  hotelFeature,
  guestController.getCurrentGuestForRoom
);

// ============================================
// Guest Management Routes (Staff)
// ============================================

// Register guest
router.post(
  '/:hotelId/guests',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception'),
  guestController.registerGuest
);

// Get guests by hotel
router.get('/:hotelId/guests', authenticate, hotelFeature, guestController.getGuestsByHotel);

// Get guest by ID
router.get('/:hotelId/guests/:guestId', authenticate, hotelFeature, guestController.getGuestById);

// Update guest
router.put(
  '/:hotelId/guests/:guestId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception'),
  guestController.updateGuest
);

// Check out guest
router.post(
  '/:hotelId/guests/:guestId/check-out',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception'),
  guestController.checkOutGuest
);

// Transfer guest to another room
router.post(
  '/:hotelId/guests/:guestId/transfer',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'reception'),
  guestController.transferGuest
);

// ============================================
// Menu Management Routes (Staff)
// ============================================

// Create menu
router.post(
  '/:hotelId/menus',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  menuController.createMenu
);

// Get menu by ID
router.get('/:hotelId/menus/:menuId', authenticate, hotelFeature, menuController.getMenuById);

// Update menu
router.put(
  '/:hotelId/menus/:menuId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  menuController.updateMenu
);

// Delete menu
router.delete(
  '/:hotelId/menus/:menuId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  menuController.deleteMenu
);

// Link menu to restaurant
router.post(
  '/:hotelId/menus/:menuId/link-restaurant',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  menuController.linkMenuToRestaurant
);

// Sync menu from restaurant
router.post(
  '/:hotelId/menus/:menuId/sync',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  menuController.syncFromRestaurant
);

// ============================================
// Category Management Routes (Staff)
// ============================================

// Create category
router.post(
  '/:hotelId/menus/:menuId/categories',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  menuController.createCategory
);

// Update category
router.put(
  '/:hotelId/menus/:menuId/categories/:categoryId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  menuController.updateCategory
);

// Delete category
router.delete(
  '/:hotelId/menus/:menuId/categories/:categoryId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  menuController.deleteCategory
);

// Reorder categories
router.post(
  '/:hotelId/menus/:menuId/categories/reorder',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  menuController.reorderCategories
);

// ============================================
// Dish Management Routes (Staff)
// ============================================

// Create dish
router.post(
  '/:hotelId/menus/:menuId/categories/:categoryId/dishes',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  menuController.createDish
);

// Update dish
router.put(
  '/:hotelId/dishes/:dishId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  menuController.updateDish
);

// Delete dish
router.delete(
  '/:hotelId/dishes/:dishId',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  menuController.deleteDish
);

// Update dish availability
router.patch(
  '/:hotelId/dishes/:dishId/availability',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  menuController.updateDishAvailability
);

// Reorder dishes
router.post(
  '/:hotelId/menus/:menuId/categories/:categoryId/dishes/reorder',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen'),
  menuController.reorderDishes
);

// ============================================
// Order Management Routes (Staff) - Additional routes with :orderId
// ============================================

// Get hotel orders with filters
router.get('/:hotelId/orders', authenticate, hotelFeature, orderController.getHotelOrders);

// Update order status
router.patch(
  '/:hotelId/orders/:orderId/status',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'hotel_kitchen', 'room_service'),
  orderController.updateOrderStatus
);

// Assign order to staff
router.post(
  '/:hotelId/orders/:orderId/assign',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager'),
  orderController.assignOrderToStaff
);

// Mark order as picked up
router.post(
  '/:hotelId/orders/:orderId/pickup',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'room_service', 'concierge'),
  orderController.markOrderPickedUp
);

// Mark order as delivered
router.post(
  '/:hotelId/orders/:orderId/deliver',
  authenticate,
  hotelFeature,
  authorize('superadmin', 'hotel_owner', 'hotel_manager', 'room_service', 'concierge'),
  orderController.markOrderDelivered
);

export default router;
