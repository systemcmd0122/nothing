import { SlashCommandBuilder } from "discord.js";
import { getPatchNotes } from "../services/patchNotification.js";

const patchCommand = {
    data: new SlashCommandBuilder()
        .setName("patch")
        .setDescription("現在のパッチ情報を表示します"),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const patchInfo = await getPatchNotes();

            if (!patchInfo) {
                return interaction.editReply({
                    content: "パッチ情報を取得できませんでした。",
                });
            }

            const embed = {
                color: 0xff6600,
                title: `📋 Valorant Patch ${patchInfo.version}`,
                description: patchInfo.description || "パッチ情報の詳細",
                fields: [],
                timestamp: new Date(),
            };

            if (patchInfo.releasedAt) {
                embed.fields.push({
                    name: "リリース日時",
                    value: patchInfo.releasedAt,
                    inline: false,
                });
            }

            if (patchInfo.notes) {
                const notes = patchInfo.notes.substring(0, 256) + (patchInfo.notes.length > 256 ? "..." : "");
                embed.fields.push({
                    name: "パッチノート",
                    value: notes,
                    inline: false,
                });
            }

            embed.fields.push({
                name: "詳細",
                value: "[公式パッチノート](https://valorantesports.com/news) で確認してください",
                inline: false,
            });

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(`[ERROR] Failed to fetch patch info: ${error.message}`);
            return interaction.editReply({
                content: "パッチ情報の取得に失敗しました。",
            });
        }
    },
};

export default patchCommand;
