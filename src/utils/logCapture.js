/**
 * コンソールログをキャプチャするモジュール
 */

let logBuffer = [];
const MAX_LOGS = 500;

// 元の console.log を保存
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

/**
 * ログをバッファに追加
 */
function addLog(level, args) {
  const timestamp = new Date().toLocaleString('ja-JP');
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg);
    }
    return String(arg);
  }).join(' ');

  const logEntry = {
    timestamp,
    level,
    message,
    fullDate: new Date(),
  };

  logBuffer.push(logEntry);

  // バッファサイズを制限
  if (logBuffer.length > MAX_LOGS) {
    logBuffer = logBuffer.slice(-MAX_LOGS);
  }
}

/**
 * console.log をオーバーライド
 */
console.log = function(...args) {
  originalLog(...args);
  addLog('LOG', args);
};

/**
 * console.error をオーバーライド
 */
console.error = function(...args) {
  originalError(...args);
  addLog('ERROR', args);
};

/**
 * console.warn をオーバーライド
 */
console.warn = function(...args) {
  originalWarn(...args);
  addLog('WARN', args);
};

/**
 * console.info をオーバーライド
 */
console.info = function(...args) {
  originalInfo(...args);
  addLog('INFO', args);
};

/**
 * ログバッファを取得
 */
export function getLogs(limit = 100) {
  return logBuffer.slice(-limit);
}

/**
 * すべてのログを取得
 */
export function getAllLogs() {
  return logBuffer;
}

/**
 * ログバッファをクリア
 */
export function clearLogs() {
  logBuffer = [];
}

/**
 * レベル別でログをフィルタリング
 */
export function getLogsByLevel(level) {
  return logBuffer.filter(log => log.level === level);
}
