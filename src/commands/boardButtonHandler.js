import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";

export async function handleBoardButton(interaction) {
  if (interaction.customId !== "register_button") {
    return;
  }

  try {
    // Create modal
    const modal = new ModalBuilder()
      .setCustomId("register_modal_board")
      .setTitle("Valorant Account Registration");

    // Username input field
    const usernameInput = new TextInputBuilder()
      .setCustomId("register_username_board")
      .setLabel("Valorant ID (Username)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Example: Tyu-ru")
      .setRequired(true)
      .setMaxLength(16);

    // Tag input field
    const tagInput = new TextInputBuilder()
      .setCustomId("register_tag_board")
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
    console.error("[ERROR] Error handling board button:", error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "[ERROR] An error occurred. Please try again.",
        flags: 64,
      });
    }
  }
}
