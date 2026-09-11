# 実装 TODO / 実行計画

お絵描きWebアプリの構築計画。仕様は [`SPEC.md`](SPEC.md)、作業指針は [`../CLAUDE.md`](../CLAUDE.md) を参照。

## 進め方の原則

- **エンジンファースト**: `src/engine/`（DOM非依存のコア）を先に、テスト駆動で作る。UI/Canvas は後から繋ぐ。
- **TDD（Red-Green-Refactor）**: ロジックは失敗するテストから始める。
- **モックは最小限**: 「システムクロック」と「ブラウザのダウンロード契機」のみ。描画ロジックはモックしない。
- **境界値・異常値を必ずテスト**: flood fill の許容差・4連結・端、履歴の深さ超過・空、色パースの無効入力、図形正規化の幅0/負座標。
- **コスト0の制約を守る**: 実行時のネットワーク通信なし、サーバー処理なし、外部CDNなし（`../CLAUDE.md`「コスト0の制約」）。
- 各フェーズ完了の定義: `pnpm lint && pnpm typecheck && pnpm test` が緑。
- フロー: フィーチャーブランチ → CI 通過 → main マージ（→ Vercel 自動デプロイ）。

## フェーズ依存関係

```
P0 初期化
 └─ P1 エンジン(型・設定)
     ├─ P2 color ┐
     ├─ P3 geometry ┤
     ├─ P4 stroke ┤ (相互に独立、並行可)
     ├─ P5 fill ┤
     ├─ P6 history ┤
     └─ P7 export ┘
         └─ P8 Canvasアダプタ層
             └─ P9 ツールの状態機械
                 └─ P10 アプリ状態(PaintApp)統合
                     └─ P11 UIコンポーネント
                         └─ P12 保存/クリア/新規作成の結線
                             └─ P13 PWA
                                 └─ P14 仕上げ & QA
                                     └─ P15 デプロイ
```

## 未決事項によるブロック

| 未決事項（SPEC §16） | ブロックするフェーズ | 暫定対応 |
| --- | --- | --- |
| #2 UI実装（CSS Modules / Tailwind）・Lint（Biome / ESLint+Prettier） | ~~P0, P11~~ | **確定**: Biome + CSS Modules（P0 で採用、P11 で全コンポーネントに適用） |
| #1 描画ライブラリ（perfect-freehand の採否） | ~~P4~~ | **P4 は自前スムージング（中点 2 次ベジェ）で実装済み**。`buildStrokePath` を差し替えれば `perfect-freehand` に移行可能。実際の描き心地は P8 以降で評価 |
| #3 キャンバスのズーム・パン | ~~P8~~ | **P8 は縮小表示のみで実装済み**（`computeDisplaySize` は拡大しない）。ズーム／パンは公開後バックログ |
| #4 Undo スナップショットの形式・メモリ上限 | ~~P6, P10~~ | **確定**: 上限 128MiB（P1）、保持形式は `PixelBuffer`（生ピクセル・同期）（P10）。理由は P10 の注記を参照 |
| #6 OSS ライセンス | P14 | MIT を仮採用 |
| #7 フォント（システム / 自己ホスト日本語フォント） | ~~P13~~ | **確定**: システムフォントのみ。フォントファイルを配信しないため PWA のキャッシュ対象もゼロ |
| #8 図形の「塗り」トグル・塗り色 | ~~P9, P11~~ | **確定**: 塗りトグルあり・塗り色は線と同色（P9）。UI は矩形／楕円選択時のみ表示（P11） |
| #9 プリセットの最終ラインナップ | ~~P1~~ | **P1 で SPEC §6.1 の初期案 5 件を採用**（追加・変更はいつでも可能。テストが不変条件を守る） |
| #10 PWA アイコン素材 | ~~P13~~ | **確定**: `scripts/generate-icons.mjs` がコードで描いて生成（192 / 512 / maskable） |

---

## P0. プロジェクト初期化 ✅

- [x] `git init`、`.gitignore`（`node_modules`, `.next`, `out`, `coverage`, `next-env.d.ts`, `.vercel` 等）
- [x] `pnpm init`、`package.json` の scripts（`dev` / `build` / `start`(=`serve out`) / `lint` / `lint:fix` / `format` / `typecheck` / `test` / `test:watch`）
- [x] Next.js 15（App Router）+ React 19 + TypeScript 導入、`tsconfig.json` を strict に（`noUncheckedIndexedAccess` ほか有効、`@/*` → `./src/*`）
- [x] `next.config.ts` 設定：`output: "export"`（純粋な静的サイト＝Serverless/Edge Functions を生成しない）、`images.unoptimized: true`
- [x] UI 実装方針を確定 → **CSS Modules** を採用（`app/page.module.css` で疎通確認）
- [x] Lint/Format 導入 → **Biome 2.2** を採用（`biome.json`、`.gitignore` 連携、`pnpm lint` 緑）
- [x] Vitest 導入・設定（`vitest.config.ts`。Node 環境、`include: src/**/*.test.ts` / `tests/**/*.test.ts`、`passWithNoTests: true`、v8 カバレッジ）
- [x] `src/`（engine / canvas / tools / ui / config / pwa）と `tests/engine`、`public/icons` のディレクトリスケルトン（`.gitkeep`）
- [x] `app/layout.tsx`（`lang="ja"`、`themeColor` 白）、`app/page.tsx`（プレースホルダ）、`app/globals.css`（`color-scheme: light` 固定、CSS 変数）
- [x] `README.md` に開発手順・スタック・ディレクトリ構成
- [x] `.github/workflows/ci.yml`（pnpm/action-setup + setup-node cache、`install --frozen-lockfile` → `lint` → `typecheck` → `test` → `build`）

