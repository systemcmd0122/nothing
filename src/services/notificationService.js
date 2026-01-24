import { db } from "../config/firebase.js";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    query,
    where,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    onSnapshot,
} from "firebase/firestore";
import { getValorantAccount, getValorantRank } from "./valorant.js";

/**
 * Get or create notification settings for a user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} - Notification settings
 */
export async function getNotificationSettings(userId) {
    try {
        const docRef = doc(db, "notification_settings", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        }

        // Create default settings
        const defaultSettings = {
            userId,
            rankUpdateNotifications: true,
            rankUpNotifications: true,
            rankDownNotifications: true,
            patchNotifications: true,
            followedPlayersNotifications: true,
            dmNotifications: true,
            createdAt: new Date(),
        };

        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    } catch (error) {
        console.error(`[ERROR] Failed to get notification settings: ${error.message}`);
        return null;
    }
}

/**
 * Update notification settings
 * @param {string} userId - Discord user ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<boolean>} - Success status
 */
export async function updateNotificationSettings(userId, settings) {
    try {
        const docRef = doc(db, "notification_settings", userId);
        await updateDoc(docRef, {
            ...settings,
            updatedAt: new Date(),
        });
        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to update notification settings: ${error.message}`);
        return false;
    }
}

/**
 * Follow a player for rank updates
 * @param {string} userId - Discord user ID
 * @param {string} targetUserId - Target Discord user ID to follow
 * @returns {Promise<boolean>} - Success status
 */
export async function followPlayer(userId, targetUserId) {
    try {
        if (userId === targetUserId) {
            throw new Error("自分自身をフォローすることはできません");
        }

        const docRef = doc(db, "player_follows", userId);

        // Check if already following
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().following?.includes(targetUserId)) {
            throw new Error("既にこのプレイヤーをフォローしています");
        }

        await updateDoc(docRef, {
            following: arrayUnion(targetUserId),
            updatedAt: new Date(),
        }).catch(async () => {
            // Create doc if it doesn't exist
            await setDoc(docRef, {
                userId,
                following: [targetUserId],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });

        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to follow player: ${error.message}`);
        throw error;
    }
}

/**
 * Unfollow a player
 * @param {string} userId - Discord user ID
 * @param {string} targetUserId - Target Discord user ID to unfollow
 * @returns {Promise<boolean>} - Success status
 */
export async function unfollowPlayer(userId, targetUserId) {
    try {
        const docRef = doc(db, "player_follows", userId);

        await updateDoc(docRef, {
            following: arrayRemove(targetUserId),
            updatedAt: new Date(),
        });

        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to unfollow player: ${error.message}`);
        throw error;
    }
}

/**
 * Get players that user is following
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array>} - List of followed player IDs
 */
export async function getFollowedPlayers(userId) {
    try {
        const docRef = doc(db, "player_follows", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().following || [];
        }

        return [];
    } catch (error) {
        console.error(`[ERROR] Failed to get followed players: ${error.message}`);
        return [];
    }
}

/**
 * Save last known rank status
 * @param {string} userId - Discord user ID
 * @param {Object} rankInfo - Current rank information
 * @returns {Promise<boolean>} - Success status
 */
export async function saveRankStatus(userId, rankInfo) {
    try {
        const docRef = doc(db, "rank_status_history", userId);

        await setDoc(
            docRef,
            {
                userId,
                currentRank: rankInfo.rank,
                currentDivision: rankInfo.division,
                currentRR: rankInfo.rr || 0,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to save rank status: ${error.message}`);
        return false;
    }
}

/**
 * Get last known rank status
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} - Last rank information
 */
export async function getLastRankStatus(userId) {
    try {
        const docRef = doc(db, "rank_status_history", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        }

        return null;
    } catch (error) {
        console.error(`[ERROR] Failed to get last rank status: ${error.message}`);
        return null;
    }
}

/**
 * Check rank change and generate notification
 * @param {string} userId - Discord user ID
 * @param {Object} currentRankInfo - Current rank information
 * @returns {Promise<Object|null>} - Rank change notification or null
 */
