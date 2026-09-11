import type { Point, Rect, ResizeHandle } from "./types";

/** 楕円の定義（外接矩形から導かれる中心と半径）。 */
export interface Ellipse {
  readonly center: Point;
  readonly radiusX: number;
  readonly radiusY: number;
}

/** 直線の定義。図形と違い端点の順序（向き）を保持する。 */
export interface Line {
  readonly start: Point;
  readonly end: Point;
}

function rectFromEdges(left: number, top: number, right: number, bottom: number): Rect {
  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  };
}

/**
 * 対角の 2 点から矩形を作る。
 * ドラッグの向きに関係なく、幅・高さが非負の矩形を返す。
 */
export function normalizeRect(a: Point, b: Point): Rect {
  return rectFromEdges(a.x, a.y, b.x, b.y);
}

/** 対角の 2 点を外接矩形とみなして楕円を作る。 */
export function ellipseFromPoints(a: Point, b: Point): Ellipse {
  const rect = normalizeRect(a, b);

  return {
    center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
    radiusX: rect.width / 2,
    radiusY: rect.height / 2,
  };
}

/**
 * 2 点から直線を作る。
 * 矩形と違い正規化せず、始点・終点をそのまま保持する（向きが意味を持つため）。
 */
export function lineFromPoints(start: Point, end: Point): Line {
  return { start, end };
}

/** 直線を囲む矩形。未確定オブジェクトのハンドル表示に使う。 */
export function lineBounds(start: Point, end: Point): Rect {
  return normalizeRect(start, end);
}

/**
 * ハンドルをポインタ位置までドラッグしたときの新しい矩形を返す。
 *
 * 角ハンドル（nw/ne/se/sw）は 2 辺、辺ハンドル（n/e/s/w）は 1 辺だけを動かす。
 * 反対側の辺を越えた場合は反転して正規化される。
 */
export function resizeRect(rect: Rect, handle: ResizeHandle, pointer: Point): Rect {
  const movesLeft = handle === "nw" || handle === "w" || handle === "sw";
  const movesRight = handle === "ne" || handle === "e" || handle === "se";
  const movesTop = handle === "nw" || handle === "n" || handle === "ne";
  const movesBottom = handle === "sw" || handle === "s" || handle === "se";

  const left = movesLeft ? pointer.x : rect.x;
  const right = movesRight ? pointer.x : rect.x + rect.width;
  const top = movesTop ? pointer.y : rect.y;
  const bottom = movesBottom ? pointer.y : rect.y + rect.height;

  return rectFromEdges(left, top, right, bottom);
}

/** 矩形を平行移動する。サイズは変えない。 */
export function moveRect(rect: Rect, dx: number, dy: number): Rect {
  return { x: rect.x + dx, y: rect.y + dy, width: rect.width, height: rect.height };
}

/** 8 方向ハンドルの座標。未確定オブジェクトの当たり判定と表示に使う。 */
export function handlePositions(rect: Rect): Readonly<Record<ResizeHandle, Point>> {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return {
    nw: { x: left, y: top },
    n: { x: centerX, y: top },
    ne: { x: right, y: top },
    e: { x: right, y: centerY },
    se: { x: right, y: bottom },
    s: { x: centerX, y: bottom },
    sw: { x: left, y: bottom },
    w: { x: left, y: centerY },
  };
}

/**
 * 点がどのリサイズハンドルを掴んでいるかを返す。掴んでいなければ `undefined`。
 * 複数が許容半径内にある場合（小さな矩形）は最も近いものを選ぶ。
 */
export function hitTestHandle(rect: Rect, point: Point, radius: number): ResizeHandle | undefined {
  let nearest: ResizeHandle | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [handle, position] of Object.entries(handlePositions(rect))) {
    const distance = Math.hypot(position.x - point.x, position.y - point.y);
    if (distance <= radius && distance < nearestDistance) {
      nearest = handle as ResizeHandle;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/** 点が矩形の内部または境界上にあるか。未確定オブジェクトの当たり判定に使う。 */
export function rectContains(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
