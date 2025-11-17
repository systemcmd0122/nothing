import { db } from "../config/firebase.js";
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";

/**
 * Update rank information in valorant_accounts
 * @param {string} userId - Discord user ID
 * @param {string} rankName - Current rank name (e.g., "Bronze")
 * @param {string} division - Current division (e.g., "2")
 * @returns {Promise<boolean>} - Success status
 */
export async function updateRankInAccount(userId, rankName, division) {
  try {
    const q = query(
      collection(db, "valorant_accounts"),
      where("discordUserId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`[ERROR] No account found for user ${userId}`);
      return false;
    }

    const docId = querySnapshot.docs[0].id;
    const currentData = querySnapshot.docs[0].data();

    // Update the account with new rank information
    await updateDoc(doc(db, "valorant_accounts", docId), {
      currentRank: rankName,
      currentDivision: division,
      lastRankUpdate: new Date(),
      rankHistory: {
        previousRank: currentData.currentRank || null,
        previousDivision: currentData.currentDivision || null,
        previousUpdateTime: currentData.lastRankUpdate || null,
      },
    });

    console.log(`[OK] Updated rank for ${userId}: ${rankName}${division}`);
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to update rank: ${error.message}`);
    return false;
  }
}
