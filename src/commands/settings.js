import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js";
import { getGuildSettings, updateGuildSettings } from "../services/guildSettings.js";

const settingsCommand = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("サーバーの設定を管理します（管理者のみ）")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("現在のサーバー設定を表示します")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("notifications")
        .setDescription("通知設定を切り替えます")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("通知を有効にするかどうか")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roles")
        .setDescription("ランクロール付与設定を切り替えます")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("ランクロール付与を有効にするかどうか")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("通知用チャンネルを設定します")
        .addChannelOption((option) =>
          option
            .setName("target")
            .setDescription("通知を送るチャンネル")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      const settings = await getGuildSettings(guildId);

      if (subcommand === "view") {
        const channelMention = settings.notificationChannelId
          ? `<#${settings.notificationChannelId}>`
          : "未設定 (デフォルトまたは未設定の場合、通知は送信されません)";

        const embed = {
          color: 0x0099ff,
          title: "⚙️ サーバー設定",
          fields: [
            {
              name: "ランク通知",
              value: settings.notificationsEnabled ? "✅ 有効" : "❌ 無効",
              inline: true,
            },
            {
              name: "ランクロール付与",
              value: settings.rankRolesEnabled ? "✅ 有効" : "❌ 無効",
              inline: true,
            },
            {
              name: "通知チャンネル",
              value: channelMention,
              inline: false,
            },
          ],
        };
        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === "notifications") {
        const enabled = interaction.options.getBoolean("enabled");
        await updateGuildSettings(guildId, { notificationsEnabled: enabled });
        return interaction.editReply({
          content: `ランク通知を ${enabled ? "✅ 有効" : "❌ 無効"} に設定しました。`,
        });
      }

      if (subcommand === "roles") {
        const enabled = interaction.options.getBoolean("enabled");
        await updateGuildSettings(guildId, { rankRolesEnabled: enabled });
        return interaction.editReply({
          content: `ランクロール付与を ${enabled ? "✅ 有効" : "❌ 無効"} に設定しました。`,
        });
      }

      if (subcommand === "channel") {
        const channel = interaction.options.getChannel("target");
        await updateGuildSettings(guildId, { notificationChannelId: channel.id });
        return interaction.editReply({
          content: `通知チャンネルを <#${channel.id}> に設定しました。`,
        });
      }
    } catch (error) {
      console.error(`[ERROR] Settings command error: ${error.message}`);
      return interaction.editReply({
        content: "[エラー] 設定の更新中にエラーが発生しました。",
      });
    }
  },
};

export default settingsCommand;
