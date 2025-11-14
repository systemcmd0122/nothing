const { ActivityType } = require('discord.js');

// ステータス管理フラグ
let isUpdatingRanks = false;

// ステータスを更新中に設定
function setUpdatingStatus(client) {
    isUpdatingRanks = true;
    client.user.setActivity('ランク更新中...', { type: ActivityType.Playing });
}

// ステータスを通常状態に設定
function setPlayingStatus(client) {
    isUpdatingRanks = false;
    client.user.setActivity('Valorant をプレイ中', { type: ActivityType.Playing });
}

// 現在のステータスを取得
function isUpdating() {
    return isUpdatingRanks;
}

module.exports = {
    setUpdatingStatus,
    setPlayingStatus,
    isUpdating
};
