const express = require('express');
const path = require('path');
const { loadUserData, saveUserData } = require('./dataManager');
const { getValorantRank, getValorantMatchHistory } = require('./rankUtils');
const Logger = require('./logger');
const { verifyPassword, createToken, adminAuthMiddleware } = require('./adminAuth');

// Expressアプリケーションの設定
const app = express();
const PORT = process.env.WEB_PORT || 3000;

// 静的ファイルディレクトリ
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// ==================== Keep-Alive エンドポイント ====================

// Ping エンドポイント（Koyeb Keep-Alive用）
app.get('/ping', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Health チェックエンドポイント
app.get('/health', (_req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    };
    res.status(200).json(health);
});

// ==================== API エンドポイント ====================

// ホームページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 管理ページ
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// ユーザー一覧API
app.get('/api/users', (req, res) => {
    try {
        const userData = loadUserData();
        const users = Object.entries(userData).map(([userId, info]) => ({
            userId,
            username: info.username,
            tag: info.tag,
            region: info.region,
            platform: info.platform,
            currentRank: info.currentRank,
            lastUpdated: info.lastUpdated,
            discordUsername: info.discordUsername
        }));
        
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (err) {
        Logger.error('ユーザー情報取得エラー', 'API', err);
        res.status(500).json({
            success: false,
            error: 'ユーザー情報の取得に失敗しました'
        });
    }
});

// 特定ユーザーのランク情報API
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userData = loadUserData();
        const userInfo = userData[userId];
        
        if (!userInfo) {
            return res.status(404).json({
                success: false,
                error: 'ユーザーが見つかりません'
            });
        }
        
        const rankInfo = await getValorantRank(
            userInfo.username,
            userInfo.tag,
            userInfo.region,
            userInfo.platform
        );
        
        const matchHistory = await getValorantMatchHistory(
            userInfo.username,
            userInfo.tag,
            userInfo.region,
            userInfo.platform,
            'Asia/Tokyo'
        );
        
        res.json({
            success: true,
            user: {
                userId,
                discordUsername: userInfo.discordUsername,
                valorantUsername: `${userInfo.username}#${userInfo.tag}`,
                region: userInfo.region.toUpperCase(),
                platform: userInfo.platform.toUpperCase(),
                currentRank: userInfo.currentRank,
                rankInfo,
                matchHistory,
                lastUpdated: userInfo.lastUpdated
            }
        });
    } catch (err) {
        Logger.error(`ユーザー詳細取得エラー: ${req.params.userId}`, 'API', err);
        res.status(500).json({
            success: false,
            error: 'ユーザー情報の取得に失敗しました'
        });
    }
});

// ステータスAPI
app.get('/api/status', (req, res) => {
    try {
        const userData = loadUserData();
        const totalUsers = Object.keys(userData).length;
        
        res.json({
            success: true,
            status: {
                totalUsers,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (err) {
        Logger.error('ステータス取得エラー', 'API', err);
        res.status(500).json({
            success: false,
            error: 'ステータスの取得に失敗しました'
        });
    }
});

// ==================== 管理者用 API エンドポイント ====================

// ログイン
app.post('/api/admin/login', (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ error: 'パスワードが必要です' });
        }
        
        if (!verifyPassword(password)) {
            Logger.warn('管理者ログイン失敗: パスワード不一致', 'ADMIN');
            return res.status(401).json({ error: 'パスワードが正しくありません' });
        }
        
        const token = createToken();
        Logger.success('管理者がログインしました', 'ADMIN');
        
        res.json({
            success: true,
            token,
            message: 'ログイン成功'
        });
    } catch (err) {
        Logger.error('ログインエラー', 'ADMIN', err);
        res.status(500).json({ error: 'ログインに失敗しました' });
    }
});

// ユーザー一覧（管理者用）
app.get('/api/admin/users', adminAuthMiddleware, (req, res) => {
    try {
        const userData = loadUserData();
        res.json(userData);
    } catch (err) {
        Logger.error('管理者: ユーザー一覧取得エラー', 'ADMIN', err);
        res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
    }
});

// JSONデータ取得（管理者用）
app.get('/api/admin/data', adminAuthMiddleware, (req, res) => {
    try {
        const userData = loadUserData();
        res.json(userData);
    } catch (err) {
        Logger.error('管理者: JSONデータ取得エラー', 'ADMIN', err);
        res.status(500).json({ error: 'データの取得に失敗しました' });
    }
});

