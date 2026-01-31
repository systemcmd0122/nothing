import { SlashCommandBuilder } from "discord.js";
import { getValorantAccount, getValorantRank } from "../services/valorant.js";

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

const rankCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Valorantのランク情報を表示します")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("ユーザーを指定 (省略時は自分)")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const targetMember = interaction.options.getMember("user") || interaction.member;
    const account = await getValorantAccount(targetMember.id);

    if (!account) {
      return interaction.editReply({
        content: `${targetMember.displayName} のValorantアカウントが登録されていません。`,
      });
    }

    try {
      const rankInfo = await getValorantRank(
        account.username,
        account.tag,
        account.region,
        account.platform
      );

      let rankName = "Norank";
      let division = "";
      let rankDescription = "";
      let rr = "0";

      if (typeof rankInfo === "string") {
        if (rankInfo.includes("を取得できませんでした") || rankInfo.includes("failed") || rankInfo.includes("error")) {
          throw new Error(`API returned error: ${rankInfo}`);
        }
        rankDescription = rankInfo;
        const rankMatch = rankInfo.match(/^([A-Za-z]+)\s+(\d+)/);
        if (rankMatch) {
          rankName = rankMatch[1];
          division = rankMatch[2];
        }
        const rrMatch = rankInfo.match(/RR:\s*(\d+)/);
        if(rrMatch) {
            rr = rrMatch[1];
        }

      } else if (typeof rankInfo === "object" && rankInfo !== null) {
        rankName = rankInfo.rank || rankInfo.name || rankInfo.currentTierPatched || "Norank";
        division = rankInfo.division || rankInfo.level || "";
        rr = rankInfo.rr || rankInfo.rp || "0";
        rankDescription = `${rankName} ${division}`;
      } else {
        throw new Error(`Unable to parse rank information: ${rankInfo}`);
      }

      const baseUrl = getBaseUrl();
      const rankImageFile = getRankImageFile(rankName, division);
      const rankImageUrl = `${baseUrl}/ranks/${rankImageFile}`;
      
      const detailEmbed = {
        color: 0xff4655,
        author: {
          name: `${targetMember.displayName}'s Rank`,
          icon_url: targetMember.displayAvatarURL({ size: 64 }),
        },
        title: `${account.username}#${account.tag}`,
        fields: [
          {
            name: "Rank",
            value: `**${rankDescription}**`,
            inline: true,
          },
          {
            name: "RR",
            value: `\`${rr}\``,
            inline: true,
          },
        ],
        thumbnail: { url: rankImageUrl },
        footer: {
          text: "Valorant Rank Info",
          icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
        },
        timestamp: new Date(),
      };
      
      return interaction.editReply({
        embeds: [detailEmbed],
      });

    } catch (error) {
      console.error("[ERROR] Error fetching rank:", error);

      try {
        const accountInfo = {
          color: 0xffaa00,
          title: "▶ Failed to Retrieve Rank Information",
          description: `Rank information for **${account.username}#${account.tag}** could not be retrieved. Please verify the registration information.`,
          fields: [
            {
              name: ">>> Solution",
              value: `If your information is incorrect, please use `/register` to re-register your account.`,
              inline: false,
            },
          ],
          footer: {
            text: "Please verify your account information",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };
        await targetMember.send({ embeds: [accountInfo] }).catch(dmErr => {
            console.error("Failed to send DM, replying in channel.", dmErr);
            interaction.editReply({
              content: "[ERROR] Failed to retrieve rank information. Could not send a DM. Please verify your registered account information with `/myaccount`.",
            });
        });

        return interaction.editReply({
          content: "[ERROR] Failed to retrieve rank information. Please check your DMs for more details.",
        });
      } catch (e) {
        return interaction.editReply({
            content: "[ERROR] An unexpected error occurred while handling a rank fetch failure."
        });
      }
    }
  },
};

export default rankCommand;