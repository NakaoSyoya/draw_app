import { describe, expect, it } from "vitest";
import { brushTool } from "@/tools/brush";
import { ERASER_COLOR, eraserTool } from "@/tools/eraser";
import type { StrokeToolState } from "@/tools/stroke-tool";
import { makeContext } from "../helpers/tool-context";

const context = makeContext();

describe("brushTool の状態遷移", () => {
  it("初期状態は idle で、未確定オブジェクトを持たない", () => {
    expect(brushTool.initialState).toEqual({ kind: "idle" });
    expect(brushTool.hasPending(brushTool.initialState)).toBe(false);
  });

  it("pointerDown で drawing に入り、押した点が最初の点になる", () => {
    const step = brushTool.pointerDown(brushTool.initialState, { x: 5, y: 7 }, context);

    expect(step.state).toEqual({ kind: "drawing", points: [{ x: 5, y: 7 }] });
    expect(step.commit).toEqual([]);
  });

  it("pointerMove で点が追加される", () => {
    let state: StrokeToolState = brushTool.pointerDown(
      brushTool.initialState,
      { x: 0, y: 0 },
      context,
    ).state;
    state = brushTool.pointerMove(state, { x: 10, y: 0 }, context).state;
    state = brushTool.pointerMove(state, { x: 20, y: 5 }, context).state;

    expect(state).toEqual({
      kind: "drawing",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 5 },
      ],
    });
  });

  it("idle 中の pointerMove は無視される（ドラッグしていないのに描かない）", () => {
    const step = brushTool.pointerMove(brushTool.initialState, { x: 5, y: 5 }, context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("pointerUp でストロークを 1 ステップとして確定し、idle に戻る", () => {
    let state = brushTool.pointerDown(brushTool.initialState, { x: 0, y: 0 }, context).state;
    state = brushTool.pointerMove(state, { x: 10, y: 10 }, context).state;

    const step = brushTool.pointerUp(state, { x: 20, y: 20 }, context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toHaveLength(1);
    const command = step.commit[0];
    expect(command?.type).toBe("stroke");
  });

  it("確定するストロークには離した位置までの全点が含まれる", () => {
    let state = brushTool.pointerDown(brushTool.initialState, { x: 0, y: 0 }, context).state;
    state = brushTool.pointerMove(state, { x: 10, y: 0 }, context).state;

    const step = brushTool.pointerUp(state, { x: 20, y: 0 }, context);
    const command = step.commit[0];

    if (command?.type !== "stroke") throw new Error("stroke コマンドではありません");
    expect(command.path[0]).toEqual({ type: "move", to: { x: 0, y: 0 } });
    expect(command.path[command.path.length - 1]).toEqual({
      type: "line",
      to: { x: 20, y: 0 },
    });
  });

  it("idle 中の pointerUp では何も確定しない", () => {
    const step = brushTool.pointerUp(brushTool.initialState, { x: 5, y: 5 }, context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("クリックだけ（移動なし）でも 1 点のストロークが確定する", () => {
    const state = brushTool.pointerDown(brushTool.initialState, { x: 5, y: 5 }, context).state;

    const step = brushTool.pointerUp(state, { x: 5, y: 5 }, context);

    expect(step.commit).toHaveLength(1);
  });

  it("cancel でドラッグ中の内容を破棄し、確定しない", () => {
    const state = brushTool.pointerDown(brushTool.initialState, { x: 5, y: 5 }, context).state;

    const step = brushTool.cancel(state);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("commit（ツール切替など）はドラッグ中の線をそのまま確定する", () => {
    let state = brushTool.pointerDown(brushTool.initialState, { x: 0, y: 0 }, context).state;
    state = brushTool.pointerMove(state, { x: 10, y: 10 }, context).state;

    const step = brushTool.commit(state, context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toHaveLength(1);
  });

  it("ドラッグ中はプレビューにストロークが出る", () => {
    const state = brushTool.pointerDown(brushTool.initialState, { x: 5, y: 5 }, context).state;

    expect(brushTool.preview(state, context)).toHaveLength(1);
  });

  it("idle 中のプレビューは空", () => {
    expect(brushTool.preview(brushTool.initialState, context)).toEqual([]);
  });
});

describe("ブラシと消しゴムの色", () => {
  it("ブラシは現在の描画色を使う", () => {
    const state = brushTool.pointerDown(brushTool.initialState, { x: 0, y: 0 }, context).state;
    const step = brushTool.pointerUp(state, { x: 5, y: 5 }, context);
    const command = step.commit[0];

    if (command?.type !== "stroke") throw new Error("stroke コマンドではありません");
    expect(command.style.color).toEqual(context.settings.color);
  });

  it("消しゴムは描画色に関係なく常に白で描く（背景が白のため）", () => {
    const state = eraserTool.pointerDown(eraserTool.initialState, { x: 0, y: 0 }, context).state;
    const step = eraserTool.pointerUp(state, { x: 5, y: 5 }, context);
    const command = step.commit[0];

    if (command?.type !== "stroke") throw new Error("stroke コマンドではありません");
    expect(command.style.color).toEqual(ERASER_COLOR);
    expect(ERASER_COLOR).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  it("消しゴムもブラシと同じ太さ設定を使う", () => {
    const state = eraserTool.pointerDown(eraserTool.initialState, { x: 0, y: 0 }, context).state;
    const step = eraserTool.pointerUp(state, { x: 5, y: 5 }, context);
    const command = step.commit[0];

    if (command?.type !== "stroke") throw new Error("stroke コマンドではありません");
    expect(command.style.width).toBe(context.settings.brushWidth);
  });

  it("消しゴムは不透明度の設定に影響されない（半透明では消え残るため）", () => {
    const translucent = makeContext({ color: { r: 0, g: 0, b: 0, a: 40 } });
    const state = eraserTool.pointerDown(eraserTool.initialState, { x: 0, y: 0 }, translucent);
    const step = eraserTool.pointerUp(state.state, { x: 5, y: 5 }, translucent);
    const command = step.commit[0];

    if (command?.type !== "stroke") throw new Error("stroke コマンドではありません");
    expect(command.style.color.a).toBe(255);
  });
});
