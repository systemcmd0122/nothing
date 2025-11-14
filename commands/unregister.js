const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadUserData, saveUserData } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unregister')
        .setDescription('登録したValorantアカウントを削除'),
    
    async execute(interaction) {
        const userData = loadUserData();
        
        if (userData[interaction.user.id]) {
            // VALロールをすべて削除
            try {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                const valRoles = member.roles.cache.filter(r => r.name.startsWith('[VAL] '));
                for (const role of valRoles.values()) {
                    await member.roles.remove(role);
                }
            } catch (err) {
                console.error('ロール削除エラー:', err);
            }
            
            delete userData[interaction.user.id];
            saveUserData(userData);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ 削除完了')
                .setDescription('Valorantアカウントの登録を削除し、ランクロールを解除しました。')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ エラー')
                .setDescription('登録されているアカウントがありません。')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
