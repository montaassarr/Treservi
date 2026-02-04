/**
 * Simple static avatar icons for different user roles
 * Uses clean SVG icons instead of generated avatars
 */

/**
 * Gets avatar for staff members
 * @param name - Staff member name (not used, just for compatibility)
 * @returns URL for staff avatar icon
 */
export const getStaffAvatar = (name?: string): string => {
  return '/avatar-staff.svg';
};

/**
 * Gets avatar for customers
 * @param name - Customer name (not used, just for compatibility)
 * @returns URL for customer avatar icon
 */
export const getCustomerAvatar = (name?: string): string => {
  return '/avatar-client.svg';
};

/**
 * Gets avatar for salon owner
 * @param name - Owner name (not used, just for compatibility)
 * @returns URL for owner avatar icon
 */
export const getOwnerAvatar = (name?: string): string => {
  return '/avatar-owner.svg';
};

/**
 * Fallback avatar URL if needed
 */
export const DEFAULT_AVATAR = '/avatar-client.svg';
