# CLAUDE.md

このリポジトリで作業する際の指針。詳細な仕様は [`docs/SPEC.md`](docs/SPEC.md) を参照。

> **この会話で初めてこのリポジトリに触れる場合は、先に [`docs/HANDOFF.md`](docs/HANDOFF.md) を読むこと。**
> プロジェクトの現在地（公開済みの本番 URL、残作業、未決の判断）と、ユーザーとの作業の進め方が
> まとまっている。リポジトリを読むだけでは分からないことだけが書いてある。

## プロジェクト概要

自分用のスケッチ・ラフ描きのための、ブラウザ完結型のお絵描きWebアプリ。

- 1人で使う。ログイン不要、サーバー不要。描画はすべてブラウザ内（HTML Canvas）で完結。
- 完成した絵は **PNG（背景白）** としてローカルにダウンロードする。作業内容の永続化はしない。
- **最優先事項: 運用コスト 0。** ランタイムでネットワーク通信を行わない。サーバー機能・DB・外部API・フォントCDN を一切使わない。Vercel Hobby（無料・個人非商用）＋ GitHub 公開リポジトリのみ。

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| 言語 | TypeScript（strict） |
| フレームワーク | Next.js（App Router）。実質は静的サイト（SSG）。**API ルート・サーバーアクション・Server Components でのデータ取得は使わない** |
| UI | React + CSS Modules。**ライトテーマのみ** |
| 描画 | Canvas 2D API。描画ライブラリは原則不使用 |
| PWA | **自前のサービスワーカー**（`src/pwa/sw.ts`、`scripts/build-sw.mjs` が esbuild で `public/sw.js` に束ねる）。キャッシュ戦略は `src/pwa/strategy.ts` に純粋関数として切り出しテスト済み |
| パッケージ管理 | pnpm |
| Node | 20 LTS 以上 |
| テスト | Vitest（単体中心）。Canvas は `@napi-rs/canvas` の実 2D コンテキストで実ピクセル検証。E2E スイートは当面作らない |
| ホスティング | Vercel（Hobby / 無料）。GitHub public リポジトリと Git 連携で自動デプロイ |

## アーキテクチャの要点

- **完全クライアントサイド。** ページは1つ（`/`）。`<PaintApp>` 配下にすべてが載る。
- キャンバスは **2枚の `<canvas>` を重ねる**:
  - ベースキャンバス = 確定済みの絵（PNG 書き出し対象）
  - プレビューキャンバス = 描画中のストローク・未確定の図形/テキスト（書き出し対象外）
- **`src/engine/` は DOM・Canvas に一切触れない。** プレーンなデータ（`Uint8ClampedArray`、`{r,g,b,a}`、座標）だけを扱う。ここがテストの中心。
  - `color.ts` 色変換・不透明度合成 / `geometry.ts` 図形の正規化 / `stroke.ts` スムージング / `fill.ts` flood fill / `history.ts` Undo/Redo スタック / `export.ts` ファイル名・白背景合成
- `src/canvas/`（Canvas 2D アダプタ）と `src/tools/`（ツールの状態機械）は薄く保つ。ロジックはエンジンへ。
- 図形・直線・テキストは **確定前は調整可能**（移動・リサイズ・再編集）→ Enter / ツール切替 / 他所クリックで **確定**（ベースキャンバスへラスタライズ、履歴1ステップ）。Esc で破棄。未確定オブジェクトは常に1つだけ。
- Undo/Redo は **スナップショット方式**、深さ `HISTORY_DEPTH`（既定 20）。線形履歴（Undo 後に新操作すると Redo 分は破棄）。
- 状態はすべてメモリ上。リロード・タブクローズで消える（仕様）。`beforeunload` 警告は出さない。

## ディレクトリ構成

```
app/
  layout.tsx / page.tsx / globals.css
  manifest.ts               PWA マニフェスト（output: "export" のため dynamic = "force-static" が必要）
src/
  engine/                   DOM非依存のコア（テスト重点）
    color.ts geometry.ts stroke.ts fill.ts history.ts export.ts
    draw-command.ts types.ts
  canvas/                   Canvas 2D アダプタ
    pointer.ts renderer.ts draw-command.ts contexts.ts
  tools/                    各ツールの状態機械（純粋関数）
    brush.ts eraser.ts stroke-tool.ts line.ts shape.ts fill-tool.ts text.ts
    index.ts（ToolId → 状態機械の登録表）
  ui/                       React コンポーネントとアプリ状態
    paint-session.ts        React 非依存のアプリ状態（履歴・ツール・Canvas の結線）
    PaintApp.tsx CanvasStage.tsx Toolbar.tsx ToolSettingsPanel.tsx
    Dialog.tsx ConfirmDialog.tsx NewDocumentDialog.tsx TextOverlay.tsx Button.tsx
    settings.ts shortcuts.ts save-png.ts messages.ts
  pwa/
    sw.ts                   サービスワーカー本体
    strategy.ts             キャッシュ戦略（純粋関数・テスト対象）
    ServiceWorkerRegistrar.tsx
  config/
    presets.ts              キャンバスのプリセットサイズ
    constants.ts            HISTORY_DEPTH / BRUSH_* / FILL_TOLERANCE など
scripts/
  generate-icons.mjs        PWA アイコンをコードで描いて生成
  build-sw.mjs              サービスワーカーを esbuild で束ねる
  check-no-external-refs.mjs ビルド成果物に外部オリジン参照がないか検査
tests/                      Vitest（engine / canvas / tools / ui / pwa / config）
public/icons/               PWA アイコン（生成物だが成果物としてコミットする）
docs/SPEC.md                仕様書
```

