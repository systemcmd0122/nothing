import { SlashCommandBuilder } from "discord.js";
import { getValorantAccount } from "../services/valorant.js";

const myaccountCommand = {
  data: new SlashCommandBuilder()
    .setName("myaccount")
    .setDescription("登録されているValorantアカウント情報を確認します")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("ユーザーを指定 (省略時は自分)")
        .setRequired(false)
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const account = await getValorantAccount(targetUser.id);

    if (!account) {
      return interaction.reply({
        content: `${targetUser.username} のValorantアカウントが登録されていません。`,
        flags: 64, // Ephemeral flag
      });
    }

    const embed = {
      color: 0x0099ff,
      title: `◆ ${targetUser.username} Valorant Account`,
      description: `Account Information`,
      fields: [
        {
          name: "▶ Username",
          value: `\`${account.username}\``,
          inline: true,
        },
        {
          name: "□ Tag",
          value: `\`${account.tag}\``,
          inline: true,
        },
        {
          name: "◆ Region",
          value: `**AP** (Asia Pacific)`,
          inline: true,
        },
        {
          name: "■ Platform",
          value: `**PC**`,
          inline: true,
        },
        {
          name: "■ Current Rank",
          value: `**${account.currentRank || "Not Set"}${account.currentDivision ? ` (${account.currentDivision})` : ""}**`,
          inline: true,
        },
        {
          name: ">>> Last Update",
          value: `${account.lastRankUpdate ? new Date(account.lastRankUpdate.toDate()).toLocaleString("en-US") : "Never"}`,
          inline: true,
        },
        {
          name: "□ Created",
          value: `\`${new Date(account.createdAt.toDate()).toLocaleString("en-US")}\``,
          inline: false,
        },
        {
          name: ">>> Last Modified",
          value: `\`${new Date(account.updatedAt.toDate()).toLocaleString("en-US")}\``,
          inline: false,
        },
        {
          name: "▶ Available Commands",
          value: "• `/rank` - Display rank info\n• `/record` - Show match history\n• `/register` - Re-register account",
          inline: false,
        },
      ],
      thumbnail: {
        url: targetUser.displayAvatarURL({ size: 128 }),
      },
      footer: {
        text: "Valorant Account Information",
        icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
      },
      timestamp: new Date(),
    };

    return interaction.reply({ embeds: [embed] });
  },
};

export default myaccountCommand;
