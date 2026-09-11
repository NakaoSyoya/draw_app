import { describe, expect, it } from "vitest";
import { type LineToolState, lineTool } from "@/tools/line";
import { makeContext } from "../helpers/tool-context";

const context = makeContext();

/** (10,10) から (110,10) までドラッグして未確定状態にする。 */
function dragToPending(): LineToolState {
  const state = lineTool.pointerDown(lineTool.initialState, { x: 10, y: 10 }, context).state;
  return lineTool.pointerUp(state, { x: 110, y: 10 }, context).state;
}

describe("lineTool の状態遷移", () => {
  it("ドラッグして離すと pending になり、まだ確定しない", () => {
    const step = lineTool.pointerUp(
      lineTool.pointerDown(lineTool.initialState, { x: 10, y: 10 }, context).state,
      { x: 110, y: 10 },
      context,
    );

    expect(step.state).toEqual({
      kind: "pending",
      start: { x: 10, y: 10 },
      end: { x: 110, y: 10 },
    });
    expect(step.commit).toEqual([]);
    expect(lineTool.hasPending(step.state)).toBe(true);
  });

  it("端点の順序（向き）を保持する", () => {
    let state = lineTool.pointerDown(lineTool.initialState, { x: 110, y: 60 }, context).state;
    state = lineTool.pointerUp(state, { x: 10, y: 10 }, context).state;

    expect(state).toEqual({
      kind: "pending",
      start: { x: 110, y: 60 },
      end: { x: 10, y: 10 },
    });
  });

  it("commit で直線を 1 ステップとして確定する", () => {
    const step = lineTool.commit(dragToPending(), context);

    expect(step.state).toEqual({ kind: "idle" });
    const command = step.commit[0];
    if (command?.type !== "line") throw new Error("line コマンドではありません");
    expect(command.line).toEqual({ start: { x: 10, y: 10 }, end: { x: 110, y: 10 } });
    expect(command.style.color).toEqual(context.settings.color);
  });

  it("cancel で破棄し、確定しない", () => {
    const step = lineTool.cancel(dragToPending());

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });
});

describe("pending 状態の端点ドラッグ", () => {
  it("始点付近を掴むと始点だけが動く", () => {
    let state = lineTool.pointerDown(dragToPending(), { x: 12, y: 10 }, context).state;
    expect(state).toMatchObject({ kind: "draggingEnd", which: "start" });

    state = lineTool.pointerMove(state, { x: 0, y: 50 }, context).state;

    expect(state).toMatchObject({ start: { x: 0, y: 50 }, end: { x: 110, y: 10 } });
  });

  it("終点付近を掴むと終点だけが動く", () => {
    let state = lineTool.pointerDown(dragToPending(), { x: 108, y: 10 }, context).state;
    expect(state).toMatchObject({ kind: "draggingEnd", which: "end" });

    state = lineTool.pointerMove(state, { x: 200, y: 80 }, context).state;

    expect(state).toMatchObject({ start: { x: 10, y: 10 }, end: { x: 200, y: 80 } });
  });

  it("端点ドラッグを終えると pending に戻る", () => {
    let state = lineTool.pointerDown(dragToPending(), { x: 108, y: 10 }, context).state;
    state = lineTool.pointerMove(state, { x: 200, y: 80 }, context).state;

    const step = lineTool.pointerUp(state, { x: 200, y: 80 }, context);

    expect(step.state).toEqual({
      kind: "pending",
      start: { x: 10, y: 10 },
      end: { x: 200, y: 80 },
    });
    expect(step.commit).toEqual([]);
  });
});

describe("pending 状態の移動", () => {
  it("線の途中を掴むと線全体が平行移動する", () => {
    let state = lineTool.pointerDown(dragToPending(), { x: 60, y: 10 }, context).state;
    expect(state.kind).toBe("moving");

    state = lineTool.pointerMove(state, { x: 70, y: 40 }, context).state;

    expect(state).toMatchObject({ start: { x: 20, y: 40 }, end: { x: 120, y: 40 } });
  });

  it("線から離れた場所をクリックすると確定して新しい線を描き始める", () => {
    const step = lineTool.pointerDown(dragToPending(), { x: 60, y: 200 }, context);

    expect(step.commit).toHaveLength(1);
    expect(step.state).toEqual({
      kind: "drawing",
      start: { x: 60, y: 200 },
      end: { x: 60, y: 200 },
    });
  });
});

describe("ドラッグしていないときのポインタ操作", () => {
  it("idle 中の pointerMove / pointerUp は状態を変えない", () => {
    expect(lineTool.pointerMove(lineTool.initialState, { x: 5, y: 5 }, context).state).toEqual({
      kind: "idle",
    });
    expect(lineTool.pointerUp(lineTool.initialState, { x: 5, y: 5 }, context).state).toEqual({
      kind: "idle",
    });
  });

  it("pending 中に掴まずポインタを動かしても線は動かない", () => {
    const pending = dragToPending();

    expect(lineTool.pointerMove(pending, { x: 300, y: 300 }, context).state).toEqual(pending);
  });

  it("pending 中の pointerUp は状態を変えず、確定もしない", () => {
    const pending = dragToPending();

    const step = lineTool.pointerUp(pending, { x: 300, y: 300 }, context);

    expect(step.state).toEqual(pending);
    expect(step.commit).toEqual([]);
  });
});

describe("長さ 0 の直線", () => {
  it("クリックのみでも pending になり、端点を掴める", () => {
    let state = lineTool.pointerDown(lineTool.initialState, { x: 50, y: 50 }, context).state;
    state = lineTool.pointerUp(state, { x: 50, y: 50 }, context).state;

    expect(state).toEqual({
      kind: "pending",
      start: { x: 50, y: 50 },
      end: { x: 50, y: 50 },
    });
    expect(lineTool.pointerDown(state, { x: 50, y: 50 }, context).state.kind).toBe("draggingEnd");
  });

  it("長さ 0 の線から離れた場所をクリックすると確定して描き直しに入る", () => {
    let state = lineTool.pointerDown(lineTool.initialState, { x: 50, y: 50 }, context).state;
    state = lineTool.pointerUp(state, { x: 50, y: 50 }, context).state;

    const step = lineTool.pointerDown(state, { x: 150, y: 150 }, context);

    expect(step.commit).toHaveLength(1);
    expect(step.state.kind).toBe("drawing");
  });
});