**完了条件**: `pnpm dev` で `/` が 200（「お絵描き」表示）✅ / `pnpm test` 成功（テスト0件）✅ / `pnpm build` 成功（`out/` に静的出力）✅ / `pnpm lint` `pnpm typecheck` 緑 ✅。CI は GitHub リポジトリ作成（P15）で初回実行。ローカルで CI と同じ手順が緑であることは確認済み。

> P0 時点では初期コミットは未作成（コミット/プッシュはユーザー指示時のみ）。

---

## P1. エンジン: 型と設定 ✅

- [x] `src/engine/types.ts`: `Rgba`（0〜255）/ `Point` / `Size` / `Rect` / `PixelBuffer`（`ImageData` 互換の DOM 非依存型）/ `ToolId` / `ResizeHandle`（8方向）/ `Preset` / `Snapshot<TData>`（保持形式は型引数で注入）
- [x] `src/config/constants.ts`: `BYTES_PER_PIXEL` / `MAX_CANVAS_DIMENSION`(2048) / `HISTORY_DEPTH`(20) / `HISTORY_MAX_BYTES`(128MiB) / `BRUSH_MIN`(1) / `BRUSH_MAX`(100) / `BRUSH_DEFAULT`(4) / `OPACITY_DEFAULT`(1) / `FILL_TOLERANCE`(16) / `TEXT_SIZE_DEFAULT`(24) / `EXPORT_MIME`(`image/png`)
- [x] `src/config/presets.ts`: SPEC 付録A のプリセット配列（5件、`readonly Preset[]`）
- [x] **[テスト]** `tests/config/presets.test.ts`（6件）: 1件以上定義 / `id` 一意 / `label` 非空 / 幅高さが 1〜`MAX_CANVAS_DIMENSION` / 幅高さが整数 / 正方形・横長・縦長が各1件以上
- [x] **[テスト]** `tests/config/constants.test.ts`（11件）: ブラシ範囲の整合（`MIN` < `MAX`、`DEFAULT` が範囲内）/ `OPACITY_DEFAULT` が 0〜1（%値でない）/ `FILL_TOLERANCE` が 0〜255 / `HISTORY_DEPTH` = 20 / **`HISTORY_MAX_BYTES` が最大プリセット1枚分以上**（下回ると Undo が一度も機能しない）/ `EXPORT_MIME` が PNG

**完了条件**: 設定テスト 17 件が緑 ✅。`pnpm lint` / `pnpm typecheck` / `pnpm build` も緑 ✅。以降マジックナンバーはここから参照する。

> テストの有効性をミューテーションで確認済み（`OPACITY_DEFAULT=100` / `HISTORY_MAX_BYTES=1MiB` / `id` 重複 / 縦長プリセット削除 の 4 パターンで、対応するテストのみが失敗することを確認）。
>
> 決定事項: `HISTORY_MAX_BYTES` は 128MiB（SPEC §16 #4 の暫定値。最大プリセット非圧縮 ≒ 7.9MiB のため天井として機能する。保持形式確定時の P6 / P10 で再評価）。

---

## P2. エンジン: color.ts（テスト先行）✅

- [x] **[テスト]** `#RRGGBB` / `#RGB` のパース、無効入力 9 種（`""`, `#`, `#12`, `#1234`, `#12345`, `#1234567`, `#gggggg`, `ff8800`, `xyz`）で例外
- [x] **[テスト]** 不透明度 50% の赤を白の上に source-over 合成 → `(255, 127, 127, 255)` を数値で検証
- [x] **[テスト]** 不透明度 0% / 100% の境界、範囲外のクランプ、`NaN` / `Infinity` を完全透明として扱う
- [x] **[テスト]** 完全透明どうしの合成でゼロ除算にならない（`NaN` を返さない）
- [x] 実装（`parseHexColor` / `toHexColor` / `withOpacity` / `compositeOver` / `colorDistance`）
- [x] **[テスト]** `colorDistance` は最大チャンネル差（アルファ含む）を返す ─ `fill.ts` の許容差判定の基礎

---

## P3. エンジン: geometry.ts（テスト先行）✅

- [x] **[テスト]** 始点・終点の 4 通りの位置関係すべてで同じ正規化 `Rect` になる、負の座標も正しく扱う
- [x] **[テスト]** 幅0・高さ0（クリックのみ／水平・垂直ドラッグ）の扱い
- [x] **[テスト]** 楕円の中心・半径、外接矩形が `normalizeRect` と一致、直線の端点順序を保持
- [x] **[テスト]** ハンドル操作（角 4 方向 + 辺 4 方向）→ 新しい `Rect`。辺ハンドルは 1 辺だけ動く。反対側を越えたら反転して正規化
- [x] 実装（`normalizeRect` / `ellipseFromPoints` / `lineFromPoints` / `lineBounds` / `resizeRect` / `moveRect` / `rectContains`）

---

## P4. エンジン: stroke.ts（テスト先行）✅

- [x] **[テスト]** 2点 → `move` + `line`
- [x] **[テスト]** 3点以上 → 中点を通過点とする 2 次ベジェで補間。始点・終点は入力座標をそのまま保持
- [x] **[テスト]** 重複点・1点のみ・0点で例外を出さない（1点は `move` + 同座標 `line` で丸い点になる）
- [x] **[テスト]** 入力配列を変更しない
- [x] 実装（`buildStrokePath` → `StrokeSegment[]` のデータを返し、描画は P8 の renderer が行う。`perfect-freehand` へ差し替え可能）

---

## P5. エンジン: fill.ts（テスト先行）✅

- [x] **[テスト]** 5×5 の合成ピクセル配列で単色領域をクリック → その領域だけ塗られる
- [x] **[テスト]** 対角接続は塗らない（4連結）
- [x] **[テスト]** 許容差の境界: 色差ちょうど 16 は塗る / 許容差 15 では塗らない / 基準は常に開始点の色 / 負の許容差は 0 扱い
- [x] **[テスト]** 開始点が既に塗り色 → 変化なし・無限ループしない（許容差 255 でも塗り広げない）
- [x] **[テスト]** キャンバス端・障害物の回り込みが正しく塗られる
- [x] **[テスト]** 範囲外の開始点 4 方向で例外を投げない、小数座標は切り捨て、元バッファを変更しない
- [x] 実装（スキャンライン flood fill。判定は常に元データを参照し、訪問済みフラグで必ず停止する）

