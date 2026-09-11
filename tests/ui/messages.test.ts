import { describe, expect, it } from "vitest";
import type { ToolId } from "@/engine/types";
import { messages, toolLabel } from "@/ui/messages";

const ALL_TOOL_IDS: readonly ToolId[] = [
  "brush",
  "eraser",
  "line",
  "rectangle",
  "ellipse",
  "fill",
  "text",
];

/** ネストしたオブジェクトからすべての文字列を集める。 */
function collectStrings(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") {
    out.push([path, value]);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, path === "" ? key : `${path}.${key}`, out);
    }
  }
}

describe("文言の網羅性", () => {
  it.each(ALL_TOOL_IDS)("%s に表示名がある", (toolId) => {
    expect(messages.tools[toolId].trim()).not.toBe("");
  });

  it.each(ALL_TOOL_IDS)("%s にショートカットキーの表示がある", (toolId) => {
    expect(messages.toolShortcuts[toolId].trim()).not.toBe("");
  });

  it("ショートカットキーはツール間で重複しない", () => {
    const keys = ALL_TOOL_IDS.map((toolId) => messages.toolShortcuts[toolId]);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("空文字の文言がない（ラベルなしのボタンを作らない）", () => {
    const entries: [string, string][] = [];
    collectStrings(messages, "", entries);

    const empty = entries.filter(([, text]) => text.trim() === "");
    expect(empty).toEqual([]);
  });

  it("文言が 1 つ以上定義されている", () => {
    const entries: [string, string][] = [];
    collectStrings(messages, "", entries);

    expect(entries.length).toBeGreaterThan(20);
  });
});

describe("toolLabel", () => {
  it("表示名とショートカットキーを組み合わせる", () => {
    expect(toolLabel("brush")).toBe("ブラシ (B)");
    expect(toolLabel("ellipse")).toBe("楕円 (O)");
  });

  it.each(ALL_TOOL_IDS)("%s のラベルに表示名とキーの両方が含まれる", (toolId) => {
    const label = toolLabel(toolId);

    expect(label).toContain(messages.tools[toolId]);
    expect(label).toContain(messages.toolShortcuts[toolId]);
  });
});
