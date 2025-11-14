const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-register-board')
        .setDescription('登録ボード(アカウント登録用)を設置します'),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const embed = new EmbedBuilder()
            .setColor(0xFF4655)
            .setTitle('🎮 Valorant アカウント登録')
            .setDescription('プラットフォームに合わせてボタンをクリックしてValorantアカウントを登録してください')
            .addFields(
                { name: '必要な情報', value: 'ユーザー名、タグ(#の後ろの番号)' },
                { name: 'サポートするプラットフォーム', value: '💻 PC版 / 🎮 コンソール版 (PS5/Xbox)' }
            )
            .setFooter({ text: 'ランクは1分ごとに自動更新されます' })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('register_pc')
                    .setLabel('💻 PC版で登録')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('register_console')
                    .setLabel('🎮 コンソール版で登録')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
        
        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ 登録ボード設置完了')
            .setDescription('このチャンネルに登録ボードを設置しました')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
    }
};