const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUserData, saveUserData } = require('../utils/dataManager');
const { getValorantRank, extractRankName } = require('../utils/rankUtils');
const { updateUserRankRole } = require('../utils/roleManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Valorantアカウントを登録')
        .addStringOption(opt => 
            opt.setName('username')
                .setDescription('Valorantユーザー名')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('tag')
                .setDescription('Valorantタグ（#なし）')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('platform')
                .setDescription('プラットフォーム')
                .addChoices(
                    { name: 'PC', value: 'pc' },
                    { name: 'Console', value: 'console' }
                )),
    
    async execute(interaction) {
        const username = interaction.options.getString('username');
        const tag = interaction.options.getString('tag');
        const region = 'ap';
        const platform = interaction.options.getString('platform') || 'pc';
        
        // 初回ランク取得
        await interaction.deferReply({ ephemeral: true });
        
        const rankText = await getValorantRank(username, tag, region, platform);
        
        if (!rankText) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ エラー')
                .setDescription('Valorantアカウントの確認に失敗しました。\nユーザー名とタグが正しいか確認してください。')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        
        const currentRank = extractRankName(rankText);
        
        const userData = loadUserData();
        userData[interaction.user.id] = {
            username,
            tag,
            region,
            platform,
            discordUsername: interaction.user.username,
            currentRank,
            lastUpdated: new Date().toISOString()
        };
        
        saveUserData(userData);
        
        // ロールを付与
        if (currentRank) {
            await updateUserRankRole(interaction.guild, interaction.user.id, currentRank);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0xFF4655)
            .setTitle('✅ 登録完了')
            .setDescription(`Valorantアカウントを登録しました！`)
            .addFields(
                { name: 'ユーザー名', value: `${username}#${tag}`, inline: true },
                { name: 'リージョン', value: 'AP', inline: true },
                { name: 'プラットフォーム', value: platform.toUpperCase(), inline: true },
                { name: '現在のランク', value: currentRank || '不明', inline: false }
            )
            .setFooter({ text: '1分ごとに自動でランクが更新されます' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
};
