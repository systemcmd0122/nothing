import axios from "axios";
import { db } from "../config/firebase.js";
import { query, collection, getDocs } from "firebase/firestore";
import {
    getNotificationSettings,
    saveLastPatchCheck,
    getLastPatchVersion,
} from "./notificationService.js";

const VALORANT_API_BASE = process.env.VALORANT_API_URL || "https://vaccie.pythonanywhere.com";

/**
 * Fetch latest patch information from Valorant API
 * @returns {Promise<Object|null>} - Patch information
 */
export async function fetchLatestPatch() {
    try {
        const response = await axios.get(`${VALORANT_API_BASE}/patches`);

        if (response.data && response.data.patches && response.data.patches.length > 0) {
            return response.data.patches[0]; // Return latest patch
        }

        return null;
    } catch (error) {
        console.error(`[ERROR] Failed to fetch latest patch: ${error.message}`);
        return null;
    }
}

/**
 * Check for new patches and notify users
 * @param {Object} client - Discord client
 * @returns {Promise<boolean>} - True if new patch found
 */
export async function checkAndNotifyNewPatch(client) {
    try {
        console.log("[INFO] Checking for new patches...");

        const latestPatch = await fetchLatestPatch();
        if (!latestPatch) {
            console.log("[INFO] Could not fetch patch information.");
            return false;
        }

        const lastPatchVersion = await getLastPatchVersion();

        // Check if this is a new patch
        if (lastPatchVersion === latestPatch.version) {
            console.log(`[INFO] No new patches. Current version: ${lastPatchVersion}`);
            return false;
        }

        console.log(`[OK] New patch detected: ${latestPatch.version}`);

        // Save new patch version
        await saveLastPatchCheck(latestPatch.version);

        // Notify all users
        const q = query(collection(db, "notification_settings"));
        const querySnapshot = await getDocs(q);

        let notifiedCount = 0;

        for (const doc of querySnapshot.docs) {
            const settings = doc.data();

            if (!settings.patchNotifications) {
                continue; // Skip if patch notifications disabled
            }

            try {
                const user = await client.users.fetch(settings.userId);
                if (user) {
                    await sendPatchNotification(user, latestPatch, lastPatchVersion);
                    notifiedCount++;
                }
            } catch (error) {
                console.error(`[ERROR] Failed to notify user ${settings.userId}: ${error.message}`);
            }
        }

        console.log(`[OK] Patch notification sent to ${notifiedCount} users.`);
        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to check for new patches: ${error.message}`);
        return false;
    }
}

/**
 * Send patch notification to user
 * @param {Object} user - Discord user
 * @param {Object} patch - Patch information
 * @param {string} previousVersion - Previous patch version
 * @returns {Promise<void>}
 */
export async function sendPatchNotification(user, patch, previousVersion) {
    try {
        const embed = {
            color: 0xff6600,
            title: "📋 新しいパッチがリリースされました！",
            description: `**Valorant Patch ${patch.version}**`,
            fields: [
                {
                    name: "リリース日時",
                    value: patch.releasedAt || "情報取得不可",
                    inline: false,
                },
            ],
            timestamp: new Date(),
        };

        if (previousVersion) {
            embed.fields.push({
                name: "前バージョン",
                value: previousVersion,
                inline: true,
            });
        }

        if (patch.description || patch.notes) {
            const description = patch.description || patch.notes;
            const truncated = description.length > 256 ? description.substring(0, 256) + "..." : description;

            embed.fields.push({
                name: "概要",
                value: truncated,
                inline: false,
            });
        }

        embed.fields.push({
            name: "詳細",
            value: "[公式パッチノート](https://valorantesports.com/news) でご確認ください",
            inline: false,
        });

        await user.send({ embeds: [embed] });
        console.log(`[OK] Sent patch notification to user ${user.id}`);
    } catch (error) {
        console.error(`[ERROR] Failed to send patch notification: ${error.message}`);
    }
}

/**
 * Get patch notes summary
 * @returns {Promise<Object|null>} - Patch information with details
 */
export async function getPatchNotes() {
    try {
        const response = await axios.get(`${VALORANT_API_BASE}/patches?limit=1`);

        if (response.data && response.data.patches && response.data.patches.length > 0) {
            return response.data.patches[0];
        }

        return null;
    } catch (error) {
        console.error(`[ERROR] Failed to get patch notes: ${error.message}`);
        return null;
    }
}
