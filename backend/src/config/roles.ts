export const ROLES = {
  CUSTOMER: "customer",
  PARTNER: "partner",
  DELIVERY: "delivery",  // Make sure this is included
  ADMIN: "admin"
} as const;

// Optional: Create type for TypeScript
export type Role = typeof ROLES[keyof typeof ROLES];

/** Roles that may use the customer app (order food, manage profile, pay, support). */
export const CONSUMER_APP_ROLES = [
  ROLES.CUSTOMER,
  ROLES.PARTNER,
  ROLES.DELIVERY
] as const;