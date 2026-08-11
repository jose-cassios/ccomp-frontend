export const AUTH_CONFIG = {
  TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  USER_KEY: 'user_data',
  TOKEN_EXPIRY_BUFFER: 300000,
} as const;

export type AuthConfig = typeof AUTH_CONFIG;

export const NEWS_MANAGEMENT_ROLES = ['ADM', 'MODERATOR'] as const;
