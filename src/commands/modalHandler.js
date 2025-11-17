import { registerValorantAccount } from "../services/valorant.js";

export async function handleModalSubmit(interaction) {
  if (!interaction.isModalSubmit()) return;

  // 通常のユーザー登録（/register または ボード）
  if (interaction.customId === "valorant_register_modal" || interaction.customId === "register_modal_board") {
    await interaction.deferReply({ flags: 64 }); // Ephemeral flag

    const username = interaction.fields.getTextInputValue(
      interaction.customId === "valorant_register_modal" 
        ? "valorant_username" 
        : "register_username_board"
    );
    const tag = interaction.fields.getTextInputValue(
      interaction.customId === "valorant_register_modal" 
        ? "valorant_tag" 
        : "register_tag_board"
    );
    const region = "ap"; // 固定
    const platform = "pc"; // 固定

    try {
      const result = await registerValorantAccount(
        interaction.user.id,
        username,
        tag,
        region,
        platform
      );

      if (result.success) {
        const embed = {
          color: 0x00ff00,
          title: "[OK] Account Registration Complete",
          description: "Valorant account has been registered successfully",
          fields: [
            {
              name: "▶ Username",
              value: `\`${username}\``,
              inline: true,
            },
            {
              name: "◆ Tag",
              value: `\`${tag}\``,
              inline: true,
            },
            {
              name: "■ Region",
              value: `**AP** (Asia Pacific)`,
              inline: true,
            },
            {
              name: "■ Platform",
              value: `**PC**`,
              inline: true,
            },
            {
              name: "Next Steps",
              value: "** Let's get started! **\n• `/rank` - Check rank information\n• `/record` - View match history\n• `/myaccount` - Check account info",
              inline: false,
            },
            {
              name: "▶ Notice",
              value: "• API updates may take a few seconds\n• Use `/register` to update your information",
              inline: false,
            },
          ],
          thumbnail: {
            url: interaction.user.displayAvatarURL({ size: 128 }),
          },
          footer: {
            text: "Valorant Account Registration Success",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };

        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.editReply({
          content: `[ERROR] ${result.message}`,
        });
      }
    } catch (error) {
      console.error("Error registering Valorant account:", error);
      return interaction.editReply({
        content: "[ERROR] An error occurred during account registration.",
      });
    }
  }
  
  // 管理者による他ユーザーの登録
  else if (interaction.customId.startsWith("admin_register_modal_")) {
    await interaction.deferReply({ flags: 64 });

    const targetUserId = interaction.customId.replace("admin_register_modal_", "");
    const username = interaction.fields.getTextInputValue("admin_register_username");
    const tag = interaction.fields.getTextInputValue("admin_register_tag");
    const region = "ap"; // 固定
    const platform = "pc"; // 固定

    try {
      const result = await registerValorantAccount(
        targetUserId,
        username,
        tag,
        region,
        platform
      );

      if (result.success) {
        const targetUser = await interaction.client.users.fetch(targetUserId);
        
        const embed = {
          color: 0x00ff00,
          title: "[OK] Account Registration Complete (Admin)",
          description: `${targetUser.username}'s Valorant account has been registered successfully`,
          fields: [
            {
              name: "▶ Target User",
              value: `<@${targetUserId}>`,
              inline: true,
            },
            {
              name: "◆ Admin",
              value: `${interaction.user.username}`,
              inline: true,
            },
            {
              name: "▶ Username",
              value: `\`${username}\``,
              inline: true,
            },
            {
              name: "◆ Tag",
              value: `\`${tag}\``,
              inline: true,
            },
            {
              name: "■ Region",
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
            text: "Admin Valorant Account Registration",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };

        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.editReply({
          content: `[ERROR] ${result.message}`,
        });
      }
    } catch (error) {
      console.error("Error registering Valorant account (admin):", error);
      return interaction.editReply({
        content: "[ERROR] An error occurred during account registration.",
      });
    }
  }
}
