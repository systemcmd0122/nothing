let allUsers = [];
let rowCounter = 0;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadStatus();
    
    // 30秒ごとに更新
    setInterval(loadUsers, 30000);
    setInterval(loadStatus, 30000);
});

// ユーザー情報の読み込み
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            displayUsers(allUsers);
            updateStatusIndicator(true);
        } else {
            showError('ユーザー情報の読み込みに失敗しました');
            updateStatusIndicator(false);
        }
    } catch (err) {
        console.error('Error loading users:', err);
        updateStatusIndicator(false);
    }
}

// ステータス情報の読み込み
async function loadStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.success) {
            animateValue('total-users', parseInt(document.getElementById('total-users').textContent) || 0, data.status.totalUsers, 500);
            document.getElementById('last-updated').textContent = formatTime(data.status.lastUpdated);
        }
    } catch (err) {
        console.error('Error loading status:', err);
    }
}

// 数字のアニメーション
function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = end > start ? 1 : -1;
    let current = start;
    const stepTime = Math.abs(Math.floor(duration / range));
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current;
        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// ユーザーをテーブルに表示
function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    rowCounter = 0;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="fas fa-inbox"></i> ユーザーが登録されていません</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        rowCounter++;
        return `
            <tr style="animation: slideInLeft 0.3s ease-out; animation-delay: ${rowCounter * 0.05}s;">
                <td style="color: var(--text-muted); font-weight: 600;">#${rowCounter}</td>
                <td style="color: var(--primary-color); font-weight: 600;"><i class="fas fa-user"></i> ${user.discordUsername || user.userId}</td>
                <td>${user.username}#${user.tag}</td>
                <td><span style="text-transform: uppercase; font-weight: 600;">${user.region}</span></td>
                <td><span style="text-transform: uppercase; font-weight: 600;">${user.platform}</span></td>
                <td>
                    <span class="rank-badge rank-${user.currentRank.toLowerCase()}">
                        ${user.currentRank}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// ステータスインジケーターの更新
function updateStatusIndicator(connected) {
    const indicator = document.querySelector('.status-dot');
    const statusText = document.getElementById('status-text');
    
    if (connected) {
        indicator.style.backgroundColor = 'var(--success-color)';
        statusText.textContent = 'オンライン';
    } else {
        indicator.style.backgroundColor = 'var(--danger-color)';
        statusText.textContent = 'オフライン';
    }
}

// タイムフォーマット
function formatTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// マッチ時間フォーマット
function formatMatchTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString('ja-JP');
}

// エラー表示
function showError(message) {
    console.error(message);
}
