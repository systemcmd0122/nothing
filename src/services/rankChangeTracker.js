import { db } from "../config/firebase.js";
import { query, collection, where, getDocs } from "firebase/firestore";
import { EmbedBuilder } from "discord.js";
import {
    getNotificationSettings,
    checkRankChange,
    NOTIFICATION_CHANNEL_ID
} from "./notificationService.js";
import { getGuildSettings } from "./guildSettings.js";
import { getValorantAccount, getValorantRank } from "./valorant.js";
import { getRankImageUrl, isValidUrl } from "../utils/url.js";

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
export async function checkAllUserRankUpdates(client) {
    try {
        console.log("[情報] すべてのユーザーのランク更新チェックを開始します...");

        const q = query(collection(db, "valorant_accounts"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("[情報] Valorantアカウントが見つかりませんでした。");
            return;
        }

        let notificationCount = 0;
        const accounts = querySnapshot.docs.map(doc => doc.data());

        // Get all guilds the bot is in
        const guilds = client.guilds.cache;

        for (const account of accounts) {
            const userId = account.discordUserId;

            try {
                // Get user's personal notification settings
                const userSettings = await getNotificationSettings(userId);
                if (!userSettings?.rankUpdateNotifications) {
                    console.log(`[INFO] Notifications disabled for user ${userId}`);
                    continue;
                }

                // Get current rank info
                const rankInfo = await getValorantRank(
                    account.username,
                    account.tag,
                    account.region,
                    account.platform,
                    userId,
                    client
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

                    // Send notification to each guild the user is in, if notifications are enabled for that guild
                    for (const [guildId, guild] of guilds) {
                        try {
                            const member = await guild.members.fetch(userId).catch(() => null);
                            if (!member) continue; // User is not in this guild

                            const guildSettings = await getGuildSettings(guildId);
                            if (!guildSettings?.notificationsEnabled) continue;

                            const targetChannelId = guildSettings.notificationChannelId || NOTIFICATION_CHANNEL_ID;
                            const channel = guild.channels.cache.get(targetChannelId);

                            if (channel) {
                                const rankImageUrl = getRankImageUrl(notification.rank, notification.division);
                                const embed = new EmbedBuilder()
                                    .setColor(notification.type.includes("UP") ? 0x00ff00 : 0xff0000)
                                    .setTitle(notification.title || "ランク変動通知")
                                    .setAuthor({
                                        name: member.displayName,
                                        iconURL: member.user.displayAvatarURL()
                                    })
                                    .setDescription(`<@${userId}> のランクが変動しました。\n\n${notification.message}`)
                                    .setThumbnail(isValidUrl(rankImageUrl) ? rankImageUrl : null)
                                    .setTimestamp();

                                await channel.send({ embeds: [embed] });
                            }
                        } catch (guildError) {
                            console.error(`[ERROR] Failed to send notification to guild ${guildId}: ${guildError.message}`);
                        }
                    }

                    notificationCount++;
                } else {
                    console.log(`[INFO] No rank change for ${userId}`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to check rank for user ${userId}: ${error.message}`);
            }
        }

        console.log(`[OK] ランク更新チェックが完了しました。 (${notificationCount} 件の通知を送信)`);
    } catch (error) {
        console.error(`[エラー] すべてのユーザーのランク更新チェックに失敗しました: ${error.message}`);
    }
}

