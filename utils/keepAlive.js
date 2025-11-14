const Logger = require('./logger');

/**
 * Keep-Alive機能
 * Koyebの無料枠でsleepモードにならないように、定期的にAPIにPingを送信
 */
function startKeepAlive() {
    const PING_INTERVAL = 2 * 60 * 1000; // 2分ごと
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
        Logger.warn('APP_URLが設定されていません。Keep-Alive機能は無効になります。', 'KEEP_ALIVE');
        return;
    }

    Logger.info(`Keep-Alive機能を有効にしました（${PING_INTERVAL / 1000}秒ごト）`, 'KEEP_ALIVE');
    Logger.info(`対象URL: ${appUrl}`, 'KEEP_ALIVE');

    setInterval(async () => {
        try {
            const url = appUrl.endsWith('/ping') ? appUrl : `${appUrl}/ping`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Rank-Tracker-Bot/1.0' }
            });

            clearTimeout(timeout);

            if (response.ok) {
                Logger.debug(`Keep-Alive Ping成功: ${url} (Status: ${response.status})`, 'KEEP_ALIVE');
            } else {
                Logger.warn(`Keep-Alive Ping失敗: ${url} (Status: ${response.status})`, 'KEEP_ALIVE');
            }
        } catch (error) {
            Logger.error(`Keep-Alive Pingエラー: ${error.message}`, 'KEEP_ALIVE', error);
        }
    }, PING_INTERVAL);
}

module.exports = { startKeepAlive };
