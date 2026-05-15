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
    await interaction.deferReply({ flags: 64 });

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
        account.platform,
        targetMember.id,
        interaction.client
      );

      if (!rankInfo) {
        throw new Error(`ランク情報を取得できませんでした。`);
      }

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
          name: `${targetMember.displayName} のランク`,
          icon_url: targetMember.displayAvatarURL({ size: 64 }),
        },
        title: `${account.username}#${account.tag}`,
        fields: [
          {
            name: "ランク",
            value: `**${rankDescription}**`,
            inline: true,
          },
          {
            name: "現在のRR",
            value: `\`${rr}\``,
            inline: true,
          },
        ],
        thumbnail: { url: rankImageUrl },
        footer: {
          text: "Valorant ランク情報",
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
          title: "▶ ランク情報の取得に失敗しました",
          description: `**${account.username}#${account.tag}** のランク情報を取得できませんでした。登録情報を確認してください。`,
          fields: [
            {
              name: ">>> 解決策",
              value: `情報が間違っている場合は、 \`/register\` を使用してアカウントを再登録してください。`,
              inline: false,
            },
          ],
          footer: {
            text: "アカウント情報を確認してください",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };
        await targetMember.send({ embeds: [accountInfo] }).catch(dmErr => {
            console.error("Failed to send DM, replying in channel.", dmErr);
            interaction.editReply({
              content: "[エラー] ランク情報を取得できませんでした。DMを送信できませんでした。`/myaccount` で登録情報を確認してください。",
            });
        });

        return interaction.editReply({
          content: "[エラー] ランク情報を取得できませんでした。詳細はDMを確認してください。",
        });
      } catch (e) {
        return interaction.editReply({
            content: "[エラー] ランク取得失敗の処理中、予期しないエラーが発生しました。"
        });
      }
    }
  },
};

export default rankCommand;