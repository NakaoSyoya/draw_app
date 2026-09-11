import { BYTES_PER_PIXEL } from "@/config/constants";
import type { PixelBuffer, Rgba } from "@/engine/types";

/** 1 文字 = 1 ピクセルの対応表。 */
export type Palette = Readonly<Record<string, Rgba>>;

export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
export const RED: Rgba = { r: 255, g: 0, b: 0, a: 255 };
export const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/**
 * 文字マップから `PixelBuffer` を作る。
 *
 * ```ts
 * bufferFromMap(["WWB", "WWB"], { W: WHITE, B: BLACK })
 * ```
 * 期待値を目で読める形で書けるようにするためのテスト専用ヘルパー。
 */
export function bufferFromMap(rows: readonly string[], palette: Palette): PixelBuffer {
  const height = rows.length;
  const width = height === 0 ? 0 : (rows[0] as string).length;

  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(`行の長さが揃っていません: ${JSON.stringify(rows)}`);
    }
  }

  const data = new Uint8ClampedArray(width * height * BYTES_PER_PIXEL);

  for (let y = 0; y < height; y++) {
    const row = rows[y] as string;
    for (let x = 0; x < width; x++) {
      const key = row[x] as string;
      const color = palette[key];
      if (color === undefined) {
        throw new Error(`パレットに未定義の文字があります: ${JSON.stringify(key)}`);
      }
      const offset = (y * width + x) * BYTES_PER_PIXEL;
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = color.a;
    }
  }

  return { data, width, height };
}

/** バッファから 1 ピクセルを読み出す。 */
export function pixelAt(buffer: PixelBuffer, x: number, y: number): Rgba {
  const offset = (y * buffer.width + x) * BYTES_PER_PIXEL;

  return {
    r: buffer.data[offset] ?? 0,
    g: buffer.data[offset + 1] ?? 0,
    b: buffer.data[offset + 2] ?? 0,
    a: buffer.data[offset + 3] ?? 0,
  };
}

/**
 * `bufferFromMap` の逆変換。結果全体を 1 回のアサーションで比較できるようにする。
 * パレットに一致する色がないピクセルは `?` になり、差分表示でそのまま見える。
 */
export function toMap(buffer: PixelBuffer, palette: Palette): string[] {
  const entries = Object.entries(palette);
  const rows: string[] = [];

  for (let y = 0; y < buffer.height; y++) {
    let row = "";
    for (let x = 0; x < buffer.width; x++) {
      const pixel = pixelAt(buffer, x, y);
      const match = entries.find(
        ([, color]) =>
          color.r === pixel.r && color.g === pixel.g && color.b === pixel.b && color.a === pixel.a,
      );
      row += match ? match[0] : "?";
    }
    rows.push(row);
  }

  return rows;
}
