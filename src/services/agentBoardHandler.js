import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { getRandomAgentByRole, getRandomAgent } from "./agents.js";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const agentsDir = join(__dirname, "../../agents");

/**
 * Handle agent board button clicks
 * @param {Object} interaction - Button interaction
 */
export async function handleAgentBoardButton(interaction) {
  try {
    const customId = interaction.customId;

    if (!customId.startsWith("agent_pick_")) {
      return;
    }

    await interaction.deferReply();

    const pickType = customId.replace("agent_pick_", "");
    let selectedAgent;
    let title;

    switch (pickType) {
      case "duelist":
        selectedAgent = getRandomAgentByRole("duelist");
        title = "デュエリストからピック";
        break;
      case "sentinel":
        selectedAgent = getRandomAgentByRole("sentinel");
        title = "センチネルからピック";
        break;
      case "initiator":
        selectedAgent = getRandomAgentByRole("initiator");
        title = "イニシエーターからピック";
        break;
      case "controller":
        selectedAgent = getRandomAgentByRole("controller");
        title = "コントローラーからピック";
        break;
      case "random":
        selectedAgent = getRandomAgent();
        title = "ランダムピック";
        break;
      default:
        return interaction.editReply({
          content: "無効なボタンです。",
        });
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
    const pickEmbed = new EmbedBuilder()
      .setColor(selectedAgent.color)
      .setTitle(title)
      .setDescription(`${selectedAgent.name} をピックしました！`)
      .addFields(
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
        }
      )
      .setImage(`attachment://${selectedAgent.image}`)
      .setFooter({
        text: `${interaction.user.username} | Valorant Agent Picker`,
        iconURL: interaction.user.displayAvatarURL({ size: 64 }),
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [pickEmbed],
      files: [attachment],
    });

    console.log(
      `>>> ${interaction.user.username} picked ${selectedAgent.name} (${selectedAgent.role})`
    );

    // Delete message after 5 seconds
    setTimeout(async () => {
      try {
        const message = await interaction.fetchReply();
        if (message) {
          await message.delete();
          console.log(`[OK] Deleted agent pick message for ${interaction.user.username}`);
        }
      } catch (deleteError) {
        console.error("[ERROR] Failed to delete message:", deleteError);
      }
    }, 5000); // Delete after 5 seconds
  } catch (error) {
    console.error("[ERROR] Error handling agent board button:", error);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred.",
        });
      } else {
        await interaction.reply({
          content: "An error occurred.",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error("[ERROR] Failed to send error response:", replyError);
    }
  }
}
