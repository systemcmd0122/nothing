const { EmbedBuilder } = require('discord.js');
const { compareRanks } = require('./rankUtils');
const Logger = require('./logger');

// 通知チャンネルID
const NOTIFICATION_CHANNEL_ID = '1438781172997165147';

// ランク変動通知を送信
async function sendRankChangeNotification(guild, userId, oldRank, newRank, rankChange) {
    try {
        const channel = await guild.channels.fetch(NOTIFICATION_CHANNEL_ID);
        if (!channel) {
            Logger.warn('通知チャンネルが見つかりません', 'NOTIFICATION');
            return;
        }
        
        const member = await guild.members.fetch(userId);
        const changeType = compareRanks(oldRank, newRank);
        
        let emoji = '📊';
        let title = 'ランク変動';
        let color = 0x808080;
        
        if (changeType === 'up') {
            emoji = '📈';
            title = 'ランクアップ！';
            color = 0x00FF00;
        } else if (changeType === 'down') {
            emoji = '📉';
            title = 'ランクダウン';
            color = 0xFF0000;
        }
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} ${title}`)
            .setDescription(`<@${userId}> のランクが変動しました！`)
            .addFields(
                { name: '以前のランク', value: oldRank || '不明', inline: true },
                { name: '→', value: '\u200B', inline: true },
                { name: '現在のランク', value: newRank || '不明', inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        Logger.success(`ランク変動通知を送信: ${oldRank} → ${newRank}`, 'NOTIFICATION');
    } catch (err) {
        Logger.error('通知送信エラー', 'NOTIFICATION', err);
    }
}

module.exports = {
    sendRankChangeNotification
};
