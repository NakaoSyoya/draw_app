import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { computeDisplaySize, type DisplayRect, toCanvasPoint } from "@/canvas/pointer";
import { clearCanvas, drawStroke, fillCanvas, readPixels } from "@/canvas/renderer";
import { buildStrokePath } from "@/engine/stroke";
import type { Point, Size } from "@/engine/types";
import { BLACK, pixelAt, WHITE } from "../helpers/pixels";

/**
 * Canvas アダプタ層の結線テスト。
 *
 * `CanvasStage` が行う「クライアント座標 → キャンバス座標 → パス生成 → 描画」の連鎖を、
 * React を介さずに同じ順序で実行し、実ピクセルで結果を検証する。
 * React / レイアウト / ポインタキャプチャの確認は手動 QA と P12 で行う。
 */

const CANVAS: Size = { width: 200, height: 100 };
/** 200x100 のキャンバスを半分の 100x50 で、画面の (10, 20) に表示している状態。 */
const DISPLAY: DisplayRect = { left: 10, top: 20, width: 100, height: 50 };

function createContext(size: Size): CanvasRenderingContext2D {
  return createCanvas(size.width, size.height).getContext(
    "2d",
  ) as unknown as CanvasRenderingContext2D;
}

/** ドラッグ操作のクライアント座標列を、キャンバス座標に変換する。 */
function dragToCanvasPoints(clientPoints: readonly Point[]): Point[] {
  return clientPoints.map((client) => toCanvasPoint(client, DISPLAY, CANVAS));
}

describe("描画パイプライン（座標変換 → パス生成 → 描画）", () => {
  it("縮小表示中のドラッグが、キャンバス実寸の対応する位置に描かれる", () => {
    const ctx = createContext(CANVAS);
    // クライアント (30,40) → キャンバス (40,40)、(80,45) → (140,50)。
    const points = dragToCanvasPoints([
      { x: 30, y: 40 },
      { x: 80, y: 45 },
    ]);

    expect(points).toEqual([
      { x: 40, y: 40 },
      { x: 140, y: 50 },
    ]);

    drawStroke(ctx, buildStrokePath(points), { color: BLACK, width: 4 });

    const buffer = readPixels(ctx, CANVAS);
    expect(pixelAt(buffer, 40, 40).a).toBeGreaterThan(200);
    expect(pixelAt(buffer, 140, 50).a).toBeGreaterThan(200);
    // 線から大きく離れた位置は塗られない。
    expect(pixelAt(buffer, 40, 90).a).toBe(0);
  });

  it("白で初期化したベースに線を引くと、線の位置だけが白でなくなる", () => {
    const ctx = createContext(CANVAS);
    fillCanvas(ctx, CANVAS, WHITE);

    const points = dragToCanvasPoints([
      { x: 20, y: 45 },
      { x: 100, y: 45 },
    ]);
    drawStroke(ctx, buildStrokePath(points), { color: BLACK, width: 6 });

    const buffer = readPixels(ctx, CANVAS);
    expect(pixelAt(buffer, 100, 50)).toEqual(BLACK);
    expect(pixelAt(buffer, 100, 10)).toEqual(WHITE);
  });

  it("プレビューを消してもベースの内容は残る（2 枚重ねが独立している）", () => {
    const base = createContext(CANVAS);
    const preview = createContext(CANVAS);
    fillCanvas(base, CANVAS, WHITE);

    const points = dragToCanvasPoints([
      { x: 20, y: 45 },
      { x: 100, y: 45 },
    ]);
    const path = buildStrokePath(points);

    // ドラッグ中はプレビューに描く。
    drawStroke(preview, path, { color: BLACK, width: 6 });
    expect(pixelAt(readPixels(preview, CANVAS), 100, 50).a).toBeGreaterThan(200);

    // 離したらベースへ確定し、プレビューを消す。
    drawStroke(base, path, { color: BLACK, width: 6 });
    clearCanvas(preview, CANVAS);

    expect(pixelAt(readPixels(preview, CANVAS), 100, 50).a).toBe(0);
    expect(pixelAt(readPixels(base, CANVAS), 100, 50)).toEqual(BLACK);
  });

  it("表示倍率を求めてから逆変換すると、元のキャンバス座標に戻る", () => {
    const canvas: Size = { width: 1920, height: 1080 };
    const display = computeDisplaySize(canvas, { width: 960, height: 900 });
    const rect: DisplayRect = { left: 0, top: 0, width: display.width, height: display.height };

    // 表示上の中央をクリックしたら、キャンバスの中央になる。
    const center = toCanvasPoint({ x: display.width / 2, y: display.height / 2 }, rect, canvas);

    expect(center).toEqual({ x: canvas.width / 2, y: canvas.height / 2 });
  });
});
