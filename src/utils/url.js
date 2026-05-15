/**
 * URL related utility functions
 */

/**
 * Constructs the base URL for the application based on environment variables.
 * Handles protocol prefixes and trailing slashes to prevent malformed URLs.
 *
 * @returns {string} The base URL (e.g., "https://example.koyeb.app" or "http://localhost:3000")
 */
export function getBaseUrl() {
    let baseUrl = "";

    if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
    } else if (process.env.KOYEB_DOMAIN) {
        baseUrl = process.env.KOYEB_DOMAIN;
    }

    if (baseUrl) {
        // Strip existing protocol if present
        let cleanUrl = baseUrl.replace(/^https?:\/\//, "");
        // Strip trailing slash
        cleanUrl = cleanUrl.replace(/\/$/, "");

        // Always use https for production domains
        return `https://${cleanUrl}`;
    }

    // Default for local development
    const port = process.env.PORT || 3000;
    return `http://localhost:${port}`;
}

/**
 * Validates if a string is a well-formed URL.
 *
 * @param {string} string - The string to validate
 * @returns {boolean} True if the string is a valid URL, false otherwise
 */
export function isValidUrl(string) {
    if (!string) return false;
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
