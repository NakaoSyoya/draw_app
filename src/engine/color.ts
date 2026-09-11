import type { Rgba } from "./types";

/** 8bit チャンネルの上限。 */
const CHANNEL_MAX = 255;

const HEX_SHORT = /^#[0-9a-f]{3}$/i;
const HEX_LONG = /^#[0-9a-f]{6}$/i;

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(CHANNEL_MAX, Math.max(0, Math.round(value)));
}

/**
 * `#RRGGBB` または `#RGB` を不透明な RGBA に変換する。
 *
 * カラーピッカーの値をそのまま受け取る想定。アルファは常に 255。
 * 不正な形式は例外を投げる（呼び出し側が握りつぶさないよう、既定値へのフォールバックはしない）。
 */
export function parseHexColor(hex: string): Rgba {
  if (HEX_SHORT.test(hex)) {
    const r = hex[1] as string;
    const g = hex[2] as string;
    const b = hex[3] as string;
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
      a: CHANNEL_MAX,
    };
  }

  if (HEX_LONG.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(1, 3), 16),
      g: Number.parseInt(hex.slice(3, 5), 16),
      b: Number.parseInt(hex.slice(5, 7), 16),
      a: CHANNEL_MAX,
    };
  }

  throw new Error(`不正な hex カラーです: ${JSON.stringify(hex)}`);
}

/**
 * RGBA を `#rrggbb`（小文字）に変換する。
 * アルファは表現に含めない（不透明度は描画設定として別に扱うため）。
 */
export function toHexColor(color: Rgba): string {
  const toPair = (value: number): string => clampChannel(value).toString(16).padStart(2, "0");

  return `#${toPair(color.r)}${toPair(color.g)}${toPair(color.b)}`;
}

/**
 * 0〜1 の不透明度をアルファに変換して適用する。RGB 成分は変えない。
 * 範囲外の値は 0〜1 にクランプする。
 */
export function withOpacity(color: Rgba, opacity: number): Rgba {
  const ratio = Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 0;

  return { r: color.r, g: color.g, b: color.b, a: Math.round(ratio * CHANNEL_MAX) };
}

/**
 * `src` を `dst` の上に source-over 合成する（非プリマルチプライ）。
 *
 * aOut = aSrc + aDst * (1 - aSrc)
 * cOut = (cSrc * aSrc + cDst * aDst * (1 - aSrc)) / aOut
 *
 * 双方が完全透明のときは aOut が 0 になるため、ゼロ除算を避けて完全透明を返す。
 */
export function compositeOver(src: Rgba, dst: Rgba): Rgba {
  const srcAlpha = src.a / CHANNEL_MAX;
  const dstAlpha = dst.a / CHANNEL_MAX;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

  if (outAlpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const blend = (srcChannel: number, dstChannel: number): number =>
    clampChannel((srcChannel * srcAlpha + dstChannel * dstAlpha * (1 - srcAlpha)) / outAlpha);

  return {
    r: blend(src.r, dst.r),
    g: blend(src.g, dst.g),
    b: blend(src.b, dst.b),
    a: clampChannel(outAlpha * CHANNEL_MAX),
  };
}

/**
 * 2 色の「距離」を、最大チャンネル差（アルファを含む）で返す。0〜255。
 * 塗りつぶしの許容差判定に使う。
 */
export function colorDistance(a: Rgba, b: Rgba): number {
  return Math.max(
    Math.abs(a.r - b.r),
    Math.abs(a.g - b.g),
    Math.abs(a.b - b.b),
    Math.abs(a.a - b.a),
  );
}
