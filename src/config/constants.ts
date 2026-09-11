/**
 * アプリ全体の設定値。SPEC §12 に対応する。
 *
 * マジックナンバーはここに集約し、ロジック側へ直書きしないこと。
 */

/** RGBA 1 ピクセルあたりのバイト数。 */
export const BYTES_PER_PIXEL = 4;

/**
 * キャンバス 1 辺の最大ピクセル数。
 * メモリと flood fill の処理時間を抑えるための上限（SPEC §7 非機能要件）。
 */
export const MAX_CANVAS_DIMENSION = 2048;

/** Undo で戻れる最大ステップ数（SPEC §6.4）。 */
export const HISTORY_DEPTH = 20;

/**
 * 履歴スナップショットが占有してよい合計バイト数の上限。
 * 上限を超えたら最古から破棄する（SPEC §16 #4）。
 *
 * スナップショットは生ピクセルで保持するため、1 枚あたり 幅×高さ×4 バイト。
 * 最大プリセット 1920x1080 で約 7.9MiB、既定プリセット 1280x720 で約 3.7MiB。
 * この値は「暴走を防ぐ天井」で、大きいプリセットでは深さ 20 に届かないことがあるが、
 * 履歴側が最古から捨てるため破綻しない。
 */
export const HISTORY_MAX_BYTES = 128 * 1024 * 1024;

/** ブラシ・消しゴムの太さの下限 (px)。 */
export const BRUSH_MIN = 1;

/** ブラシ・消しゴムの太さの上限 (px)。 */
export const BRUSH_MAX = 100;

/** ブラシ・消しゴムの初期の太さ (px)。 */
export const BRUSH_DEFAULT = 4;

/** 初期の不透明度。0（完全透明）〜1（完全不透明）の割合で表す。 */
export const OPACITY_DEFAULT = 1;

/**
 * 塗りつぶし（バケツ）の色許容差。
 * 各チャンネルの差分をこの値と比較する（0〜255）。
 */
export const FILL_TOLERANCE = 16;

/**
 * 未確定オブジェクトのリサイズハンドルを掴める距離（キャンバスピクセル）。
 * 表示が縮小されている場合でも掴みやすいよう、見た目より少し広めに取る。
 */
export const HANDLE_HIT_RADIUS = 10;

/** テキストツールのフォントサイズの下限 (px)。 */
export const TEXT_SIZE_MIN = 8;

/** テキストツールのフォントサイズの上限 (px)。 */
export const TEXT_SIZE_MAX = 200;

/** テキストツールの初期フォントサイズ (px)。 */
export const TEXT_SIZE_DEFAULT = 24;

/**
 * テキスト描画に使うフォント。
 * 外部 CDN を読み込まない方針のためシステムフォントのみ（SPEC §16 #7）。
 * `app/globals.css` の `font-family` と揃えること。
 */
export const TEXT_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", Meiryo, sans-serif';

/** 書き出し形式。SPEC §6.5 のとおり PNG 固定。 */
export const EXPORT_MIME = "image/png";

/** 書き出しファイルの拡張子。`EXPORT_MIME` のサブタイプと一致させること。 */
export const EXPORT_EXTENSION = "png";

/** 書き出しファイル名の接頭辞（`drawing-YYYYMMDD-HHmmss.png`）。 */
export const EXPORT_FILENAME_PREFIX = "drawing";
