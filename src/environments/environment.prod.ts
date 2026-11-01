declare const API_URL: string;
declare const GOOGLE_CLIENT_ID: string;

export const environment = {
  production: true,
  apiUrl: API_URL,
  googleClientId: typeof GOOGLE_CLIENT_ID === 'undefined' ? '' : GOOGLE_CLIENT_ID,
};
