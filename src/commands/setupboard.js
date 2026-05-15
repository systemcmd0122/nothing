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
        .setTitle("▶ Valorant アカウント登録ボード")
        .setDescription(
          "下のボタンをクリックして、Valorant アカウントを登録してください。\n\n" +
          "登録後、 `/rank` コマンドで自分のランクを表示できるようになります。\n" +
          "また、他のサーバーですでに登録済みの方は、このサーバーでもそのまま機能を利用いただけます。"
        )
        .setThumbnail("https://images.contentstack.io/v3/assets/blte86e01ceef8673ff/blt359f4da304976efd/5ecf4fcd588cd249ce331205/Valorant_logo_Large.png")
        .addFields(
          {
            name: "□ 必要な情報",
            value: "- Valorant ID (ユーザー名)\n- タグ (#の後の数字)",
            inline: false,
          },
          {
            name: "■ プライバシー",
            value: "あなたの情報は安全に保管されます。",
            inline: false,
          }
        )
        .setFooter({
          text: "unkonow bot • Valorant アカウント登録",
          iconURL: interaction.client.user.displayAvatarURL({ size: 64 }),
        })
        .setTimestamp();

      // Create button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("register_button")
            .setLabel("アカウント登録")
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
        .setTitle("[OK] ボード設置完了")
        .setDescription("アカウント登録ボードが正常に設置されました。")
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
