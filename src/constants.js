// src/constants.js

// Refresh intervals for data polling
export const REFRESH_INTERVALS = {
  ACTIVE_PASSES: 2 * 60 * 1000,   // 2 minutes when tab visible
  TODAY_PASSES: 5 * 60 * 1000,    // 5 minutes
  AUTO_CHECKIN: 15 * 60 * 1000,   // 15 minutes
};

// Timeout durations
export const TIMEOUTS = {
  BACKGROUND_SUBMIT: 50,
  SUCCESS_MESSAGE: 3 * 1000,
};

// Cache TTLs for SWR
export const CACHE_TTL = {
  DESTINATIONS: 6 * 60 * 60 * 1000,
  STAFF: 24 * 60 * 60 * 1000,
  SETTINGS: 10 * 60 * 1000,
};

// Default destinations (fallback when API fails)
export const DESTINATIONS_SNAPSHOT = ["Restroom", "Nurse", "Guidance", "Other"];

// Cache version identifiers (bump to invalidate cache)
export const CACHE_VERSIONS = {
  DESTINATIONS: "v1",
  STAFF: "v1",
};