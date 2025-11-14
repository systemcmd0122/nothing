const { EmbedBuilder } = require('discord.js');
const { loadUserData } = require('./dataManager');
const { getValorantRank, getValorantMatchHistory, extractRankName, getRankTier, RANK_COLORS } = require('./rankUtils');

// ランク表示ボタン処理
async function handleViewMyRankButton(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const userData = loadUserData();
    const userInfo = userData[interaction.user.id];
    
    if (!userInfo) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ エラー')
            .setDescription('Valorantアカウントが登録されていません。\n`/register` コマンドで登録してください。')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const rankInfo = await getValorantRank(
        userInfo.username,
        userInfo.tag,
        userInfo.region,
        userInfo.platform
    );
    
    if (!rankInfo) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ エラー')
            .setDescription('ランク情報の取得に失敗しました。')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const currentRank = extractRankName(rankInfo);
    const tier = getRankTier(currentRank);
    const color = RANK_COLORS[tier] || RANK_COLORS['Unranked'];
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎮 Valorant ランク情報')
        .setDescription(`**${userInfo.username}#${userInfo.tag}**`)
        .addFields(
            { name: 'ランク情報', value: rankInfo },
            { name: 'リージョン', value: userInfo.region.toUpperCase(), inline: true },
            { name: 'プラットフォーム', value: userInfo.platform.toUpperCase(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Discord: ${interaction.user.username}` });
    
    await interaction.editReply({ embeds: [embed] });
}

// マッチ履歴表示ボタン処理
async function handleViewMyHistoryButton(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const userData = loadUserData();
    const userInfo = userData[interaction.user.id];
    
    if (!userInfo) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ エラー')
            .setDescription('Valorantアカウントが登録されていません。\n`/register` コマンドで登録してください。')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const matchHistory = await getValorantMatchHistory(
        userInfo.username,
        userInfo.tag,
        userInfo.region,
        userInfo.platform,
        'Asia/Tokyo'
    );
    
    if (!matchHistory) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ エラー')
            .setDescription('マッチ履歴の取得に失敗しました。')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const historyText = matchHistory.trim();
    
    const embed = new EmbedBuilder()
        .setColor(0x00CED1)
        .setTitle('📊 過去24時間のマッチ履歴')
        .setDescription(`**${userInfo.username}#${userInfo.tag}**`)
        .addFields(
            { name: '履歴（タイムゾーン: Asia/Tokyo）', value: historyText || 'データなし', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Discord: ${interaction.user.username}` });
    
    await interaction.editReply({ embeds: [embed] });
}

module.exports = {
    handleViewMyRankButton,
    handleViewMyHistoryButton
};
