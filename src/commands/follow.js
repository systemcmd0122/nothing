import { SlashCommandBuilder } from "discord.js";
import {
    followPlayer,
    unfollowPlayer,
    getFollowedPlayers,
    getNotificationSettings,
} from "../services/notificationService.js";
import { getValorantAccount } from "../services/valorant.js";

const followCommand = {
    data: new SlashCommandBuilder()
        .setName("follow")
        .setDescription("プレイヤーをフォローしてランク変動を追跡します")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("プレイヤーをフォロー追加します")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("フォローするプレイヤー（Discordユーザー）")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("プレイヤーをフォロー解除します")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("フォロー解除するプレイヤー（Discordユーザー）")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("フォロー中のプレイヤー一覧を表示します")
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            if (subcommand === "add") {
                const targetUser = interaction.options.getUser("user");
                const targetUserId = targetUser.id;

                // Check if target user has a registered Valorant account
                const targetAccount = await getValorantAccount(targetUserId);
                if (!targetAccount) {
                    return interaction.editReply({
                        content: `${targetUser.username} はValorantアカウントを登録していません。`,
                    });
                }

                // Follow the player
                await followPlayer(userId, targetUserId);

                // Get the target's account info
                const embed = {
                    color: 0x00ff00,
                    title: "✅ フォロー完了",
                    description: `**${targetUser.username}** をフォローしました！`,
                    fields: [
                        {
                            name: "フォロー対象",
                            value: `${targetAccount.username}#${targetAccount.tag}`,
                            inline: false,
                        },
                        {
                            name: "ランク変動",
                            value: `このプレイヤーのランク変動を自動で追跡します`,
                            inline: false,
                        },
                    ],
                    footer: {
                        text: "/notifysettings followed で通知を設定できます",
                    },
                };

                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === "remove") {
                const targetUser = interaction.options.getUser("user");
                const targetUserId = targetUser.id;

                // Unfollow the player
                await unfollowPlayer(userId, targetUserId);

                return interaction.editReply({
                    content: `**${targetUser.username}** のフォローを解除しました。`,
                });
            }

            if (subcommand === "list") {
                const followedPlayerIds = await getFollowedPlayers(userId);

                if (followedPlayerIds.length === 0) {
                    return interaction.editReply({
                        content: "フォロー中のプレイヤーはいません。",
                    });
                }

                // Fetch user data for each followed player
                const fields = [];
                let accountsFound = 0;

                for (const followedUserId of followedPlayerIds) {
                    try {
                        const followedUser = await interaction.client.users.fetch(followedUserId);
                        const followedAccount = await getValorantAccount(followedUserId);

                        if (followedAccount) {
                            fields.push({
                                name: `${followedUser.username}`,
                                value: `${followedAccount.username}#${followedAccount.tag}`,
                                inline: false,
                            });
                            accountsFound++;
                        }
                    } catch (error) {
                        console.error(`[ERROR] Failed to fetch followed user ${followedUserId}: ${error.message}`);
                    }
                }

                if (fields.length === 0) {
                    return interaction.editReply({
                        content: "フォロー中のプレイヤーはいません。",
                    });
                }

                const embed = {
                    color: 0x0099ff,
                    title: "👥 フォロー中のプレイヤー一覧",
                    description: `合計 ${accountsFound} 人のプレイヤーをフォロー中です`,
                    fields: fields,
                    footer: {
                        text: "/follow remove @user でフォロー解除できます",
                    },
                };

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`[ERROR] Failed to execute follow command: ${error.message}`);
            return interaction.editReply({
                content: `エラーが発生しました: ${error.message}`,
            });
        }
    },
};

export default followCommand;
