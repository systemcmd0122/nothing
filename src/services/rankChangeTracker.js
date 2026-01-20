import { db } from "../config/firebase.js";
import { query, collection, where, getDocs } from "firebase/firestore";
import { EmbedBuilder } from "discord.js";
import {
    getNotificationSettings,
    checkRankChange,
    getFollowedPlayers,
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

                    // Send notification to user's DM
                    await sendNotificationToUser(client, userId, notification);

                    // Send notification to channel if guild provided
                    if (guild) {
                        await sendChannelNotification(client, guild, account, notification);
                    }

                    // Notify followers about this user's rank change
                    await notifyFollowers(client, userId, notification, account);

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

/**
 * Send notification to user
 * @param {Object} client - Discord client
 * @param {string} userId - Discord user ID
 * @param {Object} notification - Notification object
 * @returns {Promise<void>}
 */
export async function sendNotificationToUser(client, userId, notification) {
    try {
        const user = await client.users.fetch(userId);

        if (!user) {
            console.warn(`[WARN] User ${userId} not found.`);
            return;
        }

        const embed = {
            color: notification.type === "RANK_UP" ? 0x00ff00 : notification.type === "RANK_DOWN" ? 0xff0000 : 0x0099ff,
            title: `${notification.emoji} ランク変動通知`,
            description: notification.message,
            fields: [],
            timestamp: new Date(),
        };

        if (notification.previousRank && notification.newRank) {
            embed.fields.push({
                name: "変動内容",
                value: `${notification.previousRank} → ${notification.newRank}`,
                inline: false,
            });
        }

        if (notification.previousRR !== undefined && notification.newRR !== undefined) {
            embed.fields.push({
                name: "RR",
                value: `${notification.previousRR} → ${notification.newRR}`,
                inline: true,
            });
        }

        await user.send({ embeds: [embed] });
        console.log(`[OK] Sent rank update notification to user ${userId}`);
    } catch (error) {
        console.error(`[ERROR] Failed to send notification to user ${userId}: ${error.message}`);
    }
}

/**
 * Send channel notification (for all servers to see)
 * @param {Object} client - Discord client
 * @param {Object} guild - Discord guild
 * @param {Object} account - Valorant account data
 * @param {Object} notification - Notification object
 * @returns {Promise<void>}
 */
export async function sendChannelNotification(client, guild, account, notification) {
    try {
        const channel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (!channel) {
            console.warn(`[WARN] Notification channel not found: ${NOTIFICATION_CHANNEL_ID}`);
            return;
        }

        let title = "";
        let color = 0xffffff;

        switch (notification.type) {
            case "RANK_UP":
                title = "🎉 [OK] ランクアップ！";
                color = 0x00ff00;
                break;
            case "RANK_DOWN":
                title = "📉 [ERROR] ランクダウン";
                color = 0xff6600;
                break;
            case "DIVISION_CHANGE":
                title = "📊 ディビジョン変更";
                color = 0x00aa00;
                break;
            case "RR_CHANGE":
                title = "🔄 RR変動";
                color = 0x0099ff;
                break;
            default:
                return;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(`**${account.username}#${account.tag}** のランクが変動しました`)
            .addFields(
                {
                    name: "変動内容",
                    value: notification.message,
                    inline: false,
                }
            )
            .setFooter({
                text: "Valorant Rank Notification",
                iconURL: client.user.displayAvatarURL({ size: 64 }),
            })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(`[OK] Sent channel notification: ${account.username}#${account.tag} - ${notification.message}`);
    } catch (error) {
        console.error(`[ERROR] Failed to send channel notification: ${error.message}`);
    }
}

/**
 * Notify followers about a user's rank change
 * @param {Object} client - Discord client
 * @param {string} userId - Discord user ID whose rank changed
 * @param {Object} notification - Notification object
 * @param {Object} account - User's Valorant account info
 * @returns {Promise<void>}
 */
export async function notifyFollowers(client, userId, notification, account) {
    try {
        // Find all users who are following this user
        const followersQuery = query(
            collection(db, "player_follows"),
            where("following", "array-contains", userId)
        );

        const followersSnapshot = await getDocs(followersQuery);

        if (followersSnapshot.empty) {
            return; // No followers
        }

        const embed = {
            color: notification.type === "RANK_UP" ? 0x00ff00 : notification.type === "RANK_DOWN" ? 0xff0000 : 0x0099ff,
            title: `${notification.emoji} フォロー中のプレイヤーのランク変動`,
            description: `**${account.username}#${account.tag}** ${notification.message}`,
            fields: [],
            timestamp: new Date(),
        };

        if (notification.previousRank && notification.newRank) {
            embed.fields.push({
                name: "変動内容",
                value: `${notification.previousRank} → ${notification.newRank}`,
                inline: false,
            });
        }

        for (const followerDoc of followersSnapshot.docs) {
            const followerId = followerDoc.data().userId;

            try {
                // Check if follower wants these notifications
                const settings = await getNotificationSettings(followerId);
                if (!settings?.followedPlayersNotifications) {
                    continue;
                }

                const followerUser = await client.users.fetch(followerId);
                if (followerUser) {
                    await followerUser.send({ embeds: [embed] });
                    console.log(`[OK] Sent follower notification to user ${followerId}`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to notify follower ${followerId}: ${error.message}`);
            }
        }
    } catch (error) {
        console.error(`[ERROR] Failed to notify followers: ${error.message}`);
    }
}
