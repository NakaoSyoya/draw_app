import { HANDLE_HIT_RADIUS } from "@/config/constants";
import { lineFromPoints } from "@/engine/geometry";
import type { Point, StrokeStyle } from "@/engine/types";
import { type DrawCommand, noCommit, type Tool, type ToolContext } from "./types";

/**
 * 直線ツールの状態機械（SPEC 付録B）。
 *
 * 矩形・楕円と違い端点の向きが意味を持つため、外接矩形ではなく
 * 始点・終点をそのまま保持し、リサイズは端点のドラッグで行う。
 */
export type LineToolState =
  | { readonly kind: "idle" }
  | { readonly kind: "drawing"; readonly start: Point; readonly end: Point }
  | { readonly kind: "pending"; readonly start: Point; readonly end: Point }
  /** 線全体をドラッグ中。`grabOffset` は掴んだ点と始点との差。 */
  | {
      readonly kind: "moving";
      readonly start: Point;
      readonly end: Point;
      readonly grabOffset: Point;
    }
  /** 端点をドラッグ中。 */
  | {
      readonly kind: "draggingEnd";
      readonly start: Point;
      readonly end: Point;
      readonly which: "start" | "end";
    };

interface Endpoints {
  readonly start: Point;
  readonly end: Point;
}

function endpointsOf(state: LineToolState): Endpoints | undefined {
  return state.kind === "idle" ? undefined : { start: state.start, end: state.end };
}

function toStyle(context: ToolContext): StrokeStyle {
  return { color: context.settings.color, width: context.settings.brushWidth };
}

function toCommands(state: LineToolState, context: ToolContext): DrawCommand[] {
  const endpoints = endpointsOf(state);
  if (endpoints === undefined) return [];

  return [
    {
      type: "line",
      line: lineFromPoints(endpoints.start, endpoints.end),
      style: toStyle(context),
    },
  ];
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 線からの距離。線全体を掴めるかの判定に使う（線分への最短距離）。 */
function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return distance(point, start);

  const t = Math.min(
    1,
    Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );

  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

export const lineTool: Tool<LineToolState> = {
  initialState: { kind: "idle" },

  pointerDown(state, point, context) {
    if (state.kind === "pending") {
      // 端点のほうが線本体より優先。近いほうの端点を掴む。
      const toStart = distance(point, state.start);
      const toEnd = distance(point, state.end);
      if (Math.min(toStart, toEnd) <= HANDLE_HIT_RADIUS) {
        return noCommit({
          kind: "draggingEnd",
          start: state.start,
          end: state.end,
          which: toStart <= toEnd ? "start" : "end",
        });
      }

      if (distanceToSegment(point, state.start, state.end) <= HANDLE_HIT_RADIUS) {
        return noCommit({
          kind: "moving",
          start: state.start,
          end: state.end,
          grabOffset: { x: point.x - state.start.x, y: point.y - state.start.y },
        });
      }

      // 線から離れた場所をクリック: 確定して、その場から新しい線を描き始める。
      return {
        state: { kind: "drawing", start: point, end: point },
        commit: toCommands(state, context),
      };
    }

    return noCommit({ kind: "drawing", start: point, end: point });
  },

  pointerMove(state, point) {
    switch (state.kind) {
      case "drawing":
        return noCommit({ kind: "drawing", start: state.start, end: point });
      case "moving": {
        const dx = point.x - state.grabOffset.x - state.start.x;
        const dy = point.y - state.grabOffset.y - state.start.y;
        return noCommit({
          kind: "moving",
          start: { x: state.start.x + dx, y: state.start.y + dy },
          end: { x: state.end.x + dx, y: state.end.y + dy },
          grabOffset: state.grabOffset,
        });
      }
      case "draggingEnd":
        return noCommit(
          state.which === "start"
            ? { kind: "draggingEnd", start: point, end: state.end, which: "start" }
            : { kind: "draggingEnd", start: state.start, end: point, which: "end" },
        );
      default:
        return noCommit(state);
    }
  },

  pointerUp(state, point) {
    if (state.kind === "drawing") {
      return noCommit({ kind: "pending", start: state.start, end: point });
    }
    if (state.kind === "moving" || state.kind === "draggingEnd") {
      return noCommit({ kind: "pending", start: state.start, end: state.end });
    }

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
    return state.kind === "pending" || state.kind === "moving" || state.kind === "draggingEnd";
  },
};
