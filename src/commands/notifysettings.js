import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import {
    getNotificationSettings,
    updateNotificationSettings,
} from "../services/notificationService.js";

const notifysettingsCommand = {
    data: new SlashCommandBuilder()
        .setName("notifysettings")
        .setDescription("ランク更新やパッチ通知の設定を管理します")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("view")
                .setDescription("現在の通知設定を表示します")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("rankupdate")
                .setDescription("ランク更新通知のオン/オフを切り替えます")
                .addStringOption((option) =>
                    option
                        .setName("status")
                        .setDescription("有効にするか無効にするか")
                        .setRequired(true)
                        .addChoices(
                            { name: "有効", value: "true" },
                            { name: "無効", value: "false" }
                        )
                )
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            const settings = await getNotificationSettings(userId);

            if (!settings) {
                return interaction.editReply({
                    content: "通知設定の取得に失敗しました。",
                });
            }

            if (subcommand === "view") {
                const embed = {
                    color: 0x0099ff,
                    title: "📬 通知設定",
                    description: "あなたの通知設定は以下の通りです：",
                    fields: [
                        {
                            name: "ランク更新通知",
                            value: settings.rankUpdateNotifications ? "✅ 有効" : "❌ 無効",
                            inline: true,
                        },
                    ],
                    footer: {
                        text: "/notifysettings rank update コマンドで設定を変更できます",
                    },
                };

                return interaction.editReply({
                    embeds: [embed],
                });
            }

            const status = interaction.options.getString("status") === "true";

            if (subcommand === "rankupdate") {
                await updateNotificationSettings(userId, {
                    rankUpdateNotifications: status,
                    rankUpNotifications: status,
                    rankDownNotifications: status,
                });

                const statusText = status ? "✅ 有効に設定しました" : "❌ 無効に設定しました";
                return interaction.editReply({
                    content: `ランク更新通知を${statusText}`,
                });
            }
        } catch (error) {
            console.error(`[ERROR] Failed to update notification settings: ${error.message}`);
            return interaction.editReply({
                content: "設定の更新に失敗しました。",
            });
        }
    },
};

export default notifysettingsCommand;
