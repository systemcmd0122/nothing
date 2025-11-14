const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUserData } = require('../utils/dataManager');
const { getValorantMatchHistory } = require('../utils/rankUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('match-history')
        .setDescription('自分の過去24時間のマッチ履歴を確認する'),
    
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
        
        // マッチ履歴をパース（例: "3W - 2L - 0D, gained 25 RR today"）
        const historyText = matchHistory.trim();
        
        const embed = new EmbedBuilder()
            .setColor(0xFF4655)
            .setTitle('🎮 過去24時間のマッチ履歴')
            .setDescription(`**${userInfo.username}#${userInfo.tag}**`)
            .addFields(
                { name: '履歴（タイムゾーン: Asia/Tokyo）', value: historyText || 'データなし', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Discord: ${interaction.user.username}` });
        
        await interaction.editReply({ embeds: [embed] });
    }
};
