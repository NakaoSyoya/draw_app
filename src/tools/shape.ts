import { HANDLE_HIT_RADIUS } from "@/config/constants";
import {
  ellipseFromPoints,
  hitTestHandle,
  moveRect,
  normalizeRect,
  rectContains,
  resizeRect,
} from "@/engine/geometry";
import type { Point, Rect, ResizeHandle, ShapeStyle } from "@/engine/types";
import { type DrawCommand, noCommit, type Tool, type ToolContext } from "./types";

/**
 * 矩形・楕円ツールの状態機械（SPEC 付録B）。
 *
 * `idle → drawing →（離す）→ pending`。
 * pending では本体ドラッグで移動、ハンドルドラッグでリサイズできる。
 * 確定は `commit`（Enter / ツール切替 / 他所クリック）、破棄は `cancel`（Esc）。
 */
export type ShapeToolState =
  | { readonly kind: "idle" }
  | { readonly kind: "drawing"; readonly origin: Point; readonly current: Point }
  | { readonly kind: "pending"; readonly bounds: Rect }
  /** 本体をドラッグ中。`grabOffset` は掴んだ点と左上との差。 */
  | { readonly kind: "moving"; readonly bounds: Rect; readonly grabOffset: Point }
  | { readonly kind: "resizing"; readonly bounds: Rect; readonly handle: ResizeHandle };

type ShapeKind = "rectangle" | "ellipse";

/** 現在の状態が表している矩形。`idle` なら `undefined`。 */
function currentBounds(state: ShapeToolState): Rect | undefined {
  switch (state.kind) {
    case "idle":
      return undefined;
    case "drawing":
      return normalizeRect(state.origin, state.current);
    default:
      return state.bounds;
  }
}

/**
 * ハンドルの判定半径。
 *
 * 固定値のままだと小さい図形ではハンドルの判定範囲が図形全体を覆ってしまい、
 * 本体をドラッグして移動できなくなる。短辺の 1/3 を上限にして、
 * どんな大きさでも中央付近には移動用の余地を残す。
 *
 * 幅・高さが 0 の図形（クリックのみ）は判定半径も 0 になり移動しかできない。
 * その場合は Esc で破棄して描き直す。
 */
function handleRadius(bounds: Rect): number {
  return Math.min(HANDLE_HIT_RADIUS, Math.min(bounds.width, bounds.height) / 3);
}

function toStyle(context: ToolContext): ShapeStyle {
  return {
    color: context.settings.color,
    width: context.settings.brushWidth,
    filled: context.settings.filled,
  };
}

function toCommands(kind: ShapeKind, state: ShapeToolState, context: ToolContext): DrawCommand[] {
  const bounds = currentBounds(state);
  if (bounds === undefined) return [];

  const style = toStyle(context);
  if (kind === "rectangle") {
    return [{ type: "rect", rect: bounds, style }];
  }

  return [
    {
      type: "ellipse",
      ellipse: ellipseFromPoints(
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      ),
      style,
    },
  ];
}

function createShapeTool(kind: ShapeKind): Tool<ShapeToolState> {
  const commitState = (state: ShapeToolState, context: ToolContext) => ({
    state: { kind: "idle" } as const,
    commit: toCommands(kind, state, context),
  });

  return {
    initialState: { kind: "idle" },

    pointerDown(state, point, context) {
      if (state.kind === "pending") {
        const handle = hitTestHandle(state.bounds, point, handleRadius(state.bounds));
        if (handle !== undefined) {
          return noCommit({ kind: "resizing", bounds: state.bounds, handle });
        }

        if (rectContains(state.bounds, point)) {
          return noCommit({
            kind: "moving",
            bounds: state.bounds,
            grabOffset: { x: point.x - state.bounds.x, y: point.y - state.bounds.y },
          });
        }

        // 外側をクリック: 現在の図形を確定し、その場から新しい図形を描き始める。
        return {
          state: { kind: "drawing", origin: point, current: point },
          commit: toCommands(kind, state, context),
        };
      }

      return noCommit({ kind: "drawing", origin: point, current: point });
    },

    pointerMove(state, point) {
      switch (state.kind) {
        case "drawing":
          return noCommit({ kind: "drawing", origin: state.origin, current: point });
        case "moving":
          return noCommit({
            kind: "moving",
            bounds: moveRect(
              state.bounds,
              point.x - state.grabOffset.x - state.bounds.x,
              point.y - state.grabOffset.y - state.bounds.y,
            ),
            grabOffset: state.grabOffset,
          });
        case "resizing":
          return noCommit({
            kind: "resizing",
            bounds: resizeRect(state.bounds, state.handle, point),
            handle: state.handle,
          });
        default:
          return noCommit(state);
      }
    },

    pointerUp(state, point) {
      if (state.kind === "drawing") {
        return noCommit({ kind: "pending", bounds: normalizeRect(state.origin, point) });
      }
      if (state.kind === "moving" || state.kind === "resizing") {
        return noCommit({ kind: "pending", bounds: state.bounds });
      }

      return noCommit(state);
    },

    commit(state, context) {
      return commitState(state, context);
    },

    cancel() {
      return noCommit({ kind: "idle" });
    },

    preview(state, context) {
      return toCommands(kind, state, context);
    },

    hasPending(state) {
      return state.kind === "pending" || state.kind === "moving" || state.kind === "resizing";
    },
  };
}

export const rectangleTool = createShapeTool("rectangle");
export const ellipseTool = createShapeTool("ellipse");
