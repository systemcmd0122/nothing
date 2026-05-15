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
 * Gets the URL for a Valorant rank image.
 *
 * @param {string} rankName - The name of the rank (e.g., "Bronze", "Iron", "Radiant")
 * @param {string|number} division - The division number (1, 2, 3)
 * @returns {string} The full URL to the rank image
 */
export function getRankImageUrl(rankName, division) {
    const baseUrl = getBaseUrl();
    let fileName = 'Norank.jpg';

    if (rankName && rankName !== 'Unranked' && rankName !== 'Norank') {
        if (rankName === 'Radiant') {
            fileName = 'Radiant_Rank.jpg';
        } else if (division) {
            // Ensure rankName is capitalized for file matching
            const capitalizedRank = rankName.charAt(0).toUpperCase() + rankName.slice(1).toLowerCase();
            fileName = `${capitalizedRank}_${division}_Rank.jpg`;
        }
    }

    return `${baseUrl}/ranks/${fileName}`;
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
