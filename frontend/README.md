# Expense Management Frontend

経費精算システムのフロントエンド (React + TypeScript + Vite + Tailwind)。

## 開発コマンド

```bash
npm run dev      # 開発サーバ起動 (Vite)
npm run build    # 型チェック + 本番ビルド
npm run preview  # build 成果物のプレビュー
```

## ディレクトリ構成

```
src/
  api/          # バックエンド API クライアント (axios)
  components/
    ui/         # 共通 UI コンポーネント (18種)
    layout/     # AppLayout / Sidebar / Topbar
  context/      # AuthContext, ThemeContext
  lib/          # 汎用ユーティリティ (cn 等)
  pages/        # ルート単位の画面
  routes/       # ProtectedRoute 等
  types/        # 型定義
  App.tsx       # ルーティング (AppLayout 配下に認可ルート群)
  main.tsx      # エントリ (BrowserRouter / ThemeProvider / AuthProvider)
  styles.css    # CSS 変数 (デザイントークン) + ベーススタイル
```

## デザイントークン

`src/styles.css` の `:root` および `[data-theme="dark"]` で CSS 変数として定義。
`tailwind.config.ts` で `var(--token)` を Tailwind ユーティリティにマッピング。

| カテゴリ | 変数 |
|---|---|
| カラー | `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-primary-hover`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info` |
| フォント | `--font-sans`, `--font-mono` |
| フォントサイズ | `--fs-xs`, `--fs-sm`, `--fs-md`, `--fs-lg`, `--fs-xl`, `--fs-2xl` |
| フォントウェイト | `--fw-regular`, `--fw-medium`, `--fw-bold` |
| 角丸 | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` |
| シャドウ | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| スペーシング | `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-6`, `--space-8` |

ダークモードは `[data-theme="dark"]` でカラー/シャドウを上書き。

## テーマ拡張方法

1. `src/styles.css` の `:root` に新しい CSS 変数を追加。必要に応じ `[data-theme="dark"]` で上書き値を定義
2. `tailwind.config.ts` の `theme.extend` に `var(--...)` でマッピングを追加
3. コンポーネントから Tailwind ユーティリティ経由で参照 (例: `bg-surface`, `text-text-muted`)

`ThemeContext` 自体は変更不要 (mode 切替・`document.documentElement.dataset.theme` 反映を担当)。

## コンポーネント一覧

### ui/ (18種)

Avatar, Badge, Button, Card, Checkbox, Dialog, DropdownMenu, EmptyState, Input, Pagination, Select, Skeleton, Switch, Table, Tabs, Textarea, Toast, Tooltip

すべて `src/components/ui/index.ts` から re-export。

### layout/ (3種)

| コンポーネント | 用途 | 主な props |
|---|---|---|
| `AppLayout` | 認可ルートの外殻 (Sidebar + Topbar + Outlet) | なし (内部で `useAuth`/`useLocation` 利用) |
| `Sidebar` | 左サイドのナビ。ロゴ・メニュー・承認待ちバッジ・折りたたみ | `role`, `pendingApprovalsCount`, `variant`('fixed'\|'drawer'), `onNavigate` |
| `Topbar` | 上部バー。検索・テーマ切替・通知・ユーザーメニュー | `onOpenDrawer`, `notificationCount` |

ナビ項目は `src/components/layout/nav-items.ts` の `NAV_ITEMS` で一元管理 (role フィルタ付き)。

## レスポンシブ規約

Tailwind ブレークポイント:

- `lg` = 1024px
- `sm` = 640px

| 画面幅 | 振る舞い |
|---|---|
| `>= 1024px` | Sidebar 固定表示 (折りたたみ可) |
| `< 1024px` | Sidebar を Drawer 化。Topbar の `Menu` ボタンで開閉。ルート遷移時に自動 close |
| `< 640px` | Topbar の検索 Input を非表示。`main` を 1 カラム |

## ルーティング規約

`src/App.tsx` で `<Route element={<AppLayout />}>` 配下に認可ルートを配置。

- 公開ルート (`/login`, `/register`) は AppLayout の外
- 認可ルートは `<ProtectedRoute>` でラップ (`roles` プロップで approver/admin 制限可能)
- 新規ルート追加手順:
  1. `src/pages/` に画面コンポーネントを作成
  2. `App.tsx` の AppLayout 配下に `<Route>` を追加し、必要なら `<ProtectedRoute roles={[...]}>` でラップ
  3. ナビに表示する場合は `src/components/layout/nav-items.ts` の `NAV_ITEMS` に追加
