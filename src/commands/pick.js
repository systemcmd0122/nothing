import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import {
  getRandomAgent,
  getRandomAgentByRole,
  getAllAgents,
  AGENTS,
} from "../services/agents.js";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const agentsDir = join(__dirname, "../../agents");

const pickCommand = {
  data: new SlashCommandBuilder()
    .setName("pick")
    .setDescription("Valorantのエージェントをランダムにピックします")
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("ロール指定（省略時はランダム）")
        .setRequired(false)
        .addChoices(
          { name: "デュエリスト", value: "duelist" },
          { name: "センチネル", value: "sentinel" },
          { name: "イニシエーター", value: "initiator" },
          { name: "コントローラー", value: "controller" },
          { name: "ランダム", value: "random" }
        )
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const roleOption = interaction.options.getString("role") || "random";

      let selectedAgent;
      let title;

      if (roleOption === "random") {
        selectedAgent = getRandomAgent();
        title = "ランダムピック";
      } else {
        selectedAgent = getRandomAgentByRole(roleOption);
        title = `${selectedAgent.role}からピック`;
      }

      if (!selectedAgent) {
        return interaction.editReply({
          content: "エージェントの取得に失敗しました。",
        });
      }

      // エージェント画像を添付
      const imagePath = join(agentsDir, selectedAgent.image);
      const attachment = new AttachmentBuilder(imagePath, {
        name: selectedAgent.image,
      });

      // ピック結果のEmbed
      const pickEmbed = {
        color: selectedAgent.color,
        title: title,
        description: `${selectedAgent.name} をピックしました！`,
        fields: [
          {
            name: "ロール",
            value: selectedAgent.role,
            inline: true,
          },
          {
            name: "出身地",
            value: selectedAgent.description.split("出身")[0] + "出身",
            inline: true,
          },
          {
            name: "プロフィール",
            value: selectedAgent.description,
            inline: false,
          },
        ],
        image: {
          url: `attachment://${selectedAgent.image}`,
        },
        footer: {
          text: "Valorant Agent Picker",
          icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
        },
        timestamp: new Date(),
      };

      await interaction.editReply({
        embeds: [pickEmbed],
        files: [attachment],
      });
    } catch (error) {
      console.error("Error in pick command:", error);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "エラーが発生しました。",
        });
      } else {
        await interaction.reply({
          content: "エラーが発生しました。",
          ephemeral: true,
        });
      }
    }
  },
};

export default pickCommand;
