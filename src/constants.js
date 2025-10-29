// src/constants.js

// Refresh intervals for data polling
export const REFRESH_INTERVALS = {
  ACTIVE_PASSES: 10 * 1000,  // 10 seconds
  TODAY_PASSES: 30 * 1000,   // 30 seconds
};

// Timeout durations
export const TIMEOUTS = {
  BACKGROUND_SUBMIT: 50,      // 50ms - delay before background API call
  SUCCESS_MESSAGE: 3 * 1000,  // 3 seconds - how long to show success message
};

// Cache TTLs for SWR
export const CACHE_TTL = {
  DESTINATIONS: 6 * 60 * 60 * 1000,  // 6 hours
  STAFF: 24 * 60 * 60 * 1000,        // 24 hours
  SETTINGS: 10 * 60 * 1000,          // 10 minutes
};

// Default destinations (fallback when API fails)
export const DESTINATIONS_SNAPSHOT = ["Restroom", "Nurse", "Guidance", "Other"];

// Cache version identifiers (bump to invalidate cache)
export const CACHE_VERSIONS = {
  DESTINATIONS: "v1",
  STAFF: "v1",
};