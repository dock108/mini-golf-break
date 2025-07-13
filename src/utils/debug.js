/**
 * Debug utility for conditional logging
 * Allows for clean production builds while maintaining debug capabilities
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';

export const debug = {
  log: (...args) => {
    if (DEBUG_MODE) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },

  warn: (...args) => {
    if (DEBUG_MODE) {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args) => {
    // Always log errors, even in production
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...args);
  },

  info: (...args) => {
    if (DEBUG_MODE) {
      // eslint-disable-next-line no-console
      console.info('[INFO]', ...args);
    }
  },

  group: label => {
    if (DEBUG_MODE && console.group) {
      // eslint-disable-next-line no-console
      console.group(label);
    }
  },

  groupEnd: () => {
    if (DEBUG_MODE && console.groupEnd) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  },

  time: label => {
    if (DEBUG_MODE && console.time) {
      // eslint-disable-next-line no-console
      console.time(label);
    }
  },

  timeEnd: label => {
    if (DEBUG_MODE && console.timeEnd) {
      // eslint-disable-next-line no-console
      console.timeEnd(label);
    }
  }
};

export default debug;
