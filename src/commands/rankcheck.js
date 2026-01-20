import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { checkAllUserRankUpdates } from "../services/rankChangeTracker.js";

const rankcheckCommand = {
    data: new SlashCommandBuilder()
        .setName("rankcheck")
        .setDescription("⚙️ [管理者] 現在のランク変動をチェックして通知を送信します")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const embed = {
                color: 0x0099ff,
                title: "⏳ ランクチェック実行中...",
                description: "すべてのユーザーのランク情報をチェック中です",
                timestamp: new Date(),
            };

            await interaction.editReply({ embeds: [embed] });

            // Run rank check
            const guild = interaction.guild;
            await checkAllUserRankUpdates(interaction.client, guild);

            const resultEmbed = {
                color: 0x00ff00,
                title: "✅ ランクチェック完了",
                description: "ランク情報のチェックが完了しました。\n変動があったユーザーに通知を送信しました。",
                timestamp: new Date(),
            };

            return interaction.editReply({ embeds: [resultEmbed] });
        } catch (error) {
            console.error(`[ERROR] Failed to execute rank check: ${error.message}`);
            return interaction.editReply({
                content: `エラーが発生しました: ${error.message}`,
            });
        }
    },
};

export default rankcheckCommand;
