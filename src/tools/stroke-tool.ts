import { buildStrokePath } from "@/engine/stroke";
import type { Point, StrokeStyle } from "@/engine/types";
import { type DrawCommand, noCommit, type Tool, type ToolContext } from "./types";

/**
 * フリーハンド系ツール（ブラシ・消しゴム）の状態機械。
 *
 * 未確定オブジェクトは持たない。pointerUp で 1 ストロークを 1 ステップとして確定する。
 */
export type StrokeToolState =
  | { readonly kind: "idle" }
  | { readonly kind: "drawing"; readonly points: readonly Point[] };

/** 設定からストロークの見た目を決める関数。ブラシと消しゴムの違いはここだけ。 */
export type StrokeStyleResolver = (context: ToolContext) => StrokeStyle;

function toCommands(
  state: StrokeToolState,
  resolveStyle: StrokeStyleResolver,
  context: ToolContext,
): DrawCommand[] {
  if (state.kind !== "drawing") return [];

  return [{ type: "stroke", path: buildStrokePath(state.points), style: resolveStyle(context) }];
}

/** ブラシ・消しゴムが共有する状態機械を組み立てる。 */
export function createStrokeTool(resolveStyle: StrokeStyleResolver): Tool<StrokeToolState> {
  const finish = (state: StrokeToolState, context: ToolContext) => ({
    state: { kind: "idle" } as const,
    commit: toCommands(state, resolveStyle, context),
  });

  return {
    initialState: { kind: "idle" },

    pointerDown(_state, point) {
      return noCommit({ kind: "drawing", points: [point] });
    },

    pointerMove(state, point) {
      // ドラッグしていないときのポインタ移動では描かない。
      if (state.kind !== "drawing") return noCommit(state);

      return noCommit({ kind: "drawing", points: [...state.points, point] });
    },

    pointerUp(state, point, context) {
      if (state.kind !== "drawing") return noCommit(state);

      return finish({ kind: "drawing", points: [...state.points, point] }, context);
    },

    commit(state, context) {
      return finish(state, context);
    },

    cancel() {
      return noCommit({ kind: "idle" });
    },

    preview(state, context) {
      return toCommands(state, resolveStyle, context);
    },

    hasPending() {
      // ストロークは離した時点で確定するため、調整可能な未確定状態を持たない。
      return false;
    },
  };
}
