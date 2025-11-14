// Valorantランクの定義（順序が重要）
const RANK_ORDER = [
    'Unranked',
    'Iron 1', 'Iron 2', 'Iron 3',
    'Bronze 1', 'Bronze 2', 'Bronze 3',
    'Silver 1', 'Silver 2', 'Silver 3',
    'Gold 1', 'Gold 2', 'Gold 3',
    'Platinum 1', 'Platinum 2', 'Platinum 3',
    'Diamond 1', 'Diamond 2', 'Diamond 3',
    'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
    'Immortal 1', 'Immortal 2', 'Immortal 3',
    'Radiant'
];

// ランクカラー（Discord色コード）
const RANK_COLORS = {
    'Unranked': 0x9E9E9E,
    'Iron': 0x4A4A4A,
    'Bronze': 0xA0522D,
    'Silver': 0xC0C0C0,
    'Gold': 0xFFD700,
    'Platinum': 0x00CED1,
    'Diamond': 0xB57EDC,
    'Ascendant': 0x32CD32,
    'Immortal': 0xFF4655,
    'Radiant': 0xFFFF00
};

// Valorant APIからランク情報を取得（リトライ機能付き）
async function getValorantRank(username, tag, region, platform = 'pc', retries = 3) {
    const baseUrl = process.env.VALORANT_API_BASE_URL || 'https://vaccie.pythonanywhere.com';
    const endpoint = platform === 'console' 
        ? `${baseUrl}/mmr/${username}/${tag}/${region}/console`
        : `${baseUrl}/mmr/${username}/${tag}/${region}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(endpoint, {
                timeout: 10000
            });
            
            if (response.ok) {
                const text = await response.text();
                return text;
            }
            
            // 429 (Too Many Requests) の場合、指数バックオフでリトライ
            if (response.status === 429) {
                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                if (attempt < retries) {
                    console.warn(`レート制限に達しました。${waitTime}ms 後に再試行します...`);
                    await sleep(waitTime);
                    continue;
                }
            }
            
            // 429以外のエラーはリトライしない
            throw new Error(`API Error: ${response.status}`);
        } catch (err) {
            if (attempt === retries) {
                console.error('API取得エラー:', err);
                return null;
            }
            
            // タイムアウト時は再試行
            const waitTime = Math.pow(2, attempt) * 1000;
            console.warn(`エラーが発生しました。${waitTime}ms 後に再試行します...`);
            await sleep(waitTime);
        }
    }
    
    return null;
}

// Valorant APIからマッチ履歴を取得（リトライ機能付き）
async function getValorantMatchHistory(username, tag, region, platform = 'pc', timezone = null, retries = 3) {
    const baseUrl = process.env.VALORANT_API_BASE_URL || 'https://vaccie.pythonanywhere.com';
    const tz = timezone || process.env.TIMEZONE || 'Asia/Tokyo';
    const platformPath = platform === 'console' ? 'console' : 'pc';
    const endpoint = `${baseUrl}/match_history/${username}/${tag}/${region}/${platformPath}?timezone=${tz}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(endpoint, {
                timeout: 10000
            });
            
            if (response.ok) {
                const text = await response.text();
                return text;
            }
            
            // 429 (Too Many Requests) の場合、指数バックオフでリトライ
            if (response.status === 429) {
                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                if (attempt < retries) {
                    console.warn(`レート制限に達しました。${waitTime}ms 後に再試行します...`);
                    await sleep(waitTime);
                    continue;
                }
            }
            
            // 429以外のエラーはリトライしない
            throw new Error(`API Error: ${response.status}`);
        } catch (err) {
            if (attempt === retries) {
                console.error('マッチ履歴取得エラー:', err);
                return null;
            }
            
            // タイムアウト時は再試行
            const waitTime = Math.pow(2, attempt) * 1000;
            console.warn(`エラーが発生しました。${waitTime}ms 後に再試行します...`);
            await sleep(waitTime);
        }
    }
    
    return null;
}

// ランク名を抽出（例: "Immortal 1, RR: 2 (-21)" -> "Immortal 1"）
function extractRankName(rankText) {
    if (!rankText) return null;
    
    // "ランク名, RR: ..." の形式から抽出
    const match = rankText.match(/^([^,]+)/);
    if (match) {
        return match[1].trim();
    }
    
    return null;
}

// ランクのティア名を取得（例: "Immortal 1" -> "Immortal"）
function getRankTier(rankName) {
    if (!rankName) return null;
    
    for (const tier of ['Radiant', 'Immortal', 'Ascendant', 'Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Iron']) {
        if (rankName.includes(tier)) {
            return tier;
        }
    }
    
    return 'Unranked';
}

// ランク比較（上がった/下がった/変わらず）
function compareRanks(oldRank, newRank) {
    if (!oldRank || !newRank) return 'unknown';
    
    const oldIndex = RANK_ORDER.indexOf(oldRank);
    const newIndex = RANK_ORDER.indexOf(newRank);
    
    if (oldIndex === -1 || newIndex === -1) return 'unknown';
    
    if (newIndex > oldIndex) return 'up';
    if (newIndex < oldIndex) return 'down';
    return 'same';
}

// スリープ関数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    RANK_ORDER,
    RANK_COLORS,
    getValorantRank,
    getValorantMatchHistory,
    extractRankName,
    getRankTier,
    compareRanks,
    sleep
};
