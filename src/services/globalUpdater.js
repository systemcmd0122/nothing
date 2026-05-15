import { getAllRegisteredAccounts, getValorantRank } from "./valorant.js";
import { checkRankChange, NOTIFICATION_CHANNEL_ID } from "./notificationService.js";
import { updateRankInAccount } from "./rankUpdate.js";
import { getGuildSettings } from "./guildSettings.js";
import { initializeRankRoles, getRoleName, getRoleColor, getRolePosition } from "./rankSync.js";
import { EmbedBuilder } from "discord.js";
import { updateRankBoard } from "./rankBoardService.js";

/**
 * Perform a global update for all users across all guilds
 * Fetches each user's data once and then updates their roles/notifications in all guilds.
 * @param {Object} client - Discord client
 */
export async function performGlobalRankUpdate(client) {
    try {
        console.log("\n" + "=".repeat(60));
        console.log("一斉ランク更新を開始します");
        console.log("=".repeat(60));

        const accounts = await getAllRegisteredAccounts();
        console.log(`[情報] ${accounts.length} 件のアカウントを処理中...`);

        // Get all guilds the bot is in
        const guilds = Array.from(client.guilds.cache.values());

        for (const account of accounts) {
            const userId = account.discordUserId;
            console.log(`\n[ユーザー処理] ${account.username}#${account.tag} (${userId})`);

            // API負荷軽減のためのディレイ (3秒)
            await new Promise(resolve => setTimeout(resolve, 3000));

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
                    console.log(`[警告] APIエラーのため ${account.username}#${account.tag} のランク更新をスキップします`);

                    // APIエラー時は以前のランクを維持しつつ、「取得失敗」ロールを付与する
                    for (const guild of guilds) {
                        try {
                            const member = await guild.members.fetch(userId).catch(() => null);
                            if (!member) continue;

                            const errorRole = guild.roles.cache.find(r => r.name === "取得失敗");
                            if (errorRole && !member.roles.cache.has(errorRole.id)) {
                                await member.roles.add(errorRole, "API取得エラー");
                                console.log(`[情報] ${guild.name} で ${member.user.username} に「取得失敗」ロールを付与しました`);
                            }
                        } catch (err) {
                            console.error(`[エラー] ギルド ${guild.id} でのエラーロール付与に失敗しました: ${err.message}`);
                        }
                    }
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

                        // 取得成功時は「取得失敗」ロールを削除
                        const errorRole = member.roles.cache.find(r => r.name === "取得失敗");
                        if (errorRole) {
                            await member.roles.remove(errorRole, "API取得成功");
                            console.log(`[情報] ${guild.name} で ${member.user.username} から「取得失敗」ロールを削除しました`);
                        }

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
                        console.error(`[エラー] ギルド ${guild.id} (ユーザー ${userId}) の処理に失敗しました: ${guildError.message}`);
                    }
                }

            } catch (userError) {
                console.error(`[エラー] ユーザー ${userId} の処理に失敗しました: ${userError.message}`);
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("一斉ランク更新が完了しました。リーダーボードを更新します...");
        console.log("=".repeat(60));

        // Update rank boards for all guilds
        for (const guild of guilds) {
            try {
                await updateRankBoard(guild, accounts);
            } catch (boardError) {
                console.error(`[エラー] ギルド ${guild.id} のリーダーボード更新に失敗しました: ${boardError.message}`);
            }
        }

    } catch (error) {
        console.error("[重大なエラー] performGlobalRankUpdate が失敗しました:", error);
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
            await member.roles.add(role, "ランク更新");
            console.log(`[情報] ${guild.name} で ${member.user.username} のロールを ${roleName} に更新しました`);
        }
    } catch (error) {
        console.error(`[エラー] ギルド ${guild.id} (ユーザー ${member.user.id}) のロール同期に失敗しました: ${error.message}`);
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
