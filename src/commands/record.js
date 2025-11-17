import { SlashCommandBuilder } from "discord.js";
import { getValorantAccount, getValorantMatchHistory } from "../services/valorant.js";

const recordCommand = {
  data: new SlashCommandBuilder()
    .setName("record")
    .setDescription("Valorantのマッチ履歴を表示します")
    .addStringOption((option) =>
      option
        .setName("timezone")
        .setDescription("タイムゾーン (デフォルト: Asia/Tokyo)")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("ユーザーを指定 (省略時は自分)")
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });

      const targetUser = interaction.options.getUser("user") || interaction.user;
      const timezone = interaction.options.getString("timezone") || "Asia/Tokyo";
      const account = await getValorantAccount(targetUser.id);

      if (!account) {
        return interaction.editReply({
          content: `${targetUser.username} のValorantアカウントが登録されていません。`,
        });
      }

      const matchHistory = await getValorantMatchHistory(
        account.username,
        account.tag,
        account.region,
        account.platform,
        timezone
      );

      const content =
        typeof matchHistory === "string"
          ? matchHistory
          : JSON.stringify(matchHistory, null, 2);

      // メッセージの長さが4000文字を超える場合は複数に分割
      if (content.length > 4000) {
        const chunks = [];
        for (let i = 0; i < content.length; i += 3990) {
          chunks.push(content.slice(i, i + 3990));
        }

        // 最初のメッセージを送信
        const firstEmbed = {
          color: 0x0099ff,
          title: `↑ ${account.username}#${account.tag} Match History`,
          description: `**Latest Match Information**`,
          fields: [
            {
              name: "◆ Region",
              value: `**AP** (Asia Pacific)`,
              inline: true,
            },
            {
              name: "□ Timezone",
              value: `**${timezone}**`,
              inline: true,
            },
          ],
          footer: {
            text: `Page 1 of ${Math.ceil(content.length / 3990)} • Valorant Match History`,
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };

        await interaction.editReply({ 
          embeds: [firstEmbed],
          content: `\`\`\`json\n${chunks[0]}\`\`\`` 
        });

        // 残りのメッセージを送信
        for (let i = 1; i < chunks.length; i++) {
          const pageEmbed = {
            color: 0x0099ff,
            footer: {
              text: `Page ${i + 1} of ${chunks.length} • Valorant Match History`,
            },
          };
          
          await interaction.followUp({
            embeds: [pageEmbed],
            content: `\`\`\`json\n${chunks[i]}\`\`\``
          });
        }
      } else {
        // 短い場合はそのまま表示
        const embed = {
          color: 0x0099ff,
          title: `↑ ${account.username}#${account.tag} Match History`,
          description: `**Match Information**`,
          fields: [
            {
              name: "◆ Region",
              value: `**AP** (Asia Pacific)`,
              inline: true,
            },
            {
              name: "□ Timezone",
              value: `**${timezone}**`,
              inline: true,
            },
          ],
          footer: {
            text: "Valorant Match History",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };

        return interaction.editReply({
          embeds: [embed],
          content: `\`\`\`json\n${content}\`\`\``
        });
      }
    } catch (error) {
      console.error("[ERROR] Error fetching record:", error);
      
      if (interaction.replied) {
        return interaction.followUp({
          content: "Failed to fetch match history.",
          flags: 64,
        });
      } else {
        return interaction.editReply({
          content: "Failed to fetch match history.",
        });
      }
    }
  },
};

export default recordCommand;