---

## P6. エンジン: history.ts（テスト先行）✅

- [x] **[テスト]** push → undo → redo で状態が一致、3 連続 undo で逆順に戻る
- [x] **[テスト]** 上限を超えて push すると最古が失われ、それより前には戻れない。`maxDepth` 回ぶんの undo ができる
- [x] **[テスト]** undo 途中で push → redo 不可。それ以前の履歴は残る
- [x] **[テスト]** 空状態で undo/redo しても壊れない（`canUndo`/`canRedo` が false、`undefined` を返す）
- [x] **[テスト]** 総バイト上限超過で最古から破棄。1 件で上限を超えても現在の状態は必ず保持
- [x] **[テスト]** `onEvict` が破棄時に呼ばれる（`ImageBitmap.close()` などの後始末用）、`reset()` で初期状態 1 件に戻る
- [x] 実装（カーソル方式の線形履歴。保持形式は `Snapshot<TData>` の型引数で外から注入）

> **仕様の明確化**: 「深さ 20」= **Undo できる回数が 20**。したがって保持するスナップショットは「現在の状態 + 20 件」= 21 件。
> TODO の元の記述（`HISTORY_DEPTH + 1` 回 push で最古が失われる）は件数と回数が 1 ずれていたため、この定義に統一した。

---

## P7. エンジン: export.ts（テスト先行）✅

- [x] **[テスト]** 既知の時刻を注入 → ファイル名が `drawing-YYYYMMDD-HHmmss.png`（ゼロ埋め・年末・真夜中の各ケース）
- [x] **[テスト]** 拡張子が `EXPORT_MIME` のサブタイプと一致する
- [x] **[テスト]** 透過ピクセル → 白背景合成後に不透明の白。半透明の赤 → `(255, 127, 127, 255)`。全ピクセルがアルファ 255 になる
- [x] **[テスト]** `compositeOver` で白に重ねた結果と一致する（簡約式が一般式からずれていないことのクロスチェック）
- [x] **[テスト]** 元バッファを変更せず、寸法を保った新バッファを返す
- [x] 実装（`buildExportFilename` は現在時刻を引数で受け取り、時計のモックを不要にした）
- [x] `EXPORT_EXTENSION` / `EXPORT_FILENAME_PREFIX` を `constants.ts` に追加

**P2〜P7 完了条件**: 全 146 テストが緑 ✅。`src/engine/` のカバレッジは **Statements / Functions / Lines 100%、Branches 89.6%** ✅。

> 未カバーの分岐は、`noUncheckedIndexedAccess` を満たすための `?? 0`（型付き配列の読み出し。実行時には到達しない）と、`history.ts` の防御的な `undefined` ガードのみ。`types.ts` は型専用のためカバレッジ対象外にした。
>
> テストの有効性をミューテーションで確認済み（7 パターン: fill の許容差 `<=`→`<` / fill の早期リターン削除 / stroke の重複点除去削除 / history の保持数 −1 / geometry の正規化削除 / export のゼロ埋め削除 / color の下地アルファ無視）。いずれも対応するテストのみが失敗し、復元後は 146 件緑。

---

## P8. Canvas アダプタ層 ✅（ブラウザでの目視確認のみ保留）

- [x] **[テスト]** `src/canvas/pointer.ts`（20件）: `toCanvasPoint`（倍率1.0 / 縮小 / 拡大 / 軸ごとに異なる倍率 / オフセット / スクロールで負の位置 / 小数精度の保持 / キャンバス外 / 表示サイズ0でゼロ除算しない）、`computeDisplaySize`（拡大しない / 幅基準 / 高さ基準 / 厳しいほうの倍率 / アスペクト比維持 / 整数丸め / 最低1px / 領域未確定なら原寸）
- [x] `src/canvas/renderer.ts`: エンジンの出力を `CanvasRenderingContext2D` に反映
  - [x] ストロークパスの描画（太さ・色・不透明度・線端 round・曲線区間）。**全区間を1回の `stroke()` で描き**、半透明の線が自己交差で濃くならないようにした
  - [x] 矩形・楕円・直線の描画（塗り有無のトグル、幅0・半径0でも例外なし）
  - [x] `readPixels` / `putPixels`（flood fill 結果の書き戻し・履歴からの復元。合成せず置き換え）
  - [x] テキストの `fillText`（フォントサイズ・色、`textBaseline: top`）
  - [x] `toCssColor`（アルファを 0〜1 に変換）、`fillCanvas` / `clearCanvas`
- [x] **[テスト]** `tests/canvas/renderer.test.ts`（26件）: **`@napi-rs/canvas` の実 2D コンテキストに描画し、`getImageData` で実ピクセルを検証**（描画処理をモックしない）
- [x] `src/ui/CanvasStage.tsx`: ベース＋プレビューの `<canvas>` 2枚、pointer イベント購読、`ResizeObserver` による表示倍率計算とリサイズ対応、ポインタキャプチャ（キャンバス外へドラッグしても追従）、主ポインタ・左ボタンのみ受付
- [x] **[テスト]** `tests/canvas/drawing-pipeline.test.ts`（4件）: 「クライアント座標 → キャンバス座標 → パス生成 → 描画」の連鎖を実ピクセルで検証。2枚重ねの独立性（プレビュー消去でベースが残る）も確認
- [x] ズーム・パンは入れない（SPEC §16 #3、縮小表示のみ）
- [x] `src/config/presets.ts` に `DEFAULT_PRESET_ID` / `findPreset` / `getDefaultPreset` を追加（+ テスト7件）。P11 / P12 のプリセット選択でも使う
- [x] `src/ui/CanvasStageDemo.tsx`: P8 疎通確認用の最小デモ（ドラッグで線 → 離してベースへ確定、`requestAnimationFrame` でフレーム単位に描画をまとめる）。**P10 で `PaintApp` に置き換える**
- [ ] **[保留]** 実ブラウザでの目視確認（下記）

