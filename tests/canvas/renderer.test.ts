import { createCanvas } from "@napi-rs/canvas";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCanvas,
  drawEllipse,
  drawLine,
  drawRect,
  drawStroke,
  drawText,
  fillCanvas,
  putPixels,
  readPixels,
  toCssColor,
} from "@/canvas/renderer";
import { buildStrokePath } from "@/engine/stroke";
import type { Rgba, Size } from "@/engine/types";
import { BLACK, bufferFromMap, pixelAt, RED, WHITE } from "../helpers/pixels";

/**
 * `@napi-rs/canvas` は Skia ベースの実際の 2D コンテキストを返す。
 * 描画結果を実ピクセルで検証できるため、描画処理をモックしない。
 */
function createContext(size: Size): CanvasRenderingContext2D {
  const canvas = createCanvas(size.width, size.height);
  return canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
}

const SIZE: Size = { width: 20, height: 20 };
const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

let ctx: CanvasRenderingContext2D;

beforeEach(() => {
  ctx = createContext(SIZE);
});

/** アンチエイリアスがあるため、色そのものではなく「十分に濃く塗られたか」で判定する。 */
function alphaAt(x: number, y: number): number {
  return pixelAt(readPixels(ctx, SIZE), x, y).a;
}

describe("toCssColor", () => {
  it("不透明な色はアルファ 1 で表現する", () => {
    expect(toCssColor(RED)).toBe("rgba(255, 0, 0, 1)");
  });

  it("完全透明な色はアルファ 0 で表現する", () => {
    expect(toCssColor({ r: 255, g: 0, b: 0, a: 0 })).toBe("rgba(255, 0, 0, 0)");
  });

  it("アルファ 128 は 0〜1 の割合に変換する", () => {
    expect(toCssColor({ r: 255, g: 0, b: 0, a: 128 })).toBe("rgba(255, 0, 0, 0.502)");
  });
});

describe("fillCanvas", () => {
  it("キャンバス全体を指定色で塗る", () => {
    fillCanvas(ctx, SIZE, WHITE);

    const buffer = readPixels(ctx, SIZE);
    expect(pixelAt(buffer, 0, 0)).toEqual(WHITE);
    expect(pixelAt(buffer, 19, 19)).toEqual(WHITE);
    expect(pixelAt(buffer, 10, 10)).toEqual(WHITE);
  });

  it("すでに描かれている内容を完全に上書きする", () => {
    fillCanvas(ctx, SIZE, RED);
    fillCanvas(ctx, SIZE, WHITE);

    expect(pixelAt(readPixels(ctx, SIZE), 5, 5)).toEqual(WHITE);
  });
});

describe("clearCanvas", () => {
  it("塗られた内容を完全透明に戻す", () => {
    fillCanvas(ctx, SIZE, RED);

    clearCanvas(ctx, SIZE);

    expect(pixelAt(readPixels(ctx, SIZE), 5, 5)).toEqual(TRANSPARENT);
  });
});