// JSONデータ保存（管理者用）
app.post('/api/admin/data/save', adminAuthMiddleware, (req, res) => {
    try {
        const newData = req.body;
        
        // データ検証
        if (typeof newData !== 'object' || newData === null) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }
        
        saveUserData(newData);
        Logger.success('管理者がJSONデータを保存しました', 'ADMIN');
        
        res.json({
            success: true,
            message: 'データを保存しました'
        });
    } catch (err) {
        Logger.error('管理者: JSONデータ保存エラー', 'ADMIN', err);
        res.status(500).json({ error: 'データの保存に失敗しました' });
    }
});

// ユーザー更新（管理者用）
app.post('/api/admin/user/update', adminAuthMiddleware, (req, res) => {
    try {
        const { userId, currentRank } = req.body;
        
        if (!userId || !currentRank) {
            return res.status(400).json({ error: 'userId と currentRank が必要です' });
        }
        
        const userData = loadUserData();
        
        if (!userData[userId]) {
            return res.status(404).json({ error: 'ユーザーが見つかりません' });
        }
        
        userData[userId].currentRank = currentRank;
        userData[userId].lastUpdated = new Date().toISOString();
        saveUserData(userData);
        
        Logger.success(`管理者がユーザー ${userId} のランクを更新: ${currentRank}`, 'ADMIN');
        
        res.json({
            success: true,
            message: 'ユーザーを更新しました'
        });
    } catch (err) {
        Logger.error('管理者: ユーザー更新エラー', 'ADMIN', err);
        res.status(500).json({ error: 'ユーザーの更新に失敗しました' });
    }
});

// ユーザー削除（管理者用）
app.delete('/api/admin/user/delete', adminAuthMiddleware, (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId が必要です' });
        }
        
        const userData = loadUserData();
        
        if (!userData[userId]) {
            return res.status(404).json({ error: 'ユーザーが見つかりません' });
        }
        
        const username = userData[userId].username;
        delete userData[userId];
        saveUserData(userData);
        
        Logger.success(`管理者がユーザー ${username} を削除しました`, 'ADMIN');
        
        res.json({
            success: true,
            message: 'ユーザーを削除しました'
        });
    } catch (err) {
        Logger.error('管理者: ユーザー削除エラー', 'ADMIN', err);
        res.status(500).json({ error: 'ユーザーの削除に失敗しました' });
    }
});

// ユーザー登録（管理者用）
app.post('/api/admin/user/register', adminAuthMiddleware, (req, res) => {
    try {
        const { discordId, discordUsername, username, tag, platform } = req.body;
        
        // バリデーション
        if (!discordId || !username || !tag) {
            return res.status(400).json({ error: '必須フィールドが不足しています' });
        }
        
        if (!discordId.match(/^\d{18}$/)) {
            return res.status(400).json({ error: 'Discord ID は18桁の数字である必要があります' });
        }
        
        const userData = loadUserData();
        
        // 既に登録されていないか確認
        if (userData[discordId]) {
            return res.status(409).json({ error: 'このユーザーは既に登録されています' });
        }
        
        // 新しいユーザーを登録
        userData[discordId] = {
            discordId,
            discordUsername,
            username,
            tag,
            region: 'ap',
            platform: platform || 'pc',
            currentRank: 'Unranked',
            lastUpdated: new Date().toISOString()
        };
        
        saveUserData(userData);
        
        Logger.success(`管理者が新規ユーザーを登録: ${username}#${tag} (Discord: ${discordUsername})`, 'ADMIN');
        
        res.status(201).json({
            success: true,
            message: 'ユーザーを登録しました',
            userId: discordId
        });
    } catch (err) {
        Logger.error('管理者: ユーザー登録エラー', 'ADMIN', err);
        res.status(500).json({ error: 'ユーザーの登録に失敗しました' });
    }
});

// サーバー起動関数
function startWebServer() {
    app.listen(PORT, () => {
        Logger.divider('🌐 Webサーバー');
        Logger.success(`Webサーバーが起動しました`, 'WEB');
        Logger.status('URL', `http://localhost:${PORT}`);
        Logger.info('ブラウザでアクセスしてください', 'WEB');
        Logger.divider();
    });
}

module.exports = {
    startWebServer,
    app
};
