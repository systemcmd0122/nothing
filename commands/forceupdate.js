const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { autoUpdateRanks } = require('../utils/rankUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forceupdate')
        .setDescription('全ユーザーのランクを即座に更新（管理者のみ）')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🔄 ランク更新中...')
            .setDescription('全ユーザーのランク情報を更新しています。少々お待ちください。')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // ランク更新を実行
        await autoUpdateRanks(interaction.client);
        
        const completeEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ 更新完了')
            .setDescription('全ユーザーのランク情報を更新しました。')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [completeEmbed] });
    }
};
