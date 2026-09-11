import type { Point, TextStyle } from "@/engine/types";
import { type DrawCommand, noCommit, type Tool, type ToolContext } from "./types";

/**
 * テキストツールの状態機械（SPEC 付録B）。
 *
 * クリックした位置で編集状態に入り、確定でベースへ描き込む。
 * 入力・移動は HTML オーバーレイ（P11 `TextOverlay`）が担当するため、
 * この状態機械は「どこに・何を」だけを保持し、文字幅の測定は行わない。
 * IME 変換中の扱いもオーバーレイ側の責務。
 */
export type TextToolState =
  | { readonly kind: "idle" }
  | { readonly kind: "editing"; readonly origin: Point; readonly text: string };

function toStyle(context: ToolContext): TextStyle {
  return { color: context.settings.color, fontSize: context.settings.fontSize };
}

function toCommands(state: TextToolState, context: ToolContext): DrawCommand[] {
  // 空文字は描いても何も残らないため確定しない。
  if (state.kind !== "editing" || state.text === "") return [];

  return [{ type: "text", text: state.text, origin: state.origin, style: toStyle(context) }];
}

export const textTool: Tool<TextToolState> = {
  initialState: { kind: "idle" },

  pointerDown(state, point, context) {
    // 編集中に別の場所をクリックしたら、いまの内容を確定して新しい編集を始める。
    return {
      state: { kind: "editing", origin: point, text: "" },
      commit: toCommands(state, context),
    };
  },

  pointerMove(state) {
    return noCommit(state);
  },

  pointerUp(state) {
    return noCommit(state);
  },

  commit(state, context) {
    return { state: { kind: "idle" }, commit: toCommands(state, context) };
  },

  cancel() {
    return noCommit({ kind: "idle" });
  },

  preview(state, context) {
    return toCommands(state, context);
  },

  hasPending(state) {
    return state.kind === "editing";
  },
};

/** オーバーレイでの入力内容を反映する。 */
export function setText(state: TextToolState, text: string): TextToolState {
  if (state.kind !== "editing") return state;

  return { kind: "editing", origin: state.origin, text };
}

/** オーバーレイのドラッグによる移動を反映する。 */
export function setTextOrigin(state: TextToolState, origin: Point): TextToolState {
  if (state.kind !== "editing") return state;

  return { kind: "editing", origin, text: state.text };
}
