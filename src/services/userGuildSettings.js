import { db } from "../config/firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Get user settings for a specific guild
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} - User-guild settings
 */
export async function getUserGuildSettings(userId, guildId) {
  try {
    const docId = `${userId}_${guildId}`;
    const docRef = doc(db, "user_guild_settings", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }

    // Default settings
    const defaultSettings = {
      userId,
      guildId,
      accountLinkEnabled: true, // Default to enabled
      updatedAt: new Date(),
    };

    // We don't necessarily need to save the default settings immediately
    // but returning them ensures the app has consistent data.
    return defaultSettings;
  } catch (error) {
    console.error(`[ERROR] Failed to get user-guild settings: ${error.message}`);
    return {
      userId,
      guildId,
      accountLinkEnabled: true,
      updatedAt: new Date(),
    };
  }
}

/**
 * Update user settings for a specific guild
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<boolean>} - Success status
 */
export async function updateUserGuildSettings(userId, guildId, settings) {
  try {
    const docId = `${userId}_${guildId}`;
    const docRef = doc(db, "user_guild_settings", docId);

    await setDoc(docRef, {
      ...settings,
      userId,
      guildId,
      updatedAt: new Date(),
    }, { merge: true });

    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to update user-guild settings: ${error.message}`);
    return false;
  }
}
