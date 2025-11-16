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
        const tag      = interaction.options.getString('tag');
        const region   = 'ap';
        const platform = interaction.options.getString('platform') || 'pc';

        // -------------------------------------------------
        // ① Valorant アカウントが実在するか確認
        // -------------------------------------------------
        await interaction.deferReply({ ephemeral: true });

        // API でランク情報が取得できれば「存在」判定
        const rankText = await getValorantRank(username, tag, region, platform);

        if (!rankText) {
            // アカウントが見つからなかったらエラーメッセージで終了
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ エラー')
                .setDescription(
                    '指定された Valorant アカウントが見つかりませんでした。\n' +
                    '`/register` コマンドの **ユーザー名** と **タグ** が正しいか再確認してください。'
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return; // ← ここで処理を中断
        }

        // -------------------------------------------------
        // ② 実在が確認できたので通常の登録処理へ
        // -------------------------------------------------
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

        // ロール付与（実在が確認できているので必ず実行可能）
        if (currentRank) {
            await updateUserRankRole(interaction.guild, interaction.user.id, currentRank);
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF4655)
            .setTitle('✅ 登録完了')
            .setDescription('Valorantアカウントを登録しました！')
            .addFields(
                { name: 'ユーザー名', value: `${username}#${tag}`, inline: true },
                { name: 'リージョン',   value: region.toUpperCase(), inline: true },
                { name: 'プラットフォーム', value: platform.toUpperCase(), inline: true },
                { name: '現在のランク', value: currentRank || '取得中…', inline: false }
            )
            .setFooter({ text: '1分ごとに自動でランクが更新されます' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};