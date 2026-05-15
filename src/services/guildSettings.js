import { db } from "../config/firebase.js";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Get or create guild settings
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} - Guild settings
 */
export async function getGuildSettings(guildId) {
  try {
    const docRef = doc(db, "guild_settings", guildId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }

    // Default settings for a new guild
    const defaultSettings = {
      guildId,
      notificationsEnabled: true,
      rankRolesEnabled: true,
      notificationChannelId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(docRef, defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error(`[ERROR] Failed to get guild settings: ${error.message}`);
    return null;
  }
}

/**
 * Update guild settings
 * @param {string} guildId - Discord guild ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<boolean>} - Success status
 */
export async function updateGuildSettings(guildId, settings) {
  try {
    const docRef = doc(db, "guild_settings", guildId);
    await setDoc(docRef, {
      ...settings,
      guildId,
      updatedAt: new Date(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to update guild settings: ${error.message}`);
    return false;
  }
}
