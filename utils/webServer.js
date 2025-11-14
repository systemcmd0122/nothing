const express = require('express');
const path = require('path');
const { loadUserData } = require('./dataManager');
const { getValorantRank, getValorantMatchHistory } = require('./rankUtils');
const Logger = require('./logger');

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
