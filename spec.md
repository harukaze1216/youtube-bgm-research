# 🎵 **youtube-bgm-research**

詳細仕様書 v0.3 （2025-06-23 時点）

---

## 1. 目的と概要

BGM 系 YouTube チャンネルを **ユーザーごとの YouTube API キー** で収集・分析し、急成長チャンネルの発掘と継続トラッキングを行う。フィードバックは開発者 GitHub リポジトリの Issue として送信する。

---

## 2. ユースケース

| #     | アクター   | シナリオ                                                     |
| ----- | ------ | -------------------------------------------------------- |
| UC-01 | 新規ユーザー | アカウントを作成し、個人の YouTube API キーを登録する                        |
| UC-02 | 既存ユーザー | 保存済みキーワードで自動検索し、チャンネル一覧を閲覧する                             |
| UC-03 | 既存ユーザー | 特定チャンネルを **追跡中** に切り替え、成長履歴を確認する                         |
| UC-04 | 既存ユーザー | 任意のチャンネルを手動で追加する                                         |
| UC-05 | 既存ユーザー | アプリの不具合を GitHub Issue として送信する                            |
| UC-06 | システム   | GitHub Actions / Cloud Scheduler が定期的に各ユーザーの追跡チャンネルを更新する |

---

## 3. 機能要件

### 3.1 認証・ユーザー管理

1. Firebase Authentication（Email / Password）
2. 利用開始時に **必須** で YouTube API キーを登録
3. ユーザープロフィールの編集（ニックネーム、言語、ダークモード既定など）

### 3.2 チャンネル発掘 & 追跡

1. **自動検索**

   * 138 語の BGM キーワードを走査
   * 開設 ≤90 日 & 登録者 ≥1 000 人を初期フィルタ
2. **手動追加**

   * チャンネル URL / ID で登録可能
   * API で存在チェック後、ユーザー専用ドキュメントを生成
3. **ステータス管理**

   * `unset`・`tracking`・`non-tracking`・`rejected`
   * UI でドラッグ & ドロップ／コンテキストメニュー変更
4. **成長率計算**

   * `(最新登録者数 − 過去登録者数) ÷ 過去登録者数` を日次で算出
   * 7 日移動平均も算出し、急上昇フラグを付与

### 3.3 ユーザー固有データ

* **完全分離**：Firestore ルールで `request.auth.uid` による read/write 制限
* 各ユーザーごとに

  * 自己保有 API キー
  * 収集したチャンネル一覧
  * 追跡履歴
  * 個人設定（UI 言語、表示カラム、通知 ON/OFF）

### 3.4 ダッシュボード & 可視化

* チャンネルテーブル（ソート／フィルタ／キーワード検索）
* 成長率ランキング（トップ 20）
* 個別チャンネル詳細（履歴グラフ：登録者数, 動画本数）
* ステータス別件数サマリ

### 3.5 フィードバック（GitHub Issue）

1. フロント → Cloud Function に POST
2. Function が `GITHUB_TOKEN` で `/repos/:owner/:repo/issues` に作成
3. 送信結果を `feedback_reports` に記録
4. 失敗時はステータス `error` で保持し、次回ログイン時に再送提案

---

## 4. 非機能要件

| 区分         | 要件                                                                                     |
| ---------- | -------------------------------------------------------------------------------------- |
| 性能         | 1 API 呼び出しあたり ≤ 400 ms（p95）、1 ユーザーあたり 10 000 API unit/日以内                              |
| スケーラビリティ   | Firestore と Functions の **サーバーレス** 採用により水平方向拡張                                         |
| 可用性        | Firebase SLA に準拠（99.95 %）                                                              |
| セキュリティ     | ・HTTPS 強制・Firebase Auth・Firestore ルール・GitHub Token は SecretManager / functions\:config |
| ローカライゼーション | 日本語 / 英語 UI 切替可                                                                        |
| アクセシビリティ   | WCAG 2.1 AA 準拠（キーボード操作・配色コントラスト）                                                       |
| ログ         | Cloud Functions / Firestore Audit Log を Stackdriver に出力                                |

---

## 5. データモデル（Firestore 詳細）

> `users/{uid}/...` 配下で**完全分離**するネスト戦略と、
> グローバルコレクション＋`userId` フィールド戦略の併用。
> 読み取り頻度が高いデータはユーザー別サブコレクションに置く。

