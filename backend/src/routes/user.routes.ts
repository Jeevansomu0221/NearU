// NEARU/backend/src/routes/user.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { CONSUMER_APP_ROLES } from "../config/roles";
import {
  getUserProfile,
  updateUserProfile,
  updateUserAddress,
  getSavedAddresses,
  addUserAddress,
  setDefaultAddress,
  deleteUserAddress,
  getMyOrders,
  getMyFavorites,
  addFavoriteRestaurant,
  removeFavoriteRestaurant,
  addFavoriteFoodItem,
  removeFavoriteFoodItem,
  deleteMyAccount
} from "../controllers/user.controller";
import {
  cancelMyDeletionRequest,
  getMyDeletionEligibility,
  getMyDeletionRequest,
  requestAccountDeletion
} from "../controllers/accountDeletion.controller";
import { ROLES } from "../config/roles";

const router = Router();

router.delete(
  "/me",
  authMiddleware,
  deleteMyAccount
);

router.get(
  "/me/deletion-eligibility",
  authMiddleware,
  roleMiddleware([ROLES.PARTNER, ROLES.DELIVERY]),
  getMyDeletionEligibility
);

router.post(
  "/me/deletion-request",
  authMiddleware,
  roleMiddleware([ROLES.PARTNER, ROLES.DELIVERY]),
  requestAccountDeletion
);

router.get(
  "/me/deletion-request",
  authMiddleware,
  roleMiddleware([ROLES.PARTNER, ROLES.DELIVERY]),
  getMyDeletionRequest
);

router.delete(
  "/me/deletion-request",
  authMiddleware,
  roleMiddleware([ROLES.PARTNER, ROLES.DELIVERY]),
  cancelMyDeletionRequest
);

/**
 * ================================
 * CUSTOMER PROFILE ROUTES
 * ================================
 */

// Get user profile (customer only)
router.get(
  "/profile",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  getUserProfile
);

// Update user profile (customer only)
router.put(
  "/profile",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  updateUserProfile
);

// Update user address (customer only)
router.put(
  "/address",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  updateUserAddress
);

router.get(
  "/addresses",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  getSavedAddresses
);

router.post(
  "/addresses",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  addUserAddress
);

router.put(
  "/address/:addressId/default",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  setDefaultAddress
);

router.delete(
  "/address/:addressId",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  deleteUserAddress
);

router.get(
  "/favorites",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  getMyFavorites
);

router.post(
  "/favorites/restaurants/:partnerId",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  addFavoriteRestaurant
);

router.delete(
  "/favorites/restaurants/:partnerId",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  removeFavoriteRestaurant
);

router.post(
  "/favorites/food-items/:menuItemId",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  addFavoriteFoodItem
);

router.delete(
  "/favorites/food-items/:menuItemId",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  removeFavoriteFoodItem
);

// Get user's orders (customer only)
router.get(
  "/orders",
  authMiddleware,
  roleMiddleware([...CONSUMER_APP_ROLES]),
  getMyOrders
);

export default router;