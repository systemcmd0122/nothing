# 通知・アラート機能 実装完了

## ✅ 実装した機能

### 1️⃣ ランク更新時の自動通知

**機能:**
- 10分ごとに全ユーザーのランク情報をチェック
- ランク変動を自動検出
- DMで自動通知を送信

**通知タイプ:**
- 🎉 **ランクアップ**: 前のランク → 新しいランク
- 📉 **ランクダウン**: 前のランク → 新しいランク  
- 📊 **ディビジョン変更**: 同じランク内でのディビジョン変更
- 🔄 **RR変動**: RRの増減を通知

**スケジューラー:**
```
定期実行: 10分ごと
サービス: rankChangeTracker.js
```

---

### 2️⃣ 友人のランク変動アラート

**コマンド: `/follow`**

**サブコマンド:**
- `/follow add @user` - プレイヤーをフォロー追加
- `/follow remove @user` - プレイヤーをフォロー解除
- `/follow list` - フォロー中のプレイヤー一覧表示

**機能:**
- フォロー中のプレイヤーのランク変動を自動監視
- 変動時にDMで即座に通知
- フォロー対象の Valorant アカウント情報を表示

**通知内容例:**
```
【フォロー中のプレイヤーのランク変動】
**username#tag** 🎉 ランクアップ！
Bronze2 → Bronze3
```

---

### 3️⃣ 大型パッチ・アップデート通知

**機能:**
- 30分ごとに新しいパッチをチェック
- 新しいパッチがリリースされたら全ユーザーに通知
- パッチバージョンと概要を表示

**スケジューラー:**
```
定期実行: 30分ごと
サービス: patchNotification.js
```

**コマンド: `/patch`**
- 現在のパッチ情報を表示
- パッチノートへのリンク提供

---

## 📋 通知設定管理

**コマンド: `/notifysettings`**

**サブコマンド:**

1. **`/notifysettings view`**
   - 現在の通知設定を表示
   - ✅ 有効/❌ 無効のステータス表示

2. **`/notifysettings rankupdate <true|false>`**
   - ランク更新通知の有効/無効
   - ランクアップ/ダウン両方に適用

3. **`/notifysettings patch <true|false>`**
   - パッチ・アップデート通知の有効/無効

4. **`/notifysettings followed <true|false>`**
   - フォロー中プレイヤーのランク変動通知の有効/無効

---

## 🗄️ Firebase データベース構造

### `notification_settings` コレクション
```javascript
{
  userId: "Discord User ID",
  rankUpdateNotifications: boolean,
  rankUpNotifications: boolean,
  rankDownNotifications: boolean,
  patchNotifications: boolean,
  followedPlayersNotifications: boolean,
  dmNotifications: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `player_follows` コレクション
```javascript
{
  userId: "Discord User ID",
  following: ["user_id_1", "user_id_2", ...],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `rank_status_history` コレクション
```javascript
{
  userId: "Discord User ID",
  currentRank: "Silver",
  currentDivision: "2",
  currentRR: 28,
  updatedAt: timestamp
}
```

### `system` コレクション
```javascript
{
  // ドキュメントID: "last_patch_check"
  lastPatchVersion: "9.02",
  lastCheckedAt: timestamp
}
```

---

## 🔄 自動スケジューラー

ボット起動時に自動実行される定期タスク:

| タスク | 間隔 | 説明 |
|--------|------|------|
| ランク同期 | 5分 | ユーザーランクの同期とロール付与 |
| ランク変動チェック | 10分 | ランク変動検出と通知送信 |
| パッチチェック | 30分 | 新パッチ検出と通知送信 |

---

## 📊 通知フロー図

```
【ランク更新時の自動通知】
Bot実行 → 10分ごとにチェック → ランク変動検出
→ 通知設定確認 → DMで即座に通知

【友人ランク変動アラート】
Bot実行 → 10分ごとにチェック → ランク変動検出
→ フォローしているユーザーを検索
→ 各フォロワーの通知設定確認 → DMで通知

【パッチ通知】
Bot実行 → 30分ごとにチェック → 新パッチ検出
→ すべてのユーザーを検索
→ 各ユーザーの通知設定確認 → DMで通知
```

---

## 🚀 使用方法

### 1. ランク更新通知の有効化
```
/notifysettings rankupdate true
```

### 2. プレイヤーをフォロー
```
/follow add @username
```

### 3. フォロー中のプレイヤー一覧確認
```
/follow list
```

### 4. パッチ情報表示
```
/patch
```

### 5. 通知設定確認
```
/notifysettings view
```

---

## 💾 ファイル構成

新規作成ファイル:
- `src/services/notificationService.js` - 通知管理サービス
- `src/services/rankChangeTracker.js` - ランク変動追跡サービス
- `src/services/patchNotification.js` - パッチ通知サービス
- `src/commands/notifysettings.js` - 通知設定コマンド
- `src/commands/follow.js` - フォローコマンド
- `src/commands/patch.js` - パッチコマンド

更新ファイル:
- `index.js` - 新コマンド登録とスケジューラー追加

---

## ✨ 特徴

✅ **自動監視**: ユーザーのアクションなしで自動的にランク変動を監視  
✅ **リアルタイム通知**: 10分ごとのチェックで素早く通知  
✅ **柔軟な設定**: 各ユーザーが通知をカスタマイズ可能  
✅ **フォロー機能**: 友人のランク変動を追跡  
✅ **パッチ通知**: ゲーム内のアップデート情報を自動配信  
✅ **高速**: DMでの即座な通知

---

## 🎯 今後の拡張案

- [ ] ランク変動履歴の保存と分析
- [ ] 特定ランク達成時の祝い機能
- [ ] 複数人の同時通知グループ化
- [ ] Webhookによるチャンネル通知
- [ ] スケジュール変更のカスタマイズ機能