### 5.1 コアコレクション

```text
users/{uid}
├─ profile            (doc)  … name, language, registeredAt, lastLogin
├─ settings           (doc)  … youtubeApiKey, uiPrefs, notificationPrefs
├─ channels           (col)  … per-user channel master
│   └─ {channelId} (doc)
│        ├─ title
│        ├─ subscriberCount
│        ├─ growthRate
│        ├─ status           // unset | tracking | non-tracking | rejected
│        ├─ scoreBgmRelev    // 0-100
│        └─ updatedAt
│
├─ trackingData       (col)  … heavy履歴を分離
│   └─ {autoId} (doc)
│        ├─ channelId
│        ├─ subscriberCount
│        ├─ recordedAt       // timestamp
│        └─ delta            // 前回比
│
└─ feedbackReports    (col)
    └─ {reportId} (doc)
         ├─ title
         ├─ body
         ├─ githubIssueNum   // null until sent
         ├─ status           // pending | sent | error
         └─ sentAt
```

#### インデックス例

```yaml
# channels where status == "tracking" order by growthRate desc
collectionGroup: channels
fields:
  - fieldPath: status
  - fieldPath: growthRate
    order: DESCENDING
```

### 5.2 共有参照コレクション（オプション）

* `global_channels/{channelId}`

  * チャンネルメタだけを一意に保持し、ユーザードキュメントで参照
  * 重複削減 & 定期更新の効率化

---

## 6. API 仕様（クライアント → Cloud Functions）

| 名称              | メソッド        | エンドポイント         | リクエスト body      | レスポンス              | 備考              |
| --------------- | ----------- | --------------- | --------------- | ------------------ | --------------- |
| createIssue     | POST        | `/api/feedback` | `{title, body}` | `{issueNumber}`    | GitHub Issue 作成 |
| refreshChannels | POST (auth) | `/api/refresh`  | none            | `{ processed: n }` | 自動検索実行          |
| recalcGrowth    | POST        | `/api/recalc`   | `{channelIds}`  | `{done: true}`     | 登録者履歴再計算        |

---

## 7. Cloud Functions 構成

| ファイル                | 機能                                | トリガー             |
| ------------------- | --------------------------------- | ---------------- |
| `createIssue.ts`    | GitHub Issue 作成                   | HTTPS            |
| `searchChannels.ts` | 138 キーワード検索 ➜ ユーザーごとに channels 追加 | Pub/Sub (hourly) |
| `updateTracking.ts` | trackingData 追加・growthRate 更新     | Pub/Sub (daily)  |
| `cleanup.ts`        | 古い履歴 180 日超を削除                    | Pub/Sub (weekly) |

---

## 8. Firestore セキュリティルール（抜粋）

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function isOwner() { return request.auth != null && request.auth.uid == resource.data.userId; }
    function isSelf(uid) { return request.auth != null && request.auth.uid == uid; }

    match /users/{userId} {
      allow read: if isSelf(userId);
      allow write: if false; // 直書きを禁止（profile 更新は subcollection 経由）
      
      match /channels/{channelId} {
        allow read, write: if isSelf(userId);
      }
      match /trackingData/{docId} {
        allow read, write: if isSelf(userId);
      }
      match /settings/{document=**} {
        allow read, write: if isSelf(userId);
      }
      match /feedbackReports/{reportId} {
        allow create: if isSelf(userId);
        allow read, delete: if isSelf(userId);
      }
    }
  }
}
```

---

## 9. UI / UX 詳細

* **レイアウト**：サイドバー + ヘッダー-バー、モバイル時はドロワー
* **テーブル**：列表示切替・多段ソート・ステータスごとに色バッジ
* **グラフ**：Chart.js で単純折れ線。色は Tailwind 既定 palette 使用
* **アクセシビリティ**：フォーカスリング、Tab ナビゲーション、alt テキスト

---

## 10. 今後のロードマップ（例）

| フェーズ | 期間  | 主要タスク                |
| ---- | --- | -------------------- |
| α    | 7 月 | ルール実装・GitHub 連携・自動検索 |
| β    | 8 月 | 通知機能・AI 分析（OpenAI）   |
| GA   | 9 月 | 多言語化・公開共有／招待機能       |

---

以上が **ユーザーごとのチャンネルデータ／設定** にフォーカスした詳細仕様です。
追加の項目や疑問点があればいつでもご指示ください。