describe("drawStroke", () => {
  it("2 点のパスが線として描かれ、線から離れた場所は塗られない", () => {
    const path = buildStrokePath([
      { x: 0, y: 10 },
      { x: 20, y: 10 },
    ]);

    drawStroke(ctx, path, { color: BLACK, width: 2 });

    expect(alphaAt(10, 10)).toBeGreaterThan(200);
    expect(alphaAt(10, 1)).toBe(0);
  });

  it("線の太さが反映される（太い線ほど広い範囲が塗られる）", () => {
    const path = buildStrokePath([
      { x: 0, y: 10 },
      { x: 20, y: 10 },
    ]);

    drawStroke(ctx, path, { color: BLACK, width: 10 });

    // 太さ 10 なら中心から上下 4px は確実に塗られ、太さ 2 では塗られない位置。
    expect(alphaAt(10, 6)).toBeGreaterThan(200);
    expect(alphaAt(10, 14)).toBeGreaterThan(200);
  });

  it("色の不透明度が描画結果のアルファに反映される", () => {
    const path = buildStrokePath([
      { x: 0, y: 10 },
      { x: 20, y: 10 },
    ]);

    drawStroke(ctx, path, { color: { r: 0, g: 0, b: 0, a: 128 }, width: 6 });

    const alpha = alphaAt(10, 10);
    expect(alpha).toBeGreaterThan(100);
    expect(alpha).toBeLessThan(160);
  });

  it("1 点だけのストロークは丸い点として描かれる（線端が round）", () => {
    const path = buildStrokePath([{ x: 10, y: 10 }]);

    drawStroke(ctx, path, { color: BLACK, width: 10 });

    // 半径 5 の円。上下左右 4px は内側、対角 5px 先（距離 ≒ 7.1）は外側。
    expect(alphaAt(10, 10)).toBeGreaterThan(200);
    expect(alphaAt(14, 10)).toBeGreaterThan(200);
    expect(alphaAt(10, 6)).toBeGreaterThan(200);
    expect(alphaAt(15, 15)).toBe(0);
  });

  it("空のパスでは何も描かれず例外も出ない", () => {
    expect(() => drawStroke(ctx, [], { color: BLACK, width: 4 })).not.toThrow();
    expect(alphaAt(10, 10)).toBe(0);
  });

  it("曲線区間を含むパスも描画される", () => {
    const path = buildStrokePath([
      { x: 2, y: 10 },
      { x: 10, y: 10 },
      { x: 18, y: 10 },
    ]);

    drawStroke(ctx, path, { color: BLACK, width: 4 });

    expect(alphaAt(10, 10)).toBeGreaterThan(200);
  });
});

describe("drawRect", () => {
  it("塗りありなら内部が塗られる", () => {
    drawRect(ctx, { x: 4, y: 4, width: 12, height: 12 }, { color: RED, width: 2, filled: true });

    expect(pixelAt(readPixels(ctx, SIZE), 10, 10)).toEqual(RED);
    expect(alphaAt(1, 1)).toBe(0);
  });

  it("塗りなしなら枠線だけが描かれ、内部は塗られない", () => {
    drawRect(ctx, { x: 4, y: 4, width: 12, height: 12 }, { color: RED, width: 2, filled: false });

    expect(alphaAt(10, 10)).toBe(0);
    expect(alphaAt(4, 10)).toBeGreaterThan(200);
  });

  it("幅・高さ 0 の矩形でも例外を出さない", () => {
    expect(() =>
      drawRect(ctx, { x: 5, y: 5, width: 0, height: 0 }, { color: RED, width: 2, filled: true }),
    ).not.toThrow();
  });
});

describe("drawEllipse", () => {
  it("塗りありなら中心が塗られ、外接矩形の角は塗られない", () => {
    // 中心 (10,10) 半径 8、線幅 2 なので外縁は半径 9。
    // 外接矩形の角のピクセル (2,2) は中心から最短でも約 9.9 離れており、線幅の外側。
    drawEllipse(
      ctx,
      { center: { x: 10, y: 10 }, radiusX: 8, radiusY: 8 },
      { color: RED, width: 2, filled: true },
    );

    expect(pixelAt(readPixels(ctx, SIZE), 10, 10)).toEqual(RED);
    expect(alphaAt(2, 2)).toBe(0);
    expect(alphaAt(0, 0)).toBe(0);
  });

  it("縦長・横長の楕円で軸ごとの半径が反映される", () => {
    drawEllipse(
      ctx,
      { center: { x: 10, y: 10 }, radiusX: 9, radiusY: 3 },
      { color: RED, width: 1, filled: true },
    );

    // 横方向には広く、縦方向には狭い。
    expect(alphaAt(17, 10)).toBeGreaterThan(200);
    expect(alphaAt(10, 17)).toBe(0);
  });

  it("塗りなしなら中心は塗られず、輪郭が描かれる", () => {
    drawEllipse(
      ctx,
      { center: { x: 10, y: 10 }, radiusX: 8, radiusY: 8 },
      { color: RED, width: 2, filled: false },
    );

    expect(alphaAt(10, 10)).toBe(0);
    expect(alphaAt(10, 2)).toBeGreaterThan(200);
  });

  it("半径 0 でも例外を出さない", () => {
    expect(() =>
      drawEllipse(
        ctx,
        { center: { x: 10, y: 10 }, radiusX: 0, radiusY: 0 },
        { color: RED, width: 2, filled: true },
      ),
    ).not.toThrow();
  });
});