**完了条件**: `pointer.ts` のテストが緑 ✅。全 203 テストが緑 ✅。`src/canvas/` のカバレッジは **Statements / Branches / Functions / Lines すべて 100%** ✅。`pnpm lint` / `pnpm typecheck` / `pnpm build`（静的出力）も緑 ✅。

> **未実施**: 「開発画面でベースキャンバスに1本線が引ける」のブラウザ目視確認。
> この環境には Chromium の実行に必要な共有ライブラリが無く（`libnspr4` / `libnss3` / `libasound2t64`）、
> インストールに `sudo` が要るため未実行。代わりに `tests/canvas/drawing-pipeline.test.ts` で
> 座標変換〜描画の連鎖を実ピクセルで検証している。React の結線・レイアウト・ポインタキャプチャは未検証。
>
> テストの有効性をミューテーションで確認済み（7 パターン: pointer のオフセット無視 / 拡大許可 / 丸め削除、renderer の線端 butt 化 / 塗りトグル無視 / アルファ変換省略 / `putImageData` の原点ずらし）。いずれも対応するテストのみが失敗し、復元後は 203 件緑。
>
> 決定事項: レンダラのテストに `@napi-rs/canvas`（devDependency、prebuilt バイナリ）を採用。Skia ベースの実 2D コンテキストが Node で使えるため、描画結果を実ピクセルで検証でき、モックを増やさずに済む。ランタイム依存ではないためコスト 0 の制約に影響しない。

---

## P9. ツールの状態機械 ✅

- [x] `src/engine/draw-command.ts`: `DrawCommand`（stroke / rect / ellipse / line / text / pixels）。**DOM 非依存のデータ**として描画内容を表すことで、ツールを純粋関数のまま保つ
- [x] `src/canvas/draw-command.ts`: `executeDrawCommand(s)` が `DrawCommand` を Canvas に反映（+ 実ピクセルのテスト 8件）
- [x] `src/tools/types.ts`: `Tool<TState>` インターフェース（`pointerDown/Move/Up`、`commit`、`cancel`、`preview`、`hasPending`）、`ToolStep`、`ToolContext`、`DrawingSettings`
- [x] `stroke-tool.ts` + `brush.ts` / `eraser.ts`: 状態機械を共有し、違いは色の決め方だけ。消しゴムは**描画色・不透明度に関わらず常に不透明な白**（半透明だと消え残るため）
- [x] `shape.ts`（矩形・楕円）: `idle → drawing →（離す）→ pending → commit/discard`（SPEC 付録B）
  - [x] pending 状態での移動（掴んだ位置との相対関係を保持）・8方向ハンドルでのリサイズ（`geometry.ts` の `resizeRect` / `hitTestHandle`）
  - [x] pending 中に外側をクリック → 確定して、その場から新しい図形を描き始める
- [x] `line.ts`: 直線は**端点の向きを保持**するため外接矩形ではなく始点・終点で保持し、リサイズは端点ドラッグ。線分への距離で本体ドラッグを判定
- [x] `fill-tool.ts`: クリック → `fill.ts` → 1ステップ確定。**見た目が変わらないクリック（既に塗り色 / キャンバス外）では履歴に積まない**
- [x] `text.ts`: `idle → editing → commit/discard`。空文字は確定しない。入力・移動は `setText` / `setTextOrigin` で受け取り、文字幅の測定と IME の扱いは HTML オーバーレイ（P11）に委ねる
- [x] `src/engine/geometry.ts` に `handlePositions` / `hitTestHandle` を追加（+ テスト16件）
- [x] `src/tools/index.ts`: `ToolId` → 状態機械の登録表（+ テスト。型消去は 1 か所のみ）
- [x] **[テスト]** 状態遷移・pending の Rect 計算・commit で履歴に積む単位（tools 52件 + registry 35件 + geometry-handles 16件 + draw-command 8件）

**完了条件**: 各ツールの状態遷移テストが緑 ✅。全 339 テストが緑 ✅。`src/tools/` のカバレッジは **Statements / Functions / Lines 100%、Branches 96%**、`src/canvas/` は全項目 100% ✅。`pnpm lint` / `typecheck` / `build` も緑 ✅。

> **設計判断**: ツールは Canvas に触れず `DrawCommand` の配列を返す純粋な状態機械にした。これにより状態遷移をブラウザなしで完全にテストでき、描画は `executeDrawCommands` が実ピクセル検証済みの renderer に委ねる。
>
> **設計上の修正（テストで発見）**: ハンドルの判定半径を固定 10px にすると、20×30 程度の小さい図形では判定範囲が図形全体を覆い**移動できなくなる**ことが判明。短辺の 1/3 を上限とする形に修正した（幅・高さ 0 の図形は移動のみ・Esc で描き直し、という制限は仕様として明記）。
>
> **SPEC からの逸脱**: テキストの四隅ハンドルによるリサイズは実装していない。フォントサイズは設定パネルから変更する（SPEC §6.3 の「フォントサイズ変更」は満たす）。
>
> テストの有効性をミューテーションで確認済み（6 パターン: pending 外クリックで確定しない / 消しゴムが描画色を使う / 塗りつぶしが無変化でも履歴に積む / テキストが空文字でも確定する / 直線が向きを正規化する / 移動で掴んだ位置のオフセットを無視する）。いずれも対応するテストのみが失敗し、復元後は 339 件緑。

---

