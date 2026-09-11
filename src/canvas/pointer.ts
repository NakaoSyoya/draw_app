import type { Point, Size } from "@/engine/types";

/**
 * 画面上に表示されているキャンバスの矩形（ビューポート座標）。
 * `HTMLElement.getBoundingClientRect()` の戻り値と構造的に互換。
 * スクロール量は `left` / `top` にすでに反映されている。
 */
export interface DisplayRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * ポインタのクライアント座標を、キャンバスのピクセル座標に変換する。
 *
 * 表示サイズとキャンバスの実寸が違う（縮小表示）場合の倍率も逆算する。
 * 滑らかな線を引くため小数のまま返す（丸めない）。
 *
 * キャンバスの外を指している場合は負や範囲外の値をそのまま返す。
 * ドラッグがキャンバス外へ出るケースは呼び出し側の判断に委ねる。
 * 表示サイズが 0（レイアウト確定前）ならゼロ除算を避けて原点を返す。
 */
export function toCanvasPoint(client: Point, displayRect: DisplayRect, canvasSize: Size): Point {
  if (displayRect.width <= 0 || displayRect.height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (client.x - displayRect.left) * (canvasSize.width / displayRect.width),
    y: (client.y - displayRect.top) * (canvasSize.height / displayRect.height),
  };
}

/**
 * キャンバスを利用可能領域に収めるための表示サイズを求める。
 *
 * - 縮小のみ行い、拡大はしない（原寸を超えて引き伸ばさない）。
 * - アスペクト比を保つ。
 * - サブピクセルのにじみを避けるため整数に丸め、最低 1px は確保する。
 * - 利用可能領域が未確定（0 以下）なら原寸を返す。
 *
 * ズーム・パンは MVP のスコープ外（SPEC §16 #3）。
 */
export function computeDisplaySize(canvasSize: Size, available: Size): Size {
  if (available.width <= 0 || available.height <= 0) {
    return { width: canvasSize.width, height: canvasSize.height };
  }

  const scale = Math.min(
    1,
    available.width / canvasSize.width,
    available.height / canvasSize.height,
  );

  return {
    width: Math.max(1, Math.round(canvasSize.width * scale)),
    height: Math.max(1, Math.round(canvasSize.height * scale)),
  };
}
