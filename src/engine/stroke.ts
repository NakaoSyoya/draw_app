import type { Point } from "./types";

/**
 * 描画パスの 1 区間。Canvas 2D の `moveTo` / `lineTo` / `quadraticCurveTo` に対応する。
 * エンジンは DOM に触れないため、描画命令をデータとして返し、
 * 実際の描画は `src/canvas/renderer.ts` が行う。
 */
export type StrokeSegment =
  | { readonly type: "move"; readonly to: Point }
  | { readonly type: "line"; readonly to: Point }
  | { readonly type: "quadratic"; readonly control: Point; readonly to: Point };

export type StrokePath = readonly StrokeSegment[];

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 連続する同一座標を取り除く（ポインタが静止している間のイベント重複対策）。 */
function dedupe(points: readonly Point[]): Point[] {
  const result: Point[] = [];

  for (const point of points) {
    const previous = result[result.length - 1];
    if (previous !== undefined && previous.x === point.x && previous.y === point.y) {
      continue;
    }
    result.push(point);
  }

  return result;
}

/**
 * ポインタ座標列を、滑らかな描画パスに変換する。
 *
 * 各点を制御点とし、隣接点どうしの中点を通過点にする 2 次ベジェで補間する
 * （手描きストロークの定番手法）。始点と終点は入力座標をそのまま保持する。
 *
 * 太さ・色・不透明度はここでは扱わない。描画時に適用する。
 */
export function buildStrokePath(points: readonly Point[]): StrokePath {
  const unique = dedupe(points);

  const first = unique[0];
  if (first === undefined) {
    return [];
  }

  // 1 点だけの場合、同じ座標へ line を引くことで丸い点として描画できる。
  if (unique.length === 1) {
    return [
      { type: "move", to: first },
      { type: "line", to: first },
    ];
  }

  const last = unique[unique.length - 1] as Point;
  const segments: StrokeSegment[] = [{ type: "move", to: first }];

  for (let i = 1; i < unique.length - 1; i++) {
    const control = unique[i] as Point;
    const next = unique[i + 1] as Point;
    segments.push({ type: "quadratic", control, to: midpoint(control, next) });
  }

  segments.push({ type: "line", to: last });

  return segments;
}
