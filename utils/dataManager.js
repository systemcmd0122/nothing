const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

// ユーザーデータを保存するファイル
const DATA_FILE = path.join(__dirname, '../user_data.json');

// データ変更リスナー
let dataChangeListeners = [];

// ユーザーデータの読み込み
function loadUserData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        Logger.error('データ読み込みエラー', 'DATA', err);
    }
    return {};
}

// ユーザーデータの保存（エラーハンドリング強化版）
function saveUserData(data) {
    try {
        // データ検証
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid data format: must be an object');
        }

        // バックアップを作成
        if (fs.existsSync(DATA_FILE)) {
            const backupFile = `${DATA_FILE}.backup`;
            fs.copyFileSync(DATA_FILE, backupFile);
        }

        // 一時ファイルに書き込み
        const tempFile = `${DATA_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');

        // 一時ファイルが正しく書き込まれたか確認
        const written = fs.readFileSync(tempFile, 'utf8');
        JSON.parse(written); // JSONの有効性確認

        // 本ファイルに上書き
        fs.renameSync(tempFile, DATA_FILE);

        Logger.success('ユーザーデータを保存しました', 'DATA');
        
        // リスナーに通知
        notifyDataChange(data);
        
        return true;
    } catch (err) {
        Logger.error('データ保存エラー', 'DATA', err);
        
        // 一時ファイルがあれば削除
        const tempFile = `${DATA_FILE}.tmp`;
        if (fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // 削除失敗を無視
            }
        }
        
        throw err; // エラーを呼び出し側に返す
    }
}

// データ変更時のコールバック登録
function onDataChange(callback) {
    dataChangeListeners.push(callback);
}

// データ変更を通知
function notifyDataChange(data) {
    dataChangeListeners.forEach(listener => {
        try {
            listener(data);
        } catch (err) {
            Logger.error('リスナー実行エラー', 'DATA', err);
        }
    });
}

module.exports = {
    loadUserData,
    saveUserData,
    onDataChange,
    notifyDataChange
};
