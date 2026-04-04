const normalizeBasePath = (value: string) => {
  if (!value) return '';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '');
};

export const SUPERADMIN_ROUTE_BASE = normalizeBasePath(
  import.meta.env.VITE_SUPERADMIN_ROUTE_BASE || '/sa-portal-9xQ7m2pL'
);

export const SUPERADMIN_LOGIN_PATH = `${SUPERADMIN_ROUTE_BASE}/login`;
export const SUPERADMIN_DASHBOARD_PATH = `${SUPERADMIN_ROUTE_BASE}/dashboard`;

export const SUPERADMIN_API_BASE = normalizeBasePath(
  import.meta.env.VITE_SUPERADMIN_API_BASE || '/api/sa-ops-8mK2r4'
);
