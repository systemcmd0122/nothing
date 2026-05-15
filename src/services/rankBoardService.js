import { EmbedBuilder } from "discord.js";
import { getAllRegisteredAccounts } from "./valorant.js";
import { getGuildSettings, updateGuildSettings } from "./guildSettings.js";

/**
 * Generate rank board embed for a guild
 * @param {Object} guild - Discord guild
 * @param {Array} accounts - All registered accounts (optional, will fetch if not provided)
 * @returns {Promise<EmbedBuilder>} - Rank board embed
 */
export async function generateRankBoardEmbed(guild, accounts = null) {
    if (!accounts) {
        accounts = await getAllRegisteredAccounts();
    }

    const filteredAccounts = [];
    const userIds = accounts.map(a => a.discordUserId);

    // Bulk fetch members who are in the guild
    try {
        // Fetching all members might be heavy, but we only need those who are registered.
        // Discord.js allows fetching multiple members by IDs.
        const members = await guild.members.fetch({ user: userIds }).catch(() => new Map());

        for (const account of accounts) {
            const member = members.get(account.discordUserId);
            if (member) {
                filteredAccounts.push({
                    ...account,
                    displayName: member.displayName
                });
            }
        }
    } catch (err) {
        console.error(`[ERROR] Failed to fetch members for guild ${guild.id}:`, err.message);
    }

    // Sort accounts by rank
    const rankOrder = ["Radiant", "Immortal", "Ascendant", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron", "Unranked"];

    const sortedAccounts = filteredAccounts.sort((a, b) => {
        const aRank = a.currentRank || "Unranked";
        const bRank = b.currentRank || "Unranked";

        const aRankIndex = rankOrder.indexOf(aRank);
        const bRankIndex = rankOrder.indexOf(bRank);

        if (aRankIndex !== bRankIndex) {
            return aRankIndex - bRankIndex;
        }

        // Same rank, compare division
        const aDiv = parseInt(a.currentDivision) || 0;
        const bDiv = parseInt(b.currentDivision) || 0;

        if (aDiv !== bDiv) {
            return bDiv - aDiv; // Higher division first (e.g., Diamond 3 > Diamond 1)
        }

        // Same division, compare RR
        return (b.currentRR || 0) - (a.currentRR || 0);
    });

    const embed = new EmbedBuilder()
        .setColor(0xFF4655)
        .setTitle(`${guild.name} ランクリーダーボード`)
        .setDescription(sortedAccounts.length > 0 ? "サーバー内の登録ユーザーのランク一覧です。" : "登録されているユーザーがいません。")
        .setThumbnail("https://images.contentstack.io/v3/assets/blte86e01ceef8673ff/blt359f4da304976efd/5ecf4fcd588cd249ce331205/Valorant_logo_Large.png")
        .setTimestamp()
        .setFooter({ text: "自動更新中", iconURL: guild.client.user.displayAvatarURL() });

    if (sortedAccounts.length > 0) {
        let boardText = "";
        sortedAccounts.forEach((account, index) => {
            const divisionStr = account.currentRank === "Radiant" || account.currentRank === "Unranked" ? "" : account.currentDivision;
            const rankStr = `${account.currentRank} ${divisionStr}`.trim();
            const rrStr = account.currentRR !== undefined ? ` (${account.currentRR} RR)` : "";

            boardText += `**${index + 1}.** **${account.displayName}**\n \`${rankStr}${rrStr}\` (${account.username}#${account.tag})\n\n`;
        });

        // Split into multiple fields if too long (Discord embed field limit is 1024 chars)
        if (boardText.length > 1024) {
            const lines = boardText.split('\n\n');
            let currentField = "";
            let fieldCount = 1;

            for (const line of lines) {
                if (line.trim() === "") continue;
                if (currentField.length + line.length + 2 > 1024) {
                    embed.addFields({ name: fieldCount === 1 ? "ランク一覧" : "続・ランク一覧", value: currentField });
                    currentField = line + "\n\n";
                    fieldCount++;
                } else {
                    currentField += line + "\n\n";
                }
            }
            if (currentField) {
                embed.addFields({ name: fieldCount === 1 ? "ランク一覧" : "続・ランク一覧", value: currentField });
            }
        } else {
            embed.addFields({ name: "ランク一覧", value: boardText });
        }
    }

    return embed;
}

/**
 * Update rank board in a guild
 * @param {Object} guild - Discord guild
 * @param {Array} accounts - All registered accounts (optional)
 * @returns {Promise<void>}
 */
export async function updateRankBoard(guild, accounts = null) {
    try {
        const settings = await getGuildSettings(guild.id);
        if (!settings || !settings.rankBoardChannelId || !settings.rankBoardMessageId) {
            return;
        }

        const channel = await guild.channels.fetch(settings.rankBoardChannelId).catch(() => null);
        if (!channel) {
            console.warn(`[WARN] Rank board channel not found in guild ${guild.name} (${guild.id})`);
            return;
        }

        const message = await channel.messages.fetch(settings.rankBoardMessageId).catch(() => null);
        if (!message) {
            console.warn(`[WARN] Rank board message not found in guild ${guild.name} (${guild.id})`);
            return;
        }

        const embed = await generateRankBoardEmbed(guild, accounts);
        await message.edit({ embeds: [embed] });
        console.log(`[OK] Updated rank board in guild ${guild.name} (${guild.id})`);
    } catch (error) {
        console.error(`[ERROR] Failed to update rank board in guild ${guild.name}:`, error.message);
    }
}

