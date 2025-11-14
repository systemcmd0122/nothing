const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUserData } = require('../utils/dataManager');
const { getValorantRank, extractRankName, getRankTier, RANK_COLORS } = require('../utils/rankUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('自分のValorantランクを確認'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
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
};
