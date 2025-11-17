import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getAllAgents, AGENTS } from "../services/agents.js";

const setupAgentBoardCommand = {
  data: new SlashCommandBuilder()
    .setName("setupagentboard")
    .setDescription("ランダムエージェントボードをこのチャンネルに設置します")
    .setDefaultMemberPermissions(0x0000000008) // Administrator permission
    .setDMPermission(false),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel;

      // ボードのメインEmbed
      const boardEmbed = {
        color: 0xfd4556, // Valorant red
        title: "ランダムエージェントボード",
        description:
          "下のボタンをクリックしてランダムにValorantのエージェントをピックしましょう！",
        fields: [
          {
            name: "ロール一覧",
            value: `デュエリスト (${AGENTS.duelist.length}人)\nセンチネル (${AGENTS.sentinel.length}人)\nイニシエーター (${AGENTS.initiator.length}人)\nコントローラー (${AGENTS.controller.length}人)`,
            inline: false,
          },
          {
            name: "使い方",
            value: "ロールを選択するか、ランダムボタンを押してエージェントをピックしてください！",
            inline: false,
          },
        ],
        footer: {
          text: "Valorant Agent Picker Board",
          icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
        },
      };

      // ボタン行1: ロール選択
      const roleButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("agent_pick_duelist")
          .setLabel("デュエリスト")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("agent_pick_sentinel")
          .setLabel("センチネル")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("agent_pick_initiator")
          .setLabel("イニシエーター")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("agent_pick_controller")
          .setLabel("コントローラー")
          .setStyle(ButtonStyle.Secondary)
      );

      // ボタン行2: ランダムピック
      const randomButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("agent_pick_random")
          .setLabel("ランダムピック")
          .setStyle(ButtonStyle.Primary)
      );

      // ボードを送信
      await channel.send({
        embeds: [boardEmbed],
        components: [roleButtons, randomButtons],
      });

      await interaction.editReply({
        content: "ランダムエージェントボードを設置しました！",
      });

      console.log(`Agent board set up in ${channel.name} (${channel.id})`);
    } catch (error) {
      console.error("Error setting up agent board:", error);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: `❌ エラーが発生しました: ${error.message}`,
        });
      } else {
        await interaction.reply({
          content: `❌ エラーが発生しました: ${error.message}`,
          ephemeral: true,
        });
      }
    }
  },
};

export default setupAgentBoardCommand;
