import type { Point, ToolId } from "@/engine/types";
import { brushTool } from "./brush";
import { eraserTool } from "./eraser";
import { fillTool } from "./fill-tool";
import { lineTool } from "./line";
import { ellipseTool, rectangleTool } from "./shape";
import { textTool } from "./text";
import type { Tool, ToolContext, ToolStep } from "./types";

/**
 * 状態の型を隠したツール。
 *
 * ツールごとに状態の型が違うため、ID から引ける 1 つの表にまとめるには
 * 型を消す必要がある。呼び出し側（`PaintApp`）は「同じツールの状態だけを渡す」
 * ＝ツールを切り替えたら状態も `initialState` に戻す、という責務を持つ。
 */
export interface ErasedTool {
  readonly initialState: unknown;
  pointerDown(state: unknown, point: Point, context: ToolContext): ToolStep<unknown>;
  pointerMove(state: unknown, point: Point, context: ToolContext): ToolStep<unknown>;
  pointerUp(state: unknown, point: Point, context: ToolContext): ToolStep<unknown>;
  commit(state: unknown, context: ToolContext): ToolStep<unknown>;
  cancel(state: unknown): ToolStep<unknown>;
  preview(state: unknown, context: ToolContext): ReturnType<Tool<unknown>["preview"]>;
  hasPending(state: unknown): boolean;
}

// 型消去はここ 1 か所だけ。各ツール自身は状態の型を保ったまま実装・テストされている。
const erase = <TState>(tool: Tool<TState>): ErasedTool => tool as ErasedTool;

/** ツール ID から状態機械を引く表。`ToolId` の全値を必ず網羅する。 */
export const TOOLS: Readonly<Record<ToolId, ErasedTool>> = {
  brush: erase(brushTool),
  eraser: erase(eraserTool),
  line: erase(lineTool),
  rectangle: erase(rectangleTool),
  ellipse: erase(ellipseTool),
  fill: erase(fillTool),
  text: erase(textTool),
};

export { brushTool, ellipseTool, eraserTool, fillTool, lineTool, rectangleTool, textTool };
