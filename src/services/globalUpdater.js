import { getAllRegisteredAccounts, getValorantRank } from "./valorant.js";
import { checkRankChange, NOTIFICATION_CHANNEL_ID } from "./notificationService.js";
import { updateRankInAccount } from "./rankUpdate.js";
import { getGuildSettings } from "./guildSettings.js";
import { initializeRankRoles, getRoleName, getRoleColor, getRolePosition } from "./rankSync.js";
import { EmbedBuilder } from "discord.js";

/**
 * Perform a global update for all users across all guilds
 * Fetches each user's data once and then updates their roles/notifications in all guilds.
 * @param {Object} client - Discord client
 */
export async function performGlobalRankUpdate(client) {
    try {
        console.log("\n" + "=".repeat(60));
        console.log("Starting Global Rank Update");
        console.log("=".repeat(60));

        const accounts = await getAllRegisteredAccounts();
        console.log(`[INFO] Processing ${accounts.length} accounts`);

        // Get all guilds the bot is in
        const guilds = Array.from(client.guilds.cache.values());

        for (const account of accounts) {
            const userId = account.discordUserId;
            console.log(`\n[Processing User] ${account.username}#${account.tag} (${userId})`);

            try {
                // Fetch rank info ONCE per user
                const rankInfo = await getValorantRank(
                    account.username,
                    account.tag,
                    account.region,
                    account.platform,
                    userId,
                    client
                );

                if (!rankInfo) {
                    console.log(`[WARN] Skipping ${account.username}#${account.tag} due to API error or missing info`);
                    continue;
                }

                // Parse rank information
                let rankName = "Norank";
                let division = "";
                let rr = 0;

                if (typeof rankInfo === "object" && rankInfo !== null) {
                    rankName = rankInfo.rank || rankInfo.name || rankInfo.currentTierPatched || "Norank";
                    division = rankInfo.division || rankInfo.level || "";
                    rr = rankInfo.rr || 0;
                } else if (typeof rankInfo === "string") {
                    // Try to parse string format: "Bronze 1, RR: 28"
                    const match = rankInfo.match(/^([A-Za-z]+)\s+(\d+)/);
                    if (match) {
                        rankName = match[1];
                        division = match[2];

                        const rrMatch = rankInfo.match(/RR:\s*(\d+)/);
                        if (rrMatch) {
                            rr = parseInt(rrMatch[1]);
                        }
                    }
                }

                // Update rank in Firebase
                await updateRankInAccount(userId, rankName, division);

                // Check for rank changes (for notifications)
                const rankDataForNotification = {
                    rank: rankName,
                    division: division,
                    rr: rr
                };
                const notification = await checkRankChange(userId, rankDataForNotification);

                // Now iterate over guilds to update roles and send notifications
                for (const guild of guilds) {
                    try {
                        const member = await guild.members.fetch(userId).catch(() => null);
                        if (!member) continue;

                        const settings = await getGuildSettings(guild.id);

                        // 1. Update Roles
                        if (settings?.rankRolesEnabled) {
                            await syncMemberRole(guild, member, rankName, division);
                        }

                        // 2. Send Notifications
                        if (notification && settings?.notificationsEnabled) {
                            await sendRankNotification(guild, userId, notification, settings);
                        }

                    } catch (guildError) {
                        console.error(`[ERROR] Failed to process guild ${guild.id} for user ${userId}: ${guildError.message}`);
                    }
                }

            } catch (userError) {
                console.error(`[ERROR] Failed to process user ${userId}: ${userError.message}`);
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("Global Rank Update Completed");
        console.log("=".repeat(60));
    } catch (error) {
        console.error("[CRITICAL ERROR] performGlobalRankUpdate failed:", error);
    }
}

/**
 * Sync rank role for a specific member in a guild
 */
async function syncMemberRole(guild, member, rankName, division) {
    try {
        const isRankRole = (name) => {
            const ranks = ["Unranked", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"];
            return ranks.some(r => name.includes(r));
        };

        const roleName = rankName === "Norank" || rankName === "Unranked" ? "Unranked1" : getRoleName(rankName, division);

        let role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            // Role initialization is usually done separately, but we could try to create it here if needed
            // For now, assume initializeRankRoles has been run
            return;
        }

        // Remove old rank roles
        const oldRankRoles = member.roles.cache.filter(r => isRankRole(r.name) && r.name !== roleName);
        for (const oldRole of oldRankRoles.values()) {
            await member.roles.remove(oldRole, "Rank update");
        }

        // Add new rank role
        if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role, "Rank update");
            console.log(`[INFO] Updated role for ${member.user.username} in ${guild.name} to ${roleName}`);
        }
    } catch (error) {
        console.error(`[ERROR] syncMemberRole failed for ${member.user.id} in ${guild.id}: ${error.message}`);
    }
}

/**
 * Send rank notification to a guild
 */
async function sendRankNotification(guild, userId, notification, settings) {
    try {
        const targetChannelId = settings.notificationChannelId || NOTIFICATION_CHANNEL_ID;
        const channel = guild.channels.cache.get(targetChannelId);

        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(notification.type.includes("UP") ? 0x00ff00 : 0xff0000)
                .setTitle(notification.title || "ランク変動通知")
                .setDescription(`${notification.emoji} <@${userId}> のランクが変動しました！\n\n${notification.message}`)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error(`[ERROR] sendRankNotification failed in ${guild.id}: ${error.message}`);
    }
}
