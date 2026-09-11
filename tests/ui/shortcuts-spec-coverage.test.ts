import { describe, expect, it } from "vitest";
import { type KeyEventLike, resolveShortcut, type ShortcutAction } from "@/ui/shortcuts";

/**
 * SPEC §8 の一覧をそのまま表にして、全項目が実装されていることを固定する。
 *
 * 個々の挙動は `shortcuts.test.ts` が見る。ここは「仕様の行が実装から抜け落ちていないか」
 * の網羅性チェック。仕様に行を足したらこの表にも足す。
 */

interface SpecRow {
  readonly spec: string;
  readonly event: Partial<KeyEventLike> & { key: string };
  readonly expected: ShortcutAction;
}

const SPEC_SHORTCUTS: readonly SpecRow[] = [
  { spec: "B → ブラシ", event: { key: "b" }, expected: { type: "selectTool", tool: "brush" } },
  { spec: "E → 消しゴム", event: { key: "e" }, expected: { type: "selectTool", tool: "eraser" } },
  { spec: "L → 直線", event: { key: "l" }, expected: { type: "selectTool", tool: "line" } },
  {
    spec: "R → 矩形",
    event: { key: "r" },
    expected: { type: "selectTool", tool: "rectangle" },
  },
  { spec: "O → 楕円", event: { key: "o" }, expected: { type: "selectTool", tool: "ellipse" } },
  { spec: "G → 塗りつぶし", event: { key: "g" }, expected: { type: "selectTool", tool: "fill" } },
  { spec: "T → テキスト", event: { key: "t" }, expected: { type: "selectTool", tool: "text" } },
  { spec: "Ctrl+Z → 取り消し", event: { key: "z", ctrlKey: true }, expected: { type: "undo" } },
  { spec: "Cmd+Z → 取り消し", event: { key: "z", metaKey: true }, expected: { type: "undo" } },
  {
    spec: "Ctrl+Shift+Z → やり直し",
    event: { key: "z", ctrlKey: true, shiftKey: true },
    expected: { type: "redo" },
  },
  {
    spec: "Cmd+Shift+Z → やり直し",
    event: { key: "z", metaKey: true, shiftKey: true },
    expected: { type: "redo" },
  },
  { spec: "Ctrl+Y → やり直し", event: { key: "y", ctrlKey: true }, expected: { type: "redo" } },
  { spec: "Enter → 確定", event: { key: "Enter" }, expected: { type: "commit" } },
  { spec: "Esc → 破棄", event: { key: "Escape" }, expected: { type: "cancel" } },
  {
    spec: "[ → ブラシを細く",
    event: { key: "[" },
    expected: { type: "adjustBrushWidth", delta: -1 },
  },
  {
    spec: "] → ブラシを太く",
    event: { key: "]" },
    expected: { type: "adjustBrushWidth", delta: 1 },
  },
  { spec: "Ctrl+S → PNGで保存", event: { key: "s", ctrlKey: true }, expected: { type: "save" } },
  { spec: "Cmd+S → PNGで保存", event: { key: "s", metaKey: true }, expected: { type: "save" } },
];

function toEvent(row: SpecRow): KeyEventLike {
  return { ctrlKey: false, metaKey: false, shiftKey: false, isComposing: false, ...row.event };
}

describe("SPEC §8 のショートカット一覧", () => {
  it.each(SPEC_SHORTCUTS.map((row) => [row.spec, row] as const))("%s", (_spec, row) => {
    expect(resolveShortcut(toEvent(row), false)).toEqual(row.expected);
  });

  it("仕様の行がすべて表に載っている（13 行 / キーの組み合わせは 18 通り）", () => {
    expect(SPEC_SHORTCUTS).toHaveLength(18);
  });

  it("同じキーの組み合わせが二重に定義されていない", () => {
    const keys = SPEC_SHORTCUTS.map((row) => {
      const event = toEvent(row);
      return `${event.ctrlKey}|${event.metaKey}|${event.shiftKey}|${event.key.toLowerCase()}`;
    });

    expect(new Set(keys).size).toBe(keys.length);
  });
});