export async function checkRankChange(userId, currentRankInfo) {
    try {
        const lastStatus = await getLastRankStatus(userId);

        if (!lastStatus) {
            // First time tracking - save and don't notify
            console.log(`[INFO] First time tracking for user ${userId}: ${currentRankInfo.rank}${currentRankInfo.division}`);
            await saveRankStatus(userId, currentRankInfo);
            return null;
        }

        console.log(`[DEBUG] Comparing ranks for ${userId}:`);
        console.log(`  Last: ${lastStatus.currentRank}${lastStatus.currentDivision} RR:${lastStatus.currentRR}`);
        console.log(`  Current: ${currentRankInfo.rank}${currentRankInfo.division} RR:${currentRankInfo.rr}`);

        const rankOrder = ["Unranked", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"];
        const lastRankIndex = rankOrder.indexOf(lastStatus.currentRank);
        const currentRankIndex = rankOrder.indexOf(currentRankInfo.rank);

        let notification = null;

        // Check for rank tier change
        if (currentRankIndex > lastRankIndex) {
            notification = {
                type: "RANK_UP",
                message: `🎉 **ランクアップ！** ${lastStatus.currentRank}${lastStatus.currentDivision} → ${currentRankInfo.rank}${currentRankInfo.division}`,
                previousRank: `${lastStatus.currentRank}${lastStatus.currentDivision}`,
                newRank: `${currentRankInfo.rank}${currentRankInfo.division}`,
                emoji: "🎉",
            };
        } else if (currentRankIndex < lastRankIndex) {
            notification = {
                type: "RANK_DOWN",
                message: `📉 **ランクダウン...** ${lastStatus.currentRank}${lastStatus.currentDivision} → ${currentRankInfo.rank}${currentRankInfo.division}`,
                previousRank: `${lastStatus.currentRank}${lastStatus.currentDivision}`,
                newRank: `${currentRankInfo.rank}${currentRankInfo.division}`,
                emoji: "📉",
            };
        } else if (currentRankIndex === lastRankIndex && lastStatus.currentDivision !== currentRankInfo.division) {
            // Division change within same rank
            const lastDiv = parseInt(lastStatus.currentDivision);
            const currentDiv = parseInt(currentRankInfo.division);

            notification = {
                type: currentDiv > lastDiv ? "DIVISION_UP" : "DIVISION_DOWN",
                message: currentDiv > lastDiv
                    ? `✅ **ディビジョンアップ** ${currentRankInfo.rank}${lastStatus.currentDivision} → ${currentRankInfo.rank}${currentRankInfo.division}`
                    : `⬇️ **ディビジョンダウン** ${currentRankInfo.rank}${lastStatus.currentDivision} → ${currentRankInfo.rank}${currentRankInfo.division}`,
                previousRank: `${currentRankInfo.rank}${lastStatus.currentDivision}`,
                newRank: `${currentRankInfo.rank}${currentRankInfo.division}`,
                emoji: currentDiv > lastDiv ? "✅" : "⬇️",
            };
        } else if (currentRankIndex === lastRankIndex && lastStatus.currentDivision === currentRankInfo.division && currentRankInfo.rr !== lastStatus.currentRR) {
            // Only RR change (no rank/division change) - NOT NOTIFIED
            console.log(`[INFO] Only RR changed for ${userId}, no notification sent`);
        } else {
            console.log(`[INFO] No rank change detected for ${userId}`);
        }

        // Save current status
        await saveRankStatus(userId, currentRankInfo);

        return notification;
    } catch (error) {
        console.error(`[ERROR] Failed to check rank change: ${error.message}`);
        return null;
    }
}

/**
 * Save last patch check time
 * @param {string} patchVersion - Patch version
 * @returns {Promise<boolean>} - Success status
 */
export async function saveLastPatchCheck(patchVersion) {
    try {
        const docRef = doc(db, "system", "last_patch_check");

        await setDoc(
            docRef,
            {
                lastPatchVersion: patchVersion,
                lastCheckedAt: new Date(),
            },
            { merge: true }
        );

        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to save last patch check: ${error.message}`);
        return false;
    }
}

/**
 * Get last patch version checked
 * @returns {Promise<string|null>} - Last patch version
 */
export async function getLastPatchVersion() {
    try {
        const docRef = doc(db, "system", "last_patch_check");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().lastPatchVersion || null;
        }

        return null;
    } catch (error) {
        console.error(`[ERROR] Failed to get last patch version: ${error.message}`);
        return null;
    }
}
