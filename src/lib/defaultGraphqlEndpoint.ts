/**
 * Used when VITE_GRAPHQL_URL is unset so dev and preview builds hit the hosted API (Render), not localhost.
 * Override in `.env` if you point at another backend.
 */
export const DEFAULT_GRAPHQL_HTTP_URL = 'https://xtrimfitgym-api.onrender.com/graphql';

export const DEFAULT_GRAPHQL_WS_URL = 'wss://xtrimfitgym-api.onrender.com/graphql';
