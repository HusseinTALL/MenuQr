/**
 * Hotel Menu Module Integration Tests
 * Tests menu, category, and dish management
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { HotelMenu, HotelCategory, HotelDish } from '../../models/index.js';
import {
  createTestHotel,
  createTestHotelUser,
  createTestMenu,
  createTestHotelCategories,
  createTestHotelDishes,
} from './hotelHelpers.js';

describe('Hotel Menu Module', () => {
  describe('Menu Management', () => {
    describe('GET /api/v1/hotels/:hotelId/menus', () => {
      it('should list all menus for a hotel (public)', async () => {
        const { hotel } = await createTestHotel();
        await createTestMenu(hotel._id);
        await createTestMenu(hotel._id, { type: 'breakfast', isDefault: false });

        const res = await request(app).get(`/api/v1/hotels/${hotel._id}/menus`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
      });

      it('should only return active menus', async () => {
        const { hotel } = await createTestHotel();
        await createTestMenu(hotel._id);
        await createTestMenu(hotel._id, { isActive: false });

        const res = await request(app).get(`/api/v1/hotels/${hotel._id}/menus`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
      });
    });

    describe('POST /api/v1/hotels/:hotelId/menus', () => {
      it('should create a new menu', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');

        const menuData = {
          name: { fr: 'Menu Petit-déjeuner', en: 'Breakfast Menu' },
          description: { fr: 'Petit-déjeuner continental', en: 'Continental breakfast' },
          type: 'breakfast',
          isActive: true,
          availability: {
            isAlwaysAvailable: false,
            schedule: [
              { dayOfWeek: 0, startTime: '07:00', endTime: '10:00' },
              { dayOfWeek: 1, startTime: '07:00', endTime: '10:00' },
            ],
          },
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/menus`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(menuData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name.fr).toBe('Menu Petit-déjeuner');
        expect(res.body.data.type).toBe('breakfast');
      });

      it('should not allow reception to create menus', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'reception');

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/menus`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: { fr: 'Test Menu' },
            type: 'room_service',
          });

        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/v1/hotels/:hotelId/menus/:menuId', () => {
      it('should update a menu', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);

        const updateData = {
          name: { fr: 'Menu Modifié', en: 'Updated Menu' },
          isDefault: true,
        };

        const res = await request(app)
          .put(`/api/v1/hotels/${hotel._id}/menus/${menu._id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.data.name.fr).toBe('Menu Modifié');
        expect(res.body.data.isDefault).toBe(true);
      });
    });

    describe('DELETE /api/v1/hotels/:hotelId/menus/:menuId', () => {
      it('should delete a menu and its contents', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 2);
        await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 3);

        const res = await request(app)
          .delete(`/api/v1/hotels/${hotel._id}/menus/${menu._id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);

        // Verify cascade delete
        const deletedMenu = await HotelMenu.findById(menu._id);
        const deletedCategories = await HotelCategory.find({ menuId: menu._id });
        const deletedDishes = await HotelDish.find({ menuId: menu._id });

        expect(deletedMenu).toBeNull();
        expect(deletedCategories.length).toBe(0);
        expect(deletedDishes.length).toBe(0);
      });
    });
  });

  describe('Category Management', () => {
    describe('GET /api/v1/hotels/:hotelId/menus/:menuId/categories', () => {
      it('should list categories for a menu', async () => {
        const { hotel } = await createTestHotel();
        const menu = await createTestMenu(hotel._id);
        await createTestHotelCategories(hotel._id, menu._id, 3);

        const res = await request(app).get(
          `/api/v1/hotels/${hotel._id}/menus/${menu._id}/categories`
        );

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(3);
      });

      it('should return categories ordered correctly', async () => {
        const { hotel } = await createTestHotel();
        const menu = await createTestMenu(hotel._id);
        await createTestHotelCategories(hotel._id, menu._id, 3);

        const res = await request(app).get(
          `/api/v1/hotels/${hotel._id}/menus/${menu._id}/categories`
        );

        expect(res.body.data[0].order).toBe(0);
        expect(res.body.data[1].order).toBe(1);
        expect(res.body.data[2].order).toBe(2);
      });
    });

    describe('POST /api/v1/hotels/:hotelId/menus/:menuId/categories', () => {
      it('should create a new category', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);

        const categoryData = {
          name: { fr: 'Entrées', en: 'Starters' },
          description: { fr: 'Nos entrées', en: 'Our starters' },
          icon: '🥗',
          order: 0,
        };

        const res = await request(app)
          .post(`/api/v1/hotels/${hotel._id}/menus/${menu._id}/categories`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(categoryData);

        expect(res.status).toBe(201);
        expect(res.body.data.name.fr).toBe('Entrées');
        expect(res.body.data.icon).toBe('🥗');
      });
    });

    describe('PUT /api/v1/hotels/:hotelId/menus/:menuId/categories/:categoryId', () => {
      it('should update a category', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);

        const updateData = {
          name: { fr: 'Catégorie Modifiée', en: 'Updated Category' },
          icon: '🍕',
        };

        const res = await request(app)
          .put(`/api/v1/hotels/${hotel._id}/menus/${menu._id}/categories/${categories[0]._id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.data.name.fr).toBe('Catégorie Modifiée');
        expect(res.body.data.icon).toBe('🍕');
      });
    });

    describe('DELETE /api/v1/hotels/:hotelId/menus/:menuId/categories/:categoryId', () => {
      it('should delete a category and its dishes', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 3);

        const res = await request(app)
          .delete(`/api/v1/hotels/${hotel._id}/menus/${menu._id}/categories/${categories[0]._id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);

        // Verify dishes are also deleted
        const remainingDishes = await HotelDish.find({ categoryId: categories[0]._id });
        expect(remainingDishes.length).toBe(0);
      });
    });
  });

  describe('Dish Management', () => {
    describe('GET /api/v1/hotels/:hotelId/dishes/:dishId', () => {
      it('should get dish details', async () => {
        const { hotel } = await createTestHotel();
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        const res = await request(app).get(`/api/v1/hotels/${hotel._id}/dishes/${dishes[0]._id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.name.fr).toBe(dishes[0].name.fr);
        expect(res.body.data.price).toBe(dishes[0].price);
      });
    });

    describe('POST /api/v1/hotels/:hotelId/menus/:menuId/categories/:categoryId/dishes', () => {
      it('should create a new dish', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);

        const dishData = {
          name: { fr: 'Steak Frites', en: 'Steak and Fries' },
          description: { fr: 'Steak avec frites maison', en: 'Steak with homemade fries' },
          price: 25,
          allergens: ['gluten'],
          isVegetarian: false,
          isAvailable: true,
          preparationTime: 25,
        };

        const res = await request(app)
          .post(
            `/api/v1/hotels/${hotel._id}/menus/${menu._id}/categories/${categories[0]._id}/dishes`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send(dishData);

        expect(res.status).toBe(201);
        expect(res.body.data.name.fr).toBe('Steak Frites');
        expect(res.body.data.price).toBe(25);
      });

      it('should allow kitchen staff to create dishes', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_kitchen');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);

        const dishData = {
          name: { fr: 'Salade Verte', en: 'Green Salad' },
          price: 12,
        };

        const res = await request(app)
          .post(
            `/api/v1/hotels/${hotel._id}/menus/${menu._id}/categories/${categories[0]._id}/dishes`
          )
          .set('Authorization', `Bearer ${accessToken}`)
          .send(dishData);

        expect(res.status).toBe(201);
      });
    });

    describe('PUT /api/v1/hotels/:hotelId/dishes/:dishId', () => {
      it('should update a dish', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        const updateData = {
          price: 30,
          isPopular: true,
          isFeatured: true,
        };

        const res = await request(app)
          .put(`/api/v1/hotels/${hotel._id}/dishes/${dishes[0]._id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(30);
        expect(res.body.data.isPopular).toBe(true);
        expect(res.body.data.isFeatured).toBe(true);
      });
    });

    describe('PATCH /api/v1/hotels/:hotelId/dishes/:dishId/availability', () => {
      it('should toggle dish availability', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_kitchen');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        const res = await request(app)
          .patch(`/api/v1/hotels/${hotel._id}/dishes/${dishes[0]._id}/availability`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ isAvailable: false });

        expect(res.status).toBe(200);
        expect(res.body.data.isAvailable).toBe(false);
      });
    });

    describe('DELETE /api/v1/hotels/:hotelId/dishes/:dishId', () => {
      it('should delete a dish', async () => {
        const { hotel } = await createTestHotel();
        const { accessToken } = await createTestHotelUser(hotel._id, 'hotel_owner');
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 1);

        const res = await request(app)
          .delete(`/api/v1/hotels/${hotel._id}/dishes/${dishes[0]._id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);

        const deletedDish = await HotelDish.findById(dishes[0]._id);
        expect(deletedDish).toBeNull();
      });
    });
  });

  describe('Menu for Guest', () => {
    describe('GET /api/v1/hotels/:hotelId/menus/:menuId/guest', () => {
      it('should return full menu with categories and dishes', async () => {
        const { hotel } = await createTestHotel();
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 2);
        await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 3);
        await createTestHotelDishes(hotel._id, menu._id, categories[1]._id, 2);

        const res = await request(app).get(
          `/api/v1/hotels/${hotel._id}/menus/${menu._id}/guest`
        );

        expect(res.status).toBe(200);
        expect(res.body.data.categories).toBeDefined();
        expect(res.body.data.categories.length).toBe(2);
        expect(res.body.data.categories[0].dishes).toBeDefined();
      });

      it('should only return available dishes', async () => {
        const { hotel } = await createTestHotel();
        const menu = await createTestMenu(hotel._id);
        const categories = await createTestHotelCategories(hotel._id, menu._id, 1);
        const dishes = await createTestHotelDishes(hotel._id, menu._id, categories[0]._id, 3);

        // Mark one dish as unavailable
        await HotelDish.findByIdAndUpdate(dishes[0]._id, { isAvailable: false });

        const res = await request(app).get(
          `/api/v1/hotels/${hotel._id}/menus/${menu._id}/guest`
        );

        expect(res.status).toBe(200);
        expect(res.body.data.categories[0].dishes.length).toBe(2);
      });
    });
  });
});
