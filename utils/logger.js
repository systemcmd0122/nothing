// モダンでカラフルなログシステム

const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    
    // テキストカラー
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // 背景色
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m'
};

// タイムスタンプを取得
function getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// ログレベル別の出力
const Logger = {
    // 情報ログ
    info: (message, category = 'INFO') => {
        const timestamp = getTimestamp();
        console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.blue}ℹ ${category}${colors.reset} ${message}`);
    },

    // 成功ログ
    success: (message, category = 'SUCCESS') => {
        const timestamp = getTimestamp();
        console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.green}✓ ${category}${colors.reset} ${colors.green}${message}${colors.reset}`);
    },

    // 警告ログ
    warn: (message, category = 'WARNING') => {
        const timestamp = getTimestamp();
        console.warn(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.yellow}⚠ ${category}${colors.reset} ${colors.yellow}${message}${colors.reset}`);
    },

    // エラーログ
    error: (message, category = 'ERROR', err = null) => {
        const timestamp = getTimestamp();
        console.error(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.bgRed}${colors.white}✗ ${category}${colors.reset} ${colors.red}${message}${colors.reset}`);
        if (err) {
            console.error(`  ${colors.red}詳細: ${err.message}${colors.reset}`);
        }
    },

    // デバッグログ
    debug: (message, category = 'DEBUG') => {
        const timestamp = getTimestamp();
        console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.dim}🔍 ${category} ${message}${colors.reset}`);
    },

    // 区切り線
    divider: (title = '') => {
        const line = '═'.repeat(50);
        if (title) {
            console.log(`${colors.magenta}${line}${colors.reset}`);
            console.log(`${colors.magenta}${colors.bold}  ${title}${colors.reset}`);
            console.log(`${colors.magenta}${line}${colors.reset}`);
        } else {
            console.log(`${colors.magenta}${line}${colors.reset}`);
        }
    },

    // ステータスログ
    status: (status, message) => {
        const timestamp = getTimestamp();
        const statusColor = status === 'ON' ? colors.green : status === 'OFF' ? colors.red : colors.yellow;
        console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${statusColor}[${status}]${colors.reset} ${message}`);
    }
};

module.exports = Logger;
