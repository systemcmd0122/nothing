// ===== 管理画面 JavaScript =====

let sessionToken = null;
let originalData = null;

// ===== ログイン処理 =====

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionToken = data.token;
            showLogin(false);
            loadUserData();
            loadJsonData();
            showToast('ログイン成功！', 'success');
        } else {
            loginError.textContent = data.error || 'ログインに失敗しました';
            loginError.style.display = 'block';
        }
    } catch (err) {
        console.error('ログインエラー:', err);
        loginError.textContent = 'エラーが発生しました';
        loginError.style.display = 'block';
    }
});

// ===== ログアウト処理 =====

document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionToken = null;
    showLogin(true);
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').style.display = 'none';
});

// ===== UI 制御 =====

function showLogin(show) {
    const loginContainer = document.getElementById('loginContainer');
    const adminPanel = document.getElementById('adminPanel');
    
    if (show) {
        loginContainer.classList.add('active');
        adminPanel.style.display = 'none';
    } else {
        loginContainer.classList.remove('active');
        adminPanel.style.display = 'flex';
    }
}

// パスワード表示切り替え
function togglePassword() {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// タブ切り替え
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        
        // タブボタンの切り替え
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // コンテンツの切り替え
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        // ユーザータブの場合はデータを読み込み
        if (tabName === 'users') {
            loadUserData();
        }
    });
});

// ===== ユーザー管理 =====

