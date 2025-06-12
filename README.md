# 🎵 YouTube BGMチャンネル発掘Webアプリ

急成長中のBGM系YouTubeチャンネルを発掘・分析するWebアプリケーション

## 📋 概要

新規に開設されたBGM系YouTubeチャンネルの中から、急成長しているものを発掘・一覧表示するWebアプリです。

### ターゲットユーザー
- コラボ先・参考チャンネルを探しているクリエイター
- 新しいBGMを探しているリスナー
- 急成長の傾向を知りたい研究者・アナリスト

## ✨ 機能

### データ取得
- BGM系キーワードでYouTube動画を検索
- チャンネル情報の自動取得・分析
- フィルタ条件：
  - チャンネル開設から3ヶ月以内
  - 登録者数1000人以上

### Web表示
- 登録者数・初投稿日などでの並び替え
- BGMジャンル別フィルタ（lofi/jazz/睡眠など）
- チャンネル詳細情報の表示

## 🛠️ 技術スタック

### フロントエンド
- **React** + **Vite**
- **Tailwind CSS**
- **Firebase JS SDK (v9)**
- **GitHub Pages** (デプロイ)

### バックエンド
- **Node.js**
- **YouTube Data API v3**
- **Firebase Firestore**

## 📊 データ構造

### Firestoreコレクション: `bgm_channels`

```typescript
{
  channelId: string;           // YouTubeチャンネルID
  channelTitle: string;        // チャンネル名
  subscriberCount: number;     // 登録者数
  firstVideoDate: timestamp;   // 最初の動画の投稿日
  createdAt: timestamp;        // Firestore登録日時
  channelUrl: string;          // チャンネルURL
  thumbnailUrl: string;        // アイコン画像URL
  keywords: string[];          // 該当キーワード
  latestVideo: {
    title: string;
    url: string;
    publishedAt: timestamp;
  };
}
```

## 🔍 検索キーワード

### ジャンル
- `lofi`, `chill music`, `jazz BGM`, `ambient music`, `piano BGM`

### 利用シーン
- `study music`, `sleep music`, `relaxing BGM`, `coffee shop music`, `work BGM`

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- YouTube Data API v3 キー
- Firebase プロジェクト設定

### フロントエンド開発

```bash
cd frontend
npm install
npm run dev
```

### データ収集スクリプト

```bash
cd backend
npm install
node collect-channels.js
```

## 📈 今後の発展アイデア

- [ ] AIによるジャンル自動分類
- [ ] 成長率スコア表示
- [ ] LINE通知連携
- [ ] お気に入りチャンネル保存機能

## 📝 プロジェクト構成

```
youtube-bgm-research/
├── frontend/           # React + Vite フロントエンド
├── backend/            # Node.js データ収集スクリプト
├── docs/              # 仕様書・設計資料
└── README.md
```

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 ライセンス

MIT License