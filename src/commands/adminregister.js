import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from "discord.js";

const adminregisterCommand = {
  data: new SlashCommandBuilder()
    .setName("adminregister")
    .setDescription("他のユーザーのValorantアカウントを登録します（管理者のみ）")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("アカウント登録対象のユーザー")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // 管理者権限をチェック
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "[ERROR] This command can only be used by administrators.",
        flags: 64,
      });
    }

    const targetUser = interaction.options.getUser("user");

    try {
      // Create modal
      const modal = new ModalBuilder()
        .setCustomId(`admin_register_modal_${targetUser.id}`)
        .setTitle(`${targetUser.username} Account Registration`);

      // Username input field
      const usernameInput = new TextInputBuilder()
        .setCustomId("admin_register_username")
        .setLabel("Valorant ID (Username)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Example: Tyu-ru")
        .setRequired(true)
        .setMaxLength(16);

      // Tag input field
      const tagInput = new TextInputBuilder()
        .setCustomId("admin_register_tag")
        .setLabel("Tag (after #)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Example: 1234")
        .setRequired(true)
        .setMaxLength(5);

      // Action row (line) for components
      const firstRow = new ActionRowBuilder().addComponents(usernameInput);
      const secondRow = new ActionRowBuilder().addComponents(tagInput);

      // Add components to modal
      modal.addComponents(firstRow, secondRow);

      // Show modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error("[ERROR] Error showing admin register modal:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "[ERROR] An error occurred. Please try again.",
          flags: 64,
        });
      }
    }
  },
};

export default adminregisterCommand;
