import { db } from "../config/firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { EmbedBuilder } from "discord.js";

const NOTIFICATION_CHANNEL_ID = "1438781172997165147";

/**
 * Get the last recorded rank for a user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} - Last rank info or null
 */
async function getLastRecordedRank(userId) {
  try {
    const q = query(
      collection(db, "rank_history"),
      where("discordUserId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    // Get the most recent record (last in the collection)
    const docs = querySnapshot.docs;
    return docs[docs.length - 1].data();
  } catch (error) {
    console.error("[ERROR] Error getting last recorded rank:", error);
    return null;
  }
}

/**
 * Save current rank to history
 * @param {string} userId - Discord user ID
 * @param {string} username - Valorant username
 * @param {string} tag - Valorant tag
 * @param {string} rankName - Rank name (e.g., "Bronze")
 * @param {string} division - Division number (1-3)
 * @returns {Promise<void>}
 */
async function saveRankToHistory(userId, username, tag, rankName, division) {
  try {
    const historyRef = collection(db, "rank_history");
    const q = query(
      historyRef,
      where("discordUserId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    const rankData = {
      discordUserId: userId,
      username,
      tag,
      rankName,
      division,
      updatedAt: new Date(),
    };

    if (!querySnapshot.empty) {
      // Update existing record
      const docId = querySnapshot.docs[0].id;
      await updateDoc(doc(db, "rank_history", docId), rankData);
    } else {
      // Create new record
      await setDoc(doc(historyRef), {
        ...rankData,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error saving rank to history:", error);
  }
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
 * @returns {Promise<void>}
 */
async function sendRankNotification(client, member, username, tag, changeInfo) {
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
        title = "[OK] Rank Up!";
        color = 0x00ff00;
        break;
      case "promote":
        title = "[OK] Promoted!";
        color = 0x00aa00;
        break;
      case "rankdown":
        title = "[ERROR] Rank Down";
        color = 0xff6600;
        break;
      case "demote":
        title = "[ERROR] Demoted";
        color = 0xcc0000;
        break;
      case "derank":
        title = "[ERROR] Lost Rank";
        color = 0xff0000;
        break;
      default:
        return;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        `**${member.user.username}** had a rank change!`
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
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
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
    // Get last recorded rank
    const lastRank = await getLastRecordedRank(account.discordUserId);

    // Compare ranks
    const changeInfo = compareRanks(lastRank, currentRankName, currentDivision);

    // Save current rank to history
    await saveRankToHistory(
      account.discordUserId,
      account.username,
      account.tag,
      currentRankName,
      currentDivision
    );

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
    await sendRankNotification(client, member, account.username, account.tag, changeInfo);

    return true;
  } catch (error) {
    console.error("[ERROR] Error checking rank change:", error);
    return false;
  }
}

export { NOTIFICATION_CHANNEL_ID };
