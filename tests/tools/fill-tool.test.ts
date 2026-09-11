import { describe, expect, it } from "vitest";
import type { Rgba } from "@/engine/types";
import { fillTool } from "@/tools/fill-tool";
import { BLACK, bufferFromMap, pixelAt, RED, toMap, WHITE } from "../helpers/pixels";
import { makeContext } from "../helpers/tool-context";

const PALETTE = { W: WHITE, B: BLACK, R: RED };

function contextWith(rows: readonly string[], color: Rgba = RED, fillTolerance = 0) {
  const base = bufferFromMap(rows, PALETTE);

  return makeContext(
    { color, fillTolerance },
    { size: { width: base.width, height: base.height }, base },
  );
}

describe("fillTool", () => {
  it("クリックで連結領域を塗り、1 ステップとして確定する", () => {
    const context = contextWith(["WWBB", "WWBB"]);

    const step = fillTool.pointerDown(fillTool.initialState, { x: 0, y: 0 }, context);

    expect(step.commit).toHaveLength(1);
    const command = step.commit[0];
    if (command?.type !== "pixels") throw new Error("pixels コマンドではありません");
    expect(toMap(command.buffer, PALETTE)).toEqual(["RRBB", "RRBB"]);
  });

  it("未確定状態を持たない（押した時点で確定まで済む）", () => {
    const context = contextWith(["WB"]);

    const step = fillTool.pointerDown(fillTool.initialState, { x: 0, y: 0 }, context);

    expect(fillTool.hasPending(step.state)).toBe(false);
    expect(fillTool.preview(step.state, context)).toEqual([]);
  });

  it("許容差の設定が反映される", () => {
    const nearWhite: Rgba = { r: 245, g: 245, b: 245, a: 255 };
    const base = bufferFromMap(["wW"], { w: nearWhite, W: WHITE });
    const context = makeContext(
      { color: RED, fillTolerance: 16 },
      { size: { width: 2, height: 1 }, base },
    );

    const step = fillTool.pointerDown(fillTool.initialState, { x: 0, y: 0 }, context);
    const command = step.commit[0];

    if (command?.type !== "pixels") throw new Error("pixels コマンドではありません");
    expect(toMap(command.buffer, { R: RED, W: WHITE, w: nearWhite })).toEqual(["RR"]);
  });

  describe("履歴に無駄なステップを積まない", () => {
    it("すでに塗り色と同じ場所をクリックしても確定しない", () => {
      const context = contextWith(["WWBB"], WHITE);

      const step = fillTool.pointerDown(fillTool.initialState, { x: 0, y: 0 }, context);

      expect(step.commit).toEqual([]);
    });

    it.each([
      { x: -1, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 2 },
    ])("キャンバス外 %o のクリックでは確定しない", (point) => {
      const context = contextWith(["WWBB", "WWBB"]);

      const step = fillTool.pointerDown(fillTool.initialState, point, context);

      expect(step.commit).toEqual([]);
    });
  });

  it("ドラッグ操作では何も起きない（クリックのみのツール）", () => {
    const context = contextWith(["WWBB"]);

    expect(fillTool.pointerMove(fillTool.initialState, { x: 1, y: 0 }, context).commit).toEqual([]);
    expect(fillTool.pointerUp(fillTool.initialState, { x: 1, y: 0 }, context).commit).toEqual([]);
    expect(fillTool.commit(fillTool.initialState, context).commit).toEqual([]);
  });
});

describe("不透明度の扱い", () => {
  it("半透明の色は下地に重ねた結果で塗る（キャンバスを透けさせない）", () => {
    const context = contextWith(["WW"], { r: 255, g: 0, b: 0, a: 128 });

    const step = fillTool.pointerDown(fillTool.initialState, { x: 0, y: 0 }, context);
    const command = step.commit[0];

    if (command?.type !== "pixels") throw new Error("pixels コマンドではありません");
    // 不透明度 50% の赤を白に重ねると (255, 127, 127)。アルファは 255 のまま。
    expect(pixelAt(command.buffer, 0, 0)).toEqual({ r: 255, g: 127, b: 127, a: 255 });
  });

  it("不透明度 0 の色では何も変わらないため確定しない", () => {
    const context = contextWith(["WW"], { r: 255, g: 0, b: 0, a: 0 });

    const step = fillTool.pointerDown(fillTool.initialState, { x: 0, y: 0 }, context);

    expect(step.commit).toEqual([]);
  });

  it("不透明な色はそのまま塗られる", () => {
    const context = contextWith(["WW"], RED);

    const step = fillTool.pointerDown(fillTool.initialState, { x: 0, y: 0 }, context);
    const command = step.commit[0];

    if (command?.type !== "pixels") throw new Error("pixels コマンドではありません");
    expect(pixelAt(command.buffer, 0, 0)).toEqual(RED);
  });
});
