import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const deleteRankRolesCommand = {
  data: new SlashCommandBuilder()
    .setName("deleterank")
    .setDescription("サーバー内のすべてのランクロールを削除します（管理者のみ）")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // 確認メッセージ表示
      const confirmEmbed = {
        color: 0xff0000,
        title: "*** Confirm Rank Role Deletion ***",
        description:
          "All rank roles on the server will be deleted.\nThis action cannot be undone. Are you sure?",
        fields: [
          {
            name: "Target",
            value:
              "Unranked, Iron, Bronze, Silver, Gold, Platinum, Diamond, Ascendant, Immortal, Radiant",
            inline: false,
          },
          {
            name: "Warning",
            value: "Clicking this button will immediately delete all rank roles.",
            inline: false,
          },
        ],
        footer: {
          text: "This operation will be executed immediately",
          icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
        },
      };

      const confirmButton = {
        type: 1,
        components: [
          {
            type: 2,
            style: 4, // Danger style (red)
            label: "Proceed with Deletion",
            custom_id: "confirm_delete_rank_roles",
          },
          {
            type: 2,
            style: 2, // Secondary style (gray)
            label: "Cancel",
            custom_id: "cancel_delete_rank_roles",
          },
        ],
      };

      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [confirmButton],
      });

      // ボタンのインタラクションを待機
      const filter = (i) =>
        (i.customId === "confirm_delete_rank_roles" ||
          i.customId === "cancel_delete_rank_roles") &&
        i.user.id === interaction.user.id;

      const buttonInteraction = await interaction.channel
        .awaitMessageComponent({ filter, time: 60000 })
        .catch(async () => {
          await interaction.editReply({
            content: ">>> Confirmation timeout. Operation cancelled.",
            embeds: [],
            components: [],
          });
          return null;
        });

      if (!buttonInteraction) return;

      // Cancel processing
      if (buttonInteraction.customId === "cancel_delete_rank_roles") {
        await buttonInteraction.deferUpdate();
        await interaction.editReply({
          content: "[ERROR] Operation cancelled. Rank roles will not be deleted.",
          embeds: [],
          components: [],
        });
        return;
      }

      // 削除実行
      await buttonInteraction.deferUpdate();

      const guild = interaction.guild;

      // ランク関連のキーワード
      const rankKeywords = [
        "Unranked",
        "Iron",
        "Bronze",
        "Silver",
        "Gold",
        "Platinum",
        "Diamond",
        "Ascendant",
        "Immortal",
        "Radiant",
      ];

      // 削除ロールを検出
      const rolesToDelete = [];
      for (const role of guild.roles.cache.values()) {
        // ロール名がランク関連キーワードを含むかチェック
        const isRankRole = rankKeywords.some((keyword) =>
          role.name.includes(keyword)
        );

        if (isRankRole) {
          rolesToDelete.push(role);
        }
      }

      if (rolesToDelete.length === 0) {
        await interaction.editReply({
          content: "▶ No rank roles found to delete.",
          embeds: [],
          components: [],
        });
        return;
      }

      // Display role deletion information
      const processingEmbed = {
        color: 0xffaa00,
        title: ">>> Processing Rank Role Deletion...",
        description: `Deleting ${rolesToDelete.length} roles...`,
        fields: [
          {
            name: "▶ Roles to Delete",
            value: `${rolesToDelete.length} roles`,
            inline: true,
          },
        ],
      };

      await interaction.editReply({
        embeds: [processingEmbed],
        components: [],
      });

      // ロール削除処理
      let deletedCount = 0;
      let failedCount = 0;
      const failedRoles = [];

      for (const role of rolesToDelete) {
        try {
          // Delete the role completely
          await role.delete("Bulk rank role deletion");
          console.log(`[OK] Deleted: ${role.name} (ID: ${role.id})`);
          deletedCount++;

          // API rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[ERROR] Deletion failed: ${role.name} - ${error.message}`);
          failedCount++;
          failedRoles.push({
            name: role.name,
            id: role.id,
            error: error.message,
          });

          // Continue to next role deletion even on failure
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Deletion result embed
      const resultEmbed = {
        color: failedCount === 0 ? 0x00ff00 : 0xffaa00,
        title: "[OK] Rank Role Deletion Complete",
        description: failedCount === 0 ? "All rank roles have been successfully deleted." : "Some roles failed to delete.",
        fields: [
          {
            name: "[OK] Successfully Deleted",
            value: `${deletedCount} roles`,
            inline: true,
          },
          {
            name: "[ERROR] Deletion Failed",
            value: `${failedCount} roles`,
            inline: true,
          },
        ],
      };

      // Add details of failed roles
      if (failedRoles.length > 0) {
        resultEmbed.fields.push({
          name: "Failed Roles",
          value: failedRoles
            .map((r) => `• ${r.name} (${r.error})`)
            .join("\n"),
          inline: false,
        });
      }

      await interaction.editReply({
        embeds: [resultEmbed],
        components: [],
      });

      console.log(
        `\n□ Rank Role Deletion Complete:\n[OK] Success: ${deletedCount} roles\n[ERROR] Failed: ${failedCount} roles`
      );
    } catch (error) {
      console.error("[ERROR] Rank role deletion error:", error);

      const errorEmbed = {
        color: 0xff0000,
        title: "[ERROR] An Error Occurred",
        description: `An error occurred while deleting rank roles.\n${error.message}`,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          embeds: [errorEmbed],
          components: [],
        });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true,
        });
      }
    }
  },
};

export default deleteRankRolesCommand;
