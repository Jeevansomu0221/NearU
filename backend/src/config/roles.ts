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

export const DELETABLE_APP_ROLES = [
  ROLES.CUSTOMER,
  ROLES.PARTNER,
  ROLES.DELIVERY
] as const;

export type DeletableAppRole = (typeof DELETABLE_APP_ROLES)[number];

export const isDeletableAppRole = (role?: string): role is DeletableAppRole =>
  typeof role === "string" && (DELETABLE_APP_ROLES as readonly string[]).includes(role);

export const isRoleDeletedForApp = (deletedRoles: unknown, role?: string): boolean =>
  isDeletableAppRole(role) &&
  Array.isArray(deletedRoles) &&
  (deletedRoles as DeletableAppRole[]).includes(role);