## コマンド

```bash
pnpm install
pnpm dev          # 開発サーバー
pnpm lint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest
pnpm build        # サービスワーカー生成 + next build（Serverless Functions を生成しない構成）
pnpm start        # out/ をローカル配信して確認
pnpm build:icons  # PWA アイコンを再生成
pnpm build:sw     # サービスワーカーだけを再生成
```

## コスト 0 の制約（変更・逸脱しないこと）

- **実行時の外部依存を作らない。** `fetch` で外部 API を叩かない。Google Fonts 等の CDN をランタイムで読み込まない（フォントはシステムフォント or 自己ホスト）。アナリティクス・エラートラッキングの外部送信を入れない。
- **サーバー処理を作らない。** Next.js の API ルート / Route Handler / Server Actions / DB / 認証を追加しない。`next build` の成果物は静的アセットのみ。
- Vercel は Hobby（無料）前提。Serverless / Edge Functions を発生させる実装をしない。
- **`node scripts/check-no-external-refs.mjs` がビルド成果物を検査する**（CI で実行）。外部オリジンへの参照が入ると失敗する。
- 新しい依存パッケージを足すときは、それがビルド時のみの依存であること、ランタイムでネットワークを使わないことを確認する。

## セキュリティ / プライバシー

- ユーザー入力はテキストのみ。DOM 挿入は React の標準エスケープに委ね、`dangerouslySetInnerHTML` を使わない。
- 外部スクリプトを読み込まない。CSP とセキュリティヘッダは `vercel.json` で配信時に付与する（静的ヘッダなので Function は発生しない）。
- データ収集なし・Cookie なし・ネットワーク送信なし。

## テストの厳守事項

グローバル指針（`~/.claude/CLAUDE.md`）に従う。特にこのリポジトリでは:

- **テストは実機能を検証する。** `expect(true).toBe(true)` のような無意味なアサーションを書かない。実データ（小さな合成ピクセル配列など）に対する実アルゴリズムの結果を、具体的な数値で検証する。
- **テストを通すためのハードコードを本番コードに入れない。** `if (testMode)` 分岐やテスト専用マジックナンバーを禁止。設定値は `src/config/constants.ts` に集約。
- **Red-Green-Refactor。** 失敗するテストから始める。
- **境界値・異常値を必ずテストする。** flood fill の許容差境界・4連結・端の領域・開始点が既に塗り色、履歴の深さ超過・空状態、色パースの無効入力、図形正規化の幅0/負の座標、など。
- **モックは最小限。** モック対象は「システムクロック」と「ブラウザのダウンロード契機」に限る。**描画ロジックはモックしない。**
- Canvas を伴うテストは **`@napi-rs/canvas` の実 2D コンテキスト**に描いて `getImageData` で実ピクセルを検証する（描画をモックしない）。React の結線・レイアウト・実ブラウザの挙動は `docs/SPEC.md` §14 の手動QAで担保する。
- テストケース名は「何を検証しているか」を明確に書く。
- 仕様が曖昧な点は仮実装せずユーザーに確認する（未決事項は `docs/SPEC.md` §16）。

重点テスト対象（`src/engine/`）:
1. `fill.ts` — 連結領域のみ塗る、4連結、許容差境界、端の領域、開始点が塗り色でも無限ループしない。
2. `history.ts` — push/undo/redo の一致、深さ超過で最古破棄、undo 途中 push で redo 破棄、空状態で壊れない。
3. `color.ts` — HEX パース（有効/無効）、不透明度を考慮した合成結果の RGBA。
4. `geometry.ts` — 2点の順序に依らない矩形正規化、幅0、楕円の外接矩形、直線端点保持。
5. `export.ts` — 時刻注入でファイル名生成、透過ピクセルの白背景合成。

## MVP スコープ外（追加しないこと）

レイヤー、作業内容の永続化・自動復元、リアルタイム共同編集、筆圧・傾き、スマホ/タブレットのタッチ最適化、ダークテーマ、PNG以外の書き出し（JPEG/SVG/透過/クリップボード）、確定後のオブジェクト再編集、画像読み込み・貼り付け・フィルタ、カスタムブラシ、アカウント・共有、多言語対応、外部アナリティクス。

## 作業の進め方

- 仕様が未確定な点（`docs/SPEC.md` §16）は、推測で実装せずユーザーに確認する。
- 変更前に対象ファイルを読む。既存のコードスタイル（命名・コメント量・イディオム）に合わせる。
- ロジックはまず `src/engine/` に DOM 非依存で書き、テストしてから UI/Canvas に繋ぐ。
- `pnpm lint && pnpm typecheck && pnpm test` が緑になってから完了とする。
