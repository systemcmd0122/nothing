import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { getValorantAccount, getValorantRank, getRankImagePath } from "../services/valorant.js";
import { existsSync } from "fs";

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

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const account = await getValorantAccount(targetUser.id);

    if (!account) {
      return interaction.editReply({
        content: `${targetUser.username} のValorantアカウントが登録されていません。`,
      });
    }

    try {
      const rankInfo = await getValorantRank(
        account.username,
        account.tag,
        account.region,
        account.platform
      );

      // ランク情報からランク名とディビジョンを抽出
      let rankName = "Norank";
      let division = "";
      let rankDescription = "";

      console.log("Raw rankInfo:", rankInfo);

      // API がテキスト形式で返す場合と JSON 形式で返す場合の両方に対応
      if (typeof rankInfo === "string") {
        // Check if it's an error message
        if (rankInfo.includes("を取得できませんでした") || rankInfo.includes("failed") || rankInfo.includes("error")) {
          // Error occurred - send account info via DM
          throw new Error(`API returned error: ${rankInfo}`);
        }
        
        // テキスト形式: "Bronze 1, RR: 28 (-30)  (shield 2)"
        rankDescription = rankInfo;
        
        // "Bronze 1" を抽出
        const rankMatch = rankInfo.match(/^([A-Za-z]+)\s+(\d+)/);
        if (rankMatch) {
          rankName = rankMatch[1]; // "Bronze"
          division = rankMatch[2]; // "1"
        }
      } else if (typeof rankInfo === "object" && rankInfo !== null) {
        // JSON 形式
        rankName = rankInfo.rank || rankInfo.name || rankInfo.currentTierPatched || "Norank";
        division = rankInfo.division || rankInfo.level || "";
        rankDescription = `**ランク**: ${rankName}${division ? ` (${division})` : ""}\n**RR**: ${rankInfo.rr || rankInfo.rp || "0"}`;
      } else {
        // Unable to parse rank information
        throw new Error(`Unable to parse rank information: ${rankInfo}`);
      }

      console.log("Extracted - rankName:", rankName, "division:", division);

      // ランク画像のパスを取得
      const imagePath = getRankImagePath(rankName, division);

      // ランク画像ファイルが存在する場合は表示
      if (imagePath && existsSync(imagePath)) {
        const attachment = new AttachmentBuilder(imagePath, { name: "rank.jpg" });
        
        // ランク情報の詳細を整形
        const detailEmbed = {
          color: 0xff4655,
          title: `▶ ${account.username}#${account.tag}`,
          description: `** Rank Information **`,
          fields: [
            {
              name: "□ Rank",
              value: rankDescription,
              inline: false,
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
          ],
          image: { url: "attachment://rank.jpg" },
          thumbnail: {
            url: targetUser.displayAvatarURL({ size: 128 }),
          },
          footer: {
            text: "Valorant Rank Info",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };
        
        return interaction.editReply({ 
          embeds: [detailEmbed],
          files: [attachment]
        });
      } else {
        // 画像がない場合はテキストのみで返す
        const textEmbed = {
          color: 0x888888,
          title: `▶ ${account.username}#${account.tag}`,
          description: `** Rank Information **`,
          fields: [
            {
              name: "□ Rank",
              value: rankDescription || "Unable to retrieve information",
              inline: false,
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
          ],
          thumbnail: {
            url: targetUser.displayAvatarURL({ size: 128 }),
          },
          footer: {
            text: "Valorant Rank Info",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };
        return interaction.editReply({ embeds: [textEmbed] });
      }
    } catch (error) {
      console.error("[ERROR] Error fetching rank:", error);

      // ランク情報取得失敗時に現在の登録内容を DM で確認
      try {
        const accountInfo = {
          color: 0xffaa00,
          title: "▶ Failed to Retrieve Rank Information",
          description: `Rank information could not be retrieved. Please verify the following registration information is correct:`,
          fields: [
            {
              name: "□ Username",
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
              name: ">>> Solution",
              value: `If the information above is incorrect, please use \`/register\` to re-register your account with the correct Valorant ID and tag.`,
              inline: false,
            },
          ],
          footer: {
            text: "Please verify your account information",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };

        // DM を送信
        await targetUser.send({ embeds: [accountInfo] });

        // チャンネルにはシンプルなエラーメッセージを送信
        return interaction.editReply({
          content: "[ERROR] Failed to retrieve rank information. Please check your DM for more details.",
        });
      } catch (dmError) {
        console.error("[ERROR] Failed to send DM:", dmError);
        return interaction.editReply({
          content: "[ERROR] Failed to retrieve rank information. Please verify your registered account information with `/myaccount` command.",
        });
      }
    }
  },
};

export default rankCommand;
