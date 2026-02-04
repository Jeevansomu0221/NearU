export const ROLES = {
  CUSTOMER: "customer",
  PARTNER: "partner",
  DELIVERY: "delivery",  // Make sure this is included
  ADMIN: "admin"
} as const;

// Optional: Create type for TypeScript
export type Role = typeof ROLES[keyof typeof ROLES];