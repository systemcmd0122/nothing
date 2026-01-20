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
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("patch")
                .setDescription("パッチ・アップデート通知のオン/オフを切り替えます")
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
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("followed")
                .setDescription("フォロー中プレイヤーのランク変動通知のオン/オフを切り替えます")
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
                        {
                            name: "パッチ通知",
                            value: settings.patchNotifications ? "✅ 有効" : "❌ 無効",
                            inline: true,
                        },
                        {
                            name: "フォロー中プレイヤー通知",
                            value: settings.followedPlayersNotifications ? "✅ 有効" : "❌ 無効",
                            inline: true,
                        },
                        {
                            name: "DM通知",
                            value: settings.dmNotifications ? "✅ 有効" : "❌ 無効",
                            inline: true,
                        },
                    ],
                    footer: {
                        text: "/notifysettings rank update patch followed コマンドで設定を変更できます",
                    },
                };

                return interaction.editReply({ embeds: [embed] });
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

            if (subcommand === "patch") {
                await updateNotificationSettings(userId, {
                    patchNotifications: status,
                });

                const statusText = status ? "✅ 有効に設定しました" : "❌ 無効に設定しました";
                return interaction.editReply({
                    content: `パッチ・アップデート通知を${statusText}`,
                });
            }

            if (subcommand === "followed") {
                await updateNotificationSettings(userId, {
                    followedPlayersNotifications: status,
                });

                const statusText = status ? "✅ 有効に設定しました" : "❌ 無効に設定しました";
                return interaction.editReply({
                    content: `フォロー中プレイヤーのランク変動通知を${statusText}`,
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
