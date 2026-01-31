import { db } from "../config/firebase.js";
import { EmbedBuilder } from "discord.js";

const NOTIFICATION_CHANNEL_ID = "1438781172997165147";

// Helper to construct the base URL for images
function getBaseUrl() {
    if (process.env.APP_URL) {
        return process.env.APP_URL;
    }
    if (process.env.KOYEB_DOMAIN) {
        return `https://${process.env.KOYEB_DOMAIN}`;
    }
    return `http://localhost:${process.env.PORT || 3000}`;
}

// Helper to get the rank image file name
function getRankImageFile(rankName, division) {
    if (!rankName || rankName === 'Unranked' || rankName === 'Norank') {
        return 'Norank.jpg';
    }
    if (rankName === 'Radiant') {
        return 'Radiant_Rank.jpg';
    }
    if (division) {
        return `${rankName}_${division}_Rank.jpg`;
    }
    return 'Norank.jpg'; // Fallback
}

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
 * Compare two ranks and determine if there's a change
 * @param {Object} lastRank - Last recorded rank
 * @param {string} currentRankName - Current rank name
 * @param {string} currentDivision - Current division
 * @returns {Object} - Change info { hasChanged, type, description }
 */
function compareRanks(lastRank, currentRankName, currentDivision) {
  if (!lastRank) {
    // No previous rank record
    return {
      hasChanged: false,
      type: null,
      description: "No previous rank record",
    };
  }

  const lastRankName = lastRank.rankName || "Norank";
  const lastDivision = lastRank.division || "";

  // Norank to ranked - don't notify
  if (lastRankName === "Norank" || lastRankName === "Unranked") {
    if (currentRankName !== "Norank" && currentRankName !== "Unranked") {
      return {
        hasChanged: false,
        type: null,
        description: "Norank to ranked - no notification",
      };
    }
  }

  // Ranked to Norank
  if (
    (currentRankName === "Norank" || currentRankName === "Unranked") &&
    lastRankName !== "Norank" &&
    lastRankName !== "Unranked"
  ) {
    return {
      hasChanged: true,
      type: "derank",
      description: `${lastRankName}${lastDivision} → Unranked`,
    };
  }

  // Same rank, different division
  if (lastRankName === currentRankName && lastDivision !== currentDivision) {
    const isPromoted = parseInt(currentDivision) > parseInt(lastDivision);
    return {
      hasChanged: true,
      type: isPromoted ? "promote" : "demote",
      description: `${lastRankName}${lastDivision} → ${currentRankName}${currentDivision}`,
    };
  }

  // Different rank tier
  if (lastRankName !== currentRankName) {
    const lastOrder = getRankOrder(lastRankName);
    const currentOrder = getRankOrder(currentRankName);

    if (currentOrder > lastOrder) {
      return {
        hasChanged: true,
        type: "rankup",
        description: `${lastRankName} → ${currentRankName}${currentDivision}`,
      };
    } else if (currentOrder < lastOrder) {
      return {
        hasChanged: true,
        type: "rankdown",
        description: `${lastRankName}${lastDivision} → ${currentRankName}${currentDivision}`,
      };
    }
  }

  return {
    hasChanged: false,
    type: null,
    description: "No rank change",
  };
}

/**
 * Send rank change notification to Discord channel
 * @param {Object} client - Discord client
 * @param {Object} member - Discord member object
 * @param {string} username - Valorant username
 * @param {string} tag - Valorant tag
 * @param {Object} changeInfo - Change info from compareRanks
 * @param {string} currentRankName - The new rank name
 * @param {string} currentDivision - The new rank division
 * @returns {Promise<void>}
 */
async function sendRankNotification(client, member, username, tag, changeInfo, currentRankName, currentDivision) {
  try {
    const channel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
    if (!channel) {
      console.warn(
        `▶ Notification channel not found: ${NOTIFICATION_CHANNEL_ID}`
      );
      return;
    }

    let title = "";
    let color = 0xffffff;

    switch (changeInfo.type) {
      case "rankup":
        title = "RANK UP!";
        color = 0x00ff00;
        break;
      case "promote":
        title = "PROMOTED!";
        color = 0x00aa00;
        break;
      case "rankdown":
        title = "RANK DOWN";
        color = 0xff6600;
        break;
      case "demote":
        title = "DEMOTED";
        color = 0xcc0000;
        break;
      case "derank":
        title = "LOST RANK";
        color = 0xff0000;
        break;
      default:
        return;
    }
    
    const baseUrl = getBaseUrl();
    const rankImageFile = getRankImageFile(currentRankName, currentDivision);
    const rankImageUrl = `${baseUrl}/ranks/${rankImageFile}`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: `${member.displayName}'s Rank Changed`, iconURL: member.displayAvatarURL({ size: 64 }) })
      .setTitle(title)
      .setDescription(
        `${member} had a rank change!`
      )
      .addFields(
        {
          name: "▶ Valorant ID",
          value: `${username}#${tag}`,
          inline: true,
        },
        {
          name: ">>> Change",
          value: changeInfo.description,
          inline: true,
        }
      )
      .setThumbnail(rankImageUrl)
      .setFooter({
        text: "Valorant Rank Notification",
        iconURL: client.user.displayAvatarURL({ size: 64 }),
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log(
      `[OK] Sent notification: ${member.user.username} - ${changeInfo.description}`
    );
  } catch (error) {
    console.error("[ERROR] Error sending rank notification:", error);
  }
}

/**
 * Check rank changes and send notifications
 * @param {Object} client - Discord client
 * @param {Object} guild - Discord guild object
 * @param {Object} account - Valorant account data
 * @param {string} currentRankName - Current rank name
 * @param {string} currentDivision - Current division
 * @returns {Promise<boolean>} - True if notification was sent
 */
export async function checkAndNotifyRankChange(
  client,
  guild,
  account,
  currentRankName,
  currentDivision
) {
  try {
    // Compare ranks
    const changeInfo = compareRanks(account, currentRankName, currentDivision);

    if (!changeInfo.hasChanged) {
      return false;
    }

    // Get member to send notification
    let member;
    try {
      member = await guild.members.fetch(account.discordUserId);
    } catch (error) {
      console.log(`▶ Not in guild: ${account.discordUserId}`);
      return false;
    }

    // Send notification
    await sendRankNotification(client, member, account.username, account.tag, changeInfo, currentRankName, currentDivision);

    return true;
  } catch (error) {
    console.error("[ERROR] Error checking rank change:", error);
    return false;
  }
}

export { NOTIFICATION_CHANNEL_ID };
