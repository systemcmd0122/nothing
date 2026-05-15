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
          title: "[OK] アカウント登録完了",
          description: "Valorant アカウントが正常に登録されました。",
          fields: [
            {
              name: "▶ ユーザー名",
              value: `\`${username}\``,
              inline: true,
            },
            {
              name: "◆ タグ",
              value: `\`${tag}\``,
              inline: true,
            },
            {
              name: "■ リージョン",
              value: `**AP** (アジア太平洋)`,
              inline: true,
            },
            {
              name: "■ プラットフォーム",
              value: `**PC**`,
              inline: true,
            },
            {
              name: "次のステップ",
              value: "** さあ、始めましょう！ **\n• `/rank` - ランク情報を確認\n• `/record` - マッチ履歴を表示\n• `/myaccount` - アカウント情報を確認",
              inline: false,
            },
            {
              name: "▶ お知らせ",
              value: "• APIの更新には数秒かかる場合があります\n• `/register` を使用して情報を更新できます",
              inline: false,
            },
          ],
          thumbnail: {
            url: interaction.user.displayAvatarURL({ size: 128 }),
          },
          footer: {
            text: "Valorant アカウント登録成功",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };

        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.editReply({
          content: `[エラー] ${result.message}`,
        });
      }
    } catch (error) {
      console.error("Error registering Valorant account:", error);
      return interaction.editReply({
        content: "[エラー] アカウント登録中にエラーが発生しました。",
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
          title: "[OK] アカウント登録完了 (管理者)",
          description: `${targetUser.username} の Valorant アカウントが正常に登録されました。`,
          fields: [
            {
              name: "▶ 対象ユーザー",
              value: `<@${targetUserId}>`,
              inline: true,
            },
            {
              name: "◆ 管理者",
              value: `${interaction.user.username}`,
              inline: true,
            },
            {
              name: "▶ ユーザー名",
              value: `\`${username}\``,
              inline: true,
            },
            {
              name: "◆ タグ",
              value: `\`${tag}\``,
              inline: true,
            },
            {
              name: "■ リージョン",
              value: `**AP** (アジア太平洋)`,
              inline: true,
            },
            {
              name: "■ プラットフォーム",
              value: `**PC**`,
              inline: true,
            },
          ],
          thumbnail: {
            url: targetUser.displayAvatarURL({ size: 128 }),
          },
          footer: {
            text: "管理者による Valorant アカウント登録",
            icon_url: interaction.client.user.displayAvatarURL({ size: 64 }),
          },
          timestamp: new Date(),
        };

        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.editReply({
          content: `[エラー] ${result.message}`,
        });
      }
    } catch (error) {
      console.error("Error registering Valorant account (admin):", error);
      return interaction.editReply({
        content: "[エラー] アカウント登録中にエラーが発生しました。",
      });
    }
  }
}
