// Base path for the app, derived from Vite's base config.
// Strips trailing slash so it can be used as a prefix: `${BASE_PATH}/api/...`
// When base is '/', BASE_PATH becomes '' (empty string).
const raw = import.meta.env.BASE_URL;
export const BASE_PATH = raw.endsWith('/') ? raw.slice(0, -1) : raw;
