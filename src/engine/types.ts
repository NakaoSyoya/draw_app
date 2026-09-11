/**
 * エンジン共通の型定義。
 *
 * このファイルを含む `src/engine/` は DOM / Canvas に一切依存しない。
 * ブラウザ固有の型（`ImageData`、`ImageBitmap` など）をここで参照しないこと。
 */

/** 8bit チャンネルの RGBA。各成分 0〜255。`ImageData` のバイト並びに対応する。 */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** アルファ。0 = 完全透明、255 = 完全不透明。 */
  readonly a: number;
}

/** キャンバスピクセル座標系の点。原点は左上。 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** ピクセル単位の寸法。 */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** 左上原点・非負の幅高さを持つ矩形（正規化済み）。 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * `ImageData` 互換のピクセルバッファ。
 * DOM 非依存でテストできるよう、構造的に同じ形の独自型として定義する。
 * `data` の長さは `width * height * BYTES_PER_PIXEL` であること。
 */
export interface PixelBuffer {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/** ツールの識別子。SPEC §6.2 / §8 のショートカットに対応する。 */
export type ToolId = "brush" | "eraser" | "line" | "rectangle" | "ellipse" | "fill" | "text";

/** 線の見た目。不透明度は色のアルファに含める（`globalAlpha` は使わない）。 */
export interface StrokeStyle {
  readonly color: Rgba;
  readonly width: number;
}

/** 図形の見た目。`filled` が true なら内部も塗る。 */
export interface ShapeStyle extends StrokeStyle {
  readonly filled: boolean;
}

/** テキストの見た目。フォントファミリは `TEXT_FONT_FAMILY` で固定。 */
export interface TextStyle {
  readonly color: Rgba;
  readonly fontSize: number;
}

/** 未確定オブジェクトのバウンディングボックスに表示するリサイズハンドル（8 方向）。 */
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** 新規作成時に選ぶキャンバスサイズのプリセット。 */
export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Undo/Redo 用のスナップショット。
 *
 * 保持形式（`ImageBitmap` / PNG `Blob` など）は呼び出し側が決めるため、
 * ペイロードは型引数として外から注入する（SPEC §16 #4）。
 * `byteLength` は履歴全体のメモリ上限判定に使う概算バイト数。
 */
export interface Snapshot<TData = unknown> {
  readonly data: TData;
  readonly byteLength: number;
}