## P10. アプリ状態（PaintApp）統合 ✅（ブラウザでの目視確認のみ保留）

- [x] `src/ui/paint-session.ts`: **React 非依存**の `PaintSession`。現在ツール / 履歴 / 未確定オブジェクトを保持し、ツールの状態機械と Canvas を繋ぐ
- [x] `src/ui/PaintApp.tsx`: `PaintSession` を呼んで画面に反映するだけの薄い React 層。描画設定（色・太さ・不透明度・図形塗りトグル）の最小 UI 付き
- [x] `src/ui/settings.ts`: `UiSettings` → `DrawingSettings` 変換（不透明度を色のアルファに畳み込み、太さをクランプ）
- [x] ツール切替時に未確定オブジェクトを自動確定
- [x] 未確定オブジェクトは常に1つ（新操作開始で既存を確定 ─ P9 の各ツールが担保）
- [x] Undo/Redo を `history.ts` に配線。取り消し時は未確定オブジェクトを破棄
- [x] `src/ui/shortcuts.ts`: キーボードショートカット（SPEC §8）。**IME 変換中は全無効**、テキスト入力中は Enter / Escape のみ通す
- [x] スナップショットの保持形式を確定（SPEC §16 #4）→ **`PixelBuffer`（生ピクセル）**
- [x] `src/canvas/contexts.ts`: `CanvasContexts` 型を React から独立させ、セッションをヘッドレスでテスト可能に
- [x] **[テスト]** `paint-session` 28件（実 2D コンテキストでの統合テスト）/ `shortcuts` 32件 / `settings` 13件
- [ ] **[保留]** 実ブラウザでの目視確認（P8 と同じ理由。下記）

**完了条件**: ブラシで描く → Undo → Redo が動作 ✅ / ツール切替で pending が確定 ✅ ─ いずれも `tests/ui/paint-session.test.ts` が実ピクセルで検証。全 419 テストが緑 ✅。`src/ui/` の非 React ロジックのカバレッジは **全項目 100%**、`src/tools/` `src/canvas/` も同様 ✅。`pnpm lint` / `typecheck` / `build` も緑 ✅。

> **決定事項（SPEC §16 #4）**: 履歴スナップショットは **`PixelBuffer`（生ピクセル）** で保持する。
> `ImageBitmap` / PNG `Blob` はどちらも生成・復元が非同期で、取り消しの連打や確定処理との競合を招く。
> `getImageData` / `putImageData` は同期なのでその一群のバグを構造的に避けられる。
> メモリは 1 枚 = 幅×高さ×4 バイト（既定プリセット 1280×720 で約 3.7MiB）。`HISTORY_MAX_BYTES`（128MiB）で頭打ちになり、
> 大きいプリセットでは 20 ステップに届かないことがあるが、履歴側が最古から捨てて破綻しない。
>
> **設計判断**: 状態と描画の制御を React コンポーネントから `PaintSession` に切り出した。
> これにより「ブラシで描く → Undo → Redo」「ツール切替で pending 確定」という P10 の完了条件そのものを、
> 実際のキャンバスを使ったままブラウザなしで検証できる。React 層は入力を渡して結果を表示するだけ。
>
> **未実施**: ブラウザでの目視確認（React の結線・レイアウト・ポインタキャプチャ・キーボード操作）。
> Chromium の実行に必要な共有ライブラリが無く `sudo` が要るため。`sudo apt-get install -y libnspr4 libnss3 libasound2t64` で解消できる。
>
> テストの有効性をミューテーションで確認済み（6 パターン: ツール切替で確定しない / undo で未確定を残す / 確定なしでも履歴に積む / IME 中もショートカットを受ける / テキスト入力中もショートカットを通す / 不透明度を色に反映しない）。いずれも対応するテストのみが失敗し、復元後は 419 件緑。

---

## P11. UI コンポーネント ✅

- [x] `Button`: アプリ共通のボタン。**無効・押下の状態を見た目でも区別できるようにした**（下記の不具合対応）
- [x] `Toolbar`: ツール選択（`aria-pressed`）、Undo/Redo（無効状態表示）、未確定オブジェクトの確定・破棄。`role="toolbar"` ＋ 各ボタンに `aria-label`（ショートカット併記）。新規作成 / PNGで保存 / クリアは**ハンドラが渡されたときだけ描画**（P12 で結線。押しても何も起きないボタンを置かないため）
- [x] `ToolSettingsPanel`: 色・太さ・不透明度・図形の塗りトグル・文字サイズ。`<fieldset>` ＋ 視覚的に隠した `<legend>`
- [x] `src/ui/settings.ts` に `visibleSettings(toolId)` を追加 — **いま選んでいるツールに関係のある設定だけを出す**（消しゴムは色・不透明度を出さない＝常に不透明な白で描くため誤解を生まない）
- [x] `Dialog`: ネイティブ `<dialog>` によるモーダルの土台（フォーカストラップ・背景の不活性化・Esc をブラウザに任せる）
- [x] `NewDocumentDialog`: プリセット選択（寸法を併記）
- [x] `ConfirmDialog`: 新規作成・クリアの確認
- [x] `TextOverlay`: テキスト入力・移動の HTML オーバーレイ。`<input>` を重ねることで IME 変換・カーソル移動・選択をブラウザに任せる。`CanvasStage` に `overlay` スロットを追加して表示倍率つきで差し込む
- [x] `PaintSession` に `textEditing` / `setText` / `setTextOrigin` を追加（+ テスト9件）
- [x] ライトテーマのスタイリング、デスクトップ幅中心のレイアウト、フォーカス可視（`:focus-visible`）
- [x] 文言を1ファイルに集約（`src/ui/messages.ts`）。`TEXT_SIZE_MIN` / `TEXT_SIZE_MAX` を `constants.ts` に追加
- [x] **[テスト]** `messages` 13件（全ツールの表示名・ショートカット・重複なし・空文字なし）/ `visibleSettings` + `clampFontSize` 18件 / `paint-session` テキスト編集 9件

