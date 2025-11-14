const { RANK_ORDER, RANK_COLORS, getRankTier, sleep } = require('./rankUtils');
const Logger = require('./logger');

// すべてのランクロールを作成
async function createAllRankRoles(guild) {
    Logger.info('ランクロール作成を開始中...', 'ROLES');
    const createdRoles = {};
    let createdCount = 0;
    
    for (const rankName of RANK_ORDER) {
        try {
            // 既存のロールを確認
            let role = guild.roles.cache.find(r => r.name === `[VAL] ${rankName}`);
            
            if (!role) {
                // ロールが存在しない場合は作成
                const tier = getRankTier(rankName);
                const color = RANK_COLORS[tier] || RANK_COLORS['Unranked'];
                
                role = await guild.roles.create({
                    name: `[VAL] ${rankName}`,
                    color: color,
                    reason: 'Valorantランクロール自動作成',
                    mentionable: false
                });
                
                Logger.success(`ロール作成: [VAL] ${rankName}`, 'ROLES');
                createdCount++;
                await sleep(1000); // レート制限対策
            }
            
            createdRoles[rankName] = role.id;
        } catch (err) {
            Logger.error(`ロール作成エラー (${rankName})`, 'ROLES', err);
        }
    }
    
    Logger.success(`ランクロール作成完了！ (${createdCount}個作成)`, 'ROLES');
    return createdRoles;
}

// ユーザーにランクロールを付与
async function updateUserRankRole(guild, userId, rankName) {
    try {
        const member = await guild.members.fetch(userId);
        if (!member) return false;
        
        // すべてのVALロールを削除
        const valRoles = member.roles.cache.filter(r => r.name.startsWith('[VAL] '));
        for (const role of valRoles.values()) {
            await member.roles.remove(role);
        }
        
        // 新しいランクロールを付与
        const newRole = guild.roles.cache.find(r => r.name === `[VAL] ${rankName}`);
        if (newRole) {
            await member.roles.add(newRole);
            Logger.success(`${member.user.username} に [VAL] ${rankName} ロールを付与`, 'ROLES');
            return true;
        }
        
        return false;
    } catch (err) {
        Logger.error(`ロール付与エラー (${userId})`, 'ROLES', err);
        return false;
    }
}

module.exports = {
    createAllRankRoles,
    updateUserRankRole
};
