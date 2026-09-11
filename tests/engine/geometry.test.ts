import { describe, expect, it } from "vitest";
import {
  ellipseFromPoints,
  lineBounds,
  lineFromPoints,
  moveRect,
  normalizeRect,
  rectContains,
  resizeRect,
} from "@/engine/geometry";
import type { Rect, ResizeHandle } from "@/engine/types";

/** 左 10 / 上 20 / 右 30 / 下 50 の矩形。リサイズテストの基準。 */
const BASE: Rect = { x: 10, y: 20, width: 20, height: 30 };

describe("normalizeRect", () => {
  it("始点が左上・終点が右下でも正しい矩形になる", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 30, y: 50 })).toEqual(BASE);
  });

  it("始点が右下・終点が左上でも同じ矩形になる", () => {
    expect(normalizeRect({ x: 30, y: 50 }, { x: 10, y: 20 })).toEqual(BASE);
  });

  it("始点が右上・終点が左下でも同じ矩形になる", () => {
    expect(normalizeRect({ x: 30, y: 20 }, { x: 10, y: 50 })).toEqual(BASE);
  });

  it("始点が左下・終点が右上でも同じ矩形になる", () => {
    expect(normalizeRect({ x: 10, y: 50 }, { x: 30, y: 20 })).toEqual(BASE);
  });

  it("同一点なら幅・高さ 0 の矩形になる（クリックのみの操作）", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 0,
      height: 0,
    });
  });

  it("垂直方向だけドラッグすると幅 0 になる", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 10, y: 50 })).toEqual({
      x: 10,
      y: 20,
      width: 0,
      height: 30,
    });
  });

  it("水平方向だけドラッグすると高さ 0 になる", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 30, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 0,
    });
  });

  it("負の座標でも正しく正規化する", () => {
    expect(normalizeRect({ x: 5, y: 5 }, { x: -15, y: -25 })).toEqual({
      x: -15,
      y: -25,
      width: 20,
      height: 30,
    });
  });
});

describe("ellipseFromPoints", () => {
  it("2 点の外接矩形から中心と半径を求める", () => {
    expect(ellipseFromPoints({ x: 10, y: 20 }, { x: 30, y: 50 })).toEqual({
      center: { x: 20, y: 35 },
      radiusX: 10,
      radiusY: 15,
    });
  });

  it("点の順序を入れ替えても同じ楕円になる", () => {
    expect(ellipseFromPoints({ x: 30, y: 50 }, { x: 10, y: 20 })).toEqual(
      ellipseFromPoints({ x: 10, y: 20 }, { x: 30, y: 50 }),
    );
  });

  it("同一点なら半径 0 になる", () => {
    expect(ellipseFromPoints({ x: 10, y: 20 }, { x: 10, y: 20 })).toEqual({
      center: { x: 10, y: 20 },
      radiusX: 0,
      radiusY: 0,
    });
  });

  it("外接矩形は normalizeRect の結果と一致する", () => {
    const a = { x: 30, y: 20 };
    const b = { x: 10, y: 50 };
    const ellipse = ellipseFromPoints(a, b);
    const rect = normalizeRect(a, b);

    expect(ellipse.center.x - ellipse.radiusX).toBe(rect.x);
    expect(ellipse.center.y - ellipse.radiusY).toBe(rect.y);
    expect(ellipse.radiusX * 2).toBe(rect.width);
    expect(ellipse.radiusY * 2).toBe(rect.height);
  });
});

describe("lineFromPoints", () => {
  it("端点の順序を保持する（正規化して向きを失わない）", () => {
    expect(lineFromPoints({ x: 30, y: 50 }, { x: 10, y: 20 })).toEqual({
      start: { x: 30, y: 50 },
      end: { x: 10, y: 20 },
    });
  });

  it("始点と終点が同じでも端点をそのまま返す", () => {
    expect(lineFromPoints({ x: 7, y: 7 }, { x: 7, y: 7 })).toEqual({
      start: { x: 7, y: 7 },
      end: { x: 7, y: 7 },
    });
  });
});

describe("lineBounds", () => {
  it("向きに関係なく直線を囲む矩形を返す", () => {
    expect(lineBounds({ x: 30, y: 50 }, { x: 10, y: 20 })).toEqual(BASE);
  });

  it("水平な直線は高さ 0 の矩形になる", () => {
    expect(lineBounds({ x: 10, y: 20 }, { x: 30, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 0,
    });
  });
});

describe("resizeRect", () => {
  it.each<[ResizeHandle, { x: number; y: number }, Rect]>([
    ["se", { x: 40, y: 60 }, { x: 10, y: 20, width: 30, height: 40 }],
    ["nw", { x: 0, y: 0 }, { x: 0, y: 0, width: 30, height: 50 }],
    ["ne", { x: 40, y: 0 }, { x: 10, y: 0, width: 30, height: 50 }],
    ["sw", { x: 0, y: 60 }, { x: 0, y: 20, width: 30, height: 40 }],
  ])("角ハンドル %s は 2 辺を動かす", (handle, pointer, expected) => {
    expect(resizeRect(BASE, handle, pointer)).toEqual(expected);
  });

  it("上辺ハンドル n は縦だけを変え、横は動かさない", () => {
    expect(resizeRect(BASE, "n", { x: 999, y: 10 })).toEqual({
      x: 10,
      y: 10,
      width: 20,
      height: 40,
    });
  });

  it("下辺ハンドル s は縦だけを変え、横は動かさない", () => {
    expect(resizeRect(BASE, "s", { x: -999, y: 60 })).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 40,
    });
  });

  it("右辺ハンドル e は横だけを変え、縦は動かさない", () => {
    expect(resizeRect(BASE, "e", { x: 40, y: -999 })).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 30,
    });
  });

  it("左辺ハンドル w は横だけを変え、縦は動かさない", () => {
    expect(resizeRect(BASE, "w", { x: 0, y: 999 })).toEqual({
      x: 0,
      y: 20,
      width: 30,
      height: 30,
    });
  });

  it("反対側の辺を越えてドラッグすると矩形が反転して正規化される", () => {
    expect(resizeRect(BASE, "se", { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 20,
    });
  });

  it("辺の上でドラッグを止めると幅 0 の矩形になる", () => {
    expect(resizeRect(BASE, "e", { x: 10, y: 0 })).toEqual({
      x: 10,
      y: 20,
      width: 0,
      height: 30,
    });
  });
});

describe("moveRect", () => {
  it("矩形を平行移動し、サイズは変えない", () => {
    expect(moveRect(BASE, 5, -10)).toEqual({ x: 15, y: 10, width: 20, height: 30 });
  });

  it("移動量 0 なら同じ矩形を返す", () => {
    expect(moveRect(BASE, 0, 0)).toEqual(BASE);
  });
});

describe("rectContains", () => {
  it("内部の点を含むと判定する", () => {
    expect(rectContains(BASE, { x: 20, y: 35 })).toBe(true);
  });

  it("左上の角（境界）を含むと判定する", () => {
    expect(rectContains(BASE, { x: 10, y: 20 })).toBe(true);
  });

  it("右下の角（境界）を含むと判定する", () => {
    expect(rectContains(BASE, { x: 30, y: 50 })).toBe(true);
  });

  it.each([
    { x: 9, y: 35 },
    { x: 31, y: 35 },
    { x: 20, y: 19 },
    { x: 20, y: 51 },
  ])("外側の点 %o は含まないと判定する", (point) => {
    expect(rectContains(BASE, point)).toBe(false);
  });
});
