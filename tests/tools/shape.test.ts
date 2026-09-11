import { describe, expect, it } from "vitest";
import { ellipseTool, rectangleTool, type ShapeToolState } from "@/tools/shape";
import { makeContext } from "../helpers/tool-context";

const context = makeContext({ filled: false });

/** (10,20) から (30,50) までドラッグして、未確定状態にする。 */
function dragToPending(tool = rectangleTool): ShapeToolState {
  let state = tool.pointerDown(tool.initialState, { x: 10, y: 20 }, context).state;
  state = tool.pointerMove(state, { x: 25, y: 40 }, context).state;
  return tool.pointerUp(state, { x: 30, y: 50 }, context).state;
}

const PENDING_BOUNDS = { x: 10, y: 20, width: 20, height: 30 };

describe("rectangleTool の状態遷移", () => {
  it("初期状態は idle で未確定オブジェクトを持たない", () => {
    expect(rectangleTool.initialState).toEqual({ kind: "idle" });
    expect(rectangleTool.hasPending(rectangleTool.initialState)).toBe(false);
  });

  it("pointerDown で drawing に入る", () => {
    const step = rectangleTool.pointerDown(rectangleTool.initialState, { x: 10, y: 20 }, context);

    expect(step.state.kind).toBe("drawing");
    expect(step.commit).toEqual([]);
  });

  it("ドラッグ中は確定せず、離すと pending になる", () => {
    let state = rectangleTool.pointerDown(
      rectangleTool.initialState,
      { x: 10, y: 20 },
      context,
    ).state;
    const moved = rectangleTool.pointerMove(state, { x: 30, y: 50 }, context);
    expect(moved.commit).toEqual([]);

    state = moved.state;
    const released = rectangleTool.pointerUp(state, { x: 30, y: 50 }, context);

    expect(released.state).toEqual({ kind: "pending", bounds: PENDING_BOUNDS });
    // 離した時点ではまだ確定しない（調整できる）。
    expect(released.commit).toEqual([]);
    expect(rectangleTool.hasPending(released.state)).toBe(true);
  });

  it("ドラッグの向きに関わらず正規化された矩形になる", () => {
    let state = rectangleTool.pointerDown(
      rectangleTool.initialState,
      { x: 30, y: 50 },
      context,
    ).state;
    state = rectangleTool.pointerUp(state, { x: 10, y: 20 }, context).state;

    expect(state).toEqual({ kind: "pending", bounds: PENDING_BOUNDS });
  });

  it("commit で矩形を 1 ステップとして確定し idle に戻る", () => {
    const step = rectangleTool.commit(dragToPending(), context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toHaveLength(1);
    const command = step.commit[0];
    if (command?.type !== "rect") throw new Error("rect コマンドではありません");
    expect(command.rect).toEqual(PENDING_BOUNDS);
  });

  it("cancel で未確定オブジェクトを破棄し、確定しない", () => {
    const step = rectangleTool.cancel(dragToPending());

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("塗りトグルの設定が確定する図形に反映される", () => {
    const filledContext = makeContext({ filled: true });
    const step = rectangleTool.commit(dragToPending(), filledContext);
    const command = step.commit[0];

    if (command?.type !== "rect") throw new Error("rect コマンドではありません");
    expect(command.style.filled).toBe(true);
    expect(command.style.color).toEqual(filledContext.settings.color);
    expect(command.style.width).toBe(filledContext.settings.brushWidth);
  });

  it("幅・高さ 0（クリックのみ）でも pending になり確定できる", () => {
    let state = rectangleTool.pointerDown(
      rectangleTool.initialState,
      { x: 5, y: 5 },
      context,
    ).state;
    state = rectangleTool.pointerUp(state, { x: 5, y: 5 }, context).state;

    expect(state).toEqual({ kind: "pending", bounds: { x: 5, y: 5, width: 0, height: 0 } });
    expect(rectangleTool.commit(state, context).commit).toHaveLength(1);
  });
});

describe("pending 状態の移動", () => {
  it("内部をドラッグすると矩形が平行移動する", () => {
    let state = dragToPending();
    state = rectangleTool.pointerDown(state, { x: 20, y: 35 }, context).state;
    expect(state.kind).toBe("moving");

    state = rectangleTool.pointerMove(state, { x: 25, y: 25 }, context).state;

    expect(state).toMatchObject({
      bounds: { x: 15, y: 10, width: 20, height: 30 },
    });
  });

  it("移動を終えると pending に戻り、まだ確定しない", () => {
    let state = dragToPending();
    state = rectangleTool.pointerDown(state, { x: 20, y: 35 }, context).state;
    state = rectangleTool.pointerMove(state, { x: 25, y: 25 }, context).state;

    const step = rectangleTool.pointerUp(state, { x: 25, y: 25 }, context);

    expect(step.state).toEqual({
      kind: "pending",
      bounds: { x: 15, y: 10, width: 20, height: 30 },
    });
    expect(step.commit).toEqual([]);
  });

  it("掴んだ位置と矩形の相対関係が保たれる（角にジャンプしない）", () => {
    let state = dragToPending();
    // 左上から 8,10 ずれた位置を掴む。
    state = rectangleTool.pointerDown(state, { x: 18, y: 30 }, context).state;
    state = rectangleTool.pointerMove(state, { x: 108, y: 130 }, context).state;

    expect(state).toMatchObject({ bounds: { x: 100, y: 120, width: 20, height: 30 } });
  });

  it("小さい図形でも中央付近は移動できる（ハンドルの判定が図形全体を覆わない）", () => {
    // 12x12 の図形。固定半径 10 のままだと全域がハンドル判定に入ってしまう。
    let state = rectangleTool.pointerDown(
      rectangleTool.initialState,
      { x: 0, y: 0 },
      context,
    ).state;
    state = rectangleTool.pointerUp(state, { x: 12, y: 12 }, context).state;

    const step = rectangleTool.pointerDown(state, { x: 6, y: 6 }, context);

    expect(step.state.kind).toBe("moving");
  });

  it("小さい図形でも角のハンドルは掴める", () => {
    let state = rectangleTool.pointerDown(
      rectangleTool.initialState,
      { x: 0, y: 0 },
      context,
    ).state;
    state = rectangleTool.pointerUp(state, { x: 12, y: 12 }, context).state;

    const step = rectangleTool.pointerDown(state, { x: 12, y: 12 }, context);

    expect(step.state).toMatchObject({ kind: "resizing", handle: "se" });
  });
});

describe("pending 状態のリサイズ", () => {
  it("角ハンドルを掴むと resizing に入る", () => {
    const state = dragToPending();

    const step = rectangleTool.pointerDown(state, { x: 30, y: 50 }, context);

    expect(step.state).toMatchObject({ kind: "resizing", handle: "se" });
  });

  it("se ハンドルのドラッグで右下だけが動く", () => {
    let state = dragToPending();
    state = rectangleTool.pointerDown(state, { x: 30, y: 50 }, context).state;

    state = rectangleTool.pointerMove(state, { x: 40, y: 60 }, context).state;

    expect(state).toMatchObject({ bounds: { x: 10, y: 20, width: 30, height: 40 } });
  });

  it("辺ハンドルのドラッグでは 1 辺だけが動く", () => {
    let state = dragToPending();
    // n ハンドルは (20, 20)。
    state = rectangleTool.pointerDown(state, { x: 20, y: 20 }, context).state;

    state = rectangleTool.pointerMove(state, { x: 999, y: 10 }, context).state;

    expect(state).toMatchObject({ bounds: { x: 10, y: 10, width: 20, height: 40 } });
  });

  it("リサイズを終えると pending に戻る", () => {
    let state = dragToPending();
    state = rectangleTool.pointerDown(state, { x: 30, y: 50 }, context).state;
    state = rectangleTool.pointerMove(state, { x: 40, y: 60 }, context).state;

    const step = rectangleTool.pointerUp(state, { x: 40, y: 60 }, context);

    expect(step.state).toEqual({
      kind: "pending",
      bounds: { x: 10, y: 20, width: 30, height: 40 },
    });
  });
});

describe("pending 中に外側をクリック", () => {
  it("現在の図形を確定し、その場から新しい図形を描き始める", () => {
    const state = dragToPending();

    const step = rectangleTool.pointerDown(state, { x: 100, y: 100 }, context);

    expect(step.commit).toHaveLength(1);
    const command = step.commit[0];
    if (command?.type !== "rect") throw new Error("rect コマンドではありません");
    expect(command.rect).toEqual(PENDING_BOUNDS);

    expect(step.state.kind).toBe("drawing");
  });
});

describe("ドラッグしていないときのポインタ操作", () => {
  it("idle 中の pointerMove は状態を変えない（ホバーで描き始めない）", () => {
    const step = rectangleTool.pointerMove(rectangleTool.initialState, { x: 5, y: 5 }, context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("idle 中の pointerUp は状態を変えない", () => {
    const step = rectangleTool.pointerUp(rectangleTool.initialState, { x: 5, y: 5 }, context);

    expect(step.state).toEqual({ kind: "idle" });
    expect(step.commit).toEqual([]);
  });

  it("pending 中に掴まずポインタを動かしても図形は動かない", () => {
    const pending = dragToPending();

    const step = rectangleTool.pointerMove(pending, { x: 300, y: 300 }, context);

    expect(step.state).toEqual(pending);
  });

  it("pending 中の pointerUp は状態を変えない（誤って確定しない）", () => {
    const pending = dragToPending();

    const step = rectangleTool.pointerUp(pending, { x: 300, y: 300 }, context);

    expect(step.state).toEqual(pending);
    expect(step.commit).toEqual([]);
  });
});

describe("プレビュー", () => {
  it("ドラッグ中も pending 中もプレビューに図形が出る", () => {
    let state = rectangleTool.pointerDown(
      rectangleTool.initialState,
      { x: 10, y: 20 },
      context,
    ).state;
    expect(rectangleTool.preview(state, context)).toHaveLength(1);

    state = rectangleTool.pointerUp(state, { x: 30, y: 50 }, context).state;
    expect(rectangleTool.preview(state, context)).toHaveLength(1);
  });

  it("idle 中のプレビューは空", () => {
    expect(rectangleTool.preview(rectangleTool.initialState, context)).toEqual([]);
  });
});

describe("ellipseTool", () => {
  it("同じ操作で楕円コマンドを確定する", () => {
    const step = ellipseTool.commit(dragToPending(ellipseTool), context);
    const command = step.commit[0];

    if (command?.type !== "ellipse") throw new Error("ellipse コマンドではありません");
    expect(command.ellipse).toEqual({
      center: { x: 20, y: 35 },
      radiusX: 10,
      radiusY: 15,
    });
  });

  it("矩形ツールと同じ状態遷移を持つ", () => {
    const state = dragToPending(ellipseTool);

    expect(state).toEqual({ kind: "pending", bounds: PENDING_BOUNDS });
    expect(ellipseTool.hasPending(state)).toBe(true);
  });
});
