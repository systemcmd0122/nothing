import { SlashCommandBuilder } from "discord.js";
import { getValorantAccount } from "../services/valorant.js";
import { getRankImageUrl, isValidUrl } from "../utils/url.js";


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
    const targetMember = interaction.options.getMember("user") || interaction.member;
    const account = await getValorantAccount(targetMember.id);

    if (!account) {
      return interaction.reply({
        content: `${targetMember.displayName} のValorantアカウントが登録されていません。`,
        flags: 64, // Ephemeral flag
      });
    }

    const rankImageUrl = getRankImageUrl(account.currentRank, account.currentDivision);

    const embed = {
      color: 0x0099ff,
      title: `${targetMember.displayName} の Valorant アカウント`,
      author: {
        name: targetMember.displayName,
        icon_url: targetMember.displayAvatarURL({ size: 64 }),
      },
      description: `アカウント登録情報`,
      fields: [
        {
          name: "ユーザー名",
          value: `\`${account.username}\``,
          inline: true,
        },
        {
          name: "タグ",
          value: `\`${account.tag}\``,
          inline: true,
        },
        {
            name: '\u200B',
            value: '\u200B',
            inline: true,
        },
        {
          name: "現在のランク",
          value: `\`${account.currentRank || "未設定"} ${account.currentDivision || ""}\``,
          inline: true,
        },
        {
            name: "現在のRR",
            value: `\`${account.currentRR || '不明'}\``,
            inline: true,
        },
        {
            name: '\u200B',
            value: '\u200B',
            inline: true,
        },
      ],
      thumbnail: isValidUrl(rankImageUrl) ? {
        url: rankImageUrl,
      } : undefined,
      footer: {
        text: "Valorant アカウント情報",
        icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
      },
      timestamp: new Date(),
    };

    return interaction.reply({ embeds: [embed] });
  },
};

export default myaccountCommand;