import { SlashCommandBuilder } from "discord.js";
import { unregisterValorantAccount, getValorantAccount } from "../services/valorant.js";

const unregisterCommand = {
    data: new SlashCommandBuilder()
        .setName("unregister")
        .setDescription("Valorantアカウント登録を削除します")
        .setDescriptionLocalizations({
            ja: "Valorantアカウント登録を削除します",
        }),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.user.id;

        try {
            // Check if user has a registered account
            const account = await getValorantAccount(userId);
            if (!account) {
                return interaction.editReply({
                    content: "登録されているアカウントが見つかりません。",
                });
            }

            // Unregister the account
            const result = await unregisterValorantAccount(userId);

            if (result.success) {
                const embed = {
                    color: 0xff6600,
                    title: "❌ 登録削除完了",
                    description: `**${account.username}#${account.tag}** の登録を削除しました。`,
                    fields: [
                        {
                            name: "削除されたアカウント",
                            value: `${account.username}#${account.tag}`,
                            inline: true,
                        },
                        {
                            name: "リージョン",
                            value: account.region.toUpperCase(),
                            inline: true,
                        },
                    ],
                    timestamp: new Date(),
                };

                return interaction.editReply({
                    embeds: [embed],
                });
            } else {
                return interaction.editReply({
                    content: result.message,
                });
            }
        } catch (error) {
            console.error("[ERROR] Unregister command error:", error);
            return interaction.editReply({
                content: `エラーが発生しました: ${error.message}`,
            });
        }
    },
};

export default unregisterCommand;