async function loadUserData() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                showLogin(true);
                return;
            }
            throw new Error('データ取得失敗');
        }

        const users = await response.json();
        displayUsers(users);
    } catch (err) {
        console.error('ユーザーデータ読み込みエラー:', err);
        showToast('ユーザーデータの読み込みに失敗しました', 'error');
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    
    if (Object.keys(users).length === 0) {
        usersList.innerHTML = '<p class="loading">ユーザーが登録されていません</p>';
        return;
    }

    usersList.innerHTML = Object.entries(users).map(([userId, user]) => `
        <div class="user-card">
            <div class="user-info">
                <div class="user-name">${escapeHtml(user.username)}</div>
                <div class="user-discord">Discord: ${escapeHtml(user.discordUsername)}</div>
                <div class="user-tag">${escapeHtml(user.username)}#${escapeHtml(user.tag)}</div>
            </div>
            <div class="user-details">
                <div class="detail-item">
                    <span class="detail-label">現在ランク</span>
                    <span class="detail-value">${escapeHtml(user.currentRank || 'Unranked')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">地域</span>
                    <span class="detail-value">${escapeHtml(user.region || 'N/A')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">最終更新</span>
                    <span class="detail-value">${formatDate(user.lastUpdated)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">プラットフォーム</span>
                    <span class="detail-value">${escapeHtml(user.platform || 'pc')}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ユーザー検索
document.getElementById('userSearch').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    document.querySelectorAll('.user-card').forEach(card => {
        const name = card.querySelector('.user-name').textContent.toLowerCase();
        const discord = card.querySelector('.user-discord').textContent.toLowerCase();
        const tag = card.querySelector('.user-tag').textContent.toLowerCase();
        const match = name.includes(searchTerm) || discord.includes(searchTerm) || tag.includes(searchTerm);
        card.style.display = match ? 'block' : 'none';
    });
});

// ===== JSON エディタ =====

async function loadJsonData() {
    try {
        const response = await fetch('/api/admin/data', {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        if (!response.ok) throw new Error('データ取得失敗');

        const data = await response.json();
        originalData = JSON.parse(JSON.stringify(data));
        document.getElementById('jsonEditor').value = JSON.stringify(data, null, 2);
    } catch (err) {
        console.error('JSONデータ読み込みエラー:', err);
        showToast('JSONデータの読み込みに失敗しました', 'error');
    }
}

// フォーマット
document.getElementById('formatBtn').addEventListener('click', () => {
    try {
        const data = JSON.parse(document.getElementById('jsonEditor').value);
        document.getElementById('jsonEditor').value = JSON.stringify(data, null, 2);
        showToast('JSONをフォーマットしました', 'success');
    } catch (err) {
        showToast('無効なJSONです', 'error');
    }
});

// 検証
document.getElementById('validateBtn').addEventListener('click', () => {
    const editor = document.getElementById('jsonEditor');
    const validationResult = document.getElementById('validationResult');

    try {
        JSON.parse(editor.value);
        validationResult.textContent = '✓ JSONは有効です';
        validationResult.classList.remove('error');
        validationResult.classList.add('success', 'show');
    } catch (err) {
        validationResult.textContent = `✗ エラー: ${err.message}`;
        validationResult.classList.remove('success');
        validationResult.classList.add('error', 'show');
    }
});

// リセット
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('編集を破棄してリセットしますか？')) {
        document.getElementById('jsonEditor').value = JSON.stringify(originalData, null, 2);
        document.getElementById('validationResult').classList.remove('show');
        showToast('リセットしました', 'success');
    }
});

// 保存
document.getElementById('saveBtn').addEventListener('click', async () => {
    try {
        const jsonText = document.getElementById('jsonEditor').value;
        const data = JSON.parse(jsonText);

        const response = await fetch('/api/admin/data/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('保存失敗');

        originalData = JSON.parse(JSON.stringify(data));
        showToast('データを保存しました！', 'success');
    } catch (err) {
        console.error('データ保存エラー:', err);
        showToast(err.message === 'Unexpected token' ? '無効なJSONです' : 'データの保存に失敗しました', 'error');
    }
});

// キャンセル
document.getElementById('cancelBtn').addEventListener('click', () => {
    if (confirm('編集を破棄しますか？')) {
        loadJsonData();
    }
});

// ===== ユーザー登録フォーム =====

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const registerError = document.getElementById('registerError');
    registerError.textContent = '';

    try {
        const userData = {
            discordId: document.getElementById('regDiscordId').value.trim(),
            discordUsername: document.getElementById('regDiscordUsername').value.trim(),
            username: document.getElementById('regValUsername').value.trim(),
            tag: document.getElementById('regValTag').value.trim(),
            region: 'ap',
            platform: document.getElementById('regPlatform').value
        };

        // バリデーション
        if (!userData.discordId.match(/^\d{18}$/)) {
            registerError.textContent = 'Discord ID は18桁の数字である必要があります';
            return;
        }

        if (!userData.discordUsername) {
            registerError.textContent = 'Discord ユーザー名を入力してください';
            return;
        }

        if (!userData.username) {
            registerError.textContent = 'Valorant ユーザー名を入力してください';
            return;
        }

        if (!userData.tag || userData.tag.length === 0) {
            registerError.textContent = 'Valorant タグを入力してください';
            return;
        }

        const response = await fetch('/api/admin/user/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (!response.ok) {
            registerError.textContent = result.error || 'ユーザー登録に失敗しました';
            return;
        }

        showToast(`${userData.username} を登録しました！`, 'success');
        document.getElementById('registerForm').reset();
        registerError.textContent = '';
        
        // ユーザー管理タブに切り替え
        setTimeout(() => {
            document.querySelector('[data-tab="users"]').click();
            loadUserData();
        }, 500);
    } catch (err) {
        console.error('ユーザー登録エラー:', err);
        registerError.textContent = 'エラーが発生しました';
    }
});

// ===== バックアップ機能 =====

// エクスポート
document.getElementById('exportBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/admin/data', {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        if (!response.ok) throw new Error('データ取得失敗');

        const data = await response.json();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('ファイルをダウンロードしました', 'success');
    } catch (err) {
        console.error('エクスポートエラー:', err);
        showToast('ダウンロードに失敗しました', 'error');
    }
});

// インポート
document.getElementById('importBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('ファイルを選択してください', 'error');
        return;
    }

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!confirm('このファイルのデータで上書きしますか？\n（この操作は取り消せません）')) {
            return;
        }

        const response = await fetch('/api/admin/data/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('保存失敗');

        showToast('ファイルをインポートしました！', 'success');
        fileInput.value = '';
        loadUserData();
        loadJsonData();
    } catch (err) {
        console.error('インポートエラー:', err);
        showToast('無効なJSONファイルです', 'error');
    }
});

// ===== ユーティリティ関数 =====

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeJson(obj) {
    return JSON.stringify(obj).replace(/'/g, "\\'");
}

// ===== 初期化 =====

showLogin(true);