**完了条件**: すべてのツール・設定が UI から操作できる ✅（`role="toolbar"` / `<fieldset>` / `aria-pressed` / 無効ボタン2個 / ブラシ選択時は色・太さ・不透明度のみ表示、を配信 HTML で確認）。キーボードのみでツール選択・Undo/Redo ができる ✅（SPEC §8 のショートカット、`shortcuts.ts` でテスト済み）。全 480 テストが緑 ✅。`src/ui/` の非 React ロジックのカバレッジは**全項目 100%** ✅。`pnpm lint` / `typecheck` / `build` も緑 ✅。

> **ユーザー報告への対応（「やり直しボタンが効かなかった」）** — 原因になりうる箇所を 2 つ特定して修正した。
>
> 1. **無効状態の見た目が有効時とほぼ同じだった。** `.button:disabled` が文字色を薄くするだけで、背景も枠線も変わらなかった。`canRedo` が false のとき（＝正しく無効なとき）に押しても「ボタンが効かない」としか見えない。背景・枠線・不透明度も変える形に修正。
> 2. **`CanvasStage` がドラッグ中かを判定していなかった。** マウスがキャンバス上を通過しただけ、あるいは誤クリックしただけで `pointerMove` / `pointerUp` がツールに届いていた。取り消し後にキャンバスを一度クリックすると 1 点のストロークが履歴に積まれ、**やり直しが永久に消える**。`activePointerRef` で「pointerdown から始まったドラッグ」だけを通すようにした。
>
> この 2 つ目の挙動は `tests/ui/paint-session.test.ts` に「取り消したあとキャンバスを一度クリックすると、やり直せなくなる」として明文化した（線形履歴の仕様として正しい挙動なので、誤って起こりにくくするのが対策）。
>
> **a11y の判断**: Biome の `useSemanticElements` がツールバー内の `role="group"` を `<fieldset>` にするよう促したが、フォーム部品ではないボタン群に `<fieldset>` は不適切。外側の `role="toolbar"` と各ボタンの `aria-label` で十分なため、内側のグループ分けは視覚的な区切り線のみにした。設定パネルは実際にフォーム部品の集まりなので `<fieldset>` ＋ 視覚的に隠した `<legend>` を使っている。
>
> テストの有効性をミューテーションで確認済み（6 パターン: 消しゴムで色・不透明度を出す / 塗りトグルを全ツールで出す / 文字サイズをクランプしない / ラベルからショートカット表示を落とす / ショートカットキーを重複させる / 文言を空文字にする）。いずれも対応するテストのみが失敗し、復元後は 480 件緑。

---

## P12. 保存 / クリア / 新規作成 の結線 ✅（ブラウザでの目視確認のみ保留）

- [x] PNGで保存: `PaintSession.exportBuffer()`（未確定を確定 → 白背景に合成）→ `src/ui/save-png.ts` が一時キャンバスに載せて `toBlob('image/png')` → `export.ts` のファイル名で `a[download]` によるダウンロード（**サーバー送信なし**）
- [x] クリア: `ConfirmDialog` → `PaintSession.clear()`（未確定を破棄 → 白で塗り直し → 履歴に1ステップ）。取り消しで元に戻せる
- [x] 新規作成: `ConfirmDialog` → `NewDocumentDialog` → プリセット適用。サイズが変われば `CanvasStage` がキャンバスを作り直し `onReady` が新セッションを用意する。**同じサイズを選んだ場合はキャンバスが再生成されないため `session.reset()` を明示的に呼ぶ**
- [x] ダイアログを開いている間はキャンバスのショートカットを止める（Esc での閉じる操作は `<dialog>` が受け持つ）
- [x] `Ctrl/Cmd + S` を PNG 保存に結線（SPEC §8）
- [x] **[テスト]** `tests/ui/save-png.test.ts`（4件）: ダウンロード契機が1回・ファイル名・オブジェクト URL の解放・**PNG を実際にエンコードして読み戻しピクセルが一致**
- [x] **[テスト]** クリア（4件）: 全体が白・履歴1ステップ・取り消しで復元・未確定を破棄・サイズ維持
- [x] **[テスト]** 書き出しバッファ（4件）: 内容・未確定の確定・全ピクセル不透明・寸法

**完了条件**: 3操作が確認ダイアログ込みで動作 ✅（配信 HTML に 3 つのボタンと 3 つの `<dialog>`、プリセット一覧を確認）。全 497 テストが緑 ✅。`src/ui/` `src/tools/` `src/canvas/` のカバレッジは Statements / Functions / Lines すべて 100% ✅。`pnpm lint` / `typecheck` / `build` も緑 ✅。

> **バグ修正（テストで発見）**: 塗りつぶしツールが設定色を**そのまま置き換えて**いたため、不透明度が 1 未満だと
> ベースキャンバス自体が半透明になっていた（`floodFill` は合成せず置き換えるため）。
> 下地の色に合成した結果で塗るよう修正し、「ベースキャンバスは常に不透明」というテストを追加した。
> 副次的に、不透明度 0 での塗りつぶしが履歴に積まれなくなった（見た目が変わらないため）。
>
> **設計判断**: PNG 書き出しを「バッファを作る部分（`PaintSession.exportBuffer`）」と
> 「DOM で保存する部分（`save-png.ts`）」に分けた。前者は実ピクセルでテストでき、後者は 10 行程度に収まる。
> テストでは `@napi-rs/canvas` の実 `toBlob` と Node の `Blob` を使い、**差し替えるのは
> `document.createElement` と `URL` の 2 メソッドだけ**（＝`CLAUDE.md` が許可する「ブラウザのダウンロード契機」）。
> 書き出した PNG を `loadImage` で読み戻してピクセル一致まで確認している。
>
> **安全網として残したもの**: `exportBuffer` の `flattenOntoWhite` は、上記の修正でベースキャンバスが
> 常に不透明になったため現状では素通しになる。将来ピクセルを直接書くツールが増えても
> 「背景が白の PNG」（SPEC §6.5）を保てるよう、保険として残している。
>
> **未検証**: 実ブラウザでの保存ダイアログ・ファイル生成、ダイアログのフォーカストラップ（P8 / P10 と同じ理由）。
>
> テストの有効性をミューテーションで確認済み（6 パターン: クリアが履歴に積まない / クリアが未確定を破棄しない / 書き出しが未確定を確定しない / 保存でファイル名を設定しない / オブジェクト URL を解放しない / 塗りつぶしが合成しない）。いずれも対応するテストのみが失敗し、復元後は 497 件緑。

