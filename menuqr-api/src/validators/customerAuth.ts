import { body, param } from 'express-validator';

// Phone number validation (international format)
const phoneValidator = body('phone')
  .trim()
  .notEmpty()
  .withMessage('Le numéro de téléphone est requis')
  .matches(/^[+]?[\d\s-()]+$/)
  .withMessage('Veuillez entrer un numéro de téléphone valide')
  .isLength({ min: 8, max: 20 })
  .withMessage('Le numéro de téléphone doit contenir entre 8 et 20 caractères');

// Restaurant ID validation
const restaurantIdValidator = body('restaurantId')
  .isMongoId()
  .withMessage('ID de restaurant invalide');

// Send OTP (for registration or login)
export const sendOtpValidator = [
  phoneValidator,
  restaurantIdValidator,
  body('type')
    .optional()
    .isIn(['register', 'login', 'reset_password'])
    .withMessage('Type OTP invalide'),
];

// Verify OTP
export const verifyOtpValidator = [
  phoneValidator,
  restaurantIdValidator,
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Le code OTP est requis')
    .isLength({ min: 6, max: 6 })
    .withMessage('Le code OTP doit contenir 6 chiffres')
    .isNumeric()
    .withMessage('Le code OTP doit être numérique'),
];

// Customer registration (after OTP verified)
export const customerRegisterValidator = [
  phoneValidator,
  restaurantIdValidator,
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
    .matches(/\d/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Veuillez entrer un email valide')
    .normalizeEmail()
    .toLowerCase(),
  body('otpToken')
    .notEmpty()
    .withMessage('Le token de vérification OTP est requis'),
];

// Customer login
export const customerLoginValidator = [
  phoneValidator,
  restaurantIdValidator,
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis'),
];

// Refresh token
export const customerRefreshTokenValidator = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Le refresh token est requis'),
];

// Update profile
export const customerUpdateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Veuillez entrer un email valide')
    .normalizeEmail()
    .toLowerCase(),
  body('dietaryPreferences')
    .optional()
    .isArray()
    .withMessage('Les préférences alimentaires doivent être un tableau'),
  body('dietaryPreferences.*')
    .optional()
    .isIn(['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'lactose-free', 'nut-free'])
    .withMessage('Préférence alimentaire invalide'),
  body('allergens')
    .optional()
    .isArray()
    .withMessage('Les allergènes doivent être un tableau'),
  body('allergens.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Allergène invalide'),
];

// Change password
export const customerChangePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
    .matches(/\d/)
    .withMessage('Le nouveau mot de passe doit contenir au moins un chiffre'),
];

// Forgot password (send OTP)
export const customerForgotPasswordValidator = [
  phoneValidator,
  restaurantIdValidator,
];

// Reset password (after OTP verified)
export const customerResetPasswordValidator = [
  phoneValidator,
  restaurantIdValidator,
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Le code OTP est requis')
    .isLength({ min: 6, max: 6 })
    .withMessage('Le code OTP doit contenir 6 chiffres'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
    .matches(/\d/)
    .withMessage('Le nouveau mot de passe doit contenir au moins un chiffre'),
];

// Address validation
export const addressValidator = [
  body('label')
    .trim()
    .notEmpty()
    .withMessage('Le libellé est requis')
    .isLength({ max: 50 })
    .withMessage('Le libellé ne peut pas dépasser 50 caractères'),
  body('street')
    .trim()
    .notEmpty()
    .withMessage('L\'adresse est requise')
    .isLength({ max: 200 })
    .withMessage('L\'adresse ne peut pas dépasser 200 caractères'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('La ville est requise')
    .isLength({ max: 100 })
    .withMessage('La ville ne peut pas dépasser 100 caractères'),
  body('postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Le code postal ne peut pas dépasser 20 caractères'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le pays ne peut pas dépasser 100 caractères'),
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Les instructions ne peuvent pas dépasser 200 caractères'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault doit être un booléen'),
];

// Address ID param
export const addressIdValidator = [
  param('addressId')
    .isMongoId()
    .withMessage('ID d\'adresse invalide'),
];

// Dish ID for favorites
export const dishIdValidator = [
  param('dishId')
    .isMongoId()
    .withMessage('ID de plat invalide'),
];
