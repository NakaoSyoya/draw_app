import { createCanvas } from "@napi-rs/canvas";
import { beforeEach, describe, expect, it } from "vitest";
import { executeDrawCommand, executeDrawCommands } from "@/canvas/draw-command";
import { fillCanvas, readPixels } from "@/canvas/renderer";
import type { DrawCommand } from "@/engine/draw-command";
import { buildStrokePath } from "@/engine/stroke";
import type { ShapeStyle, Size, StrokeStyle } from "@/engine/types";
import { BLACK, bufferFromMap, pixelAt, RED, WHITE } from "../helpers/pixels";

const SIZE: Size = { width: 20, height: 20 };
const STROKE: StrokeStyle = { color: BLACK, width: 4 };
const SHAPE: ShapeStyle = { color: RED, width: 2, filled: true };

let ctx: CanvasRenderingContext2D;

beforeEach(() => {
  ctx = createCanvas(SIZE.width, SIZE.height).getContext(
    "2d",
  ) as unknown as CanvasRenderingContext2D;
});

function alphaAt(x: number, y: number): number {
  return pixelAt(readPixels(ctx, SIZE), x, y).a;
}

describe("executeDrawCommand", () => {
  it("stroke 命令をストロークとして描く", () => {
    executeDrawCommand(ctx, {
      type: "stroke",
      path: buildStrokePath([
        { x: 0, y: 10 },
        { x: 20, y: 10 },
      ]),
      style: STROKE,
    });

    expect(alphaAt(10, 10)).toBeGreaterThan(200);
    expect(alphaAt(10, 1)).toBe(0);
  });

  it("rect 命令を矩形として描く", () => {
    executeDrawCommand(ctx, {
      type: "rect",
      rect: { x: 4, y: 4, width: 12, height: 12 },
      style: SHAPE,
    });

    expect(pixelAt(readPixels(ctx, SIZE), 10, 10)).toEqual(RED);
    expect(alphaAt(1, 1)).toBe(0);
  });

  it("ellipse 命令を楕円として描く", () => {
    executeDrawCommand(ctx, {
      type: "ellipse",
      ellipse: { center: { x: 10, y: 10 }, radiusX: 8, radiusY: 8 },
      style: SHAPE,
    });

    expect(pixelAt(readPixels(ctx, SIZE), 10, 10)).toEqual(RED);
    expect(alphaAt(0, 0)).toBe(0);
  });

  it("line 命令を直線として描く", () => {
    executeDrawCommand(ctx, {
      type: "line",
      line: { start: { x: 0, y: 0 }, end: { x: 19, y: 19 } },
      style: STROKE,
    });

    expect(alphaAt(10, 10)).toBeGreaterThan(200);
    expect(alphaAt(2, 17)).toBe(0);
  });

  it("text 命令を文字として描く", () => {
    executeDrawCommand(ctx, {
      type: "text",
      text: "あ",
      origin: { x: 2, y: 2 },
      style: { color: BLACK, fontSize: 16 },
    });

    const buffer = readPixels(ctx, SIZE);
    const painted = Array.from({ length: SIZE.height }).some((_, y) =>
      Array.from({ length: SIZE.width }).some((__, x) => pixelAt(buffer, x, y).a > 0),
    );

    expect(painted).toBe(true);
  });

  it("pixels 命令をそのまま書き戻す（塗りつぶし結果・履歴の復元）", () => {
    const buffer = bufferFromMap(["WRB", "BWR"], { W: WHITE, R: RED, B: BLACK });
    const target = createCanvas(3, 2).getContext("2d") as unknown as CanvasRenderingContext2D;

    executeDrawCommand(target, { type: "pixels", buffer });

    const restored = readPixels(target, { width: 3, height: 2 });
    expect(Array.from(restored.data)).toEqual(Array.from(buffer.data));
  });
});

describe("executeDrawCommands", () => {
  it("複数の命令を順に反映する（後の命令が前の命令を上書きする）", () => {
    const commands: DrawCommand[] = [
      { type: "rect", rect: { x: 0, y: 0, width: 20, height: 20 }, style: SHAPE },
      {
        type: "ellipse",
        ellipse: { center: { x: 10, y: 10 }, radiusX: 5, radiusY: 5 },
        style: { color: BLACK, width: 1, filled: true },
      },
    ];

    executeDrawCommands(ctx, commands);

    const buffer = readPixels(ctx, SIZE);
    expect(pixelAt(buffer, 10, 10)).toEqual(BLACK);
    expect(pixelAt(buffer, 1, 1)).toEqual(RED);
  });

  it("空の配列では何も描かれない", () => {
    fillCanvas(ctx, SIZE, WHITE);

    executeDrawCommands(ctx, []);

    expect(pixelAt(readPixels(ctx, SIZE), 10, 10)).toEqual(WHITE);
  });
});
