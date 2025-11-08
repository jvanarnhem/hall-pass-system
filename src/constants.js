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

