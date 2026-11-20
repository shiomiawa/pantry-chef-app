# CLAUDE.md

## プロジェクト概要

pantry-chef（画面表示名：**パントリーシェフ**）。
家にある食材を期限が近い順に使い切る献立をAIが提案し、足りない食材だけを買い物リストにするReactアプリ。
ポートフォリオとして公開する。

## 設計書

- [docs/design.md](docs/design.md) に方針・データ構造・AI提案の仕様・費用対策がある。実装はこの設計書に従う
- 設計書後半の「Claude Codeへの指示文」は、ユーザーが手順として使うもの。**ユーザーが指示した STEP 以外は実行しない**
- 設計書と指示が食い違うときは、勝手に判断せずユーザーに確認する
- 仕様に関わる変更（機能・データ項目・保存キー・画面の動き・AI提案のルールなど）をしたら、同じ作業の中で docs/design.md にも反映する

## ルール

- 食材データはブラウザのローカルストレージ（キー `pantry-items`）を主な保存先にする。自分専用の同期を有効にした端末だけ、Upstash Redisにも保存する（両方に保存）
- Upstash Redisの用途は、自分専用の同期と、段階2のサーバー側の回数制限だけ。それ以外のデータベースは使わない
- Claude APIとUpstash Redisはブラウザから直接呼ばず、必ず `api/` フォルダのVercel関数経由で呼ぶ
- APIキーなどの秘密情報はコードに書かず、環境変数（`ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`、`DEMO_CODE`、`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`、`SYNC_CODE`）から読む。`.env` は `.gitignore` に入れる
- ユーザーの実際の食材データ・写真はリポジトリに入れない。実際の在庫CSVは `private/` フォルダ（`.gitignore` で除外済み）に置く。公開用はサンプルデータ（架空）だけにする
- 画面の文言はすべて日本語。スマートフォンでの使いやすさを最優先にする
- 頼まれた範囲だけを変更し、それ以外の機能・文言・レイアウトは変えない
- 色はCSS変数で指定し、ベタ書きしない
- 1つのSTEPが終わるたびに、動作確認の方法を説明してからGitにコミットし、GitHubにプッシュする

## 技術スタック

STEP 6（AI献立提案）まで作成済み。買い物リスト・同期・費用対策などは、設計書の STEP に沿って追加する予定。

| 領域 | 採用技術 |
| --- | --- |
| 画面 | React（JavaScript）＋ Vite。`npm run dev` で開発サーバー、`npm run build` でビルド |
| データ保存 | ブラウザのローカルストレージ（`pantry-items`、名前の候補と前回の単位・保管場所は `pantry-history`、在庫一覧の並び替えの選択は `pantry-sort`、買い物リストは `pantry-shopping`、同期コードは `pantry-sync-code`）。デモコードは sessionStorage（同期コードとは別） |
| 自分専用の同期 | Upstash Redis（`api/sync.js` 経由。PCとスマホでデータをそろえる）。キー `pantry:data` に在庫と買い物リストをまとめた1件のJSONで保存する。2台の編集がぶつかったら `updatedAt` が新しいほうを採用 |
| サーバー処理 | Vercel関数（`api/` フォルダ。例：`api/suggest.js`、`api/sync.js`） |
| AI | Claude API（モデルは環境変数 `ANTHROPIC_MODEL` で指定） |
| 公開 | Vercel（GitHub連携）。GitHub Pagesは使わない |
| ローカル確認 | `npm run dev` だけで API関数まで動く（`vite.config.js` の開発用ミドルウェア）。環境変数は `.env`（見本は `.env.example`）。`vercel dev` でも動く |

ビルドツールやライブラリを追加するときは、そのSTEPで追記する。

## 命名規約

### ファイルとフォルダ

フォルダ構成：`src/screens/`（タブ単位の画面）、`src/components/`（部品）、`src/hooks/`（カスタムフック）、`src/utils/`（計算などの関数）、`api/`（Vercel関数の入口）、`server/`（API関数の本体。Vercelにも開発サーバーにも依存しない形で書く）。色は `src/index.css` の `:root` にまとめる。

| 対象 | 規約 | 例 |
| --- | --- | --- |
| Reactコンポーネント | PascalCase、1ファイル1コンポーネント、拡張子 `.jsx` | `PantryList.jsx` |
| 画面（タブ単位） | `〇〇Screen` | `PantryScreen`、`MenuScreen`、`ShoppingScreen`、`SettingsScreen` |
| 部品 | 役割を表す名詞 | `ItemForm`、`ItemRow`、`MenuCard`、`BottomTabBar` |
| カスタムフック | `use` + PascalCase、拡張子 `.js` | `usePantryItems.js` |
| ユーティリティ | camelCase、拡張子 `.js` | `expiryStatus.js`、`parseCsv.js` |
| Vercel関数 | `api/` 直下、小文字の動詞・名詞 | `api/suggest.js` |
| サンプルデータ | kebab-case | `sample-pantry.json` |

### コード内

- 変数・関数：camelCase（例：`daysUntilExpiry`、`handleAddItem`）
- イベント処理の関数は `handle〇〇`、コンポーネントに渡すときのpropsは `on〇〇`（例：`onAdd={handleAddItem}`）
- 真偽値は `is` / `has` / `can` で始める（例：`isExpired`、`hasMissing`）
- 定数：UPPER_SNAKE_CASE（例：`STORAGE_KEY = 'pantry-items'`、`MAX_ITEMS = 50`）
- 食材データの項目名は設計書どおり（`id`、`name`、`quantity`、`unit`、`expiry`、`location`、`addedAt`）
- CSS変数：kebab-case で用途を表す名前（例：`--color-expired`、`--color-soon`、`--color-warning`、`--color-bg`）
