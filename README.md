# 経費管理システム (expense-management)

社内向け経費申請・承認・月次集計を行う Web アプリケーション。

## 技術スタック

- **バックエンド**: Node.js + Express, better-sqlite3 (SQLite), JWT, bcryptjs, multer
- **フロントエンド**: React 18 + TypeScript, Vite, React Router, axios
- **テスト**: Jest + supertest (バックエンド)

## ディレクトリ構成

```
expense-management/
├── backend/              # Express API サーバー
│   ├── src/
│   │   ├── db/           # SQLite 接続・スキーマ・初期化
│   │   ├── middleware/   # 認証ミドルウェア
│   │   ├── routes/       # auth / expenses / approvals / reports / categories / users
│   │   └── server.js
│   ├── scripts/seed.js   # 初期ユーザー・カテゴリ投入スクリプト
│   ├── __tests__/        # Jest テスト
│   ├── data/             # SQLite DB 出力先 (起動時に自動生成)
│   └── uploads/          # 領収書ファイル保存先
├── frontend/             # Vite + React アプリ
│   ├── src/
│   ├── index.html
│   └── vite.config.ts
└── README.md
```

## 起動手順

### 1. バックエンド (port 3001)

```bash
cd backend
cp .env.sample .env          # 環境変数を用意
npm install
npm run seed                 # 初期ユーザー・カテゴリを投入
npm run dev                  # nodemon で起動 (http://localhost:3001)
```

### 2. フロントエンド (port 5173)

```bash
cd frontend
npm install
npm run dev                  # Vite 開発サーバー (http://localhost:5173)
```

`/api/*` リクエストは Vite の proxy 設定により `http://localhost:3001` へ転送されます。

## 既定ポート / 環境変数

`backend/.env` (`.env.sample` をコピーして使用):

| 変数 | 既定値 | 説明 |
|------|--------|------|
| `PORT` | `3001` | バックエンド HTTP ポート |
| `JWT_SECRET` | `change-me-in-production` | JWT 署名キー (本番では必ず変更) |
| `JWT_EXPIRES_IN` | `7d` | JWT 有効期限 |
| `DB_PATH` | `./data/expense.db` | SQLite ファイルパス (`:memory:` で in-memory) |
| `UPLOAD_DIR` | `./uploads` | 領収書アップロード先 |

フロントエンドは Vite 既定の `5173` ポートで起動します。

## 初期ユーザー (seed 投入後)

| ロール | メールアドレス | パスワード |
|--------|----------------|------------|
| 管理者 (admin) | `admin@example.com` | `admin1234` |
| 承認者 (approver) | `approver@example.com` | `approver1234` |
| 申請者 (employee) | `applicant@example.com` | `applicant1234` |

カテゴリは `交通費 / 接待費 / 備品 / その他` の 4 種が投入されます。

## 動作確認シナリオ

1. **申請者ログイン**: ブラウザで `http://localhost:5173` を開き `applicant@example.com / applicant1234` でログイン
2. **経費申請**: 「新規申請」から金額・日付・カテゴリを入力し領収書 (画像/PDF) を添付して提出
3. **承認者ログイン**: 一度ログアウトし `approver@example.com / approver1234` でログイン
4. **承認**: 承認待ち一覧から対象申請を確認 (領収書プレビュー含む) し承認
5. **月次集計**: ダッシュボード画面で対象年月のカテゴリ別集計を確認
6. **CSV ダウンロード**: ダッシュボードから当月 CSV をダウンロード

## テスト実行

```bash
cd backend
npm test
```

Jest + supertest で API レイヤの統合テストを実行します。

## 備考

- 開発用に `JWT_SECRET` の既定値が設定されています。本番環境では必ず別の値に差し替えてください。
- `data/` および `uploads/` ディレクトリはサーバー起動時/seed 実行時に自動作成されます。
