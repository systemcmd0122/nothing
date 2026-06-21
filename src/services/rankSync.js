import { getAllRegisteredAccounts, getValorantRank } from "./valorant.js";
import { checkRankChange, saveRankStatus, NOTIFICATION_CHANNEL_ID } from "./notificationService.js";
import { updateRankInAccount } from "./rankUpdate.js";
import { getGuildSettings } from "./guildSettings.js";
import { getUserGuildSettings } from "./userGuildSettings.js";
import { EmbedBuilder } from "discord.js";
import { db } from "../config/firebase.js";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { getRankImageUrl, isValidUrl } from "../utils/url.js";

// ランク情報とロール対応 - すべてのランクに1-3のディビジョンを含む
const RANK_INFO = {
  "Unranked": { order: 0, color: 0x808080, divisions: 1 },   // グレー
  "Iron": { order: 1, color: 0x696969, divisions: 3 },       // Iron
  "Bronze": { order: 2, color: 0xCD7F32, divisions: 3 },     // Bronze
  "Silver": { order: 3, color: 0xC0C0C0, divisions: 3 },     // Silver
  "Gold": { order: 4, color: 0xFFD700, divisions: 3 },       // Gold
  "Platinum": { order: 5, color: 0x66D1C7, divisions: 3 },   // Platinum
  "Diamond": { order: 6, color: 0x6F85FF, divisions: 3 },    // Diamond
  "Ascendant": { order: 7, color: 0xA6E05A, divisions: 3 },  // Ascendant
  "Immortal": { order: 8, color: 0xC4005E, divisions: 3 },   // Immortal
  "Radiant": { order: 9, color: 0xFFE26A, divisions: 1 },    // Radiant
  "取得失敗": { order: -1, color: 0x000000, divisions: 1 },   // 取得失敗 (黒)
};

/**
 * Get role name for a rank with division
 * @param {string} rankName - Rank name (e.g., "Bronze")
 * @param {string} division - Division number (1-3, or empty for Radiant)
 * @returns {string} - Role name (e.g., "Bronze1", "Radiant1", "Unranked1")
 */
export function getRoleName(rankName, division) {
  // Handle Radiant and Unranked
  if (rankName === "Radiant" && (!division || division === "")) {
    return "Radiant1";
  }
  if (rankName === "Unranked" || !division || division === "") {
    return "Unranked1";
  }
  
  // All other ranks with division
  return `${rankName}${division}`;
}

/**
 * Get role color for a rank
 * @param {string} rankName - Rank name (e.g., "Bronze")
 * @returns {number} - Discord color code
 */
export function getRoleColor(rankName) {
  // Clean up rank name if it has division number
  const cleanRankName = rankName.replace(/\d+$/, '');
  return RANK_INFO[cleanRankName]?.color || RANK_INFO["Unranked"].color;
}

/**
 * Get position (order) for a rank
 * @param {string} rankName - Rank name (e.g., "Bronze")
 * @returns {number} - Position value (higher = more right and up in Discord)
 */
export function getRolePosition(rankName) {
  // Clean up rank name if it has division number
  const cleanRankName = rankName.replace(/\d+$/, '');
  return RANK_INFO[cleanRankName]?.order || 0;
}

/**
 * Check if a role is a rank role
 * @param {string} roleName - Role name
 * @returns {boolean}
 */
export function isRankRole(roleName) {
  return Object.keys(RANK_INFO).some((rank) => roleName.includes(rank)) && roleName !== "取得失敗";
}

/**
 * すべてのランクロールをメンバーから削除する
 * @param {Object} member - Discord member object
 */
export async function removeAllRankRoles(member) {
  try {
    const oldRankRoles = member.roles.cache.filter((role) => isRankRole(role.name));
    for (const oldRole of oldRankRoles.values()) {
      try {
        await member.roles.remove(oldRole, "連携解除またはランク更新によるロール削除");
        console.log(`[情報] ${member.guild.name} で ${member.user.username} から ${oldRole.name} を削除しました`);
      } catch (err) {
        console.warn(`Failed to remove role ${oldRole.name}:`, err.message);
      }
    }
  } catch (error) {
    console.error(`[エラー] ロールの削除に失敗しました: ${error.message}`);
  }
}

