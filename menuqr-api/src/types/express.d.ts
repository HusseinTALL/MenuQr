import { IUser } from '../models/User.js';
import { ICustomer } from '../models/Customer.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      customer?: ICustomer;
      restaurantId?: string;
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
