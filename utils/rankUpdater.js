const { loadUserData, saveUserData } = require('./dataManager');
const { getValorantRank, extractRankName, sleep } = require('./rankUtils');
const { updateUserRankRole } = require('./roleManager');
const { sendRankChangeNotification } = require('./notificationManager');
const Logger = require('./logger');

// ランク自動更新処理
async function autoUpdateRanks(client, setUpdatingStatus, setPlayingStatus) {
    // ステータスを「ランク更新中」に変更
    if (setUpdatingStatus) {
        setUpdatingStatus(client);
    }
    
    Logger.divider('🔄 ランク自動更新スタート');
    
    const userData = loadUserData();
    const guilds = client.guilds.cache;
    let updatedCount = 0;
    let totalCount = Object.keys(userData).length;
    
    for (const guild of guilds.values()) {
        for (const [userId, userInfo] of Object.entries(userData)) {
            try {
                // ランク情報を取得
                const rankText = await getValorantRank(
                    userInfo.username,
                    userInfo.tag,
                    userInfo.region,
                    userInfo.platform
                );
                
                if (!rankText) {
                    Logger.warn(`ランク取得失敗: ${userInfo.username}#${userInfo.tag}`, 'RANK-UPDATE');
                    continue;
                }
                
                const newRank = extractRankName(rankText);
                const oldRank = userInfo.currentRank;
                
                // ランクが変わった場合のみ更新
                if (oldRank && newRank && oldRank !== newRank) {
                    Logger.success(`ランク変動: ${userInfo.username} ${oldRank} → ${newRank}`, 'RANK-CHANGE');
                    updatedCount++;
                    await sendRankChangeNotification(guild, userId, oldRank, newRank, rankText);
                    await updateUserRankRole(guild, userId, newRank);
                    
                    // データを更新
                    userInfo.currentRank = newRank;
                    userInfo.lastUpdated = new Date().toISOString();
                } else if (!oldRank && newRank) {
                    // 初回取得時のみロール付与（oldRankがない場合）
                    Logger.info(`初回ランク取得: ${userInfo.username} → ${newRank}`, 'RANK-UPDATE');
                    await updateUserRankRole(guild, userId, newRank);
                    
                    // データを更新
                    userInfo.currentRank = newRank;
                    userInfo.lastUpdated = new Date().toISOString();
                } else if (oldRank && newRank && oldRank === newRank) {
                    Logger.debug(`ランク変わらず: ${userInfo.username} (${newRank})`, 'RANK-UPDATE');
                }
                
                // レート制限対策
                await sleep(2000);
            } catch (err) {
                Logger.error(`更新エラー (${userId})`, 'RANK-UPDATE', err);
            }
        }
    }
    
    
    saveUserData(userData);
    Logger.success(`ランク自動更新完了 (${updatedCount}/${totalCount} ユーザー更新)`, 'RANK-UPDATE');
    Logger.divider();
    
    // ステータスを「Valorantをプレイ中」に戻す
    if (setPlayingStatus) {
        setPlayingStatus(client);
    }
}

module.exports = {
    autoUpdateRanks
};
