import { describe, expect, it } from "vitest";
import { handlePositions, hitTestHandle } from "@/engine/geometry";
import type { Rect, ResizeHandle } from "@/engine/types";

/** 左 10 / 上 20 / 右 30 / 下 50 の矩形。 */
const BASE: Rect = { x: 10, y: 20, width: 20, height: 30 };

describe("handlePositions", () => {
  it("8 方向のハンドル座標を返す", () => {
    expect(handlePositions(BASE)).toEqual({
      nw: { x: 10, y: 20 },
      n: { x: 20, y: 20 },
      ne: { x: 30, y: 20 },
      e: { x: 30, y: 35 },
      se: { x: 30, y: 50 },
      s: { x: 20, y: 50 },
      sw: { x: 10, y: 50 },
      w: { x: 10, y: 35 },
    });
  });

  it("幅・高さ 0 の矩形では全ハンドルが同じ点に重なる", () => {
    const positions = handlePositions({ x: 5, y: 7, width: 0, height: 0 });

    for (const position of Object.values(positions)) {
      expect(position).toEqual({ x: 5, y: 7 });
    }
  });
});

describe("hitTestHandle", () => {
  it.each<[ResizeHandle, { x: number; y: number }]>([
    ["nw", { x: 10, y: 20 }],
    ["n", { x: 20, y: 20 }],
    ["ne", { x: 30, y: 20 }],
    ["e", { x: 30, y: 35 }],
    ["se", { x: 30, y: 50 }],
    ["s", { x: 20, y: 50 }],
    ["sw", { x: 10, y: 50 }],
    ["w", { x: 10, y: 35 }],
  ])("ハンドル %s の真上を指すとそのハンドルを返す", (handle, point) => {
    expect(hitTestHandle(BASE, point, 6)).toBe(handle);
  });

  it("許容半径の内側なら少しずれていても掴める", () => {
    expect(hitTestHandle(BASE, { x: 13, y: 22 }, 6)).toBe("nw");
  });

  it("許容半径の外なら undefined を返す", () => {
    expect(hitTestHandle(BASE, { x: 20, y: 35 }, 6)).toBeUndefined();
  });

  it("複数のハンドルが半径内にある場合は最も近いものを返す", () => {
    // 幅 4 の矩形では nw(10,20) / n(12,20) / ne(14,20) が半径 6 に同時に入る。
    const narrow: Rect = { x: 10, y: 20, width: 4, height: 30 };

    expect(hitTestHandle(narrow, { x: 10.5, y: 20 }, 6)).toBe("nw");
    expect(hitTestHandle(narrow, { x: 12.2, y: 20 }, 6)).toBe("n");
    expect(hitTestHandle(narrow, { x: 13.5, y: 20 }, 6)).toBe("ne");
  });

  it("許容半径 0 なら完全に一致した場合のみ掴める", () => {
    expect(hitTestHandle(BASE, { x: 10, y: 20 }, 0)).toBe("nw");
    expect(hitTestHandle(BASE, { x: 11, y: 20 }, 0)).toBeUndefined();
  });
});
