// ===== 管理者認証ユーティリティ =====

const crypto = require('crypto');
const Logger = require('./logger');

// 環境変数から管理者パスワードを設定（ハッシュ化）
const ADMIN_PASSWORD_HASH = hashPassword('taisuke0122');

// パスワードをハッシュ化
function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password + process.env.ADMIN_SALT || 'default_salt_key')
        .digest('hex');
}

// パスワードを検証
function verifyPassword(password) {
    const hash = hashPassword(password);
    return hash === ADMIN_PASSWORD_HASH;
}

// セッショントークンを生成
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// トークン管理（メモリ内）
const activeTokens = new Map();

// トークンを検証
function validateToken(token) {
    if (!activeTokens.has(token)) {
        return false;
    }
    
    const tokenData = activeTokens.get(token);
    
    // 24時間後に期限切れ
    if (Date.now() - tokenData.createdAt > 24 * 60 * 60 * 1000) {
        activeTokens.delete(token);
        return false;
    }
    
    return true;
}

// トークンを作成
function createToken() {
    const token = generateToken();
    activeTokens.set(token, {
        createdAt: Date.now()
    });
    
    Logger.success('管理者トークンを作成しました', 'ADMIN');
    return token;
}

// トークンを無効化
function revokeToken(token) {
    activeTokens.delete(token);
    Logger.info('トークンを無効化しました', 'ADMIN');
}

// 認証ミドルウェア
function adminAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '認証が必要です' });
    }
    
    const token = authHeader.substring(7);
    
    if (!validateToken(token)) {
        return res.status(401).json({ error: 'トークンが無効です' });
    }
    
    next();
}

module.exports = {
    verifyPassword,
    generateToken,
    validateToken,
    createToken,
    revokeToken,
    adminAuthMiddleware,
    ADMIN_PASSWORD_HASH
};
