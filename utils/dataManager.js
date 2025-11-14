const fs = require('fs');
const path = require('path');

// ユーザーデータを保存するファイル
const DATA_FILE = path.join(__dirname, '../user_data.json');

// ユーザーデータの読み込み
function loadUserData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('データ読み込みエラー:', err);
    }
    return {};
}

// ユーザーデータの保存
function saveUserData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('データ保存エラー:', err);
    }
}

module.exports = {
    loadUserData,
    saveUserData
};
