# 手動データ取得ツール

`manual-fetch.js` は個別のチャンネルデータを手動で取得・操作するためのコマンドラインツールです。

## 基本的な使用方法

```bash
# npm scriptを使用（推奨）
npm run fetch <command> <options>

# または直接実行
node manual-fetch.js <command> <options>
```

## 利用可能なコマンド

### 1. チャンネル情報取得・保存
```bash
npm run fetch channel UCxxxxxxxxxxxxxxxxxxxxx
```
- チャンネルの詳細情報を取得
- BGMフィルターを適用
- 条件を満たせばFirestoreに保存

### 2. チャンネル詳細表示（保存なし）
```bash
npm run fetch details UCxxxxxxxxxxxxxxxxxxxxx
```
- チャンネル情報を表示のみ
- `--save` オプションで保存も可能

### 3. 最新動画情報取得
```bash
npm run fetch latest UCxxxxxxxxxxxxxxxxxxxxx
```
- チャンネルの最新動画情報を表示

### 4. 最も人気の動画取得
```bash
npm run fetch popular UCxxxxxxxxxxxxxxxxxxxxx
```
- 再生回数が最も多い動画の情報を表示

### 5. 最初の動画取得
```bash
npm run fetch first UCxxxxxxxxxxxxxxxxxxxxx
```
- チャンネルの最初に投稿された動画を表示

### 6. フィルター検証
```bash
npm run fetch validate UCxxxxxxxxxxxxxxxxxxxxx
```
- チャンネルがBGMフィルター条件を満たすかチェック
- 保存はしない

### 7. データベース内チャンネル一覧
```bash
npm run fetch list
```
- 現在データベースに保存されているチャンネル一覧を表示

## オプション

### --save
詳細表示コマンドで保存も実行
```bash
npm run fetch details UCxxxxxxxxxxxxxxxxxxxxx --save
```

### --force
フィルター条件を無視して強制保存
```bash
npm run fetch channel UCxxxxxxxxxxxxxxxxxxxxx --force
```

### --verbose
詳細ログを表示
```bash
npm run fetch channel UCxxxxxxxxxxxxxxxxxxxxx --verbose
```

## 実用例

### 新しいチャンネルの調査
```bash
# 1. まず詳細情報を確認
npm run fetch details UCxxxxxxxxxxxxxxxxxxxxx

# 2. BGMチャンネルかどうか検証
npm run fetch validate UCxxxxxxxxxxxxxxxxxxxxx

# 3. 条件を満たせば保存
npm run fetch channel UCxxxxxxxxxxxxxxxxxxxxx
```

### 特定チャンネルの分析
```bash
# 基本情報
npm run fetch details UCxxxxxxxxxxxxxxxxxxxxx

# 最新動画
npm run fetch latest UCxxxxxxxxxxxxxxxxxxxxx

# 人気動画
npm run fetch popular UCxxxxxxxxxxxxxxxxxxxxx

# 最初の動画
npm run fetch first UCxxxxxxxxxxxxxxxxxxxxx
```

### データベース管理
```bash
# 現在のチャンネル数確認
npm run fetch list

# 条件を満たさないチャンネルを強制追加
npm run fetch channel UCxxxxxxxxxxxxxxxxxxxxx --force
```

## 出力例

### チャンネル詳細表示
```
✅ チャンネル情報:
📺 タイトル: Lofi Hip Hop Channel
👥 登録者数: 15,234
🎥 動画数: 89
👁️ 総再生回数: 2,345,678
📅 開設日: 2024/1/15
🔗 URL: https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxx
```

### 人気動画表示
```
✅ 最も人気の動画:
🎬 タイトル: Chill Lo-Fi Hip Hop Mix - Study & Relax
👁️ 再生回数: 123,456
👍 いいね数: 2,345
💬 コメント数: 89
📅 投稿日: 2024/3/1
🔗 URL: https://www.youtube.com/watch?v=xxxxxxxxxx
```

### フィルター検証
```
📋 フィルター検証結果:
チャンネル: Lofi Hip Hop Channel
✅ フィルター通過
📊 成長率: 245%
🏷️ キーワード: lofi, chill, study music
```

## エラー対処

### チャンネルが見つからない
```
❌ チャンネルが見つかりません
```
- チャンネルIDが正しいか確認
- チャンネルが存在するか確認

### フィルター不通過
```
❌ チャンネルがフィルター条件を満たしません
   --force オプションで強制保存できます
```
- BGM関連でない可能性
- 登録者数や成長率が条件を満たさない
- `--force` で強制保存可能

### API制限エラー
```
❌ YouTube API quota exceeded
```
- 1日のAPI使用量上限に達している
- 翌日まで待つか、APIキーを変更

## 注意事項

- YouTube APIの使用量制限に注意
- チャンネルIDは正確に入力する
- `--force` オプションは慎重に使用する
- 大量のデータ取得時は適切な間隔を空ける