---

## P13. PWA ✅（ブラウザでの手動確認のみ保留）

- [x] `app/manifest.ts`: `name` / `short_name` / `icons` / `theme_color`（白）/ `background_color` / `display: "standalone"` / `start_url` / `scope` / `lang`。`output: "export"` のため `dynamic = "force-static"` が必要だった
- [x] ~~Serwist（`@serwist/next`）~~ → **自前のサービスワーカーに変更**（理由は下記）。`src/pwa/sw.ts` + `src/pwa/strategy.ts`、`scripts/build-sw.mjs` が esbuild で `public/sw.js` に束ねる
- [x] アプリシェルの precache（`/`・`manifest.webmanifest`・アイコン）＋ ハッシュ付きアセットの `cache-first` 保存
- [x] フォント方針を反映（SPEC §16 #7）: **システムフォントのみでフォントファイルを配信しない**ため、キャッシュ対象がそもそも無い
- [x] PWA アイコン作成（192 / 512 / maskable）。`scripts/generate-icons.mjs` が**コードで描いて PNG を生成**する（外部素材なし、SPEC §16 #10）
- [x] `src/pwa/ServiceWorkerRegistrar.tsx` で登録（開発中は登録しない）
- [x] **[テスト]** `tests/pwa/strategy.test.ts`（20件）: 戦略の選択（ページ遷移 / ハッシュ付きアセット / 固定 URL / GET 以外 / 別オリジン / 不正 URL / パスの部分一致 / クエリ付き）とキャッシュ世代の管理
- [x] **[テスト]** `tests/pwa/manifest.test.ts`（11件）: インストール要件の項目、**宣言したアイコンが実在し宣言どおりの寸法であること**まで確認
- [ ] **[手動]** ネットワーク切断で再読み込み → 起動し全機能（保存含む）動作
- [ ] **[手動]** デスクトップ Chrome でインストール → 単独ウィンドウで起動

**完了条件**: 静的出力に `out/sw.js`・`out/manifest.webmanifest`・`out/icons/*` が揃い、配信して 200 で取得できることを確認 ✅。HTML に `<link rel="manifest">` が入る ✅。全 528 テストが緑 ✅。`pnpm lint` / `typecheck` / `build` も緑 ✅。Lighthouse での確認は未実施（下記）。

> **方針変更: Serwist をやめて自前のサービスワーカーにした。**
>
> 当初の計画どおり `@serwist/next` を入れたが、pnpm 12 が `serwist`（`typescript` を optional peer に持つ）の
> importer を peer サフィックスなしで記録してしまい、`node_modules/serwist` が壊れたシンボリックリンクになる問題に当たった。
> `--force` での再インストール、remove → add を試しても解消しなかった。
>
> そこで自前実装に切り替えた。結果として次の利点が得られている:
> - **依存パッケージが 17 個減った**（ランタイム依存は `next` / `react` / `react-dom` のみに戻った）
> - `output: "export"` との相性を気にしなくてよい（フレームワークのプラグインを介さず、ただの静的ファイルとして出力される）
> - **キャッシュ戦略が純粋関数になり単体テストできる**（`src/pwa/strategy.ts`、20 件）
>
> **キャッシュ戦略**: ページ遷移は `network-first`（HTML の URL は固定なので、オンラインなら常に最新を取り、
> オフラインならキャッシュで起動する）。`/_next/static/` は内容ハッシュ付きなので `cache-first` で恒久的に使える。
> アイコン・マニフェストなど固定 URL のものは `stale-while-revalidate`。
> この組み合わせなら、キャッシュ世代を手で上げなくても新しいデプロイが自然に反映される。
> 世代識別子はサービスワーカーのソースのハッシュから自動生成する（`scripts/build-sw.mjs`）。
>
> **ハッシュ付きチャンクを precache しない理由**: URL がビルドごとに変わるためリストを静的に書けない。
> ただしこのアプリは 1 ページで、初回表示時に必要なチャンクがすべて取得され `cache-first` で保存されるため、
> 「一度読み込めば以降はオフラインで全機能利用可能」（SPEC §7）は満たせる。
>
> **未実施**: Lighthouse による PWA 判定、オフラインでの再読み込み、Chrome でのインストール。
> Chromium の実行に必要な共有ライブラリが無く `sudo` が要るため（P8 / P10 / P12 と同じ）。
> `sudo apt-get install -y libnspr4 libnss3 libasound2t64` で解消できる。
>
> テストの有効性をミューテーションで確認済み（7 パターン: ページ遷移をキャッシュ優先にする / 別オリジンを扱う / GET 以外を扱う / 古いキャッシュを消さない / 他アプリのキャッシュまで消す / maskable 宣言を落とす / アイコンのパスを間違える）。いずれも対応するテストのみが失敗し、復元後は 528 件緑。

---

## P14. 仕上げ & QA ✅（他ブラウザでの確認のみ保留）

