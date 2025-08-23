// frontend/src/utils/utils.js

/**
 * Creates a shortened version of an ID string for display.
 * @param {string} id - The full ID string.
 * @returns {string} The shortened ID in the format "first4...last4".
 */
export const shortId = (id) => (id ? `${id.substring(0, 4)}...${id.substring(id.length - 4)}` : '');

/**
 * Formats a number to a fixed number of decimal places for display.
 * @param {number | string | null} dist - The number to format. Can be null or not a number.
 * @returns {string} The formatted number or an empty string if invalid.
 */
export const fmtDistance = (dist) => (dist === 0 || typeof dist === 'number') ? dist.toFixed(3) : '';