describe("drawLine", () => {
  it("2 点を結ぶ線が描かれ、線から外れた位置は塗られない", () => {
    drawLine(ctx, { start: { x: 0, y: 0 }, end: { x: 19, y: 19 } }, { color: BLACK, width: 2 });

    expect(alphaAt(10, 10)).toBeGreaterThan(200);
    expect(alphaAt(2, 17)).toBe(0);
  });

  it("始点と終点が同じでも例外を出さない", () => {
    expect(() =>
      drawLine(ctx, { start: { x: 5, y: 5 }, end: { x: 5, y: 5 } }, { color: BLACK, width: 2 }),
    ).not.toThrow();
  });
});

describe("drawText", () => {
  it("指定位置から下方向にテキストが描かれる（ベースラインは上端）", () => {
    drawText(ctx, "あ", { x: 2, y: 2 }, { color: BLACK, fontSize: 16 });

    const buffer = readPixels(ctx, SIZE);
    let painted = 0;
    for (let y = 0; y < SIZE.height; y++) {
      for (let x = 0; x < SIZE.width; x++) {
        if (pixelAt(buffer, x, y).a > 0) painted++;
      }
    }

    expect(painted).toBeGreaterThan(0);
  });

  it("空文字なら何も描かれない", () => {
    drawText(ctx, "", { x: 2, y: 2 }, { color: BLACK, fontSize: 16 });

    expect(alphaAt(5, 5)).toBe(0);
  });
});

describe("readPixels / putPixels", () => {
  it("書き込んだバッファをそのまま読み戻せる（往復で値が変わらない）", () => {
    const buffer = bufferFromMap(["WRB", "BWR"], { W: WHITE, R: RED, B: BLACK });
    const target = createContext({ width: 3, height: 2 });

    putPixels(target, buffer);
    const restored = readPixels(target, { width: 3, height: 2 });

    expect(restored.width).toBe(3);
    expect(restored.height).toBe(2);
    expect(Array.from(restored.data)).toEqual(Array.from(buffer.data));
  });

  it("putPixels は合成せず既存の内容を置き換える", () => {
    fillCanvas(ctx, SIZE, RED);
    const halfBlack: Rgba = { r: 0, g: 0, b: 0, a: 128 };
    const buffer = bufferFromMap(
      [" ".repeat(SIZE.width)].map(() => "H".repeat(SIZE.width)),
      {
        H: halfBlack,
      },
    );
    const target = createContext({ width: SIZE.width, height: 1 });

    fillCanvas(target, { width: SIZE.width, height: 1 }, RED);
    putPixels(target, { data: buffer.data.slice(0, SIZE.width * 4), width: SIZE.width, height: 1 });

    expect(pixelAt(readPixels(target, { width: SIZE.width, height: 1 }), 5, 0)).toEqual(halfBlack);
  });

  it("読み出したバッファの寸法が指定サイズと一致する", () => {
    const buffer = readPixels(ctx, SIZE);

    expect(buffer.width).toBe(SIZE.width);
    expect(buffer.height).toBe(SIZE.height);
    expect(buffer.data.length).toBe(SIZE.width * SIZE.height * 4);
  });
});
