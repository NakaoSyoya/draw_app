import { describe, expect, it } from "vitest";
import { computeDisplaySize, toCanvasPoint } from "@/canvas/pointer";

describe("toCanvasPoint", () => {
  it("等倍・オフセットなしならクライアント座標がそのままキャンバス座標になる", () => {
    expect(
      toCanvasPoint(
        { x: 10, y: 20 },
        { left: 0, top: 0, width: 100, height: 100 },
        { width: 100, height: 100 },
      ),
    ).toEqual({ x: 10, y: 20 });
  });

  it("要素の表示位置ぶんのオフセットを差し引く", () => {
    expect(
      toCanvasPoint(
        { x: 110, y: 70 },
        { left: 100, top: 50, width: 100, height: 100 },
        { width: 100, height: 100 },
      ),
    ).toEqual({ x: 10, y: 20 });
  });

  it("縮小表示中は表示倍率ぶんを逆算する（1000x800 を 500x400 で表示）", () => {
    expect(
      toCanvasPoint(
        { x: 250, y: 200 },
        { left: 0, top: 0, width: 500, height: 400 },
        { width: 1000, height: 800 },
      ),
    ).toEqual({ x: 500, y: 400 });
  });

  it("拡大表示中も表示倍率ぶんを逆算する（100x100 を 200x200 で表示）", () => {
    expect(
      toCanvasPoint(
        { x: 50, y: 50 },
        { left: 0, top: 0, width: 200, height: 200 },
        { width: 100, height: 100 },
      ),
    ).toEqual({ x: 25, y: 25 });
  });

  it("縦と横で倍率が違っても軸ごとに正しく換算する", () => {
    expect(
      toCanvasPoint(
        { x: 50, y: 50 },
        { left: 0, top: 0, width: 100, height: 200 },
        { width: 400, height: 400 },
      ),
    ).toEqual({ x: 200, y: 100 });
  });

  it("スクロールで要素が画面外に出ている（left / top が負）場合も正しく換算する", () => {
    expect(
      toCanvasPoint(
        { x: 10, y: 10 },
        { left: -100, top: -50, width: 200, height: 200 },
        { width: 200, height: 200 },
      ),
    ).toEqual({ x: 110, y: 60 });
  });

  it("小数の精度を保持する（滑らかな線のために丸めない）", () => {
    expect(
      toCanvasPoint(
        { x: 10.5, y: 20.25 },
        { left: 0, top: 0, width: 100, height: 100 },
        { width: 100, height: 100 },
      ),
    ).toEqual({ x: 10.5, y: 20.25 });
  });

  it("キャンバス外のクライアント座標は負や範囲外の値として返る（呼び出し側が判断する）", () => {
    expect(
      toCanvasPoint(
        { x: -20, y: 150 },
        { left: 0, top: 0, width: 100, height: 100 },
        { width: 100, height: 100 },
      ),
    ).toEqual({ x: -20, y: 150 });
  });

  it.each([
    { left: 0, top: 0, width: 0, height: 100 },
    { left: 0, top: 0, width: 100, height: 0 },
  ])("表示サイズが 0 の %o ではゼロ除算せず原点を返す", (displayRect) => {
    expect(toCanvasPoint({ x: 10, y: 20 }, displayRect, { width: 100, height: 100 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("computeDisplaySize", () => {
  it("利用可能領域のほうが大きければ原寸のまま（拡大はしない）", () => {
    expect(computeDisplaySize({ width: 800, height: 600 }, { width: 1200, height: 900 })).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("ちょうど収まるサイズなら原寸のまま", () => {
    expect(computeDisplaySize({ width: 800, height: 600 }, { width: 800, height: 600 })).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("幅が足りなければ幅を基準に縮小する", () => {
    expect(computeDisplaySize({ width: 1000, height: 500 }, { width: 500, height: 900 })).toEqual({
      width: 500,
      height: 250,
    });
  });

  it("高さが足りなければ高さを基準に縮小する", () => {
    expect(computeDisplaySize({ width: 500, height: 1000 }, { width: 900, height: 500 })).toEqual({
      width: 250,
      height: 500,
    });
  });

  it("両方足りなければ厳しいほうの倍率を使う", () => {
    expect(computeDisplaySize({ width: 1920, height: 1080 }, { width: 960, height: 900 })).toEqual({
      width: 960,
      height: 540,
    });
  });

  it("アスペクト比を保つ", () => {
    const canvas = { width: 1000, height: 400 };
    const display = computeDisplaySize(canvas, { width: 300, height: 900 });

    expect(display.width / display.height).toBeCloseTo(canvas.width / canvas.height, 2);
  });

  it("端数は整数に丸める（サブピクセルのにじみを避ける）", () => {
    const display = computeDisplaySize({ width: 1000, height: 300 }, { width: 333, height: 900 });

    expect(Number.isInteger(display.width)).toBe(true);
    expect(Number.isInteger(display.height)).toBe(true);
    expect(display).toEqual({ width: 333, height: 100 });
  });

  it("極端に狭くても 1px 以上を保つ（0 サイズのキャンバスを作らない）", () => {
    expect(computeDisplaySize({ width: 1000, height: 1000 }, { width: 1, height: 1 })).toEqual({
      width: 1,
      height: 1,
    });
  });

  it.each([
    { width: 0, height: 0 },
    { width: -10, height: 500 },
  ])("レイアウト確定前などで利用可能領域が %o なら原寸を返す", (available) => {
    expect(computeDisplaySize({ width: 800, height: 600 }, available)).toEqual({
      width: 800,
      height: 600,
    });
  });
});
