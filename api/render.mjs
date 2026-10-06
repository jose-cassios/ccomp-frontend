// Reuse Angular's SSR handler for direct links and page reloads on Vercel.
export { reqHandler as default } from '../dist/ccomp-frontend/server/server.mjs';
