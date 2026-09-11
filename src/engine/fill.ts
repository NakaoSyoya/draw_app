import { BYTES_PER_PIXEL } from "@/config/constants";
import { colorDistance } from "./color";
import type { PixelBuffer, Point, Rgba } from "./types";

function readPixel(data: Uint8ClampedArray, offset: number): Rgba {
  return {
    r: data[offset] ?? 0,
    g: data[offset + 1] ?? 0,
    b: data[offset + 2] ?? 0,
    a: data[offset + 3] ?? 0,
  };
}

/**
 * `colorDistance(readPixel(...), target) <= tolerance` と同じ判定を、
 * ピクセルごとのオブジェクト生成なしで行う。
 * 最大チャンネル差が許容差以下 ⟺ すべてのチャンネル差が許容差以下。
 */
function matchesTarget(
  data: Uint8ClampedArray,
  offset: number,
  target: Rgba,
  tolerance: number,
): boolean {
  if (Math.abs((data[offset] ?? 0) - target.r) > tolerance) return false;
  if (Math.abs((data[offset + 1] ?? 0) - target.g) > tolerance) return false;
  if (Math.abs((data[offset + 2] ?? 0) - target.b) > tolerance) return false;
  return Math.abs((data[offset + 3] ?? 0) - target.a) <= tolerance;
}

/**
 * 塗りつぶし（バケツ）。開始点と色が近い 4 連結領域を `fillColor` で塗る。
 *
 * - 元のバッファは変更せず、新しいバッファを返す（エンジンは純粋関数として保つ）。
 * - 色の比較は常に「開始点の色」を基準に行う。塗り進めても基準はずれない。
 * - 開始点がすでに `fillColor` と同一なら何もしない（許容差が大きくても塗り広げない）。
 * - 開始点がキャンバス外なら、内容を変えないコピーを返す。
 *
 * 走査線（スキャンライン）方式。訪問済みフラグを持つため、
 * `fillColor` が許容差の範囲内にあっても必ず停止する。
 */
export function floodFill(
  buffer: PixelBuffer,
  start: Point,
  fillColor: Rgba,
  tolerance: number,
): PixelBuffer {
  const { width, height } = buffer;
  const source = buffer.data;
  const output = new Uint8ClampedArray(source);
  const result: PixelBuffer = { data: output, width, height };

  const startX = Math.floor(start.x);
  const startY = Math.floor(start.y);
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return result;
  }

  const target = readPixel(source, (startY * width + startX) * BYTES_PER_PIXEL);
  if (colorDistance(target, fillColor) === 0) {
    return result;
  }

  const tol = Math.max(0, tolerance);
  const visited = new Uint8Array(width * height);
  // 判定は常に元データ（source）を参照するため、書き込み内容が判定に影響しない。
  const matches = (index: number): boolean =>
    visited[index] === 0 && matchesTarget(source, index * BYTES_PER_PIXEL, target, tol);

  const stack: number[] = [startY * width + startX];

  while (stack.length > 0) {
    const index = stack.pop() as number;
    if (!matches(index)) continue;

    const y = Math.floor(index / width);
    const rowStart = y * width;
    const x = index - rowStart;

    let left = x;
    while (left > 0 && matches(rowStart + left - 1)) left--;

    let right = x;
    while (right < width - 1 && matches(rowStart + right + 1)) right++;

    for (let i = left; i <= right; i++) {
      const pixelIndex = rowStart + i;
      visited[pixelIndex] = 1;

      const offset = pixelIndex * BYTES_PER_PIXEL;
      output[offset] = fillColor.r;
      output[offset + 1] = fillColor.g;
      output[offset + 2] = fillColor.b;
      output[offset + 3] = fillColor.a;

      if (y > 0 && matches(pixelIndex - width)) stack.push(pixelIndex - width);
      if (y < height - 1 && matches(pixelIndex + width)) stack.push(pixelIndex + width);
    }
  }

  return result;
}
