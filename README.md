# 経費管理システム (expense-management)

社内向け経費申請・承認・月次集計を行う Web アプリケーション。

## 技術スタック

- **バックエンド**: Node.js + Express, better-sqlite3 (SQLite), JWT, bcryptjs, multer, pdfkit
- **フロントエンド**: React 18 + TypeScript, Vite, React Router, axios, Tailwind CSS
- **テスト**: Jest + supertest (バックエンド)

## ディレクトリ構成

```
expense-management/
├── backend/              # Express API サーバー
│   ├── src/
│   │   ├── db/           # SQLite 接続・スキーマ・初期化
│   │   ├── middleware/   # 認証ミドルウェア
│   │   ├── routes/       # auth / expenses / approvals / reports / categories / users / templates / notifications / months-closed / admin-import / exports / admin_categories / attachments
│   │   └── server.js
│   ├── migrations/       # 追加マイグレーション SQL (001〜007)
│   ├── scripts/
│   │   ├── migrate.js    # migrations/ 配下の SQL を順次適用
│   │   └── seed.js       # スキーマ + マイグレーション + 初期ユーザー/カテゴリ投入
│   ├── __tests__/        # Jest テスト
│   ├── data/             # SQLite DB 出力先 (起動時に自動生成)
│   └── uploads/          # 領収書ファイル保存先
├── frontend/             # Vite + React アプリ
│   ├── src/
│   ├── index.html
│   └── vite.config.ts
├── start.bat             # Windows ワンクリック起動スクリプト
└── README.md
```

## 起動手順

### 事前準備

```bash
cd backend
cp .env.sample .env          # 環境変数を用意
npm install
npm run seed                 # スキーマ + マイグレーション + 初期ユーザー/カテゴリ投入
cd ../frontend
npm install
```

### 1. バックエンド (port 3001)

```bash
cd backend
npm run dev                  # nodemon で起動 (http://localhost:3001)
```

### 2. フロントエンド (port 5173)

```bash
cd frontend
npm run dev                  # Vite 開発サーバー (http://localhost:5173)
```

`/api/*` リクエストは Vite の proxy 設定により `http://localhost:3001` へ転送されます。

### Windows ワンクリック起動 (start.bat)

リポジトリルートの `start.bat` をダブルクリックすると、backend (3001) と frontend (5173) を別ウィンドウで起動し、ブラウザで `http://localhost:5173` を開きます。

- 前提: `NODE_DIR` (既定 `C:\Program Files\nodejs`) に Node.js がインストール済みであること。別パスの場合は `start.bat` 冒頭の `NODE_DIR` を書き換える
- 事前に `backend/.env` 作成、`backend/npm install`、`backend/npm run seed`、`frontend/npm install` を済ませておくこと (start.bat はこれらを実行しない)
- 各ウィンドウ内で `Ctrl+C` を押すと開発サーバーを停止できる

## npm scripts

### backend

| script | 内容 |
|---|---|
| `npm run dev` | nodemon で `src/server.js` を起動 (port 3001) |
| `npm start` | node で `src/server.js` を起動 |
| `npm run init-db` | `src/db/init.js` でスキーマ初期化 |
| `npm run migrate` | `migrations/` 配下の追加マイグレーション SQL を順次適用 |
| `npm run seed` | `schema.sql` + `migrations/` を内包し、初期ユーザー・カテゴリを投入 |
| `npm test` | Jest + supertest による API レイヤ統合テスト |

### frontend

| script | 内容 |
|---|---|
| `npm run dev` | Vite 開発サーバー (port 5173) |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run preview` | build 成果物のプレビュー |

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

| ロール (role) | メールアドレス | パスワード | 備考 |
|--------|----------------|------------|------|
| 管理者 (admin) | `admin@example.com` | `admin1234` | 全機能 |
| 承認者 (approver) | `approver@example.com` | `approver1234` | 承認・月次 PDF |
| 申請者 (employee) | `applicant@example.com` | `applicant1234` | メール上 `applicant` / role 上 `employee` の対応 |
| 経理 (accounting) | (seed 未投入) | — | months-closed / admin/import / exports で利用されるロール。利用時は手動投入が必要 |

カテゴリは `交通費 / 接待費 / 備品 / その他` の 4 種が投入されます。

## マイグレーション一覧 (`backend/migrations/`)

| # | ファイル | 内容 |
|---|---|---|
| 001 | `001_attachments.sql` | 添付ファイル (領収書) テーブルを追加 |
| 002 | `002_audit_logs.sql` | 操作監査ログテーブルを追加 |
| 003 | `003_templates.sql` | 申請テンプレートテーブルを追加 |
| 004 | `004_months_closed.sql` | 月次締めテーブルを追加 |
| 005 | `005_notifications.sql` | 通知テーブルを追加 |
| 006 | `006_categories_extend.sql` | カテゴリ拡張カラム追加 |
| 007 | `007_indexes.sql` | パフォーマンス向けインデックス追加 |

`npm run seed` はスキーマ初期化後にこれらをすべて適用し、`npm run migrate` は migrations のみを適用します。

## API 一覧

| ベース URL | 概要 | 主なロール |
|---|---|---|
| `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` | 認証 (ログイン / 登録 / 自己情報) | 全 |
| `/api/expenses` | 経費申請の作成・一覧・詳細・更新・削除・提出 | employee / approver / admin |
| `/api/expenses/:id/attachments` | 領収書アップロード・取得・削除 | employee / approver / admin |
| `/api/expenses/:id/approve`, `/api/expenses/:id/reject` | 承認・差戻し | approver / admin |
| `/api/categories` | カテゴリ参照 (申請者向け) | 全 |
| `/api/admin/categories` | カテゴリ管理 (作成・更新・削除) | admin |
| `/api/admin/users` | ユーザー管理 | admin |
| `/api/reports` | 月次集計・カテゴリ別集計 | 全 (権限により範囲制限) |
| `/api/templates` | 申請テンプレート CRUD | 全 |
| `/api/admin/months-closed` | 月次締め状態の参照・更新 | admin / accounting |
| `/api/notifications` | 通知一覧・既読化 | 全 |
| `/api/admin/import` | CSV インポート | admin / accounting |
| `/api/exports` | 月次 PDF / CSV エクスポート | approver / admin / accounting |

## 画面一覧

`frontend/src/pages/` 配下の画面とアクセス可能ロール:

| パス | 画面 | アクセス可能ロール |
|---|---|---|
| `/login` | ログイン | 公開 |
| `/register` | 新規登録 | 公開 |
| `/` | ホーム (HomePage) | 全認可ユーザー |
| `/expenses` | 自分の申請一覧 (MyExpensesPage) | 全認可ユーザー |
| `/expenses/new`, `/expenses/:id/edit` | 申請フォーム | 全認可ユーザー |
| `/expenses/:id` | 申請詳細 | 全認可ユーザー |
| `/dashboard` | ダッシュボード (月次集計) | 全認可ユーザー |
| `/notifications` | 通知一覧 | 全認可ユーザー |
| `/templates`, `/templates/new`, `/templates/:id/edit` | テンプレート一覧・作成・編集 | 全認可ユーザー |
| `/approvals` | 承認待ち一覧 | approver / admin |
| `/admin/expenses` | 全申請管理 | admin |
| `/admin/users` | ユーザー管理 | admin |
| `/admin/categories` | カテゴリ管理 | admin |
| `/admin/import` | CSV インポート | admin |
| `/exports/monthly` | 月次 PDF 出力 | approver / admin / accounting |

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
