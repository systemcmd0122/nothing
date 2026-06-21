import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { getUserGuildSettings, updateUserGuildSettings } from "../services/userGuildSettings.js";

const linksettingsCommand = {
  data: new SlashCommandBuilder()
    .setName("linksettings")
    .setDescription("このサーバーでのValorantアカウント連携設定を管理します")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("現在の連携設定を表示します")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("設定を確認するユーザー (管理者のみ)")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("連携の有効/無効を切り替えます")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("連携を有効にするかどうか")
            .setRequired(true)
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("設定を変更するユーザー (管理者のみ)")
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    // 管理者でない他人の設定を操作しようとした場合
    if (!isSelf && !isAdmin) {
      return interaction.editReply({
        content: "[エラー] 他のユーザーの設定を表示・変更するには管理者権限が必要です。",
      });
    }

    try {
      const settings = await getUserGuildSettings(targetUser.id, guildId);

      if (subcommand === "view") {
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${targetUser.username} のサーバー連携設定`)
          .setDescription(`サーバー: **${interaction.guild.name}**`)
          .addFields([
            {
              name: "アカウント連携 (ランクボード・通知・ロール)",
              value: settings.accountLinkEnabled !== false ? "✅ 有効" : "❌ 無効",
              inline: true,
            },
          ])
          .setFooter({ text: "設定を変更するには /linksettings toggle を使用してください" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === "toggle") {
        const enabled = interaction.options.getBoolean("enabled");
        await updateUserGuildSettings(targetUser.id, guildId, { accountLinkEnabled: enabled });

        return interaction.editReply({
          content: `${targetUser.username} のこのサーバーでの連携設定を ${enabled ? "✅ 有効" : "❌ 無効"} に変更しました。`,
        });
      }
    } catch (error) {
      console.error(`[ERROR] Linksettings command error: ${error.message}`);
      return interaction.editReply({
        content: "[エラー] 設定の更新中にエラーが発生しました。",
      });
    }
  },
};

export default linksettingsCommand;
