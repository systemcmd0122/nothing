const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-stats-board')
        .setDescription('ユーザー統計情報ボード（マッチ履歴表示用）を設置します'),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const embed = new EmbedBuilder()
            .setColor(0x00CED1)
            .setTitle('📊 Valorant ユーザー統計')
            .setDescription('下のボタンをクリックしてランク情報やマッチ履歴を確認してください')
            .addFields(
                { name: '🎮 ランク確認', value: 'あなたの現在のランクを表示', inline: true },
                { name: '📈 マッチ履歴', value: '過去24時間の戦績を表示', inline: true }
            )
            .setFooter({ text: 'タイムゾーン: Asia/Tokyo' })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_my_rank')
                    .setLabel('🎮 ランク確認')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('view_my_history')
                    .setLabel('📈 マッチ履歴')
                    .setStyle(ButtonStyle.Success)
            );
        
        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
        
        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ 統計ボード設置完了')
            .setDescription('このチャンネルに統計ボードを設置しました')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
    }
};
