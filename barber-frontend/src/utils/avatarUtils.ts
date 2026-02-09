/**
 * Avatar utility functions for generating profile pictures
 */

export const roleColors = {
  super_admin: {
    bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
    ring: 'ring-purple-400',
    text: 'text-white'
  },
  owner: {
    bg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    ring: 'ring-blue-400',
    text: 'text-white'
  },
  staff: {
    bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    ring: 'ring-emerald-400',
    text: 'text-white'
  },
  customer: {
    bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    ring: 'ring-amber-400',
    text: 'text-white'
  },
  default: {
    bg: 'bg-gradient-to-br from-gray-500 to-slate-600',
    ring: 'ring-gray-400',
    text: 'text-white'
  }
};

export const getInitials = (name: string): string => {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getRoleColors = (role?: string) => {
  if (!role) return roleColors.default;

  const normalizedRole = role.toLowerCase();
  if (normalizedRole in roleColors) {
    return roleColors[normalizedRole as keyof typeof roleColors];
  }

  return roleColors.default;
};

export interface AvatarProps {
  initials: string;
  colorScheme: typeof roleColors.default;
  avatarUrl?: string;
}

export const generateAvatarProps = (name: string, role?: string, avatarUrl?: string): AvatarProps => {
  return {
    initials: getInitials(name),
    colorScheme: getRoleColors(role),
    avatarUrl
  };
};
