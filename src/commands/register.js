import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";
import { registerValorantAccount } from "../services/valorant.js";

const registerCommand = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Valorantアカウントを登録します")
    .setDescriptionLocalizations({
      ja: "Valorantアカウントを登録します",
    }),
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("valorant_register_modal")
      .setTitle("Valorantアカウント登録");

    const usernameInput = new TextInputBuilder()
      .setCustomId("valorant_username")
      .setLabel("Valorant ユーザー名")
      .setPlaceholder("例: Player")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const tagInput = new TextInputBuilder()
      .setCustomId("valorant_tag")
      .setLabel("タグ (# の後の数字)")
      .setPlaceholder("例: 1234")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(5)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(usernameInput),
      new ActionRowBuilder().addComponents(tagInput)
    );

    await interaction.showModal(modal);
  },
};

export default registerCommand;
