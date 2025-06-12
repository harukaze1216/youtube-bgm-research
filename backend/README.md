# BGM Channel Research Backend

YouTube APIを使用してBGM系チャンネルを自動収集・分析するNode.jsバックエンドサービス

## 🚀 機能

- **自動チャンネル発見**: BGM関連キーワードで新しいチャンネルを検索
- **インテリジェントフィルタリング**: 成長率・登録者数・チャンネル開設日でフィルタ
- **Firestore統合**: 収集したデータをFirebase Firestoreに保存
- **統計分析**: チャンネルの成長トレンドと統計を分析

## 📋 要件

- Node.js 18+
- YouTube Data API v3 キー
- Firebase プロジェクト（Firestore有効）

## ⚙️ セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして設定:

```bash
cp .env.example .env
```

`.env`ファイルを編集:

```env
YOUTUBE_API_KEY=your_youtube_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_KEY=base64_encoded_service_account_key
```

### 3. Firebase設定

Firebase Console で:
1. プロジェクト設定 > サービスアカウント
2. 新しい秘密鍵を生成
3. JSONファイルをBase64エンコード: `cat serviceAccountKey.json | base64 -w 0`
4. エンコードした値を`FIREBASE_SERVICE_ACCOUNT_KEY`に設定

## 🎯 使用方法

### データ収集の実行

```bash
# メインの収集プロセスを実行
npm run collect

# または直接実行
node collect-channels.js
```

### データの確認

```bash
# 保存されたチャンネル一覧を表示
npm start list

# 統計情報を表示
npm start stats

# 条件検索
npm start search --minSubscribers 5000 --orderBy growthRate
```

### 利用可能なコマンド

```bash
# ヘルプを表示
npm start help

# チャンネル一覧（最大20件）
npm start list --limit 20

# 統計情報
npm start stats

# 高成長チャンネルを検索
npm start search --minGrowthRate 50 --orderBy growthRate --limit 10

# 大規模チャンネルを検索
npm start search --minSubscribers 10000 --maxSubscribers 100000
```

## 🔍 収集ロジック

### 1. キーワード検索
- ランダムに選択されたBGM関連キーワードでYouTube検索
- 過去3ヶ月以内の動画に限定

### 2. チャンネル分析
- チャンネル詳細情報を取得
- 最初の動画と最新動画を特定
- 成長率を計算

### 3. フィルタリング条件
- **BGM関連**: タイトル・説明文にBGMキーワード含有
- **新規チャンネル**: 3ヶ月以内に開設 or 最初の動画投稿
- **適度な規模**: 1,000〜500,000登録者
- **アクティブ**: 最低5本の動画
- **成長性**: 10%以上の成長率

### 4. データ保存
- 重複チェック
- Firestoreに構造化データとして保存

## 📊 データ構造

```javascript
{
  channelId: "UCxxxxxxxxx",
  channelTitle: "Chill Lofi BGM",
  description: "Relaxing music for study and work",
  channelUrl: "https://www.youtube.com/channel/UCxxxxxxxxx",
  thumbnailUrl: "https://...",
  subscriberCount: 15000,
  videoCount: 45,
  totalViews: 2500000,
  publishedAt: "2024-01-15T...",
  firstVideoDate: "2024-01-20T...",
  growthRate: 85,
  keywords: ["lofi", "study music", "BGM"],
  latestVideo: {
    title: "Relaxing Piano Music",
    url: "https://www.youtube.com/watch?v=...",
    publishedAt: "2024-06-10T..."
  },
  createdAt: "2024-06-12T..."
}
```

## ⚡ 自動化

### GitHub Actions でのスケジュール実行

```yaml
# .github/workflows/collect-data.yml
name: Collect BGM Channels

on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜日 9:00 UTC

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
        working-directory: backend
      - run: npm run collect
        working-directory: backend
        env:
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
```

## 🎵 検索キーワード

### ジャンル
- lofi, chill music, jazz BGM, ambient music
- piano BGM, classical BGM, acoustic BGM
- instrumental music, chillhop, downtempo

### シーン
- study music, work music, focus music
- sleep music, relaxing BGM, coffee shop music
- reading music, concentration music

### 日本語
- BGM, 作業用BGM, 勉強用BGM
- リラックス BGM, 睡眠用BGM, カフェ BGM

## 🔧 設定のカスタマイズ

`collect-channels.js`の`COLLECTION_CONFIG`で調整可能:

```javascript
const COLLECTION_CONFIG = {
  keywordCount: 8,          // 使用キーワード数
  videosPerKeyword: 25,     // キーワードあたりの検索数
  monthsThreshold: 3,       // 対象期間（月）
  minSubscribers: 1000,     // 最小登録者数
  maxSubscribers: 500000,   // 最大登録者数
  minVideos: 5,             // 最小動画数
  minGrowthRate: 10,        // 最小成長率
  maxChannelsPerRun: 50,    // 1回の処理上限
};
```

## 📈 API制限

- YouTube Data API: 10,000 units/day
- 1回の実行で約500-1000 units消費
- 1日10-20回程度の実行が可能

## 🚨 エラー対処

### よくある問題

1. **YouTube API キーエラー**
   - APIキーが正しく設定されているか確認
   - YouTube Data API v3が有効になっているか確認

2. **Firebase接続エラー**
   - サービスアカウントキーが正しいか確認
   - Firestoreが有効になっているか確認

3. **API制限エラー**
   - 1日のクォータを超過している可能性
   - 翌日まで待機するか、複数のAPIキーを使用

## 📝 ログ

実行ログの例:

```
🎵 BGM Channel Collection Started
=====================================
📝 Selected keywords: lofi, study music, chill music, piano BGM
🔍 Searching videos for: "lofi"
   Found 15 unique channels
...
📊 Total unique channels found: 45
🔍 Fetching details for 45 channels...
✨ 12 channels passed filtering
📊 Saving 12 channels to Firestore...
✅ Saved channel: Lofi Study Beats (15000 subscribers)
✅ Collection completed successfully!
```