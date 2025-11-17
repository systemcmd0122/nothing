import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from "discord.js";

const setupboardCommand = {
  data: new SlashCommandBuilder()
    .setName("setupboard")
    .setDescription("アカウント登録用ボードを設置します（管理者のみ）")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // 管理者権限をチェック
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "[ERROR] This command can only be used by administrators.",
        flags: 64,
      });
    }

    try {
      await interaction.deferReply({ flags: 64 });

      // Create board embed
      const boardEmbed = new EmbedBuilder()
        .setColor(0xFF4655)
        .setTitle("▶ Valorant Account Registration Board")
        .setDescription(
          "Click the button below to register your Valorant account.\n\n" +
          "After registration, you can display your rank with the `/rank` command."
        )
        .setThumbnail("https://images.contentstack.io/v3/assets/blte86e01ceef8673ff/blt359f4da304976efd/5ecf4fcd588cd249ce331205/Valorant_logo_Large.png")
        .addFields(
          {
            name: "□ Required Information",
            value: "- Valorant ID (Username)\n- Tag (numbers after #)",
            inline: false,
          },
          {
            name: "■ Private",
            value: "Your information is stored securely.",
            inline: false,
          }
        )
        .setFooter({
          text: "unkonow bot • Valorant Account Registration",
          iconURL: interaction.client.user.displayAvatarURL({ size: 64 }),
        })
        .setTimestamp();

      // Create button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("register_button")
            .setLabel("Account Registration")
            .setStyle(ButtonStyle.Primary)
        );

      // Send message
      await interaction.channel.send({
        embeds: [boardEmbed],
        components: [row],
      });

      // Return success message
      const successEmbed = new EmbedBuilder()
        .setColor(0x00AA00)
        .setTitle("[OK] Board Setup Complete")
        .setDescription("Account registration board has been successfully set up.")
        .setTimestamp();

      return interaction.editReply({
        embeds: [successEmbed],
      });
    } catch (error) {
      console.error("[ERROR] Error setting up board:", error);
      
      if (interaction.replied) {
        return interaction.followUp({
          content: "[ERROR] Failed to set up board.",
          flags: 64,
        });
      } else {
        return interaction.editReply({
          content: "[ERROR] Failed to set up board.",
        });
      }
    }
  },
};

export default setupboardCommand;
