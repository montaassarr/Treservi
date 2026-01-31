/**
 * Generate 3D human emoji-style avatar URLs using DiceBear API
 * Uses the "adventurer" or "personas" style for 3D human-like avatars
 */

// Different 3D avatar styles available
type AvatarStyle = 'adventurer' | 'avataaars' | 'big-smile' | 'personas' | 'lorelei';

/**
 * Generates a 3D human emoji-style avatar URL
 * @param name - The name to seed the avatar generation
 * @param style - The avatar style to use (default: 'adventurer')
 * @returns URL string for the generated avatar
 */
export const generate3DAvatar = (name: string, style: AvatarStyle = 'adventurer'): string => {
  const seed = encodeURIComponent(name.trim() || 'default');
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

/**
 * Generates a fun 3D emoji avatar with consistent style
 * @param name - The name to seed the avatar
 * @returns URL for 3D human emoji avatar
 */
export const getStaffAvatar = (name: string): string => {
  return generate3DAvatar(name, 'adventurer');
};

/**
 * Generates avatar for customers
 * @param name - Customer name
 * @returns URL for customer avatar
 */
export const getCustomerAvatar = (name: string): string => {
  return generate3DAvatar(name, 'big-smile');
};

/**
 * Generates avatar for salon owner
 * @param name - Owner name
 * @returns URL for owner avatar
 */
export const getOwnerAvatar = (name: string): string => {
  return generate3DAvatar(name, 'personas');
};

/**
 * Fallback avatar URL if name is empty
 */
export const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=default&backgroundColor=b6e3f4';
