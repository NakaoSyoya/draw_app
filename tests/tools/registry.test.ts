import { describe, expect, it } from "vitest";
import type { ToolId } from "@/engine/types";
import { TOOLS } from "@/tools";
import { makeContext } from "../helpers/tool-context";

const ALL_TOOL_IDS: readonly ToolId[] = [
  "brush",
  "eraser",
  "line",
  "rectangle",
  "ellipse",
  "fill",
  "text",
];

const context = makeContext();

describe("ツール登録表", () => {
  it.each(ALL_TOOL_IDS)("%s が登録されている", (id) => {
    expect(TOOLS[id]).toBeDefined();
  });

  it("登録されているツールは ToolId の全値ちょうど", () => {
    expect(Object.keys(TOOLS).sort()).toEqual([...ALL_TOOL_IDS].sort());
  });

  it.each(ALL_TOOL_IDS)("%s は初期状態で未確定オブジェクトを持たない", (id) => {
    const tool = TOOLS[id];

    expect(tool.hasPending(tool.initialState)).toBe(false);
    expect(tool.preview(tool.initialState, context)).toEqual([]);
  });

  it.each(ALL_TOOL_IDS)("%s は初期状態から cancel しても壊れない", (id) => {
    const tool = TOOLS[id];

    const step = tool.cancel(tool.initialState);

    expect(step.commit).toEqual([]);
    expect(tool.hasPending(step.state)).toBe(false);
  });

  it.each(ALL_TOOL_IDS)("%s は初期状態の commit で何も確定しない", (id) => {
    const tool = TOOLS[id];

    expect(tool.commit(tool.initialState, context).commit).toEqual([]);
  });

  it.each(ALL_TOOL_IDS)("%s はドラッグしてもツール自身が例外を投げない", (id) => {
    const tool = TOOLS[id];

    expect(() => {
      let state = tool.pointerDown(tool.initialState, { x: 5, y: 5 }, context).state;
      state = tool.pointerMove(state, { x: 10, y: 8 }, context).state;
      tool.pointerUp(state, { x: 12, y: 9 }, context);
    }).not.toThrow();
  });
});
