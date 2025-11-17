import axios from "axios";
import { db } from "../config/firebase.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readdirSync, existsSync } from "fs";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rankImagesDir = join(__dirname, "../../rank");

const VALORANT_API_BASE = process.env.VALORANT_API_URL || "https://vaccie.pythonanywhere.com";

/**
 * Register a Valorant account for a user
 * @param {string} userId - Discord user ID
 * @param {string} username - Valorant username
 * @param {string} tag - Valorant tag (e.g., "666")
 * @param {string} region - Region (e.g., "eu", "na", "ap")
 * @param {string} platform - Platform (pc or console)
 * @returns {Promise<Object>} - Firestore document reference
 */
export async function registerValorantAccount(
  userId,
  username,
  tag,
  region,
  platform = "pc"
) {
  try {
    // Check if user already has a registered account
    const q = query(
      collection(db, "valorant_accounts"),
      where("discordUserId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    let docRef;
    if (!querySnapshot.empty) {
      // Update existing account
      const existingDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, "valorant_accounts", existingDoc.id), {
        username,
        tag,
        region,
        platform,
        updatedAt: new Date(),
      });
      docRef = existingDoc.id;
    } else {
      // Create new account
      docRef = await addDoc(collection(db, "valorant_accounts"), {
        discordUserId: userId,
        username,
        tag,
        region,
        platform,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { success: true, message: "アカウントが登録されました！" };
  } catch (error) {
    console.error("Error registering Valorant account:", error);
    return { success: false, message: `エラー: ${error.message}` };
  }
}

/**
 * Get registered Valorant account for a user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} - User's Valorant account or null
 */
export async function getValorantAccount(userId) {
  try {
    const q = query(
      collection(db, "valorant_accounts"),
      where("discordUserId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data();
  } catch (error) {
    console.error("Error getting Valorant account:", error);
    return null;
  }
}

/**
 * Get Valorant rank from API
 * @param {string} username - Valorant username
 * @param {string} tag - Valorant tag
 * @param {string} region - Region (e.g., "eu", "na", "ap")
 * @param {string} platform - Platform (pc or console)
 * @returns {Promise<string>} - Rank information
 */
export async function getValorantRank(username, tag, region, platform = "pc") {
  try {
    const url = `${VALORANT_API_BASE}/mmr/${username}/${tag}/${region}${
      platform === "console" ? "/console" : ""
    }`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error("Error fetching Valorant rank:", error.message);
    return "ランク情報を取得できませんでした。ユーザー名、タグ、リージョンを確認してください。";
  }
}

/**
 * Get Valorant match history from API
 * @param {string} username - Valorant username
 * @param {string} tag - Valorant tag
 * @param {string} region - Region (e.g., "eu", "na", "ap")
 * @param {string} platform - Platform (pc or console)
 * @param {string} timezone - Timezone (optional)
 * @returns {Promise<string>} - Match history information
 */
export async function getValorantMatchHistory(
  username,
  tag,
  region,
  platform = "pc",
  timezone = "Europe/Rome"
) {
  try {
    const url = `${VALORANT_API_BASE}/match_history/${username}/${tag}/${region}/${platform}?timezone=${timezone}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error("Error fetching Valorant match history:", error.message);
    return "マッチ履歴を取得できませんでした。ユーザー名、タグ、リージョンを確認してください。";
  }
}

/**
 * Get rank image path based on rank name and division
 * @param {string} rankName - Rank name (e.g., "Bronze", "Iron", "Radiant")
 * @param {number|string} division - Division number (1, 2, 3, or empty for Radiant/Norank)
 * @returns {string} - Image file path (returns Norank.jpg as fallback)
 */
export function getRankImagePath(rankName, division = "") {
  try {
    if (!rankName || rankName === "Unranked" || rankName === "Norank") {
      const norankPath = join(rankImagesDir, "Norank.jpg");
      console.log("No rank detected, using Norank.jpg");
      return norankPath;
    }

    // Normalize rank name
    const normalizedRank = rankName.trim().toLowerCase();
    
    // Radiant has no division
    if (normalizedRank === "radiant") {
      const radiantPath = join(rankImagesDir, "Radiant_Rank.jpg");
      if (existsSync(radiantPath)) {
        console.log(`Found rank image: Radiant_Rank.jpg`);
        return radiantPath;
      }
    }

    // Normalize division (default to 1 if not specified or 0)
    let normalizedDiv = "1";
    if (division && division !== "0") {
      normalizedDiv = String(division).match(/\d/) ? String(division) : "1";
    }

    // Map rank names to file names
    const rankNameMap = {
      "iron": "Iron",
      "bronze": "Bronze",
      "silver": "Silver",
      "gold": "Gold",
      "platinum": "Platinum",
      "diamond": "Diamond",
      "ascendant": "Ascendant",
      "immortal": "Immortal",
      "radiant": "Radiant",
    };

    const rankPrefix = rankNameMap[normalizedRank];
    
    if (!rankPrefix) {
      console.warn(`Unknown rank: ${rankName}, using Norank.jpg`);
      return join(rankImagesDir, "Norank.jpg");
    }

    // Construct filename
    let fileName;
    if (rankPrefix === "Radiant") {
      fileName = "Radiant_Rank.jpg";
    } else {
      fileName = `${rankPrefix}_${normalizedDiv}_Rank.jpg`;
    }

    const imagePath = join(rankImagesDir, fileName);

    // Check if file exists
    if (existsSync(imagePath)) {
      console.log(`Found rank image: ${fileName}`);
      return imagePath;
    } else {
      console.warn(`Rank image not found: ${fileName}, using Norank.jpg`);
      return join(rankImagesDir, "Norank.jpg");
    }
  } catch (error) {
    console.error("Error getting rank image path:", error);
    return join(rankImagesDir, "Norank.jpg");
  }
}

/**
 * Get all registered Valorant accounts
 * @returns {Promise<Array>} - Array of registered accounts with user IDs
 */
export async function getAllRegisteredAccounts() {
  try {
    const q = query(collection(db, "valorant_accounts"));
    const querySnapshot = await getDocs(q);

    const accounts = [];
    querySnapshot.forEach((doc) => {
      accounts.push({
        discordUserId: doc.data().discordUserId,
        username: doc.data().username,
        tag: doc.data().tag,
        region: doc.data().region,
        platform: doc.data().platform,
      });
    });

    return accounts;
  } catch (error) {
    console.error("Error fetching all registered accounts:", error);
    return [];
  }
}
