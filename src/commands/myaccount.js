import { SlashCommandBuilder } from "discord.js";
import { getValorantAccount } from "../services/valorant.js";

// Helper to construct the base URL for images
function getBaseUrl() {
    if (process.env.APP_URL) {
        return process.env.APP_URL;
    }
    if (process.env.KOYEB_DOMAIN) {
        return `https://${process.env.KOYEB_DOMAIN}`;
    }
    return `http://localhost:${process.env.PORT || 3000}`;
}

// Helper to get the rank image file name
function getRankImageFile(rankName, division) {
    if (!rankName || rankName === 'Unranked' || rankName === 'Norank') {
        return 'Norank.jpg';
    }
    if (rankName === 'Radiant') {
        return 'Radiant_Rank.jpg';
    }
    if (division) {
        return `${rankName}_${division}_Rank.jpg`;
    }
    return 'Norank.jpg'; // Fallback
}


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

    const baseUrl = getBaseUrl();
    const rankImageFile = getRankImageFile(account.currentRank, account.currentDivision);
    const rankImageUrl = `${baseUrl}/ranks/${rankImageFile}`;

    const embed = {
      color: 0x0099ff,
      title: `◆ ${targetMember.displayName} Valorant Account`,
      author: {
        name: targetMember.displayName,
        icon_url: targetMember.displayAvatarURL({ size: 64 }),
      },
      description: `Account Information`,
      fields: [
        {
          name: "▶ Username",
          value: `${account.username}`,
          inline: true,
        },
        {
          name: "□ Tag",
          value: `${account.tag}`,
          inline: true,
        },
        {
            name: '\u200B', // Zero-width space
            value: '\u200B',
            inline: true,
        },
        {
          name: "■ Current Rank",
          value: `**${account.currentRank || "Not Set"} ${account.currentDivision || ""}**`,
          inline: true,
        },
        {
            name: "■ RR",
            value: `${account.currentRR || 'N/A'}`,
            inline: true,
        },
        {
            name: '\u200B', // Zero-width space
            value: '\u200B',
            inline: true,
        },
      ],
      thumbnail: {
        url: rankImageUrl,
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