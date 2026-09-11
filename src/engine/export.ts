import { BYTES_PER_PIXEL, EXPORT_EXTENSION, EXPORT_FILENAME_PREFIX } from "@/config/constants";
import type { PixelBuffer } from "./types";

const CHANNEL_MAX = 255;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 書き出しファイル名を作る（`drawing-YYYYMMDD-HHmmss.png`）。
 *
 * 時刻はローカル時刻（SPEC §6.5）。テストしやすいよう、
 * 現在時刻を内部で取得せず引数で受け取る。
 */
export function buildExportFilename(now: Date): string {
  const date = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;

  return `${EXPORT_FILENAME_PREFIX}-${date}-${time}.${EXPORT_EXTENSION}`;
}

/**
 * 不透明な白の上に全ピクセルを合成し、完全不透明なバッファを返す。
 *
 * ベースキャンバスは白で初期化されるため通常は既に不透明だが、
 * 「背景白の PNG」（SPEC §6.5）を保証するための最終処理として使う。
 *
 * 下地が不透明な白に固定されているため、`color.compositeOver` の一般式は
 *   aOut = 1、cOut = cSrc * aSrc + 255 * (1 - aSrc)
 * に簡約できる。ピクセルごとのオブジェクト生成を避けるためここで直接計算する
 * （一般式との一致は `tests/engine/export.test.ts` で検証している）。
 */
export function flattenOntoWhite(buffer: PixelBuffer): PixelBuffer {
  const source = buffer.data;
  const output = new Uint8ClampedArray(source.length);

  for (let offset = 0; offset < source.length; offset += BYTES_PER_PIXEL) {
    const alpha = (source[offset + 3] ?? 0) / CHANNEL_MAX;
    const backdrop = CHANNEL_MAX * (1 - alpha);

    output[offset] = Math.round((source[offset] ?? 0) * alpha + backdrop);
    output[offset + 1] = Math.round((source[offset + 1] ?? 0) * alpha + backdrop);
    output[offset + 2] = Math.round((source[offset + 2] ?? 0) * alpha + backdrop);
    output[offset + 3] = CHANNEL_MAX;
  }

  return { data: output, width: buffer.width, height: buffer.height };
}
