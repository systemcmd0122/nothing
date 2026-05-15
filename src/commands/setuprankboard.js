import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { generateRankBoardEmbed } from "../services/rankBoardService.js";
import { updateGuildSettings } from "../services/guildSettings.js";
import { getAllRegisteredAccounts } from "../services/valorant.js";

const setuprankboardCommand = {
  data: new SlashCommandBuilder()
    .setName("setuprankboard")
    .setDescription("ランク一覧ボードをこのチャンネルに設置します（管理者のみ）")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "[ERROR] このコマンドは管理者のみ使用できます。",
        flags: 64,
      });
    }

    try {
      await interaction.deferReply({ flags: 64 });

      const guild = interaction.guild;
      const channel = interaction.channel;

      // Fetch all accounts to pass to embed generator
      const accounts = await getAllRegisteredAccounts();

      // Generate initial embed
      const embed = await generateRankBoardEmbed(guild, accounts);

      // Send the board message
      const message = await channel.send({
        embeds: [embed],
      });

      // Save settings to Firestore
      const success = await updateGuildSettings(guild.id, {
        rankBoardChannelId: channel.id,
        rankBoardMessageId: message.id,
      });

      if (!success) {
        return interaction.editReply({
          content: "[ERROR] 設定の保存に失敗しました。",
        });
      }

      const successEmbed = new EmbedBuilder()
        .setColor(0x00AA00)
        .setTitle("[OK] ボード設置完了")
        .setDescription(`ランク一覧ボードを ${channel} に設置しました。\n今後、定期的に自動更新されます。`)
        .setTimestamp();

      return interaction.editReply({
        embeds: [successEmbed],
      });
    } catch (error) {
      console.error("[ERROR] Error setting up rank board:", error);

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
          content: "[ERROR] ボードの設置中にエラーが発生しました。",
          flags: 64,
        });
      } else {
        return interaction.reply({
          content: "[ERROR] ボードの設置中にエラーが発生しました。",
          flags: 64,
        });
      }
    }
  },
};

export default setuprankboardCommand;
