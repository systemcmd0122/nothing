const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { loadUserData, saveUserData } = require('./dataManager');
const { getValorantRank, extractRankName } = require('./rankUtils');
const { updateUserRankRole } = require('./roleManager');

// ボタン押下時にモーダルを表示
async function handleRegisterButton(interaction, platform) {
    let platformLabel = platform === 'pc' ? 'PC版' : 'コンソール版';
    
    const modal = new ModalBuilder()
        .setCustomId(`register_modal_${platform}`)
        .setTitle(`Valorant登録 (${platformLabel})`);
    
    const usernameInput = new TextInputBuilder()
        .setCustomId('username_input')
        .setLabel('Valorantユーザー名')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('例: PlayerName')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(16);
    
    const tagInput = new TextInputBuilder()
        .setCustomId('tag_input')
        .setLabel('タグ(#の後ろの番号)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('例: 1234')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(5);
    
    const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
    const secondActionRow = new ActionRowBuilder().addComponents(tagInput);
    
    modal.addComponents(firstActionRow, secondActionRow);
    
    await interaction.showModal(modal);
}

// モーダル送信時にアカウント登録処理
async function handleRegisterModal(interaction) {
    const username = interaction.fields.getTextInputValue('username_input');
    const tag = interaction.fields.getTextInputValue('tag_input');
    const platform = interaction.customId.split('_')[2];
    const region = 'ap';
    
    await interaction.deferReply({ ephemeral: true });
    
    // Valorant API でアカウント確認
    const rankText = await getValorantRank(username, tag, region, platform);
    
    if (!rankText) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ エラー')
            .setDescription('Valorantアカウントの確認に失敗しました。\nユーザー名とタグが正しいか確認してください。')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
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
    
    const successEmbed = new EmbedBuilder()
        .setColor(0xFF4655)
        .setTitle('✅ 登録完了')
        .setDescription('Valorantアカウントが登録されました！')
        .addFields(
            { name: 'ユーザー名', value: `${username}#${tag}`, inline: true },
            { name: 'プラットフォーム', value: platform.toUpperCase(), inline: true },
            { name: '現在のランク', value: currentRank || '取得中...', inline: false }
        )
        .setFooter({ text: 'ランクは1分ごとに自動更新されます' })
        .setTimestamp();
    
    await interaction.editReply({ embeds: [successEmbed] });
}

module.exports = {
    handleRegisterButton,
    handleRegisterModal
};