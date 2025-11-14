const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUserData } = require('../utils/dataManager');
const { getValorantMatchHistory } = require('../utils/rankUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-match-history')
        .setDescription('他のユーザーの過去24時間のマッチ履歴を確認する')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('確認するユーザー')
                .setRequired(true)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const targetUser = interaction.options.getUser('user');
        const userData = loadUserData();
        const userInfo = userData[targetUser.id];
        
        if (!userInfo) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ エラー')
                .setDescription(`${targetUser.username} さんはValorantアカウントを登録していません。`)
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
        
        // マッチ履歴をパース
        const historyText = matchHistory.trim();
        
        const embed = new EmbedBuilder()
            .setColor(0xFF4655)
            .setTitle('🎮 過去24時間のマッチ履歴')
            .setDescription(`**${userInfo.username}#${userInfo.tag}**`)
            .addFields(
                { name: '履歴（タイムゾーン: Asia/Tokyo）', value: historyText || 'データなし', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Discord: ${targetUser.username}` });
        
        await interaction.editReply({ embeds: [embed] });
    }
};