/**
 * Initialize all rank roles in a guild
 * @param {Object} guild - Discord guild object
 * @returns {Promise<void>}
 */
export async function initializeRankRoles(guild) {
  try {
    console.log("Initializing Rank Roles");
    console.log(`Guild: ${guild.name} (ID: ${guild.id})`);

    let createdCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    // Fetch all roles to ensure we have the latest data
    await guild.roles.fetch();

    for (const [rankName, rankData] of Object.entries(RANK_INFO)) {
      // Create roles for each division (1-3)
      const divisionsToCreate = rankData.divisions || 1;

      for (let div = 1; div <= divisionsToCreate; div++) {
        let roleName;
        if (rankName === "Unranked") {
          roleName = "Unranked1";
        } else if (rankName === "取得失敗") {
          roleName = "取得失敗";
        } else {
          roleName = `${rankName}${div}`;
        }
        
        try {
          // Check if role already exists by name
          let role = guild.roles.cache.find((r) => r.name === roleName);

          if (role) {
            // Role already exists - do nothing
            console.log(`  Existing: ${roleName}`);
            existingCount++;
            continue;
          }

          // Create role if it doesn't exist
          try {
            role = await guild.roles.create({
              name: roleName,
              color: rankData.color,
              reason: `Rank role initialization: ${rankName} Division ${div}`,
              hoist: true, // Display role members separately
              mentionable: false, // Don't allow mentioning
            });
            console.log(`  [OK] Created: ${roleName}`);
            createdCount++;
            
            // API rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (createError) {
            if (createError.code === 30013) {
              // Maximum number of roles reached
              console.warn(
                `  Limit: Maximum number of roles reached: ${roleName}`
              );
              errorCount++;
              continue;
            } else if (createError.code === 50013) {
              // Missing permissions
              console.warn(
                `  Permission: Missing role creation permission: ${roleName}`
              );
              errorCount++;
              continue;
            } else if (
              createError.message &&
              createError.message.includes("Already exists")
            ) {
              // Role already exists - fetch it
              await guild.roles.fetch();
              role = guild.roles.cache.find((r) => r.name === roleName);
              if (role) {
                console.log(`  Existing: ${roleName}`);
                existingCount++;
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        } catch (loopError) {
          console.error(`  [ERROR] Processing error ${roleName}:`, loopError.message);
          errorCount++;
        }
      }
    }

    console.log(`実行結果: 作成=${createdCount} 既存=${existingCount} エラー=${errorCount}`);
    console.log("ランクロールの初期化が完了しました");
  } catch (error) {
    console.error("[エラー] ランクロール初期化エラー:", error);
    throw error;
  }
}

/**
 * Sync all user ranks and assign roles
 * @param {Object} guild - Discord guild object
 * @param {Object} client - Discord client object (optional, for notifications)
 * @returns {Promise<Object>} - Sync results { processed, updated, errors }
 */
export async function syncAllUserRanks(guild, client = null) {
  try {
    const results = {
      processed: 0,
      updated: 0,
      errors: [],
    };

    const settings = await getGuildSettings(guild.id);
    if (!settings?.rankRolesEnabled) {
      console.log(`[INFO] Rank roles disabled for guild ${guild.name} (${guild.id})`);
      return results;
    }

    // Fetch all roles to ensure we have the latest data
    await guild.roles.fetch();

    // Get all registered accounts
    const accounts = await getAllRegisteredAccounts();
    console.log(`同期対象: ${accounts.length} アカウント`);

    if (accounts.length === 0) {
      console.log("登録されているアカウントはありません");
      return results;
    }

    for (const account of accounts) {
      try {
        console.log(`${account.username}#${account.tag}...`);
        
        // Fetch member from guild
        let member;
        try {
          member = await guild.members.fetch(account.discordUserId);
        } catch (error) {
          console.log(`  Not in guild`);
          results.errors.push({
            userId: account.discordUserId,
            reason: "Member not found in guild",
          });
          continue;
        }

        // Check user privacy settings for this guild
        const userGuildSettings = await getUserGuildSettings(account.discordUserId, guild.id);
        const isLinkEnabled = userGuildSettings?.accountLinkEnabled !== false;

        if (!isLinkEnabled) {
          // Remove all rank roles if linking is disabled
          await removeAllRankRoles(member);
          results.processed++;
          continue;
        }

        // Get rank info using the same method as rank.js
        const rankInfo = await getValorantRank(
          account.username,
          account.tag,
          account.region,
          account.platform,
          account.discordUserId,
          client
        );

        // Parse rank information (same as rank.js)
        let rankName = "Norank";
        let division = "";

        // API がテキスト形式で返す場合と JSON 形式で返す場合の両方に対応
        if (typeof rankInfo === "string") {
          // テキスト形式: "Bronze 1, RR: 28 (-30)  (🛡️ 2)"
          const rankMatch = rankInfo.match(/^([A-Za-z]+)\s+(\d+)/);
          if (rankMatch) {
            rankName = rankMatch[1]; // "Bronze"
            division = rankMatch[2]; // "1"
          } else if (rankInfo.includes("を取得できませんでした")) {
            console.warn(`[ERROR] API Error for ${account.username}#${account.tag}: ${rankInfo}`);
            results.errors.push({
              userId: account.discordUserId,
              reason: `API Error: ${rankInfo}`,
            });
            continue;
          }
        } else if (typeof rankInfo === "object" && rankInfo !== null) {
          // JSON 形式
          rankName = rankInfo.rank || rankInfo.name || rankInfo.currentTierPatched || "Norank";
          division = rankInfo.division || rankInfo.level || "";
        }

        if (rankName === "Norank") {
          console.log(`No rank found for ${account.username}#${account.tag} - assigning Unranked role`);
          
          // Find or create Unranked role
          const unrankedRoleName = "Unranked1";
          
          // Fresh fetch to ensure we get the latest roles
          await guild.roles.fetch().catch(() => null);
          let unrankedRole = guild.roles.cache.find((r) => r.name === unrankedRoleName);
          
          if (!unrankedRole) {
            // This shouldn't happen as initializeRankRoles should have created it
            try {
              unrankedRole = await guild.roles.create({
                name: unrankedRoleName,
                color: RANK_INFO.Unranked.color,
                reason: "Unranked role for users without rank",
                hoist: true,
                mentionable: false,
              });
              console.log(`  [OK] Created Unranked role: ${unrankedRole.id}`);
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
              // Retry fetching if creation fails due to race condition
              await guild.roles.fetch().catch(() => null);
              unrankedRole = guild.roles.cache.find((r) => r.name === unrankedRoleName);
              
              if (!unrankedRole) {
                console.error(
                  `[ERROR] Failed to create Unranked role: ${error.message}`
                );
                results.errors.push({
                  userId: account.discordUserId,
                  reason: `Failed to create Unranked role: ${error.message}`,
                });
                results.processed++;
                continue;
              }
            }
          }

          // Remove old rank roles
          const oldRankRoles = member.roles.cache.filter((role) => {
            return isRankRole(role.name) && role.name !== unrankedRoleName;
          });

          for (const oldRole of oldRankRoles.values()) {
            try {
              await member.roles.remove(oldRole, "Rank update");
              console.log(`>>> Removed old role: ${oldRole.name}`);
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
              console.warn(`Failed to remove role ${oldRole.name}:`, error.message);
            }
          }

          // Assign Unranked role
          if (!member.roles.cache.has(unrankedRole.id)) {
            await member.roles.add(unrankedRole, "User is unranked");
            console.log(`[OK] Added Unranked role to ${member.user.username}`);
            
            // Update rank in valorant_accounts
            await updateRankInAccount(account.discordUserId, "Unranked", "");
            results.updated++;
          }

          results.processed++;
          continue;
        }

        // Get or create rank role
        const roleName = getRoleName(rankName, division);
        const roleColor = getRoleColor(rankName);
        const rolePosition = getRolePosition(rankName);

        console.log(`Role name: ${roleName}, Position: ${rolePosition}`);

        // Fresh fetch to ensure we get the latest roles
        await guild.roles.fetch().catch(() => null);
        let role = guild.roles.cache.find((r) => r.name === roleName);

        if (!role) {
          try {
            // Create role if it doesn't exist
            role = await guild.roles.create({
              name: roleName,
              color: roleColor,
              reason: `Rank role for ${rankName}`,
              hoist: true, // Display role members separately
              mentionable: false,
            });
            console.log(`[OK] Created role: ${roleName} (ID: ${role.id})`);
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            // Retry fetching if creation fails due to race condition
            await guild.roles.fetch().catch(() => null);
            role = guild.roles.cache.find((r) => r.name === roleName);
            
            if (role) {
              console.log(`Role already exists: ${roleName}`);
            } else {
              console.error(
                `[ERROR] Failed to create role ${roleName}: ${error.message}`
              );
              results.errors.push({
                userId: account.discordUserId,
                reason: `Failed to create role ${roleName}: ${error.message}`,
              });
              results.processed++;
              continue;
            }
          }
        }

        // Update role settings to display members separately
        if (role) {
          try {
            // Only update if settings need to be changed
            if (!role.hoist || role.mentionable) {
              await role.edit(
                { hoist: true, mentionable: false },
                "Update rank role settings"
              );
            }
          } catch (updateError) {
            console.warn(
              `Failed to update role settings ${roleName}:`,
              updateError.message
            );
          }
        }

        // Remove old rank roles
        const oldRankRoles = member.roles.cache.filter((role) => {
          return isRankRole(role.name) && role.name !== roleName;
        });

        let removedOldRoles = false;
        for (const oldRole of oldRankRoles.values()) {
          try {
            await member.roles.remove(oldRole, "Rank update");
            console.log(`>>> Removed old role: ${oldRole.name}`);
            removedOldRoles = true;
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.warn(
              `▶ Failed to remove role ${oldRole.name}:`,
              error.message
            );
          }
        }

        // Assign new rank role
        if (!member.roles.cache.has(role.id)) {
          await member.roles.add(role, `Rank sync: ${rankName}`);
          console.log(`[OK] Added role ${roleName} to ${member.user.username}`);
          results.updated++;
        } else {
          // ロール削除があった場合は更新カウントに含める
          if (removedOldRoles) {
            results.updated++;
            console.log(`[OK] Updated role to ${roleName} for ${member.user.username}`);
          } else {
            console.log(`${member.user.username} already has ${roleName}`);
          }
        }

        // Update rank in valorant_accounts
        await updateRankInAccount(account.discordUserId, rankName, division);

        // Check and notify rank changes
        if (client && settings.notificationsEnabled) {
            // Unify with notificationService
            const rankDataForNotification = {
                rank: rankName,
                division: division,
                rr: 0 // RR might not be available in all contexts, but checkRankChange needs it
            };

            const notification = await checkRankChange(account.discordUserId, rankDataForNotification);

            if (notification) {
                const targetChannelId = settings.notificationChannelId || NOTIFICATION_CHANNEL_ID;
                const channel = guild.channels.cache.get(targetChannelId) || client.channels.cache.get(targetChannelId);

                if (channel) {
                    const rankImageUrl = getRankImageUrl(notification.rank, notification.division);
                    const embed = new EmbedBuilder()
                        .setColor(notification.type.includes("UP") ? 0x00ff00 : 0xff0000)
                        .setTitle(notification.title || "ランク変動通知")
                        .setAuthor({
                            name: member.displayName,
                            iconURL: member.user.displayAvatarURL()
                        })
                        .setDescription(`<@${account.discordUserId}> のランクが変動しました。\n\n${notification.message}`)
                        .setThumbnail(isValidUrl(rankImageUrl) ? rankImageUrl : null)
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            }
        }

        results.processed++;
      } catch (error) {
        console.error(`[ERROR] Error processing account ${account.discordUserId}:`, error.message);
        results.errors.push({
          userId: account.discordUserId,
          reason: error.message,
        });
      }
    }

    console.log("-".repeat(50));
    console.log(`同期結果:`);
    console.log(`   処理済み: ${results.processed} アカウント`);
    console.log(`   更新済み: ${results.updated} アカウント`);
    console.log(`   エラー: ${results.errors.length} アカウント`);
    
    if (results.errors.length > 0) {
      console.log("\nエラー詳細:");
      results.errors.forEach((err) => {
        console.log(`   - ${err.userId}: ${err.reason}`);
      });
    }
    
    console.log("-".repeat(50));
    return results;
  } catch (error) {
    console.error("[ERROR] Rank sync error:", error);
    throw error;
  }
}