- [x] キーボードショートカット総点検（SPEC §8）→ `tests/ui/shortcuts-spec-coverage.test.ts` に**仕様の表をそのまま書き写した網羅テスト**（18 通り）を追加。仕様の行が実装から抜け落ちたら落ちる
- [x] 手動QAチェックリストを [`docs/QA-CHECKLIST.md`](QA-CHECKLIST.md) として具体化（12 節 / 約 60 項目）。SPEC §14 を実装済みの挙動に合わせて詳細化したもの
- [x] `LICENSE` 追加（MIT）、`package.json` に `license` / `description` を設定
- [x] `README.md` 整備（使い方・ツール一覧・ショートカット表・注意事項・開発手順・設計）
- [x] CSP とセキュリティヘッダを `vercel.json` で設定（`default-src 'self'` 基調。静的ヘッダなので Function は発生しない）
- [x] **`scripts/check-no-external-refs.mjs` を追加し CI に組み込んだ** — ビルド成果物に外部オリジンへの参照が混ざったら失敗する。コスト 0 とオフライン動作の前提を機械的に守る
- [x] ドキュメントを実装に合わせて更新（`CLAUDE.md` のスタック・ディレクトリ構成・コマンド、`docs/SPEC.md` の §5 / §6 / §7 / §8 / §16）
- [x] コード内に残っていたフェーズ参照コメント（「P12 で結線」など）を整理
- [x] **Lighthouse（デスクトップ）**: Performance / Accessibility / Best Practices / SEO すべて **100**
- [x] **実ブラウザでの動作確認**（Chromium）: 描画・取り消し・やり直し・ショートカット・図形の確定・テキスト入力・PNG 保存・サービスワーカー・**オフライン再読み込み**・CSP 違反なし ─ 21 + 8 項目すべて成功
- [x] `app/robots.ts` を追加（公開サイトとして `robots.txt` を用意）
- [ ] **[要ユーザー]** クロスブラウザ確認（Firefox / Safari / Edge）─ Chromium のみ確認済み
- [ ] **[要ユーザー]** 実機での PWA インストール操作

**完了条件**: 自動化できる項目はすべて緑 ✅（全 549 テスト / lint / typecheck / build / 外部参照チェック / Lighthouse 4 カテゴリ 100）。Chromium での実動作確認も完了 ✅。他ブラウザとインストール操作のみ未確認。

> **SPEC §16 の未決事項がすべて決着した。** 結論を SPEC §16 に表としてまとめ直し、
> 実装時に判明して仕様に反映した事項（ハンドルの判定半径、塗りつぶしの不透明度の扱い、
> テキストのリサイズ非対応、PWA の方式変更、履歴の深さの定義）も併記した。
>
> **CSP について**: Next.js の静的エクスポートはハイドレーション用のインラインスクリプトを出すため、
> `script-src` に `'unsafe-inline'` が必要（nonce はサーバーが要るので使えない）。
> 外部オリジンを一切許可しないことが主目的なので、この構成で SPEC §7 の意図は満たせている。
> **ただしこの CSP は実ブラウザで検証していない。** P15 のデプロイ後に、コンソールに CSP 違反が
> 出ていないかを必ず確認すること（`docs/QA-CHECKLIST.md` §12）。
>
> **ブラウザ検証を root なしで実現した**: `sudo` が使えなかったため、`apt-get download` で
> 必要な共有ライブラリ（`libnspr4` / `libnss3` / `libasound2t64`）と日本語フォントを取得し、
> 作業ディレクトリに展開して `LD_LIBRARY_PATH` で参照させた。システムには触れていない。
> CSP は `vercel.json` と同じヘッダを付けた静的サーバーを立てて、デプロイ前に検証した。
>
> **ユーザー報告の「やり直しが効かない」は解消を確認した。** 実ブラウザで
> 「描く → 取り消し → やり直し」が正しく動き、キャンバス上をホバーしても履歴が壊れないことを確認。
> 無効ボタンも背景色・不透明度で明確に区別できるようになっている。
>
> **新たに実バグを 1 件見つけて修正した**: テキストツールでキャンバスをクリックしても
> 入力欄にフォーカスが当たらず、もう一度クリックしないと入力できなかった。
> 原因はキャンバスの `mousedown` の既定動作がフォーカスを `body` に移していたこと。
> プレビューキャンバスの `onMouseDown` で `preventDefault()` して解決した
> （ドラッグ中に周囲の文字が選択されるのも同時に防げる）。
> **この不具合は単体テストでは原理的に見つけられない**（ブラウザの既定動作が原因のため）。
>
> **Lighthouse について**: v12 で PWA カテゴリが廃止されたため、インストール可能性は
> マニフェストの内容とサービスワーカーの登録状態を直接確認する形で代替した。
> SEO が一度 91 になったのは検証用サーバーが未知のパスを `index.html` にフォールバックさせ、
> `/robots.txt` が HTML を返していたためで、本番では起きない。とはいえ公開サイトとして
> `robots.txt` はあるべきなので追加した。

---

## P15. デプロイ

- [ ] GitHub に public リポジトリを作成し push
- [ ] Vercel プロジェクトを作成、GitHub リポジトリと Git 連携（Hobby プラン）
- [ ] `main` push で本番デプロイ、PR でプレビューデプロイが動くことを確認
- [ ] 本番 URL（`*.vercel.app`）で、描画・保存・オフライン・PWA インストールを確認
- [ ] Vercel のプロジェクト設定で Serverless/Edge Functions が生成されていないこと（＝Function 実行課金が発生しない構成）を確認

**完了条件**: 本番 URL で MVP 全機能が動作。コストが発生していない。

---

## 公開後の宿題（バックログ）

- SPEC §2「MVPに含まない」項目の優先度付け（レイヤー、作業内容の永続化、ズーム/パン、透過PNG書き出し など）
- ブラシ質感の改善（`perfect-freehand` 等）
- 大サイズ時の flood fill を Web Worker 化（SPEC §16 #5）
- タッチ / 筆圧対応の検討
- E2E（Playwright スイート）の追加
