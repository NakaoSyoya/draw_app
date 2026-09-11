# お絵描き

ブラウザで完結する、自分用のスケッチ・ラフ描きアプリ。

- ログイン不要・サーバー不要。描画はすべてブラウザ内（HTML Canvas）で完結する
- 描いた絵は **PNG（背景白）** としてローカルに書き出す
- PWA。一度開けば以降はオフラインでも全機能が使える
- **実行時に外部通信を一切しない**（外部 API・CDN・解析ツールなし）

詳細は [`docs/SPEC.md`](docs/SPEC.md)、実装計画は [`docs/TODO.md`](docs/TODO.md)、
作業指針は [`CLAUDE.md`](CLAUDE.md) を参照。

## 使い方

1. ツールバーからツールを選ぶ
2. キャンバスをドラッグして描く
3. 「PNGで保存」でローカルに書き出す

### ツール

| ツール | できること |
| --- | --- |
| ブラシ | 色・太さ・不透明度を指定してフリーハンドで描く |
| 消しゴム | 白で塗って消す（太さはブラシと共通） |
| 直線 | 2 点を結ぶ線。確定前に端点をドラッグして調整できる |
| 矩形 / 楕円 | ドラッグで作る。確定前に移動・8 方向ハンドルでリサイズできる。塗りの有無を切替可 |
| 塗りつぶし | クリックした位置の連結領域を塗る |
| テキスト | クリックした位置に文字を入力（日本語入力対応）。ドラッグで移動できる |

直線・図形・テキストは**確定するまで調整できる**。`Enter` で確定、`Esc` で破棄。
ツールを切り替えるか他の場所をクリックしても確定する。

### キーボードショートカット

| キー | 動作 |
| --- | --- |
| `B` / `E` / `L` / `R` / `O` / `G` / `T` | ブラシ / 消しゴム / 直線 / 矩形 / 楕円 / 塗りつぶし / テキスト |
| `Ctrl`(`Cmd`) + `Z` | 取り消し |
| `Ctrl`(`Cmd`) + `Shift` + `Z`、`Ctrl` + `Y` | やり直し |
| `Ctrl`(`Cmd`) + `S` | PNG で保存 |
| `Enter` / `Esc` | 未確定オブジェクトの確定 / 破棄 |
| `[` / `]` | ブラシを細く / 太く |

文字入力中と IME 変換中は、`Enter` と `Esc` 以外のショートカットが無効になる。

### 注意

- **作業内容は保存されない。** リロードやタブを閉じると消える。残したいものは PNG で書き出すこと
- 取り消しは 20 ステップまで
- PC（マウス・トラックパッド）向け。タッチや筆圧には対応していない

## 開発

```bash
pnpm install

pnpm dev            # 開発サーバー (http://localhost:3000)
pnpm lint           # Biome チェック
pnpm lint:fix       # Biome 自動修正
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest
pnpm test:watch     # Vitest ウォッチ
pnpm test:coverage  # カバレッジ付き
pnpm build          # サービスワーカー生成 + 静的ビルド（out/ に出力）
pnpm start          # out/ をローカル配信して確認
pnpm build:icons    # PWA アイコンを再生成
pnpm build:sw       # サービスワーカーだけを再生成
```

コミット前に `pnpm lint && pnpm typecheck && pnpm test` が緑であること。

## 技術スタック

| 項目 | 採用 |
| --- | --- |
| 言語 | TypeScript（strict） |
| フレームワーク | Next.js（App Router、`output: "export"` の静的サイト） |
| 描画 | Canvas 2D API（描画ライブラリ不使用） |
| UI | React + CSS Modules |
| PWA | 自前のサービスワーカー（esbuild で束ねる） |
| Lint / Format | Biome |
| テスト | Vitest |
| ホスティング | Vercel（Hobby / 無料） |

ランタイム依存は `next` / `react` / `react-dom` のみ。

## 設計

```
app/            Next.js（layout / page / manifest / globals.css）
src/engine/     DOM 非依存の描画コア（色・図形・スムージング・塗りつぶし・履歴・書き出し）
src/canvas/     Canvas 2D アダプタ（座標変換・レンダラ・描画命令の実行）
src/tools/      各ツールの状態機械（純粋関数）
src/ui/         React コンポーネントとアプリ状態（PaintSession）
src/pwa/        サービスワーカーとキャッシュ戦略
src/config/     プリセット・定数
scripts/        アイコン生成・サービスワーカーのビルド・成果物の検査
tests/          Vitest
docs/           仕様書・実装計画
```

ロジックは DOM に触れない層（`src/engine/`）に寄せ、Canvas と React は薄いアダプタに留めている。
そのおかげで描画・履歴・ツールの挙動をブラウザなしで実ピクセル検証できる。

## ライセンス

[MIT](LICENSE)
