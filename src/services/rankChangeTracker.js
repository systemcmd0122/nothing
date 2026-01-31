import { db } from "../config/firebase.js";
import { query, collection, where, getDocs } from "firebase/firestore";
import { EmbedBuilder } from "discord.js";
import {
    getNotificationSettings,
    checkRankChange,
} from "./notificationService.js";
import { getValorantAccount, getValorantRank } from "./valorant.js";

const NOTIFICATION_CHANNEL_ID = "1438781172997165147";

/**
 * Get rank order for comparison
 * @param {string} rankName - Rank name
 * @returns {number}
 */
function getRankOrder(rankName) {
    const rankOrder = {
        "Unranked": 0,
        "Iron": 1,
        "Bronze": 2,
        "Silver": 3,
        "Gold": 4,
        "Platinum": 5,
        "Diamond": 6,
        "Ascendant": 7,
        "Immortal": 8,
        "Radiant": 9,
    };
    return rankOrder[rankName] || 0;
}

/**
 * Check rank updates for all users and send notifications
 * @param {Object} client - Discord client
 * @param {Object} guild - Discord guild object (optional)
 * @returns {Promise<void>}
 */
export async function checkAllUserRankUpdates(client, guild) {
    try {
        console.log("[INFO] Starting rank update check for all users...");

        const q = query(collection(db, "valorant_accounts"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("[INFO] No Valorant accounts found.");
            return;
        }

        let notificationCount = 0;

        for (const doc of querySnapshot.docs) {
            const account = doc.data();
            const userId = account.discordUserId;

            try {
                // Get notification settings
                const settings = await getNotificationSettings(userId);
                if (!settings?.rankUpdateNotifications) {
                    console.log(`[INFO] Notifications disabled for user ${userId}`);
                    continue; // Skip if notifications are disabled
                }

                // Get current rank info
                const rankInfo = await getValorantRank(
                    account.username,
                    account.tag,
                    account.region,
                    account.platform
                );

                if (!rankInfo) {
                    console.log(`[WARN] No rank info for ${account.username}#${account.tag}`);
                    continue;
                }

                // Parse rank info
                let rankData;
                if (typeof rankInfo === "string") {
                    // Parse string format: "Bronze 1, RR: 28" or "Bronze 1, RR: 28 (-30)"
                    const match = rankInfo.match(/(\w+)\s+(\d+),?\s*RR:?\s*(\d+)/);
                    if (!match) {
                        console.log(`[WARN] Could not parse rank info: ${rankInfo}`);
                        continue;
                    }

                    rankData = {
                        rank: match[1],
                        division: match[2],
                        rr: parseInt(match[3]),
                    };
                } else {
                    rankData = rankInfo;
                }

                console.log(`[INFO] Checking rank for ${userId}: ${rankData.rank}${rankData.division} RR:${rankData.rr}`);

                // Check for rank change
                const notification = await checkRankChange(userId, rankData);

                if (notification) {
                    console.log(`[OK] Rank change detected: ${notification.type} - ${notification.message}`);

                    notificationCount++;
                } else {
                    console.log(`[INFO] No rank change for ${userId}`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to check rank for user ${userId}: ${error.message}`);
            }
        }

        console.log(`[OK] Rank update check completed. (${notificationCount} notifications sent)`);
    } catch (error) {
        console.error(`[ERROR] Failed to check all user rank updates: ${error.message}`);
    }
}

