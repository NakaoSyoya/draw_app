import { describe, expect, it } from "vitest";
import type { ToolId } from "@/engine/types";
import { type KeyEventLike, resolveShortcut } from "@/ui/shortcuts";

function key(overrides: Partial<KeyEventLike> & { key: string }): KeyEventLike {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    ...overrides,
  };
}

describe("ツール選択のショートカット（SPEC §8）", () => {
  it.each<[string, ToolId]>([
    ["b", "brush"],
    ["e", "eraser"],
    ["l", "line"],
    ["r", "rectangle"],
    ["o", "ellipse"],
    ["g", "fill"],
    ["t", "text"],
  ])("%s で %s を選ぶ", (pressed, tool) => {
    expect(resolveShortcut(key({ key: pressed }), false)).toEqual({ type: "selectTool", tool });
  });

  it("大文字でも同じツールを選ぶ（Shift 併用や CapsLock）", () => {
    expect(resolveShortcut(key({ key: "B", shiftKey: true }), false)).toEqual({
      type: "selectTool",
      tool: "brush",
    });
  });

  it.each([
    { key: "b", ctrlKey: true },
    { key: "b", metaKey: true },
  ])("修飾キー付きの %o はツール選択にしない（ブラウザ機能を奪わない）", (event) => {
    expect(resolveShortcut(key(event), false)).toBeUndefined();
  });

  it("割り当てのないキーは何も起こさない", () => {
    expect(resolveShortcut(key({ key: "q" }), false)).toBeUndefined();
  });
});

describe("取り消し・やり直し", () => {
  it.each([
    { key: "z", ctrlKey: true },
    { key: "z", metaKey: true },
  ])("%o で取り消し", (event) => {
    expect(resolveShortcut(key(event), false)).toEqual({ type: "undo" });
  });

  it.each([
    { key: "z", ctrlKey: true, shiftKey: true },
    { key: "z", metaKey: true, shiftKey: true },
    { key: "y", ctrlKey: true },
  ])("%o でやり直し", (event) => {
    expect(resolveShortcut(key(event), false)).toEqual({ type: "redo" });
  });

  it("修飾キーなしの z は何も起こさない", () => {
    expect(resolveShortcut(key({ key: "z" }), false)).toBeUndefined();
  });
});

describe("確定・破棄", () => {
  it("Enter で未確定オブジェクトを確定する", () => {
    expect(resolveShortcut(key({ key: "Enter" }), false)).toEqual({ type: "commit" });
  });

  it("Escape で未確定オブジェクトを破棄する", () => {
    expect(resolveShortcut(key({ key: "Escape" }), false)).toEqual({ type: "cancel" });
  });
});

describe("ブラシの太さ", () => {
  it("[ で細く、] で太くする", () => {
    expect(resolveShortcut(key({ key: "[" }), false)).toEqual({
      type: "adjustBrushWidth",
      delta: -1,
    });
    expect(resolveShortcut(key({ key: "]" }), false)).toEqual({
      type: "adjustBrushWidth",
      delta: 1,
    });
  });
});

describe("保存", () => {
  it.each([
    { key: "s", ctrlKey: true },
    { key: "s", metaKey: true },
  ])("%o で PNG 保存（ブラウザの保存ダイアログは抑止する）", (event) => {
    expect(resolveShortcut(key(event), false)).toEqual({ type: "save" });
  });

  it("修飾キーなしの s は何も起こさない", () => {
    expect(resolveShortcut(key({ key: "s" }), false)).toBeUndefined();
  });
});

describe("IME 変換中はすべて無効（SPEC §8）", () => {
  it.each([
    { key: "b" },
    { key: "Enter" },
    { key: "Escape" },
    { key: "z", ctrlKey: true },
    { key: "s", ctrlKey: true },
  ])("変換中の %o は何も起こさない", (event) => {
    expect(resolveShortcut(key({ ...event, isComposing: true }), false)).toBeUndefined();
  });

  it("テキスト編集中かどうかに関わらず変換中は無効", () => {
    expect(resolveShortcut(key({ key: "Escape", isComposing: true }), true)).toBeUndefined();
  });
});

describe("テキスト入力中はショートカットを無効化（SPEC §8）", () => {
  it.each([
    { key: "b" },
    { key: "e" },
    { key: "[" },
    { key: "]" },
    { key: "z", ctrlKey: true },
    { key: "y", ctrlKey: true },
    { key: "s", ctrlKey: true },
  ])("入力中の %o は文字入力を邪魔しない", (event) => {
    expect(resolveShortcut(key(event), true)).toBeUndefined();
  });

  it("Escape だけは入力中でも破棄として効く", () => {
    expect(resolveShortcut(key({ key: "Escape" }), true)).toEqual({ type: "cancel" });
  });

  it("Enter は入力中でも確定として効く", () => {
    expect(resolveShortcut(key({ key: "Enter" }), true)).toEqual({ type: "commit" });
  });

  it("Shift+Enter は確定にしない（改行の余地を残す）", () => {
    expect(resolveShortcut(key({ key: "Enter", shiftKey: true }), true)).toBeUndefined();
  });
});
