import { IUser } from '../models/User.js';
import { ICustomer } from '../models/Customer.js';
import { IHotelGuest } from '../models/HotelGuest.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      customer?: ICustomer;
      hotelGuest?: IHotelGuest;
      restaurantId?: string;
      hotelId?: string;
      // Impersonation context
      isImpersonating?: boolean;
      originalUser?: {
        userId: string;
        email: string;
        role: string;
      };
      impersonatedRestaurantId?: string;
    }
  }
}

export {};
